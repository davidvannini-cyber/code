"""Prove senza telefono, audio e account: motore finto + telefono finto. Lancia:  python3 -I test_orchestratore.py"""
import json
import os
import tempfile
import threading
import time
import sys
import unittest
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audio  # noqa: E402
import orchestratore as O  # noqa: E402


class NtfyFinto(BaseHTTPRequestHandler):
    ricevuti = []

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        NtfyFinto.ricevuti.append((self.path, json.loads(self.rfile.read(n))))
        self.send_response(200); self.send_header("Content-Length", "2"); self.end_headers(); self.wfile.write(b"{}")

    def log_message(self, *a):
        pass


def aspetta(f, t=5):
    fine = time.time() + t
    while time.time() < fine:
        if f():
            return True
        time.sleep(0.02)
    return False


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ntfy = HTTPServer(("127.0.0.1", 0), NtfyFinto)
        threading.Thread(target=cls.ntfy.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.ntfy.shutdown()

    def setUp(self):
        NtfyFinto.ricevuti.clear()
        cfg = O.carica_config(os.path.join(tempfile.mkdtemp(), "c.json"))
        cfg.update(ntfy_server=f"http://127.0.0.1:{self.ntfy.server_port}", ntfy_topic="prova", cartella_dati=tempfile.mkdtemp(),
                   notifiche_mac=False, porta=0)
        cfg["limiti"].update(squillo_s=1.5, attesa_passaggio_s=1.0, congedo_s=0.1)
        cfg["simulato"] = {"pausa_s": 0.05}
        self.orc = O.Orchestratore(cfg, router=audio.AudioRouter(backend=None))

    def tearDown(self):
        self.orc.fermo.set()

    def job(self, scenario, **extra):
        j = {"phone": "3331234567", "contact_name": "Rossi", "lead_id": "L1", "_simulazione": scenario,
             "analysis_and_strategy": "x", "call_script": "y", "notes": "n"}
        j.update(extra)
        return j

    def avvia(self, scenario, **extra):
        c = self.orc.nuova_chiamata(self.job(scenario, **extra))
        self.assertTrue(aspetta(lambda: c.stato == "DIALING"))
        self.assertTrue(aspetta(lambda: any(p == "/prova" and b["azione"] == "chiama" for p, b in NtfyFinto.ricevuti)))
        self.orc.evento_telefono({"evento": "linea_occupata", "id": c.id})
        self.assertEqual(c.stato, "RINGING")
        return c


class TestFlussi(Base):
    def test_il_telefono_riceve_il_comando_giusto(self):
        c = self.avvia("silenzio")
        cmd = [b for p, b in NtfyFinto.ricevuti if b["azione"] == "chiama"][0]
        self.assertEqual((cmd["telefono"], cmd["id"]), ("3331234567", c.id))
        self.orc.termina(c.id)

    def test_appuntamento(self):
        c = self.avvia("appuntamento")
        self.assertTrue(self.orc.risposto(c.id))
        self.assertTrue(aspetta(lambda: c.stato == "COMPLETED_APPOINTMENT"))
        e = c.esito
        self.assertTrue(e["appointment"]["set"] and e["answered"] and e["score"] == 55)
        self.assertEqual(e["next_action"], "passare_a_umano")
        self.assertIn("Sono l'assistente virtuale".lower(), e["transcript"].lower().replace("sono l'assistente", "sono l'assistente"))
        self.assertTrue(any(b["azione"] == "termina" for p, b in NtfyFinto.ricevuti))
        self.assertTrue(os.path.exists(os.path.join(self.orc.dati, "esiti", c.id + ".json")))

    def test_non_interessato(self):
        c = self.avvia("non_interessato")
        self.orc.risposto(c.id)
        self.assertTrue(aspetta(lambda: c.stato == "COMPLETED_NOT_INTERESTED"))
        self.assertEqual(c.esito["next_action"], "chiudere_lead")

    def test_passaggio_accettato_porta_audio_alle_cuffie(self):
        c = self.avvia("passaggio")
        self.orc.risposto(c.id)
        self.assertTrue(aspetta(lambda: c.stato == "HANDOFF_WAITING"))
        self.assertTrue(self.orc.decidi_passaggio(c.id, True))
        self.assertTrue(aspetta(lambda: c.stato == "HUMAN_TALKING"))
        self.assertEqual(self.orc.router.modo, "umano")
        # in modo umano: cliente -> cuffie, cuffie -> telefono; l'AI non riceve più nulla
        r = self.orc.router
        r.ai_sink = lambda b: self.fail("l'AI sente ancora il cliente")
        r._in_telefono(b"\x01\x00" * 320); r._in_cuffie(b"\x02\x00" * 320)
        self.assertEqual(len(r.coda_cuf), 1); self.assertEqual(len(r.coda_tel), 1)
        # non ci deve essere il comando «termina» finché David parla
        self.assertFalse(any(b["azione"] == "termina" for p, b in NtfyFinto.ricevuti))
        self.assertTrue(self.orc.termina(c.id))
        self.assertEqual(c.esito["call_state"], "COMPLETED_HANDOFF")
        self.assertTrue(c.esito["handoff"]["accepted"])

    def test_passaggio_rifiutato_ripiega_su_richiamo(self):
        c = self.avvia("passaggio")
        self.orc.risposto(c.id)
        self.assertTrue(aspetta(lambda: c.stato == "HANDOFF_WAITING"))
        self.orc.decidi_passaggio(c.id, False)
        self.assertTrue(aspetta(lambda: c.stato == "COMPLETED_CALLBACK"))
        self.assertIsNotNone(c.esito["callback"])
        self.assertFalse(c.esito["handoff"]["accepted"])

    def test_passaggio_scaduto(self):
        c = self.avvia("passaggio")
        self.orc.risposto(c.id)
        self.assertTrue(aspetta(lambda: c.stato == "COMPLETED_CALLBACK", 6))  # nessuno preme: scade e ripiega

    def test_nessuna_risposta_scade(self):
        c = self.avvia("silenzio")
        self.assertTrue(aspetta(lambda: c.stato == "NO_ANSWER", 4))
        self.assertTrue(any(b["azione"] == "termina" for p, b in NtfyFinto.ricevuti))
        self.assertEqual(c.esito["next_action"], "ritentare_dopo_X_giorni")

    def test_telefono_riaggancia_prima_della_risposta(self):
        c = self.avvia("silenzio")
        self.orc.evento_telefono({"evento": "libera", "id": c.id})
        self.assertEqual(c.stato, "NO_ANSWER")

    def test_lyber_non_parte(self):
        c = self.orc.nuova_chiamata(self.job("silenzio"))
        aspetta(lambda: c.stato == "DIALING")
        self.orc.evento_telefono({"evento": "non_partita", "id": c.id})
        self.assertEqual(c.stato, "FAILED_TECH")

    def test_una_chiamata_alla_volta(self):
        c = self.avvia("silenzio")
        with self.assertRaises(RuntimeError):
            self.orc.nuova_chiamata(self.job("silenzio"))
        self.orc.termina(c.id)
        self.orc.nuova_chiamata(self.job("silenzio"))

    def test_telefono_non_raggiungibile(self):
        self.orc.cfg["ntfy_server"] = "http://127.0.0.1:1"
        c = self.orc.nuova_chiamata(self.job("silenzio"))
        self.assertTrue(aspetta(lambda: c.stato == "FAILED_TECH"))

    def test_durata_massima(self):
        c = self.avvia("silenzio", max_call_minutes=0.03)
        self.orc.risposto(c.id)
        self.assertTrue(aspetta(lambda: c.stato == "COMPLETED_NO_DECISION", 6))

    def test_numero_obbligatorio(self):
        with self.assertRaises(ValueError):
            self.orc.nuova_chiamata({"phone": " "})

    def test_eventi_di_un_altra_chiamata_ignorati(self):
        c = self.avvia("silenzio")
        self.orc.evento_telefono({"evento": "libera", "id": "altro"})
        self.assertEqual(c.stato, "RINGING")
        self.orc.termina(c.id)


class TestPrompt(unittest.TestCase):
    def test_prompt_ha_le_regole_chiave(self):
        import prompt
        p = prompt.costruisci_prompt({"today": "2026-11-09", "now_local": "2026-11-09T17:30:00+01:00", "handoff_threshold": 70,
                                      "call_script": "Buongiorno (con calma)", "analysis_and_strategy": "Recuperare", "existing_price_eur": 13000})
        self.assertIn("MAI cifre", p); self.assertIn("2026-11-09", p); self.assertIn("score_lead", p)
        self.assertNotIn("13000", p)  # il prezzo esistente non va nel prompt (SPECIFICA §6.1: contesto interno)
        self.assertIn("assistente virtuale di YesMobility", prompt.primo_messaggio({"contact_name": "Rossi", "now_local": "2026-11-09T17:30:00"}))


class TestAudio(unittest.TestCase):
    def tono(self, f, ms=100, ampl=8000):
        import math, array
        n = audio.RATE * ms // 1000
        return array.array("h", [int(ampl * math.sin(2 * math.pi * f * i / audio.RATE)) for i in range(n)]).tobytes()

    def test_tono_di_libero_non_e_risposta(self):
        r = audio.RilevatoreRisposta(); visto = []
        r.avvia(lambda: visto.append(1))
        for i in range(0, len(self.tono(425, 3000)), 640):
            r.blocco(self.tono(425, 20))
        self.assertEqual(visto, [])

    def test_voce_e_risposta(self):
        import random, array
        random.seed(1)
        r = audio.RilevatoreRisposta(); visto = []
        r.avvia(lambda: visto.append(1))
        rumore = array.array("h", [random.randint(-6000, 6000) for _ in range(320)]).tobytes()
        for _ in range(40):
            r.blocco(rumore)
        self.assertEqual(visto, [1])

    def test_silenzio_non_e_risposta(self):
        r = audio.RilevatoreRisposta(); visto = []
        r.avvia(lambda: visto.append(1))
        for _ in range(200):
            r.blocco(b"\x00\x00" * 320)
        self.assertEqual(visto, [])

    def test_modo_ai_voce_ai_verso_telefono(self):
        r = audio.AudioRouter(backend=None); r.imposta_modo("ai")
        r.parla_al_telefono(b"\x01\x00" * 640)
        self.assertEqual(len(r.coda_tel), 2)
        r.interrompi(); self.assertEqual(len(r.coda_tel), 0)
        r.imposta_modo("umano"); r.parla_al_telefono(b"\x01\x00" * 640)
        self.assertEqual(len(r.coda_tel), 0)  # l'AI non può parlare dopo il passaggio


class TestHttp(Base):
    def setUp(self):
        super().setUp()
        self.orc.cfg["porta"] = 0
        self.srv = O.crea_server(self.orc)
        self.porta = self.srv.server_port
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def tearDown(self):
        self.srv.shutdown(); super().tearDown()

    def chiedi(self, metodo, path, corpo=None, token=True):
        h = {"Content-Type": "application/json"}
        if token:
            h["X-YM-Token"] = self.orc.cfg["token"]
        req = urllib.request.Request(f"http://127.0.0.1:{self.porta}{path}", method=metodo, headers=h,
                                     data=json.dumps(corpo).encode() if corpo is not None else None)
        try:
            with urllib.request.urlopen(req, timeout=5) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def test_senza_token_rifiutato(self):
        self.assertEqual(self.chiedi("POST", "/chiamata", self.job("silenzio"), token=False)[0], 401)
        self.assertEqual(self.chiedi("GET", "/stato", token=False)[0], 401)
        self.assertEqual(self.chiedi("GET", "/ping", token=False)[0], 200)

    def test_flusso_completo_via_http(self):
        cod, r = self.chiedi("POST", "/chiamata", self.job("appuntamento"))
        self.assertEqual(cod, 202)
        cid = r["attempt_id"]
        self.assertTrue(aspetta(lambda: self.chiedi("GET", "/stato")[1].get("stato") == "DIALING"))
        self.assertEqual(self.chiedi("POST", "/chiamata", self.job("appuntamento"))[0], 409)
        self.assertEqual(self.chiedi("POST", "/risposto", {"attempt_id": cid})[1], {"fatto": True})
        self.assertTrue(aspetta(lambda: self.chiedi("GET", f"/esito/{cid}")[0] == 200))
        self.assertEqual(self.chiedi("GET", f"/esito/{cid}")[1]["call_state"], "COMPLETED_APPOINTMENT")
        self.assertEqual(self.chiedi("GET", "/stato")[1]["esito"]["call_state"], "COMPLETED_APPOINTMENT")

    def test_json_rotto(self):
        req = urllib.request.Request(f"http://127.0.0.1:{self.porta}/chiamata", method="POST", data=b"{{",
                                     headers={"X-YM-Token": self.orc.cfg["token"]})
        with self.assertRaises(urllib.error.HTTPError) as cm:
            urllib.request.urlopen(req)
        self.assertEqual(cm.exception.code, 400)


if __name__ == "__main__":
    unittest.main(verbosity=2)
