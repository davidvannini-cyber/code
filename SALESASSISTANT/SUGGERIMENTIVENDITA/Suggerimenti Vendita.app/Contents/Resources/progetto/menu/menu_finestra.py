"""
Finestra principale dell'app "Suggerimenti Vendita": mostra menu/index.html
(pulsanti cliccabili, non più la lista di frasi di osascript "choose from
list") dentro una vera finestra Cocoa, via PyObjC.

Ogni pulsante cliccato manda un messaggio da JavaScript a questo script
(WKScriptMessageHandler, canale "menu"). Qui, alla ricezione, si rilancia
l'eseguibile dell'app stessa con "--azione <nome>": è Contents/MacOS/avvia
a eseguire davvero quella singola funzione (setup, API key, aggiungi
script, avvia chiamata, ecc.) e a mostrare gli stessi dialoghi osascript
di sempre per testo/liste/conferme — qui non è stata duplicata nessuna
logica, solo il modo di SCEGLIERE l'azione è cambiato.

Se questo script non riesce a partire (dipendenze PyObjC non installate),
chi lo lancia (in fondo a Contents/MacOS/avvia) ripiega sul vecchio menu
testuale — vedi lì.

Uso:
    python menu_finestra.py <path_eseguibile_avvia> <project_root> <venv_dir> <env_file>
"""
import http.server
import json
import os
import signal
import subprocess
import sys
import threading
import time

from AppKit import (
    NSApplication,
    NSApplicationActivationPolicyRegular,
    NSBackingStoreBuffered,
    NSImage,
    NSMakeRect,
    NSScreen,
    NSViewHeightSizable,
    NSViewWidthSizable,
    NSWindow,
    NSWindowStyleMaskClosable,
    NSWindowStyleMaskMiniaturizable,
    NSWindowStyleMaskResizable,
    NSWindowStyleMaskTitled,
)
from Foundation import NSObject, NSURL
from PyObjCTools import AppHelper
from WebKit import WKUserContentController, WKWebView, WKWebViewConfiguration

# Usate solo come fallback se NSScreen.mainScreen() non è disponibile (caso
# limite, praticamente mai) — vedi calcola_rettangolo_finestra sotto.
LARGHEZZA = 460
ALTEZZA = 920

# Percentuale di larghezza (dello schermo principale) e offset da sinistra
# per la finestra di questo menu: stesso schema usato da apri-console.command
# (Lead Rework Console, 40%, a sinistra di tutto) e Contents/MacOS/avvia
# (pannello chiamata, 40%, a destra di tutto) — tre finestre affiancate in
# proporzioni fisse (scelte dall'utente), invece di finestre sparse di
# dimensioni diverse. Il menu sta nel mezzo, più stretto: 19%, subito a
# destra della Lead Rework Console (40%).
LARGHEZZA_FRAZIONE = 0.19
OFFSET_FRAZIONE = 0.40


def calcola_rettangolo_finestra():
    """
    "visibleFrame" esclude già barra menu e Dock, origine in basso a
    sinistra (Cocoa): nessuna conversione di coordinate necessaria, è già
    nello spazio giusto per posizionare una NSWindow.
    """
    schermo = NSScreen.mainScreen()
    if schermo is None:
        return NSMakeRect(0, 0, LARGHEZZA, ALTEZZA)
    area = schermo.visibleFrame()
    x = area.origin.x + area.size.width * OFFSET_FRAZIONE
    larghezza = area.size.width * LARGHEZZA_FRAZIONE
    return NSMakeRect(x, area.origin.y, larghezza, area.size.height)

AZIONI_VALIDE = {
    "avvia_chiamata_yesmobility",
    "avvia_chiamata_gestione_lead",
    "avvia_chiamata_rinforzo",
    "rivedi_frasi_raccolte",
    "aggiungi_script",
    "visualizza_libreria",
    "configura_profilo_azienda",
    "setup_ambiente",
    "configura_api_key",
    "test_audio",
    "test_matching",
}


