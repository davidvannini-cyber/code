#!/usr/bin/env python3
"""Strumento per le prove audio della Fase 0 (T1, T2, T3). Serve `sounddevice` (installa.command).

  python3 prova_audio.py dispositivi          elenco dei dispositivi audio del Mac
  python3 prova_audio.py livelli [secondi]    misuratore: cosa arriva dal telefono (jack) e dalle cuffie
  python3 prova_audio.py tono [secondi]       manda un tono al telefono: il cliente (un collega) deve sentirlo
  python3 prova_audio.py ponte [secondi]      T3: telefono <-> cuffie come dopo il passaggio, misura la pausa di commutazione

I nomi dei dispositivi si scrivono in config.local.json (campi audio.telefono e audio.cuffie, basta un pezzo del nome).
"""
import math
import os
import sys
import time

QUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, QUI)
import audio  # noqa: E402
import orchestratore as O  # noqa: E402


def barra(v):
    n = min(40, int(v / 400))
    return "#" * n + "." * (40 - n)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "dispositivi"
    sec = float(sys.argv[2]) if len(sys.argv) > 2 else 15
    if cmd == "dispositivi":
        print(audio.AudioRouter.elenco()); return
    cfg = O.carica_config()
    r = audio.AudioRouter(cfg["audio"])
    r.apri()
    fine = time.time() + sec
    try:
        if cmd == "livelli":
            picco_c = [0.0]
            r.imposta_modo("umano")
            orig = r._in_cuffie
            r._in_cuffie = lambda b: (picco_c.__setitem__(0, max(audio.rms(b), picco_c[0] * 0.95)), orig(b))
            while time.time() < fine:
                print(f"\rtelefono {barra(r.picco_tel)} {int(r.picco_tel):5d}   cuffie {barra(picco_c[0])} {int(picco_c[0]):5d}", end="", flush=True)
                time.sleep(0.1)
            print("\nObiettivo: voce del cliente tra 1000 e 8000, senza stare sempre vicino a 32000 (saturazione).")
        elif cmd == "tono":
            r.imposta_modo("ai")
            n = 0
            while time.time() < fine:
                blocco = b"".join(int(6000 * math.sin(2 * math.pi * 440 * (n + i) / audio.RATE)).to_bytes(2, "little", signed=True) for i in range(audio.BLOCCO))
                n += audio.BLOCCO
                while len(r.coda_tel) > 10:
                    time.sleep(0.005)
                r.parla_al_telefono(blocco)
            print("Fatto.")
        elif cmd == "ponte":
            r.imposta_modo("ai"); time.sleep(2)
            t = time.time(); r.imposta_modo("fermo"); r.imposta_modo("umano")
            print(f"Commutazione in {int((time.time() - t) * 1000)} ms (la cifra vera è la pausa che senti al telefono: obiettivo < 2 secondi).")
            print("Parla nelle cuffie: il cliente deve sentirti; la sua voce deve arrivare nelle cuffie.")
            while time.time() < fine:
                time.sleep(0.2)
    finally:
        r.chiudi()


if __name__ == "__main__":
    main()
