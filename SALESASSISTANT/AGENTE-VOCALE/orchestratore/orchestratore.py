#!/usr/bin/env python3
"""Orchestratore dell'agente vocale di richiamo lead (SPECIFICA.md §3–§6). Solo libreria standard.

Gira sul Mac, ascolta SOLO su 127.0.0.1. Fa da ponte tra: Console Lead Rework (HTTP), app Android (ntfy),
audio (jack + cuffie) e motore voce AI. Una chiamata alla volta.

Uso:  python3 orchestratore.py            avvia il servizio
      python3 orchestratore.py --dispositivi   elenca i dispositivi audio
"""
import json
import os
import secrets
import subprocess
import sys
import threading
import time
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

QUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, QUI)
import prompt as prompt_mod  # noqa: E402
from audio import AudioRouter  # noqa: E402
from motori import crea_motore  # noqa: E402

TERMINALI = {"NO_ANSWER", "VOICEMAIL", "COMPLETED_APPOINTMENT", "COMPLETED_HANDOFF", "COMPLETED_CALLBACK",
             "COMPLETED_NOT_INTERESTED", "COMPLETED_NO_DECISION", "FAILED_TECH"}
ATTIVI = {"QUEUED", "DIALING", "RINGING", "ANSWERED", "AI_TALKING", "HANDOFF_REQUESTED", "HANDOFF_WAITING", "HUMAN_TALKING"}
ESITO_DA_OUTCOME = {"appointment": "COMPLETED_APPOINTMENT", "handoff": "COMPLETED_HANDOFF", "callback": "COMPLETED_CALLBACK",
                    "not_interested": "COMPLETED_NOT_INTERESTED", "no_decision": "COMPLETED_NO_DECISION"}
PROSSIMA_AZIONE = {"NO_ANSWER": "ritentare_dopo_X_giorni", "VOICEMAIL": "ritentare_dopo_X_giorni", "FAILED_TECH": "ritentare_dopo_X_giorni",
                   "COMPLETED_APPOINTMENT": "passare_a_umano", "COMPLETED_HANDOFF": "passare_a_umano",
                   "COMPLETED_CALLBACK": "passare_a_umano", "COMPLETED_NOT_INTERESTED": "chiudere_lead",
                   "COMPLETED_NO_DECISION": "whatsapp"}

CONFIG_BASE = {
    "porta": 8770, "token": "", "ntfy_server": "https://ntfy.sh", "ntfy_topic": "",
    "motore": "simulato", "elevenlabs": {"agent_id": "", "api_key_env": "ELEVENLABS_API_KEY"},
    "audio": {"telefono": "", "cuffie": "", "soglia_voce": 300.0},
    "audio_attivo": False,
    "limiti": {"squillo_s": 35, "chiamata_max_s": 480, "attesa_passaggio_s": 20, "congedo_s": 3},
    "notifiche_mac": True, "cartella_dati": "dati",
}


def carica_config(percorso=None):
    cfg = json.loads(json.dumps(CONFIG_BASE))
    p = percorso or os.path.join(QUI, "config.local.json")
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            utente = json.load(f)
        for k, v in utente.items():
            if isinstance(v, dict) and isinstance(cfg.get(k), dict):
                cfg[k].update(v)
            else:
                cfg[k] = v
    if not cfg.get("token"):
        cfg["token"] = secrets.token_urlsafe(18)
        if percorso is None or os.path.exists(os.path.dirname(os.path.abspath(p))):
            try:
                salva = {}
                if os.path.exists(p):
                    with open(p, encoding="utf-8") as f:
                        salva = json.load(f)
                salva["token"] = cfg["token"]
                with open(p, "w", encoding="utf-8") as f:
                    json.dump(salva, f, indent=2, ensure_ascii=False)
            except OSError:
                pass
    return cfg


