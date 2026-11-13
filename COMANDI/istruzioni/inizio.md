# /inizio

## A cosa serve
Far partire le domande iniziali di una nuova chat anche quando l'hook di avvio non parte da solo.

## Come si usa
Scrivi `/inizio` come primo messaggio della chat. Claude lancia lo stesso script dell'hook di avvio (`.claude/hooks/consensi-avvio.sh`) e ti fa le 4 scelte, una alla volta.

## Esempi
- `/inizio` all'apertura di una chat nuova.
- Le 4 scelte sono: nuovo o esistente, cartella di lavoro, sicurezza (passaggio a `main`), promemoria `/restore`.

## Cosa succede
- Claude non fa altro finché non hai risposto alle scelte.
- Dopo le scelte lavora solo dentro la cartella che hai scelto.

## Cose da non fare
- Non usarlo a metà lavoro: serve all'inizio della chat.

## Se qualcosa non va
Se Claude non ti fa le domande, scrivigli «esegui l'hook di avvio e fai le 4 domande».
