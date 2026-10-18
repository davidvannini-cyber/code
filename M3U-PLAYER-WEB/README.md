# Player M3U (web)

Pagina web che legge una playlist M3U/M3U8 e riproduce i canali nel browser. Nessun server e nessuna installazione.

## Uso
1. Apri `index.html` nel browser (doppio clic) oppure servila: `python3 -m http.server 8000` e vai su http://localhost:8000
2. Carica una playlist: **Apri file**, **Carica URL** o **Incolla il testo**. Il pulsante **Esempio** carica `sample.m3u` (flussi HLS di prova).
3. Cerca o filtra per gruppo, poi clicca un canale. L'ultima playlist viene ricordata dal browser.

## Come funziona
- `m3u.js` – parser della playlist (`#EXTM3U`, `#EXTINF`, `tvg-id`, `tvg-logo`, `group-title`, `#EXTGRP`). Test: `node test-m3u.js`
- `app.js` – elenco, ricerca, gruppi e player
- Player: HLS nativo su Safari/iOS, `hls.js` sugli altri browser, `mpegts.js` per i flussi MPEG-TS grezzi. Le librerie arrivano da jsDelivr (serve internet).

## Limiti del browser (non della pagina)
- **CORS**: molti server non permettono di scaricare la playlist da un'altra pagina. Con "Carica URL" puo' fallire: scarica il file e usa "Apri file".
- **Contenuto misto**: se la pagina e' in https, i flussi `http://` sono bloccati.
- **RTMP e UDP** non esistono nei browser.
- **DRM** (`#KODIPROP`) non e' supportato; gli header come `User-Agent` delle playlist non si possono impostare dal browser.
- La pagina e' solo un lettore: i contenuti sono quelli delle liste che carichi tu, sotto la tua responsabilita'.
