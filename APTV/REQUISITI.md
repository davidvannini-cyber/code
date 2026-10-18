# APTV – Requisiti tecnici iniziali

App iOS nativa (SwiftUI, iPhone) per guardare TV e video in streaming HLS da playlist M3U.

> Nota: la mappatura e' stata fatta a mano. REA (`/home/user/code/REA`) e' uno strumento di reverse engineering
> (non e' installato in questa sessione e non e' una skill di Claude); non serve per definire i requisiti di un'app nuova.

## Piattaforma
- iOS 17+, solo iPhone, Swift 5.9, SwiftUI + Observation (`@Observable`).
- Nessuna dipendenza esterna: Foundation, AVFoundation, AVKit.
- Progetto Xcode generato da `project.yml` (XcodeGen); logica in Swift Package `APTVCore`.

## Funzionali (MVP)
| ID | Requisito |
|----|-----------|
| F1 | Inserire l'URL di una playlist M3U/M3U8 e scaricarla |
| F2 | Parsare `#EXTM3U` / `#EXTINF` (attributi `tvg-id`, `tvg-name`, `tvg-logo`, `group-title`) e `#EXTGRP` |
| F3 | Elenco canali con ricerca per nome e filtro per gruppo |
| F4 | Riproduzione a schermo intero di un flusso HLS `.m3u8` con AVPlayer |
| F5 | Stati visibili: caricamento, riproduzione, pausa, errore |
| F6 | URL diretto a un `.m3u8` di stream (master/media playlist) trattato come canale singolo |

## Non funzionali
- Audio in background (`UIBackgroundModes: audio`, categoria `.playback`), AirPlay abilitato.
- Flussi `http://` ammessi (ATS: `NSAllowsArbitraryLoadsForMedia`); da restringere prima del rilascio.
- Parser tollerante: BOM, CRLF, righe vuote, URL non http(s) scartati, attributi con virgole tra virgolette.
- Logica di dominio e parser senza dipendenze UI/AVFoundation, testabili con `swift test`.

## Fuori dall'MVP (backlog)
Picture-in-Picture, preferiti e ultimi guardati (persistenza), EPG/XMLTV, tracce audio e sottotitoli,
autenticazione/header HTTP personalizzati, Chromecast, supporto iPad/tvOS, DRM (FairPlay).

## Rischi / da verificare
- Alcune playlist richiedono `User-Agent` o header specifici (`#EXTVLCOPT`): oggi ignorati.
- Playlist molto grandi (>50k canali): valutare parsing incrementale e lista virtualizzata.
- Contenuti: l'app e' un lettore, l'utente e' responsabile dei diritti sui flussi che carica.
