# LEADREWORKS — Handoff consolidato (stato al 2026-09-25)

Documento unico di ripresa per la **YesMobility Lead Rework Console**.
Consolida le due sessioni di sviluppo:

- **16–17 settembre 2026 (con coda al 18)**: sviluppo da zero della console, estensione browser CRM, integrazione con Suggerimenti Vendita.
- **24 settembre 2026**: fix dei bug di compliance negli script generati e riorganizzazione della libreria script.

La cronologia dettagliata della prima sessione (sezioni 9bis…9terdecies del vecchio handoff) resta consultabile nella storia git di questo file.

---

## 1. Stato attuale in breve

| Area | Stato |
|---|---|
| Console (`src/lead-rework-console.html`) | Funzionante end-to-end in locale con API key Anthropic (confermato dall'utente) |
| Regole di compliance | 6 regole **hardcoded** in `HARD_COMPLIANCE_RULES`, sempre attive a prescindere dal profilo salvato |
| Libreria script | 26 script nell'HTML (n. 1–21, 23–27; il n. 22 è stato rimosso) |
| Estensione CRM → console | Testata dal vivo con un lead reale: funziona |
| Console → Suggerimenti Vendita | Implementata (URL scheme, bagliore "lead in attesa", due modalità di chiamata); in gran parte **non testata dal vivo** |
| Layout a 3 finestre (40% / 15% / 40%) | Implementato e provato una volta dal vivo, proporzioni corrette su richiesta utente |
| Claude Artifact reale su claude.ai | **Mai testato**: è il rischio tecnico principale |
| `src/data/script-library.json` | **Disallineato** rispetto all'HTML (vedi §4, TODO) |

**Il progetto dal 2026-09-25 vive in** `SALESASSISTANT/LEADREWORKS/` del repo `davidvannini-cyber/code`, accanto a `SALESASSISTANT/SUGGERIMENTIVENDITA/`. Sul Mac dell'utente il percorso di riferimento resta `/Users/davidvannini_1/Documents/progetti/LEADREWORKS/`. Le vecchie "due copie da sincronizzare a mano" (`/root/progetti/…` e `/progetti/…`) erano specifiche dell'ambiente della prima sessione e non valgono più: la fonte di verità è il repo.

---

## 2. Cos'è il progetto

Webapp per un singolo operatore (David, YesMobility) che genera script operativi **telefono / WhatsApp / email** per il rework dei lead, in base allo stato del lead nel funnel. È un **unico file HTML self-contained** (CSS, JS, dati e logo inline, nessuna build), pensato per essere pubblicato come Claude Artifact e usato nel frattempo in locale da `file://`.

Specifica funzionale originale: `docs/YesMobility-LeadRework-Specifica.md`.

### Contesto di business da non dimenticare
- YesMobility è **puramente commerciale**: non fa sopralluoghi né installazioni, si appoggia a un installatore partner locale (default nel profilo: Facile Salire).
- YesMobility **non ha mai contattato prima** nessun lead: gli stati "trattativa persa" / "ultimo richiamo" sono fasi del CRM del partner, non telefonate YesMobility già fatte.
- L'obiettivo di ogni script è **chiudere la trattativa**, non fissare un sopralluogo.
- Il nome dell'installatore partner **non va mai rivelato** al cliente.

---

## 3. Cosa funziona

### Tab "Lead" (ex "Nuovo Lead"): flusso in 5 sezioni
1. **Importa i dati del lead**: nascosta di default, si apre dal sottomenu "Lead" in sidebar → "Importa dati" (`state.showImportPanel`). Dropzone multi-file per screenshot/PDF/CSV/Excel. I PDF diventano immagini JPEG pagina per pagina (max 5). C'è anche il pulsante manuale "Incolla dati dal CRM (dagli appunti)".
2. **Dati lead**: nome, prodotto, zona, prezzo, motivazione, note, storico, appuntamento. I campi mancanti hanno sfondo ambrato. "Note" e "Storico" si auto-espandono (`.autogrow` + `autoGrowTextarea`).
3. **Stato del lead e canali**: stato + obiezioni trasversali suggeriti dall'AI (sempre editabili). Pulsante dedicato "Suggerisci stato, obiezioni e strategia con AI" (`runAiAnalysis()`), indipendente dai file caricati.
4. **Analisi e strategia**: testo AI, **max 100 parole**, passato anche come contesto alla generazione.
5. **Generazione script**: telefono / WhatsApp / email secondo stato + canali attivi + obiezioni, editabili, con "rigenera" per singolo canale.

### Tab "Storico Lead"
Elenco filtrabile, apertura in sola lettura (con analisi/strategia salvata), duplicazione, eliminazione, **stampa** (`@media print`, forzata su sfondo bianco), **"Invia a Suggerimenti Vendita"** anche da un lead storico.

### Tab "Profilo Azienda"
Dati aziendali editabili + card **"Impostazioni AI"** (API key, modello default `claude-sonnet-5`, Workspace ID opzionale, "Testa connessione", export/import JSON delle impostazioni).

### Integrazioni
- **Estensione browser** (`browser-extension/`, Manifest V3): pulsante galleggiante sulle pagine lead di `app.facilesalire.it`, legge il blocco Inertia `<script type="application/json" data-page="app">` e invia i dati alla console. Testata dal vivo.
- **Suggerimenti Vendita**: invio del canovaccio via `chrome.storage.local`, apertura dell'app con `suggerimentivendita://`, bagliore sul pulsante "Chiamata Gestione Lead" tramite server locale sulla porta **8767** interno al menu. Il canovaccio viene consegnato **solo** con `?avvio=gestione_lead`.
- **Avvio**: `apri-console.command` apre Chrome in modalità app nella colonna sinistra (40% dello schermo).

### Grafica
Tema scuro allineato a Suggerimenti Vendita (sfondo `#14171f`, primario teal `#14b8a6`), font Manrope / IBM Plex, icone SVG inline (`ICON_PATHS` + `icon()`), logo base64 (`LOGO_YESMOBILITY_B64`), footer "© Designed and krafted by Momandis David Vannini".

---

## 4. Sessione 24 settembre: compliance e riorganizzazione script

Il problema di fondo: l'AI generava script che (a) inventavano un contatto YesMobility precedente, (b) attribuivano al cliente frasi o stati d'animo inventati, (c) rivelavano informazioni interne ("per suo suocero"), (d) chiudevano sul sopralluogo invece che sulla vendita, (e) nominavano il partner locale.

### Fix di compliance
- `HARD_COMPLIANCE_RULES` (subito prima di `SCRIPT_LIBRARY`) ora contiene **6 regole**:
  1. nessun contatto YesMobility precedente;
  2. nessun dettaglio o frase del cliente inventati;
  3. nessuna informazione interna rivelata;
  4. obiettivo = chiusura, non sopralluogo;
  5. **nuova**: mai rivelare il nome dell'installatore/partner locale, in nessun canale e stato, anche se il profilo o uno script di riferimento lo nominano;
  6. autocontrollo riga per riga prima di rispondere.
- `buildSystemPrompt()` inietta le regole in cima con priorità esplicita su profilo e libreria, e chiude con "ULTIMO CONTROLLO… tutte e 6 le REGOLE ASSOLUTE" (effetto recency).
- Nel testo degli script e del profilo di default, "Facile Salire" è stato sostituito con **"il nostro installatore partner"**. Il nome resta solo in `partner_installazione_default`, come dato interno.

### Riorganizzazione della libreria
- **Rimosso lo script n. 22** ("WhatsApp — recap sintetico dopo la telefonata"): presupponeva una telefonata precedente.
- **Aggiunti** gli script **n. 26** (WhatsApp, primo contatto) e **n. 27** (email, primo contatto), categoria `apertura`, `stati_correlati: ["trasversale"]`.
- **Nuova logica per i canali senza slot dedicato** (funzione subito prima di `buildSystemPrompt`). Se per uno stato si attiva un canale che non ha uno slot proprio (es. WhatsApp sullo stato 3):
  - si usa un template dello **stesso canale e della stessa categoria** dello script telefono dello stato (es. apertura → apertura);
  - solo se non esiste, si ripiega sugli script `apertura` del canale + lo script telefono;
  - **mai** su script `follow_up` / `promemoria` / `conferma` di altri stati, perché presuppongono un contatto già avvenuto.

---

## 5. TODO

### Priorità alta
- [ ] **Riallineare `src/data/script-library.json` all'HTML**: il JSON ha ancora gli script 1–25 (incluso il 22 rimosso) e non ha il 26 e il 27. Il README parla ancora di "25 script". La fonte di verità è `SCRIPT_LIBRARY` nell'HTML.
- [ ] **Riallineare `docs/PROMPT-SISTEMA-COMPLETO.md` (e `.docx`)**: è fermo al 2026-09-21 e riporta 4 regole assolute invece di 6.
- [ ] **Profilo salvato dell'utente**: le modifiche a `COMPANY_PROFILE_DEFAULT` (sostituzione di "Facile Salire" nelle regole di compliance) **non retroagiscono** sul profilo già salvato nel browser. Aggiornarlo a mano dalla tab "Profilo Azienda", oppure ripristinare il default.
- [ ] Rigenerare e verificare con l'utente qualche script per ogni stato (1–10) e per ogni canale, per confermare che le 6 regole siano rispettate.

### Da testare dal vivo
- [ ] Console dentro un vero **Claude Artifact** (firme di `window.claude.db` / `window.claude.sample`).
- [ ] Import Excel reale via SheetJS.
- [ ] Bagliore "lead in attesa" (porta 8767) e ritentativi in `console-content.js` (8 × 1,5 s). Se non si accende al primo avvio a freddo, aumentare `tentativiRimasti`.
- [ ] Istanza singola di Suggerimenti Vendita dopo il fix `exec` in `Contents/MacOS/avvia`. Se si aprono ancora due istanze, il piano B è un lock-file (`logs/menu.pid`).
- [ ] Layout a 3 finestre con Dock laterale.
- [ ] Estensione CRM su più lead diversi (abbinamento categoria prodotto, lead con più attività "Visita").

### Pulizia e manutenzione
- [ ] Aggiornare `CONSOLE_FALLBACK_URL` in `browser-extension/background.js` se sul Mac la cartella viene spostata sotto `SALESASSISTANT/`.
- [ ] Aggiornare `docs/PROMPT-RIPRESA.txt`: punta ancora a `/root/progetti/LEADREWORKS/`.
- [ ] Rimuovere i file AppleDouble `._*` e i `.DS_Store` dal repo.
- [ ] Rimuovere il duplicato `YesMobility-LeadRework-Specifica.md` nella root del progetto (identico a quello in `docs/`).
- [ ] `http://localhost:8766/*` resta negli `host_permissions` per il content script di Suggerimenti Vendita: è corretto, non rimuoverlo pensando che serva solo al vecchio endpoint.
- [ ] README di Suggerimenti Vendita: documentare la modalità `gestione_lead` e la porta 8767.

---

## 6. Note tecniche importanti

### Dove vivono le regole (decide se serve un'azione dell'utente)
| Dove | Editabile dall'utente? | Una modifica nel codice si applica subito? |
|---|---|---|
| `HARD_COMPLIANCE_RULES` | No | **Sì**, sempre |
| `SCRIPT_LIBRARY`, `LEAD_STATES`, `OBIEZIONI_TRASVERSALI` | No | **Sì** |
| `COMPANY_PROFILE_DEFAULT` (incl. `regole_critiche_compliance`, `value_proposition`) | Sì (tab Profilo) | **No**: vale solo per installazioni nuove, il profilo salvato va aggiornato a mano |

**Regola pratica**: tutto ciò che è critico va messo in `HARD_COMPLIANCE_RULES`, con un **esempio VIETATO reale** citato testualmente. Una frase astratta isolata nel prompt si è dimostrata insufficiente (vedi sopralluogo e "suocero").

### Runtime AI e storage
- `dbGet` / `dbSet`: prima `window.claude.db`, poi `localStorage` (prefisso `leadrework:`).
- `callSample`: prima `window.claude.sample`, poi `window.claude.complete`, poi la API key diretta (`fetch` su `https://api.anthropic.com/v1/messages` con `anthropic-dangerous-direct-browser-access: true`).
- `hasAiRuntime()` / `canUseImages()` si calcolano **al momento dell'uso**, mai in cache in `state`.
- Ogni errore AI mostrato all'utente deve includere la diagnostica: via usata, ultime cifre della chiave, modello, workspace.
- API key: serve `sk-ant-api…`, **non** `sk-ant-admin…`. Il Workspace ID (`wrkspc_…`) è un valore diverso dalla chiave.
- Il `localStorage` su `file://` non è affidabile in tutti i browser: per questo esiste l'export/import JSON delle impostazioni AI.

### Librerie CDN (caricate solo se servono)
- SheetJS `xlsx 0.18.5` da cdnjs.
- **pdf.js 3.11.174, non aggiornare oltre la 3.x**: dalla 4.x non espone più `window.pdfjsLib`.
- Google Fonts: se non raggiungibili, si torna ai font di sistema.

### Rendering
`render()` ricrea il DOM via `innerHTML`: tutto ciò che dipende dalle misure (es. altezza delle textarea `autogrow`) va riapplicato alla fine di ogni `render()`.

### Estensione browser
- Serve "Consenti accesso agli URL di file" nei dettagli dell'estensione, altrimenti `console-content.js` non viene iniettato.
- `setTimeout` nel service worker MV3 non è affidabile: i ritentativi vivono nel content script della console.
- `crm-content.js` confronta l'ID lead nei dati con l'ID nell'URL: se non combaciano, blocca e chiede F5. Il refresh automatico causava un loop ed è stato tolto.
- L'import dal CRM **non** chiama l'AI: stato, obiezioni e strategia vanno richiesti con il pulsante della sezione 3.

### Porte e schema URL
- **8766**: server overlay/WebSocket di Suggerimenti Vendita, attivo solo dopo la prima chiamata.
- **8767**: server `/lead-in-attesa` (POST/DELETE) dentro `menu_finestra.py`, attivo finché l'app è aperta.
- `suggerimentivendita://`: registrato in `Info.plist`. `lsregister -f` viene eseguito a ogni avvio in `Contents/MacOS/avvia` per ripararne la registrazione.
- Il vecchio meccanismo `lead-corrente.json` è stato **rimosso**: sovrascriveva sempre il canovaccio.

### Preferenze operative dell'utente
- Riportare sempre i **percorsi esatti** dei file modificati.
- Dire **prima** l'azione richiesta all'utente, poi la spiegazione tecnica.
- Niente workaround che cambiano le abitudini dell'utente quando il problema è nel codice.
- Per cambi di layout/UX importanti, discutere e aspettare il via libera prima di scrivere codice.

---

## 7. Struttura dei file

```
SALESASSISTANT/LEADREWORKS/
├── README.md                          # note tecniche, estensione CRM, test con API key
├── YesMobility-LeadRework-Specifica.md  # duplicato di docs/ (da rimuovere)
├── apri-console.command               # avvio Chrome app-mode, colonna sinistra 40%
├── setup_leadreworks.sh               # script di setup iniziale della cartella
├── browser-extension/                 # estensione Chrome MV3
│   ├── manifest.json                  # permessi: storage, tabs, system.display; host facilesalire, file://, 8766, 8767
│   ├── background.js                  # service worker: routing tra schede, apertura console, geometria finestra
│   ├── crm-content.js                 # pulsante sul CRM, estrazione dati Inertia
│   ├── console-content.js             # consegna dati alla console, notifica 8767 con ritentativi
│   └── suggerimenti-vendita-content.js  # consegna canovaccio solo con ?avvio=gestione_lead, DELETE 8767
├── docs/
│   ├── HANDOFF.md                     # questo file
│   ├── PROMPT-RIPRESA.txt             # prompt per riprendere in una nuova chat (percorsi da aggiornare)
│   ├── PROMPT-SISTEMA-COMPLETO.md     # estratto letterale dei prompt AI (fermo al 21/09, da aggiornare)
│   ├── PROMPT-SISTEMA-COMPLETO.docx   # stesso contenuto in Word
│   └── YesMobility-LeadRework-Specifica.md  # specifica funzionale originale
└── src/
    ├── lead-rework-console.html       # L'APP: file unico, fonte di verità di dati e logica
    └── data/
        ├── company-profile.default.json  # copia leggibile di COMPANY_PROFILE_DEFAULT
        └── script-library.json        # copia leggibile di SCRIPT_LIBRARY (DISALLINEATA, vedi TODO)
```

### Mappa di `src/lead-rework-console.html` (in ordine di apparizione)
- `LOGO_YESMOBILITY_B64`, `COMPANY_PROFILE_DEFAULT`
- `HARD_COMPLIANCE_RULES` (6 regole)
- `SCRIPT_LIBRARY` (26 script), `LEAD_STATES` (10 stati con slot per canale), `OBIEZIONI_TRASVERSALI` (5)
- `CANALI_BASE`, adapter runtime (`RUNTIME`, `dbGet`/`dbSet`, `callSample`)
- `buildExtractionSystemPrompt()`: estrazione, stato suggerito, analisi ≤100 parole
- calcolo degli slot attivi per i canali (logica "stessa categoria")
- `buildSystemPrompt()` / `buildUserPrompt()`: generazione script
- import CRM (`applyCrmImport`), export verso Suggerimenti Vendita (`buildSuggerimentiVenditaExport`, `sendToSuggerimentiVendita`, `apriSuggerimentiVendita`, `exportHistoryItemToSuggerimentiVendita`)
- UI: `ICON_PATHS` / `icon()`, `render()`, `renderHistoryModal()`, `autoGrowTextarea()`

### File collegati fuori da questa cartella (progetto Suggerimenti Vendita)
`SALESASSISTANT/SUGGERIMENTIVENDITA/`: `menu/index.html`, `menu/menu_finestra.py` (server 8767, polling, `calcola_rettangolo_finestra`, `application_openURLs_`), `server/server_suggerimenti.py` (8766), e nel bundle `Suggerimenti Vendita.app/Contents/MacOS/avvia` + `Info.plist`. Le modifiche a `menu/` vanno replicate anche nella copia dentro `Contents/Resources/progetto/`.
