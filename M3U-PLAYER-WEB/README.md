# Player M3U (web)

Tre cose:
1. **Pagina pubblica** (`/`): elenco dei canali della playlist M3U, una riga per canale, con ricerca e filtro per gruppo.
2. **Schermo intero**: un clic su una riga avvia il canale a tutto schermo. I pulsanti ◀ ▶ (o PagSu/PagGiu) cambiano canale, Esc o ✕ tornano all'elenco.
3. **Area admin** (`/admin`): con password, si sostituisce la playlist scrivendo il suo **indirizzo** (il server la scarica da solo), caricando un file o incollando il testo. L'elenco pubblico mostra subito la nuova lista.

## Avvio
Serve Node 18 o successivo. Nessuna installazione di pacchetti.
```
cd M3U-PLAYER-WEB
ADMIN_PASSWORD="scegli-una-password-lunga" npm start
```
Poi apri http://127.0.0.1:3000 (canali) e http://127.0.0.1:3000/admin (amministrazione).
Se non imposti `ADMIN_PASSWORD`, il server ne genera una temporanea e la scrive nel terminale.

| Variabile | Predefinito | Significato |
|-----------|-------------|-------------|
| `PORT` | `3000` | Porta |
| `HOST` | `127.0.0.1` | Indirizzo. `0.0.0.0` apre il server alla rete locale |
| `ADMIN_PASSWORD` | casuale | Password dell'area admin |
| `VIEWER_PASSWORD` | spenta | Se impostata, anche vedere i canali richiede questa password |
| `TRUST_PROXY` | spento | `1` dietro a un proxy HTTPS: cookie `Secure` e IP corretto per il blocco tentativi |
| `ALLOW_PRIVATE_URLS` | spento | `1` permette di scaricare playlist da indirizzi di rete locale (NAS, altro computer di casa); di default sono vietati |
| `DATA_DIR` | `./data` | Dove vive la playlist attuale (`playlist.m3u`) e la precedente (`playlist.prev.m3u`) |

Al primo avvio la playlist e' `sample.m3u` (due flussi HLS di prova). `data/` non finisce nel repository.

## Sicurezza
- **Accesso una volta sola per dispositivo:** dopo aver inserito la password il browser resta autenticato per 400 giorni dall'ultimo uso (si rinnova a ogni apertura della pagina), anche se il server viene riavviato (il cookie e' firmato, non dipende dalla memoria del server).
- **Una sola password:** se `ADMIN_PASSWORD` e `VIEWER_PASSWORD` hanno lo stesso valore, un solo accesso apre sia i canali sia l'area admin.
- **Link con password:** apri `https://tuo-indirizzo/#k=LA-TUA-PASSWORD-SPETTATORE` e il dispositivo entra da solo (poi il link non serve piu'). Quello che segue il `#` non viene mai inviato al server, quindi non compare nei log, e la pagina lo toglie subito dalla barra degli indirizzi. Usa nel link solo `VIEWER_PASSWORD` (con lettere, numeri, `-` e `_`) e non la password admin; chi ha il link ha l'accesso, quindi non condividerlo e non lasciarlo in chat pubbliche.
- Cambiare una password disconnette tutti i dispositivi. "Esci" cancella l'accesso solo su quel browser; se perdi un dispositivo, cambia la password.
- Cookie `HttpOnly` + `SameSite=Strict` (e `Secure` dietro HTTPS), blocco di un minuto dopo 5 tentativi sbagliati.
- La nuova playlist viene controllata prima di sostituire quella attuale (massimo 10 MB, deve avere almeno un canale http/https); la precedente resta come backup.
- Il server parla solo HTTP: la password viaggia in chiaro. Per usarlo fuori dal tuo computer serve HTTPS: vedi `DEPLOY.md`.

## File
- `DEPLOY.md` – come pubblicarlo online · `Dockerfile` per i servizi che usano container
- `server.js` – server (pagina, playlist, login, aggiornamento)
- `public/` – `index.html` + `app.js` (elenco e player), `admin.html` + `admin.js`, `m3u.js` (parser, usato anche dal server), `style.css`
- Test: `npm test` (parser e server)

## Riproduzione
HLS nativo su Safari/iOS, `hls.js` sugli altri browser, `mpegts.js` per i flussi MPEG-TS grezzi (librerie da jsDelivr, serve internet).
Limiti del browser: niente RTMP/UDP e niente DRM; se la pagina e' in https, i flussi `http://` sono bloccati (contenuto misto).
**CORS dei flussi:** su Chrome/Firefox/Edge i video HLS passano da `hls.js`, che scarica i segmenti con richieste del browser: se il server del canale non manda le intestazioni CORS, il canale non parte (e non dipende dalla pagina). Safari riproduce l'HLS in modo nativo e di solito ne apre di piu'. Nelle liste pubbliche molti canali sono anche spenti o bloccati per paese.
I contenuti sono quelli delle liste che carichi, sotto la tua responsabilita'.
