# Sistema di suggerimenti AI live per chiamate di vendita

Guida passo-passo per mettere in piedi tutto il sistema, dall'hardware (già
confermato funzionante) al software completo.

## Due modi per usare il sistema

- **"Suggerimenti Vendita.app"** — un'app vera e propria, senza terminale.
  Il menu principale è una **finestra grafica con pulsanti cliccabili**
  (icona, titolo, descrizione per ognuno), non una lista di frasi; le
  singole azioni (aggiungere uno script, configurare le API key, ecc.)
  continuano a usare finestre di dialogo per testo/liste/conferme dove
  serve. È il modo consigliato per l'uso quotidiano.
  **È autosufficiente**: contiene al suo interno una copia di tutto il
  codice (`audio-capture/`, `matching-engine/`, `server/`, `schema/`,
  `overlay/`, `menu/`), quindi puoi spostarla ovunque — anche solo lei,
  senza il resto della cartella — per esempio dentro **Applicazioni**, come
  una normale app Mac. Resta lì pronta da riaprire quando serve.

  Il menu grafico richiede le dipendenze in `menu/requirements.txt`
  (installate da "Configura ambiente"): **al primissimo avvio, prima di
  averle installate, l'app mostra automaticamente il vecchio menu a lista**
  — è normale, non un errore; dal secondo avvio in poi (dopo aver fatto
  "Configura ambiente" dalla lista) vedrai il menu grafico.
- **`avvia_sistema.command`** — versione a terminale, con più dettagli/log a
  video e il vecchio menu numerato. Utile se qualcosa non funziona nell'app
  e vuoi vedere cosa succede passo-passo (vedi "Risoluzione problemi" in
  fondo). **Attenzione**: è una versione più vecchia del launcher
  dell'app (`Contents/MacOS/avvia`) e non ne ha tutte le funzioni (niente
  modalità "Chiamata Gestione Lead", niente disposizione automatica delle
  finestre). Usa le cartelle sorgenti qui accanto (`audio-capture/`, `server/`,
  ecc.), **non** la copia dentro l'app — quindi questo script deve restare
  nella cartella principale del progetto, allo stesso livello di
  `audio-capture/`, `server/`, ecc.

I due modi non condividono gli stessi `.env`/`venv/`/`logs/`: l'app li tiene
dentro di sé (`Suggerimenti Vendita.app/Contents/Resources/progetto/`), lo
script da terminale li tiene qui nella cartella principale. Se usi entrambi,
va fatto il setup ("Configura ambiente" + "Configura API key") una volta per
ciascuno.

## Installazione come vera app Mac (consigliato)

Per ottenere l'esperienza classica — un file `.dmg` che, aperto, mostra
l'icona dell'app da trascinare nella cartella Applicazioni — apri con
doppio click:

```
Crea Installer.app
```

**Mai un terminale**: come "Suggerimenti Vendita.app", mostra solo dialoghi
(un avviso all'inizio, uno alla fine con l'esito). Se preferisci vedere
l'avanzamento passo passo in chiaro, usa invece `crea_installer.command`
(stessa cosa, ma a terminale) — utile solo per debug.

Il risultato in entrambi i casi è `Suggerimenti Vendita.dmg` in questa
cartella. Aprilo, trascina "Suggerimenti Vendita" sopra "Applicazioni": da
quel momento l'app vive in Applicazioni come qualsiasi altra, pronta da
riaprire (Launchpad, Spotlight, Dock) senza bisogno di questa cartella del
progetto.

Ripeti l'operazione ogni volta che modifichi il codice sorgente qui e vuoi
rigenerare un installer aggiornato: risincronizza automaticamente
`Suggerimenti Vendita.app` con le cartelle sorgenti (sovrascrivendo la
libreria script già dentro l'app con `schema/esempio-libreria-script.json`
di qui — se avevi fatto crescere la libreria usando un'app già installata e
vuoi redistribuirla, copiala prima tu in questo file).

