# RELAUNCH · Stato del lavoro

Ultimo aggiornamento: 6 ottobre 2026

## Cos'è
Agenda relaunch Moriremo Ma Non Di Sete (MMNDS): un solo file, `index.html`, senza compilazione.

## Dove vive
- **Sito online:** https://davidvannini-cyber.github.io/RE-LAUNCH-MMNDS/ (GitHub Pages).
- **Repository del sito:** `davidvannini-cyber/RE-LAUNCH-MMNDS`, file `index.html` nella radice. Ogni push su `main` ripubblica il sito in circa 2-5 minuti (poi ricaricamento forzato, Cmd+Maiusc+R).
- **Copia di lavoro:** `RELAUNCH/index.html` nel repository `code`. Questa cartella da sola non pubblica nulla: per aggiornare il sito il file va portato in `RE-LAUNCH-MMNDS`.
- **Progressi dell'utente:** l'agenda li salva in un file `relaunch-mmnds-backup.json` su GitHub, tramite un token personale inserito nel browser. Senza token attivo l'app è bloccata.

## Cosa è stato fatto (6 ottobre 2026)
Le istruzioni chiedevano di mettere il link in bio sui social, ma i profili social non esistevano ancora. Aggiunta una sezione per crearli da zero, tenendo conto che il marchio esiste dal 2018 mentre le pagine sono nuove.

- **Nuovo passaggio "Creare le pagine social da zero (Instagram, TikTok, YouTube, Facebook)"**, Fase 0, 2,5 ore, subito prima di "Tracciamento: analytics e convenzione UTM":
  - stesso nome utente su tutte le piattaforme, email dedicata, verifica in due passaggi;
  - Instagram e TikTok in modalità professionale, Pagina Facebook collegata a Instagram;
  - logo e colori coerenti col sito;
  - bio provvisoria con "Dal 2018";
  - niente follower comprati né scambi di follow;
  - ha un assistente AI per nomi utente e bio.
- **"Tracciamento: analytics e convenzione UTM"** ora dipende dalla creazione delle pagine: i link con UTM si inseriscono davvero nella bio di ogni profilo e si provano dal telefono.
- **"Avvio dei profili: riempirli e portare il pubblico che già hai"**, Fase 5 (Contenuti organici), 2 ore, dopo la banca iniziale di contenuti:
  - almeno 9 post Instagram, 5 video TikTok, 3 Shorts YouTube, 3 storie in evidenza;
  - portare il pubblico dal 2018 (clienti Shopify e Amazon, newsletter, community, QR nei pacchi);
  - primi 30 giorni: commentare, rispondere, ripubblicare i contenuti dei clienti.
- **"Profili social e collegamenti"** ora riscrive le bio definitive con la brand voice.
- **"Programmare e lanciare i primi contenuti"** richiede anche l'avvio dei profili.
- Il piano si ricalcola da solo dalle dipendenze tra i passaggi: non c'è nulla da spostare a mano.

## Pubblicazione
- Commit nel sito: `39c86c7` (prima versione) e `8089153` (versione attuale), su `main` di `RE-LAUNCH-MMNDS`.
- Versione precedente del sito: commit `3d0dba4`. Per tornare indietro si ripristina quel commit in `RE-LAUNCH-MMNDS`.
- Stesse modifiche sul branch `claude/lucid-goodall-1g5yzi` del repository `code`, non ancora su `main`. Il registro dei salvataggi è `REGISTRO-SALVATAGGI.md` nella radice.

## Da sistemare (decisione: per ora lasciato com'è)
1. **Etichetta "Dopo: …"** sotto "Tracciamento": è un'etichetta dell'app che indica cosa va fatto prima, ma si legge come "dopo si crea". Proposta: "Prima da fare: …" e nasconderla se quel passaggio è già completato.
2. **Sigle nei testi:** nei testi scritti il 6 ottobre compaiono sigle (T06a, K02, K05, O01…) che a chi usa l'agenda non dicono niente. Proposta: sostituirle col nome del passaggio.
3. **Divisione in due passaggi:** la creazione dei profili e il riempimento sono separati perché i contenuti nascono più avanti. Valutare se unificare in un solo passaggio.
4. **Token GitHub:** l'app è bloccata finché il token non è attivo. Non è stato possibile verificare dal vivo la vista Piano/Fasi dopo il ricalcolo.

## Dati da completare
- Nome utente definitivo dei profili (da verificare libero su ogni piattaforma).
- TikTok: verificare se l'account Business consente subito il link nella bio ("DA VERIFICARE").
