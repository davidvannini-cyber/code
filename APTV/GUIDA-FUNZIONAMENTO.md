# APTV – Guida: come funziona un'app TV con playlist

Guida di comprensione per costruire un'app propria. Parte 1 = come funzionano in generale queste app (standard pubblici).
Parte 2 = checklist da compilare osservando APTV (nulla qui e' stato verificato su APTV).

## 1. Il flusso in una riga
Sorgente (URL / file / login) → scarico → parser → modello (canali, gruppi) → archivio locale → lista/ricerca/preferiti → player.
L'app non contiene contenuti: legge liste che l'utente fornisce.

## 2. Le tre forme in cui arriva una lista
| Forma | Cos'e' |
|-------|--------|
| URL M3U/M3U8 | File di testo con i canali (vedi sotto) |
| File locale | Lo stesso file, importato dal telefono |
| Xtream Codes API | Login con host + utente + password; l'app chiede le categorie e i canali al server (`player_api.php?action=get_live_categories`, `get_live_streams`), e l'EPG a `xmltv.php` |

## 3. Formato M3U esteso
```
#EXTM3U url-tvg="https://esempio/epg.xml.gz"
#EXTINF:-1 tvg-id="rai1.it" tvg-name="Rai 1" tvg-logo="https://.../rai1.png" group-title="Generali",Rai 1
https://esempio/rai1/index.m3u8
```
- `tvg-id` collega il canale all'EPG; `group-title` crea i gruppi; `tvg-logo` e' l'icona.
- Molte liste usano estensioni non standard: `tvg-chno` (numero canale), `catchup*` (riascolto), `#EXTVLCOPT:http-user-agent=...`
  (header richiesti dal flusso), `#KODIPROP` (DRM). Un buon parser le conserva senza rompersi.

## 4. Il flusso video: HLS e il caso "raw TS"
- **HLS (.m3u8)**: master playlist con varianti (`#EXT-X-STREAM-INF`, qualita' diverse) → media playlist con i segmenti.
  Senza `#EXT-X-ENDLIST` e' diretta (live). AVPlayer lo legge nativamente e sceglie la qualita' da solo.
- **Raw MPEG-TS su HTTP** (URL `.ts` o senza estensione): molti flussi IPTV sono cosi' e **AVPlayer non li riproduce**.
  Le app seri ricorrono a un player con demuxer proprio (es. basati su VLC o FFmpeg, con licenza LGPL da rispettare).
  E' la scelta tecnica piu' importante per un'app propria.
- Header particolari (User-Agent, Referer) vanno passati al player, non solo al download della lista.

## 5. EPG (guida programmi)
- File XMLTV (spesso `.xml.gz`, anche decine di MB): `<channel id>` e `<programme start="20261018120000 +0200" stop=... channel=...>`.
- Si collega ai canali tramite `tvg-id`. Va letto in streaming (non tutto in memoria), filtrato su "ora e prossime 24 ore"
  e salvato in un archivio locale.

## 6. Pezzi tipici dell'app
1. Gestione sorgenti (aggiungi, rinomina, aggiorna, elimina; piu' liste)
2. Download con cache e aggiornamento periodico (ETag / If-Modified-Since)
3. Archivio locale (SwiftData o Core Data) per non riparsare ogni volta
4. Lista canali: gruppi, ricerca, preferiti, ultimi guardati, ordinamento
5. EPG: "in onda ora / dopo", griglia oraria
6. Player: fullscreen, cambio canale, stato errore e riprova, audio in background, AirPlay, Picture-in-Picture
7. Apple TV: interfaccia con telecomando e focus (tvOS), diversa dall'iPhone
8. Controllo genitori e blocco gruppi (comune nelle app del genere)

## 7. Come APTV si inserisce qui (progetto `APTV/`)
Gia' fatto: parser M3U, modello canali, lista con gruppi e ricerca, player AVPlayer per HLS (vedi `ARCHITETTURA.md`).
Mancano: archivio locale, EPG, preferiti, Xtream, piu' sorgenti, player per raw TS.

## 8. Checklist da compilare osservando APTV (vuota finche' non la osserviamo)
- [ ] Come si aggiunge una lista (URL, file, Xtream, altro)?
- [ ] Schermate principali e navigazione
- [ ] Quali formati/estensioni M3U accetta
- [ ] EPG: da dove la prende, come la mostra
- [ ] Preferiti, ricerca, ultimi guardati, controllo genitori
- [ ] Come si comporta il player con errori e flussi lenti
- [ ] Cosa cambia tra iPhone e Apple TV
- [ ] Cosa e' a pagamento e cosa gratis

## 9. Cosa NON e' in questa guida
Il codice, le risorse grafiche o i testi di APTV. Si descrivono funzioni e flussi, e tutto il codice dell'app propria si scrive da zero.
