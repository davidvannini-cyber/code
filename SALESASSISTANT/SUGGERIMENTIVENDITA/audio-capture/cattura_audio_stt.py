"""
Cattura audio + STT streaming per il sistema di suggerimenti live.

Cosa fa:
- Legge in streaming l'ingresso microfono del Mac (quello che, per lo schema
  hardware confermato, riceve SOLO la voce del cliente).
- Invia i chunk audio via WebSocket a Deepgram in tempo reale.
- Stampa a schermo (e mette a disposizione via callback) le trascrizioni
  parziali e finali, con timestamp, pronte per essere passate al motore di
  matching script (matching-engine/motore_suggerimenti.py: classificatore
  LLM sulla libreria ammessa).

Non serve BlackHole/Audio Hijack: un'unica app (questa) legge direttamente il
mic-in di sistema, come da Decisione 2 del progetto.

Setup:
    pip install sounddevice websockets python-dotenv

Config:
    Imposta la variabile d'ambiente DEEPGRAM_API_KEY (es. in un file .env
    nella stessa cartella, con riga: DEEPGRAM_API_KEY=xxxxx)

Uso:
    python cattura_audio_stt.py
    python cattura_audio_stt.py --list-devices   # per trovare l'indice del mic-in giusto
    python cattura_audio_stt.py --device 2       # forza un device specifico
"""

import argparse
import array
import asyncio
import audioop
import json
import os
import queue
import sys
import time
from datetime import datetime

import sounddevice as sd
import websockets

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv è opzionale: si può anche esportare la variabile a mano

# --- Configurazione audio -----------------------------------------------
SAMPLE_RATE = 16000       # Deepgram accetta bene 16kHz per il parlato
CHANNELS = 1              # mono: sufficiente per la sola voce del cliente
BLOCK_DURATION_MS = 100   # dimensione dei chunk inviati (ms)
BLOCK_SIZE = int(SAMPLE_RATE * BLOCK_DURATION_MS / 1000)

# Molti setup con splitter TRRS arrivano al mic-in del Mac con segnale debole
# (dipende dal telefono/cuffia, non regolabile da qui via software di sistema).
# Invece di richiedere di alzare il volume di ingresso nelle Preferenze di
# Sistema, il segnale viene rinforzato qui prima di mandarlo a Deepgram.
# audioop.mul gestisce da solo il clipping (satura invece di distorcere per
# overflow). Regolabile con --gain se 4x è troppo o troppo poco.
GUADAGNO_AUDIO_DEFAULT = float(os.environ.get("GUADAGNO_AUDIO", "1.5"))

# --- Configurazione Deepgram ---------------------------------------------
DEEPGRAM_API_KEY = os.environ.get("DEEPGRAM_API_KEY")
DEEPGRAM_URL = (
    "wss://api.deepgram.com/v1/listen"
    "?model=nova-2"
    "&language=it"
    "&encoding=linear16"
    f"&sample_rate={SAMPLE_RATE}"
    f"&channels={CHANNELS}"
    "&interim_results=true"
    "&smart_format=true"
    "&punctuate=true"
    "&endpointing=300"   # ms di silenzio prima di considerare chiusa una frase
)


def list_devices():
    print(sd.query_devices())


def resolve_device(device_arg):
    """Se non specificato, prova a indovinare il mic-in di sistema di default."""
    if device_arg is not None:
        return device_arg
    default_input = sd.default.device[0]
    return default_input


