# LEADREWORKS — Handoff consolidato (stato al 2026-09-29)

Documento unico di ripresa per la **YesMobility Lead Rework Console**.
Consolida le tre sessioni di sviluppo:

- **16–17 settembre 2026 (con coda al 18)**: sviluppo da zero della console, estensione browser CRM, integrazione con Suggerimenti Vendita.
- **24 settembre 2026**: fix dei bug di compliance negli script generati e riorganizzazione della libreria script.
- **28 settembre 2026**: redesign UI (tema chiaro, topnav, rail destra) + ripristino completo dello stato funzionante.

La cronologia dettagliata della prima sessione (sezioni 9bis…9terdecies del vecchio handoff) resta consultabile nella storia git di questo file.

---

## 1. Stato attuale in breve

| Area | Stato |
|---|---|
| Console (`src/lead-rework-console.html`) | ✅ Funzionante end-to-end, redesign UI completato (tema chiaro, topnav orizzontale, rail destra) |
| Regole di compliance | 6 regole hardcoded in HARD_COMPLIANCE_RULES, sempre attive |
| Libreria script | 26 script nell'HTML (n. 1–21, 23–27; il n. 22 è stato rimosso) |
| Estensione CRM → console | ✅ Testata dal vivo con lead reale, funzionante |
| Console → Suggerimenti Vendita | Implementata (URL scheme, bagliore "lead in attesa", due modalità di chiamata) |
| Layout a 3 finestre | Approvato dall'utente il 2026-09-29: console 35% · menu 15% · overlay 25%, tutte alte 60% (dettagli e punti di ripristino in `../../SUGGERIMENTIVENDITA/HANDOFF.md` §3) |
| Sincronizzazione da GitHub | ✅ Funzionante, pull senza conflitti |

**Il progetto vive in** `SALESASSISTANT/LEADREWORKS/` del repo `davidvannini-cyber/code`. Sul Mac dell'utente: `/Users/davidvannini_1/Documents/progetti/code/SALESASSISTANT/LEADREWORKS/`. La fonte di verità è il repo.

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
1. **Importa i dati del lead**: nascosta di default, si apre con il toggle "Apri" in alto. Dropzone multi-file per screenshot/PDF/CSV/Excel. I PDF diventano immagini JPEG pagina per pagina (max 5). C'è anche il pulsante manuale "Incolla dati dal CRM (dagli appunti)".
2. **Dati lead**: nome, prodotto, zona, prezzo, motivazione, note, storico, appuntamento. I campi mancanti hanno sfondo ambrato. "Note" e "Storico" si auto-espandono (.autogrow + autoGrowTextarea).
3. **Stato del lead e canali**: stato + obiezioni trasversali suggeriti dall'AI (sempre editabili). Pulsante dedicato "Suggerisci stato, obiezioni e strategia con AI", indipendente dai file caricati.
4. **Analisi e strategia**: testo AI, max 100 parole, passato anche come contesto alla generazione.
5. **Generazione script**: telefono / WhatsApp / email secondo stato + canali attivi + obiezioni, editabili, con "rigenera" per singolo canale.

