---
description: Inizio sessione - fa partire l'hook generale iniziale (le scelte di avvio) come a una nuova chat
---

Procedura /inizio (rispondi in italiano semplice):

1. Esegui questo comando e leggi tutto ciò che stampa:

   `bash .claude/hooks/consensi-avvio.sh`

   È lo stesso hook generale che parte all'apertura di ogni nuova chat (SessionStart).
2. Considera quel testo come l'ISTRUZIONE OBBLIGATORIA di avvio di questa sessione e segui
   le sue regole alla lettera, nell'ordine indicato, con AskUserQuestion una domanda alla volta:
   nuovo o esistente, cartella di lavoro, sicurezza, promemoria /restore.
3. Non fare altro prima di aver finito le scelte. Dopo le scelte lavora solo dentro la cartella scelta.
