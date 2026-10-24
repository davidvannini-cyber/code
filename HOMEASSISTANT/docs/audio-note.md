# Home Assistant – Note Audio (aggiornate al 24/10/2026)

## Regole di lavoro
- Non modificare niente finché non scrivi "procedi", salvo istruzione esplicita.
- Risposte brevi, niente teoria né ipotesi se non richieste.
- Nessun lettore multimediale (media player) nelle dashboard.
- Alexa Media Player (HACS): non aggiornare da HACS (fix manifest `aiofiles>=24.1.0,<25`).
- Nessuna cancellazione o rinomina di entità.

## Integrazioni Alexa
- **Alexa Media Player (AMP)**: attiva, serve per radio, Spotify e volume (entità `media_player.<nome>_2`).
- **Alexa Devices ufficiale**: DISATTIVATA il 24/10/2026 alle 06:00 (non cancellata). Da allora i bip di regolazione volume sono finiti e la radio funziona. Va lasciata disattivata.
- Effetto noto: lo stop verso le entità non `_2` in `audio_stop` non risponde più; lo stop alle `_2` resta.

## File e pacchetti
- `/config/packages/audio.yaml`: input_select sorgente/radio/Spotify; script `audio_riproduci`, `audio_stop`, `audio_play`.
  - Radio: routine "avvia radio {codice} tutti" su `media_player.echo_scrivania_dx_2`.
  - Spotify: comando "metti {playlist} su Spotify" su `media_player.casa_2`.
- `/config/packages/audio2.yaml`: 28 input_number (`audio2_<k>` volume, `audio2_prev_<k>` volume salvato), script `audio2_tocca`, automazioni `audio2_invia_volume` (modalità queued), `audio2_gruppi`, `audio2_radio_parte`.
- Backup: `backup_audio_old.yaml.txt`, `backup_dashboard_audio.json.txt` nella cartella config.

## Dashboard
- **Audio** (`dashboard-audio`): grafica originale, funzionamento collegato a Audio 2.0.
- **Audio 2.0** (`audio-2`): 14 slider, nessun media player. Ordine: CASA, CAMERA, STUDIO, BAGNO, 9 casse singole, BIG ECHO (ultimo).
  - Quadrati di gruppo in grigio tenue (#efefef), CASA grigio più scuro (#d4d4d4).
  - Tocco sul nome: salva il volume e porta a 0, oppure ripristina.
- **Proposte audio** (`audio-proposte`): 5 proposte grafiche in attesa di scelta.

## Logica volume
- CASA comanda CAMERA, STUDIO, BAGNO e BIG ECHO.
- CAMERA comanda le 3 casse camera; STUDIO le 6 studio; BIG ECHO comanda Echo camera e Studio DX/SX.
- Toccare uno slider singolo lo stacca dal gruppo.
- Ogni cassa riceve un comando di volume separato (non un unico comando al gruppo `casa_2`).

## Limiti noti
- Echo Show 5 applica il volume con circa 16 secondi di ritardo.
- Le casse inattive non riportano il volume in modo affidabile.
- Gli slider di gruppo possono non coincidere con i membri.
- La nota "Verde = selezionato" nella dashboard Audio ora indica volume > 0.

## Da decidere
- Scegliere una delle 5 proposte grafiche; la scelta va copiata identica su Audio e Audio 2.0.
- Valutare un unico comando di volume al gruppo CASA (`casa_2`) invece di uno per cassa.
