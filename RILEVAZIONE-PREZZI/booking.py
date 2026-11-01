"""Provider Booking.com: scarica la pagina dei risultati (tramite un "fetcher") e la legge
con booking_parser. I fetcher disponibili si scelgono con la variabile BOOKING_SOURCE:

  playwright        browser Chromium locale (pip install playwright && playwright install chromium)
  file:/percorso    legge una pagina HTML salvata (utile per prove e per importare a mano)
"""
import hashlib
import json
import math
import os
import sqlite3
import time
import urllib.parse
import urllib.request
from datetime import date

from booking_parser import parse_results
from providers import haversine_km

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prezzi.db")
PAGES = int(os.environ.get("BOOKING_PAGES", "1"))


def build_url(place, ci: date, co: date, guests: int, offset=0):
    q = {
        "ss": place, "checkin": ci.isoformat(), "checkout": co.isoformat(),
        "group_adults": guests, "no_rooms": 1, "group_children": 0,
        "selected_currency": "EUR", "lang": "it",
    }
    if offset:
        q["offset"] = offset
    return "https://www.booking.com/searchresults.it.html?" + urllib.parse.urlencode(q)


# ---------- fetcher ----------
def fetch_playwright(url):
    from browser import browser_page, open_with_retry
    with browser_page() as pg:
        open_with_retry(pg, url, '[data-testid="property-card"]')
        return pg.content()


def get_fetcher():
    src = os.environ.get("BOOKING_SOURCE", "")
    if src == "playwright":
        return fetch_playwright
    if src.startswith("file:"):
        path = src[5:]
        return lambda url: open(path, encoding="utf-8").read()
    return None


# ---------- coordinate dei paesi (cache su SQLite) ----------
def _town_coords(town):
    with sqlite3.connect(DB_PATH) as con:
        con.execute("CREATE TABLE IF NOT EXISTS towns (name TEXT PRIMARY KEY, lat REAL, lng REAL)")
        row = con.execute("SELECT lat,lng FROM towns WHERE name=?", (town,)).fetchone()
        if row:
            return row
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
            {"q": f"{town}, Italia", "format": "json", "limit": 1})
        req = urllib.request.Request(url, headers={"User-Agent": "rilevazione-prezzi/0.1 (uso personale)"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.load(r)
        except Exception:
            return None
        time.sleep(1.1)  # limite di Nominatim: 1 richiesta al secondo
        if not data:
            return None
        lat, lng = float(data[0]["lat"]), float(data[0]["lon"])
        con.execute("INSERT OR REPLACE INTO towns VALUES (?,?,?)", (town, lat, lng))
        return lat, lng


def _jitter(name):
    """Sposta di poche centinaia di metri (stabile per nome) cosi' i pin dello stesso paese non si sovrappongono."""
    h = int(hashlib.sha256(name.encode()).hexdigest()[:8], 16)
    ang = (h % 360) * math.pi / 180
    r = 0.002 + (h % 1000) / 1000 * 0.004   # ~0,2 - 0,7 km in gradi
    return r * math.cos(ang), r * math.sin(ang)


class BookingProvider:
    platform = "booking"
    real = True

    def fetch(self, lat, lng, radius_km, check_in, check_out, guests, place="", entire_only=True):
        fetcher = get_fetcher()
        if fetcher is None:
            raise RuntimeError("Booking non configurato: imposta BOOKING_SOURCE (vedi README)")
        if not place:
            raise RuntimeError("Nome della zona mancante: cerca una località invece di cliccare sulla mappa")
        rows = []
        for k in range(PAGES):
            rows += parse_results(fetcher(build_url(place, check_in, check_out, guests, offset=25 * k)))
            if k + 1 < PAGES:
                time.sleep(4)
        out = []
        for r in rows:
            if not r["price_night"]:
                continue  # prezzo non visibile (es. riservato ai membri) o non disponibile
            if entire_only and not r["entire_place"]:
                continue
            c = _town_coords(r["town"]) if r["town"] else None
            if not c:
                continue
            dj = _jitter(r["name"])
            alat, alng = c[0] + dj[0], c[1] + dj[1]
            d = haversine_km(lat, lng, alat, alng)
            if d > radius_km:
                continue
            out.append({
                "platform": "booking", "listing_id": r["url"].rsplit("/", 1)[-1].replace(".it.html", ""),
                "name": r["name"], "lat": round(alat, 5), "lng": round(alng, 5),
                "distance_km": round(d, 1), "guests": guests, "rating": r["rating"],
                "price_night": r["price_night"], "url": r["url"], "town": r["town"],
            })
        return out
