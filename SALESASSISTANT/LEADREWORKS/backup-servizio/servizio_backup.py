#!/usr/bin/env python3
"""
Servizio DATI dei lead (Lead Rework Console) — versione 2.

I lead vivono in una cartella sul Mac, fuori da Chrome:  ~/DATI-LEAD
  leads.json                    l'archivio vero (la Console lo legge all'apertura e lo riscrive a ogni modifica)
  copie/leads-AAAA-MM-GG.json   una copia per giorno (ultime 30)
  copie/ore/leads-AAAA-MM-GG_HH.json   una copia per ora (ultime 48 ore): per annullare un errore recente
  copie/leads-ANOMALO-<data>.json   copie di sicurezza di salvataggi sospetti (calo forte di lead)
Seconda copia automatica ("copia esterna": ultimo + una per giorno, 30 giorni), al massimo una volta al minuto.
Dove: se esiste il file ~/DATI-LEAD/copia-esterna.txt, la cartella scritta nella sua prima riga (es. una cartella di
Google Drive per computer o di iCloud Drive); altrimenti iCloud Drive (.../com~apple~CloudDocs/BACKUP-LEAD-YesMobility).
Se la copia non riesce l'errore si vede nello /stato e nella Console; il salvataggio principale non ne risente.
Resta in ascolto SOLO su questo Mac (127.0.0.1:8769). Solo libreria standard di Python 3.

Protezioni:
  * un archivio VUOTO non sovrascrive mai l'archivio esistente;
  * un calo sotto la metà dei lead (con almeno 5 lead) NON sostituisce leads.json: va in copie/ANOMALO;
  * ogni scrittura è atomica (file temporaneo + sostituzione);
  * "rev": numero di versione. Chi scrive deve dire su quale versione si basa: se nel frattempo il file è
    cambiato (es. due finestre della Console aperte) il salvataggio è RIFIUTATO (409) e non rovina niente.
API:  GET /leads   GET /stato   POST /leads   POST /backup (come /leads, vecchia Console)
"""
import json, os, sys, glob, hashlib, threading, time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORTA = int(os.environ.get("LEADBACKUP_PORTA", "8769"))
CARTELLA = os.environ.get("LEADBACKUP_DIR", os.path.expanduser("~/DATI-LEAD"))
VECCHIA_CARTELLA = os.path.expanduser("~/BACKUP-LEAD")
GIORNI_DA_TENERE = 30
ORE_DA_TENERE = 48
MAX_BYTE = 200 * 1024 * 1024
BLOCCO = threading.Lock()
FORMATO = "leadrework-leads-backup"
ICLOUD_BASE = os.environ.get("LEADBACKUP_ICLOUD_BASE", os.path.expanduser("~/Library/Mobile Documents/com~apple~CloudDocs"))
ICLOUD_CARTELLA = os.path.join(ICLOUD_BASE, "BACKUP-LEAD-YesMobility")


def destinazione_copia():
    """(cartella_base_che_deve_esistere, cartella_di_destinazione). Letta a ogni copia: si cambia senza riavviare."""
    try:
        with open(os.path.join(CARTELLA, "copia-esterna.txt"), encoding="utf-8") as f:
            riga = f.readline().strip().strip('"')
        if riga:
            dest = os.path.expanduser(riga)
            return os.path.dirname(dest.rstrip("/")) or dest, dest
    except OSError:
        pass
    return ICLOUD_BASE, ICLOUD_CARTELLA
ICLOUD_INTERVALLO = int(os.environ.get("LEADBACKUP_ICLOUD_SECONDI", "60"))
icloud = {"attivo": True, "ok": None, "ultima": "", "errore": "", "cartella": ICLOUD_CARTELLA, "da_copiare": False, "ultimo_tentativo": 0.0}
stato = {"ultima_scrittura": "", "esito": "nessun salvataggio da quando il servizio è partito"}


def p_leads():  return os.path.join(CARTELLA, "leads.json")
def p_copie():  return os.path.join(CARTELLA, "copie")


def scrivi_atomico(percorso, dati):
    os.makedirs(os.path.dirname(percorso), exist_ok=True)
    tmp = percorso + ".tmp"
    with open(tmp, "wb") as f:
        f.write(dati)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, percorso)


def leggi_archivio():
    """Ritorna il dizionario salvato oppure None se non c'è / illeggibile."""
    try:
        with open(p_leads(), encoding="utf-8") as f:
            d = json.load(f)
        if isinstance(d.get("leads"), dict):
            return d
    except Exception:
        pass
    return None


def pulisci_vecchie():
    giornaliere = sorted(glob.glob(os.path.join(p_copie(), "leads-????-??-??.json")))
    for vecchia in giornaliere[:-GIORNI_DA_TENERE]:
        try:
            os.remove(vecchia)
        except OSError:
            pass


def copia_icloud():
    """Copia leads.json (ultimo + copia del giorno) nella cartella esterna. Non solleva mai: l'esito sta in `icloud`."""
    icloud["ultimo_tentativo"] = time.time()
    icloud["da_copiare"] = False
    base, dest = destinazione_copia()
    icloud["cartella"] = dest
    configurata = os.path.exists(os.path.join(CARTELLA, "copia-esterna.txt"))
    if not configurata and not os.path.exists(ICLOUD_BASE):
        # nessuna copia esterna scelta e iCloud Drive non presente: non è un errore, la copia esterna è facoltativa
        icloud.update(ok=None, errore="", ultima="")
        return
    try:
        try:
            os.stat(base)
        except FileNotFoundError:
            raise FileNotFoundError("cartella della copia esterna non trovata (%s): il servizio (Google Drive/iCloud) è attivo?" % base)
        except PermissionError:
            raise PermissionError("macOS NEGA al servizio l'accesso a questa cartella: serve \"Accesso completo al disco\" per python3 (%s)" % os.path.realpath(sys.executable))
        with open(p_leads(), "rb") as f:
            dati = f.read()
        scrivi_atomico(os.path.join(dest, "leads-ultimo.json"), dati)
        scrivi_atomico(os.path.join(dest, "leads-%s.json" % datetime.now().strftime("%Y-%m-%d")), dati)
        giornaliere = sorted(glob.glob(os.path.join(dest, "leads-????-??-??.json")))
        for vecchia in giornaliere[:-GIORNI_DA_TENERE]:
            try:
                os.remove(vecchia)
            except OSError:
                pass
        icloud.update(ok=True, errore="", ultima=datetime.now().isoformat(timespec="seconds"))
    except Exception as e:
        icloud.update(ok=False, errore="%s: %s" % (type(e).__name__, e))


