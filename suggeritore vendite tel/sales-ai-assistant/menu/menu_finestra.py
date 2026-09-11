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
import json
import os
import subprocess
import sys
import threading

from AppKit import (
    NSApplication,
    NSApplicationActivationPolicyRegular,
    NSBackingStoreBuffered,
    NSImage,
    NSMakeRect,
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

LARGHEZZA = 460
ALTEZZA = 700

AZIONI_VALIDE = {
    "avvia_chiamata",
    "rivedi_frasi_raccolte",
    "aggiungi_script",
    "visualizza_libreria",
    "configura_profilo_azienda",
    "setup_ambiente",
    "configura_api_key",
    "test_audio",
    "test_matching",
}


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

    def _esegui_in_background(self, azione):
        subprocess.run([self.eseguibile, "--azione", azione])
        AppHelper.callAfter(self._aggiorna_stato_e_sblocca)

    def _aggiorna_stato_e_sblocca(self):
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
    finestra = NSWindow.alloc().initWithContentRect_styleMask_backing_defer_(
        NSMakeRect(0, 0, LARGHEZZA, ALTEZZA), stile, NSBackingStoreBuffered, False
    )
    finestra.setTitle_("Suggerimenti Vendita")
    finestra.setReleasedWhenClosed_(False)
    finestra.center()

    webview = WKWebView.alloc().initWithFrame_configuration_(
        NSMakeRect(0, 0, LARGHEZZA, ALTEZZA), config
    )
    webview.setAutoresizingMask_(NSViewWidthSizable | NSViewHeightSizable)
    finestra.setContentView_(webview)

    gestore.webview = webview

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
    app.setDelegate_(delegato)

    imposta_icona_dock(project_root)

    finestra, webview, gestore = crea_finestra(eseguibile, project_root)
    gestore.venv_dir = venv_dir
    gestore.env_file = env_file

    app.activateIgnoringOtherApps_(True)

    pronto, testo = calcola_stato(venv_dir, env_file)
    script_iniziale = "impostaStato(%s, %s);" % ("true" if pronto else "false", json.dumps(testo))
    AppHelper.callLater(0.4, lambda: webview.evaluateJavaScript_completionHandler_(script_iniziale, None))

    AppHelper.runEventLoop()


if __name__ == "__main__":
    main()
