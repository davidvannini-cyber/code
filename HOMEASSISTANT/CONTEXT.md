# Home Assistant Domotica — Decisioni prese

Solo le decisioni in vigore, aggiornate al 24/10/2026. Nessuno storico.

---

## 1. Regole di lavoro (istruzioni per Claude)

- Rispondere in italiano, con istruzioni brevi, precise, passo-passo e nomi esatti dei menu dell'interfaccia.
- Non modificare nulla finché David non scrive "procedi", salvo istruzione esplicita.
- Niente teoria né ipotesi se non richieste; niente domande ripetute: proporre soluzioni.
- Verificare la sintassi YAML prima di inviare un file e dire cosa è verificato e cosa no. Una funzione non verificata si fa provare da Strumenti per sviluppatori → Azioni.
- Dopo ogni modifica spiegare cosa incollare e dove.
- Nessun abbonamento né prova gratuita (no Nabu Casa).
- Password, 2FA, Client ID/secret e autorizzazioni li inserisce solo David; mai in chat né nella repo.
- Nessun lavoro manuale ripetitivo (niente routine o nomi playlist scritti a mano).
- Nessun media player nelle dashboard audio.
- Nessuna cancellazione o rinomina di entità.
- Alexa Media Player: non aggiornare da HACS.

## 2. Ambiente

- Home Assistant OS in VirtualBox su Mac mini (`192.168.1.177:80`), accesso remoto con Cloudflare Tunnel su `casa.vannini.online`.
- Configurazione a pacchetti: `packages: !include_dir_named packages`; temi: `themes: !include_dir_merge_named themes`.
- HACS: repository aggiunti da ⋮ → Repository personalizzati.
- Dopo ogni modifica: Strumenti per sviluppatori → YAML → Controlla configurazione, poi ricarica o riavvia.

## 3. Audio Alexa

### Struttura altoparlanti
- CASA = CAMERA + STUDIO + BAGNO
- CAMERA = CAMERA Echo, CAMERA Echo Show 5, CAMERA Echo Dot
- STUDIO = Echo pop SCR DX/SX, Echo scrivania DX/SX, ECHO STUDIO DX/SX
- BAGNO = singolo
- BIG ECHO = Echo camera + Studio DX/SX (ultimo in dashboard)

### Integrazioni
- **Alexa Media Player** è l'integrazione usata (entità `media_player.<nome>_2`) per radio, Spotify e volume.
- **Alexa Devices ufficiale** resta disattivata.

### Radio
- Gruppi: routine Alexa lanciata da AMP (`media_content_type: routine`, frase `avvia radio <codice> <tutti|studio|camera>`) su `media_player.echo_scrivania_dx_2`.
- Singoli e Bagno: comando diretto "metti <radio_voce>".
- Routine Alexa: Quando = Voce, Azione = Personalizzato; mai "Alexa dice"; scrivere "per cento" al posto di "%".
- Codici radio: rds, ventiquattro, deejay, rtl, centouno, centocinque. Radio 24 si chiama con "in diretta".
- Routine per le nuove radio (3 per radio) solo se David le chiede.

### STOP
`media_player.media_stop` su tutti gli altoparlanti e gruppi con `continue_on_error`, poi `input_select.audio_output = nessuna`.

### Spotify
- Avvio da fermo: AMP `play_media` con `media_content_type: SPOTIFY` e nome playlist.
  - Singolo/Bagno: direttamente sull'entità `_2`.
  - Gruppo: avvio su un Echo del gruppo (CASA e STUDIO: `echo_scrivania_dx_2`; CAMERA: `camera_echo_2`), `delay` ~6 s, poi `media_player.select_source` sull'entità Spotify con `CASA`, `STUDIO`, `Camera` o `Bagno`.
- Playlist lette automaticamente da Spotify con **SpotifyPlus** (HACS) e caricate in `input_select.audio_spotify` con `input_select.set_options`.
- Sorgenti Spotify da ignorare nella plancia: BIG-ECHO, Montagna, Camera montagna, Echo Dot Montagna, Echo Dot Camera Montagna, TUTTI, FireTV.

