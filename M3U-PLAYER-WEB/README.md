# Player M3U (web)

Tre cose:
1. **Pagina pubblica** (`/`): elenco dei canali della playlist M3U, una riga per canale, con ricerca e filtro per gruppo. La casella **Italiani (ordine DTT)** mostra solo i canali italiani, numerati e ordinati come sul digitale terrestre (Rai 1, Rai 2, Rai 3, Rete 4, Canale 5, Italia 1, La7…); la scelta viene ricordata. Se lo stesso canale compare in piu' versioni, quelle segnate `[Geo-blocked]` (di solito indirizzi spenti) si nascondono quando ce n'e' una senza; un canale che esiste solo con `[Geo-blocked]` resta in elenco. A parita' di canale le versioni ad alta risoluzione vengono prima.
2. **Schermo intero e finestra**: un clic su una riga avvia il canale a tutto schermo. Il pulsante in alto a destra (o il tasto **F**) alterna schermo intero e finestra: uscendo dallo schermo intero (anche con Esc) **il video resta acceso** e riempie la finestra del browser, che puoi ridimensionare o spostare su un altro schermo. Il pulsante con il riquadro piccolo (o il tasto **P**) apre la **finestra flottante** (Picture-in-Picture), sempre in primo piano sopra le altre app. I pulsanti ◀ ▶ o le frecce sinistra/destra (anche PagSu/PagGiu) cambiano canale; la **✕** torna all'elenco.
3. **Area admin** (`/admin`): con password.
   - **Liste (fonti):** scrivi gli indirizzi di piu' playlist (fino a 20, uno per riga). Il server le scarica, le unisce e le riaggiorna da solo ogni 6 ore. Se una lista non risponde usa l'ultima copia salvata. Lo stesso canale in liste diverse compare **una volta sola**: la pagina prova la fonte piu' in alto e, se non parte (errore o nessuna risposta entro 20 secondi), passa **da sola** alla successiva. Ricorda l'ultima fonte che ha funzionato. Il pulsante ↻ nel player prova l'altra fonte a mano.
   - **Una sola playlist:** in alternativa si sostituisce tutto con un indirizzo, un file o il testo incollato (questo disattiva le fonti). L'elenco pubblico mostra subito la nuova lista.

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
| `DATA_DIR` | `./data` | Dove vivono la playlist attuale (`playlist.m3u`), la precedente (`playlist.prev.m3u`), l'elenco delle fonti (`sources.json`) e le loro copie (`src-cache/`) |

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
- `DEPLOY-CLOUDFLARE.md` – pubblicarlo su Cloudflare Workers (cartella `cloudflare/`)
- `DEPLOY.md` – su Render o altri servizi con Docker · `Dockerfile` per i servizi che usano container
- `public/dtt-it.js` – elenco dei canali italiani e numerazione DTT (scritta a mano dalla memoria: da controllare e correggere se serve)
- `server.js` – server (pagina, playlist, login, aggiornamento)
- `public/` – `index.html` + `app.js` (elenco e player), `admin.html` + `admin.js`, `m3u.js` (parser, usato anche dal server), `style.css`
- Test: `npm test` (parser e server)

## Sul telefono: schermo intero
- **Android (Chrome):** il canale parte a tutto schermo da solo.
- **iPhone (Safari):** Safari non concede lo schermo intero alle pagine web. Due strade: il pulsante ⛶ nella barra del player apre il lettore nativo a tutto schermo (si perdono i pulsanti ◀ ▶ finche' non esci); oppure **installa la pagina sulla schermata Home** (Condividi → *Aggiungi alla schermata Home*): si apre come un'app, senza barre del browser, con tutti i comandi.

## Se un canale va a scatti
Nel player premi **I** (o il pulsante *i* nella barra): compare un pannello con motore, qualita' scelta, banda stimata, frame persi e secondi di buffer.
Se i *frame persi* salgono il limite e' il computer (prova l'accelerazione hardware del browser); se il *buffer* scende a 0 e' la rete o la fonte.
Per i flussi HLS la pagina tiene un buffer piu' ampio e resta qualche secondo indietro rispetto alla diretta, per assorbire gli intoppi.
Puoi copiare l'indirizzo mostrato e aprirlo in VLC per vedere se anche li' va a scatti: in quel caso il problema e' la fonte.

