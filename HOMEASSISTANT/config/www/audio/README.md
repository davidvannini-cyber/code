# Audio Casa: webapp per Home Assistant

Webapp installabile (PWA) che apre a schermo intero la dashboard audio di Home Assistant:

`https://casa.vannini.online/audio2-1/1`

## Come funziona

La pagina `index.html` incorpora la dashboard in un iframe. Poiché viene servita dallo stesso dominio di Home Assistant (cartella `www`, indirizzo `/local/`), l'incorporamento è consentito senza modificare `configuration.yaml` e il login resta quello già effettuato.

## File

| File | Funzione |
|---|---|
| `index.html` | Pagina principale con la dashboard a schermo intero |
| `manifest.webmanifest` | Nome, colori e icone dell'app |
| `sw.js` | Service worker minimo, necessario per l'installazione |
| `icon-192.png`, `icon-512.png` | Icone dell'app |
| `apple-touch-icon.png` | Icona per la schermata Home di iPhone/iPad |

## Installazione

1. Nel **File editor** di Home Assistant vai nella cartella `www`.
2. Crea una cartella (per esempio `audio`) e caricaci i 6 file.
3. Apri l'indirizzo della pagina dal telefono. In questa installazione è:
   `https://casa.vannini.online/local/config/audio/index.html`
   (se i file stanno in `www/audio/`, l'indirizzo è `/local/audio/index.html`).
4. Su iPhone, in **Safari**: Condividi, poi **Aggiungi a schermata Home**.

## Note

- Se la cartella `www` viene creata ex novo, riavvia Home Assistant una volta.
- La pagina mostra un pulsante di emergenza ("Apri Audio Casa") se la dashboard non compare entro 8 secondi.
- Su iPhone le impostazioni dell'app (barra di stato, schermo intero) vengono memorizzate quando si aggiunge l'icona. Dopo aver modificato `index.html` conviene chiudere e riaprire l'app; se non basta, cancellare l'icona e riaggiungerla.
- Lo zoom è bloccato (`user-scalable=no`), come in una normale app.
- Alternativa senza file: aprire `https://casa.vannini.online/audio2-1/1` in Safari e usare **Aggiungi a schermata Home** direttamente da lì.

## Correzioni fatte durante l'installazione

- Barra di stato di iPhone: da `black-translucent` a `default`, per non coprire l'intestazione.
- Fascia nera in fondo allo schermo: sfondo chiaro (`#fafafa`) al posto del nero.
- Pagina tagliata ai lati: larghezza al 100% al posto di `100vw`, con zoom bloccato.