### Volume
- CASA comanda CAMERA, STUDIO, BAGNO e BIG ECHO; CAMERA le 3 casse camera; STUDIO le 6 studio; BIG ECHO comanda Echo camera e Studio DX/SX.
- **Regola (24-25 ott)**: lo slider più alto (CASA / MONTAGNA) muove SOLO gli slider di gruppo; gli slider di gruppo comandano le loro casse CHIUNQUE li muova; lo slider più alto non tocca mai le casse singole né il gruppo Alexa; un solo comando per cassa. BIG ECHO mosso da CASA si sposta solo in grafica (le sue casse sono già in CAMERA e STUDIO).
- Invio volume: automazione `queued`, max 100, salta i comandi superati, salta le casse non disponibili, valore sempre `round(2)` (evita residui tipo 1.38e-17).
- Dettagli: `docs/audio-volumi-gruppi.md`.
- Tocco sul nome: salva il volume e porta a 0, oppure ripristina.

### File
- `packages/audio.yaml`: input_select (`audio_source`, `audio_radio`, `audio_spotify`, `audio_output`), binary_sensor `audio_sel_<nodo>`, script `audio_riproduci`, `audio_stop`, `audio_play`.
- `packages/audio2.yaml`: 28 `input_number` (`audio2_<k>`, `audio2_prev_<k>`), script `audio2_tocca`, automazioni `audio2_invia_volume` (queued), `audio2_gruppi`, `audio2_radio_parte`.

### Dashboard
- **Audio** (`dashboard-audio`): grafica originale, collegata ad Audio 2.0.
- **Audio 2.0** (`audio-2`): 14 slider. Ordine: CASA, CAMERA, STUDIO, BAGNO, 9 casse singole, BIG ECHO. Quadrati di gruppo `#efefef`, CASA `#d4d4d4`.
- **Dashboard v9** (`audio_dashboard_v9.yaml`): tasti gruppo 96×96, verde `#2e9e4f` con icona bianca quando attivi; singoli con zoom 0.6 e cornice verde solo sul tasto; slider gruppi con `zoom: 0.8`.
- "Verde" = volume > 0.
- Tema applicato solo alla plancia dal campo **Tema** della vista.
- La scelta grafica fra le 5 proposte (`audio-proposte`) va copiata identica su Audio e Audio 2.0.

## 4. Webapp "Audio Casa" (PWA)

- Apre a schermo intero `https://casa.vannini.online/audio2-1/1` in un iframe, servita dal dominio di HA (`www/audio/`, indirizzo `/local/audio/index.html`).
- File: `index.html`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`.
- Barra di stato iPhone `default`, sfondo `#fafafa`, larghezza 100%, zoom bloccato (`user-scalable=no`).
- Pulsante di emergenza "Apri Audio Casa" dopo 8 s senza dashboard.
- Installazione su iPhone: Safari → Condividi → Aggiungi a schermata Home.

### Blocchi della webapp (casa e Montagna)
- Scorrimento verticale bloccato (`overflow hidden`, iframe `scrolling="no"`, script `schermata-ferma`) e rotazione bloccata con trucco CSS (script `rotazione-verticale`; iOS non permette il blocco vero da webapp).
- `sw.js` ricarica sempre la pagina dell'app dal server (HA la tiene in cache 31 giorni).
- Icona iPhone: se si aggiunge la dashboard invece della webapp, si apre la dashboard diretta: aggiungere da `/local/config/audio/index.html`.

## 4b. Audio Montagna (dashboard + webapp)
- Solo radio (niente Spotify). Il gruppo Alexa MONTAGNA serve solo per avviare la radio, tramite routine «avvia radio <codice> montagna».
- Dashboard `audio-montagna` (AUDIO MONTAGNA), webapp `www/audio-montagna/` (`/local/config/audio-montagna/index.html`).
- Dettagli, oggetti creati e cose non provate: `docs/audio-montagna.md`.

## 5. Caldaie Tuya (Montagna, Pepi, Vapi)

### Architettura
- Termostati nuovi con **Template Climate** (HACS, `jcwillox/hass-template-climate`): solo `off` e `heat`, leggono l'originale e passano solo la temperatura.
- ON/OFF tramite **scene Tuya** "Tocca per eseguire" (non cambiano la temperatura).
- Modalità tramite **selettori Mode** (helper Template → Select).
- Non usare i tasti dei modi del termostato Tuya originale.
- Stato `heat` del termostato nuovo = caldaia accesa (non "sta scaldando").

