# Pubblicare su Cloudflare (tv.vannini.online)

La pagina e l'area admin girano sui server di Cloudflare (Workers), non sul tuo computer: il Mac serve solo per lanciare
il comando di pubblicazione, una volta. Dopo puoi spegnerlo. I dati (playlist, elenco delle liste) stanno nel KV di Cloudflare.

Il codice e' in `M3U-PLAYER-WEB/cloudflare/`; la pagina (`public/`) e' la stessa del server Render.

## Prima volta (dal Terminale del Mac, circa 10 minuti)
1. Aggiorna il codice e installa lo strumento di Cloudflare:
   ```
   cd /Users/davidvannini_1/Documents/progetti/code && git pull origin main
   cd M3U-PLAYER-WEB/cloudflare
   npm install
   ```
2. Accedi a Cloudflare (si apre il browser, autorizza):
   ```
   npx wrangler login
   ```
3. Crea l'archivio dei dati e scrivi l'**id** che stampa in `wrangler.toml` (sezione `[[kv_namespaces]]`). Se chiede di aggiungerlo da solo alla configurazione, rispondi **no**:
   ```
   npx wrangler kv namespace create DATA
   ```
4. Pubblica:
   ```
   npx wrangler deploy
   ```
   Collega da solo `tv.vannini.online` (il dominio e' gia' nel tuo account Cloudflare) e crea il certificato HTTPS. Finche' non imposti la password, l'area admin risponde "non disponibile".
5. Imposta la password admin (te la chiede, non resta scritta in nessun file):
   ```
   npx wrangler secret put ADMIN_PASSWORD
   ```
6. Apri `https://tv.vannini.online/admin`, accedi e nel riquadro "Liste (fonti)" incolla:
   ```
   https://github.com/Tundrak/IPTV-Italia/raw/main/iptvitaplus.m3u
   https://iptv-org.github.io/iptv/countries/it.m3u
   ```
   Premi "Salva e aggiorna". Le liste si riaggiornano da sole ogni 6 ore.

## Aggiornare il sito dopo una modifica
`git pull origin main`, poi di nuovo `npx wrangler deploy` dalla cartella `cloudflare/`.

## Limiti del piano gratuito
- **Tempo di calcolo:** 10 ms per richiesta. Il Worker non analizza la playlist, la unisce soltanto come testo, quindi liste
  piccole (iptvitaplus, lista italiana di iptv-org) stanno dentro il limite. Una lista enorme come `index.m3u` (11.000 canali)
  potrebbe superarlo: in quel caso l'aggiornamento fallisce con un errore. Rimedio: usare le liste per paese, oppure il piano
  Workers a pagamento (5 dollari al mese).
- **Liste:** fino a 8 fonti (il piano gratuito concede 50 richieste esterne per esecuzione).
- **KV gratuito:** 1.000 scritture al giorno e 100.000 letture: per uso personale basta e avanza.
- Nessun backup della playlist precedente (a differenza del server Render).
- Non c'e' la password per vedere i canali: `/playlist.m3u` e' pubblica, solo `/admin` e' protetta.

## Se vuoi tornare a Render
1. Crea il servizio Render (vedi `DEPLOY.md`).
2. In Cloudflare, nel Worker, rimuovi il dominio (Workers & Pages → tv-vannini → Settings → Domains & Routes), poi in DNS aggiungi il record CNAME `tv` verso Render.
3. Rimetti le liste dall'area admin. Il codice della pagina e' lo stesso.
