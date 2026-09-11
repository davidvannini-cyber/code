"""
Server centrale del sistema di suggerimenti live.

Cosa fa, in ordine:
1. Avvia la cattura audio + STT streaming (riusa audio-capture/cattura_audio_stt.py).
2. Ad ogni trascrizione FINALE della voce del cliente, interroga il motore
   di matching (matching-engine/motore_suggerimenti.py: retrieval semantico
   + classificatore LLM leggero).
3. Trasmette via WebSocket, a tutte le pagine overlay collegate, sia la
   trascrizione sia il suggerimento scelto (fase chiamata, testo principale,
   alternativa) e i dati CRM del lead.
4. Salva ogni frase finale del cliente (+ esito del matching) in
   logs/frasi_raccolte.jsonl, così può essere rivista dopo la chiamata per
   arricchire la libreria script (vedi matching-engine/gestione_frasi_raccolte.py
   e la voce "Rivedi frasi raccolte dalle chiamate" nell'app).

È il pezzo che chiude la pipeline descritta nella Decisione 3 del progetto
("Interfaccia a monitor").

Setup:
    pip install -r requirements.txt
    pip install -r ../audio-capture/requirements.txt
    pip install -r ../matching-engine/requirements.txt
    export DEEPGRAM_API_KEY=...
    export ANTHROPIC_API_KEY=...

Uso:
    python server_suggerimenti.py
    python server_suggerimenti.py --contesto contesto-sessione-esempio.json --device 2

Poi apri overlay/index.html nel browser: si collega automaticamente a
ws://localhost:8765 e mostra i suggerimenti in tempo reale.
"""

import argparse
import asyncio
import json
import os
import sys
import uuid
from datetime import datetime

# Rende importabili gli script nelle cartelle sorelle senza doverli installare come pacchetti.
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "audio-capture"))
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "matching-engine"))

from cattura_audio_stt import stream_to_deepgram, resolve_device, list_devices  # noqa: E402
from motore_suggerimenti import MotoreSuggerimenti  # noqa: E402

import websockets

PORTA_WEBSOCKET = 8765
RADICE_PROGETTO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PATH_LOG_FRASI = os.path.join(RADICE_PROGETTO, "logs", "frasi_raccolte.jsonl")

CLIENTS_OVERLAY = set()


def logga_frase_cliente(testo: str, script_scelto_id, fase: str):
    """
    Salva ogni frase finale del cliente + esito del matching in un log
    append-only (una riga JSON per frase). È la materia prima per arricchire
    la libreria script dopo le chiamate (vedi
    matching-engine/gestione_frasi_raccolte.py).
    """
    voce = {
        "id": uuid.uuid4().hex[:10],
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "testo": testo,
        "script_scelto": script_scelto_id,
        "fase_rilevata": fase,
        "revisionata": False,
    }
    os.makedirs(os.path.dirname(PATH_LOG_FRASI), exist_ok=True)
    with open(PATH_LOG_FRASI, "a", encoding="utf-8") as f:
        f.write(json.dumps(voce, ensure_ascii=False) + "\n")


async def broadcast(messaggio: dict):
    """Invia un messaggio JSON a tutte le pagine overlay attualmente collegate."""
    if not CLIENTS_OVERLAY:
        return
    payload = json.dumps(messaggio, ensure_ascii=False)
    await asyncio.gather(
        *(client.send(payload) for client in CLIENTS_OVERLAY),
        return_exceptions=True,
    )


async def gestore_overlay(websocket, motore: MotoreSuggerimenti):
    """Gestisce ogni pagina overlay che si collega al server."""
    CLIENTS_OVERLAY.add(websocket)
    try:
        # Alla connessione, manda subito i dati del lead così l'overlay li mostra da subito.
        lead = (motore.contesto_sessione or {}).get("lead", {})
        await websocket.send(json.dumps({"tipo": "init", "lead": lead}, ensure_ascii=False))
        async for _ in websocket:
            pass  # l'overlay non invia comandi al server, per ora
    finally:
        CLIENTS_OVERLAY.discard(websocket)


def crea_gestore_frase_finale(motore: MotoreSuggerimenti):
    """
    Ritorna la callback asincrona da passare a stream_to_deepgram.
    Interroga il motore (che fa chiamate di rete/CPU bloccanti: embedding +
    classificatore LLM) in un thread separato, per non bloccare l'event loop
    che sta anche gestendo audio e WebSocket.
    """

    async def gestisci_frase_finale(testo_cliente: str):
        await broadcast({"tipo": "trascrizione", "testo": testo_cliente})

        loop = asyncio.get_running_loop()
        suggerimento = await loop.run_in_executor(None, motore.suggerisci, testo_cliente)

        script_scelto_id = suggerimento["id"] if suggerimento else None
        logga_frase_cliente(testo_cliente, script_scelto_id, motore.fase_corrente)

        if suggerimento:
            await broadcast({
                "tipo": "suggerimento",
                "fase_chiamata": suggerimento["fase_chiamata"],
                "testo_suggerimento": suggerimento["testo_suggerimento"],
                "testo_alternativo": suggerimento.get("testo_alternativo"),
                "trigger_categoria": suggerimento["trigger_categoria"],
            })
        else:
            await broadcast({"tipo": "nessun_suggerimento"})

    return gestisci_frase_finale


async def main_async(args):
    motore = MotoreSuggerimenti(args.libreria, args.contesto)
    print(f"Libreria caricata: {len(motore.libreria)} script.")
    print(f"Lead sessione: {motore.contesto_sessione.get('lead', {}).get('nome', 'n/d')}")

    gestisci_frase_finale = crea_gestore_frase_finale(motore)

    device = resolve_device(args.device)

    server_ws = await websockets.serve(
        lambda ws: gestore_overlay(ws, motore), "localhost", PORTA_WEBSOCKET
    )
    print(f"Server overlay in ascolto su ws://localhost:{PORTA_WEBSOCKET}")
    print("Apri overlay/index.html nel browser per vedere i suggerimenti.")

    try:
        await stream_to_deepgram(device, on_final_callback=gestisci_frase_finale)
    finally:
        server_ws.close()
        await server_ws.wait_closed()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--libreria", default="../schema/esempio-libreria-script.json",
                         help="Path al file JSON della libreria script.")
    parser.add_argument("--contesto", default="contesto-sessione-esempio.json",
                         help="Path al file JSON del contesto di sessione (lead + regole operatore).")
    parser.add_argument("--device", type=int, default=None, help="Indice del device audio di input.")
    parser.add_argument("--list-devices", action="store_true", help="Elenca i device audio ed esce.")
    args = parser.parse_args()

    if args.list_devices:
        list_devices()
        return

    try:
        asyncio.run(main_async(args))
    except KeyboardInterrupt:
        print("\nServer interrotto dall'utente.")


if __name__ == "__main__":
    main()