def termina_server_in_background(project_root):
    """
    Il server (server_suggerimenti.py --browser-audio) ora resta acceso tra
    una chiamata e l'altra per non dover ricaricare il modello di matching
    ogni volta (vedi assicura_server_pronto in Contents/MacOS/avvia) — quindi
    quando l'app si chiude va fermato esplicitamente, altrimenti resterebbe
    acceso in background all'infinito anche ad app chiusa.
    """
    pid_file = os.path.join(project_root, "logs", "server.pid")
    try:
        with open(pid_file) as f:
            pid = int(f.read().strip())
    except (FileNotFoundError, ValueError):
        return
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass


# Porta di un mini-server HTTP tutto interno a QUESTO processo (il menu
# principale), diversa da quella del server delle chiamate (8765/8766,
# server_suggerimenti.py). Perché un server separato: il bagliore su
# "Chiamata Gestione Lead" deve accendersi appena arriva un lead dalla Lead
# Rework Console, ANCHE se l'operatore non ha ancora fatto nessuna
# telefonata in questa sessione — cioè proprio nel momento in cui il server
# delle chiamate non è ancora partito (parte solo alla prima telefonata,
# vedi assicura_server_pronto in Contents/MacOS/avvia). Il menu principale
# invece è già vivo per tutta la durata in cui l'app è aperta, quindi è il
# posto giusto per ricevere questo segnale fin da subito.
PORTA_LEAD_IN_ATTESA = 8767
INTERVALLO_POLLING_LEAD_SECONDI = 1  # solo lettura di una variabile in memoria, nessuna rete: possiamo permetterci un controllo frequente

_LEAD_IN_ATTESA = {"nome": None}


class _GestoreLeadInAttesa(http.server.BaseHTTPRequestHandler):
    """
    Riceve da background.js (estensione Lead Rework Console, quando
    l'operatore clicca "Invia a Suggerimenti Vendita") e da
    suggerimenti-vendita-content.js (quando il canovaccio viene davvero
    mostrato in una chiamata "Chiamata Gestione Lead") il segnale
    "c'è"/"non c'è più" un lead in attesa. Accetta richieste da qualunque
    origine (estensione Chrome, pagina dell'overlay su un'altra porta):
    non c'è nulla di sensibile qui dentro, solo un nome di lead.
    """

    def log_message(self, formato, *args):
        pass  # niente output per ogni richiesta, sporcherebbe la console dell'app

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")

    def do_POST(self):
        if self.path == "/lead-in-attesa":
            lunghezza = int(self.headers.get("Content-Length") or 0)
            corpo = self.rfile.read(lunghezza) if lunghezza else b"{}"
            try:
                dati = json.loads(corpo or b"{}")
            except json.JSONDecodeError:
                dati = {}
            _LEAD_IN_ATTESA["nome"] = dati.get("nome") or "lead"
            self.send_response(204)
            self._cors()
            self.end_headers()
            return
        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        if self.path == "/lead-in-attesa":
            _LEAD_IN_ATTESA["nome"] = None
            self.send_response(204)
            self._cors()
            self.end_headers()
            return
        self.send_response(404)
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


def avvia_server_lead_in_attesa():
    """
    Parte insieme al menu (vedi main()), gira per tutta la vita dell'app.
    """
    httpd = http.server.ThreadingHTTPServer(("localhost", PORTA_LEAD_IN_ATTESA), _GestoreLeadInAttesa)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def avvia_polling_lead_in_attesa(webview):
    """
    Ciclo in un thread separato (mai sul thread principale, che deve
    restare libero per l'interfaccia) che controlla periodicamente se c'è
    un lead in attesa e accende/spegne il bagliore sul pulsante "Chiamata
    Gestione Lead" (vedi impostaLeadInAttesa in menu/index.html). Legge
    direttamente la variabile in memoria (stesso processo del server sopra),
    nessuna richiesta di rete: il controllo può essere frequente senza costo.
    """
    def ciclo():
        while True:
            attivo = _LEAD_IN_ATTESA["nome"] is not None
            script = "if (window.impostaLeadInAttesa) impostaLeadInAttesa(%s);" % ("true" if attivo else "false")
            AppHelper.callAfter(lambda s=script: webview.evaluateJavaScript_completionHandler_(s, None))
            time.sleep(INTERVALLO_POLLING_LEAD_SECONDI)

    threading.Thread(target=ciclo, daemon=True).start()


