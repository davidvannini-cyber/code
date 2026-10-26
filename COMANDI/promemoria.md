---
description: Crea un promemoria via email (una volta, ogni giorno o ogni settimana) descrivendolo a parole
argument-hint: <cosa vuoi ricevere, quando, a chi (se non sei tu)>
---
Procedura /promemoria (rispondi in italiano semplice; David non è uno sviluppatore):

Richiesta di David: $ARGUMENTS

Il sistema è già installato (script Google «Promemoria» nell'account davan1972@gmail.com, controlla le bozze ogni 5 minuti). Dettagli: `AUTOMAZIONI/promemoria-gmail/COME-USARE.md`. **Non rifare l'installazione e non chiedere a David di fare passi tecnici.**

1. Capisci dalla richiesta: **quando** (una data e ora / ogni giorno / ogni giorno della settimana + ora, ora italiana), **cosa scrivere** nella email, **a chi** (se non detto: `david.vannini@me.com`). Per «una volta» usa la data completa `AAAA-MM-GG` (oggi è nel contesto: se dice «il 5 novembre» usa la prossima occorrenza). Se manca l'ora o è ambigua, fai **una sola domanda** breve; altrimenti non chiedere altro.
2. Carica gli strumenti con ToolSearch: `select:mcp__Gmail__create_draft` (per elencare/cancellare anche `mcp__Gmail__list_drafts` e `mcp__Gmail__delete_draft`).
3. Crea la bozza con `create_draft`:
   - `to`: il destinatario;
   - `subject`: `[PROM quando] Titolo` dove *quando* è uno di: `ogni giorno HH:MM` · `ogni lunedi HH:MM` (martedi, mercoledi, giovedi, venerdi, sabato, domenica) · `il AAAA-MM-GG HH:MM`; il *Titolo* è l'oggetto che David vedrà;
   - `body`: testo semplice, in italiano semplice, con i link richiesti (per «link al progetto» usa quello della conversazione di lavoro e il repository privato `https://github.com/davidvannini-cyber/tv-player` se pertinente). Niente password o dati riservati.
4. **Mai** `send_message` (invia subito) e **mai** `create_trigger` (le routine non hanno Gmail). Non inviare la bozza.
5. Rispondi con 3 righe: cosa riceverà, quando (e che può arrivare con 5 minuti di ritardo), come fermarlo («scrivimi /promemoria cancella …»).

Casi speciali:
- `/promemoria elenco` → mostra con `list_drafts` le bozze il cui oggetto inizia con `[PROM`, una per riga: quando · titolo · destinatario.
- `/promemoria cancella <parte del titolo>` → trova la bozza e, **dopo conferma di David** se sono più di una, la cancella con `delete_draft`.
- Se `create_draft`/`list_drafts` non sono disponibili in questa sessione, dillo chiaramente e non inventare alternative.
