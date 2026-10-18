# Pubblicare online

Il server e' un solo processo Node con un file di dati (`playlist.m3u`). Per tenerlo online servono: HTTPS, una password
e un disco permanente (altrimenti la playlist torna a quella di prova a ogni riavvio).

## Prima di pubblicare
- Scegli due password lunghe: `ADMIN_PASSWORD` (area admin) e `VIEWER_PASSWORD` (per vedere i canali).
  Senza `VIEWER_PASSWORD` chiunque conosca l'indirizzo vede l'elenco, e gli URL dei flussi spesso contengono utente e password del fornitore.
- Non scrivere le password nei file del repository: vanno nelle variabili d'ambiente del servizio.
- Una pagina in https non puo' riprodurre flussi `http://` (il browser li blocca). Servono flussi `https://`.

## Opzione consigliata: Render (servizio gestito)
Non ho potuto provare queste schermate: i nomi dei campi possono essere diversi. Verifica anche il prezzo attuale (il disco richiede un piano a pagamento).
1. Crea un account su https://render.com e collega GitHub.
2. **New +** → **Web Service** → scegli il repository `davidvannini-cyber/code`.
3. **Root Directory**: `M3U-PLAYER-WEB` · **Language/Runtime**: Docker (usa il `Dockerfile`) · branch `main`.
4. Piano **a pagamento** (serve per il disco permanente).
5. **Environment**: aggiungi `ADMIN_PASSWORD` e `VIEWER_PASSWORD`. Le altre variabili (`HOST`, `DATA_DIR`, `TRUST_PROXY`) sono gia' nel Dockerfile.
6. **Disks** → Add Disk: *Mount Path* `/data`, 1 GB.
7. **Health Check Path**: `/healthz`.
8. Crea il servizio. Quando e' pronto apri l'indirizzo `https://…onrender.com`: ti chiede la password spettatore; `/admin` e' l'area di amministrazione.

Ogni `git push` su `main` ripubblica da solo (se lasci attiva la distribuzione automatica).

## Provare subito dal Mac (gratis, temporaneo)
Con Cloudflare Tunnel la pagina e' online finche' il Mac e' acceso e il comando e' in esecuzione:
```
ADMIN_PASSWORD="…" VIEWER_PASSWORD="…" TRUST_PROXY=1 npm start
cloudflared tunnel --url http://127.0.0.1:3000     # installa prima: brew install cloudflared
```
Il comando stampa un indirizzo `https://…trycloudflare.com`.

## Altre strade
Qualsiasi servizio che esegue un container Docker con un volume su `/data` e HTTPS (Fly.io, Railway, un VPS con Caddy davanti) funziona
con lo stesso `Dockerfile`. Dietro un proxy HTTPS tieni `TRUST_PROXY=1`; senza proxy lascialo spento.

## Dopo la pubblicazione
- Cambia la playlist da `/admin`; la precedente resta in `playlist.prev.m3u` nel disco.
- Se perdi la password, cambia la variabile d'ambiente e riavvia: non e' salvata su disco.
- Se il server e' esposto a internet, tienilo aggiornato (Node 22 LTS) e controlla gli accessi del servizio.
