# Suggerimenti Vendita — Riepilogo del sistema

Assistente AI per chiamate di vendita YesMobility: ascolta la voce del cliente in tempo reale, la trascrive e mostra all'operatore il suggerimento di risposta più adatto, pescato dalla libreria script aziendale tramite matching semantico + AI.

## Come si usa (esperienza utente)

Tutto avviene tramite l'app grafica **"Suggerimenti Vendita.app"** — nessun uso del Terminale richiesto per l'uso quotidiano.

1. Si apre l'app: appare una finestra nativa macOS con un menu a pulsanti.
2. Pulsanti disponibili nel menu:
   - **Chiamata YesMobility** — solo suggerimenti/obiezioni live, nessun canovaccio.
   - **Chiamata Gestione Lead** — suggerimenti live + canovaccio del lead inviato dalla Lead Rework Console (via estensione Chrome). Il pulsante **si illumina** quando c'è un lead in attesa.
   - **Rinforzo Facile Salire** — suggerimenti live + canovaccio fisso (`schema/canovaccio-rinforzo-facile-salire.json`).
   - Strumenti: **Rivedi le frasi raccolte**, **Aggiungi uno script** (anche con testo generato da AI), **Visualizza libreria script**, **Configura profilo azienda**, **Setup ambiente**, **Configura API key**, **Test audio**, **Test matching**.
