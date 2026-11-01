"""Provider Airbnb: apre la ricerca in un browser (Playwright), aspetta che i risultati si carichino
(arrivano via JavaScript) e legge il testo di ogni scheda.

ATTENZIONE: nel test fatto con TinyFish i prezzi sono comparsi come "<totale> € in totale" per
l'intero soggiorno, in euro. I selettori del browser locale (`card-container`) NON sono ancora
verificati su un computer reale: se non trova schede, va corretto `CARD_SELECTOR`.

Variabile di configurazione:  AIRBNB_SOURCE=playwright
"""
import os
import re
import time
import urllib.parse

from booking import _jitter, _town_coords
from providers import haversine_km

CARD_SELECTOR = 'a[href*="/rooms/"]'
PAGES_WAIT_S = 6


def build_url(place, ci, co, guests):
    q = urllib.parse.quote(f"{place}--Italia")
    return (f"https://www.airbnb.it/s/{q}/homes?checkin={ci.isoformat()}"
            f"&checkout={co.isoformat()}&adults={guests}")


def parse_card_text(text: str, nights: int):
    """Testo di una scheda -> dict (oppure None se manca il prezzo o il paese).
    Esempio: 'Amato dagli ospiti\\nCasa ⋅ Sestola\\n4,96 (50)\\n1.261 € 1.117 € in totale'"""
    lines = [re.sub(r"\s+", " ", l).strip() for l in text.splitlines() if l.strip()]
    flat = " ".join(lines)
    m = re.search(r"([\d\.]+)\s*€\s*in totale", flat)
    if not m or not nights:
        return None
    total = float(m.group(1).replace(".", ""))
    title = next((l for l in lines if "⋅" in l), "")
    town = re.sub(r"\s*\(.*$", "", title.split("⋅")[-1]).strip() if title else ""
    r = re.search(r"(\d,\d{1,2})\s*(?:\(|$|\s)", flat)
    rating = float(r.group(1).replace(",", ".")) if r else None
    entire = not re.search(r"stanz|camera|b&b|bed and breakfast|hotel", title, re.I)
    return {"name": title or "Annuncio Airbnb", "town": town, "rating": rating,
            "price_total": total, "price_night": round(total / nights, 0), "entire_place": entire}


# JavaScript eseguito nella pagina: per ogni link ad un annuncio risale fino al blocco che contiene il prezzo
JS_CARDS = """
() => {
  const seen = new Map();
  for (const a of document.querySelectorAll('a[href*="/rooms/"]')) {
    const href = a.getAttribute('href').split('?')[0];
    if (seen.has(href)) continue;
    let el = a, text = '';
    for (let i = 0; i < 8 && el; i++, el = el.parentElement) {
      const t = el.innerText || '';
      if (t.includes('€') && t.length < 700) { text = t; break; }
    }
    if (text) seen.set(href, text);
  }
  return [...seen.entries()].map(([href, text]) => ({href, text}));
}
"""


def fetch_playwright(url):
    from browser import browser_page, open_with_retry
    with browser_page() as pg:
        open_with_retry(pg, url, CARD_SELECTOR)
        time.sleep(PAGES_WAIT_S)
        pg.mouse.wheel(0, 2500)
        time.sleep(2)
        cards = pg.evaluate(JS_CARDS)
        if not cards:
            _debug_dump(pg)
        return cards


def _debug_dump(pg):
    base = os.path.dirname(os.path.abspath(__file__))
    try:
        open(os.path.join(base, "debug_airbnb.html"), "w", encoding="utf-8").write(pg.content())
        pg.screenshot(path=os.path.join(base, "debug_airbnb.png"))
    except Exception:
        pass


class AirbnbProvider:
    platform = "airbnb"
    real = True

    def fetch(self, lat, lng, radius_km, check_in, check_out, guests, place="", entire_only=True):
        if os.environ.get("AIRBNB_SOURCE") != "playwright":
            raise RuntimeError("Airbnb non configurato")
        if not place:
            raise RuntimeError("Nome della zona mancante: cerca una località invece di cliccare sulla mappa")
        nights = (check_out - check_in).days
        out = []
        cards = fetch_playwright(build_url(place, check_in, check_out, guests))
        stats = {"schede": len(cards), "con_prezzo": 0, "interi": 0, "con_coordinate": 0, "nel_raggio": 0}
        samples = []
        for c in cards:
            r = parse_card_text(c["text"], nights)
            if not r or not r["town"]:
                if len(samples) < 3:
                    samples.append(c["text"])
                continue
            stats["con_prezzo"] += 1
            if entire_only and not r["entire_place"]:
                continue
            stats["interi"] += 1
            coords = _town_coords(r["town"])
            if not coords:
                continue
            stats["con_coordinate"] += 1
            dj = _jitter(r["name"] + c["href"])
            alat, alng = coords[0] + dj[0], coords[1] + dj[1]
            d = haversine_km(lat, lng, alat, alng)
            if d > radius_km:
                continue
            stats["nel_raggio"] += 1
            href = c["href"].split("?")[0]
            out.append({
                "platform": "airbnb", "listing_id": href.rsplit("/", 1)[-1] or r["name"],
                "name": r["name"], "lat": round(alat, 5), "lng": round(alng, 5),
                "distance_km": round(d, 1), "guests": guests, "rating": r["rating"],
                "price_night": r["price_night"],
                "url": ("https://www.airbnb.it" + href) if href.startswith("/") else href,
                "town": r["town"],
            })
        print("[airbnb]", stats, flush=True)
        if samples:
            base = os.path.dirname(os.path.abspath(__file__))
            with open(os.path.join(base, "debug_airbnb.txt"), "w", encoding="utf-8") as f:
                f.write("\n\n=====\n\n".join(samples))
        return out