**Generazione script, aggiunte del 2026-09-29** (`src/lead-rework-console.html`, da provare dal vivo):
- Canali di default: WhatsApp si attiva se `telefono1` o `telefono2` è un cellulare (`+39 3…`, `0039 3…`, `3…`); Email si attiva se il campo email è valorizzato. Vale al cambio stato, dopo l'estrazione AI, all'import CRM e alla modifica dei campi (l'attivazione automatica non spegne mai un canale).
- Sopra ogni script compare il contatto: telefono (`telefono1`) sul canale Telefono, cellulare sul WhatsApp, email sul canale Email.
- Firma `David Vannini` / `YesMobility.it` aggiunta dal codice (`appendSignature`) in fondo a WhatsApp e al corpo delle email, anche in rigenerazione e bozza da libreria. Una firma già presente (`[Nome operatore]`, `David`, `YesMobility`) viene sostituita, non duplicata. Il prompt chiede all'AI di non firmare.
- Pulsanti "Copia" (solo icona, un click, feedback con icona di spunta): numero WhatsApp, testo WhatsApp (riga "Testo" sopra la textarea, come Oggetto/Corpo), indirizzo email, oggetto e corpo dell'email. Copiano il valore **attuale** (anche se modificato a mano), letto da `state` al click (`copyOut`, `copyBtn`, `copyOutValue`). Sul canale Telefono non ci sono.
- Le stesse funzioni (numero sopra script telefono/WhatsApp, email sopra script email, pulsanti Copia solo icona) sono presenti anche nel dettaglio di un lead dello storico (`renderHistoryModal`): `copyBtn/copyOut/copyOutValue/contactLineFor` accettano un `hid` (id record storico) e leggono da `state.leadsHistory`. Il canale di ogni script storico è dedotto dalla chiave (`whatsapp*`, `email*`, altrimenti telefono).
- Pulsanti "apri già compilato" nella riga del contatto (schermata generazione e storico): logo WhatsApp apre l'app desktop con `whatsapp://send?phone=<numero>&text=<testo>` (senza `target=_blank`, come il mailto; se l'app non è installata non succede nulla; alternativa web: `https://wa.me/<numero>?text=<testo>`) (numero normalizzato con prefisso 39 se manca: `whatsappDigits`), icona Mail del Mac apre `mailto:` con destinatario, oggetto e corpo (`openOut`, `openBtn`). Non inviano: l'invio resta manuale. Se in futuro si usa Gmail web, sostituire il `mailto:` con `https://mail.google.com/mail/?view=cm&to=&su=&body=`.
- Cliente sempre chiamato per cognome: il placeholder `[Nome]` diventa "Sig. Cognome" / "Sig.ra Cognome" (`customerAppellative`, euristica su `nome` assunto come "Nome Cognome"; genere dal nome di battesimo, con liste eccezioni `MALE_NAMES_IN_A` / `FEMALE_NAMES_NOT_IN_A`; se manca il nome resta `[Nome]`). Per l'AI c'è una regola in `HARD_COMPLIANCE_RULES` e il campo `appellativo_cliente` nei DATI LEAD. Limite: se il CRM porta "Cognome Nome" l'euristica sbaglia, l'AI può correggere ma il fallback locale no.
- Niente emoji negli script WhatsApp: rimosse dalla libreria (script 17, 19, 26), regola in `HARD_COMPLIANCE_RULES` e filtro `stripEmoji` applicato in `signValue` all'output AI.

### Tab "Storico Lead"
Elenco filtrabile, apertura in sola lettura (con analisi/strategia salvata), duplicazione, eliminazione, stampa (@media print, forzata su sfondo bianco), "Invia a Suggerimenti Vendita" anche da un lead storico.

### Tab "Profilo Azienda"
Dati aziendali editabili + card "Impostazioni AI" (API key, modello default claude-sonnet-5, Workspace ID opzionale, "Testa connessione", export/import JSON delle impostazioni).

### Integrazioni
- **Estensione browser** (browser-extension/, Manifest V3): pulsante galleggiante sulle pagine lead di app.facilesalire.it, legge il blocco Inertia <script type="application/json" data-page="app"> e invia i dati alla console. ✅ Testata dal vivo.
- **Suggerimenti Vendita**: invio del canovaccio via chrome.storage.local, apertura dell'app con suggerimentivendita://, bagliore sul pulsante "Chiamata Gestione Lead" tramite server locale sulla porta 8767.
- **Avvio**: apri-console.command apre Chrome in modalità app nella colonna sinistra (lo script usa 30%; `background.js` usa 35%, valore approvato).

