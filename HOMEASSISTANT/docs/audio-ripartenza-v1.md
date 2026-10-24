# Home Assistant – Dashboard Audio: stato del progetto (per ripartire in una nuova chat)

## Regole di lavoro con l'utente (David)
- Parla italiano. Istruzioni brevi, precise, passo-passo, con i nomi ESATTI dei menu della sua interfaccia (es. "Editor di configurazione testuale", non "raw").
- Non fare domande ripetute: proponi soluzioni. Se sbagli, ammettilo, non dare la colpa a lui.
- Verifica sempre i file (sintassi YAML valida) prima di inviarli. Invia i file con SendUserFile.
- NESSUN abbonamento né prova gratuita poi a pagamento (no Nabu Casa).
- Password Amazon, codici 2FA e autorizzazioni GitHub li inserisce lui. Non chiederli né riceverli in chat.
- Lui non vede il mio ambiente: dopo ogni modifica spiega cosa incollare e dove.

## Ambiente
- Home Assistant OS 18.3 in VirtualBox su un Mac mini, indirizzo 192.168.1.177 porta 80.
- Accesso remoto: Cloudflare Tunnel su casa.vannini.online (già funzionante).
- Pacchetti attivi: `!include_dir_named packages`. File principale: `packages/audio.yaml` (si modifica da File editor: Cmd+A, Canc, incolla, salva; poi Strumenti per sviluppatori → YAML → Controlla configurazione → Ricarica Script; per le liste di scelta "Elenchi di scelta / Input select", altrimenti riavvio rapido).
- Integrazioni: Alexa Devices ufficiale (entità senza suffisso, es. `media_player.casa`) + Alexa Media Player v5.16.2 via HACS (entità con suffisso `_2`, es. `media_player.casa_2`).
- Card-mod ("Lovelace Card Mod") installato da HACS per la grafica della dashboard.
- L'integrazione Alexa dopo ricariche può mostrare "setup cancelled": soluzione = Riavvia Home Assistant e aspettare 5–10 minuti. L'avviso "Failed to refresh communications settings" su Bagno è innocuo. Evitare di ricaricare solo la voce Alexa Devices.

## Obiettivo
Dashboard "Audio": in alto scelta sorgente (Radio / Spotify), sotto elenco radio (o playlist), poi tasti PLAY e STOP, poi gli altoparlanti Alexa organizzati in gruppi: ogni gruppo/dispositivo ha un tasto (selezionabile) e un cursore volume. Selezionando CASA la radio parte sincronizzata in tutta la casa.

## Gerarchia altoparlanti (associazioni Alexa)
- CASA = CAMERA + STUDIO + BAGNO
- CAMERA = CAMERA Echo, CAMERA Echo Show 5, CAMERA Echo Dot
- STUDIO = Echo pop SCR DX/SX, Echo scrivania DX/SX (Echo Dot), ECHO STUDIO DX/SX
- BAGNO = altoparlante singolo "Bagno"
- Nomi entità: media_player.casa, camera, camera_echo, camera_echo_show_5, camera_echo_dot, studio, echo_pop_scr_dx, echo_pop_scr_sx, echo_scrivania_dx, echo_scrivania_sx, echo_studio_dx, echo_studio_sx, bagno.

## Come funziona (scoperte importanti)
1. `alexa_devices.send_text_command` funziona solo su singoli altoparlanti. Sui gruppi parte un comando per membro, non sincronizzato. I nomi dei gruppi non vengono risolti da Home Assistant.
2. Per i gruppi si usa una **routine Alexa** lanciata da Home Assistant con Alexa Media Player: `media_player.play_media` con `media_content_type: routine` e `media_content_id: <frase vocale della routine>` (NON il nome della routine) su `media_player.echo_scrivania_dx_2`.
3. Routine nell'app Alexa (Altro → Routine): Quando = **Voce** con la frase; Azione = **Personalizzato** (icona tastiera, comando scritto). NON usare "Alexa dice". Il simbolo "%" non è accettato: scrivere "per cento". Il dispositivo è il gruppo giusto (CASA/tutti, studio, camera).
4. Frasi routine esistenti e funzionanti: "avvia radio rds tutti", "avvia radio rds studio", "avvia radio rds camera".
5. Per ogni nuova radio servono 3 routine (tutti / studio / camera). Frasi codificate nello script (mappa `radio_codice`): rds, ventiquattro, deejay, rtl, centouno, centocinque. Esempio: "avvia radio deejay studio".
6. Bagno e singoli altoparlanti usano il comando testuale diretto "metti <radio_voce>" (mappa `radio_voce`).
7. STOP (v11): `media_player.media_stop` su TUTTI gli altoparlanti e gruppi, sia entità `_2` (AMP) che ufficiali, con `continue_on_error`; poi input_select.audio_output = nessuna. Da testare dopo l'installazione: CASA → STOP → STUDIO → STOP → CAMERA → STOP → BAGNO → STOP.
8. Il comando spoken: l'utente ha verificato a voce che "metti Radio 24 in diretta" funziona, mentre da plancia Alexa chiedeva ancora cosa ascoltare.

