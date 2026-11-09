"""Motore finto per provare tutto senza account e senza audio: segue uno scenario scritto a mano.
Scenario = job["_simulazione"], uno tra: appuntamento, passaggio, passaggio_rifiutato, non_interessato, silenzio.
"""
import threading
import time


class MotoreSimulato:
    def __init__(self, cfg=None):
        self.cfg = cfg or {}
        self.pausa = float(self.cfg.get("pausa_s", 0.2))
        self._stop = threading.Event()
        self._t = None

    def avvia(self, job, prompt, primo_messaggio, router, strumenti, on_testo, on_fine):
        self._stop.clear()
        self.prompt = prompt

        def p():
            return not self._stop.wait(self.pausa)

        def corri():
            sc = job.get("_simulazione") or self.cfg.get("scenario", "appuntamento")
            on_testo("agente", primo_messaggio)
            if sc == "silenzio":
                while p():
                    pass
                return
            if not p(): return
            on_testo("cliente", "Sì, sono io. Mi dica.")
            if not p(): return
            if sc == "non_interessato":
                on_testo("cliente", "No grazie, non mi interessa.")
                strumenti["end_call"](outcome="not_interested")
            elif sc == "appuntamento":
                strumenti["score_lead"](score=55, reasons=["interessato", "decide la famiglia"])
                on_testo("agente", "Le va bene giovedì alle 10?")
                if not p(): return
                strumenti["book_appointment"](datetime_local=job.get("_data_appuntamento", "2026-11-12T10:00:00+01:00"),
                                              type="sopralluogo", notes="Giovedì mattina")
                strumenti["end_call"](outcome="appointment")
            elif sc in ("passaggio", "passaggio_rifiutato"):
                strumenti["score_lead"](score=85, reasons=["decide entro un mese", "chiede il prezzo"])
                on_testo("agente", "Un attimo, la passo a un collega.")
                r = strumenti["request_handoff"](reason="lead caldo", summary="Decide entro un mese, chiede il prezzo.")
                if r.lower().startswith("no"):
                    on_testo("agente", "Il responsabile la richiama oggi. Preferisce alle 16 o domani mattina?")
                    strumenti["create_callback"](datetime_local="2026-11-10T16:00:00+01:00", who="responsabile")
                    strumenti["end_call"](outcome="callback")
                # se il passaggio è riuscito il Mac chiude questa sessione: ci fermiamo da soli
            self._stop.wait(self.pausa)

        self._t = threading.Thread(target=corri, daemon=True)
        self._t.start()

    def ferma(self):
        self._stop.set()
