"""
Motore di matching script per il sistema di suggerimenti live.

Pipeline (Decisione 1 del progetto):
1. Filtro: esclude script vietati dall'operatore e script le cui
   condizioni_crm non corrispondono al lead della sessione corrente.
2. Retrieval semantico: tra gli script ammessi, trova i candidati più
   simili alla frase del cliente usando embedding calcolati IN LOCALE
   (nessuna latenza di rete su questo step, fondamentale per l'uso live).
   Chi non supera SOGLIA_MINIMA_SIMILARITA viene scartato subito: troppo
   lontano dalla frase per essere un match valido.
3. Decisione rapida, senza rete, nei due casi comuni:
   - nessun candidato sopra soglia -> nessuno script (va nei log per
     revisione, non serve l'AI per saperlo);
   - il migliore vince con margine chiaro sul secondo
     (>= MARGINE_CONFIDENZA_DIRETTA) -> si usa direttamente, senza AI.
4. Solo se i punteggi dei candidati sono vicini/ambigui si chiama il
   classificatore LLM leggero (Claude Haiku) sui soli candidati rimasti
   (non su tutta la libreria): gli vengono passate anche le frasi tipiche
   e la priorità di ciascun candidato, per farlo scegliere per significato
   (non serve testo identico) e per spareggiare a parità di pertinenza.
   Risponde SOLO con un id — mai testo libero, per evitare sia
   allucinazioni sia la latenza di una generazione lunga — o "nessuno". Se
   risponde in modo imprevisto, meglio nessun suggerimento che indovinare.
   Nell'uso normale è il caso raro, non la norma: la latenza di rete va
   accettata solo quando serve davvero a disambiguare.

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
MODELLO_CLASSIFICATORE = "claude-haiku-4-5-20251001"  # LLM leggero, usato solo nei casi ambigui (vedi sotto)

# Sotto questo punteggio di similarità (coseno, 0-1) uno script candidato è
# considerato troppo lontano dalla frase del cliente: viene scartato prima
# ancora di arrivare al classificatore. Da tarare con frasi reali: se il
# motore dice troppo spesso "nessuno script pertinente" su frasi che invece
# dovrebbero matchare, abbassala; se sceglie script sbagliati con punteggio
# basso, alzala.
SOGLIA_MINIMA_SIMILARITA = 0.35

# Se il candidato migliore supera il secondo di almeno questo margine
# (stessa scala 0-1), si usa direttamente senza chiamare il classificatore
# LLM: è un caso chiaro, la conferma dell'AI non aggiungerebbe valore, solo
# latenza di rete. Con margine più piccolo, i candidati sono considerati
# ambigui e si passa al classificatore.
MARGINE_CONFIDENZA_DIRETTA = 0.08


@dataclass
class CandidatoScript:
    script: dict
    punteggio_similarita: float


class MotoreSuggerimenti:
    def __init__(self, path_libreria: str, path_contesto_sessione: Optional[str] = None):
        self._path_libreria = path_libreria
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
            if sim >= SOGLIA_MINIMA_SIMILARITA
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

        # candidati è già ordinato (script_prioritari, similarità, priorità):
        # se il primo supera il secondo con margine chiaro sul punteggio di
        # similarità, nessun bisogno di chiamare l'AI per confermarlo.
        if candidati[0].punteggio_similarita - candidati[1].punteggio_similarita >= MARGINE_CONFIDENZA_DIRETTA:
            return candidati[0].script

        lead = (self.contesto_sessione or {}).get("lead", {})
        regole = (self.contesto_sessione or {}).get("regole_operatore", {})
        prioritari = set(regole.get("script_prioritari", []))

        blocco_candidati = "\n".join(
            f"- id: {c.script['id']}\n"
            f"  categoria: {c.script['trigger_categoria']}\n"
            f"  frasi tipiche del cliente in questa situazione: {'; '.join(c.script.get('trigger_esempi', []))}\n"
            f"  suggerimento: {c.script['testo_suggerimento']}\n"
            f"  priorità: {c.script.get('priorita', 0)}{' (PRIORITARIO)' if c.script['id'] in prioritari else ''}"
            for c in candidati
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

        # "nessuno", o risposta imprevista: meglio non suggerire nulla che indovinare
        return None

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

    def nuova_chiamata(self):
        """
        Da richiamare a inizio di ogni nuova chiamata quando questa stessa
        istanza resta accesa tra una chiamata e l'altra (processo server
        persistente, per non dover ricaricare il modello di embedding da
        zero ogni volta — l'unica parte davvero lenta): resetta la fase
        mostrata a "apertura" (altrimenti la nuova chiamata partirebbe dalla
        fase dove è finita la precedente) e ricarica la libreria script da
        disco (economico: richiede solo l'inferenza sulle frasi-esempio, non
        il ricaricamento del modello), così uno script aggiunto con
        "Aggiungi script" dopo l'avvio del processo risulta comunque attivo
        subito, come promesso all'operatore.
        """
        self._ultima_fase = "apertura"
        self.libreria = self._carica_json(self._path_libreria)
        self._indice = self._costruisci_indice()


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