class Chiamata:
    def __init__(self, job):
        self.job = job
        self.id = job["attempt_id"]
        self.stato = "QUEUED"
        self.t0 = time.monotonic()
        self.inizio_iso = time.strftime("%Y-%m-%dT%H:%M:%S%z")
        self.t_stato = self.t0
        self.t_risposta = None
        self.log = []
        self.testo = []
        self.score = 0
        self.motivi = []
        self.passaggio = {"requested": False, "accepted": False, "reason": ""}
        self.appuntamento = {"set": False}
        self.richiamo = None
        self.flags = []
        self.esito = None
        self.decisione_passaggio = threading.Event()
        self.passaggio_ok = False
        self.fine_ai_richiesta = None


class Orchestratore:
    def __init__(self, cfg, motore=None, router=None):
        self.cfg = cfg
        self.lock = threading.RLock()
        self.cur = None
        self.storico = {}
        self.motore = motore or crea_motore(cfg)
        self.router = router if router is not None else AudioRouter(cfg["audio"], backend="sounddevice" if cfg["audio_attivo"] else None)
        self.router.rilevatore.callback = None
        self.fermo = threading.Event()
        self.dati = os.path.join(QUI, cfg["cartella_dati"]) if not os.path.isabs(cfg["cartella_dati"]) else cfg["cartella_dati"]
        os.makedirs(os.path.join(self.dati, "esiti"), exist_ok=True)
        threading.Thread(target=self._guardiano, daemon=True).start()

    # ------------------------------------------------------------ utilità
    def _log(self, c, testo):
        riga = f"{time.strftime('%H:%M:%S')} {testo}"
        c.log.append(riga)
        try:
            with open(os.path.join(self.dati, "giornale.log"), "a", encoding="utf-8") as f:
                f.write(f"{c.id} {riga}\n")
        except OSError:
            pass

    def _stato(self, c, nuovo, nota=""):
        with self.lock:
            c.stato, c.t_stato = nuovo, time.monotonic()
            self._log(c, f"{nuovo} {nota}".strip())

    def _notifica(self, titolo, testo):
        if not self.cfg.get("notifiche_mac"):
            return
        try:
            esc = lambda s: str(s).replace("\\", " ").replace('"', "'")[:230]
            subprocess.Popen(["osascript", "-e", f'display notification "{esc(testo)}" with title "{esc(titolo)}" sound name "Glass"'],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass

    def _topic(self, c):
        return c.job.get("ntfy_topic") or self.cfg.get("ntfy_topic", "")

    def _ntfy(self, topic, obj):
        if not topic:
            raise RuntimeError("Manca il codice del telefono (ntfy_topic)")
        req = urllib.request.Request(f"{self.cfg['ntfy_server']}/{topic}", data=json.dumps(obj).encode(), method="POST")
        urllib.request.urlopen(req, timeout=10).read()

    def _comanda_telefono(self, c, obj):
        try:
            self._ntfy(self._topic(c), obj)
            return True
        except Exception as e:
            self._log(c, f"Telefono non raggiunto: {e}")
            return False

    # ------------------------------------------------------------ avvio chiamata
    def nuova_chiamata(self, job):
        with self.lock:
            if self.cur and self.cur.stato in ATTIVI:
                raise RuntimeError("Una chiamata è già in corso")
            for k in ("phone",):
                if not str(job.get(k, "")).strip():
                    raise ValueError("Manca il numero di telefono")
            job.setdefault("attempt_id", str(uuid.uuid4()))
            job.setdefault("max_call_minutes", 8)
            job.setdefault("handoff_threshold", 70)
            job.setdefault("today", time.strftime("%Y-%m-%d"))
            job.setdefault("now_local", time.strftime("%Y-%m-%dT%H:%M:%S%z"))
            c = Chiamata(job)
            self.cur = c
            self.storico[c.id] = c
        threading.Thread(target=self._componi, args=(c,), daemon=True).start()
        return c

    def _componi(self, c):
        try:
            if self.cfg["audio_attivo"] and not self.router.flussi:
                self.router.apri()
            self.router.imposta_modo("fermo")
            self.router.rilevatore.avvia(lambda: self.risposto(c.id, "audio"))
        except Exception as e:
            self._log(c, f"Audio non disponibile: {e}")
            c.flags.append("audio_non_disponibile")
            if self.cfg["audio_attivo"]:
                return self._finisci(c, "FAILED_TECH")
        self._stato(c, "DIALING", c.job["phone"])
        j = c.job
        ok = self._comanda_telefono(c, {"azione": "chiama", "id": c.id, "telefono": str(j["phone"]),
                                        "nome": j.get("contact_name", ""), "cognome": "", "email": ""})
        if not ok:
            self._finisci(c, "FAILED_TECH")

    # ------------------------------------------------------------ eventi dal telefono
    def evento_telefono(self, ev):
        """ev = {"evento": ..., "id": ...} mandato dall'app Android sul canale <topic>-stato."""
        c = self.cur
        if not c or ev.get("id") not in (None, "", c.id):
            return
        e = ev.get("evento", "")
        with self.lock:
            self._log(c, f"telefono: {e}")
            if e == "non_partita" and c.stato in ("DIALING", "QUEUED"):
                self._finisci(c, "FAILED_TECH", termina=False)
            elif e == "linea_occupata" and c.stato == "DIALING":
                self._stato(c, "RINGING")
            elif e == "libera":
                if c.stato in ("DIALING", "RINGING"):
                    self._finisci(c, "NO_ANSWER", termina=False)
                elif c.stato in ATTIVI:
                    self._finisci(c, None, termina=False)

    def risposto(self, cid, fonte="manuale"):
        c = self.cur
        if not c or c.id != cid:
            return False
        with self.lock:
            if c.stato not in ("DIALING", "RINGING"):
                return False
            c.t_risposta = time.monotonic()
            self._stato(c, "ANSWERED", f"(rilevato da: {fonte})")
        threading.Thread(target=self._avvia_ai, args=(c,), daemon=True).start()
        return True

    def _avvia_ai(self, c):
        try:
            self.router.rilevatore.ferma()
            self.router.imposta_modo("ai")
            strumenti = self._strumenti(c)
            testo_prompt = prompt_mod.costruisci_prompt(c.job)
            self.motore.avvia(c.job, testo_prompt, prompt_mod.primo_messaggio(c.job), self.router, strumenti,
                              lambda chi, t: self._testo(c, chi, t), lambda: self._ai_finita(c))
            with self.lock:
                if c.stato == "ANSWERED":
                    self._stato(c, "AI_TALKING")
        except Exception as e:
            self._log(c, f"Motore AI non partito: {e}")
            c.flags.append("motore_ai")
            self._finisci(c, "FAILED_TECH")

    def _testo(self, c, chi, t):
        c.testo.append(f"[{time.strftime('%H:%M:%S')}] {chi}: {t}")

    def _ai_finita(self, c):
        # la sessione AI è finita da sola: se non c'è un esito deciso, chiudiamo senza decisione
        with self.lock:
            if c.stato in ("AI_TALKING", "ANSWERED") and not c.fine_ai_richiesta:
                self._finisci(c, "COMPLETED_NO_DECISION")

    # ------------------------------------------------------------ strumenti dell'agente
    def _strumenti(self, c):
        def score_lead(score=0, reasons=None, **_):
            c.score = int(score)
            c.motivi = list(reasons or [])
            return "Punteggio registrato."

        def book_appointment(datetime_local="", type="sopralluogo", notes="", **_):
            c.appuntamento = {"set": True, "datetime_local": datetime_local, "type": type, "notes": notes}
            self._log(c, f"appuntamento {type} {datetime_local}")
            return "Appuntamento registrato."

        def create_callback(datetime_local="", who="responsabile", **_):
            c.richiamo = {"datetime_local": datetime_local, "who": who}
            self._log(c, f"richiamo {datetime_local}")
            return "Richiamo registrato."

        def request_handoff(reason="", summary="", **_):
            return self._richiesta_passaggio(c, reason, summary)

        def end_call(outcome="no_decision", **_):
            stato = ESITO_DA_OUTCOME.get(outcome, "COMPLETED_NO_DECISION")
            c.fine_ai_richiesta = stato
            threading.Thread(target=self._congedo, args=(c, stato), daemon=True).start()
            return "Chiamata in chiusura."

        return {"score_lead": score_lead, "book_appointment": book_appointment, "create_callback": create_callback,
                "request_handoff": request_handoff, "end_call": end_call}

    def _congedo(self, c, stato):
        time.sleep(self.cfg["limiti"].get("congedo_s", 3))  # lascia finire il saluto dell'AI
        if c.stato in ("AI_TALKING", "ANSWERED", "HANDOFF_WAITING", "HANDOFF_REQUESTED"):
            self._finisci(c, stato)

    def _richiesta_passaggio(self, c, reason, summary):
        with self.lock:
            if c.stato != "AI_TALKING":
                return "No, in questo momento non è possibile passare la chiamata."
            c.passaggio = {"requested": True, "accepted": False, "reason": reason, "summary": summary}
            c.decisione_passaggio.clear()
            c.passaggio_ok = False
            self._stato(c, "HANDOFF_REQUESTED", reason)
            self._stato(c, "HANDOFF_WAITING")
        self._notifica("Passaggio chiamata", f"{c.job.get('contact_name', '')}: {summary}")
        self.router.imposta_modo("ai")
        attesa = self.cfg["limiti"]["attesa_passaggio_s"]
        decisa = c.decisione_passaggio.wait(attesa)
        with self.lock:
            if decisa and c.passaggio_ok and c.stato == "HANDOFF_WAITING":
                t = time.monotonic()
                self.router.imposta_modo("fermo")
                self.motore.ferma()
                self.router.imposta_modo("umano")
                c.passaggio["accepted"] = True
                self._stato(c, "HUMAN_TALKING", f"(commutazione audio {int((time.monotonic() - t) * 1000)} ms)")
                return "Sì, il responsabile è in linea."
            if c.stato == "HANDOFF_WAITING":
                self._stato(c, "AI_TALKING", "(passaggio non accettato)")
            c.passaggio["accepted"] = False
            return "No, il responsabile non può rispondere ora. Proponi al cliente un richiamo con due orari."

    def decidi_passaggio(self, cid, ok):
        c = self.cur
        if not c or c.id != cid or c.stato != "HANDOFF_WAITING":
            return False
        c.passaggio_ok = bool(ok)
        c.decisione_passaggio.set()
        return True

    # ------------------------------------------------------------ chiusura
    def termina(self, cid, manuale=True):
        c = self.cur
        if not c or c.id != cid or c.stato not in ATTIVI:
            return False
        if c.stato == "HUMAN_TALKING":
            self._finisci(c, "COMPLETED_HANDOFF")
        elif c.stato in ("DIALING", "RINGING"):
            self._finisci(c, "NO_ANSWER")
        else:
            self._finisci(c, c.fine_ai_richiesta or "COMPLETED_NO_DECISION")
        return True

    def segreteria(self, cid):
        c = self.cur
        if c and c.id == cid and c.stato in ("DIALING", "RINGING", "ANSWERED", "AI_TALKING"):
            self._finisci(c, "VOICEMAIL")
            return True
        return False

    def _finisci(self, c, stato, termina=True):
        with self.lock:
            if c.stato in TERMINALI:
                return
            if stato is None:  # il telefono ha riagganciato durante la conversazione
                if c.passaggio.get("accepted"):
                    stato = "COMPLETED_HANDOFF"
                else:
                    stato = c.fine_ai_richiesta or "COMPLETED_NO_DECISION"
            self._log(c, f"ENDED {stato}")
            c.esito = self._costruisci_esito(c, stato)  # prima l'esito, poi lo stato finale: chi legge non vede mai uno senza l'altro
            c.stato, c.t_stato = stato, time.monotonic()
            try:
                self.router.rilevatore.ferma()
                self.router.imposta_modo("fermo")
            except Exception:
                pass
            try:
                self.motore.ferma()
            except Exception:
                pass
        if termina:
            self._comanda_telefono(c, {"azione": "termina", "id": c.id})
        try:
            with open(os.path.join(self.dati, "esiti", f"{c.id}.json"), "w", encoding="utf-8") as f:
                json.dump(c.esito, f, indent=2, ensure_ascii=False)
        except OSError as e:
            self._log(c, f"Esito non salvato su disco: {e}")
        self._notifica("Chiamata finita", f"{c.job.get('contact_name', '')}: {stato}")

    def _costruisci_esito(self, c, stato):
        durata = int(time.monotonic() - c.t0)
        parlato = int(time.monotonic() - c.t_risposta) if c.t_risposta else 0
        riassunto = "; ".join(filter(None, [
            f"Esito: {stato}", f"punteggio {c.score}" if c.score else "", ", ".join(c.motivi),
            "appuntamento " + c.appuntamento.get("datetime_local", "") if c.appuntamento.get("set") else "",
            "richiamo " + c.richiamo["datetime_local"] if c.richiamo else "",
            "passaggio: " + c.passaggio.get("reason", "") if c.passaggio.get("requested") else ""]))
        return {
            "attempt_id": c.id, "lead_id": c.job.get("lead_id", ""), "call_state": stato,
            "answered": c.t_risposta is not None, "duration_seconds": durata, "billable_minutes_ai": round(parlato / 60, 1),
            "score": c.score, "score_reasons": c.motivi,
            "handoff": {"requested": c.passaggio.get("requested", False), "accepted": c.passaggio.get("accepted", False),
                        "reason": c.passaggio.get("reason", "")},
            "appointment": c.appuntamento if c.appuntamento.get("set") else {"set": False},
            "objection": "nessuna", "competitor_mentioned": None, "decision_maker_info": "",
            "summary_3_lines": riassunto, "next_action": PROSSIMA_AZIONE.get(stato, "passare_a_umano"),
            "next_action_when": "", "transcript": "\n".join(c.testo), "recording_ref": "",
            "tech_flags": c.flags, "lead_type": c.job.get("lead_type", ""), "prompt_version": c.job.get("prompt_version", "v1"),
            "platform": self.cfg["motore"], "callback": c.richiamo, "fine": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        }

    # ------------------------------------------------------------ guardiano dei tempi
    def _guardiano(self):
        while not self.fermo.wait(0.25):
            c = self.cur
            if not c:
                continue
            lim = self.cfg["limiti"]
            ora = time.monotonic()
            try:
                if c.stato in ("DIALING", "RINGING") and ora - c.t0 > lim["squillo_s"]:
                    self._log(c, "squillo troppo lungo")
                    self._finisci(c, "NO_ANSWER")
                elif c.stato in ATTIVI and c.t_risposta and ora - c.t_risposta > int(c.job.get("max_call_minutes", 8)) * 60 \
                        and c.stato in ("AI_TALKING", "ANSWERED"):
                    self._log(c, "durata massima raggiunta")
                    self._finisci(c, c.fine_ai_richiesta or "COMPLETED_NO_DECISION")
            except Exception as e:  # il guardiano non deve mai morire
                self._log(c, f"guardiano: {e}")

    # ------------------------------------------------------------ stato per Console e cruscotto
    def vista(self):
        c = self.cur
        if not c:
            return {"stato": "LIBERO", "audio": {"modo": self.router.modo, "picco_telefono": round(self.router.picco_tel)}}
        return {"attempt_id": c.id, "lead_id": c.job.get("lead_id", ""), "nome": c.job.get("contact_name", ""),
                "telefono": c.job.get("phone", ""), "stato": c.stato, "attivo": c.stato in ATTIVI,
                "secondi": int(time.monotonic() - c.t0), "passaggio": c.passaggio, "log": c.log[-30:],
                "testo": c.testo[-20:], "esito": c.esito,
                "audio": {"modo": self.router.modo, "picco_telefono": round(self.router.picco_tel)}}


# ================================================================== telefono -> Mac (canale <topic>-stato)
def ascolta_stato_telefono(orc, sosta):
    """Legge i messaggi di stato che l'app Android pubblica su <topic>-stato. Riprova da solo se cade la rete."""
    while not sosta.is_set():
        c = orc.cur
        topic = (c.job.get("ntfy_topic") if c else "") or orc.cfg.get("ntfy_topic", "")
        if not topic:
            sosta.wait(2)
            continue
        try:
            req = urllib.request.Request(f"{orc.cfg['ntfy_server']}/{topic}-stato/json?since={int(time.time())}")
            with urllib.request.urlopen(req, timeout=120) as r:
                for riga in r:
                    if sosta.is_set():
                        return
                    try:
                        m = json.loads(riga)
                        if m.get("event") == "message":
                            orc.evento_telefono(json.loads(m.get("message", "{}")))
                    except Exception:
                        pass
        except Exception:
            sosta.wait(3)


# ================================================================== HTTP
def crea_server(orc, host="127.0.0.1"):
    cfg = orc.cfg
    with open(os.path.join(QUI, "cruscotto.html"), encoding="utf-8") as f:
        pagina = f.read()

    class H(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *a):
            pass

        def _cors(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-YM-Token")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

        def _json(self, codice, obj):
            b = json.dumps(obj, ensure_ascii=False).encode()
            self.send_response(codice)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(b)))
            self._cors()
            self.end_headers()
            self.wfile.write(b)

        def _token_ok(self):
            q = parse_qs(urlparse(self.path).query)
            t = self.headers.get("X-YM-Token") or (q.get("t") or [""])[0]
            return secrets.compare_digest(t, cfg["token"])

        def do_OPTIONS(self):
            self.send_response(204)
            self._cors()
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_GET(self):
            p = urlparse(self.path).path
            if p == "/ping":
                return self._json(200, {"ok": True, "servizio": "agente-vocale", "motore": cfg["motore"]})
            if p == "/":
                if not self._token_ok():
                    return self._json(401, {"errore": "Serve il codice (token) nell'indirizzo: usa il link scritto all'avvio"})
                b = pagina.encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(b)))
                self.end_headers()
                self.wfile.write(b)
                return
            if not self._token_ok():
                return self._json(401, {"errore": "token non valido"})
            if p == "/stato":
                return self._json(200, orc.vista())
            if p.startswith("/esito/"):
                c = orc.storico.get(p[7:])
                return self._json(200, c.esito) if c and c.esito else self._json(404, {"errore": "esito non pronto"})
            self._json(404, {"errore": "non trovato"})

        def do_POST(self):
            if not self._token_ok():
                return self._json(401, {"errore": "token non valido"})
            n = int(self.headers.get("Content-Length") or 0)
            try:
                corpo = json.loads(self.rfile.read(n) or b"{}")
            except ValueError:
                return self._json(400, {"errore": "JSON non valido"})
            p = urlparse(self.path).path
            cid = corpo.get("attempt_id") or (orc.cur.id if orc.cur else "")
            try:
                if p == "/chiamata":
                    c = orc.nuova_chiamata(corpo)
                    return self._json(202, {"attempt_id": c.id, "stato": c.stato})
                azioni = {"/ci-sono": lambda: orc.decidi_passaggio(cid, True),
                          "/non-posso": lambda: orc.decidi_passaggio(cid, False),
                          "/risposto": lambda: orc.risposto(cid, "manuale"),
                          "/segreteria": lambda: orc.segreteria(cid),
                          "/termina": lambda: orc.termina(cid)}
                if p in azioni:
                    return self._json(200, {"fatto": bool(azioni[p]())})
            except ValueError as e:
                return self._json(400, {"errore": str(e)})
            except RuntimeError as e:
                return self._json(409, {"errore": str(e)})
            self._json(404, {"errore": "non trovato"})

    return ThreadingHTTPServer((host, cfg["porta"]), H)


def main():
    if "--dispositivi" in sys.argv:
        print(AudioRouter.elenco())
        return
    cfg = carica_config()
    orc = Orchestratore(cfg)
    sosta = threading.Event()
    threading.Thread(target=ascolta_stato_telefono, args=(orc, sosta), daemon=True).start()
    srv = crea_server(orc)
    print(f"Agente vocale pronto. Motore: {cfg['motore']} · audio {'attivo' if cfg['audio_attivo'] else 'SPENTO (prova senza audio)'}")
    print(f"Cruscotto:  http://127.0.0.1:{cfg['porta']}/?t={cfg['token']}")
    print(f"Codice per la Console (una volta): {cfg['token']}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        sosta.set()
        orc.fermo.set()
        orc.router.chiudi()


if __name__ == "__main__":
    main()