Se "Suggerimenti Vendita.app" (o "Crea Installer.app") si rifiuta di aprirsi
dopo un download/estrazione da zip ("permessi necessari" o "sviluppatore non
identificato"): lancia `ripara_permessi.command` — vedi "Risoluzione
problemi comuni" in fondo.

## Struttura dei file

```
SUGGERIMENTIVENDITA/
├── HANDOFF.md                             # stato del progetto, problemi noti, file da sincronizzare
├── README.md                              # questa guida
├── RIEPILOGO_SISTEMA.md                   # panoramica dell'architettura
├── .gitignore                             # esclude log, cache Python, file macOS e temporanei
├── Suggerimenti Vendita.app/              # app autosufficiente, da aprire con doppio click
│   └── Contents/
│       ├── Info.plist                     # registra anche lo schema URL suggerimentivendita://
│       ├── MacOS/avvia                    # launcher: azioni del menu, avvio chiamate, posizione finestre
│       └── Resources/progetto/            # copia interna di tutto il codice (+ logs/, venv/, .env propri)
├── Crea Installer.app/                    # genera Suggerimenti Vendita.dmg, senza terminale
├── crea_installer.command                 # stessa cosa, a terminale (debug)
├── avvia_sistema.command                  # alternativa da terminale (versione più vecchia, usa le cartelle qui sotto)
├── ripara_permessi.command                # da lanciare se un'app/script si rifiuta di aprirsi
├── schema/
│   ├── schema-libreria-script.json        # JSON Schema per gli script
│   ├── schema-contesto-sessione.json      # JSON Schema per lead + regole operatore
│   ├── esempio-libreria-script.json       # libreria script usata durante le chiamate (17 script)
│   └── canovaccio-rinforzo-facile-salire.json  # canovaccio fisso della modalità "Rinforzo Facile Salire"
├── audio-capture/
│   ├── cattura_audio_stt.py               # cattura da device di sistema + Deepgram (solo test da terminale)
│   └── requirements.txt
├── matching-engine/
│   ├── motore_suggerimenti.py             # retrieval semantico locale + classificatore LLM nei casi ambigui
│   ├── genera_testo_script.py             # scrittura assistita da AI dei nuovi suggerimenti
│   ├── gestione_frasi_raccolte.py         # revisione delle frasi raccolte nelle chiamate
│   └── requirements.txt
├── server/
│   ├── server_suggerimenti.py             # HTTP 8766 (pagina chiamata) + WebSocket 8765, ponte browser → Deepgram → motore
│   ├── contesto-sessione-esempio.json     # lead + regole di esempio
│   └── requirements.txt
├── overlay/
│   ├── index.html                         # pannello chiamata: microfono, selettore ingresso, spia livello, canovaccio, suggerimenti
│   ├── overlay_finestra.py                # usato solo da avvia_sistema.command
│   └── requirements.txt
└── menu/
    ├── index.html                         # menu principale (pulsanti cliccabili, bagliore "lead in attesa")
    ├── menu_finestra.py                   # finestra del menu, smista i click, server "lead in attesa" sulla porta 8767
    ├── " logo-yesmobility.png"            # logo (il nome inizia con uno spazio)
    └── requirements.txt
```

---

## Parte 1 — Hardware (già fatto ✅)

Riepilogo di quanto già confermato funzionante, per riferimento:

- MacBook Air Mid 2015, jack combo TRRS.
- Splitter TRRS→2xTRS lato Mac: l'audio in uscita dal telefono (voce del
  cliente) va sia al **mic-in del Mac** sia al **canale ascolto della cuffia**
  dell'operatore.
