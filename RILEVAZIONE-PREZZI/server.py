#!/usr/bin/env python3
"""Rilevazione prezzi - server locale (solo libreria standard di Python).

Avvio:  python3 server.py   poi apri http://localhost:8000
"""
import json
import os
import sqlite3
import urllib.parse
import urllib.request
from datetime import date, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from providers import PLATFORMS, PROVIDERS, haversine_km

BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE, "prezzi.db")
PORT = int(os.environ.get("PORT", "8000"))


def db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db():
    with db() as con:
        con.execute(
            """CREATE TABLE IF NOT EXISTS snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                zone_lat REAL, zone_lng REAL, radius_km REAL,
                check_in TEXT, check_out TEXT, guests INTEGER,
                platform TEXT, listing_id TEXT, name TEXT,
                lat REAL, lng REAL, price_night REAL, rating REAL, url TEXT
            )"""
        )
        con.execute("CREATE INDEX IF NOT EXISTS ix_snap ON snapshots(zone_lat, zone_lng, check_in, ts)")


def geocode(q):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"q": q, "format": "json", "limit": 5, "countrycodes": "it,ch,fr,at,si,de,es"}
    )
    req = urllib.request.Request(url, headers={"User-Agent": "rilevazione-prezzi/0.1 (uso personale)"})
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.load(r)
    return [{"name": d["display_name"], "lat": float(d["lat"]), "lng": float(d["lon"])} for d in data]


PREZZO_MIN, PREZZO_MAX = 15, 2500   # euro a notte: fuori da qui il dato e' quasi sicuramente un errore di lettura


def pulisci_annunci(listings):
    """Toglie i doppioni (stesso annuncio letto due volte, es. su due pagine) e i prezzi non plausibili."""
    visti, out, scartati = set(), [], 0
    for l in listings:
        chiave = (l["platform"], l["listing_id"])
        p = l.get("price_night")
        if chiave in visti or not p or not (PREZZO_MIN <= p <= PREZZO_MAX):
            scartati += 1
            continue
        visti.add(chiave)
        out.append(l)
    return out, scartati


def run_search(p):
    lat, lng = float(p["lat"]), float(p["lng"])
    radius = float(p["radius_km"])
    ci = date.fromisoformat(p["check_in"])
    co = date.fromisoformat(p["check_out"])
    if co <= ci:
        raise ValueError("La data di partenza deve essere dopo l'arrivo")
    guests = int(p.get("guests", 6))
    platforms = [x for x in p.get("platforms", PLATFORMS) if x in PROVIDERS]
    place = (p.get("place") or "").strip()
    entire_only = bool(p.get("entire_only", True))
    ts = datetime.now().isoformat(timespec="seconds")

    listings, errors = [], {}
    for pl in platforms:
        try:
            listings += PROVIDERS[pl].fetch(lat, lng, radius, ci, co, guests,
                                            place=place, entire_only=entire_only)
        except Exception as e:  # una piattaforma che fallisce non blocca le altre
            errors[pl] = str(e)

    listings, scartati = pulisci_annunci(listings)

    with db() as con:
        con.executemany(
            "INSERT INTO snapshots (ts,zone_lat,zone_lng,radius_km,check_in,check_out,guests,"
            "platform,listing_id,name,lat,lng,price_night,rating,url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                (ts, lat, lng, radius, ci.isoformat(), co.isoformat(), guests, l["platform"], l["listing_id"],
                 l["name"], l["lat"], l["lng"], l["price_night"], l["rating"], l["url"])
                for l in listings
            ],
        )
    return {"ts": ts, "listings": listings, "errors": errors, "nights": (co - ci).days,
            "scartati": scartati}


def history(q):
    lat, lng = float(q["lat"][0]), float(q["lng"][0])
    ci = q["check_in"][0]
    sql = ("SELECT ts, platform, AVG(price_night) AS avg, MIN(price_night) AS min, MAX(price_night) AS max, COUNT(*) AS n "
           "FROM snapshots WHERE ROUND(zone_lat,3)=ROUND(?,3) AND ROUND(zone_lng,3)=ROUND(?,3) AND check_in=? ")
    args = [lat, lng, ci]
    if "radius" in q:
        sql += "AND ROUND(radius_km)=ROUND(?) "
        args.append(float(q["radius"][0]))
    sql += "GROUP BY ts, platform ORDER BY ts"
    with db() as con:
        rows = con.execute(sql, args).fetchall()
    return [dict(r) for r in rows]


