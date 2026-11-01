#!/usr/bin/env python3
"""Rilevazione automatica: legge config.json, calcola le date da seguire e salva i prezzi
nello storico (prezzi.db). Si lancia a mano oppure da launchd ogni giorno.

  python3 rileva.py            rilevazione reale (Booking + Airbnb con Playwright)
  python3 rileva.py --demo     prova con dati simulati
  python3 rileva.py --dates    mostra solo le date che verrebbero rilevate
"""
import json
import os
import random
import sys
import time
from datetime import date, datetime, timedelta

BASE = os.path.dirname(os.path.abspath(__file__))

if "--demo" not in sys.argv:
    os.environ.setdefault("BOOKING_SOURCE", "playwright")
    os.environ.setdefault("AIRBNB_SOURCE", "playwright")

import server  # noqa: E402  (va importato dopo aver impostato le variabili)


def log(msg):
    print(f"{datetime.now():%Y-%m-%d %H:%M:%S}  {msg}", flush=True)


def date_da_seguire(cfg, oggi=None):
    oggi = oggi or date.today()
    out = set()
    # prossimi weekend (venerdi -> domenica, o la durata scelta)
    n = int(cfg.get("weekend_prossimi", 0))
    notti = int(cfg.get("weekend_notti", 2))
    d = oggi
    while (d.weekday() != 4) or d <= oggi:   # prossimo venerdi, mai oggi
        d += timedelta(days=1)
    for _ in range(n):
        out.add((d, d + timedelta(days=notti)))
        d += timedelta(days=7)
    # periodi fissi (solo se non gia' passati)
    for p in cfg.get("periodi", []):
        ci, co = date.fromisoformat(p["dal"]), date.fromisoformat(p["al"])
        if ci > oggi and co > ci:
            out.add((ci, co))
    return sorted(out)


def rileva_periodo(z, cfg, ci, co, tentativi=2):
    """Una ricerca; se una piattaforma da' errore o zero annunci riprova una volta dopo una pausa lunga."""
    piattaforme = list(cfg.get("piattaforme", ["booking", "airbnb"]))
    raccolti, errori = {}, {}
    for t in range(tentativi):
        if not piattaforme:
            break
        res = server.run_search({
            "lat": z["lat"], "lng": z["lng"], "radius_km": z["raggio_km"],
            "check_in": ci.isoformat(), "check_out": co.isoformat(),
            "guests": cfg.get("ospiti", 6), "platforms": piattaforme,
            "place": z["nome"], "entire_only": cfg.get("solo_alloggi_interi", True),
        })
        errori = res["errors"]
        for l in res["listings"]:
            raccolti[l["platform"]] = raccolti.get(l["platform"], 0) + 1
        piattaforme = [p for p in piattaforme if p in errori or not raccolti.get(p)]
        if piattaforme and t + 1 < tentativi:
            log(f"{ci}: nessun dato da {piattaforme}, riprovo tra un po'")
            time.sleep(random.uniform(*cfg.get("pausa_riprova_secondi", [90, 150])))
    return raccolti, errori, piattaforme


def segnala_variazioni(z, cfg, ci):
    soglia = float(cfg.get("soglia_variazione_pct", 10))
    c = server.changes(z["lat"], z["lng"], ci.isoformat(), z["raggio_km"], soglia)
    if not c["da"]:
        return
    for v in c["variati"][:10]:
        log(f"  VARIAZIONE {v['platform']} {v['name']}: {v['prima']:.0f} -> {v['ora']:.0f} euro ({v['pct']:+.0f}%)")
    if c["nuovi"] or c["spariti"]:
        log(f"  annunci nuovi: {len(c['nuovi'])}, spariti: {len(c['spariti'])}")


def main():
    cfg = json.load(open(os.path.join(BASE, "config.json"), encoding="utf-8"))
    date_list = date_da_seguire(cfg)
    if "--dates" in sys.argv:
        for ci, co in date_list:
            print(ci, "->", co, f"({(co - ci).days} notti)")
        return
    server.init_db()
    z = cfg["zona"]
    pausa = cfg.get("pausa_secondi", [20, 45])
    log(f"Inizio rilevazione: {len(date_list)} periodi, zona {z['nome']} (raggio {z['raggio_km']} km)")
    for i, (ci, co) in enumerate(date_list):
        try:
            per, errori, vuote = rileva_periodo(z, cfg, ci, co)
            log(f"{ci} -> {co}: {per or 'nessun annuncio'}" + (f"  ERRORI: {errori}" if errori else ""))
            if vuote:
                log(f"  ATTENZIONE: nessun dato da {vuote} (possibile blocco del sito)")
            else:
                segnala_variazioni(z, cfg, ci)
        except Exception as e:
            log(f"{ci} -> {co}: ERRORE {e}")
        if i + 1 < len(date_list):
            time.sleep(random.uniform(*pausa))   # pause tra una ricerca e l'altra, per non insospettire i siti
    log("Fine rilevazione")


if __name__ == "__main__":
    main()