- Il **mic-out della cuffia** (voce dell'operatore) va **direttamente al
  telefono**, non passa dal Mac.
- Risultato: il Mac riceve solo la voce del cliente, pulita.

Se non l'hai già fatto, verifica ancora una volta il livello di ingresso in
**Preferenze di Sistema → Suono → Ingresso** prima di iniziare (l'uscita
cuffia del telefono è più "calda" di un mic normale: rischio saturazione).

---

## Parte 2 — Preparazione ambiente software

### 2.1 Python

Serve Python 3.10 o superiore.

```bash
python3 --version
```

Se necessario installalo da [python.org](https://www.python.org/downloads/macos/)
o con Homebrew (`brew install python@3.11`).

### 2.2 Crea un ambiente virtuale unico per tutto il progetto

```bash
cd SUGGERIMENTIVENDITA
python3 -m venv venv
source venv/bin/activate
```

Da questo momento, ogni comando `pip` e `python` va lanciato con l'ambiente
attivato (lo vedi dal prompt che inizia con `(venv)`).

### 2.3 Installa tutte le dipendenze

```bash
pip install --upgrade pip
pip install -r audio-capture/requirements.txt
pip install -r matching-engine/requirements.txt
pip install -r server/requirements.txt
pip install -r overlay/requirements.txt
pip install -r menu/requirements.txt
```

### 2.4 Procurati le due API key necessarie

1. **Deepgram** (Speech-to-Text) — crea un account su
   [deepgram.com](https://deepgram.com), tier gratuito disponibile, copia
   la API key dalla dashboard.
2. **Anthropic** (classificatore LLM) — crea una API key su
   [console.anthropic.com](https://console.anthropic.com).

Salvale come variabili d'ambiente (in questo terminale, o meglio in un file
`.env` dentro `audio-capture/` e `server/` così non devi ripeterle ogni volta):

```bash
export DEEPGRAM_API_KEY="la-tua-chiave-deepgram"
export ANTHROPIC_API_KEY="la-tua-chiave-anthropic"
```

Oppure crea `server/.env` con:
```
DEEPGRAM_API_KEY=la-tua-chiave-deepgram
ANTHROPIC_API_KEY=la-tua-chiave-anthropic
```

---

## Parte 3 — Testare ogni pezzo separatamente (consigliato)

Prima di far girare tutto insieme, verifica ogni componente da solo: se
qualcosa non va, è molto più facile capire dove.

### 3.1 Trova il device audio giusto

```bash
cd audio-capture
python cattura_audio_stt.py --list-devices
```

Cerca nell'elenco il mic-in del Mac collegato allo splitter (di solito è
"MacBook Air Microphone" o simile, ma con lo splitter potrebbe comparire un
device aggiuntivo). Segnati l'indice numerico.

### 3.2 Testa solo cattura audio + trascrizione

Con una chiamata di prova in corso (o semplicemente parlando vicino al
telefono collegato):

```bash
python cattura_audio_stt.py --device <INDICE>
```

Dovresti vedere le trascrizioni apparire a schermo in tempo reale, prima
parziali (`...`) poi finali (`FINALE`). Ferma con Ctrl+C.

### 3.3 Testa solo il motore di matching (senza audio)

```bash
cd ../matching-engine
python motore_suggerimenti.py ../schema/esempio-libreria-script.json ../server/contesto-sessione-esempio.json
```

Ti troverai in un prompt `Cliente>`: scrivi frasi come se fossi il cliente,
ad esempio:

```
Cliente> il vostro concorrente costa meno
  -> [obiezioni] Non svalutare il concorrente. Chiedi cosa include...
```

Prova frasi diverse per verificare che gli script giusti vengano scelti.
Questo è anche il posto giusto per **espandere la libreria script** man
mano che ne scrivi altri, senza dover coinvolgere audio o overlay.

---

## Parte 4 — Far girare il sistema completo

### 4.1 Personalizza il contesto di sessione

Prima di ogni chiamata reale, aggiorna (o duplica) il file
`server/contesto-sessione-esempio.json` con i dati veri del lead che stai
per chiamare e le regole di quella sessione specifica. Lo schema di
riferimento è `schema/schema-contesto-sessione.json`.

### 4.2 Avvia il server

```bash
cd server
python server_suggerimenti.py --contesto contesto-sessione-esempio.json --device <INDICE>
```

Vedrai:
```
Libreria caricata: 17 script.
Lead sessione: Marco Rossi
Server overlay in ascolto su ws://localhost:8765
```

**Nota sui tempi**: prima di questo messaggio, il motore carica in memoria il
modello di embedding — su un Mac non recente può richiedere qualche secondo.
Succede **una sola volta all'avvio**, non ad ogni frase: avvia il server
qualche istante prima di comporre il numero, non durante la chiamata. Una
volta caricato, la scelta dello script è quasi sempre istantanea (lavoro
locale, senza rete); solo nei casi ambigui interviene il classificatore AI,
con una latenza di rete percepibile ma limitata a quei casi.

### 4.3 Il pannello chiamata si apre da solo

Dall'app, ogni pulsante di chiamata apre il pannello (`http://localhost:8766/`)
in **Chrome in modalità app**: una finestra senza barra degli indirizzi né
schede, posizionata da sola nella colonna destra dello schermo (40% della
larghezza, accanto al menu e alla Lead Rework Console). Deve comparire
"connesso" in alto a destra.

Nel pannello:
- **selettore del dispositivo di ingresso**: scegli lo splitter del telefono
  se non è l'ingresso predefinito del Mac, altrimenti il sistema ascolta il
  microfono integrato;
- **spia "Segnale in ingresso"**: se resta ferma mentre il cliente parla, il
  dispositivo scelto non sta ricevendo audio;
- pulsanti **Pausa** e **Termina chiamata**.

**Il riquadro delle frasi mostra solo il cliente**: per come è cablato
l'audio (Parte 1), il Mac riceve solo la sua voce — l'operatore non viene
mai trascritto. Non è quindi una conversazione a due, ma la sequenza delle
frasi del cliente una dopo l'altra; il riquadro lo etichetta esplicitamente
per evitare equivoci.

### 4.4 Fai la chiamata

Da qui in poi il flusso è automatico:

```
voce cliente → mic-in Mac → Deepgram (trascrizione) →
motore di matching (classificatore LLM) → WebSocket → overlay a monitor
```

Per fermare la chiamata, usa **Termina chiamata** nel pannello (dal terminale: Ctrl+C sul server).

---

## Come aggiungere nuovi script alla libreria

Uno "script" è composto da due parti:
- **frasi di esempio del cliente** — quello che il cliente potrebbe dire in
  una certa situazione (es. "il vostro concorrente costa meno"). Sono quelle
  che l'AI usa per riconoscere la situazione, non vengono mai mostrate
  all'operatore.
- **il suggerimento** — il testo che l'AI evidenzia a monitor quando
  riconosce quella situazione.

Dall'app, scegli **"Aggiungi uno script alla libreria"**: ti verrà chiesto,
in ordine, in quale fase della chiamata si usa, quale categoria di obiezione/
situazione lo attiva, un nome breve, il testo del suggerimento (ed
eventualmente un'alternativa), e infine alcune frasi di esempio del cliente
— te le chiede una alla volta, lascia vuoto quando hai finito. Più frasi di
esempio dai (2-5 è un buon numero), meglio l'AI riconosce la situazione
anche quando il cliente si esprime in modo diverso dall'esempio esatto.

Lo script diventa attivo subito, dalla chiamata o dal test successivo: non
serve riavviare nulla. Usa **"Vedi gli script già in libreria"** per
controllare cosa hai già inserito, così eviti doppioni.

**Limite attuale**: le condizioni CRM avanzate (es. "usa questo script solo
per lead enterprise") non sono ancora gestite dai dialoghi — richiedono di
modificare a mano il campo `condizioni_crm` nel file
`schema/esempio-libreria-script.json`, seguendo lo schema in
`schema/schema-libreria-script.json`. Se ti serve spesso, si può aggiungere
anche questo ai dialoghi dell'app.

## Come far crescere la libreria facendo le chiamate

Ogni chiamata reale genera frasi nuove del cliente. Il sistema le salva
automaticamente (in `logs/frasi_raccolte.jsonl`, insieme a quale script era
stato scelto in quel momento, o "nessuno" se non ne aveva trovato uno
pertinente). Non serve fare nulla durante la chiamata: succede da solo.

Quando vuoi, dall'app scegli **"Rivedi frasi raccolte dalle chiamate"**: te
le mostra una alla volta, con la fase rilevata e quale script era stato
usato (se non è stato scelto nulla, è un segnale che quella situazione non è
ancora coperta). Per ognuna puoi:
- **Ignorarla** — non era utile, non tocca niente.
- **Usarla** — poi scegli se aggiungerla come nuovo esempio a uno script già
  esistente (lo rende più bravo a riconoscere quella situazione anche
  formulata diversamente), oppure creare un nuovo script partendo da quella
  frase (la usa come primo esempio, poi puoi aggiungerne altre).
- **Interrompere** — le frasi non ancora riviste restano lì, le ritrovi la
  prossima volta.

Le frasi duplicate (identiche a un esempio già presente in quello script)
vengono riconosciute automaticamente e segnate come già riviste, senza
crearti doppioni.

**Nota sulla privacy**: da quando questa funzione è attiva, le frasi dei
clienti vengono salvate su disco (prima restavano solo a video, live).
Se non lo fate già, è buona norma informare i clienti che la chiamata può
essere monitorata/registrata a fini di qualità — vale la pena verificarlo
con chi segue la privacy in azienda, soprattutto se questi dati verranno
conservati a lungo o condivisi con altri.

## Come far scrivere il testo del suggerimento all'AI

Invece di scrivere tu il testo che verrà evidenziato a monitor, puoi farlo
proporre dall'AI, basandosi su un profilo della tua azienda.

### 1. Configura il profilo azienda (una volta sola)

Dall'app, **"Configura profilo azienda (per generazione AI)"**. Ti chiede
quattro cose, in ordine:
- **Nome dell'azienda**
- **Prodotti/servizi e contesto** — a chi vendete, cosa vi differenzia
- **Strategia commerciale** — es. "puntare sul valore, mai sul prezzo",
  "proporre sempre la demo prima dello sconto"
- **Regole fisse** — tono da usare, cose da non promettere mai, ecc.

Puoi rifarlo quando vuoi per aggiornarlo: la volta successiva ti mostra
quello già salvato, pronto da modificare.

### 2. Genera il testo mentre aggiungi uno script

In **"Aggiungi uno script alla libreria"**, dopo aver inserito le frasi di
esempio del cliente, ti viene chiesto come vuoi scrivere il suggerimento:
**"Lo scrivo io"** oppure **"Genera con l'AI"**. Se generi, l'AI scrive una
proposta tenendo conto di: fase della chiamata, situazione (categoria),
frasi di esempio del cliente e — se configurato — il tuo profilo azienda.

La proposta ti viene mostrata in un campo **modificabile**: puoi editarla
liberamente, chiederne un'altra ("Rigenera") o annullare. Non viene mai
salvata alla cieca. Lo stesso meccanismo è disponibile anche per il
suggerimento alternativo (facoltativo).

**Nota**: la generazione usa un modello più curato nella scrittura
(`claude-sonnet-5`) rispetto al classificatore usato durante le chiamate
(`claude-haiku-4-5`), perché qui non c'è vincolo di velocità — è un lavoro
di autoring, non qualcosa che succede in tempo reale mentre parli col
cliente.

## Importare un lead dalla Lead Rework Console (progetto separato, LEADREWORKS)

Prima di ogni chiamata puoi importare lo script/strategia preparato per
quello specifico lead nell'altra app YesMobility ("Lead Rework Console",
cartella `../LEADREWORKS/`): compare **fisso in un riquadro verde in alto**
nel pannello chiamata ("Canovaccio chiamata"), sopra ai suggerimenti live
per la gestione delle obiezioni (che restano invariati, invariata anche la
loro reattività — questa parte non tocca il motore di matching in tempo
reale).

**Nota sulla libreria**: il canovaccio viene generato dalla Lead Rework
Console a partire dalla **sua** libreria: 26 script disponibili (numerati
1-27) da LEADREWORKS. È una libreria diversa da quella usata qui durante la
chiamata per i suggerimenti live (`schema/esempio-libreria-script.json`, 17
script).

**Come funziona** (serve l'estensione Chrome in `../LEADREWORKS/browser-extension/`):
1. Nella Lead Rework Console, dopo aver generato lo script, premi **"Invia a
   Suggerimenti Vendita"** (anche da un lead riaperto dallo Storico).
2. L'estensione tiene il canovaccio in attesa nel browser
   (`chrome.storage.local`, nessun file da spostare) e apre Suggerimenti
   Vendita tramite lo schema `suggerimentivendita://`. La prima volta Chrome
   chiede di confermare l'apertura dell'app.
3. Nel menu si **illumina il pulsante "Chiamata Gestione Lead"**: il segnale
   arriva al menu sulla porta locale 8767, attiva finché l'app è aperta.
4. Premi **"Chiamata Gestione Lead"**: il pannello si apre con il canovaccio
   già visibile e il pulsante si spegne.

Le tre modalità di chiamata del menu:
- **Chiamata YesMobility**: solo suggerimenti live, **mai** il canovaccio
  (un lead in attesa resta lì per la prossima "Chiamata Gestione Lead").
- **Chiamata Gestione Lead**: suggerimenti live + canovaccio del lead
  inviato dalla Lead Rework Console.
- **Rinforzo Facile Salire**: suggerimenti live + canovaccio fisso
  (`schema/canovaccio-rinforzo-facile-salire.json`).

**Dopo un aggiornamento del codice**: il server resta acceso tra una
chiamata e l'altra e non ricarica da solo il proprio codice — **chiudi del
tutto l'app almeno una volta** (Cmd+Q, non solo la finestra del pannello),
poi riaprila.

## Parte 5 — Prossimi passi naturali

Il sistema ora è funzionante end-to-end con 17 script in libreria. I prossimi
miglioramenti, in ordine di utilità pratica:

1. **Espandere la libreria script** a 20-30 voci (situazioni più frequenti):
   sia scrivendo script da zero ("Aggiungi uno script alla libreria") sia,
   più naturalmente, rivedendo le frasi raccolte dalle chiamate reali.
2. ~~**Persistenza del contesto CRM**: oggi il file JSON è compilato a mano~~
   — fatto: vedi "Importare un lead dalla Lead Rework Console" qui sopra
   (canovaccio inviato dall'estensione, modalità "Chiamata Gestione Lead").
3. **Condizioni CRM dai dialoghi**: oggi "Aggiungi uno script" non chiede le
   condizioni CRM avanzate (segmento, stato pipeline, ecc.) — richiedono di
   toccare il JSON a mano. Se ti serve spesso, si può aggiungere ai dialoghi.
4. **Gestione di più chiamate/operatori in parallelo**: oggi il server gestisce
   una sessione alla volta; se serve scalare a più postazioni, ogni operatore
   avrà bisogno di una propria istanza di `server_suggerimenti.py` su una
   porta diversa (parametro da aggiungere).

## Risoluzione problemi comuni

- **"Non disponi dei permessi necessari per aprire l'applicazione"** (dopo
  aver scaricato/estratto lo zip): lancia `ripara_permessi.command` (doppio
  click) nella cartella del progetto — ripristina i permessi di esecuzione
  su tutti gli eseguibili e rimuove l'attributo di quarantena Gatekeeper.
  Se anche questo si rifiuta di aprirsi, apri Terminale e incolla:
  ```bash
  bash "/percorso/della/cartella/SUGGERIMENTIVENDITA/ripara_permessi.command"
  ```
- **L'app mostra la lista testuale invece del menu con i pulsanti**: mancano
  le dipendenze PyObjC (`menu/requirements.txt`) — rifai "Configura
  ambiente" dalla lista. Dettagli in `logs/menu.log`. Nel frattempo il
  sistema funziona comunque, solo con il vecchio menu.
- **"Manca DEEPGRAM_API_KEY" / "Manca ANTHROPIC_API_KEY"**: variabile
  d'ambiente non impostata nella sessione di terminale corrente, oppure file
  `.env` non nella cartella giusta.
- **Il pannello chiamata resta su "disconnesso"**: il server non è in
  esecuzione, oppure il WebSocket non è sulla porta 8765 (controlla
  `logs/server.log` o l'output del server).
- **La spia "Segnale in ingresso" resta ferma o la trascrizione è vuota**:
  il pannello sta ascoltando il dispositivo sbagliato — scegli lo splitter
  nel selettore in alto invece di "Predefinito di sistema".
- **"Chiamata Gestione Lead" non si illumina dopo "Invia a Suggerimenti
  Vendita"**: controlla che l'estensione Chrome sia aggiornata e ricaricata
  (`chrome://extensions`) e che l'app sia aperta; il canovaccio resta
  comunque in attesa e compare alla prossima "Chiamata Gestione Lead".
- **Audio saturo/distorto nella trascrizione**: abbassa il volume media di
  sistema del telefono, come indicato nella Parte 1.
- **Il classificatore LLM sceglie script sbagliati**: quasi sempre è un
  problema di `trigger_esempi` troppo generici o sovrapposti tra script
  diversi — rendili più specifici e distintivi.
- **macOS si rifiuta di aprire l'app o lo script** ("da uno sviluppatore non
  identificato"): tasto destro sul file → **Apri** → conferma nel dialogo.
  Va fatto solo la prima volta, dopo il download.
- **L'app non mostra nulla per un po' durante "Configura ambiente"**: è
  normale, sta scaricando e installando le dipendenze. Se dopo qualche
  minuto non è ancora arrivato il messaggio di conferma, apri
  `logs/setup.log` nella cartella del progetto per vedere a che punto è.
- **"Python non è installato correttamente"**: su Mac dove Python non è mai
  stato usato, il comando `python3` di sistema esiste solo come segnaposto
  che richiede Xcode Command Line Tools (1-3GB) per funzionare davvero.
  Soluzione più leggera, se lo spazio è poco: installa Python da
  [python.org/downloads/macos](https://www.python.org/downloads/macos/)
  (~30MB, pacchetto autonomo, non richiede Xcode) invece di installare le
  Command Line Tools — poi riprova "Configura ambiente".
- **Qualcosa non funziona e non capisci perché**: tutti i log dettagliati
  sono nella cartella `logs/` dentro il progetto (`setup.log`,
  `server.log`, `test_audio.log`, `generazione.log` per la generazione AI
  dei testi). Se serve, usa `avvia_sistema.command` invece dell'app: mostra
  tutto a video in tempo reale.