## Se un canale non parte
La pagina lo dice sotto il video, tra parentesi quadre il motore usato, e mostra l'indirizzo del flusso (selezionabile):
- *il server rifiuta l'accesso (403)*: blocco geografico o protezione del canale;
- *protetto da DRM*: non riproducibile in un browser (succede ai canali Mediaset);
- *il server non permette a una pagina web di leggere il flusso (CORS)*: prova in Safari o con un lettore come VLC (apri l'indirizzo mostrato);
- *il link di questo canale e' scaduto*: l'indirizzo contiene una scadenza passata (es. Sky/TV8 nelle liste vecchie), la lista va aggiornata;
- *il flusso non esiste piu'* o *non risponde*: canale spento.
Le liste pubbliche contengono molti canali spenti o con restrizioni: e' normale che una parte non parta.

## Riproduzione
HLS nativo su Safari/iOS, `hls.js` sugli altri browser, `dash.js` per il DASH (`.mpd`), `mpegts.js` per i flussi MPEG-TS grezzi (librerie da jsDelivr, serve internet). Se l'indirizzo non ha un'estensione riconoscibile (per esempio il "relinker" della Rai) la pagina guarda cosa risponde il server e sceglie il motore. Un link con scadenza (`exp=`) gia' scaduto viene segnalato come tale.
Limiti del browser: niente RTMP/UDP e niente DRM; se la pagina e' in https, i flussi `http://` sono bloccati (contenuto misto).
**CORS dei flussi:** su Chrome/Firefox/Edge i video HLS passano da `hls.js`, che scarica i segmenti con richieste del browser: se il server del canale non manda le intestazioni CORS, il canale non parte (e non dipende dalla pagina). Safari riproduce l'HLS in modo nativo e di solito ne apre di piu'. Nelle liste pubbliche molti canali sono anche spenti o bloccati per paese.
I contenuti sono quelli delle liste che carichi, sotto la tua responsabilita'.

## Lista dei canali aggiunti a mano (`extra.m3u`)
`M3U-PLAYER-WEB/extra.m3u` contiene canali che le altre liste non hanno (Rai 3 Toscana al numero 3, 50 Canale al 18).
Si usa come una fonte qualsiasi: in `/admin`, nel riquadro "Liste (fonti)", va messa **per prima**:
`https://raw.githubusercontent.com/davidvannini-cyber/code/main/M3U-PLAYER-WEB/extra.m3u`
Rai 3 Toscana ha lo stesso `tvg-id` di Rai 3: finisce nello stesso canale come prima fonte, e Rai 3 normale resta come alternativa.
Il numero si decide con `tvg-chno` (non serve toccare il codice). Per aggiungere un canale basta una riga `#EXTINF` e l'indirizzo.

## Icona sul Desktop del Mac che apre Safari (`mac/crea-icona-tv.sh`)
Per chi ha un altro browser predefinito: `bash M3U-PLAYER-WEB/mac/crea-icona-tv.sh` crea sul Desktop l'app "TV Vannini",
che apre `tv.vannini.online` con Safari (barra degli strumenti visibile: su macOS 12 Safari non permette di nasconderla). Su macOS 14 (Sonoma) o piu' recente
e' meglio Safari → File → Aggiungi al Dock, che apre il sito in una finestra senza barra.

## Guida programmi leggera (EPG)
Sotto il nome di ogni canale italiano compare "adesso in onda" e "poi": nella pagina, nel titolo del lettore e nell'app Fire TV.
- **Come funziona:** ogni due ore un lavoro su GitHub (`.github/workflows/epg.yml`, script `epg/build-epg.mjs`) scarica guide XMLTV
  pubbliche (epgshare01 IT1, poi open-epg italy3 per i buchi), tiene solo il programma in corso e i successivi 8 ore, e pubblica un file
  da poche decine di KB (`epg.json`) nella release `epg-latest`. Il Worker (`/api/epg`) lo passa com'e' e lo tiene 20 minuti in copia.
- **Pesantezza:** pagina e app scaricano solo quel file (non la guida intera), una volta ogni 10 minuti. Nessun calcolo pesante.
- **Collegamento canali-programmi:** per chiave del nome e del `tvg-id` (`DTT.key` / `DTT.idKey` in `dtt-it.js`, `Dtt.java` per l'app).
  Un canale senza guida (es. 50 Canale) resta senza riga. Per cambiare le fonti: elenco `SOURCES` in `epg/build-epg.mjs`.
- Prova: `node test-epg.mjs`. Aggiornamento a mano: scheda "Actions" di GitHub → "Guida programmi (EPG)" → Run workflow.

## Nascondere canali dall'admin
Nella pagina `/admin`, sezione "Canali visibili": elenco di tutti i canali (italiani prima, nell'ordine del digitale terrestre) con una
spunta per ciascuno. Togliendo la spunta il canale sparisce dalla pagina e dall'app Fire TV (l'app lo applica all'avvio e ogni 10 minuti).
La scelta e' per canale (identificativo `DTT.identity`), quindi vale anche se il canale arriva da piu' liste. Si salva in `/api/hidden`
(KV `hidden` sul Worker, `hidden.json` in `DATA_DIR` sul server Node). Lettura pubblica, modifica solo da admin.

## Piu' liste insieme: sempre come indirizzi
Le fonti ("Liste (fonti)") sono indirizzi: ogni lista si unisce alle altre. Il caricamento di un file (o l'incolla del testo) sostituisce
tutto e disattiva le fonti. Per usare un file insieme agli indirizzi basta metterlo nel repository e usare il suo indirizzo `raw.githubusercontent.com`
(come `extra.m3u`). Esempio: Free-TV Italia, `https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_italy.m3u8`.

## Modo auto (`/auto`)
`https://tv.vannini.online/auto` e' la stessa pagina e le stesse liste, ma con i comandi pensati per manopola e tasti dell'auto (CarPlay/APTV):
- in elenco, **una sola riga alla volta e' raggiungibile con Tab/manopola** (le altre hanno `tabindex=-1`), cosi' girando la manopola si entra nella pagina e si passa oltre;
- **su/giu' e Tab/Maiusc+Tab scorrono i canali**, in fondo si torna in cima (non si esce mai dalla pagina), invio apre il canale;
- nel video: **su/destra/Tab = canale successivo, giu'/sinistra/Maiusc+Tab = precedente**, invio mostra i pulsanti;
- l'apertura del video aggiunge un passo alla cronologia: **Indietro (anche quello dell'auto) chiude il video e torna all'elenco**, con il canale guardato selezionato;
- righe piu' grandi e selezione ben visibile (`html.auto` in `style.css`).
Tutto il codice e' sotto `if (AUTO)` in `public/app.js` (`AUTO` = indirizzo `/auto` o `?auto=1`): sulla pagina normale non cambia nulla.
