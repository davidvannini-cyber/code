"""
Motore di matching script per il sistema di suggerimenti live.

Pipeline (Decisione 1 del progetto):
1. Filtro: esclude script vietati dall'operatore e script le cui
   condizioni_crm non corrispondono al lead della sessione corrente.
2. Retrieval semantico: tra gli script ammessi, trova i candidati più
   simili alla frase del cliente usando embedding calcolati IN LOCALE
   (nessuna latenza di rete su questo step, fondamentale per l'uso live).
3. Classificatore LLM leggero (Claude Haiku): sceglie il migliore tra i
   candidati e restituisce SOLO un id — mai testo libero, per evitare sia
   allucinazioni sia la latenza di una generazione lunga.

Setup:
    pip install -r requirements.txt
    export ANTHROPIC_API_KEY=sk-ant-...

Nota: la prima esecuzione scarica il modello di embedding multilingua
(~470MB, una tantum, poi resta in cache locale).

Uso standalone (senza audio, per validare libreria/condizioni CRM):
    python motore_suggerimenti.py ../schema/esempio-libreria-script.json ../server/contesto-sessione-esempio.json
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Optional

import numpy as np
from sentence_transformers import SentenceTransformer
from anthropic import Anthropic

MODELLO_EMBEDDING = "paraphrase-multilingual-MiniLM-L12-v2"  # multilingua, include italiano, leggero e veloce
MODELLO_CLASSIFICATORE = "claude-haiku-4-5-20251001"  # LLM leggero per la scelta finale tra i candidati


@dataclass
class CandidatoScript:
    script: dict
    punteggio_similarita: float


class MotoreSuggerimenti:
    def __init__(self, path_libreria: str, path_contesto_sessione: Optional[str] = None):
        self.libreria = self._carica_json(path_libreria)
        self.contesto_sessione = self._carica_json(path_contesto_sessione) if path_contesto_sessione else {}
        self.embedder = SentenceTransformer(MODELLO_EMBEDDING)
        self.client_llm = Anthropic()  # legge ANTHROPIC_API_KEY dall'ambiente
        self._indice = self._costruisci_indice()
        self._ultima_fase = "apertura"

    # ---------- caricamento dati ----------

    @staticmethod
    def _carica_json(path: str):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def imposta_contesto(self, contesto: dict):
        """Permette di caricare/aggiornare il contesto di sessione a runtime (nuova chiamata = nuovo lead)."""
        self.contesto_sessione = contesto

    # ---------- indicizzazione ----------

    def _costruisci_indice(self):
        """
        Calcola un embedding per ogni frase-esempio di ogni script attivo.
        Indice = lista di (script_id, embedding). Usare la similarità
        massima tra le frasi-esempio di uno stesso script gestisce bene
        script con formulazioni cliente molto diverse tra loro.
        """
        indice = []
        for script in self.libreria:
            if not script.get("attivo", True):
                continue
            frasi = script.get("trigger_esempi", [])
            if not frasi:
                continue
            embeddings = self.embedder.encode(frasi, normalize_embeddings=True)
            for emb in embeddings:
                indice.append((script["id"], emb))
        return indice

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

    # ---------- step 2: retrieval semantico ----------

    def _recupera_candidati(self, frase_cliente: str, top_k: int = 5) -> list[CandidatoScript]:
        script_ammessi_ids = {s["id"] for s in self.libreria if self._script_ammesso(s)}
        if not script_ammessi_ids:
            return []

        emb_frase = self.embedder.encode([frase_cliente], normalize_embeddings=True)[0]

        migliore_per_script = {}
        for script_id, emb in self._indice:
            if script_id not in script_ammessi_ids:
                continue
            similarita = float(np.dot(emb_frase, emb))  # embedding normalizzati -> dot = coseno
            if similarita > migliore_per_script.get(script_id, -1.0):
                migliore_per_script[script_id] = similarita

        script_per_id = {s["id"]: s for s in self.libreria}
        candidati = [
            CandidatoScript(script=script_per_id[sid], punteggio_similarita=sim)
            for sid, sim in migliore_per_script.items()
        ]

        prioritari = set((self.contesto_sessione or {}).get("regole_operatore", {}).get("script_prioritari", []))
        candidati.sort(
            key=lambda c: (
                c.script["id"] in prioritari,
                c.punteggio_similarita,
                c.script.get("priorita", 0),
            ),
            reverse=True,
        )
        return candidati[:top_k]

    # ---------- step 3: classificatore LLM ----------

    def _classifica(self, frase_cliente: str, candidati: list[CandidatoScript]) -> Optional[dict]:
        if not candidati:
            return None
        if len(candidati) == 1:
            return candidati[0].script

        lead = (self.contesto_sessione or {}).get("lead", {})
        regole = (self.contesto_sessione or {}).get("regole_operatore", {})

        blocco_candidati = "\n".join(
            f"- id: {c.script['id']}\n"
            f"  categoria: {c.script['trigger_categoria']}\n"
            f"  suggerimento: {c.script['testo_suggerimento']}"
            for c in candidati
        )

        system = (
            "Sei un classificatore per un assistente di vendita live. Scegli quale script è "
            "il più adatto a rispondere a quello che ha appena detto il cliente. Rispondi SOLO "
            "con l'id esatto dello script scelto, senza nient'altro. Se nessuno script è "
            "davvero pertinente, rispondi con: nessuno.\n\n"
            f"Obiettivo della chiamata: {regole.get('obiettivo_chiamata', 'non specificato')}\n"
            f"Argomenti da evitare con questo lead: {', '.join(regole.get('argomenti_da_evitare', [])) or 'nessuno'}\n"
            f"Note sul lead: {lead.get('note_precedenti', 'nessuna')}"
        )

        messaggio = (
            f'Frase del cliente: "{frase_cliente}"\n\n'
            f"Script candidati:\n{blocco_candidati}\n\n"
            "Id scelto:"
        )

        risposta = self.client_llm.messages.create(
            model=MODELLO_CLASSIFICATORE,
            max_tokens=20,
            system=system,
            messages=[{"role": "user", "content": messaggio}],
        )
        id_scelto = risposta.content[0].text.strip().lower()

        for c in candidati:
            if c.script["id"].lower() == id_scelto:
                return c.script

        if id_scelto == "nessuno":
            return None

        # fallback di sicurezza: se l'LLM risponde in modo imprevisto, usa il migliore per similarità
        return candidati[0].script

    # ---------- entry point ----------

    def suggerisci(self, frase_cliente: str) -> Optional[dict]:
        """
        Dato quello che ha appena detto il cliente, ritorna il dizionario
        completo dello script scelto (o None se nessuno è pertinente),
        pronto per essere inviato all'overlay via WebSocket.
        """
        candidati = self._recupera_candidati(frase_cliente)
        script_scelto = self._classifica(frase_cliente, candidati)
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
