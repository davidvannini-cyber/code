# LEADREWORKS — Handoff conversazione (stato al 2026-09-17)

Documento di ripresa per continuare lo sviluppo della webapp "YesMobility Lead Rework Console" in una nuova chat, senza dover rifare tutto il percorso di questa conversazione.

---

## 1. Cos'è il progetto

Webapp ad uso singolo operatore (David, YesMobility) che genera script operativi (telefono/WhatsApp/email) per il rework dei lead, in base allo stato del lead nel funnel. Pensata per essere pubblicata come **Claude Artifact** (file HTML unico, self-contained), ma nel frattempo testata anche in locale nel browser.

Specifica funzionale originale: `docs/YesMobility-LeadRework-Specifica.md`.

## 2. Dove sono i file (ATTENZIONE: due copie da tenere sincronizzate a mano)

- `/root/progetti/LEADREWORKS/` — copia visibile nel file browser/IDE dell'utente; **quella che l'utente scarica in locale per testare**
- `/progetti/LEADREWORKS/` — copia creata al percorso letterale richiesto inizialmente (radice filesystem)

**File principale (l'artifact vero e proprio):** `src/lead-rework-console.html` — un unico file HTML, nessuna build, tutto inline (CSS, JS, dati).

Altri file:
- `src/data/company-profile.default.json`, `src/data/script-library.json` — sorgenti leggibili degli stessi dati incorporati nell'HTML (profilo azienda + 25 script)
- `README.md` — note tecniche e rischi aperti, tenerlo aggiornato
- `docs/HANDOFF.md` — questo file

**Ogni volta che si modifica l'HTML o il README, copiarli in ENTRAMBE le cartelle** (`cp` semplice) e riportare all'utente i percorsi esatti modificati — è una sua richiesta esplicita.

## 3. Origine della libreria script (25 script)

Il PDF `SCRIPT_YesMobility.pdf` citato nella specifica non era disponibile. La libreria è stata ricostruita adattando i 17 script reali trovati in un progetto correlato (`SUGGERIMENTIVENDITA/schema/esempio-libreria-script.json`, stesso tono/partner/regole) e completata a 25 per coprire tutti i canali della tabella stati-lead. Se il PDF originale diventa disponibile, va usato per validare/sostituire questi contenuti.

## 4. Architettura funzionale attuale

Tab "Nuovo Lead", flusso in 5 sezioni numerate:
1. **Importa i dati del lead** — dropzone (drag&drop o click) per screenshot/PDF/CSV/Excel, multi-file. I PDF vengono convertiti pagina per pagina in immagini (max 5 pagine) e trattati come screenshot.
2. **Dati lead** — campi cliente (nome, prodotto, zona, prezzo, motivazione, note, storico, appuntamento). I campi che l'estrazione AI non riesce a determinare hanno sfondo ambrato, che sparisce appena vengono valorizzati (a mano o da una nuova estrazione riuscita).
3. **Stato del lead e canali** — stato lead e obiezioni trasversali **suggeriti dall'AI** analizzando i file importati/note (sempre editabili; se l'utente sceglie manualmente prima dell'estrazione, la scelta viene rispettata e non più marcata come mancante).
4. **Analisi e strategia** — testo AI (max 200 parole) con risultato dello studio del lead + strategia consigliata per approcciarlo. Passato anche come contesto alla generazione script.
5. **Generazione script** — genera telefono/WhatsApp/email in base a stato+canali+obiezioni+analisi, editabili, con "rigenera" per singolo canale.

Tab "Storico Lead": elenco filtrabile, apertura in sola lettura (mostra anche l'analisi/strategia salvata), duplicazione come base di un nuovo lead, eliminazione, **tasto stampa** (stampa solo il contenuto della scheda via CSS `@media print`).

Tab "Profilo Azienda": dati aziendali fissi + card "Impostazioni AI" (vedi punto 6).

## 5. Runtime `db` e `sample` — IMPORTANTE, rischio aperto

Le firme esatte delle API `window.claude.db` e `window.claude.sample` dell'ambiente Claude Artifact **non sono pubblicamente documentate in modo verificabile**. Il codice le richiama nella forma più standard ipotizzabile, con adapter difensivi:
- `dbGet`/`dbSet` → provano `window.claude.db.get/set`, fallback su `localStorage`
- `callSample` → prova `window.claude.sample`, poi `window.claude.complete` (legacy), poi la API key diretta (vedi sotto)

**Non ancora testato dentro un vero Artifact claude.ai.** Se/quando l'utente lo testa lì, verificare che le chiamate corrispondano all'API reale e correggere se necessario — è il rischio tecnico principale rimasto.

## 6. Fallback "bring your own API key" (per test in locale)

Poiché `window.claude` esiste solo dentro un vero Artifact, per testare le funzioni AI in locale è stata aggiunta una card "Impostazioni AI" (tab Profilo Azienda) con:
- Campo API key Anthropic (`sk-ant-api...`, **non** `sk-ant-admin...` — le chiavi admin non possono generare testo)
- Campo modello (default `claude-sonnet-5`)
- Campo **Workspace ID** (necessario solo se la chiave non è scoped a un workspace — l'API risponde con un errore esplicito che lo richiede; formato `wrkspc_...`, si trova su console.anthropic.com → Settings → Workspaces)
- Tutti i campi si salvano da soli a ogni carattere digitato (mai serve un salvataggio separato)
- "Testa connessione" fa una chiamata reale minimale e mostra risultato/errore con diagnostica (ultime cifre chiave, modello, workspace usati)
- **Esporta/Importa impostazioni AI**: scarica/ricarica un JSON con key+model+workspace, perché alcuni browser non conservano `localStorage` in modo affidabile tra riaperture di un file `file://`. Consigliare sempre all'utente di tenere questo file da parte.

La chiamata diretta usa `fetch` verso `https://api.anthropic.com/v1/messages` con header `anthropic-dangerous-direct-browser-access: true` (pattern ufficiale documentato da Anthropic per client-side "bring your own key").

## 7. Librerie esterne caricate da CDN (dinamicamente, solo se serve)

- **SheetJS (xlsx)** per import Excel: `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`
- **pdf.js 3.11.174** (versione fissata di proposito) per import PDF → immagini: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js` + worker `.../pdf.worker.min.js`. **Non aggiornare oltre la 3.x**: dalla 4.x pdf.js distribuisce solo moduli ES e non espone più `window.pdfjsLib` con un semplice `<script>`.

Se questi CDN diventano irraggiungibili, l'app fallisce in modo controllato con un messaggio chiaro (fallback a CSV per l'Excel, screenshot manuale per il PDF).

## 8. Lezioni di debugging (per non ripetere gli stessi errori)

- **Non mettere in cache in `state` un controllo di "capacità disponibile"** (es. `imageSupport` calcolato una volta a `init()`): causa disallineamenti quando le impostazioni cambiano dopo. Ora `hasAiRuntime()`/`canUseImages()` sono calcolate al momento dell'uso, sempre.
- **Ogni messaggio d'errore mostrato all'utente durante una chiamata AI deve includere la diagnostica** (via usata: Artifact/legacy/API key + ultime cifre chiave + modello + workspace) — altrimenti il debug richiede troppi giri.
- **Workspace ID ≠ API key**: sono due valori diversi con formati diversi (`wrkspc_...` vs `sk-ant-...`); un utente può confonderli/incollarli nel campo sbagliato — la diagnostica nel messaggio d'errore lo rivela subito.
- **Quando si comunica una soluzione che richiede un'azione dell'utente, va detta per prima, in modo esplicito**, non in fondo a una spiegazione tecnica.
- **"Esegui un server locale" non è una soluzione quando il problema è nell'app**: se un workaround chiede all'utente di cambiare le sue abitudini invece di risolvere nel codice, va cercata una soluzione vera (qui: export/import impostazioni invece di dipendere da `localStorage`).

## 9. Stato a fine conversazione (2026-09-17)

Confermato funzionante end-to-end dall'utente con una vera API key Anthropic: import multi-file (incluso PDF), estrazione dati con suggerimento stato/obiezioni/analisi-strategia, generazione script, storico con stampa. Nessun bug noto aperto all'ultimo controllo.

Non ancora testato: dentro un vero Claude Artifact su claude.ai (vedi punto 5); upload Excel reale con SheetJS da CDN.

### 9bis. Nuovo: import diretto dal CRM proprietario (estensione browser, prototipo — 2026-09-17)

Nella stessa conversazione, aggiunta una via alternativa all'upload manuale di
screenshot: un'estensione browser (`browser-extension/`) che legge i dati del
lead direttamente dalla pagina del CRM proprietario di YesMobility ("Facile
Salire", `app.facilesalire.it`) e li invia con un clic alla console. Dettagli
completi, mappatura campi e limiti noti in `README.md` (sezione "Import
diretto dal CRM"). Riassunto essenziale:

- Il CRM (Inertia.js) espone tutti i dati della pagina lead in un blocco
  `<script type="application/json" data-page="app">` presente nell'HTML,
  quindi non serve navigare tra i tab (Attività/Offerte/Note) né automatizzare
  click multipli: un solo clic legge già tutto.
- Niente API CRM disponibile (fornitore esterno, solo interfaccia web): la
  soluzione sfrutta la sessione già loggata dell'utente nel browser, non
  automatizza il login e non salva credenziali da nessuna parte.
- Trasporto dati tra le due schede (CRM e console, origini diverse) via
  `chrome.storage.local` + `window.postMessage`, non fetch cross-origin.
- Aggiunta anche una via manuale di fallback nella console stessa (pulsante
  "Incolla dati dal CRM (dagli appunti)", tab Nuovo Lead sezione 1): utile per
  testare la mappatura campi senza installare l'estensione.
- **Testato dal vivo dall'utente con un lead reale (2026-09-17): funziona.**
  Estensione installata, autorizzazioni sito concesse, clic sul CRM → dati
  arrivati correttamente nella console. Resta da verificare su più lead
  diversi (specialmente l'abbinamento categoria prodotto e il caso di più
  attività "Visita" sullo stesso lead).
- Rischio noto: se l'operatore naviga da un lead all'altro nel CRM senza
  ricaricare la pagina (navigazione client-side), il blocco dati potrebbe
  restare quello del lead precedente — mitigazione attuale: consigliare un
  refresh (F5) prima di catturare, in caso di dubbio.
- **Nota UX importante**: l'import CRM copia solo dati grezzi, non chiama
  l'AI. Stato lead, obiezioni trasversali e analisi/strategia restano vuoti
  (evidenziati ambrato) finché non si preme il pulsante separato "Suggerisci
  stato, obiezioni e strategia con AI" (vedi 9ter) — la prima volta questo ha
  confuso l'utente, che si aspettava fossero popolati automaticamente
  dall'import stesso.

### 9ter. Rifinitura interfaccia (2026-09-17, stessa conversazione)

Dopo il test riuscito del CRM import, l'utente ha chiesto una serie di
rifiniture estetiche/UX su `lead-rework-console.html`:

- **Logo YesMobility** nella sidebar, incorporato come base64 inline
  (ridimensionato a 320px di larghezza, ~70KB) — sorgente originale trovata
  in `/root/progetti/SUGGERIMENTIVENDITA/menu/ logo-yesmobility.png`
  (stesso logo mostrato dall'utente in chat). La costante `LOGO_YESMOBILITY_B64`
  è dichiarata in cima allo `<script>`, prima di `COMPANY_PROFILE_DEFAULT`.
- Titolo pagina e voce di navigazione rinominati da "Nuovo Lead" a "Lead".
- **Tutte le emoji nei pulsanti/etichette dell'interfaccia sostituite con
  icone SVG lineari inline** (nessuna libreria esterna): vedi `ICON_PATHS` +
  funzione `icon(name, opts)`, subito dopo `nl2br()`. Le emoji nel *testo*
  degli script di libreria (es. 📅/📍 nel messaggio WhatsApp di conferma
  appuntamento, `SCRIPT_LIBRARY` #19) sono state **lasciate intatte** di
  proposito: sono contenuto per il cliente finale, non elementi di interfaccia.
- **Sezione "Importa i dati del lead" nascosta di default**: ora si apre solo
  dal sottomenu del pulsante "Lead" in sidebar (freccina → "Importa dati"),
  stato tenuto in `state.showImportPanel` (non nel `draft`, quindi non si
  resetta cambiando lead). Il pulsante "Incolla dati dal CRM" vive dentro
  questa sezione, quindi va aperta per usarlo — il flusso automatico via
  estensione invece non dipende dalla visibilità del pannello (il listener
  `window.addEventListener("message", ...)` è registrato a livello globale).
- **Campi "Note" e "Storico contatti precedenti" auto-espandibili**: classe
  CSS `.autogrow` + funzione `autoGrowTextarea(el)`, richiamata sia
  sull'evento `oninput` sia per tutte le `textarea.autogrow` alla fine di ogni
  `render()` (necessario perché `render()` ricrea il DOM da zero via
  `innerHTML`, quindi l'altezza calcolata va sempre riapplicata dopo).
- **Limite analisi/strategia ridotto da 200 a 100 parole** — sia nel testo
  visibile all'utente (sezione 4) sia nel prompt AI (`buildExtractionSystemPrompt`).
- `runAiAnalysis()` (introdotta in 9bis) ora ha anche un pulsante dedicato in
  sezione 3, sempre visibile, indipendente dai file caricati.

Verificato con un giro di test in jsdom (node, no browser reale): render,
cambio tab, apertura/chiusura pannello import, `applyCrmImport`, presenza
icone SVG e logo — nessun errore. **Non ancora verificato in un vero browser**
(in particolare: resa reale del logo, comportamento auto-resize delle
textarea, che in jsdom non calcola `scrollHeight` in modo affidabile).

### 9quater. Palette dark + coerenza grafica con "Suggerimenti Vendita" (2026-09-17, stessa conversazione)

L'utente ha chiesto di allineare graficamente la console a un'altra app YesMobility
già esistente, "Suggerimenti Vendita" (`/root/progetti/SUGGERIMENTIVENDITA/menu/index.html`).
Ho preso la palette/tipografia esatta da lì (stessi valori hex) e l'ho applicata
alle variabili CSS di `lead-rework-console.html` (stessi nomi di variabile di
prima — `--bg`, `--panel`, `--primary`, ecc. — solo i valori sono cambiati, per
non dover riscrivere tutte le regole che li usano):
- Sfondo `#14171f`, card `#1b1f29`, testo primario `#f3f4f6`, dim `#9ca3af`.
- Colore primario passato da blu a teal `#14b8a6` (coerente col logo).
- `--accent`/`--danger` allineati ai colori semaforo macOS (`#28c840`/`#ff5f57`).
- Font Manrope (titoli) + IBM Plex Sans (corpo) + IBM Plex Mono (stato runtime)
  da Google Fonts via `<link>` in `<head>` — degrado automatico ai font di
  sistema se il CDN non è raggiungibile (stesso tipo di rischio già accettato
  per xlsx/pdf.js, vedi punto 7).
- Ho dovuto correggere a mano tutti gli sfondi **hardcoded in bianco/chiaro**
  che nel tema originale andavano bene ma nel tema scuro sarebbero rimasti
  illeggibili: input/textarea/select, `.btn-secondary`, `.btn-danger`, chip,
  badge, `.warn-box`/`.error-box`, `.field-missing`, dropzone, modale storico,
  card file caricati. Ho anche aggiunto un override `@media print` che forza
  il modale a sfondo bianco/testo nero in stampa, indipendentemente dal tema
  scuro a schermo (altrimenti la stampa della scheda lead sarebbe uscita con
  sfondo scuro, spreco di inchiostro e poco leggibile su carta).
- Aggiunto disclaimer "© Designed and krafted by Momandis David Vannini" in
  fondo alla sidebar (stesso testo esatto usato in "Suggerimenti Vendita").
- **Non ancora visto in un vero browser** (solo verificato via jsdom che il
  markup/CSS non generi errori e che le regole non abbiano più sfondi bianchi
  hardcoded) — da controllare a occhio la resa reale, in particolare contrasto
  testo/sfondo e il caricamento dei font Google.

### 9quinquies. Avvio in Chrome "a finestra intera" (non fullscreen)

Creato `apri-console.command` (nella radice del progetto, eseguibile) che apre
`src/lead-rework-console.html` con `open -a "Google Chrome" --args --app="file://..." --start-maximized`:
modalità "app" di Chrome (niente barra indirizzi/tab, controlli nativi macOS
inclusi i pulsanti semaforo — stesso effetto visivo di "Suggerimenti Vendita",
che invece è una vera app nativa con un proprio wrapper Python/pywebview, non
replicato qui). Doppio clic per avviare; la prima volta macOS potrebbe
richiedere di confermare con tasto destro → Apri (Gatekeeper, file non
firmato). Copiato in entrambe le cartelle con permesso di esecuzione (`chmod +x`).
**Non testato su un vero Mac** (l'ho scritto e reso eseguibile qui, ma non ho
modo di lanciare Chrome in questo ambiente per verificarlo davvero).

### 9sexies. Regola di business critica: YesMobility NON ha mai contattato prima i lead

Emerso testando l'integrazione con Suggerimenti Vendita: gli script generati
citavano "l'ultima volta", "avevamo parlato", "la ricontatto" — implicando
una chiamata YesMobility precedente. **Non esiste mai**: YesMobility parte
sempre da zero con ogni lead, anche quando lo stato interno è "trattativa
persa" o "ultimo richiamo" (sono nomi della fase nel CRM/dati del partner,
non di una telefonata YesMobility già fatta). Un secondo problema collegato:
l'AI inventava dettagli non presenti nei dati reali del lead (es. "mi aveva
detto che era una giornata piena di impegni") — se il cliente smentisce un
dettaglio inventato, il lead è compromesso.

Corretto con due nuove regole in cima a `regole_critiche_compliance` (in
`COMPANY_PROFILE_DEFAULT`, `src/lead-rework-console.html`) + riscritti gli
script #4 ("Recupero trattativa persa") e #6 ("Ultimo richiamo") in
`SCRIPT_LIBRARY`, che davano per scontata una chiamata YesMobility già
avvenuta — ora si presentano sempre come primo contatto. Aggiustata anche
l'email #24 di conseguenza.

**Importante**: come per ogni modifica a `COMPANY_PROFILE_DEFAULT`, questo
aggiorna solo il valore di default per installazioni nuove — il profilo
già salvato dall'utente (in `db`/`localStorage`) va aggiornato **a mano**
dalla tab "Profilo Azienda". Le modifiche a `SCRIPT_LIBRARY` invece si
applicano sempre (non è editabile dall'utente, vive solo nel codice).

### 9septies. Obiettivo della chiamata: chiudere la trattativa, non fissare un sopralluogo

Correzione richiesta dall'utente: l'AI tendeva a trattare "fissare un
sopralluogo" come traguardo della telefonata, ma YesMobility è
un'azienda puramente commerciale (non esegue sopralluoghi/installazioni)
e si affida ai partner locali (es. Facile Salire) per portare il
contatto fino alla chiusura vera e propria. Il sopralluogo va quindi
proposto solo come passo successivo a un cliente che ha già detto sì,
mai come sostituto della chiusura.

Corretto in due punti di `src/lead-rework-console.html`:
- `buildSystemPrompt()`: aggiunta una riga "OBIETTIVO PRIMARIO DI OGNI
  SCRIPT" **hardcoded** (non nel profilo utente) subito dopo la riga di
  apertura del system prompt — si applica sempre, senza bisogno che
  l'utente tocchi "Profilo Azienda" (a differenza delle regole di
  compliance, che vivono nel profilo salvabile).
- `COMPANY_PROFILE_DEFAULT.value_proposition`: aggiunta una voce sul
  posizionamento internazionale di YesMobility ("Realtà internazionale:
  grazie a importanti accordi quadro con i produttori, acquista in
  grandi quantità ottenendo sconti importanti, trasferiti al cliente in
  quotazioni vantaggiosissime"). Questa invece è un campo del profilo
  utente-editabile (tab "Profilo Azienda" → "Value proposition"): come
  sempre, il default di codice non retroagisce sul profilo già salvato,
  va aggiunta a mano se si vuole che compaia anche lì.

### 9octies. Le regole di compliance più critiche ora sono HARDCODED, non più solo nel profilo

Dopo 9sexies l'utente ha testato di nuovo e ha ricevuto ancora uno script
che violava le stesse regole in modo grave: "La ricontatto per la
richiesta di montascale per suo suocero... ricordo che l'ultima volta
era stato sommerso di chiamate..." — contatto precedente inventato,
dettaglio/stato d'animo del cliente inventato, e rivelazione di
un'informazione interna (il beneficiario "suocero") mai detta dal
cliente in quella telefonata.

Causa: le regole vivevano solo in `COMPANY_PROFILE_DEFAULT.regole_critiche_compliance`,
un campo del profilo **salvato dall'utente nel browser** — se il profilo
già salvato non viene aggiornato a mano dalla tab "Profilo Azienda" (cosa
facile da dimenticare), l'AI non le vede mai, a prescindere da quante
volte si corregge `COMPANY_PROFILE_DEFAULT` nel codice.

Fix strutturale: aggiunta una nuova costante `HARD_COMPLIANCE_RULES` in
`src/lead-rework-console.html` (subito prima di `SCRIPT_LIBRARY`), **non
editabile e non dipendente dal profilo utente** — si comporta come
`SCRIPT_LIBRARY`, sempre attiva. Contiene 4 regole con esempi VIETATI
reali presi da questo caso (il testo "per suo suocero" e "sommerso di
chiamate" sono citati testualmente come negative example, tecnica più
efficace di una regola astratta). `buildSystemPrompt()` ora:
- inietta `HARD_COMPLIANCE_RULES` in cima al prompt, dichiarate esplicitamente
  con priorità su profilo e libreria script;
- ripete un richiamo di autocontrollo ("ULTIMO CONTROLLO PRIMA DI
  RISPONDERE") subito prima delle istruzioni di output, per sfruttare
  l'effetto recency.

Le due regole equivalenti nel profilo (`regole_critiche_compliance` #1 e
#2 di 9sexies) sono state **rimosse** da `COMPANY_PROFILE_DEFAULT` per
evitare doppioni nel prompt: restano lì solo le regole più "di business"
(non citare Facile Salire, non dire "broker", non dire "non lo
sappiamo", non citare dettagli tecnici del sopralluogo).

**Nessuna azione richiesta all'utente per questa parte**: a differenza
delle modifiche precedenti a `COMPANY_PROFILE_DEFAULT`, questa vive nel
codice e si applica subito, anche con un profilo salvato vecchio.

### 9nonies. Operatività Suggerimenti Vendita: due modalità di chiamata + avviso lead in attesa

Richiesta utente: (1) poter inviare a Suggerimenti Vendita anche un lead
riaperto dallo Storico (non solo appena generato), (2) separare
"Chiamata YesMobility" (solo audio + obiezioni, nessuna guida) da un
nuovo bottone "Chiamata Gestione Lead" (guida/canovaccio importato da
Lead Rework Console + obiezioni), (3) un avviso visivo (bagliore) sul
pulsante "Chiamata Gestione Lead" nel menu principale quando c'è un lead
in attesa non ancora aperto.

**1) Storico → Suggerimenti Vendita** (`src/lead-rework-console.html`):
`buildSuggerimentiVenditaExport`/`sendToSuggerimentiVendita` ora
parametrizzate (nome/prodotto/stato/script) invece di leggere solo
`state.draft`; nuova `exportHistoryItemToSuggerimentiVendita(id)` e
bottone "Invia a Suggerimenti Vendita" nel modale storico
(`renderHistoryModal`).

**2) Due modalità di chiamata** — nuovo parametro URL `avvio` (già
esistente per "Rinforzo Facile Salire") con valore `gestione_lead`:
- `Suggerimenti Vendita.app/Contents/MacOS/avvia`: nuova
  `avvia_chiamata_gestione_lead()` → `avvia_chiamata_comune "gestione_lead"`,
  registrata in `esegui_azione()` e nel menu testuale di fallback.
  **Attenzione**: questo file (dentro il bundle `.app`) non ha un
  equivalente sincronizzato in root — `avvia_sistema.command` è un
  launcher più vecchio e molto più corto (315 righe vs 970), non
  toccato, probabilmente non più in uso.
- `menu/menu_finestra.py` (+ copia in
  `Contents/Resources/progetto/menu/`): nuova azione valida
  `avvia_chiamata_gestione_lead` in `AZIONI_VALIDE`.
- `menu/index.html` (+ copia bundle): nuovo bottone viola "Chiamata
  Gestione Lead" (`id="btn-gestione-lead"`) sotto "Chiamata YesMobility".
- `browser-extension/suggerimenti-vendita-content.js` (LEADREWORKS, non
  Suggerimenti Vendita): `consegnaCanovaccioInAttesa()` ora mostra (e
  consuma) il canovaccio in attesa **solo se** `?avvio=gestione_lead`
  nell'URL della pagina — altrimenti lo lascia intatto in
  `chrome.storage.local` per la prossima apertura in quella modalità.
  Così "Chiamata YesMobility" resta sempre "sola gestione telefonata",
  senza rischio di consumare per sbaglio un lead in attesa.

**3) Avviso "lead in attesa"** — nuovo canale, indipendente dalla
consegna vera del canovaccio (che resta 100% lato browser via
`chrome.storage.local`):
- `server/server_suggerimenti.py` (+ copia bundle): nuovo endpoint HTTP
  `/lead-in-attesa` su `_GestoreOverlaySenzaCache` (stessa porta 8766
  dell'overlay) — `POST` imposta il nome del lead in attesa (variabile
  modulo `_LEAD_IN_ATTESA`), `GET` lo restituisce, `DELETE` lo azzera,
  `OPTIONS`/CORS per sicurezza (anche se i chiamanti reali — service
  worker dell'estensione e `urllib` in Python — non ne hanno strettamente
  bisogno).
- `browser-extension/background.js`: nel gestore
  `leadSentToSuggerimentiVendita`, oltre alla logica esistente, un
  `fetch` POST best-effort a `/lead-in-attesa` col nome del lead.
- `browser-extension/suggerimenti-vendita-content.js`:
  `consegnaCanovaccioInAttesa()`, dopo aver mostrato davvero il
  canovaccio (quindi solo in modalità `gestione_lead`), manda un
  `DELETE` a `/lead-in-attesa` per spegnere l'avviso.
- `menu/menu_finestra.py`: nuovo thread `avvia_polling_lead_in_attesa`,
  interroga `/lead-in-attesa` ogni 3s con `urllib.request` (timeout
  1.5s) e chiama `impostaLeadInAttesa(bool)` nella pagina via
  `evaluateJavaScript`; `menu/index.html` ha la funzione JS
  corrispondente + CSS `.lead-in-attesa` (bagliore pulsante, animazione
  `bagliore-lead`).

**Limite noto, accettato consapevolmente**: il server locale (porta
8766) parte solo alla PRIMA chiamata della sessione
(`assicura_server_pronto` in `Contents/MacOS/avvia`). Se l'operatore
esporta un lead da Lead Rework Console PRIMA di aver mai avviato una
chiamata in quella sessione, il `POST /lead-in-attesa` fallisce
silenziosamente (server non ancora su) e il bagliore non si accende —
il lead resta comunque in attesa in `chrome.storage.local` e verrà
mostrato normalmente alla prima apertura di "Chiamata Gestione Lead",
semplicemente senza preavviso visivo per quella primissima volta della
sessione.

**Non fatto in questo giro** (a bassa priorità, non richiesto): non ho
toccato `overlay/index.html` (non serve: il filtro per modalità vive
solo nel content script dell'estensione) né aggiornato `README.md` di
Suggerimenti Vendita con la nuova modalità/endpoint.

**Nota (2026-09-18)**: la cartella del progetto Suggerimenti Vendita in
questo ambiente di sviluppo è stata spostata/rinominata da
`/root/progetti/SuggeritoreVendite/sales-ai-assistant v2/` a
`/root/progetti/SUGGERIMENTIVENDITA/` (struttura piatta, come sul Mac
dell'utente: `/Users/davidvannini_1/Documents/progetti/SUGGERIMENTIVENDITA/`).
Aggiornare questo riferimento se in futuro si ritrova il vecchio percorso
citato altrove.

### 9decies. Due correzioni operative (2026-09-18)

**1) Script ancora con chiusura "prenota sopralluogo" invece di chiudere
la trattativa** — l'utente ha rimandato lo stesso script già visto in
9octies (identico, quindi probabilmente non ancora rigenerato con la
versione corretta), segnalando stavolta il problema della chiusura:
"Se per lei va bene, possiamo fissare già una data indicativa per il
sopralluogo... Le andrebbe bene [Data], mattina o pomeriggio?" invece di
provare a chiudere la vendita. La riga prosa "OBIETTIVO PRIMARIO" in
`buildSystemPrompt()` (aggiunta prima di 9octies) evidentemente non
bastava da sola — stesso principio già visto per le regole di
compliance: una frase isolata pesa meno di una voce di
`HARD_COMPLIANCE_RULES` con esempio VIETATO concreto. Spostata quindi
dentro `HARD_COMPLIANCE_RULES` (ora 5 regole) come nuova voce con
l'esempio reale di questo caso; rimossa la riga prosa duplicata;
aggiornato il testo "ULTIMO CONTROLLO" (ora "tutte e 5").
**Nessuna azione richiesta oltre a ricopiare `lead-rework-console.html`**
(regola hardcoded, non nel profilo).

**2) "Invia a Suggerimenti Vendita" non apriva l'app** — prima il click
preparava solo i dati in `chrome.storage.local`, senza segnale visibile:
l'operatore doveva aprire l'app a mano. Aggiunto uno schema URL
personalizzato (`suggerimentivendita://`) registrato in
`Suggerimenti Vendita.app/Contents/Info.plist`
(`CFBundleURLTypes`/`CFBundleURLSchemes`), gestito da un nuovo metodo
`application_openURLs_` in `DelegatoApp` (`menu/menu_finestra.py`, +
copia bundle) che porta la finestra del menu in primo piano (avvia
l'app da sé se non era già aperta — comportamento standard macOS per
gli URL scheme registrati). Lato Lead Rework Console, `sendToSuggerimentiVendita()`
ora chiama anche `apriSuggerimentiVendita()` (nuova funzione,
`src/lead-rework-console.html`): crea un link invisibile con quell'href
e lo clicca via JS (non `window.location`/`window.open`, per non
rischiare di navigare via dalla pagina se lo schema non fosse
registrato). Il bagliore su "Chiamata Gestione Lead" arriva da solo
tramite il polling già esistente (9nonies), entro ~3s dall'apertura.

**Non testato dal vivo** (nessun modo di testare AppKit/PyObjC/schemi
URL macOS da qui): la prima volta Chrome dovrebbe mostrare un avviso
"Apri Suggerimenti Vendita.app?" da confermare — se non succede nulla al
click, verificare prima che l'estensione e l'app siano aggiornate
entrambe, poi eventualmente il Console log di Chrome per errori sul
click del link `suggerimentivendita://`.

**Bug trovato dal vivo e risolto**: al primo test, `open
"suggerimentivendita://apri"` da Terminale falliva con "No application
knows how to open URL ... kLSApplicationNotFoundErr" — macOS non aveva
mai registrato lo schema presso Launch Services (la registrazione
automatica al lancio non è scattata la primissima volta che
`CFBundleURLTypes` è comparso nell'Info.plist). Risolto manualmente
dall'utente con:
```
/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister -f "<path>/Suggerimenti Vendita.app"
```
Per non richiedere questo passaggio manuale ad ogni installazione/spostamento
futuro, ho aggiunto la stessa chiamata (in background, non bloccante)
in cima a `Contents/MacOS/avvia` — gira ad ogni avvio dell'app, costo
trascurabile, self-healing se la registrazione si perde di nuovo (es.
dopo aver spostato la cartella). **Nessuna azione richiesta oltre a
ricopiare `Contents/MacOS/avvia`** aggiornato.

**Bug #2 trovato dal vivo**: con l'app già aperta, ri-cliccare "Invia a
Suggerimenti Vendita" ne apriva una SECONDA istanza invece di riusare
quella esistente. Causa probabile: `tenta_menu_grafico()` in
`Contents/MacOS/avvia` lanciava `menu_finestra.py` come processo FIGLIO
di bash (`"$PY" "$MENU_GRAFICO" ...`), quindi il processo che Launch
Services traccia come "l'eseguibile del bundle" (`CFBundleExecutable` =
`avvia`) restava lo script bash — che non ha nessun modo di ricevere un
evento URL/AppleEvent (solo l'NSApplication dentro Python lo sa fare).
Risultato: Launch Services non riconosceva "l'app è già in ascolto" e ne
apriva una seconda copia da zero ad ogni `open suggerimentivendita://`.
Corretto sostituendo la chiamata con `exec "$PY" "$MENU_GRAFICO" ...`:
`exec` sostituisce il processo bash con python MANTENENDO LO STESSO PID,
così diventa quel processo (non un suo figlio) ad essere
riconosciuto/instradato da Launch Services. Effetto collaterale
accettato: la funzione non può più controllare l'exit code di python
dopo (con `exec` non si torna più allo script se l'exec riesce), quindi
il ripiego sul menu testuale copre ormai solo il caso "PyObjC non
installato" (controllato PRIMA dell'exec, invariato), non più un
eventuale crash di Python subito dopo l'avvio — caso raro, in pratica
mai osservato finora.

**Non testato dal vivo** (stesso limite di sempre: nessun modo di
testare comportamento Launch Services/singleton da qui) — se il
problema persiste dopo questa modifica, il prossimo passo sarebbe un
meccanismo esplicito a lock-file (PID del menu in
`logs/menu.pid` + un marker file che il loop di polling già esistente,
`avvia_polling_lead_in_attesa`, controlla per portarsi in primo piano da
solo), più affidabile perché non dipende dal comportamento esatto di
Launch Services.

**Bug #1 segnalato, non ancora indagato**: il bottone "Chiamata
Gestione Lead" non si accende. Sospetto principale (documentato anche in
9nonies): il bagliore dipende dal server locale (porta 8766), che parte
SOLO alla prima chiamata effettiva della sessione
(`assicura_server_pronto`) — se l'utente non ha ancora avviato nessuna
chiamata (nessuno dei 3 bottoni), il server non è in ascolto e
`/lead-in-attesa` fallisce silenziosamente sempre, quindi il bagliore
non può mai accendersi. Non confermato con l'utente. Se confermato, è un
limite di design serio (il bagliore dovrebbe funzionare proprio PRIMA
della prima chiamata, è il momento in cui serve di più) — eventuale
fix futuro: avviare il server (solo HTTP/WebSocket, non il caricamento
del modello di matching) all'apertura dell'app stessa, non alla prima
chiamata. Non fatto in questo giro, servirebbe capire prima se
`MotoreSuggerimenti()` (che carica il modello, ~15s) è disaccoppiabile
dall'avvio dei soli server HTTP/WS senza modifiche più invasive.

### 9undecies. Bagliore riprogettato: server dedicato nel menu (porta 8767), non più legato alla chiamata

L'utente ha confermato ed è stato esplicito: "il bagliore serve a far
capire che sono arrivati dati da Lead Rework e che sono in attesa per
avviare la chiamata" — cioè deve funzionare PRIMA della prima
telefonata, non dopo. Il design precedente (endpoint `/lead-in-attesa`
dentro `server_suggerimenti.py`, porta 8766) dipendeva proprio da quella
prima chiamata per esistere: sbagliato alla radice, non solo da patchare.

**Fix**: spostato l'endpoint `/lead-in-attesa` (POST/DELETE/OPTIONS, niente
più GET: nessuno lo legge dall'esterno) in un mini `http.server.ThreadingHTTPServer`
tutto interno a `menu_finestra.py`, porta **8767**, avviato da
`avvia_server_lead_in_attesa()` in `main()` insieme alla creazione della
finestra — quindi vivo per tutta la durata in cui l'app è aperta,
indipendentemente da qualsiasi chiamata. Rimosso completamente
l'endpoint gemello da `server/server_suggerimenti.py` (porta 8766),
ormai morto. `avvia_polling_lead_in_attesa` non fa più una richiesta
HTTP ogni 3s: legge direttamente la variabile `_LEAD_IN_ATTESA` in
memoria (stesso processo), ogni 1s, praticamente gratis.

**Lato estensione**: `background.js` puntava a 8766, ora al posto suo è
`console-content.js` a notificare la porta 8767 — e non a caso: la POST
deve essere ritentata per qualche secondo (l'app si sta aprendo proprio
in quel momento, vedi 9decies punto 2, e può metterci un po'), e un
`setTimeout` dentro un service worker Manifest V3 **non è affidabile**
(Chrome può sospenderlo prima che scatti). Un content script iniettato
in una pagina normale (la console) non ha questo problema — è lì che
vive ora `notificaLeadInAttesaConRitentativi()` (8 tentativi, 1.5s di
distanza, ~12s di finestra totale). `suggerimenti-vendita-content.js`
(la DELETE che spegne il bagliore quando il canovaccio viene davvero
mostrato) aggiornata anch'essa da 8766 a 8767.
`browser-extension/manifest.json`: aggiunto `http://localhost:8767/*`
agli host_permissions.

**Non testato dal vivo** (bagliore + ritentativi + timing reale
dell'apertura dell'app): possibile che 12s non bastino su un Mac lento
al primissimo avvio a freddo dell'app — se il bagliore non si accende
mai nonostante l'app si apra, aumentare `tentativiRimasti` in
`console-content.js` è il primo posto da guardare.

### 9duodecies. "Chiamata Gestione Lead" mostrava sempre un canovaccio vecchio, mai quello appena inviato

Causa trovata: `gestore_overlay()` in `server/server_suggerimenti.py`
aveva ancora attivo il meccanismo A FILE, precedente all'estensione
browser (documentato in passato come "superato ma innocuo" — **non era
innocuo**). Ad ogni connessione WebSocket, se esisteva
`RADICE_PROGETTO/lead-corrente.json` (il file che l'utente scaricava e
posizionava a mano PRIMA che esistesse l'estensione), il suo
`canovaccio.testo` veniva mandato all'overlay **incondizionatamente**,
per QUALSIASI modalità di chiamata (anche "Chiamata YesMobility", che
deve restare senza canovaccio) — e soprattutto SEMPRE, ignorando
qualunque nuovo lead inviato dall'estensione via
`chrome.storage.local`: se quel file esisteva da un vecchio test, il
suo contenuto vinceva per sempre su tutto il resto.

**Fix**: rimossi del tutto `PATH_LEAD_CORRENTE`, `_carica_lead_corrente()`
e il loro uso in `gestore_overlay()` — il canovaccio di un lead
specifico viaggia ora SOLO lato browser (`chrome.storage.local` +
`suggerimenti-vendita-content.js`, coerente con 9nonies/9decies), il
server non c'entra più nulla con quella parte. Se sul Mac dell'utente
esiste ancora un `lead-corrente.json` dentro
`Suggerimenti Vendita.app/Contents/Resources/progetto/`, ora è
semplicemente ignorato (nessuna azione necessaria per rimuoverlo, ma si
può eliminare per pulizia).

### 9terdecies. Layout a 3 colonne fisse (uniformità estetica)

Richiesta esplicita dell'utente, con schizzo a mano: le 3 finestre del
sistema (Lead Rework Console, menu Suggerimenti Vendita, pannello
chiamata) erano eterogenee — due "chromeless" (Chrome app-mode) e una
tab normale di Chrome con barra indirizzi/tab visibili, dimensioni e
posizioni tutte diverse. Fase di discussione prima di toccare codice
(rispettata: l'utente ha chiesto esplicitamente di aspettare il via
libera), poi implementato lo schema concordato: schermo diviso in 3
colonne uguali, stessa larghezza/altezza, affiancate, ciascuna
riposizionata da sola ogni volta che si apre — niente trascinamento a
mano.

**Colonna 1 (sinistra) — Lead Rework Console** (`apri-console.command`
+ `browser-extension/background.js`, `openNewConsoleWindow`/branch
"scheda già aperta"): entrambi ora calcolano dinamicamente la geometria
(niente pixel fissi indovinati) — lo script bash via
`osascript 'tell application "Finder" to get bounds of window of desktop'`,
l'estensione via `chrome.system.display.getInfo()` (nuovo permesso
`system.display` in `manifest.json`). Helper condiviso lato estensione:
`calcolaRettangoloColonna(numeroColonna, callback)`.

**Colonna 2 (centro) — menu Suggerimenti Vendita** (`menu_finestra.py`):
nuova `calcola_rettangolo_colonna(numero_colonna)`, usa
`NSScreen.mainScreen().visibleFrame()` (esclude già barra menu/Dock,
niente conversione di coordinate necessaria: PyObjC/Cocoa la gestisce da
sé). Tolto `finestra.center()` (tenuto solo come fallback se
`NSScreen.mainScreen()` è `None`, caso limite).

**Colonna 3 (destra) — pannello chiamata** (`Contents/MacOS/avvia`,
`avvia_chiamata_comune`): prima apriva una tab normale (`open "$url"`),
ora Chrome in modalità app (`open -na "Google Chrome" --args --app="$url"
--window-position=... --window-size=...`) — stesso trucco già usato da
`apri-console.command`, stessa geometria calcolata via `osascript`.
Effetto collaterale positivo: anche visivamente diventa "chromeless"
come le altre due, non solo posizionata correttamente.

**Non testato dal vivo** (geometria reale schermo, comportamento di
`--window-position`/`--window-size` con la versione Chrome installata,
`bounds of window of desktop` che potrebbe non escludere esattamente
Dock/barra menu su ogni configurazione): l'utente stesso ha accettato
questo rischio in fase di discussione ("non ho modo di testarlo da
qui"). Primo giro di verifica dal vivo ancora da fare — è probabile
serva un aggiustamento fine sui pixel, specialmente se il Dock è
posizionato a sinistra/destra invece che in basso (in quel caso l'area
utile non è più un rettangolo pulito a piena larghezza e il calcolo
andrebbe rivisto).

**Aggiornamento (stesso giorno, dopo il primo test dal vivo)**: la
prima versione (3 colonne uguali) funzionava ma l'utente ha chiesto
proporzioni diverse via screenshot del test reale — Lead Rework Console
40%, menu Suggerimenti Vendita 15%, pannello chiamata 40% (95% totale,
5% di margine a destra non usato, si vede lo sfondo/desktop). Cambiato
in tutti e 3 i punti:
- `apri-console.command`: `COL_W = SCREEN_W * 40 / 100`, offset 0 (invariato)
- `Contents/MacOS/avvia`: `col_w = screen_w * 40/100`, `col_x = screen_w * 55/100` (40+15)
- `menu_finestra.py`: `calcola_rettangolo_colonna` → rinominata
  `calcola_rettangolo_finestra()` (non più generica su "colonna N di 3
  uguali", ora usa le costanti `LARGHEZZA_FRAZIONE = 0.15` e
  `OFFSET_FRAZIONE = 0.40`); stessa ristrutturazione lato estensione
  (`background.js`: `calcolaRettangoloColonna` → `calcolaRettangoloFinestra`,
  costanti `LARGHEZZA_FRAZIONE_LEAD_REWORK`/`OFFSET_FRAZIONE_LEAD_REWORK`).

**Anche rimosso**: `finestra.setLevel_(NSFloatingWindowLevel)` in
`menu_finestra.py` — l'utente ha segnalato dallo screenshot che il menu
di Suggerimenti Vendita restava sempre sopra le altre due finestre
anche quando si sovrapponevano; tolto, ora si comporta come una
finestra normale (va in primo piano solo quando cliccata/attivata,
come le altre due). Rimosso anche l'import `NSFloatingWindowLevel`,
non più usato da nessuna parte.

## 10. Come riprendere

Vedi anche il file di memoria del progetto (se disponibile nella nuova sessione): `project_leadreworks`, `feedback_report_changed_files`, `feedback_lead_with_actionable_step` — contengono le stesse preferenze operative dell'utente (riportare sempre i percorsi esatti dei file modificati; essere diretti, azione prima della spiegazione tecnica).
