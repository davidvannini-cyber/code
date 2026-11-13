# LEAD-COLLECTOR

Ricevi email contenenti lead → il sistema estrae nome, email, telefono, azienda, città e messaggio → li mostra in una **tabella web** (ricerca, ordinamento, stato, esporta CSV).

Zero dipendenze per l'uso base (Node ≥ 18). `npm install` serve solo per la lettura automatica via IMAP.

## Avvio
```
cd LEAD-COLLECTOR
PAGE_PASSWORD=segreta INGEST_TOKEN=token123 node server.js
```
Apri http://localhost:3000 (utente qualsiasi, password = `PAGE_PASSWORD`). Dati in `data/leads.json`.

## Tre modi per inviare le email
1. **Casella IMAP (consigliato)**: crea/usa una casella dedicata (es. `leads@tuodominio.it`), inoltrale le email. Il server la legge ogni 60 s.
   `npm install` e poi `IMAP_HOST=imap.gmail.com IMAP_USER=... IMAP_PASS=<password app> node server.js`
   (opz.: `IMAP_PORT`, `IMAP_FOLDER`, `IMAP_INTERVAL_SEC`). Le email lette vengono segnate come lette.
2. **Webhook**: `POST /api/inbound?token=INGEST_TOKEN` con body = email grezza (RFC822), JSON `{subject,from,text}` o form (Mailgun/SendGrid/Zapier/Cloudflare Email Workers).
3. **Incolla a mano** nella pagina ("Aggiungi a mano una email").

## Come vengono riconosciuti i campi
Righe `Etichetta: valore` (nome, cognome, email, telefono/cellulare, azienda, città, messaggio/note… in italiano e inglese). Se mancano, si usano il Reply-To/mittente, la prima email nel testo (esclusi gli indirizzi in `OWN_ADDRESSES`, separati da virgola) e il primo numero di telefono. Duplicati scartati per Message-ID. Regole in `extract.js`.

## Grafica
La pagina usa la stessa grafica di LEADREWORKS (tema chiaro, barra in alto, schede grigie, font Manrope e IBM Plex, stessi bottoni e campi). Se cambi palette o misure in `SALESASSISTANT/LEADREWORKS/src/lead-rework-console.html`, allinea anche `public/index.html`. I font arrivano da Google Fonts: senza internet si vede il font di sistema.

## Esportazione verso LEADREWORKS (segno «Esportato»)
Ogni lead ha una casella **Esportato** nella tabella (con data nel suggerimento): si spunta da sola quando LEADREWORKS importa il lead, ma puoi togliere o rimettere la spunta a mano. In alto c'è il filtro **Tutti / Non esportati / Esportati**; il CSV ha la colonna `exported`.
Per LEADREWORKS il server offre due indirizzi **senza password, ma solo dal Mac stesso** (localhost, controllo anche sul nome del sito):
- `GET /api/ext/pending` → lead non esportati, dal più vecchio al più recente
- `POST /api/ext/exported` con `{"id":"..."}` → li segna come esportati
Il resto del sito resta protetto da `PAGE_PASSWORD`. Se il server è esposto in rete, questi due indirizzi rispondono comunque solo a chi è sul Mac.

## Test
`npm test` (prova l'estrazione dalle email e il ponte con LEADREWORKS)

Nota: il server va ospitato dove resta acceso (VPS, Render, Fly…); la modalità IMAP non richiede un indirizzo pubblico.

## App con icona (macOS)
`Lead Collector.app` (nella cartella LEAD-COLLECTOR): un doppio clic avvia il server in background, senza Terminale, e apre `http://localhost:3000`. In fondo alla pagina il pulsante **⏻ Chiudi Lead Collector** ferma il server e chiude la scheda del browser (Chrome/Safari).
Per metterla sulla scrivania: tieni premuti **Opzione+Cmd** e trascina l'app sulla scrivania (crea un alias). Le impostazioni restano nel file `.env`; eventuali errori sono in `data/server.log`.

## Dopo ogni modifica: far girare il codice nuovo sul Mac (procedura di David)
Il server legge il codice **solo quando parte**: dopo un Sync il vecchio programma resta in memoria e continua a lavorare con il codice vecchio (è successo il 13/11/2026: «ne importa solo uno» anche con la correzione già scaricata). Passi, in ordine:
1. **Fai Sync** (icona sulla scrivania).
2. **Ferma il vecchio programma** (il pulsante «⏻ Chiudi» non sempre basta). Nel Terminale, deve stampare `fermo`:
   `pkill -f "node server.js"; sleep 2; pgrep -fl "node server.js" || echo "fermo"`
3. **Riapri Lead Collector** con l'icona.
4. **Cancella dalla pagina le righe sbagliate** importate prima (la `×` rossa). Una email già letta non viene riletta da sola.
5. **Rimetti l'email da leggere**: in Gmail segnala come *non letta* l'email, oppure inoltrala di nuovo (arriva come nuova); in alternativa incollala a mano in «Aggiungi a mano una email». Dopo un minuto premi **Aggiorna**.

### Se qualcosa non va, controllare (cartella `data/` dentro LEAD-COLLECTOR)
- `data/server.log`: `tail -n 30 data/server.log`. Righe `IMAP uid N: ...` dicono cosa è successo a ogni email (aggiunti / duplicato / mittente non autorizzato / nessun dato di contatto trovato).
- `data/last-email.txt`: il testo esatto dell'ultima email letta (tab come `→`). Serve per riprodurre il problema: copiarlo in un test (con dati **inventati**, il repository è pubblico) e correggere `extract.js`.
- Verificare che il Mac abbia il codice nuovo: `git log --oneline -3` nella cartella `code`.
- Prova di lettura sul Mac con l'ultima email: `node -e "const {extractLeads}=require('./extract');const t=require('fs').readFileSync('data/last-email.txt','utf8').split('\n\n').slice(1).join('\n\n');const r=extractLeads({from:'x',subject:'x',text:t},['info@yesmobility.it']);console.log(r.length, r.map(l=>l.name).join(' | '))"` (dalla cartella LEAD-COLLECTOR).

### Per chi modifica il codice
- Provare con `npm test`; per un formato di email nuovo aggiungere un caso in `test/parser.test.js` con dati inventati.
- Una tabella di contatti (una riga per lead, oppure una cella per riga) dà un lead per contatto; il testo scritto prima della tabella (senza intestazioni di inoltro) va nel campo Messaggio di ogni lead.
- Tolleranze volute in `extractColumnar`: telefono mancante o sostituito da un carattere isolato, parola-etichetta (`cella`, `tel`…) al posto della città, ultimo record senza città.