def latest(q):
    """Annunci dell'ultima rilevazione per zona, data di arrivo e raggio (per mostrare tabella e mappa dallo storico)."""
    lat, lng = float(q["lat"][0]), float(q["lng"][0])
    ci, radius = q["check_in"][0], float(q["radius"][0])
    with db() as con:
        rows = con.execute(
            "SELECT * FROM snapshots WHERE ROUND(zone_lat,3)=ROUND(?,3) AND ROUND(zone_lng,3)=ROUND(?,3) "
            "AND check_in=? AND ROUND(radius_km)=ROUND(?) AND ts=("
            "SELECT MAX(ts) FROM snapshots WHERE ROUND(zone_lat,3)=ROUND(?,3) AND ROUND(zone_lng,3)=ROUND(?,3) "
            "AND check_in=? AND ROUND(radius_km)=ROUND(?))",
            (lat, lng, ci, radius, lat, lng, ci, radius),
        ).fetchall()
    out = []
    for r in rows:
        out.append({"platform": r["platform"], "listing_id": r["listing_id"], "name": r["name"], "lat": r["lat"],
                    "lng": r["lng"], "price_night": r["price_night"], "rating": r["rating"], "url": r["url"] or "",
                    "guests": r["guests"], "distance_km": round(haversine_km(lat, lng, r["lat"], r["lng"]), 1)})
    return out


def changes(lat, lng, ci, radius, soglia_pct=10.0):
    """Confronta le ultime due rilevazioni (stessa zona, data, raggio) e dice quali annunci
    hanno cambiato prezzo di almeno `soglia_pct` per cento, quali sono nuovi e quali spariti."""
    with db() as con:
        tss = [r[0] for r in con.execute(
            "SELECT DISTINCT ts FROM snapshots WHERE ROUND(zone_lat,3)=ROUND(?,3) AND ROUND(zone_lng,3)=ROUND(?,3) "
            "AND check_in=? AND ROUND(radius_km)=ROUND(?) ORDER BY ts DESC LIMIT 2", (lat, lng, ci, radius))]
        if len(tss) < 2:
            return {"da": None, "a": tss[0] if tss else None, "variati": [], "nuovi": [], "spariti": []}

        def carica(ts):
            rows = con.execute(
                "SELECT platform, listing_id, name, price_night, url FROM snapshots WHERE ts=? "
                "AND ROUND(zone_lat,3)=ROUND(?,3) AND ROUND(zone_lng,3)=ROUND(?,3) AND check_in=? "
                "AND ROUND(radius_km)=ROUND(?)", (ts, lat, lng, ci, radius)).fetchall()
            return {(r["platform"], r["listing_id"]): dict(r) for r in rows}
        nuovo, vecchio = carica(tss[0]), carica(tss[1])
    variati = []
    for k, n in nuovo.items():
        o = vecchio.get(k)
        if o and o["price_night"]:
            pct = (n["price_night"] - o["price_night"]) / o["price_night"] * 100
            if abs(pct) >= soglia_pct:
                variati.append({"platform": k[0], "name": n["name"], "url": n["url"] or "",
                                "prima": o["price_night"], "ora": n["price_night"], "pct": round(pct, 1)})
    variati.sort(key=lambda x: -abs(x["pct"]))
    pl = lambda d, keys: [{"platform": k[0], "name": d[k]["name"], "price_night": d[k]["price_night"]} for k in keys]
    return {"da": tss[1], "a": tss[0], "variati": variati,
            "nuovi": pl(nuovo, [k for k in nuovo if k not in vecchio]),
            "spariti": pl(vecchio, [k for k in vecchio if k not in nuovo])}


def tracked(q):
    """Date gia' rilevate per la zona (per il menu 'Date monitorate')."""
    lat, lng = float(q["lat"][0]), float(q["lng"][0])
    with db() as con:
        rows = con.execute(
            "SELECT check_in, check_out, ROUND(radius_km) AS radius_km, COUNT(DISTINCT ts) AS n, MAX(ts) AS last FROM snapshots "
            "WHERE ROUND(zone_lat,3)=ROUND(?,3) AND ROUND(zone_lng,3)=ROUND(?,3) AND check_in>=date('now') "
            "GROUP BY check_in, check_out, ROUND(radius_km) ORDER BY check_in",
            (lat, lng),
        ).fetchall()
    return [dict(r) for r in rows]


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        try:
            if u.path in ("/", "/index.html"):
                with open(os.path.join(BASE, "static", "index.html"), "rb") as f:
                    return self._send(200, f.read(), "text/html")
            if u.path == "/api/geocode":
                return self._send(200, geocode(q["q"][0]))
            if u.path == "/api/history":
                return self._send(200, history(q))
            if u.path == "/api/latest":
                return self._send(200, latest(q))
            if u.path == "/api/changes":
                return self._send(200, changes(float(q["lat"][0]), float(q["lng"][0]), q["check_in"][0],
                                               float(q["radius"][0]), float(q.get("soglia", ["10"])[0])))
            if u.path == "/api/tracked":
                return self._send(200, tracked(q))
            if u.path == "/api/config":
                return self._send(200, {"platforms": PLATFORMS,
                                       "real": [k for k, v in PROVIDERS.items() if getattr(v, "real", False)]})
            self._send(404, {"error": "non trovato"})
        except Exception as e:
            self._send(500, {"error": str(e)})

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(n) or b"{}")
            if self.path == "/api/search":
                return self._send(200, run_search(body))
            self._send(404, {"error": "non trovato"})
        except Exception as e:
            self._send(400, {"error": str(e)})

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    init_db()
    print(f"Rilevazione prezzi attiva su http://localhost:{PORT}  (Ctrl+C per fermare)")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