### Entità
| | Montagna | Pepi | Vapi |
|---|---|---|---|
| Originale Tuya | `climate.montagna_caldaia` | `climate.caldaia_pepi` | `climate.caldaia_vapi` |
| Termostato nuovo | `climate.caldaia_montagna` | `climate.caldaia_pepi_termostato` | `climate.caldaia_vapi_termostato` |
| Selettore | `select.montagna_mode` | `select.pepi_mode` | `select.vapi_mode` |
| Scena ON | `scene.montagna_caldaia_montagna_on` | `scene.montagna_caldaia_pepi_on` | `scene.montagna_caldaia_vapi_on` |
| Scena OFF | `scene.montagna_caldaia_montagna_off` | `scene.montagna_caldaia_pepi_off` | `scene.montagna_caldaia_vapi_off` |
| Scena Manuale | — | `scene.pepi_manuale` | `scene.vapi_manuale` |

Limiti temperatura: Montagna 5–35 °C, Pepi e Vapi 5–30 °C, passo 0,5.

### Configurazione
- Tre piattaforme `climate_template` in `configuration.yaml`; `set_hvac_mode` con `off` avvia la scena OFF, altrimenti la scena ON; `set_temperature` passa solo la temperatura all'originale.
- Condizionatore Comfee con SmartIR (`device_code: 1125`, `remote.universal_remote`).
- `packages/caldaia_montagna.yaml` resta vuoto.

### Mappatura modi
- **Montagna:** Manual = `cool`, Program = `heat`, Temporary Program = `fan_only` (selettore con `climate.set_hvac_mode`).
- **Pepi/Vapi:** Manuale = scena `*_manuale`; Eco e Program = `climate.set_preset_mode` (`eco`, `program`).

### Scheda plancia
`vertical-stack` per caldaia: `thermostat` sul termostato nuovo, `mushroom-select-card` sul selettore, due `button` ON/OFF che avviano le scene (card-mod: altezza 130px, ON arancio chiaro se `heat`, OFF `#e6e6e6` se `off`), `grid_options: columns: 8`.

### NextFloor
- Plugin `www/nextfloor/caldaie5.js` (da NextFloor → Extensions → Plugins, `/local/nextfloor/caldaie5.js`): tre schede (Casa nostra, Pepi, Vapi) con −, +, ON, OFF.
- Pannello stanza SALA: stellina ☆ sul termostato nuovo "Caldaia Montagna".
- Preferiti: "Caldaia montagna ON" e "Caldaia montagna OFF".
- Interruttori "Corrente Pepi" e "Corrente Vapi" piazzati con **Place**.
- Vista di partenza salvata con **Remember the current 3D view as the start**.
- Se un file `.js` cambia e il browser mostra il vecchio, dargli un nome nuovo.

## 6. NeonPlan 3D

- Vista iniziale casa intera: scheda 3D → Tutti i piani → inquadratura → puntina rossa 📌 → Ctrl+Shift+R.
- Alternativa per la sola card: `start_view: { theta, phi, radius }` nello YAML di `custom:neonplan3d-card`.
- Echo posizionati da Editor → Dispositivi → **Posiziona**, con **Mostra come mobile** per il modello; l'Echo deve appartenere all'Area della stanza.
- Selettore uscita audio: pulsante proprio che chiama `script.audio_seleziona` con `{"uscita": "media_player.camera_echo_show_5_2"}`.
- Slider volume: tile con funzione "Slider del volume" o popup Browser Mod da pulsante proprio.

## 7. Repo GitHub

```
.
├── CONTEXT.md
├── README.md
├── config/
│   ├── configuration.yaml
│   ├── packages/ (audio.yaml, audio2.yaml, caldaia_montagna.yaml)
│   ├── dashboards/ (audio_dashboard_v9.yaml)
│   └── www/ (audio/, nextfloor/caldaie5.js)
├── docs/
└── .gitignore   # secrets.yaml, .storage/, *.db, *.log, token
```

Mai committare `secrets.yaml`, token, password, Client ID/secret o chiavi API.
