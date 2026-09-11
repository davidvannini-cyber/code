"""
Motore di matching script per il sistema di suggerimenti live.

Pipeline:
1. Filtro: esclude script vietati dall'operatore e script le cui
   condizioni_crm non corrispondono al lead della sessione corrente.
2. Classificatore LLM (Claude Haiku): sceglie il migliore tra TUTTI gli
   script ammessi e restituisce SOLO un id — mai testo libero, per evitare
   sia allucinazioni sia la latenza di una generazione lunga. Se nessuno
   script è davvero pertinente, risponde "nessuno": qui non c'è nessun
   punteggio numerico da controllare, è il LLM stesso a deciderlo.

Nota: niente più retrieval semantico locale (sentence-transformers/torch).
Con una libreria di poche decine di script — il target del progetto, vedi
README — passarli tutti al classificatore in un solo prompt è più semplice
e molto più leggero da installare (evita ~1-2GB di PyTorch più il modello
di embedding da 470MB): il giudizio di pertinenza resta comunque al LLM,
che lo fa bene anche senza un pre-filtro. Se in futuro la libreria dovesse
crescere a centinaia di voci, vale la pena reintrodurre un pre-filtro per
tenere il prompt piccolo — per ora non serve.

Setup:
    pip install -r requirements.txt
    export ANTHROPIC_API_KEY=sk-ant-...

Uso standalone (senza audio, per validare libreria/condizioni CRM):
    python motore_suggerimenti.py ../schema/esempio-libreria-script.json ../server/contesto-sessione-esempio.json
"""

from __future__ import annotations

import json
from typing import Optional

from anthropic import Anthropic

MODELLO_CLASSIFICATORE = "claude-haiku-4-5-20251001"  # LLM leggero per la scelta finale


