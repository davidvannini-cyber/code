# SUGGERIMENTIVENDITA — Handoff consolidato (stato al 2026-09-25)

Documento unico di ripresa per **Suggerimenti Vendita**, l'assistente live per le chiamate YesMobility: ascolta il cliente, lo trascrive con Deepgram e mostra il suggerimento più adatto preso dalla libreria script.

Copre la sessione del **21–25 settembre 2026**. Le parti che riguardano l'integrazione con la Lead Rework Console sono documentate anche in `../LEADREWORKS/docs/HANDOFF.md`.

> Nota: `README.md` è stato aggiornato il 2026-09-25; `RIEPILOGO_SISTEMA.md` è ancora in parte superato (vedi §7). In caso di conflitto vale questo file, e sopra a tutto il codice.

---

## 1. Stato attuale in breve

| Area | Stato |
|---|---|
| Menu grafico (`menu/`) | Funzionante. Tre modalità di chiamata + strumenti di gestione |
| Cattura audio dal browser | Funzionante. Selettore dispositivo, spia di livello, AGC + limiter software |
| Trascrizione Deepgram + matching | Funzionante (nova-2, italiano, embedding locale + Claude Haiku nei casi ambigui) |
| Qualità audio in chiamata reale | **Da tarare**: vedi §4 (microfono, AGC, livelli) |
| Integrazione con Lead Rework Console | Implementata (URL scheme, porta 8767, modalità `gestione_lead`). In gran parte **non testata dal vivo** |
| Layout a 3 finestre | Implementato: console 40% · menu 19% · pannello chiamata 40% |
| Sincronizzazione sorgenti ↔ bundle `.app` | **Allineata** al 2026-09-25 (tutti i file confrontati sono identici) |

**Dove vive il progetto**: dal 2026-09-25 in `SALESASSISTANT/SUGGERIMENTIVENDITA/` del repo `davidvannini-cyber/code`. Sul Mac: `/Users/davidvannini_1/Documents/progetti/SUGGERIMENTIVENDITA/`. Il vecchio percorso `…/SuggeritoreVendite/sales-ai-assistant v2/` non è più valido.

---

## 2. Cosa funziona

### Menu principale (`menu/index.html` + `menu/menu_finestra.py`)
Finestra nativa Cocoa (PyObjC + WebKit). Ogni pulsante chiama `Contents/MacOS/avvia --azione <nome>`.

- **Chiamata YesMobility** (`avvia_chiamata_yesmobility`): solo audio e suggerimenti/obiezioni live, **nessun canovaccio**.
- **Chiamata Gestione Lead** (`avvia_chiamata_gestione_lead`, pulsante viola `#btn-gestione-lead`): come sopra più il canovaccio arrivato dalla Lead Rework Console (URL `?avvio=gestione_lead`). Il pulsante **si illumina** quando c'è un lead in attesa.
- **Rinforzo Facile Salire** (`avvia_chiamata_rinforzo`): mostra il canovaccio fisso `schema/canovaccio-rinforzo-facile-salire.json` (URL `?avvio=rinforzo_facile_salire`).
- Strumenti: rivedi frasi raccolte, aggiungi script (anche con testo generato da AI), visualizza libreria, profilo azienda, setup ambiente, API key, test audio, test matching.

### Pannello chiamata (`overlay/index.html`, servito su `http://localhost:8766/`)
- Aperto da `avvia_chiamata_comune()` in **Chrome modalità app** (`open -na "Google Chrome" --args --app=…`), nella colonna destra.
- **Selettore del dispositivo di ingresso**, con l'opzione "Predefinito di sistema (segue il Mac)" come prima voce. La scelta è salvata in `localStorage` (`suggerimentivendita_deviceId_microfono`). Si può cambiare "a caldo" senza chiudere il WebSocket. Se il dispositivo salvato non c'è più, si ripiega sul predefinito.
- **Spia "Segnale in ingresso"** (verde / ambra / rosso), attiva anche in pausa.
- Avvio automatico del microfono se il permesso è già concesso. Se Chrome sospende l'`AudioContext` (policy anti-autoplay), viene mostrato un messaggio e serve un clic.
- Pulsanti **Pausa** e **Termina chiamata** (manda `{"tipo":"termina"}` al server e riporta in primo piano il menu).
- Riquadro verde "Canovaccio chiamata", visibile solo nelle modalità con canovaccio.

