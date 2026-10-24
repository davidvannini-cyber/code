# Home Assistant – Dashboard Audio: stato del progetto (per ripartire in una nuova chat) – aggiornamento 24/10/2026

## Regole di lavoro con l'utente (David)
- Parla italiano. Istruzioni brevi, precise, passo-passo, con i nomi ESATTI dei menu della sua interfaccia (es. "Editor di configurazione testuale", "Repository personalizzati", "Strumenti per sviluppatori → Azioni → Modalità YAML").
- Non fare domande ripetute: proponi soluzioni. Se sbagli, ammettilo, non dare la colpa a lui.
- Verifica sempre i file (sintassi YAML valida) prima di inviarli. Invia i file con SendUserFile. Dì sempre cosa è verificato e cosa no.
- NESSUN abbonamento né prova gratuita poi a pagamento (no Nabu Casa).
- Password Amazon, codici 2FA, Client ID/secret Spotify e autorizzazioni li inserisce lui. Non chiederli né riceverli in chat.
- Lui non vede il mio ambiente: dopo ogni modifica spiega cosa incollare e dove.
- **NON vuole lavoro manuale ripetitivo**: niente routine da creare a mano per ogni playlist, niente nomi di playlist da scrivere o da aggiornare in futuro. L'elenco delle playlist deve leggersi da solo da Spotify.
- Non proporre strade senza averle verificate; se una funzione non è verificata, dirlo e farla provare con un test da "Strumenti per sviluppatori → Azioni".

## Ambiente
- Home Assistant OS 18.3 in VirtualBox su un Mac mini, indirizzo 192.168.1.177 porta 80. Accesso remoto: Cloudflare Tunnel su casa.vannini.online.
- Pacchetti attivi: `!include_dir_named packages`. File principale: `packages/audio.yaml` (File editor: Cmd+A, Canc, incolla, salva; poi Strumenti per sviluppatori → YAML → Controlla configurazione → Ricarica Script).
- `configuration.yaml` ha già `frontend: themes: !include_dir_merge_named themes` (temi attivi).
- Integrazioni Alexa: Alexa Devices ufficiale (entità senza suffisso, es. `media_player.casa`) + Alexa Media Player (AMP) via HACS (entità con suffisso `_2`, es. `media_player.casa_2`).
- Card-mod installato da HACS. HACS è nella versione nuova: non c'è più la scheda "Integrazioni"; si usa ⋮ → **Repository personalizzati**.
- L'integrazione Alexa dopo riavvii può mostrare "setup cancelled": soluzione = aspettare 5–10 minuti senza ricaricarla.

## Gerarchia altoparlanti (Alexa)
- CASA = CAMERA + STUDIO + BAGNO
- CAMERA = CAMERA Echo, CAMERA Echo Show 5, CAMERA Echo Dot
- STUDIO = Echo pop SCR DX/SX, Echo scrivania DX/SX (Echo Dot), ECHO STUDIO DX/SX
- BAGNO = altoparlante singolo "Bagno"
- Entità: casa, camera, camera_echo, camera_echo_show_5, camera_echo_dot, studio, echo_pop_scr_dx, echo_pop_scr_sx, echo_scrivania_dx, echo_scrivania_sx, echo_studio_dx, echo_studio_sx, bagno (ognuna anche con suffisso `_2` per AMP).

## Radio (funzionante)
- Gruppi: routine Alexa lanciate da AMP (`media_player.play_media`, `media_content_type: routine`, `media_content_id: "avvia radio <codice> <tutti|studio|camera>"` su `media_player.echo_scrivania_dx_2`). Singoli e Bagno: `alexa_devices.send_text_command` "metti <radio_voce>".
- Routine esistenti e funzionanti: solo RDS (tutti/studio/camera). Altre radio (Radio 24, Deejay, RTL 102.5, Radio 101, Radio 105) ancora senza routine; frasi da provare a voce prima.
- STOP: `media_player.media_stop` su tutti gli altoparlanti e gruppi (entità `_2` e ufficiali) con `continue_on_error`, poi `input_select.audio_output = nessuna`.

## Dashboard Audio (file `audio_dashboard_v9.yaml`, ultimo inviato, NON confermato dall'utente)
- Generata con uno script Python (parametro `SQ = 96` = lato in px dei tasti quadrati).
- Gruppi CASA/CAMERA/STUDIO: tasti quadrati 96×96, verde pieno con icona bianca quando attivi. BAGNO quadrato con cornice verde. Dispositivi singoli: zoom 0.6, colonna tasto larga come i gruppi (160px a zoom 0.6 = 96px), cornice verde solo sul tasto.
- Slider volume dei gruppi: v7 (`--feature-height`) e v8 (altezza fissa 96px con `!important`, tagliava il cursore) NON andavano; v9 usa `zoom: 0.8` sulla card del volume. Se serve, regolare quel valore.
- Tema: l'utente vuole applicarlo solo alla plancia Audio, senza editor testuale: matita arancione della vista (accanto all'icona altoparlante) → campo **Tema**. Il verde `#2e9e4f` è fisso nel codice, non cambia col tema.
- Ancora presente nella dashboard la sezione Spotify con `input_select.audio_spotify` (segnaposto "la mia musica") e una seconda vista vuota "Vista senza nome" (ignorabile).

