# /promemoria

## A cosa serve
Ricevere una email di promemoria all'ora che vuoi, una volta sola o ripetuta, descrivendola a parole.

## Come si usa
Scrivi `/promemoria` e poi, con parole tue, cosa vuoi ricevere e quando. **Se non indichi nessun indirizzo, la email arriva sempre a `david.vannini@me.com`.**

## Esempi
- `/promemoria ogni giorno alle 17 mandami un ricordo del progetto TV-PLAYER con i link`
- `/promemoria il 5 novembre alle 9 ricordami di rinnovare il dominio`
- `/promemoria ogni lunedì alle 8:30 controllare le liste dei canali`
- `/promemoria domani alle 9 ricordami la riunione anche a mario@esempio.it` manda a **te e a Mario**
- `/promemoria il 5 novembre alle 9 avvisa solo anna@esempio.it che la consegna è confermata` manda **solo ad Anna**
- `/promemoria elenco` mostra i promemoria attivi
- `/promemoria cancella TV-PLAYER` ferma quel promemoria

## Cosa succede
- Claude crea in Gmail una **bozza** con una sigla speciale nel titolo.
- Uno script del tuo account Google, già installato, controlla le bozze **ogni 5 minuti** e invia la email all'ora giusta.
- Funziona anche a computer spento e senza che nessuna conversazione resti aperta.
- La email può arrivare con **qualche minuto di ritardo**.

## Destinatari
- **Senza indirizzo**: sempre `david.vannini@me.com`.
- **«anche a …»**: arriva a te **e** agli indirizzi indicati.
- **«solo a …»** o «a …»: arriva **solo** agli indirizzi indicati.
- Puoi indicare più indirizzi. La email parte da `davan1972@gmail.com` e gli altri destinatari la leggeranno: non scrivere cose riservate.

## Cose da non fare
- Non inviare e non modificare a mano le bozze con il titolo che inizia per `[PROM`.
- Non cancellare il progetto «Promemoria» su script.google.com.
- Non creare lo stesso promemoria anche in Google Calendar: arriverebbe due volte (l'evento che c'era è stato tolto).

## Se qualcosa non va
- Controlla la cartella **Spam** e, se usi iCloud Mail, cerca il titolo in **«Tutte le caselle»**: la prima volta la email di prova era finita in una cartella diversa dalla posta in arrivo (il 26 ottobre 2026). Una regola in iCloud Mail («se il mittente è davan1972@gmail.com, sposta in Posta in arrivo») evita il problema.
- Scrivi a Claude «controlla il promemoria»: guarda se la bozza esiste e se il titolo è scritto bene.
- Lo script gira nel progetto **Promemoria** su script.google.com (account davan1972@gmail.com), con un controllo ogni 5 minuti.