def ciclo_icloud():
    while True:
        time.sleep(15)
        with BLOCCO:
            if icloud["da_copiare"] and time.time() - icloud["ultimo_tentativo"] >= ICLOUD_INTERVALLO:
                copia_icloud()


def pulisci_orarie():
    orarie = sorted(glob.glob(os.path.join(p_copie(), "ore", "leads-????-??-??_??.json")))
    for vecchia in orarie[:-ORE_DA_TENERE]:
        try:
            os.remove(vecchia)
        except OSError:
            pass


def salva(corpo):
    """Ritorna (http_status, dict_risposta)."""
    try:
        dati = json.loads(corpo.decode("utf-8"))
        leads = dati["leads"]
        if dati.get("format") != FORMATO or not isinstance(leads, dict):
            raise ValueError("formato non valido")
    except Exception as e:
        return 400, {"ok": False, "motivo": "dati non validi: %s" % e}
    n = len(leads)
    ora = datetime.now()
    with BLOCCO:
        attuale = leggi_archivio()
        rev_att = attuale.get("rev", 0) if attuale else 0
        prima = len(attuale["leads"]) if attuale else 0
        base = dati.get("base_rev")
        if base is not None and attuale is not None and int(base) != rev_att:
            stato["esito"] = "RIFIUTATO: l'archivio è stato modificato da un'altra finestra"
            return 409, {"ok": False, "conflitto": True, "rev": rev_att,
                         "motivo": "l'archivio è stato modificato da un'altra finestra: ricarica la Console"}
        if n == 0:
            stato["esito"] = "RIFIUTATO: archivio vuoto, archivio esistente conservato"
            return 200, {"ok": False, "rev": rev_att, "motivo": "archivio vuoto: archivio esistente conservato"}
        if prima >= 5 and n < prima / 2:
            scrivi_atomico(os.path.join(p_copie(), "leads-ANOMALO-%s.json" % ora.strftime("%Y-%m-%d_%H%M%S")), corpo)
            stato["esito"] = "ATTENZIONE: calo anomalo di lead (da %d a %d), archivio esistente conservato" % (prima, n)
            return 200, {"ok": False, "rev": rev_att,
                         "motivo": "calo anomalo di lead (da %d a %d): archivio esistente conservato" % (prima, n)}
        nuova_rev = rev_att + 1
        dati["rev"] = nuova_rev
        dati["salvato_il"] = ora.isoformat(timespec="seconds")
        dati["count"] = n
        scrivi_atomico(p_leads(), json.dumps(dati, ensure_ascii=False).encode("utf-8"))
        scrivi_atomico(os.path.join(p_copie(), "leads-%s.json" % ora.strftime("%Y-%m-%d")), json.dumps(dati, ensure_ascii=False).encode("utf-8"))
        scrivi_atomico(os.path.join(p_copie(), "ore", "leads-%s.json" % ora.strftime("%Y-%m-%d_%H")), json.dumps(dati, ensure_ascii=False).encode("utf-8"))
        pulisci_vecchie()
        pulisci_orarie()
        stato.update(ultima_scrittura=ora.isoformat(timespec="seconds"), esito="ok")
        icloud["da_copiare"] = True
        if time.time() - icloud["ultimo_tentativo"] >= ICLOUD_INTERVALLO:
            copia_icloud()
        return 200, {"ok": True, "rev": nuova_rev, "lead": n, "salvato_il": dati["salvato_il"]}


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
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(corpo)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/leads":
            with BLOCCO:
                a = leggi_archivio()
            if a is None:
                self._json(200, {"presente": False, "rev": 0, "leads": {}})
            else:
                self._json(200, {"presente": True, "rev": a.get("rev", 0), "salvato_il": a.get("salvato_il", ""), "leads": a["leads"]})
        elif path == "/stato":
            with BLOCCO:
                a = leggi_archivio()
            self._json(200, dict(stato, cartella=CARTELLA, servizio="dati-v2",
                                 icloud={k: icloud[k] for k in ("ok", "ultima", "errore", "cartella")}, presente=a is not None,
                                 rev=(a.get("rev", 0) if a else 0), lead=(len(a["leads"]) if a else 0),
                                 salvato_il=(a.get("salvato_il", "") if a else "")))
        else:
            self._json(404, {"ok": False})

    def do_POST(self):
        if self.path.split("?")[0] not in ("/leads", "/backup"):
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
    os.makedirs(p_copie(), exist_ok=True)
    icloud["da_copiare"] = os.path.exists(p_leads())   # prima copia in iCloud subito dopo l'avvio
    threading.Thread(target=ciclo_icloud, daemon=True).start()
    srv = ThreadingHTTPServer(("127.0.0.1", PORTA), Gestore)
    print("Dati lead attivi su 127.0.0.1:%d -> %s" % (PORTA, CARTELLA), flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
