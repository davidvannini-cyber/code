# Home Assistant Domotica

Configurazione e documentazione della domotica di casa (Home Assistant OS).

- **[CONTEXT.md](CONTEXT.md)**: decisioni prese e istruzioni di lavoro (leggere per primo; è anche il contesto da dare a Claude).
- `config/`: file da copiare in `/config` di Home Assistant.
- `docs/`: note dettagliate per area (audio, caldaie, NeonPlan 3D).

## Stato dei file di configurazione

Presenti: `config/configuration.yaml` (estratto dal riepilogo caldaie), webapp PWA documentata in `config/www/audio/README.md`.

**Da aggiungere** (non erano nei documenti, vanno copiati da Home Assistant):
- `config/packages/audio.yaml`, `config/packages/audio2.yaml`, `config/packages/caldaia_montagna.yaml`
- `config/dashboards/audio_dashboard_v9.yaml`
- `config/www/audio/`: `index.html`, `manifest.webmanifest`, `sw.js`, icone
- `config/www/nextfloor/caldaie5.js`

## Sicurezza

Non committare mai `secrets.yaml`, token, password, Client ID/secret Spotify o chiavi API (vedi `.gitignore`).
