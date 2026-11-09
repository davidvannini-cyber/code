"""Orchestratore di prova per la Console: motore finto (scenario «passaggio»), telefono finto, codice «TEST», porta 8770."""
import json, os, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import audio, orchestratore as O

class Telefono(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        print("AL TELEFONO:", self.rfile.read(n).decode(), flush=True)
        self.send_response(200); self.send_header("Content-Length", "2"); self.end_headers(); self.wfile.write(b"{}")
    def log_message(self, *a): pass

nt = HTTPServer(("127.0.0.1", 0), Telefono); threading.Thread(target=nt.serve_forever, daemon=True).start()
cfg = O.carica_config(os.path.join(tempfile.mkdtemp(), "c.json"))
cfg.update(token="TEST", porta=8770, ntfy_server=f"http://127.0.0.1:{nt.server_port}", ntfy_topic="t",
           cartella_dati=tempfile.mkdtemp(), notifiche_mac=False)
cfg["simulato"] = {"pausa_s": 0.3, "scenario": "passaggio"}
cfg["limiti"].update(attesa_passaggio_s=15, squillo_s=60)
orc = O.Orchestratore(cfg, router=audio.AudioRouter(backend=None))
print("pronto", flush=True)
O.crea_server(orc).serve_forever()
