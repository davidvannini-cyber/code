"""Browser Chromium condiviso da Booking e Airbnb (Playwright).

- Usa un profilo che resta salvato nella cartella `.browser-profile`: cookie e verifiche
  superate restano valide tra una rilevazione e l'altra.
- HEADED=1 apre la finestra del browser in vista (a volte i siti la accettano meglio
  di quella invisibile, e puoi vedere cosa succede).
"""
import os
from contextlib import contextmanager

BASE = os.path.dirname(os.path.abspath(__file__))
PROFILE = os.path.join(BASE, ".browser-profile")


@contextmanager
def browser_page():
    from playwright.sync_api import sync_playwright  # dipendenza opzionale
    headed = os.environ.get("HEADED") == "1"
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            PROFILE, headless=not headed, locale="it-IT", timezone_id="Europe/Rome",
            viewport={"width": 1366, "height": 900},
        )
        try:
            yield ctx.pages[0] if ctx.pages else ctx.new_page()
        finally:
            ctx.close()


def open_with_retry(pg, url, selector, first_wait_ms=25000, second_wait_ms=40000):
    """Apre la pagina. Se compare una verifica del sito (che a volte fa perdere i parametri
    della ricerca) riapre lo stesso indirizzo una seconda volta, con i cookie ormai pronti."""
    pg.goto(url, timeout=60000, wait_until="domcontentloaded")
    try:
        pg.wait_for_selector(selector, timeout=first_wait_ms)
        return
    except Exception:
        pass
    pg.goto(url, timeout=60000, wait_until="domcontentloaded")
    pg.wait_for_selector(selector, timeout=second_wait_ms)
