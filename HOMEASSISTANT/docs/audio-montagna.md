# Audio Montagna

## Cosa c'è
- Dashboard `audio-montagna` (titolo AUDIO MONTAGNA), stessa grafica di Audio 2.0. Righe: MONTAGNA, VERANDA, SALA, CAMERA, Veranda SX, Pop soggiorno, Soggiorno SX, Soggiorno DX, Dot Montagna, Dot camera.
- Riga in alto: selettore radio, tasto mute/emergenza, elenco radio. Seconda riga: PLAY, LED blocco, STOP.
- Solo radio (scelta di David): `input_select.mnt_sorgente` ha la sola opzione Radio; `input_select.mnt_radio` ha RDS 100% Grandi Successi, Radio 24, Radio Deejay, RTL 102.5, Radio 101, Radio 105. Niente Spotify.
- Script: `mnt_tocca` (mute/ripristino), `mnt_emergenza` (volume 0 su 6 casse e sugli slider, pausa 3 s), `mnt_play`, `mnt_stop`.
- Volumi: vedi `docs/audio-volumi-gruppi.md`.

## Avvio radio
`mnt_play` manda la frase `avvia radio <codice> montagna` (tipo `routine`) tramite `media_player.echo_dot_montagna_2`. Codici: rds, ventiquattro, deejay, rtl, centouno, centocinque.
La routine Alexa deve avere **Per: Casa / Chiunque dice**, altrimenti Alexa Media Player non la fa partire.
Routine creata: «Avvia radio rds montagna» (azione: «metti RDS 100% Grandi Successi sul gruppo MONTAGNA»).
**Da fare/verificare**: le routine per le altre 5 radio (frasi `avvia radio ventiquattro|deejay|rtl|centouno|centocinque montagna`) non risultano create.
STOP: `media_stop` sulle 6 casse e su `media_player.montagna_2`.

## Webapp
`config/www/audio-montagna/` (copiare in `www/config/audio-montagna/` su HA): `index.html` (dashboard `/audio-montagna/montagna` in iframe), `manifest.webmanifest` (verticale), `sw.js`. Le icone sono quelle di casa (`/local/config/audio/`). Blocchi di scorrimento e rotazione come la webapp di casa.
`config/www/audio/` contiene la webapp di casa aggiornata (con gli stessi blocchi).

## Dashboard
I file JSON delle dashboard sono creati dall'interfaccia di HA e non sono nel repo. Dashboard di riserva nascoste (le cancelli tu): audio-2-backup-1024, audio-2-prova, audio-2-backup-2410-1324, audio2-1-backup-2410-1324.

## Non provato
- Comportamento reale delle casse (casa e Montagna) dopo l'ultima modifica.
- Webapp su iPhone (blocco scorrimento/rotazione).
- Le altre 5 radio a Montagna.
- Dot Montagna a volte indica 0,05 / in pausa (forse minimo del dispositivo).