class MotoreSuggerimenti:
    def __init__(self, path_libreria: str, path_contesto_sessione: Optional[str] = None):
        self.libreria = self._carica_json(path_libreria)
        self.contesto_sessione = self._carica_json(path_contesto_sessione) if path_contesto_sessione else {}
        self.client_llm = Anthropic()  # legge ANTHROPIC_API_KEY dall'ambiente
        self._ultima_fase = "apertura"

    # ---------- caricamento dati ----------

    @staticmethod
    def _carica_json(path: str):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def imposta_contesto(self, contesto: dict):
        """Permette di caricare/aggiornare il contesto di sessione a runtime (nuova chiamata = nuovo lead)."""
        self.contesto_sessione = contesto

    # ---------- step 1: filtro CRM / regole operatore ----------

    def _script_ammesso(self, script: dict) -> bool:
        regole = (self.contesto_sessione or {}).get("regole_operatore", {})
        if script["id"] in regole.get("script_vietati", []):
            return False

        condizioni = script.get("condizioni_crm", {}) or {}
        lead = (self.contesto_sessione or {}).get("lead", {})
        for campo, valori_ammessi in condizioni.items():
            if campo == "numero_chiamate_precedenti":
                n = lead.get("numero_chiamate_precedenti", 0)
                if "min" in valori_ammessi and n < valori_ammessi["min"]:
                    return False
                if "max" in valori_ammessi and n > valori_ammessi["max"]:
                    return False
                continue
            valore_lead = lead.get(campo)
            if valore_lead is None:
                continue  # dato non presente sul lead: non filtra
            valori_lead = valore_lead if isinstance(valore_lead, list) else [valore_lead]
            if not any(v in valori_ammessi for v in valori_lead):
                return False
        return True

    def _script_ammessi(self) -> list[dict]:
        return [
            s for s in self.libreria
            if s.get("attivo", True) and s.get("trigger_esempi") and self._script_ammesso(s)
        ]

    # ---------- step 2: classificatore LLM ----------

    def _classifica(self, frase_cliente: str, ammessi: list[dict]) -> Optional[dict]:
        lead = (self.contesto_sessione or {}).get("lead", {})
        regole = (self.contesto_sessione or {}).get("regole_operatore", {})
        prioritari = set(regole.get("script_prioritari", []))

        blocco_script = "\n".join(
            f"- id: {s['id']}\n"
            f"  categoria: {s['trigger_categoria']}\n"
            f"  frasi tipiche del cliente in questa situazione: {'; '.join(s.get('trigger_esempi', []))}\n"
            f"  suggerimento: {s['testo_suggerimento']}\n"
            f"  priorità: {s.get('priorita', 0)}{' (PRIORITARIO)' if s['id'] in prioritari else ''}"
            for s in ammessi
        )

        system = (
            "Sei un classificatore per un assistente di vendita live. Scegli quale script è "
            "il più adatto a rispondere a quello che ha appena detto il cliente, confrontando "
            "il senso della frase con le \"frasi tipiche del cliente\" e la categoria di ogni "
            "script — non serve un testo identico, basta la stessa situazione. Rispondi SOLO "
            "con l'id esatto dello script scelto, senza nient'altro. Se nessuno script è "
            "davvero pertinente, rispondi con: nessuno. A parità di pertinenza, preferisci uno "
            "script marcato PRIORITARIO, poi quello con priorità numerica più alta.\n\n"
            f"Obiettivo della chiamata: {regole.get('obiettivo_chiamata', 'non specificato')}\n"
            f"Argomenti da evitare con questo lead: {', '.join(regole.get('argomenti_da_evitare', [])) or 'nessuno'}\n"
            f"Note sul lead: {lead.get('note_precedenti', 'nessuna')}"
        )

        messaggio = (
            f'Frase del cliente: "{frase_cliente}"\n\n'
            f"Script ammessi:\n{blocco_script}\n\n"
            "Id scelto:"
        )

        risposta = self.client_llm.messages.create(
            model=MODELLO_CLASSIFICATORE,
            max_tokens=20,
            system=system,
            messages=[{"role": "user", "content": messaggio}],
        )
        id_scelto = risposta.content[0].text.strip().lower()

        for s in ammessi:
            if s["id"].lower() == id_scelto:
                return s

        # "nessuno", o risposta imprevista: meglio non suggerire nulla che indovinare
        return None

    # ---------- entry point ----------

    def suggerisci(self, frase_cliente: str) -> Optional[dict]:
        """
        Dato quello che ha appena detto il cliente, ritorna il dizionario
        completo dello script scelto (o None se nessuno è pertinente),
        pronto per essere inviato all'overlay via WebSocket.
        """
        ammessi = self._script_ammessi()
        if not ammessi:
            return None
        script_scelto = self._classifica(frase_cliente, ammessi)
        if script_scelto:
            self._ultima_fase = script_scelto["fase_chiamata"]
        return script_scelto

    @property
    def fase_corrente(self) -> str:
        return self._ultima_fase


if __name__ == "__main__":
    # Test rapido da riga di comando, senza audio: scrivi frasi come se
    # fossi il cliente e verifica quale script viene scelto. Utile per
    # validare libreria e condizioni CRM prima di collegare tutto il resto.
    import sys

    path_libreria = sys.argv[1] if len(sys.argv) > 1 else "../schema/esempio-libreria-script.json"
    path_contesto = sys.argv[2] if len(sys.argv) > 2 else "../server/contesto-sessione-esempio.json"

    motore = MotoreSuggerimenti(path_libreria, path_contesto)
    print("Motore pronto. Scrivi una frase come se fossi il cliente (Ctrl+C per uscire).\n")
    while True:
        try:
            frase = input("Cliente> ").strip()
        except (KeyboardInterrupt, EOFError):
            break
        if not frase:
            continue
        risultato = motore.suggerisci(frase)
        if risultato:
            print(f"  -> [{risultato['fase_chiamata']}] {risultato['testo_suggerimento']}")
            if risultato.get("testo_alternativo"):
                print(f"     alternativa: {risultato['testo_alternativo']}")
        else:
            print("  -> nessuno script pertinente trovato")