### Server (`server/server_suggerimenti.py`)
- HTTP su **8766** (serve l'overlay, senza cache) + WebSocket su **8765**.
- Inoltra a Deepgram il PCM16 mono 16 kHz arrivato dal browser. Ogni secondo stampa su stderr `[livello audio browser] picco ultimo secondo: N/32768` (utile per la diagnosi, vedi §4).
- Resta acceso tra una chiamata e l'altra (`assicura_server_pronto`). Inizio e fine chiamata sono segnalati dal marker `logs/chiamata_attiva`.
- Salva le frasi del cliente in `logs/frasi_raccolte.jsonl` per rivederle dal menu.

### Integrazione con Lead Rework Console
- `suggerimentivendita://` registrato in `Info.plist` (`CFBundleURLTypes`). `avvia` esegue `lsregister -f` in background a ogni avvio, così la registrazione si ripara da sola.
- `tenta_menu_grafico()` usa **`exec`** per lanciare `menu_finestra.py`: Python prende il PID del bundle, così Launch Services riusa l'istanza aperta invece di aprirne una seconda.
- Server "lead in attesa" sulla porta **8767**, interno a `menu_finestra.py` (`avvia_server_lead_in_attesa`, POST/DELETE/OPTIONS). Il polling legge la variabile in memoria ogni 1 s e accende il bagliore.
- Il canovaccio del lead viaggia **solo** via `chrome.storage.local` (estensione in `../LEADREWORKS/browser-extension/`). Il vecchio `lead-corrente.json` è stato **rimosso** dal server.

---

## 3. Layout a 3 finestre

| Finestra | Posizione | Dove si imposta |
|---|---|---|
| Lead Rework Console | x = 0, larghezza 40% | `../LEADREWORKS/apri-console.command`, `background.js` dell'estensione |
| Menu Suggerimenti Vendita | x = 40%, larghezza **19%** | `menu_finestra.py`: `OFFSET_FRAZIONE = 0.40`, `LARGHEZZA_FRAZIONE = 0.19` |
| Pannello chiamata | x = **59%**, larghezza 40% | `avvia` → `avvia_chiamata_comune`: `col_x = screen_w * 59/100` |

La larghezza del menu è passata dal 15% al **19%**. Chi cambia le proporzioni deve aggiornare **tutti e tre** i punti. Il menu non è più "sempre in primo piano" (`NSFloatingWindowLevel` rimosso).

---

## 4. Problemi noti: microfono, AGC, livelli audio

### Catena audio attuale (percorso browser, quello usato in chiamata)
```
telefono → splitter TRRS → mic-in del Mac
  → getUserMedia({ echoCancellation, noiseSuppression, autoGainControl: true }, deviceId opzionale)
  → DynamicsCompressor (threshold −24 dB, knee 12, ratio 12, attack 3 ms, release 250 ms)
  → ScriptProcessor 4096 → spia di livello + ricampionamento lineare a 16 kHz → PCM16
  → WebSocket 8765 → server → Deepgram nova-2 (endpointing 300 ms)
```

### Problemi e punti aperti
1. **Il microfono sbagliato è il rischio n. 1.** Chrome cattura il dispositivo *predefinito* se non se ne sceglie uno. Se lo splitter non è l'ingresso predefinito di macOS, il sistema ascolta il microfono integrato **senza errori visibili**. La spia lo rivela solo se l'operatore la guarda. Con l'opzione "Predefinito di sistema" il comportamento dipende da cosa macOS considera predefinito in quel momento.
2. **AGC su un segnale di linea.** L'uscita del telefono è più "calda" di un microfono. `autoGainControl: true` normalizza, ma può anche "pompare": alza il rumore di fondo nelle pause e abbassa l'inizio delle frasi. Ancora da verificare in chiamata reale se aiuta o peggiora la trascrizione.
3. **`echoCancellation` e `noiseSuppression` attivi.** Il Mac riceve solo la voce del cliente (nessun altoparlante da cancellare), quindi questi filtri servono a poco e possono tagliare parti del parlato. Da provare disattivandoli, un parametro alla volta, confrontando le trascrizioni.
4. **La spia misura il segnale *dopo* AGC e compressore.** Non mostra quindi la saturazione sull'ingresso fisico. Una barra "tranquilla" può nascondere un segnale già distorto a monte. Scala: larghezza = picco × 140%. Soglie: ≥ 0,02 verde, ≥ 0,2 ambra, ≥ 0,55 rosso.
5. **Nessun guadagno digitale nel percorso browser.** `GUADAGNO_AUDIO` (default 1,5×) e `--gain` valgono solo per il percorso da terminale (`audio-capture/cattura_audio_stt.py`). Con un segnale debole, nel browser l'unica leva è il livello di ingresso di macOS (Impostazioni di Sistema → Suono → Ingresso) più l'AGC.
6. **Tecnica.** `createScriptProcessor` è deprecato: andrebbe sostituito da un `AudioWorklet`. Il ricampionamento è lineare senza filtro anti-aliasing: accettabile per il parlato, ma è un possibile fattore di qualità.
7. **Livello del telefono.** Se la trascrizione esce distorta, prima di tutto abbassare il volume media del telefono (Parte 1 del README).

### Come diagnosticare (in ordine)
1. Guardare la spia: resta ferma → dispositivo sbagliato o splitter che non porta segnale.
2. Guardare il log del server (`logs/server.log` o terminale con `avvia_sistema.command`): con `picco ultimo secondo` vicino a 0 non arriva audio utile; vicino a 32768 c'è saturazione.
3. Scegliere esplicitamente lo splitter nel selettore invece di "Predefinito".
4. Regolare il livello di ingresso di macOS, poi il volume del telefono.
5. Solo dopo, provare i vincoli `getUserMedia` (AGC / echo / noise) uno alla volta.

---

## 5. File da sincronizzare sul Mac

Il bundle `Suggerimenti Vendita.app` contiene una **copia completa** del progetto in `Contents/Resources/progetto/`. L'app usa **solo** quella copia; `avvia_sistema.command` usa le cartelle sorgenti. Una modifica a un sorgente non ha effetto sull'app finché non viene copiata nel bundle, o finché non si rigenera l'installer (`Crea Installer.app` risincronizza da sé).

### Mappa sorgente → bundle (tutti identici al 2026-09-25)
| Sorgente (radice) | Copia nel bundle `Contents/Resources/progetto/` |
|---|---|
| `menu/index.html`, `menu/menu_finestra.py`, `menu/ logo-yesmobility.png` | `menu/…` |
| `overlay/index.html`, `overlay/overlay_finestra.py` | `overlay/…` |
| `server/server_suggerimenti.py` | `server/…` |
| `matching-engine/*.py` | `matching-engine/…` |
| `audio-capture/cattura_audio_stt.py` | `audio-capture/…` |
| `schema/*.json` (inclusa `esempio-libreria-script.json`, **attenzione: la libreria cresciuta nell'app verrebbe sovrascritta**) | `schema/…` |

### File che esistono **solo** nel bundle (nessuna copia in radice)
- `Suggerimenti Vendita.app/Contents/MacOS/avvia`: il launcher vero (~1030 righe). `avvia_sistema.command` (315 righe) è una versione più vecchia e ridotta, **non** sincronizzata.
- `Suggerimenti Vendita.app/Contents/Info.plist`: contiene lo schema URL `suggerimentivendita://`.

### File collegati nell'altro progetto (da copiare insieme quando cambiano)
- `../LEADREWORKS/browser-extension/*`: dopo ogni modifica, ricaricare l'estensione in `chrome://extensions`.
- `../LEADREWORKS/apri-console.command`: geometria della colonna sinistra.

### Dopo ogni modifica dentro il bundle, sul Mac
1. Chiudere del tutto l'app (Cmd+Q). Il server resta vivo tra una chiamata e l'altra e **non ricarica** il proprio codice.
2. Rifirmare il bundle: `codesign --force --deep --sign "<certificato Apple Development>" "Suggerimenti Vendita.app"`.
3. Se macOS rifiuta i permessi, `tccutil reset Microphone …` e/o `ripara_permessi.command`.
4. Se `suggerimentivendita://` non apre l'app: `lsregister -f "<path>/Suggerimenti Vendita.app"` (di norma lo fa già `avvia` all'avvio).

---

## 6. Note tecniche

### Porte
| Porta | Chi | Quando è attiva |
|---|---|---|
| 8765 | WebSocket server (audio + suggerimenti) | Dalla prima chiamata della sessione |
| 8766 | HTTP overlay | Dalla prima chiamata della sessione |
| 8767 | `/lead-in-attesa` in `menu_finestra.py` | Finché il menu è aperto |

### Parametro `avvio` nell'URL dell'overlay
- nessuno → Chiamata YesMobility (niente canovaccio).
- `gestione_lead` → il content script dell'estensione consegna (e consuma) il canovaccio da `chrome.storage.local`, poi manda `DELETE` a 8767 per spegnere il bagliore.
- `rinforzo_facile_salire` → il server manda il canovaccio fisso letto da `schema/`.

### Motore di matching
`matching-engine/motore_suggerimenti.py`: embedding `paraphrase-multilingual-MiniLM-L12-v2` (caricamento ~15 s, una volta all'avvio del server), soglie `SOGLIA_MINIMA_SIMILARITA` / `MARGINE_CONFIDENZA_DIRETTA`, tie-break con Claude Haiku solo nei casi ambigui. La generazione dei testi degli script (`genera_testo_script.py`) usa `claude-sonnet-5`.

### Scelte architetturali da non ribaltare
- **Microfono catturato dal browser, non da Python**: l'app non firmata Developer ID non ottiene in modo affidabile il permesso microfono (TCC).
- **Niente file fuori dal bundle** (es. `~/Documents`): macOS li blocca per un'app non firmata (`PermissionError`).
- **Canovaccio solo via estensione**: la via a file sovrascriveva sempre il lead corrente.
- **`exec` nel launcher**: senza di esso ogni `suggerimentivendita://` apre una seconda istanza.

### Limiti noti accettati
- Il server 8765/8766 parte solo alla prima chiamata, quindi il primo avvio di una chiamata attende il caricamento del modello.
- Se il problema della doppia istanza si ripresenta, il piano B è un lock-file (`logs/menu.pid`) controllato dal polling.
- Il layout presuppone il Dock in basso: con il Dock laterale le proporzioni vanno riviste.

---

## 7. TODO

- [ ] **Tarare l'audio in una chiamata reale** seguendo §4 (dispositivo esplicito → livello macOS → AGC / echo / noise uno alla volta). Annotare qui la configurazione che funziona.
- [ ] Valutare di mostrare nella spia anche il livello **prima** del compressore, oppure un avviso "clipping".
- [ ] Valutare un avviso visibile quando è selezionato "Predefinito di sistema" ma il predefinito è il microfono integrato.
- [ ] Migrare `ScriptProcessor` → `AudioWorklet`.
- [ ] Testare dal vivo: bagliore sulla porta 8767 al primo avvio a freddo, istanza singola dopo `exec`, layout 40/19/40.
- [x] ~~Aggiornare `README.md`~~: fatto il 2026-09-25 (flusso via estensione, 3 modalità, porta 8767, struttura attuale, rimossi finestra flottante e `lead-corrente.json`).
- [ ] Aggiornare `RIEPILOGO_SISTEMA.md` (elenco pulsanti del menu non più attuale).
- [x] ~~Allineare `../LEADREWORKS/docs/HANDOFF.md` sul layout 40/19/40~~: fatto il 2026-09-25.
- [x] ~~Pulizia repo~~: fatto il 2026-09-25 (rimossi log, `venv/`, `__pycache__`, file `._*`; aggiunto `.gitignore`).
- [ ] Decidere se eliminare o riallineare `avvia_sistema.command` (vecchio e divergente da `avvia`).

---

## 8. Struttura del progetto

```
SALESASSISTANT/SUGGERIMENTIVENDITA/
├── HANDOFF.md                       # questo file
├── README.md                        # guida installazione/uso (aggiornata al 25/09)
├── RIEPILOGO_SISTEMA.md             # panoramica architettura (in parte superata)
├── .gitignore                       # esclude log, venv, cache Python, .env, file macOS e temporanei
├── Suggerimenti Vendita.app/        # APP REALE, autosufficiente
│   └── Contents/
│       ├── Info.plist               # include CFBundleURLTypes → suggerimentivendita://
│       ├── MacOS/avvia              # launcher principale (azioni, chiamate, geometria, lsregister, exec menu)
│       └── Resources/
│           ├── icona.icns
│           └── progetto/            # copia di tutto il codice sotto + logs/, venv/, .env propri
├── Crea Installer.app/              # genera Suggerimenti Vendita.dmg (risincronizza il bundle)
├── crea_installer.command           # idem, a terminale
├── avvia_sistema.command            # launcher a terminale (vecchio, usa le cartelle sorgenti)
├── ripara_permessi.command          # permessi di esecuzione + rimozione quarantena
├── audio-capture/
│   └── cattura_audio_stt.py         # cattura da device di sistema + Deepgram (solo test da terminale), GUADAGNO_AUDIO
├── matching-engine/
│   ├── motore_suggerimenti.py       # embedding + tie-break Haiku
│   ├── genera_testo_script.py       # testo suggerimento generato da AI (Sonnet)
│   └── gestione_frasi_raccolte.py   # revisione di logs/frasi_raccolte.jsonl
├── server/
│   ├── server_suggerimenti.py       # HTTP 8766 + WS 8765, ponte browser→Deepgram, canovaccio rinforzo
│   └── contesto-sessione-esempio.json
├── overlay/
│   ├── index.html                   # pannello chiamata: mic, selettore, spia, AGC+limiter, canovaccio
│   └── overlay_finestra.py          # finestra flottante PyObjC: la usa solo avvia_sistema.command, non l'app
├── menu/
│   ├── index.html                   # menu a pulsanti, bagliore .lead-in-attesa
│   ├── menu_finestra.py             # finestra Cocoa, server 8767, polling, geometria, URL scheme
│   └── " logo-yesmobility.png"      # attenzione: il nome inizia con uno spazio
└── schema/
    ├── schema-libreria-script.json
    ├── schema-contesto-sessione.json
    ├── esempio-libreria-script.json # libreria script reale (17 voci)
    └── canovaccio-rinforzo-facile-salire.json
```
