# Suggerimenti Vendita — Riepilogo del sistema

Assistente AI per chiamate di vendita YesMobility: ascolta la voce del cliente in tempo reale, la trascrive e mostra all'operatore il suggerimento di risposta più adatto, pescato dalla libreria script aziendale tramite matching semantico + AI.

## Come si usa (esperienza utente)

Tutto avviene tramite l'app grafica **"Suggerimenti Vendita.app"** — nessun uso del Terminale richiesto per l'uso quotidiano.

1. Si apre l'app: appare una finestra nativa macOS con un menu a pulsanti.
2. Pulsanti disponibili nel menu:
   - **Avvia sistema per una chiamata** — avvia il sistema e apre la pagina del microfono nel browser.
   - **Rivedi le frasi raccolte** — rivede le trascrizioni delle chiamate precedenti.
   - **Aggiungi uno script** — aggiunge una nuova voce alla libreria script.
   - **Visualizza libreria script** — mostra tutti gli script attivi.
   - **Configura profilo azienda** — dati aziendali usati nel contesto.
   - **Setup ambiente** — installa/aggiorna le dipendenze Python.
   - **Configura API key** — imposta le chiavi Deepgram/Anthropic.
   - **Test audio** / **Test matching** — strumenti diagnostici.
3. Cliccando "Avvia sistema per una chiamata", si apre automaticamente una pagina nel browser predefinito (`http://localhost:8766/`) con un grande pulsante microfono centrato.
4. Il microfono si attiva **in automatico** appena la pagina si apre (se il permesso è già stato concesso in precedenza — nessun clic richiesto).
5. Durante la chiamata, sulla stessa pagina compaiono in tempo reale i suggerimenti di risposta man mano che il cliente parla.
6. Sono disponibili un pulsante **Pausa** e un pulsante **Termina chiamata**: quest'ultimo ferma il sistema, chiude (quando il browser lo consente) la scheda e riporta in primo piano la finestra del menu dell'app.
7. Nessun popup, dialogo o notifica di sistema interrompe l'operatore durante la chiamata: tutta l'interazione avviene nella pagina stessa.

## Architettura tecnica

```
Browser (mic via getUserMedia)
   │  audio PCM ricampionato a 16kHz, via WebSocket
   ▼
Server Python locale (server_suggerimenti.py, porta 8766)
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
Suggerimento mostrato nella pagina del browser (overlay/index.html)
```

**Motivo dell'architettura "cattura audio dal browser"**: l'app nativa, non firmata con un certificato Developer ID a pagamento, non riesce a ottenere in modo affidabile il permesso macOS per il microfono (TCC). Il browser (Safari/Chrome), già firmato correttamente da Apple/Google, ottiene il permesso senza problemi. Il microfono viene quindi catturato via `getUserMedia()` nella pagina web, il PCM viene ricampionato lato client e inviato via WebSocket al server Python locale, che fa da ponte verso Deepgram.

### Componenti principali

- **`Suggerimenti Vendita.app`** — bundle macOS autosufficiente (contiene una copia completa del progetto in `Contents/Resources/progetto/`). Firmato con certificato "Apple Development" personale; va rifirmato (`codesign --force --deep --sign ...`) e va resettato il permesso microfono (`tccutil reset Microphone ...`) ogni volta che si modifica un file dentro il bundle.
- **`menu/menu_finestra.py`** — finestra nativa Cocoa (PyObjC + WebKit) che carica `menu/index.html`; i click sui pulsanti richiamano l'eseguibile `Contents/MacOS/avvia --azione <nome>`, che esegue la vera logica (stessi dialoghi osascript di sempre per input testuali/liste). Dopo ogni azione, la finestra del menu torna automaticamente in primo piano.
- **`server/server_suggerimenti.py`** — server HTTP (serve `overlay/index.html`) + server WebSocket che riceve l'audio dal browser, lo inoltra a Deepgram, riceve le trascrizioni e invoca il motore di matching; termina in modo pulito quando riceve il comando `{"tipo":"termina"}` dalla pagina.
- **`overlay/index.html`** — pagina mostrata nel browser durante la chiamata: cattura microfono, ricampiona l'audio a 16kHz, mostra i suggerimenti in tempo reale, pulsanti Pausa/Termina chiamata.
- **`matching-engine/motore_suggerimenti.py`** — motore di matching a due stadi (embedding locale + AI solo nei casi ambigui), con soglie di confidenza (`SOGLIA_MINIMA_SIMILARITA`, `MARGINE_CONFIDENZA_DIRETTA`) per restare rapido (niente più latenze di 5-20 secondi).
- **`audio-capture/cattura_audio_stt.py`** — modulo di cattura audio da dispositivo di sistema, usato dagli strumenti di test/diagnostica da Terminale (percorso alternativo, non usato nel flusso normale via browser).
- **`schema/`** — schema JSON della libreria script e del contesto di sessione.
- **`server/contesto-sessione-esempio.json`** — esempio di contesto lead (nome, segmento privato/azienda, stato pipeline, prodotto di interesse, budget).

### Libreria script

17 script reali YesMobility (16 attivi, 1 disattivo) coprono: aperture per i vari stati della pipeline (nuovo lead, lead freddo, già visitato da partner, richiamo dopo trattativa persa, ultimo richiamo, richiamo post-sopralluogo), gestione obiezioni (prezzo, fiducia/truffa, tempi di installazione, budget, "devo pensarci"), segnali di interesse, chiusura, scoperta di chi risponde (familiare/caregiver), riferimento per messaggio in segreteria (non attivabile in tempo reale, quindi marcato `attivo: false`).

Segmenti lead: `privato` / `azienda`. Stati pipeline: `nuovo_lead`, `lead_freddo_secondo_preventivo`, `gia_visitato_da_partner`, `trattativa_persa`, `non_valido_ultimo_tentativo`, `sopralluogo_fatto_non_chiuso`, `trattativa`, `richiamo`.