## Spotify – cosa è stato scoperto (24/10/2026)
- App Spotify for Developers "Home assistant" già creata dall'utente, Redirect URI `https://my.home-assistant.io/redirect/oauth` corretto. Account **Premium**.
- Integrazione Spotify **ufficiale** installata e configurata: entità `media_player.spotify_david_vannini` (ID da riconfermare in Stati se compare "entità non trovata"), area STUDIO.
- `source_list` contiene: Amazon FireTV Stick Lite, BIG-ECHO, Bagno, CAMERA Echo, CAMERA Echo Dot, CAMERA Echo Show 5, CASA, Camera, Camera montagna, ECHO STUDIO DX, ECHO STUDIO SX, Echo Camera, Echo Dot Camera Montagna, Echo Dot Montagna, Echo pop SCR DX, Echo pop SCR SX, Echo scrivania DX, Echo scrivania SX, Montagna, STUDIO, TUTTI. Da ignorare nella plancia: BIG-ECHO, Montagna, Camera montagna, Echo Dot Montagna, Echo Dot Camera Montagna, TUTTI, FireTV. I nomi dei gruppi per `select_source` sono: `CASA`, `STUDIO`, `Camera`, `Bagno`.
- Limite dell'integrazione ufficiale (letto nel codice): `play_media` e browsing sono abilitati SOLO se c'è già una riproduzione attiva. Da fermo l'entità ha solo `select_source` (`supported_features: 2048`). Con riproduzione attiva `play_media` riparte da capo sul dispositivo attivo (ignora il device richiesto).
- **Prova B riuscita**: AMP `media_player.play_media` con `media_content_type: SPOTIFY` e `media_content_id: "<nome playlist>"` su `media_player.echo_scrivania_dx_2` (singolo) PARTE anche da fermo.
- Sui gruppi (`media_player.casa_2`) lo stesso comando non dà errore ma NON parte niente.
- **Trucco riuscito**: dopo che la playlist suona su un singolo Echo, `media_player.select_source` sull'entità Spotify con `source: CASA` sposta la musica su tutto il gruppo CASA (confermato dall'utente: "si sposta su casa").
- Piano per lo script (non ancora scritto): singolo/Bagno → AMP `SPOTIFY` direttamente sull'entità `_2`; gruppo → AMP `SPOTIFY` su un Echo del gruppo (CASA e STUDIO: `echo_scrivania_dx_2`; CAMERA: `camera_echo_2`), `delay` ~6 s, poi `select_source` sul gruppo. Regolare il delay se serve. Il passaggio ha un secondo di musica su un solo altoparlante prima di passare al gruppo.

## Playlist lette in automatico – in corso
- AMP vuole il NOME della playlist, ma l'utente non vuole scriverli: serve leggerli da Spotify.
- Scelta: **SpotifyPlus** (HACS, repo personalizzato `https://github.com/thlucas1/homeassistantcomponent_spotifyplus`, tipo Integrazione). Scaricata la v1.0.224; HACS mostra "Restart required". NON confermato che l'utente abbia riavviato Home Assistant.
- Prossimi passi: (1) verificare che HA sia riavviato; (2) Impostazioni → Dispositivi e servizi → Aggiungi integrazione → SpotifyPlus, con Client ID/secret dell'app "Home assistant" (li inserisce lui; se chiede un Redirect URI diverso, farlo dire all'utente); (3) in Strumenti per sviluppatori → Azioni (Modalità interfaccia utente) cercare `spotifyplus` e controllare i servizi `get_playlist_favorites`, `get_playlists_for_user`, `player_media_play_context`, `player_transfer_playback` e i loro campi: NON verificato se restituiscono i dati con `response_variable` né se `player_media_play_context` parte da fermo su un dispositivo scelto; (4) in base ai campi, scrivere un'automazione che riempie `input_select.audio_spotify` con `input_select.set_options` leggendo le playlist, e lo script `audio_riproduci` aggiornato; (5) aggiornare la dashboard.
- Alternativa se SpotifyPlus non basta: scheda `spotifyplus_card` (HACS, tipo Dashboard) per scegliere playlist e dispositivo; non verificato che mostri le playlist.
- Scartati: Spotcast (abbandonato, usa cookie), spotify-card (richiede Spotcast), Music Assistant (provider Alexa sperimentale, niente multi-room sincronizzato, richiede Docker/HTTPS/skill).

## File
- `audio_v16.yaml` = `packages/audio.yaml` con ramo Spotify via routine (`avvia spotify <codice> <gruppo>`): SUPERATO dal piano sopra, non installare. Il file `audio.yaml` in uso dell'utente è v15 (con segnaposto "la mia musica").
- `audio_dashboard_v9.yaml` = ultima dashboard (vedi sopra). Generatore Python nello spazio di lavoro (perso se la sessione termina).

## Da fare / aperto
1. Riavviare HA, installare/configurare SpotifyPlus, verificare i suoi servizi (vedi sopra).
2. Scrivere script Spotify (singoli diretti; gruppi: avvio su Echo del gruppo + `select_source`) con playlist lette in automatico.
3. Confermare la dashboard v9 (slider gruppi allineati ai tasti) e che il tema scelto si applichi alla vista.
4. Verificare che v15 sia installata e testare STOP: CASA → STOP → STUDIO → STOP → CAMERA → STOP → BAGNO → STOP.
5. Radio: creare le routine mancanti solo se l'utente le vuole (3 per radio); provare prima le frasi a voce. Radio 24: usare "in diretta".
6. Opzionale: MFA per utenti HA, URL esterno in Rete, utenti non admin, avvio automatico di VirtualBox.

## Errori già commessi (da non ripetere)
- Indicazioni vaghe sull'interfaccia, file inviati non verificati, scambio tra "azione" e "tab", incolpare l'utente per errori YAML miei, placeholder lasciati nei file, dare per scontato che una funzione esistesse senza verificarla (radio su TuneIn; integrazione Spotify già installata; HACS con scheda "Integrazioni"; altezza degli slider imposta con `!important` che tagliava il cursore).
- Proporre soluzioni che richiedono lavoro manuale ripetuto (routine per ogni playlist, nomi da inserire): l'utente le rifiuta.
