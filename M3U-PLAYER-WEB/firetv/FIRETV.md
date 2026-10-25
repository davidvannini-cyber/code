# TV Vannini per Fire TV

App Android per Fire TV (Stick Lite, Stick, 4K, Cube): legge la **stessa lista del sito** `tv.vannini.online`
(`/playlist.m3u`), quindi le liste si gestiscono sempre da `/admin` e il sito web resta com'e'.
Usa il lettore del televisore (ExoPlayer) senza passare dal browser: leggera e senza i limiti di CORS.

## Telecomando
| Dove | Tasto | Cosa fa |
|---|---|---|
| Lista | su / giu' | si muove tra i canali |
| Lista | OK | guarda il canale |
| Lista | MENU (le tre righe) | filtri (Italiani DTT / Tutti / gruppo) e aggiorna la lista |
| Video | sinistra / destra (anche su / giu') | canale precedente / successivo |
| Video | OK | informazioni sul canale |
| Video | MENU | cambia fonte (stesso canale, altra lista) |
| Video | Play/Pausa | pausa |
| Video | Indietro | torna alla lista |

Sotto il nome di ogni canale italiano compare il programma in onda e quello dopo (guida EPG, vedi `epg/`), se la guida lo conosce.

Se una fonte non parte entro 20 secondi o da' errore, passa da sola alla successiva dello stesso canale e si
ricorda quella che ha funzionato.

## Installare (una volta)
1. Sulla Fire TV: **Impostazioni → La mia Fire TV → Opzioni sviluppatore → Installa app sconosciute**: attiva per **Downloader**
   (se manca "Opzioni sviluppatore": Informazioni → premi OK sul nome del dispositivo 7 volte).
2. Installa **Downloader** dall'Amazon Appstore.
3. In Downloader, nella casella dell'indirizzo scrivi:
   `https://github.com/davidvannini-cyber/code/releases/download/firetv-latest/tv-vannini.apk`
4. Scarica, premi **Installa**, poi **Apri**. L'icona "TV Vannini" compare anche tra le app.

Per aggiornare: stessa procedura, si installa sopra la versione precedente.

## Dalla versione 1.5
- L'app riapre da sola l'**ultimo canale** visto (all'apertura e al risveglio dal riposo). Con **Indietro** torni alla lista e non riparte finche' non scegli un canale.
- **Avvio all'accensione**: quando la Fire TV si riavvia (o togli la corrente) l'app si apre da sola. Si spegne da MENU → «Avvio automatico all'accensione».
  Se non parte, MENU → «Avvio automatico: com'è andato l'ultimo» dice se la Fire TV ha mandato l'avviso di accensione all'app.
  Non parte al risveglio dal riposo (non c'e' riavvio); per quel caso assegna l'app a un tasto del telecomando.

## Costruzione
L'APK lo costruisce GitHub (`.github/workflows/firetv-apk.yml`) a ogni modifica della cartella `firetv/` e lo pubblica nella
release `firetv-latest`. Nel codice: `app/src/main/java/online/vannini/tv/` — `M3u.java` e `Dtt.java` sono la traduzione di
`public/m3u.js` e `public/dtt-it.js` (stesso ordine DTT e stesse fonti alternative), `MainActivity.java` e' l'interfaccia.

La chiave di firma (`app/tv-vannini.keystore`) e' nel repository di proposito: serve solo a far installare ogni nuova versione
sopra la precedente; l'app si installa a mano e non passa da nessuno store.
