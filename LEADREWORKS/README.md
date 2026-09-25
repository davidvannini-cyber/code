# LEADREWORKS — YesMobility Lead Rework Console

Webapp ad uso singolo operatore per generare script operativi
(telefono / WhatsApp / email) personalizzati per il rework dei lead
YesMobility, in base allo stato del lead nel funnel.

## Documentazione
Vedi `docs/YesMobility-LeadRework-Specifica.md` per la specifica
funzionale e tecnica completa: profilo azienda, stati del lead,
libreria script, flusso utente, struttura dati, capacità runtime.

## Struttura cartelle
- `docs/`        — specifica funzionale e materiale di riferimento
- `src/lead-rework-console.html` — **artifact finale**, file HTML unico e autonomo da incollare come Claude Artifact
- `src/data/`    — libreria dei 25 script YesMobility e profilo azienda di default, in JSON (stessi contenuti incorporati nell'HTML: qui servono da sorgente leggibile/manutenibile)
- `src/components/` — non usata (l'artifact è un unico file, niente build step)
- `assets/`      — eventuali risorse statiche (loghi, icone)
- `browser-extension/` — estensione browser (prototipo) che importa i dati del lead direttamente dal CRM proprietario "Facile Salire" nella console, vedi sezione dedicata sotto

## Import diretto dal CRM (estensione browser, prototipo)
Alternativa all'upload manuale di screenshot: un'estensione browser legge i dati
del lead già presenti nella pagina di dettaglio del CRM Facile Salire e li invia
automaticamente alla console, con un solo clic.

**Come funziona:** il CRM (basato su Inertia.js) carica tutti i dati della pagina
lead — anagrafica, attività, offerte, note — già in un blocco `<script
type="application/json" data-page="app">`, indipendentemente da quale tab
(Attività/Offerte/Note/...) sia aperto. L'estensione:
1. Aggiunge un pulsante galleggiante ("📤 Invia a Lead Rework Console") sulle
   pagine `https://app.facilesalire.it/leads/*` (`crm-content.js`).
2. Al clic, legge quel blocco JSON e ne estrae i campi mappati sui campi della
   console (nome, zona, note, storico contatti, prezzo esistente, motivazione
   rifiuto, data/orario appuntamento, indirizzo, categoria prodotto), li scrive
   in `chrome.storage.local` e avvisa il background script.
3. Il background script (`background.js`) porta in primo piano la scheda della
   console se è già aperta e la avvisa di leggere i dati in attesa; se non è
   aperta in nessuna scheda, ne apre una nuova lui stesso (percorso fisso in
   `CONSOLE_FALLBACK_URL` dentro `background.js` — da aggiornare se la cartella
   del progetto viene spostata sul Mac dell'utente).
4. Il content script sulla console (`console-content.js`) consegna i dati alla
   pagina via `window.postMessage` (gira in un "isolated world" separato, non
   può chiamare le funzioni della pagina direttamente); la console li riceve
   tramite un listener in `lead-rework-console.html` e chiama `applyCrmImport()`
   — la stessa funzione usata anche dal pulsante manuale "Incolla dati dal CRM
   (dagli appunti)" presente nella sezione 1 della tab Nuovo Lead, utile come
   fallback/debug senza l'estensione installata.

**Installazione (una tantum):** `chrome://extensions` → attivare "Modalità
sviluppatore" → "Carica estensione non pacchettizzata" → selezionare la
cartella `browser-extension/`. **Importante:** per far funzionare la scheda
della console (aperta da file locale, `file://...`), va anche attivata
l'opzione "Consenti accesso agli URL di file" nei dettagli dell'estensione,
altrimenti `console-content.js` non viene mai iniettato e i dati restano in
attesa senza che nulla succeda visibilmente.

**Mappatura campi e limiti noti:**
- **Stato lead e obiezioni trasversali NON vengono dedotti dal CRM** (sono
  categorie proprie di YesMobility, senza equivalente nel CRM): restano da
  scegliere a mano, con la stessa evidenziazione ambrata usata per l'estrazione
  AI dai file.
- **Motivazione rifiuto**: presa dal campo strutturato `lost_reason`
  dell'offerta quando presente; se vuoto, resta vuota (evidenziata ambrata) —
  non viene dedotta euristicamente dal testo libero delle note, per evitare
  errori silenziosi.
- **Appuntamento**: preso dall'attività di tipo "Visita" più recente (passata o
  futura); se ce ne sono più di una, va verificata la scelta.
- **Categoria prodotto**: il CRM gestisce modelli specifici (es. "Handicare
  H4000"), la console solo 3 categorie generiche (Montascale/Pedana/Elevatore).
  L'abbinamento è per parole chiave/marchio noto, "a migliore sforzo": va
  sempre controllato, specialmente per prodotti/marchi non ancora visti.
- **Pagine SPA senza ricarica**: se l'operatore naviga da un lead all'altro
  dentro il CRM senza un refresh completo della pagina (navigazione
  client-side Inertia), il blocco JSON può restare quello del lead precedente.
  `crm-content.js` confronta l'ID del lead nei dati con l'ID nell'indirizzo
  della pagina; se non combaciano, blocca l'invio e avvisa di premere F5
  (provato un ricaricamento automatico della pagina al posto dell'avviso: ha
  causato un loop di refresh continui sul CRM reale, è stato tolto — resta
  solo il controllo/avviso, il refresh va fatto a mano).
- **Non ancora testato dal vivo** contro il CRM reale: la logica di
  estrazione è stata scritta a partire da un esempio di pagina fornito
  dall'utente (codice sorgente HTML reale, non solo screenshot), ma va
  validata su più lead reali prima di fidarsene in produzione.

## Origine della libreria script
Il PDF `SCRIPT_YesMobility.pdf` citato nella specifica non era disponibile nel
filesystem. La libreria dei 25 script in `src/data/script-library.json` è stata
ricostruita adattando i 17 script reali trovati nel progetto correlato
`SUGGERIMENTIVENDITA/schema/esempio-libreria-script.json`
(stesso tono, stessi partner, stesse regole di compliance) e completata fino a
25 per coprire tutti i canali (telefono/WhatsApp/email) richiesti dalla tabella
stati-lead della specifica (sezione 3). Se in futuro il PDF originale diventa
disponibile, va usato per sostituire/validare questi contenuti.

## Note importanti per lo sviluppo
- L'output finale è `src/lead-rework-console.html`: un file HTML autonomo
  (nessuna dipendenza esterna obbligatoria), pensato per essere pubblicato
  come Claude Artifact.
- Usa le capacità runtime `db` (storage profilo azienda + storico lead) e
  `sample` (generazione script, eventuale interpretazione screenshot). Le
  firme esatte di queste API non sono pubblicamente documentate in modo
  verificabile al momento dello sviluppo: il codice le richiama nella forma
  più standard ipotizzabile (`window.claude.db.get/set`, `window.claude.sample`
  con fallback su `window.claude.complete`) mediante adapter difensivi in
  `dbGet`/`dbSet`/`callSample`, con fallback automatico su `localStorage` e su
  bozze da libreria quando l'API AI non è disponibile o fallisce. **Una volta
  incollato nel vero ambiente Claude Artifact, verificare che queste chiamate
  corrispondano all'API reale e correggerle se necessario** — è il principale
  rischio aperto di questa implementazione.
- Testato funzionalmente fuori dal browser con jsdom (Node): rendering,
  cambio stato lead con canali multipli, toggle obiezioni, generazione con
  fallback locale, salvataggio/apertura/duplicazione storico, salvataggio
  profilo, upload multiplo di file e estrazione dati, fallback via API key
  diretta, import PDF (con mock di pdf.js/canvas) — nessun errore. Da
  verificare a mano in un vero browser/artifact il rendering reale di
  immagini/PDF (canvas non emulabile in jsdom) e l'import Excel via SheetJS.
- I file PDF vengono convertiti pagina per pagina in immagini JPEG (max 5
  pagine, per contenere tempi e dimensioni) e trattati come screenshot:
  l'interpretazione del contenuto passa quindi dall'AI via `sample()`/API key,
  non da un'estrazione testuale del PDF. Libreria usata: pdf.js **3.11.174**
  da cdnjs — versione fissata di proposito: dalla 4.x pdf.js distribuisce solo
  moduli ES e non espone più `window.pdfjsLib` con un semplice `<script>`.
- Utente singolo: non serve gestione multi-utente o permessi complessi.

## Test locale con API key Anthropic (bring your own key)
Poiché `window.claude` esiste solo quando l'HTML è aperto come Artifact dentro
claude.ai, aprendo il file direttamente in un browser locale le funzioni AI
(`sample`, interpretazione screenshot) non hanno alcun runtime a cui appoggiarsi.
Per poterle comunque testare in locale, nella tab **Profilo Azienda** è stata
aggiunta una card "Impostazioni AI (opzionale)" dove si può incollare una
API key Anthropic personale: se presente, `callSample()` la usa come terzo
fallback (dopo `window.claude.sample` e `window.claude.complete`), chiamando
direttamente `https://api.anthropic.com/v1/messages` dal browser con l'header
documentato `anthropic-dangerous-direct-browser-access: true` (pattern
ufficiale "bring your own API key" per tool client-side). La chiave è salvata
solo in `localStorage` del browser e non viene mai inviata altrove.
**Attenzione:** una chiave incollata così è visibile in chiaro nella pagina e
negli strumenti sviluppatore del browser — va trattata come credenziale
personale, non va condivisa insieme al file HTML, e va rimossa con il tasto
"Rimuovi chiave" se il file viene passato ad altri o pubblicato.