3. Ogni pulsante di chiamata apre il pannello (`http://localhost:8766/`) in **Chrome modalità app** (finestra senza barra degli indirizzi), posizionato da solo a destra del menu. Layout a tre finestre, tutte alte il 60% dello schermo: Lead Rework Console 35% · menu 15% · pannello chiamata 25%.
4. Il microfono si attiva **in automatico** appena il pannello si apre (se il permesso è già stato concesso). Nel pannello c'è un **selettore del dispositivo di ingresso** (scegliere lo splitter del telefono se non è il predefinito di macOS) e una **spia "Segnale in ingresso"**.
5. Durante la chiamata compaiono in tempo reale le frasi del cliente (l'operatore non viene trascritto: il Mac riceve solo la voce del cliente) e i suggerimenti di risposta; nelle modalità con canovaccio c'è anche il riquadro verde "Guida chiamata".
6. Sono disponibili **Pausa** e **Termina chiamata**: quest'ultimo ferma la chiamata e riporta in primo piano il menu.
7. Nessun popup, dialogo o notifica di sistema interrompe l'operatore durante la chiamata: tutta l'interazione avviene nel pannello.

## Architettura tecnica

```
Browser (mic via getUserMedia)
   │  audio PCM ricampionato a 16kHz, via WebSocket
   ▼
Server Python locale (server_suggerimenti.py: WebSocket 8765 + HTTP 8766)
   │  inoltra l'audio a Deepgram in streaming
   ▼
Deepgram STT (nova-2, italiano, linear16, endpointing 300ms)
   │  trascrizione finale della frase del cliente
   ▼
Motore di matching (motore_suggerimenti.py)
   │  1) embedding semantico locale (sentence-transformers,
   │     paraphrase-multilingual-MiniLM-L12-v2) contro la libreria script
   │  2) se il primo candidato non è nettamente il migliore, tie-break
   │     con Claude Haiku (solo nei casi ambigui, per restare veloce)
   ▼
Suggerimento mostrato nel pannello chiamata (overlay/index.html)
```

**Motivo dell'architettura "cattura audio dal browser"**: l'app nativa, non firmata con un certificato Developer ID a pagamento, non riesce a ottenere in modo affidabile il permesso macOS per il microfono (TCC). Il browser (Chrome), già firmato correttamente da Apple/Google, ottiene il permesso senza problemi. Il microfono viene quindi catturato via `getUserMedia()` nella pagina web, il PCM viene ricampionato lato client e inviato via WebSocket al server Python locale, che fa da ponte verso Deepgram.

### Componenti principali

- **`Suggerimenti Vendita.app`** — bundle macOS autosufficiente (contiene una copia completa del progetto in `Contents/Resources/progetto/`). Firmato con certificato "Apple Development" personale; va rifirmato (`codesign --force --deep --sign ...`) e va resettato il permesso microfono (`tccutil reset Microphone ...`) ogni volta che si modifica un file dentro il bundle.
- **`menu/menu_finestra.py`** — finestra nativa Cocoa (PyObjC + WebKit) che carica `menu/index.html`; i click sui pulsanti richiamano l'eseguibile `Contents/MacOS/avvia --azione <nome>`, che esegue la vera logica (stessi dialoghi osascript di sempre per input testuali/liste). Dopo ogni azione, la finestra del menu torna automaticamente in primo piano. Lo stesso processo ospita il server "lead in attesa" sulla **porta 8767** (`/lead-in-attesa`, attivo finché il menu è aperto), che accende il pulsante "Chiamata Gestione Lead" quando la Lead Rework Console invia un lead; l'app è raggiungibile anche tramite lo schema URL `suggerimentivendita://`.
- **`server/server_suggerimenti.py`** — server HTTP su 8766 (serve `overlay/index.html`) + server WebSocket su 8765 che riceve l'audio dal browser, lo inoltra a Deepgram, riceve le trascrizioni e invoca il motore di matching; termina in modo pulito quando riceve il comando `{"tipo":"termina"}` dalla pagina.
- **`overlay/index.html`** — pannello chiamata mostrato in Chrome (modalità app): cattura il microfono (con selettore dispositivo, spia di livello, AGC + limiter), ricampiona l'audio a 16kHz, mostra suggerimenti e canovaccio, pulsanti Pausa/Termina chiamata.
- **`matching-engine/motore_suggerimenti.py`** — motore di matching a due stadi (embedding locale + AI solo nei casi ambigui), con soglie di confidenza (`SOGLIA_MINIMA_SIMILARITA`, `MARGINE_CONFIDENZA_DIRETTA`) per restare rapido (niente più latenze di 5-20 secondi).
- **`audio-capture/cattura_audio_stt.py`** — modulo di cattura audio da dispositivo di sistema, usato dagli strumenti di test/diagnostica da Terminale (percorso alternativo, non usato nel flusso normale via browser).
- **`schema/`** — schema JSON della libreria script e del contesto di sessione.
- **`server/contesto-sessione-esempio.json`** — esempio di contesto lead (nome, segmento privato/azienda, stato pipeline, prodotto di interesse, budget).

### Porte e integrazione con la Lead Rework Console

| Porta | Chi | Quando è attiva |
|---|---|---|
| 8765 | WebSocket (audio + suggerimenti) | Dalla prima chiamata della sessione |
| 8766 | HTTP, serve il pannello chiamata | Dalla prima chiamata della sessione |
| 8767 | `/lead-in-attesa` (menu) | Finché il menu è aperto |

Il canovaccio del lead viaggia solo tramite l'estensione Chrome di `LEADREWORKS/browser-extension/` (`chrome.storage.local`): la console lo invia, il menu si illumina, e "Chiamata Gestione Lead" lo consegna al pannello (`?avvio=gestione_lead`).

### Libreria script

17 script reali YesMobility (16 attivi, 1 disattivo) coprono: aperture per i vari stati della pipeline (nuovo lead, lead freddo, già visitato da partner, richiamo dopo trattativa persa, ultimo richiamo, richiamo post-sopralluogo), gestione obiezioni (prezzo, fiducia/truffa, tempi di installazione, budget, "devo pensarci"), segnali di interesse, chiusura, scoperta di chi risponde (familiare/caregiver), riferimento per messaggio in segreteria (non attivabile in tempo reale, quindi marcato `attivo: false`).

Segmenti lead: `privato` / `azienda`. Stati pipeline: `nuovo_lead`, `lead_freddo_secondo_preventivo`, `gia_visitato_da_partner`, `trattativa_persa`, `non_valido_ultimo_tentativo`, `sopralluogo_fatto_non_chiuso`, `trattativa`, `richiamo`.