## Stato dei file (nella cartella di lavoro/scratchpad, anche inviati all'utente)
- `audio_v15.yaml` = versione più recente di `packages/audio.yaml`. Contiene input_select (audio_source, audio_radio con 6 radio, audio_spotify placeholder, audio_output), binary_sensor `audio_sel_<nodo>`, script audio_riproduci / audio_stop / audio_play. NON è ancora confermato che sia installata.
- `audio_dashboard_v5.yaml` = dashboard con card-mod: gruppi (CASA, CAMERA, STUDIO) tutto verde con icona bianca quando attivi; dispositivi singoli ridotti al 60% (zoom) con cornice verde solo sul tasto (non sul volume) quando attivi. Da incollare in Dashboard Audio → matita → ⋮ → Editor di configurazione testuale. Ultimo feedback ricevuto sulla v4: verde ok, icona deve diventare bianca, larghezza dei dispositivi sballata, cornice solo sul tasto: tutto corretto nella v5, ma NON ancora confermato dall'utente.

## Radio (nomi in input_select → frase per il comando diretto)
| Radio | Frase comando diretto (radio_voce) | Stato |
|---|---|---|
| RDS 100% Grandi Successi | "RDS 100% Grandi Successi" | ok, routine esistenti |
| Radio 24 (Il Sole 24 Ore) | "Radio 24 in diretta da TuneIn" (v15; a voce "metti Radio 24 in diretta" funziona) | Alexa da plancia chiedeva ancora la scelta: da ritestare con v15 |
| Radio Deejay | "Radio Deejay su TuneIn" | a voce ok; routine da creare/verificare |
| RTL 102.5 | "RTL 102 punto 5 su TuneIn" | non ancora provata |
| Radio 101 | "Radio 101 su TuneIn" | non ancora provata |
| Radio 105 | "Radio 105 su TuneIn" | non ancora provata |
- Prima di creare le routine, provare ogni frase a voce a un solo altoparlante. "Radio 24" non è risultata trovabile con "su TuneIn" (Alexa chiede podcast/diretta): serve "in diretta".
- Le frasi nelle routine devono essere identiche al comando che funziona a voce.

## Da fare / aperto
1. Confermare che v15 (audio.yaml) e dashboard v5 siano installate e funzionino; verificare STOP su tutti i gruppi.
2. Radio 24: far funzionare da plancia e da routine con la frase giusta ("in diretta" / "in diretta da TuneIn").
3. Creare le routine mancanti (3 per radio) per Radio Deejay, Radio 24, RTL 102.5, Radio 101, Radio 105, usando i comandi che funzionano a voce.
4. Spotify: ramo non testato; per i gruppi servirebbero routine come per la radio. Chiedere i nomi veri delle playlist e aggiungerli ad `audio_spotify`.
5. Verificare sincronizzazione, volume sui gruppi (entità ufficiali) e dispositivi singoli dalla plancia.
6. Opzionale: MFA per utenti HA, URL esterno in Rete, utenti non admin, avvio automatico di VirtualBox.

## Errori già commessi (da non ripetere)
- Indicazioni vaghe sull'interfaccia, file inviati non verificati, scambio tra "azione" e "tab", incolpare l'utente per errori YAML miei (multi-riga `>-` nel template), placeholder lasciato al posto del device_id, dare per scontato che una radio fosse su TuneIn.