def calcola_stato(venv_dir, env_file):
    py_venv = os.path.join(venv_dir, "bin", "python3")
    if not os.path.isfile(py_venv):
        return False, "ambiente non configurato"
    if not os.path.isfile(env_file):
        return False, "API key non configurate"
    return True, "ambiente pronto"


class GestoreMessaggi(NSObject):
    """Riceve i click dei pulsanti dalla pagina (window.webkit.messageHandlers.menu)."""

    def userContentController_didReceiveScriptMessage_(self, controller, message):
        azione = str(message.body())

        if azione == "esci":
            NSApplication.sharedApplication().terminate_(None)
            return

        if azione not in AZIONI_VALIDE:
            return

        threading.Thread(target=self._esegui_in_background, args=(azione,), daemon=True).start()

    def webView_didFinishNavigation_(self, webview, navigation):
        # Aggiorna lo stato solo quando la pagina ha DAVVERO finito di
        # caricare (delegate di navigazione), non dopo un timer a tempo
        # fisso indovinato: su Mac/dischi più lenti, o alla prima apertura
        # dopo una ri-firma dell'app, il caricamento della WebView può
        # richiedere più di qualche decimo di secondo — un timer fisso senza
        # retry lasciava il testo bloccato su "verifica in corso" per
        # sempre se scattava troppo presto (la funzione impostaStato non
        # era ancora definita, e l'errore veniva ignorato in silenzio).
        pronto, testo = calcola_stato(self.venv_dir, self.env_file)
        script = "impostaStato(%s, %s);" % (
            "true" if pronto else "false",
            json.dumps(testo),
        )
        self.webview.evaluateJavaScript_completionHandler_(script, None)

    def _esegui_in_background(self, azione):
        subprocess.run([self.eseguibile, "--azione", azione])
        AppHelper.callAfter(self._aggiorna_stato_e_sblocca)

    def _aggiorna_stato_e_sblocca(self):
        # Un'azione può aver portato in primo piano un'altra app (es. il
        # browser, per "Avvia sistema per una chiamata"): al suo termine
        # richiamiamo in primo piano la finestra del menu, così l'operatore
        # ci torna senza dover cercarla a mano tra le altre finestre.
        NSApplication.sharedApplication().activateIgnoringOtherApps_(True)
        self.finestra.makeKeyAndOrderFront_(None)

        pronto, testo = calcola_stato(self.venv_dir, self.env_file)
        script = "sbloccaBottoni(); impostaStato(%s, %s);" % (
            "true" if pronto else "false",
            json.dumps(testo),
        )
        self.webview.evaluateJavaScript_completionHandler_(script, None)


class DelegatoApp(NSObject):
    """Chiudere la finestra (bottone rosso) deve terminare l'app, non lasciarla invisibile in esecuzione."""

    def applicationShouldTerminateAfterLastWindowClosed_(self, sender):
        return True

    def applicationWillTerminate_(self, notification):
        # Copre tutti i modi di chiudere l'app (Cmd+Q, bottone rosso, pulsante
        # "Esci"): il server va fermato qui, non solo nel click su "Esci",
        # altrimenti resterebbe acceso in background chiudendo l'app in altri modi.
        termina_server_in_background(self.project_root)

    def application_openURLs_(self, application, urls):
        # Chiamato da AppKit quando qualcuno apre l'URL "suggerimentivendita://"
        # (vedi CFBundleURLTypes in Info.plist) — è così che il bottone "Invia
        # a Suggerimenti Vendita" della Lead Rework Console (un link invisibile
        # cliccato via JS, vedi apriSuggerimentiVendita() in
        # lead-rework-console.html) fa comparire quest'app: macOS la avvia da
        # sola se non è già aperta, o consegna l'evento qui se lo è già.
        # Non serve leggere l'URL: l'unico scopo è portare la finestra del
        # menu in primo piano — il bagliore su "Chiamata Gestione Lead" lo
        # accende da solo il polling già attivo (avvia_polling_lead_in_attesa),
        # entro pochi secondi.
        NSApplication.sharedApplication().activateIgnoringOtherApps_(True)
        if getattr(self, "finestra", None) is not None:
            self.finestra.makeKeyAndOrderFront_(None)


