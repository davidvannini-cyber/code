# APTV – Architettura

Clean architecture a tre strati; le dipendenze puntano verso il dominio.

```
App (SwiftUI, AVFoundation)          APTVCore (solo Foundation)
┌───────────────────────────┐        ┌──────────────────────────────────┐
│ UI: ChannelListView        │        │ Domain:  Channel, Playlist        │
│     PlayerScreen           │        │ Parsing: PlaylistParsing          │
│ ViewModel: ChannelList...  │───────▶│          M3UParser                │
│ Data: URLSessionPlaylist.. │ impl.  │ UseCases: LoadPlaylist            │
│ Playback: AVPlayerEngine   │◀───────│ Playback: PlayerEngine (protocol) │
└───────────────────────────┘ protocol└──────────────────────────────────┘
```

## Flusso
1. `ChannelListViewModel.load()` → `LoadPlaylist(url:)`.
2. `LoadPlaylistUseCase` chiede il testo a `PlaylistTextSource` (impl. `URLSessionPlaylistSource`) e lo passa a `M3UParser`.
3. Se il testo e' un manifest HLS (`#EXT-X-STREAM-INF` / `#EXT-X-TARGETDURATION`) il parser lancia `.hlsManifest` e l'URL diventa un canale singolo.
4. Tap su un canale → `PlayerScreen` → `AVPlayerEngine.load(streamURL)`; `VideoPlayer(player:)` mostra il video e
   `engine.states` (AsyncStream di `PlaybackState`) aggiorna overlay di caricamento/errore.

## Regole
- `APTVCore` non importa SwiftUI ne' AVFoundation.
- Solo `APTVApp` (composition root) conosce le implementazioni concrete.
- `AVPlayerEngine` traduce `timeControlStatus` e `AVPlayerItem.status` in `PlaybackState`; un nuovo motore
  (es. con PiP o altro player) richiede solo di implementare `PlayerEngine`.

## Struttura
```
APTV/
├── Package.swift / project.yml
├── Sources/APTVCore/{Domain,Parsing,Playback,UseCases}
├── Tests/APTVCoreTests/M3UParserTests.swift
└── App/{APTVApp.swift, Data, Playback, UI}
```

## Avvio
`swift test` (da macOS) per il core; `xcodegen generate && open APTV.xcodeproj` per l'app.

## Stato
Scaffold scritto senza toolchain Swift in questa sessione: non ancora compilato ne' testato.
