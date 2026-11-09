"""Audio sul Mac: collega il telefono (jack) all'agente AI oppure alle cuffie Bluetooth (SPECIFICA.md §5).

Tre modi:
  ai     telefono <-> agente AI            (la voce del cliente va all'AI, la voce dell'AI al telefono)
  umano  telefono <-> cuffie Bluetooth     (passaggio al responsabile; l'AI è già chiusa)
  fermo  niente

Formato audio ovunque: PCM 16 bit, mono, 16000 Hz (come vuole ElevenLabs Agents).
Funziona con la libreria `sounddevice` (installata da installa.command). Nei test si usa `AudioRouter(backend=None)`
e si chiamano direttamente i metodi `_in_telefono` / `_in_cuffie`.
"""
import array
import collections
import math
import threading

RATE = 16000
BLOCCO = 320  # 20 ms


def rms(b):
    a = array.array("h")
    a.frombytes(b[: len(b) // 2 * 2])
    if not a:
        return 0.0
    return math.sqrt(sum(x * x for x in a) / len(a))


def _goertzel(a, freq):
    k = 2 * math.cos(2 * math.pi * freq / RATE)
    s1 = s2 = 0.0
    for x in a:
        s = x + k * s1 - s2
        s2, s1 = s1, s
    return s1 * s1 + s2 * s2 - k * s1 * s2


def e_tono(b, freq=425.0):
    """True se il blocco è quasi solo un tono a ~425 Hz (segnale di «libero» italiano)."""
    a = array.array("h")
    a.frombytes(b[: len(b) // 2 * 2])
    if len(a) < 64:
        return False
    tot = sum(x * x for x in a)
    if tot <= 0:
        return False
    p = _goertzel(a, freq) * 2 / len(a)
    return p / tot > 0.6


class RilevatoreRisposta:
    """Dice «ha risposto» quando sente voce (non il tono di libero) per `ms_voce` millisecondi in totale."""

    def __init__(self, soglia_rms=300.0, ms_voce=600):
        self.soglia, self.ms_voce = soglia_rms, ms_voce
        self.attivo = False
        self.ms = 0
        self.callback = None

    def avvia(self, callback):
        self.callback, self.ms, self.attivo = callback, 0, True

    def ferma(self):
        self.attivo = False

    def blocco(self, b):
        if not self.attivo:
            return
        if rms(b) >= self.soglia and not e_tono(b):
            self.ms += len(b) // 2 * 1000 // RATE
            if self.ms >= self.ms_voce:
                self.attivo = False
                if self.callback:
                    self.callback()


class AudioRouter:
    def __init__(self, cfg=None, backend="sounddevice"):
        self.cfg = cfg or {}
        self.modo = "fermo"
        self.ai_sink = None            # funzione(bytes): voce del cliente verso l'AI
        self.rilevatore = RilevatoreRisposta(self.cfg.get("soglia_voce", 300.0))
        self.coda_tel = collections.deque(maxlen=200)    # verso il telefono
        self.coda_cuf = collections.deque(maxlen=200)    # verso le cuffie
        self.lock = threading.Lock()
        self.flussi = []
        self.picco_tel = 0.0
        self._sd = None
        if backend == "sounddevice":
            try:
                import sounddevice as sd
                self._sd = sd
            except Exception:
                self._sd = None

    # ---- dispositivi ----
    @staticmethod
    def elenco():
        import sounddevice as sd
        return sd.query_devices()

    def _trova(self, frammento, ingresso):
        if not frammento:
            return None
        for i, d in enumerate(self._sd.query_devices()):
            canali = d["max_input_channels"] if ingresso else d["max_output_channels"]
            if canali > 0 and frammento.lower() in d["name"].lower():
                return i
        raise RuntimeError(f"Dispositivo audio non trovato: «{frammento}» (usa --dispositivi per l'elenco)")

    def apri(self):
        """Apre i 4 flussi (telefono dentro/fuori, cuffie dentro/fuori)."""
        if not self._sd:
            raise RuntimeError("Libreria audio `sounddevice` non installata: lancia installa.command")
        sd, c = self._sd, self.cfg
        kw = dict(samplerate=RATE, channels=1, dtype="int16", blocksize=BLOCCO)
        self.flussi = [
            sd.RawInputStream(device=self._trova(c.get("telefono"), True), callback=self._cb_in_tel, **kw),
            sd.RawOutputStream(device=self._trova(c.get("telefono"), False), callback=self._cb_out_tel, **kw),
        ]
        if c.get("cuffie"):
            self.flussi += [
                sd.RawInputStream(device=self._trova(c["cuffie"], True), callback=self._cb_in_cuf, **kw),
                sd.RawOutputStream(device=self._trova(c["cuffie"], False), callback=self._cb_out_cuf, **kw),
            ]
        for f in self.flussi:
            f.start()

    def chiudi(self):
        self.modo = "fermo"
        for f in self.flussi:
            try:
                f.stop(); f.close()
            except Exception:
                pass
        self.flussi = []

    # ---- modi ----
    def imposta_modo(self, modo):
        assert modo in ("ai", "umano", "fermo")
        with self.lock:
            self.modo = modo
            self.coda_tel.clear()
            self.coda_cuf.clear()

    def parla_al_telefono(self, pcm):
        """Voce dell'AI verso il cliente (solo in modo ai)."""
        if self.modo == "ai":
            for i in range(0, len(pcm), BLOCCO * 2):
                self.coda_tel.append(pcm[i:i + BLOCCO * 2])

    def interrompi(self):
        self.coda_tel.clear()

    # ---- ingressi (chiamati dal thread audio) ----
    def _in_telefono(self, b):
        self.picco_tel = max(rms(b), self.picco_tel * 0.95)
        self.rilevatore.blocco(b)
        if self.modo == "ai" and self.ai_sink:
            self.ai_sink(b)
        elif self.modo == "umano":
            self.coda_cuf.append(b)

    def _in_cuffie(self, b):
        if self.modo == "umano":
            self.coda_tel.append(b)

    def _cb_in_tel(self, indata, frames, t, status):
        self._in_telefono(bytes(indata))

    def _cb_in_cuf(self, indata, frames, t, status):
        self._in_cuffie(bytes(indata))

    @staticmethod
    def _riempi(coda, outdata, frames):
        n = frames * 2
        buf = b""
        while len(buf) < n and coda:
            buf += coda.popleft()
        if len(buf) < n:
            buf += b"\x00" * (n - len(buf))
        elif len(buf) > n:
            coda.appendleft(buf[n:])
            buf = buf[:n]
        outdata[:] = buf

    def _cb_out_tel(self, outdata, frames, t, status):
        self._riempi(self.coda_tel, outdata, frames)

    def _cb_out_cuf(self, outdata, frames, t, status):
        self._riempi(self.coda_cuf, outdata, frames)