def crea_finestra(eseguibile, project_root):
    controller = WKUserContentController.alloc().init()
    gestore = GestoreMessaggi.alloc().init()
    gestore.eseguibile = eseguibile
    controller.addScriptMessageHandler_name_(gestore, "menu")

    config = WKWebViewConfiguration.alloc().init()
    config.setUserContentController_(controller)

    stile = (
        NSWindowStyleMaskTitled
        | NSWindowStyleMaskClosable
        | NSWindowStyleMaskResizable
        | NSWindowStyleMaskMiniaturizable
    )
    rettangolo = calcola_rettangolo_finestra()
    finestra = NSWindow.alloc().initWithContentRect_styleMask_backing_defer_(
        rettangolo, stile, NSBackingStoreBuffered, False
    )
    finestra.setTitle_("Suggerimenti Vendita")
    # Niente più NSFloatingWindowLevel: con le 3 finestre affiancate in
    # colonne fisse (vedi calcola_rettangolo_finestra) non deve stare sempre
    # sopra le altre due, altrimenti le copre quando si sovrappongono.
    finestra.setReleasedWhenClosed_(False)
    if NSScreen.mainScreen() is None:
        finestra.center()

    webview = WKWebView.alloc().initWithFrame_configuration_(
        NSMakeRect(0, 0, rettangolo.size.width, rettangolo.size.height), config
    )
    webview.setAutoresizingMask_(NSViewWidthSizable | NSViewHeightSizable)
    finestra.setContentView_(webview)

    gestore.webview = webview
    webview.setNavigationDelegate_(gestore)

    cartella_menu = os.path.dirname(os.path.abspath(__file__))
    percorso_html = os.path.join(cartella_menu, "index.html")
    webview.loadFileURL_allowingReadAccessToURL_(
        NSURL.fileURLWithPath_(percorso_html),
        NSURL.fileURLWithPath_(cartella_menu),
    )

    finestra.makeKeyAndOrderFront_(None)
    return finestra, webview, gestore


def imposta_icona_dock(project_root):
    # project_root e' Contents/Resources/progetto: l'icona sta un livello sopra.
    percorso_icona = os.path.join(os.path.dirname(project_root), "icona.icns")
    if not os.path.isfile(percorso_icona):
        return
    immagine = NSImage.alloc().initWithContentsOfFile_(percorso_icona)
    if immagine is not None:
        NSApplication.sharedApplication().setApplicationIconImage_(immagine)


def main():
    if len(sys.argv) < 5:
        print("Uso: menu_finestra.py <eseguibile_avvia> <project_root> <venv_dir> <env_file>", file=sys.stderr)
        sys.exit(2)

    eseguibile, project_root, venv_dir, env_file = sys.argv[1:5]

    app = NSApplication.sharedApplication()
    app.setActivationPolicy_(NSApplicationActivationPolicyRegular)
    delegato = DelegatoApp.alloc().init()
    delegato.project_root = project_root
    app.setDelegate_(delegato)

    imposta_icona_dock(project_root)

    finestra, webview, gestore = crea_finestra(eseguibile, project_root)
    gestore.venv_dir = venv_dir
    gestore.env_file = env_file
    gestore.finestra = finestra
    delegato.finestra = finestra

    app.activateIgnoringOtherApps_(True)

    avvia_server_lead_in_attesa()
    avvia_polling_lead_in_attesa(webview)

    # Il primo aggiornamento dello stato parte da webView_didFinishNavigation_
    # (chiamato dal sistema quando la pagina ha davvero finito di caricare),
    # non più da un timer a tempo fisso indovinato.

    AppHelper.runEventLoop()


if __name__ == "__main__":
    main()