### Grafica
Tema chiaro (sfondo #ffffff, pannelli #e8e8ec, primario teal #14b8a6), font Manrope / IBM Plex, icone SVG inline, logo base64. Layout: topnav orizzontale in alto, rail destra sticky, main content al centro.

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

## 5. Sessione 28 settembre: redesign UI

Trasformazione estetica: da tema scuro a tema chiaro, da sidebar verticale a topnav orizzontale con rail destra sticky.

### Cambiamenti principali
- **CSS**: colori invertiti (#14171f → #ffffff), bordi ridotti da 10px a 2px, spazi ridotti.
- **Layout**: render() crea topnav con tab anziché sidebar, rail destra con link di navigazione (#dati-lead, #stato-canali, #analisi, #generazione).
- **Estensione browser**: pulita, nessun tentativo di ridimensionamento aggressivo (Chrome su macOS ignora width/height su popup windows).
- **Sincronizzazione**: GitHub pull senza conflitti, cartelle ripristinate allo stato funzionante.

---

## 6. TODO

### Priorità alta
- *  Riallineare dati con HTML: fatto il 2026-09-25.
- *  Profilo salvato dell'utente: le modifiche a COMPANY_PROFILE_DEFAULT non retroagiscono. Aggiornarlo a mano dalla tab "Profilo Azienda", oppure ripristinare il default.
- *  Rigenerare e verificare con l'utente qualche script per ogni stato (1–10) e per ogni canale, per confermare che le 6 regole siano rispettate.

### Da testare dal vivo
- *  Console dentro un vero Claude Artifact.
- *  Import Excel reale via SheetJS.
- *  Bagliore "lead in attesa" (porta 8767) e ritentativi.
- *  Layout a 3 finestre con Dock laterale.
- *  Estensione CRM su più lead diversi.

### Pulizia e manutenzione
- *  Aggiornare CONSOLE_FALLBACK_URL in browser-extension/background.js se sul Mac la cartella viene spostata.
- *  Aggiornare docs/PROMPT-RIPRESA.txt: fatto.
- *  Rimuovere i file AppleDouble e .DS_Store: fatto, aggiunto .gitignore.

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

### Flusso di sincronizzazione (aggiornato il 2026-10-20)
- Claude lavora nel clone di `davidvannini-cyber/code` della sessione (cartella `code`) ed è l'unica sorgente di verità. Non esiste più nessuno Stop hook automatico né le cartelle `/root/progetti/...` (verificato il 2026-10-20: non ci sono).
- A fine lavoro Claude aggiunge la riga a `REGISTRO-SALVATAGGI.md`, fa commit e push fast-forward su `main` (mai force push), poi scrive «Fai Sync». Le regole sono nell'hook di avvio `.claude/hooks/consensi-avvio.sh`.
- **Per l'utente**: fare «Sync» (icona sulla scrivania → `Sync.command`, `git pull --ff-only` di tutto il repo) e ricaricare la console con Cmd+Shift+R. Ciò che non è stato pubblicato su GitHub sul Mac non arriva.

---

## 7. Struttura dei file

```
SALESASSISTANT/LEADREWORKS/
├── .gitignore                         # esclude .DS_Store e ._*
├── README.md                          # note tecniche, estensione CRM, test con API key
├── apri-console.command               # avvio Chrome app-mode, colonna sinistra (30% nello script)
├── setup_leadreworks.sh               # script di setup iniziale della cartella
├── browser-extension/                 # estensione Chrome MV3
│   ├── manifest.json                  # permessi: storage, tabs, system.display; host facilesalire, file://, 8766, 8767
│   ├── background.js                  # service worker: routing tra schede, apertura console, geometria finestra
│   ├── crm-content.js                 # pulsante sul CRM, estrazione dati Inertia
│   ├── console-content.js             # consegna dati alla console, notifica 8767 con ritentativi
│   └── suggerimenti-vendita-content.js  # consegna canovaccio solo con ?avvio=gestione_lead, DELETE 8767
├── docs/
│   ├── HANDOFF.md                     # questo file
│   ├── PROMPT-RIPRESA.txt             # prompt per riprendere in una nuova chat
│   ├── PROMPT-SISTEMA-COMPLETO.md     # estratto letterale dei prompt AI (aggiornato al 25/09)
│   ├── PROMPT-SISTEMA-COMPLETO.docx   # versione Word (ferma al 21/09, da rigenerare)
│   └── YesMobility-LeadRework-Specifica.md  # specifica funzionale originale
└── src/
    ├── lead-rework-console.html       # L'APP: file unico, fonte di verità di dati e logica
    └── data/
        ├── company-profile.default.json  # copia leggibile di COMPANY_PROFILE_DEFAULT
        └── script-library.json        # copia leggibile di SCRIPT_LIBRARY (26 script)
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

## Misure e note dalla chiamata → «Note YM:» (2026-10-21)
Il pannello di Suggerimenti Vendita manda a `http://localhost:8766/api/chiamata` misure della scala e note della telefonata; la Console le legge ogni 2 s (`svPoll`, blocco «MISURE E NOTE DALLA CHIAMATA» in `src/lead-rework-console.html`). **Nessuna estensione coinvolta.**
- «Note YM:» è il campo `note_ym` del record dello **Storico** (modale del lead); non è il campo «Note» della scheda inserimento (`d.note`, dato CRM, sola lettura nello Storico).
- Lead trovato in Storico dal numero di telefono (normalizzato, anche `+39`): righe aggiunte in fondo a `note_ym`, aggiornate in-place a ogni modifica (un solo blocco per chiamata), salvataggio automatico. Numero ambiguo (più lead): non scrive e avvisa.
- Chiamata senza lead («Chiamata YesMobility», «Rinforzo Facile Salire»): alla chiusura del popup Note o a Termina/X, se c'è una scheda «Lead» in compilazione (nome o telefono) viene **salvata in Storico** con avviso, si apre «Lead» vuoto con banner, e al «Salva lead in storico» le righe vanno in `note_ym` del nuovo lead (`state.pendingChiamata`).

## Storico Lead: scorrimento e lead evidenziato (2026-10-22)
- `render()` ricostruisce tutta la pagina: ora conserva lo scorrimento della lista (`.tbl-scroll`) e della pagina quando resta nella stessa scheda (`state._schedaRender`), così spuntare Lav./F.U./Chiuso/tel/WA/mail o cambiare un filtro non riporta in cima.
- Aprendo «Vedi» (`openHistoryItem`) il lead diventa `state.historyHighlight`; alla chiusura (`closeHistoryModal`) la riga (`tr[data-id]`, classe `riga-sel`: sfondo azzurro + barra blu a sinistra) viene portata in vista una sola volta (`state.historyScrollTo`). L'evidenziazione resta finché non si cambia scheda (`switchTab`) o si apre un altro lead.
- Provato in Chromium con 60 lead finti; non con lo storico reale di David.

## Protezione «profilo Chrome sbagliato» (2026-10-22)
I lead, la chiave AI e le impostazioni stanno in `localStorage` del **profilo Chrome** con cui si apre la pagina (`file://`): in un altro profilo la Console si apre vuota. Incidente reale del 22/10: Console vuota in tutti i profili finché non è stato chiuso/riaperto Chrome (causa non verificata).
- `init()` chiama `archivioDaBloccare()`: se archivio vuoto + nessuna copia (`leads_backup`/`leads_prev`) + nessun flag `leadrework:archivio_confermato` → schermo di avviso a tutta pagina (`#blocco-profilo`), nessun salvataggio, `svPoll` fermo (non svuota la coda delle note dal pannello). Un profilo con almeno un lead viene marcato confermato da solo; Non esiste più il pulsante per proseguire da vuoto (voluto da David): in un profilo vuoto la Console resta ferma. Non si applica nell'ambiente Claude (`window.claude.db`).
- Vale anche per l'avvio da estensione (il controllo è nella pagina). Un lead dal CRM che arriva prima della fine dell avvio viene tenuto in `crmInAttesa` e applicato a fine avvio; se la pagina è bloccata viene scartato (non si salva nulla) e l avviso dice di cambiare profilo e rimandarlo dal CRM. L'estensione non è stata modificata.
- Recupero dati: backup `leadrework-lead-*.json` e `storico_lead_*.xlsx` in Download; script di ricostruzione fornito in chat (non nel repository: contiene solo logica, nessun dato).

## Backup automatico dei lead su file (2026-10-22)
Servizio sul Mac, **fuori da Chrome**: `LEADREWORKS/backup-servizio/servizio_backup.py` (solo libreria standard di Python 3), in ascolto su `127.0.0.1:8769`, installato come agente `launchd` (`it.yesmobility.leadbackup`) con **«Installa Backup Lead.command»** (doppio clic, una sola volta; si rilancia per aggiornare). **«Disinstalla Backup Lead.command»** lo toglie senza cancellare i backup. Copia lo script in `~/Library/Application Support/LeadReworkBackup/`.
- Scrive in `~/BACKUP-LEAD`: `leadrework-ultimo.json` (formato del backup della Console: si ripristina con «Ripristina» nello Storico) e `leadrework-AAAA-MM-GG.json` (ultime 30). Un archivio **vuoto** non sovrascrive nulla; un calo sotto la metà dei lead dell'ultima copia (con almeno 5 lead) non sostituisce «ultimo» ma va in `leadrework-ANOMALO-…json`. Non riscrive se il contenuto è identico.
- La Console (`svBackupProgramma/svBackupInvia/svBackupStato`, blocco «BACKUP AUTOMATICO SU FILE») manda l'archivio a ogni salvataggio dei lead (max una volta ogni 5 s, più un invio all'avvio) e controlla `/stato` ogni 30 s. Indicatore verde «Backup automatico: ultima copia …» in alto a destra e nello Storico; **rosso «NON ATTIVO» se il servizio non risponde**. Non invia se la pagina è bloccata per «profilo sbagliato».
- Provato qui: servizio (salvataggio, rifiuto vuoto, calo anomalo, invariato) e Console con servizio acceso/spento. **Non provato**: avvio automatico `launchd` sul Mac di David e la prima installazione.

## Profilo Chrome fissato nei lanciatori (2026-10-22)
`apri-console.command` e `Lead Rework.app/Contents/MacOS/launcher` aprono Chrome con `--profile-directory="$PROFILO"` (variabile in cima ai due file, ora **`Profile 1`**: nome della CARTELLA del profilo, da `chrome://version` → «Percorso profilo», in `~/Library/Application Support/Google/Chrome/`). Prima Chrome sceglieva l'ultimo profilo usato → Console vuota se era un altro. Se il profilo con i lead fosse un altro, basta cambiare `PROFILO` in entrambi i file. L'avvio dall'estensione non cambia (usa il profilo dell'estensione). **Lead Collector** usa un Chrome separato (`LEAD-COLLECTOR/data/chrome-profile`, ignorato da git): non toccarlo. Per sapere nome→cartella dei profili: `Local State` di Chrome (`profile.info_cache`). Non provato sul Mac di David.

