"""
Server centrale del sistema di suggerimenti live.

Cosa fa, in ordine:
1. Avvia la cattura audio + STT streaming (riusa audio-capture/cattura_audio_stt.py).
2. Ad ogni trascrizione FINALE della voce del cliente, interroga il motore
   di matching (matching-engine/motore_suggerimenti.py: classificatore LLM
   leggero sulla libreria ammessa).
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
import array
import asyncio
import functools
import http.server
import json
import os
import sys
import threading
import time
import uuid
from datetime import datetime
from urllib.parse import urlparse, parse_qs

# Rende importabili gli script nelle cartelle sorelle senza doverli installare come pacchetti.
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "audio-capture"))
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "matching-engine"))

from cattura_audio_stt import (  # noqa: E402
    stream_to_deepgram, resolve_device, list_devices,
    GUADAGNO_AUDIO_DEFAULT, DEEPGRAM_API_KEY, DEEPGRAM_URL,
)
from motore_suggerimenti import MotoreSuggerimenti  # noqa: E402

import websockets

PORTA_WEBSOCKET = 8765
PORTA_HTTP_OVERLAY = 8766
RADICE_PROGETTO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CARTELLA_OVERLAY = os.path.join(RADICE_PROGETTO, "overlay")
PATH_LOG_FRASI = os.path.join(RADICE_PROGETTO, "logs", "frasi_raccolte.jsonl")
PATH_MARKER_CHIAMATA = os.path.join(RADICE_PROGETTO, "logs", "chiamata_attiva")
PATH_CANOVACCIO_RINFORZO = os.path.join(RADICE_PROGETTO, "schema", "canovaccio-rinforzo-facile-salire.json")

# Valore del parametro "avvio" nell'URL (vedi Contents/MacOS/avvia,
# avvia_chiamata_comune, e overlay/index.html) per la modalità "Rinforzo
# Facile Salire": mostra subito il canovaccio dedicato (PATH_CANOVACCIO_RINFORZO),
# invece di aspettare la prima frase del cliente (flusso standard).
PARAMETRO_AVVIO_RINFORZO = "rinforzo_facile_salire"


def _carica_canovaccio_rinforzo():
    """
    Il canovaccio di "Rinforzo Facile Salire" non è uno script della
    libreria (non va proposto dal matching semantico, va solo mostrato
    subito e per intero): vive in un file JSON a parte in schema/. Se manca
    o è malformato, la modalità "Rinforzo Facile Salire" resta comunque
    utilizzabile (si comporta come il flusso standard, senza canovaccio).
    """
    try:
        with open(PATH_CANOVACCIO_RINFORZO, "r", encoding="utf-8") as f:
            return json.load(f)["testo"]
    except (FileNotFoundError, KeyError, json.JSONDecodeError) as errore:
        print(f"ATTENZIONE: canovaccio Rinforzo Facile Salire non caricato ({errore}).", file=sys.stderr)
        return None


CANOVACCIO_RINFORZO = _carica_canovaccio_rinforzo()


CLIENTS_OVERLAY = set()
_CHIAMATE_ATTIVE = 0  # contatore connessioni --browser-audio correnti, vedi _segna_chiamata()


def _segna_chiamata(delta: int):
    """
    Aggiorna logs/chiamata_attiva: il file esiste (con dentro il numero di
    connessioni correnti) quando c'è almeno una chiamata in corso, altrimenti
    viene rimosso. Contents/MacOS/avvia lo usa per sapere quando riabilitare
    il menu — il processo del server ora resta acceso tra una chiamata e
    l'altra (il modello di matching resta caricato in memoria, per non dover
    aspettare 15+ secondi di ricaricamento ad ogni chiamata), quindi non si
    può più usare "il processo è morto" come segnale di fine chiamata.
    """
    global _CHIAMATE_ATTIVE
    _CHIAMATE_ATTIVE = max(0, _CHIAMATE_ATTIVE + delta)
    os.makedirs(os.path.dirname(PATH_MARKER_CHIAMATA), exist_ok=True)
    if _CHIAMATE_ATTIVE > 0:
        with open(PATH_MARKER_CHIAMATA, "w", encoding="utf-8") as f:
            f.write(str(_CHIAMATE_ATTIVE))
    else:
        try:
            os.remove(PATH_MARKER_CHIAMATA)
        except FileNotFoundError:
            pass


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


class _GestoreOverlaySenzaCache(http.server.SimpleHTTPRequestHandler):
    """
    Come SimpleHTTPRequestHandler, ma dice esplicitamente al browser di non
    mettere mai in cache pagina/asset: l'overlay è sempre raggiunto dallo
    stesso indirizzo fisso (http://localhost:8766/) tra un test/una chiamata
    e l'altra, quindi Safari/Chrome tendono a riservare la versione vista
    l'ultima volta — capitava con index.html e con il logo dopo un
    aggiornamento dei file, mostrando contenuto vecchio finché non si faceva
    un refresh forzato a mano.
    """

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def avvia_server_http_overlay():
    """
    Serve la cartella overlay/ via HTTP locale (non file://): i browser
    concedono il microfono via getUserMedia solo da un'origine "sicura"
    (http/https su localhost va bene, un file aperto direttamente no in
    diversi browser). Usato solo dalla modalità --browser-audio.
    """
    gestore = functools.partial(_GestoreOverlaySenzaCache, directory=CARTELLA_OVERLAY)
    httpd = http.server.ThreadingHTTPServer(("localhost", PORTA_HTTP_OVERLAY), gestore)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


async def gestisci_audio_da_browser(websocket, gestisci_frase_finale):
    """
    Riceve i frame audio grezzi (PCM16 mono 16kHz) catturati con getUserMedia
    dalla pagina overlay/index.html e li inoltra a Deepgram — stesso ruolo di
    audio-capture/cattura_audio_stt.py, ma qui il microfono lo cattura il
    browser (già un'app firmata regolarmente), non questo processo: nessun
    permesso di sistema da richiedere qui.
    """
    if not DEEPGRAM_API_KEY:
        print("ATTENZIONE: manca DEEPGRAM_API_KEY, non posso inoltrare l'audio del browser.", file=sys.stderr)
        return

    headers = {"Authorization": f"Token {DEEPGRAM_API_KEY}"}
    async with websockets.connect(DEEPGRAM_URL, additional_headers=headers) as dg_ws:

        async def inoltra_a_deepgram():
            # Diagnostica: stampa il livello audio massimo una volta al
            # secondo, come fa audio-capture/cattura_audio_stt.py per il
            # percorso da terminale — qui serve a distinguere "non arriva
            # nessun byte dal browser" (bug lato pagina/WebSocket) da
            # "arrivano byte ma quasi solo silenzio" (device audio di
            # sistema sbagliato: il browser cattura il device di INPUT
            # DI DEFAULT, non necessariamente lo splitter TRRS scelto nel
            # test da terminale).
            picco_periodo = 0
            ultimo_report = time.monotonic()
            try:
                async for messaggio in websocket:
                    if isinstance(messaggio, (bytes, bytearray)):
                        campioni = array.array("h")
                        campioni.frombytes(bytes(messaggio))
                        if campioni:
                            picco_periodo = max(picco_periodo, max(abs(c) for c in campioni))
                        ora = time.monotonic()
                        if ora - ultimo_report >= 1.0:
                            print(f"[livello audio browser] picco ultimo secondo: {picco_periodo}/32768", file=sys.stderr)
                            picco_periodo = 0
                            ultimo_report = ora
                        await dg_ws.send(messaggio)
                    else:
                        # Messaggio testuale (JSON) dalla pagina: per ora
                        # l'unico comando è "termina", dal pulsante "Termina
                        # chiamata" — sostituisce il dialogo di sistema che
                        # chiedeva di premere OK per fermare la chiamata.
                        try:
                            comando = json.loads(messaggio)
                        except (json.JSONDecodeError, TypeError):
                            continue
                        if comando.get("tipo") == "termina":
                            break
            except websockets.exceptions.ConnectionClosed:
                pass

        async def ricevi_da_deepgram():
            async for messaggio in dg_ws:
                dati = json.loads(messaggio)
                try:
                    alt = dati["channel"]["alternatives"][0]
                except (KeyError, IndexError):
                    continue
                testo = alt.get("transcript", "").strip()
                if not testo:
                    continue
                if dati.get("is_final", False):
                    await gestisci_frase_finale(testo)

        invio = asyncio.create_task(inoltra_a_deepgram())
        ricezione = asyncio.create_task(ricevi_da_deepgram())
        # FIRST_COMPLETED, non gather: se il browser manda "termina" (invio
        # finisce) non vogliamo restare bloccati ad aspettare anche
        # ricezione, che si sblocca solo quando Deepgram chiude la propria
        # connessione per inattività — anche diversi secondi. Quell'attesa
        # si ripercuoteva sul processo del server (che non si spegneva) e
        # quindi sul menu principale, che restava disattivato finché il
        # server non finiva di chiudersi del tutto.
        _, in_sospeso = await asyncio.wait(
            {invio, ricezione}, return_when=asyncio.FIRST_COMPLETED
        )
        for task in in_sospeso:
            task.cancel()
        await asyncio.gather(*in_sospeso, return_exceptions=True)


async def broadcast(messaggio: dict):
    """Invia un messaggio JSON a tutte le pagine overlay attualmente collegate."""
    if not CLIENTS_OVERLAY:
        return
    payload = json.dumps(messaggio, ensure_ascii=False)
    await asyncio.gather(
        *(client.send(payload) for client in CLIENTS_OVERLAY),
        return_exceptions=True,
    )


async def gestore_overlay(websocket, motore: MotoreSuggerimenti, gestisci_frase_finale=None):
    """
    Gestisce ogni pagina overlay che si collega al server.

    Se `gestisci_frase_finale` è fornita (modalità --browser-audio), questa
    stessa connessione porta anche i frame audio catturati dal browser: li
    inoltra a Deepgram finché la pagina resta aperta. Altrimenti (modalità
    classica, microfono catturato da questo processo) la connessione serve
    solo a mostrare i suggerimenti, come prima.
    """
    CLIENTS_OVERLAY.add(websocket)
    chiamata_browser = gestisci_frase_finale is not None
    if chiamata_browser:
        # Nuova chiamata su un processo che resta acceso tra una chiamata e
        # l'altra: resetta fase mostrata + ricarica la libreria script (vedi
        # MotoreSuggerimenti.nuova_chiamata), e segnala l'inizio via marker
        # file così Contents/MacOS/avvia sa quando disabilitare il menu.
        motore.nuova_chiamata()
        _segna_chiamata(+1)
    try:
        # Alla connessione, manda subito i dati del lead di sessione così l'overlay li mostra da subito.
        # Il canovaccio di un lead specifico dalla Lead Rework Console viaggia
        # SOLO lato browser (chrome.storage.local + content script, vedi
        # suggerimenti-vendita-content.js) — non passa più da qui: prima
        # esisteva anche una via file (lead-corrente.json, letta ad ogni
        # chiamata), rimossa perché in conflitto con il filtro per modalità
        # (avrebbe mostrato il canovaccio anche in "Chiamata YesMobility",
        # che deve restare sola gestione telefonata) e perché un file lasciato
        # lì da un vecchio test mostrava per sempre lo stesso canovaccio
        # vecchio, ignorando ogni nuovo lead esportato.
        lead = (motore.contesto_sessione or {}).get("lead", {})
        await websocket.send(json.dumps({"tipo": "init", "lead": lead}, ensure_ascii=False))

        canovaccio_testo = None
        parametri = parse_qs(urlparse(websocket.request.path).query)
        parametro_avvio = (parametri.get("avvio") or [""])[0]
        if parametro_avvio == PARAMETRO_AVVIO_RINFORZO and CANOVACCIO_RINFORZO is not None:
            canovaccio_testo = CANOVACCIO_RINFORZO

        if canovaccio_testo:
            # Manda il canovaccio come messaggio a parte (tipo "canovaccio",
            # non "suggerimento") così l'overlay lo mostra in un riquadro
            # SEPARATO e sempre visibile per tutta la chiamata, mentre il
            # normale sistema di suggerimenti dal vivo (ascolto cliente +
            # matching + gestione obiezioni) resta attivo esattamente come
            # nel flusso standard.
            await websocket.send(json.dumps(
                {"tipo": "canovaccio", "testo": canovaccio_testo}, ensure_ascii=False
            ))

        if chiamata_browser:
            await gestisci_audio_da_browser(websocket, gestisci_frase_finale)
        else:
            async for _ in websocket:
                pass  # l'overlay non invia comandi al server, per ora
    except websockets.exceptions.ConnectionClosed:
        pass  # normale quando l'overlay si chiude o la chiamata viene fermata
    finally:
        CLIENTS_OVERLAY.discard(websocket)
        if chiamata_browser:
            _segna_chiamata(-1)


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

    if args.browser_audio:
        # Microfono catturato dal browser (getUserMedia in overlay/index.html):
        # nessun permesso di sistema richiesto qui, ma la pagina va aperta via
        # HTTP (non file://) perché il browser conceda il microfono.
        #
        # Il processo resta acceso in continuazione, PER PIÙ CHIAMATE: il
        # motore (con il modello di embedding, l'unica cosa lenta da
        # caricare) è già stato istanziato sopra e resta in memoria tra una
        # chiamata e l'altra, invece di essere ricaricato da zero ogni volta
        # — è il motivo per cui la prima chiamata di una sessione richiede
        # 15+ secondi mentre le successive partono quasi subito. Ogni
        # connessione della pagina overlay gestisce da sola inizio/fine
        # della propria chiamata (vedi gestore_overlay/_segna_chiamata):
        # qui sotto si resta semplicemente in ascolto finché il processo non
        # viene terminato dall'esterno (chiusura dell'app, vedi
        # menu_finestra.py, o Ctrl+C/SIGINT da terminale).
        server_http = avvia_server_http_overlay()
        server_ws = await websockets.serve(
            lambda ws: gestore_overlay(ws, motore, gestisci_frase_finale), "localhost", PORTA_WEBSOCKET
        )
        print(f"Server overlay in ascolto su ws://localhost:{PORTA_WEBSOCKET}")
        print(f"Apri http://localhost:{PORTA_HTTP_OVERLAY}/ nel browser e premi \"Avvia microfono\".")
        try:
            await asyncio.Event().wait()
        finally:
            server_ws.close()
            await server_ws.wait_closed()
            server_http.shutdown()
    else:
        device = resolve_device(args.device)
        server_ws = await websockets.serve(
            lambda ws: gestore_overlay(ws, motore), "localhost", PORTA_WEBSOCKET
        )
        print(f"Server overlay in ascolto su ws://localhost:{PORTA_WEBSOCKET}")
        print("Apri overlay/index.html nel browser per vedere i suggerimenti.")

        try:
            await stream_to_deepgram(device, on_final_callback=gestisci_frase_finale, guadagno=args.gain)
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
    parser.add_argument("--gain", type=float, default=None,
                         help="Amplificazione digitale del segnale audio prima di Deepgram "
                              "(default: variabile GUADAGNO_AUDIO o 4.0x). Vedi audio-capture/cattura_audio_stt.py.")
    parser.add_argument("--browser-audio", action="store_true",
                         help="Cattura il microfono dal browser (pagina overlay via HTTP) invece che da "
                              "questo processo: nessun permesso di sistema richiesto qui. Usata dall'app grafica.")
    args = parser.parse_args()

    if args.gain is None:
        args.gain = GUADAGNO_AUDIO_DEFAULT

    if args.list_devices:
        list_devices()
        return

    try:
        asyncio.run(main_async(args))
    except KeyboardInterrupt:
        print("\nServer interrotto dall'utente.")


if __name__ == "__main__":
    main()
