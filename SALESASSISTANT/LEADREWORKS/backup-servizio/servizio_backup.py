#!/usr/bin/env python3
"""
Servizio di backup automatico dei lead (Lead Rework Console).

Resta in ascolto SOLO su questo Mac (127.0.0.1:8769). La Console gli manda l'intero archivio dei lead a ogni
modifica; qui viene scritto in ~/BACKUP-LEAD:
  leadrework-ultimo.json        sempre l'ultima copia valida
  leadrework-AAAA-MM-GG.json    una copia per giorno (si tengono le ultime 30)
Protezioni: un archivio VUOTO non sovrascrive mai nulla; un calo improvviso (meno della metà dei lead
dell'ultima copia) non sostituisce "ultimo": viene salvato a parte come leadrework-ANOMALO-<data>.json.
Solo libreria standard di Python 3.
"""
import json, os, sys, glob, hashlib, threading
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORTA = int(os.environ.get("LEADBACKUP_PORTA", "8769"))
CARTELLA = os.environ.get("LEADBACKUP_DIR", os.path.expanduser("~/BACKUP-LEAD"))
GIORNI_DA_TENERE = 30
MAX_BYTE = 200 * 1024 * 1024
BLOCCO = threading.Lock()
ULTIMA_IMPRONTA = {"v": ""}
stato = {"ultima": "", "lead": 0, "esito": "nessuna copia ricevuta da quando il servizio è partito"}


def scrivi_atomico(percorso, dati):
    tmp = percorso + ".tmp"
    with open(tmp, "wb") as f:
        f.write(dati)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, percorso)


def conta_lead(percorso):
    try:
        with open(percorso, encoding="utf-8") as f:
            return len(json.load(f).get("leads", {}))
    except Exception:
        return 0


def pulisci_vecchie():
    giornaliere = sorted(glob.glob(os.path.join(CARTELLA, "leadrework-????-??-??.json")))
    for vecchia in giornaliere[:-GIORNI_DA_TENERE]:
        try:
            os.remove(vecchia)
        except OSError:
            pass


def salva(corpo):
    """Ritorna (http_status, dict_risposta)."""
    try:
        dati = json.loads(corpo.decode("utf-8"))
        leads = dati["leads"]
        if dati.get("format") != "leadrework-leads-backup" or not isinstance(leads, dict):
            raise ValueError("formato non valido")
    except Exception as e:
        return 400, {"ok": False, "motivo": "dati non validi: %s" % e}
    n = len(leads)
    ora = datetime.now()
    with BLOCCO:
        os.makedirs(CARTELLA, exist_ok=True)
        ultimo = os.path.join(CARTELLA, "leadrework-ultimo.json")
        if n == 0:
            stato["esito"] = "RIFIUTATO: archivio vuoto, copia precedente conservata"
            return 200, {"ok": False, "motivo": "archivio vuoto: copia precedente conservata"}
        prima = conta_lead(ultimo)
        if prima >= 5 and n < prima / 2:
            scrivi_atomico(os.path.join(CARTELLA, "leadrework-ANOMALO-%s.json" % ora.strftime("%Y-%m-%d_%H%M%S")), corpo)
            stato["esito"] = "ATTENZIONE: calo anomalo di lead (da %d a %d), copia precedente conservata" % (prima, n)
            return 200, {"ok": False, "motivo": "calo anomalo di lead (da %d a %d): copia precedente conservata" % (prima, n)}
        impronta = hashlib.sha256(json.dumps(leads, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()
        if impronta == ULTIMA_IMPRONTA["v"] and os.path.exists(ultimo):
            stato.update(ultima=ora.isoformat(timespec="seconds"), lead=n, esito="ok (invariato)")
            return 200, {"ok": True, "lead": n, "ultima": stato["ultima"], "invariato": True}
        scrivi_atomico(ultimo, corpo)
        scrivi_atomico(os.path.join(CARTELLA, "leadrework-%s.json" % ora.strftime("%Y-%m-%d")), corpo)
        ULTIMA_IMPRONTA["v"] = impronta
        pulisci_vecchie()
        stato.update(ultima=ora.isoformat(timespec="seconds"), lead=n, esito="ok")
        return 200, {"ok": True, "lead": n, "ultima": stato["ultima"]}


class Gestore(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _json(self, codice, obj):
        corpo = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(codice)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path.split("?")[0] == "/stato":
            ultimo = os.path.join(CARTELLA, "leadrework-ultimo.json")
            su_disco = ""
            if os.path.exists(ultimo):
                su_disco = datetime.fromtimestamp(os.path.getmtime(ultimo)).isoformat(timespec="seconds")
            self._json(200, dict(stato, cartella=CARTELLA, ultima_su_disco=su_disco, lead_su_disco=conta_lead(ultimo)))
        else:
            self._json(404, {"ok": False})

    def do_POST(self):
        if self.path.split("?")[0] != "/backup":
            self._json(404, {"ok": False})
            return
        try:
            n = int(self.headers.get("Content-Length", 0))
        except ValueError:
            n = 0
        if n <= 0 or n > MAX_BYTE:
            self._json(400, {"ok": False, "motivo": "dimensione non valida"})
            return
        codice, risposta = salva(self.rfile.read(n))
        self._json(codice, risposta)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    os.makedirs(CARTELLA, exist_ok=True)
    srv = ThreadingHTTPServer(("127.0.0.1", PORTA), Gestore)
    print("Backup lead attivo su 127.0.0.1:%d -> %s" % (PORTA, CARTELLA), flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
