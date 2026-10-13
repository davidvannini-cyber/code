---
description: Mostra gli ultimi 20 salvataggi dal registro e ripristina quello scelto
---
Procedura /restore (rispondi in italiano):

1. Leggi `REGISTRO-SALVATAGGI.md` e prendi le ULTIME 20 righe della tabella (dalla più recente).
2. Mostrale in chat, una per riga, numerate, con questo formato:
   `N. DATA · commit · descrizione`
   La descrizione è il testo tra parentesi nella colonna "File modificati" (cosa è stato fatto);
   se manca, ricavala da `git show --stat <commit>`. Indica anche i file principali toccati.
3. Chiedi con AskUserQuestion quale salvataggio ripristinare (pagine di 3 + "Altri"/"Torna alla prima pagina",
   oppure chiedi il numero in chat) e se ripristinare TUTTO o solo una cartella/progetto.
4. Prima di agire mostra cosa cambierebbe (`git diff --stat <commit> -- <percorso>`) e chiedi conferma.
5. Ripristina SENZA riscrivere la storia e senza force push: `git checkout <commit> -- <percorso>`
   e poi un nuovo commit "Ripristino a <commit>" (oppure `git revert` per annullare una sola modifica).
6. Pubblica secondo i permessi concessi all'avvio (push su main solo se concesso, altrimenti sul branch di lavoro),
   e se "Aggiorna registro" è concesso aggiungi la riga al registro con descrizione "Ripristino a <commit>".
