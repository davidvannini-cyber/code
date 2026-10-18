# Pubblicare online

Il server e' un solo processo Node con un file di dati (`playlist.m3u`). Per tenerlo online servono: HTTPS, una password
e un disco permanente (altrimenti la playlist torna a quella di prova a ogni riavvio).

## Prima di pubblicare
- **Canali senza password (scelta attuale):** non impostare `VIEWER_PASSWORD`. Chiunque conosca l'indirizzo vede l'elenco, quindi non pubblicarlo.
  Attenzione: se gli URL dei flussi contengono utente e password del fornitore (es. `/live/utente/password/123.m3u8`), chi apre la pagina li vede.
  In quel caso conviene aggiungere `VIEWER_PASSWORD` (vedi sotto, "Entrare senza digitare la password").
- Scegli una password lunga per `ADMIN_PASSWORD` (area `/admin`, dove si cambia la playlist). La digiti una volta sola per dispositivo: l'accesso si rinnova a ogni uso (fino a 400 giorni senza aprire la pagina) e resiste ai riavvii del server.
- Non scrivere le password nei file del repository: vanno nelle variabili d'ambiente del servizio.
- Una pagina in https non puo' riprodurre flussi `http://` (il browser li blocca). Servono flussi `https://`.

## Opzione consigliata: Render (servizio gestito)
Non ho potuto provare queste schermate: i nomi dei campi possono essere diversi. Verifica anche il prezzo attuale (il disco richiede un piano a pagamento).
1. Crea un account su https://render.com e collega GitHub.
2. **New +** → **Web Service** → scegli il repository `davidvannini-cyber/code`.
3. **Root Directory**: `M3U-PLAYER-WEB` · **Language/Runtime**: Docker (usa il `Dockerfile`) · branch `main`.
4. Piano **a pagamento** (serve per il disco permanente).
5. **Environment**: aggiungi `ADMIN_PASSWORD` (e `VIEWER_PASSWORD` solo se vuoi proteggere anche i canali). Le altre variabili (`HOST`, `DATA_DIR`, `TRUST_PROXY`) sono gia' nel Dockerfile.
6. **Disks** → Add Disk: *Mount Path* `/data`, 1 GB.
7. **Health Check Path**: `/healthz`.
8. Crea il servizio. Quando e' pronto apri l'indirizzo `https://…onrender.com`: ti chiede la password spettatore; `/admin` e' l'area di amministrazione.

Ogni `git push` su `main` ripubblica da solo (se lasci attiva la distribuzione automatica).

## Dominio tv.vannini.online (Cloudflare + Render)
1. **Render**: crea il servizio come sopra (Docker, Root Directory `M3U-PLAYER-WEB`, disco `/data`, variabile `ADMIN_PASSWORD`, Health Check `/healthz`). Aspetta che compaia "Live" e che `https://NOME.onrender.com` si apra.
2. **Render → Settings → Custom Domains → Add Custom Domain**: scrivi `tv.vannini.online`. Render mostra il valore del record CNAME da creare (di solito `NOME.onrender.com`).
3. **Cloudflare → vannini.online → DNS → Add record**: Tipo `CNAME`, Nome `tv`, Destinazione `NOME.onrender.com`, **Proxy status: "Solo DNS" (nuvola grigia)** per ora.
4. Torna su Render e premi **Verify**. Quando il dominio risulta verificato e il certificato HTTPS e' emesso (pochi minuti), apri `https://tv.vannini.online`.
5. Facoltativo, dopo che funziona: in Cloudflare puoi accendere il proxy (nuvola arancione) e impostare **SSL/TLS → Full (strict)**. Se qualcosa si rompe, torna a "Solo DNS".
6. Apri `https://tv.vannini.online/admin`, accedi con la password e nel riquadro "Liste (fonti)" incolla, uno per riga:
   ```
   https://github.com/Tundrak/IPTV-Italia/raw/main/iptvitaplus.m3u
   https://iptv-org.github.io/iptv/countries/it.m3u
   ```
   Premi "Salva e aggiorna". Le liste si riaggiornano da sole ogni 6 ore.

Le pagine di Render e Cloudflare cambiano nel tempo: se un nome di campo non coincide, segui il senso del passo. Prezzi e piano (serve uno a pagamento per il disco) vanno controllati sui rispettivi siti.

Ogni modifica pubblicata su `main` in `M3U-PLAYER-WEB/` riparte da sola su Render (se la distribuzione automatica e' attiva).
Per spostarsi altrove basta cambiare il record DNS e rimettere le liste dall'area admin.

## Entrare senza digitare la password
Su ogni dispositivo nuovo apri una volta `https://tuo-indirizzo/#k=LA-TUA-PASSWORD-SPETTATORE`: entra da solo e ricorda il dispositivo.
Per questo conviene che `VIEWER_PASSWORD` sia diversa da `ADMIN_PASSWORD` (altrimenti il link aprirebbe anche l'area admin) e senza caratteri speciali.
Salva il link in un posto privato (gestore di password, note personali), non in chat condivise.

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
- Se perdi la password o un dispositivo, cambia la variabile d'ambiente e riavvia: non e' salvata su disco e tutti i dispositivi vengono disconnessi.
- Il disco `/data` contiene anche `session.key`, il segreto che firma gli accessi: se il disco viene azzerato, dovrai rientrare una volta.
- Se il server e' esposto a internet, tienilo aggiornato (Node 22 LTS) e controlla gli accessi del servizio.
