"""Provider di dati: ogni piattaforma e' un provider che restituisce annunci
con prezzo per notte. Per ora c'e' solo il provider DEMO (dati simulati).
I provider reali (Airbnb, Booking, VRBO) si aggiungono implementando
la stessa interfaccia `fetch(...)` e registrandoli in PROVIDERS.
"""
import hashlib
import math
import random
from datetime import date, datetime

PLATFORMS = ["booking", "airbnb"]

# commissioni/ricarichi tipici mostrati al cliente (solo per la simulazione)
PLATFORM_FACTOR = {"booking": 0.97, "airbnb": 1.08, "vrbo": 1.05}


def haversine_km(lat1, lng1, lat2, lng2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _seed(*parts):
    h = hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()
    return int(h[:12], 16)


def _season_factor(d: date) -> float:
    m = d.month
    if m in (12, 1, 2):
        f = 1.30   # stagione sciistica
    elif m in (7, 8):
        f = 1.40   # estate
    elif m in (6, 9):
        f = 1.10
    else:
        f = 0.90
    if d.weekday() in (4, 5):  # venerdi/sabato
        f *= 1.18
    return f


class DemoProvider:
    """Genera annunci finti ma coerenti: stessi annunci a ogni chiamata,
    prezzi che variano con stagione, giorno della settimana e 'smart pricing'
    giornaliero (cosi' lo storico ha qualcosa da mostrare)."""

    def __init__(self, platform):
        self.platform = platform

    real = False

    def fetch(self, lat, lng, radius_km, check_in: date, check_out: date, guests: int, place="", entire_only=True):
        # pool stabile: 250 annunci entro 50 km dal centro (arrotondato a 0.1 gradi)
        clat, clng = round(lat, 1), round(lng, 1)
        rng = random.Random(_seed(self.platform, clat, clng))
        today = date.today().isoformat()
        out = []
        for i in range(250):
            ang = rng.uniform(0, 2 * math.pi)
            dist = 50 * math.sqrt(rng.random())
            alat = clat + (dist * math.cos(ang)) / 111.0
            alng = clng + (dist * math.sin(ang)) / (111.0 * math.cos(math.radians(clat)))
            capacity = rng.choice([2, 3, 4, 4, 5, 6, 6, 8, 10])
            base = 45 + capacity * 14 + rng.uniform(-15, 25)
            rating = round(rng.uniform(4.2, 5.0), 1)
            kind = rng.choice(["Appartamento", "Chalet", "Casa vacanze", "Bilocale", "Villetta"])
            lid = f"{self.platform[:2]}-{i:03d}"
            d = haversine_km(lat, lng, alat, alng)
            if d > radius_km or capacity < guests:
                continue
            smart = 1 + (random.Random(_seed(lid, today)).uniform(-0.08, 0.08))
            price = base * _season_factor(check_in) * PLATFORM_FACTOR[self.platform] * smart
            out.append({
                "platform": self.platform,
                "listing_id": lid,
                "name": f"{kind} {i + 1} (demo)",
                "lat": round(alat, 5),
                "lng": round(alng, 5),
                "distance_km": round(d, 1),
                "guests": capacity,
                "rating": rating,
                "price_night": round(price, 0),
                "url": "",
            })
        return out


PROVIDERS = {p: DemoProvider(p) for p in PLATFORMS}

# Booking reale se configurato (variabile BOOKING_SOURCE), altrimenti dati demo
import os as _os
if _os.environ.get("BOOKING_SOURCE"):
    from booking import BookingProvider
    PROVIDERS["booking"] = BookingProvider()
if _os.environ.get("AIRBNB_SOURCE"):
    from airbnb import AirbnbProvider
    PROVIDERS["airbnb"] = AirbnbProvider()
