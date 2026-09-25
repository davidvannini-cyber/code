"""
Finestra flottante "sempre in primo piano" per l'overlay dei suggerimenti.

Prima l'overlay si apriva come una normale scheda del browser: bastava
cliccare su un'altra finestra (il CRM, il dialer) per farlo sparire dietro.
Questo script apre invece una vera finestra di sistema (Cocoa, via PyObjC)
con dentro lo stesso overlay/index.html, impostata a un livello "flottante":
resta visibile sopra le altre finestre, anche cambiando app o Spaces, anche
sopra un'app a schermo intero.

Setup:
    pip install -r requirements.txt   (dentro overlay/)

Uso:
    python overlay_finestra.py

Se questo script non riesce a partire (dipendenze PyObjC non installate,
o macOS troppo vecchio), chi lo lancia (avvia_chiamata() nell'app,
avvia_sistema_completo() nello script da terminale) ripiega sull'apertura
in una normale scheda del browser — vedi lì il fallback.
"""
import os

from AppKit import (
    NSApplication,
    NSApplicationActivationPolicyAccessory,
    NSBackingStoreBuffered,
    NSFloatingWindowLevel,
    NSMakeRect,
    NSScreen,
    NSViewHeightSizable,
    NSViewWidthSizable,
    NSWindow,
    NSWindowCollectionBehaviorCanJoinAllSpaces,
    NSWindowCollectionBehaviorFullScreenAuxiliary,
    NSWindowStyleMaskClosable,
    NSWindowStyleMaskMiniaturizable,
    NSWindowStyleMaskResizable,
    NSWindowStyleMaskTitled,
)
from Foundation import NSURL
from PyObjCTools import AppHelper
from WebKit import WKWebView

LARGHEZZA = 420
ALTEZZA = 620
MARGINE_DAL_BORDO = 24


def crea_finestra():
    schermo = NSScreen.mainScreen().frame()
    x = schermo.size.width - LARGHEZZA - MARGINE_DAL_BORDO
    y = schermo.size.height - ALTEZZA - MARGINE_DAL_BORDO
    rettangolo = NSMakeRect(x, y, LARGHEZZA, ALTEZZA)

    stile = (
        NSWindowStyleMaskTitled
        | NSWindowStyleMaskClosable
        | NSWindowStyleMaskResizable
        | NSWindowStyleMaskMiniaturizable
    )

    finestra = NSWindow.alloc().initWithContentRect_styleMask_backing_defer_(
        rettangolo, stile, NSBackingStoreBuffered, False
    )
    finestra.setTitle_("Suggerimenti Vendita")
    # Livello flottante + può seguire su tutti gli Spaces e sopra app a
    # schermo intero: è il punto di tutta questa finestra.
    finestra.setLevel_(NSFloatingWindowLevel)
    finestra.setCollectionBehavior_(
        NSWindowCollectionBehaviorCanJoinAllSpaces
        | NSWindowCollectionBehaviorFullScreenAuxiliary
    )
    finestra.setReleasedWhenClosed_(False)

    webview = WKWebView.alloc().initWithFrame_(NSMakeRect(0, 0, LARGHEZZA, ALTEZZA))
    webview.setAutoresizingMask_(NSViewWidthSizable | NSViewHeightSizable)
    finestra.setContentView_(webview)

    cartella_overlay = os.path.dirname(os.path.abspath(__file__))
    percorso_html = os.path.join(cartella_overlay, "index.html")
    url_html = NSURL.fileURLWithPath_(percorso_html)
    url_cartella = NSURL.fileURLWithPath_(cartella_overlay)
    # loadFileURL_allowingReadAccessToURL_ (non loadRequest_ con un file://
    # qualsiasi) è il modo corretto per WKWebView di caricare HTML locale.
    webview.loadFileURL_allowingReadAccessToURL_(url_html, url_cartella)

    finestra.makeKeyAndOrderFront_(None)
    return finestra


def main():
    app = NSApplication.sharedApplication()
    # Accessory: niente icona nel Dock né nella barra dei menu per questa
    # finestra di supporto — l'app principale è "Suggerimenti Vendita.app".
    app.setActivationPolicy_(NSApplicationActivationPolicyAccessory)
    finestra = crea_finestra()  # noqa: F841 (va mantenuta viva dal riferimento)
    AppHelper.runEventLoop()


if __name__ == "__main__":
    main()