class AudioBridge:
    """Ponte tra il callback sincrono di sounddevice e l'invio asincrono a Deepgram."""

    def __init__(self, device, guadagno=GUADAGNO_AUDIO_DEFAULT):
        self.device = device
        self.guadagno = guadagno
        self._audio_q: "queue.Queue[bytes]" = queue.Queue()
        self._stream = None
        self._picco_periodo = 0
        self._ultimo_report = time.monotonic()

    def _callback(self, indata, frames, time_info, status):
        if status:
            print(f"[audio warning] {status}", file=sys.stderr)
        # indata è già int16 mono grazie a dtype/channels impostati sotto
        raw = bytes(indata)
        if self.guadagno != 1.0:
            raw = audioop.mul(raw, 2, self.guadagno)
        self._audio_q.put(raw)

        # Diagnostica: stampa il livello audio massimo una volta al secondo,
        # calcolato DOPO il guadagno (riflette cosa arriva davvero a
        # Deepgram). Serve a capire SE il device sta catturando un segnale
        # (valori alti quando si parla) o solo silenzio (valori vicini a 0).
        campioni = array.array("h")
        campioni.frombytes(raw)
        if campioni:
            self._picco_periodo = max(self._picco_periodo, max(abs(c) for c in campioni))
        ora = time.monotonic()
        if ora - self._ultimo_report >= 1.0:
            print(f"[livello audio] picco ultimo secondo: {self._picco_periodo}/32768", file=sys.stderr)
            self._picco_periodo = 0
            self._ultimo_report = ora

    def start(self):
        self._stream = sd.RawInputStream(
            samplerate=SAMPLE_RATE,
            blocksize=BLOCK_SIZE,
            device=self.device,
            channels=CHANNELS,
            dtype="int16",
            callback=self._callback,
        )
        self._stream.start()

    def stop(self):
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()

    def get_nowait_chunks(self):
        """Ritorna tutti i chunk disponibili senza bloccare."""
        chunks = []
        while True:
            try:
                chunks.append(self._audio_q.get_nowait())
            except queue.Empty:
                break
        return chunks


def on_transcript(text, is_final, on_final_callback=None):
    """
    Punto di aggancio verso il motore di matching script.

    Stampa sempre a schermo. Se `on_final_callback` è fornita, viene
    invocata solo sulle trascrizioni FINALI (non su quelle parziali) con il
    testo del cliente. Accetta sia una funzione normale sia una coroutine
    (usato dal server, che deve interrogare il motore di matching + LLM
    senza bloccare il resto dell'event loop).
    """
    ts = datetime.now().strftime("%H:%M:%S")
    tag = "FINALE" if is_final else "...   "
    print(f"[{ts}] {tag} {text}")
    if is_final and on_final_callback is not None:
        if asyncio.iscoroutinefunction(on_final_callback):
            asyncio.create_task(on_final_callback(text))
        else:
            on_final_callback(text)


async def stream_to_deepgram(device, on_final_callback=None, guadagno=GUADAGNO_AUDIO_DEFAULT):
    if not DEEPGRAM_API_KEY:
        raise RuntimeError(
            "Manca DEEPGRAM_API_KEY. Impostala come variabile d'ambiente o in un file .env."
        )

    bridge = AudioBridge(device, guadagno=guadagno)
    bridge.start()
    print(f"Cattura audio avviata sul device {device} (guadagno {guadagno}x). Ctrl+C per fermare.")

    headers = {"Authorization": f"Token {DEEPGRAM_API_KEY}"}

    async with websockets.connect(DEEPGRAM_URL, additional_headers=headers) as ws:

        async def sender():
            try:
                while True:
                    chunks = bridge.get_nowait_chunks()
                    for chunk in chunks:
                        await ws.send(chunk)
                    await asyncio.sleep(0.05)
            except asyncio.CancelledError:
                pass

        async def receiver():
            async for message in ws:
                data = json.loads(message)
                try:
                    alt = data["channel"]["alternatives"][0]
                except (KeyError, IndexError):
                    continue
                text = alt.get("transcript", "").strip()
                if not text:
                    continue
                is_final = data.get("is_final", False)
                on_transcript(text, is_final, on_final_callback)

        send_task = asyncio.create_task(sender())
        recv_task = asyncio.create_task(receiver())
        try:
            await asyncio.gather(send_task, recv_task)
        except asyncio.CancelledError:
            pass
        finally:
            bridge.stop()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list-devices", action="store_true", help="Elenca i device audio disponibili ed esce.")
    parser.add_argument("--device", type=int, default=None, help="Indice del device di input da usare (vedi --list-devices).")
    parser.add_argument("--gain", type=float, default=GUADAGNO_AUDIO_DEFAULT,
                         help=f"Amplificazione digitale del segnale prima di Deepgram (default {GUADAGNO_AUDIO_DEFAULT}x). "
                              "Alzalo se il livello resta basso parlando, abbassalo se il testo esce distorto/sporco.")
    args = parser.parse_args()

    if args.list_devices:
        list_devices()
        return

    device = resolve_device(args.device)

    try:
        asyncio.run(stream_to_deepgram(device, guadagno=args.gain))
    except KeyboardInterrupt:
        print("\nInterrotto dall'utente.")


if __name__ == "__main__":
    main()
