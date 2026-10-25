# Audio: comportamento dei volumi (casa e Montagna)

Regola finale, uguale a casa e a Montagna:

1. Lo slider più alto (CASA / MONTAGNA) muove **solo** gli slider di gruppo.
2. Gli slider di gruppo (casa: CAMERA, STUDIO, BAGNO, BIG ECHO; Montagna: VERANDA, SALA, CAMERA) comandano le loro casse **chiunque li muova** (tu o lo slider più alto).
3. Lo slider più alto non tocca mai le casse singole né il gruppo Alexa.
4. Un solo comando per ogni cassa, mai comandi doppi.
5. Se muovi una cassa singola, parte solo il suo comando.

## Casa (`config/packages/audio2.yaml`)
- `audio2_invia_volume`: modo `queued`, max 100; salta i comandi superati e le casse non disponibili; `round(2)`.
- `audio2_gruppi`: modo `parallel`, max 30. Membri: casa [camera, studio, bagno, bigecho]; camera [3 casse]; studio [6 casse]; bigecho [camera_echo, echo_studio_dx, echo_studio_sx]. BIG ECHO mosso da CASA (cioè con `parent_id` presente) cambia solo in grafica.
- Backup della versione precedente su HA: `packages/audio2.yaml.bak-251025` (lo cancelli tu).

## Montagna (oggetti creati dall'interfaccia di HA, non nei file del repo)
- Interruttori: `input_boolean.mnt_blocco`, `input_boolean.mnt_prova2` (ON = comportamento finale).
- Slider `input_number.mnt_<k>` (0–1, passo 0,05) e `mnt_prev_<k>` (passo 0,01): tutto, veranda, sala, camera, veranda_sx, pop_soggiorno, soggiorno_sx, soggiorno_dx, dot_montagna, dot_camera.
- Automazioni: `mnt_invia_volume` (come quella di casa), `mnt_gruppi` (con `mnt_prova2` ON: MONTAGNA muove solo VERANDA, SALA, CAMERA; gli altri slider di gruppo comandano le casse), `mnt_radio_parte`.
- Membri: veranda [veranda_sx]; sala [pop_soggiorno, soggiorno_sx, soggiorno_dx]; camera [dot_montagna, dot_camera].
- Casse: veranda_sx → echo_pop_veranda_sx_2; pop_soggiorno → pop_soggiorno_montagna_2; soggiorno_sx → echo_pop_soggiorno_sx_2; soggiorno_dx → echo_pop_soggiorno_dx_2; dot_montagna → echo_dot_montagna_2; dot_camera → echo_dot_camera_montagna_2.
