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

## Test
`npm test`

Nota: il server va ospitato dove resta acceso (VPS, Render, Fly…); la modalità IMAP non richiede un indirizzo pubblico.
