# STATO-PROGETTO — M3U-PLAYER-WEB («TV Vannini»)

> **Leggi questo file PER INTERO prima di toccare qualsiasi cosa.** È scritto perché una sessione nuova (senza memoria di quelle precedenti)
> possa riprendere il progetto senza dover analizzare di nuovo il codice né chiedere cose già decise.
> Ultimo aggiornamento completo: **19 ottobre 2026** (stato del repository: dopo il commit `de61086` e successivi; app Fire TV 1.5 — 25 ottobre: ripresa dell'ultimo canale e avvio all'accensione, ancora da provare su Fire TV vera).
> Se cambi qualcosa di importante, **aggiorna questo file nello stesso commit** (vedi §19 «Regole per mantenerlo vero»).

Indice: 1 Cos'è · 2 Come lavora l'utente (REGOLE) · 3 Ambiente di lavoro della sessione · 4 Architettura · 5 Mappa dei file · 6 Formati e regole dei dati ·
7 Il sito (client) · 8 Il servizio online (Worker e server Node) · 9 App Fire TV · 10 Guida programmi (EPG) · 11 Modo auto (`/auto`) ·
12 Automazioni GitHub · 13 Pubblicare e operazioni (Mac dell'utente) · 14 Prove e verifiche · 15 Registro, punti di ripristino, regole di push ·
16 Decisioni di progetto e perché · 17 Trappole già incontrate · 18 Stato: provato / da provare / limiti · 19 Regole per mantenere questo file ·
20 Ricette per le modifiche tipiche · 21 Idee e lavori non fatti · 22 Glossario

---

## 1. Cos'è, in breve

**TV Vannini** è un lettore di televisione in diretta alimentato da liste di canali **M3U**. Tre modi d'uso, tutti sulla stessa base dati:

| Modo | Dove | Cosa è |
|---|---|---|
| **Sito web** | `https://tv.vannini.online` | Elenco canali (ordine digitale terrestre), lettore a tutto schermo, 5 temi, PWA iPhone, finestra flottante (PiP), guida programmi |
| **App Fire TV** | APK «TV Vannini» (`online.vannini.tv`), versione **1.5** | Stessa lista/ordine, lettore nativo ExoPlayer, comandi del telecomando |
| **Modo auto** | `https://tv.vannini.online/auto` | Stessa pagina con comandi per manopola/frecce dell'auto (browser di APTV dentro CarPlay) |

Più: **area admin** (`/admin`, protetta da password) per scegliere le liste (fonti), il loro ordine di priorità e i **canali nascosti**;
**guida programmi** («ora / poi») preparata ogni 2 ore da GitHub Actions; script Mac per un'icona sul Desktop; **guida PDF** (`GUIDA-TV-VANNINI.pdf`).

Hosting: **Cloudflare Worker** (`tv-vannini`) + **KV** + dominio `tv.vannini.online`, piano **gratuito**. Alternativa pronta (non in uso): `server.js` (Node, Docker, Render).
Repository: `https://github.com/davidvannini-cyber/code` (**PUBBLICO**; il progetto sta nella cartella `M3U-PLAYER-WEB`). Ramo di lavoro/pubblicazione: **`main`**.

Documenti già presenti (più brevi, non sostituiscono questo): `README.md`, `DEPLOY-CLOUDFLARE.md`, `DEPLOY.md`, `firetv/FIRETV.md`, `GUIDA-TV-VANNINI.pdf` (guida per l'utente finale).

### Stato in una riga per componente
- Sito: **funziona e provato** (PC Safari/Chrome, iPhone, PiP, admin, liste multiple, EPG, canali nascosti).
- App Fire TV 1.4: **funziona e provata** (elenco, riproduzione, EPG); «canali nascosti» su 1.4 **non ancora confermati dall'utente in uso**.
- Modo auto: **verificato solo con browser di prova**; **da provare in auto** (BMW NBT + CarPlay + APTV).
- Limiti noti: schermo nero con audio per alcuni secondi su **Safari** con fonti DASH (Italia 1 fonte 2/3); fascia scura nel PiP di **Chrome** (è del browser).

---

## 2. Come lavora l'utente — REGOLE DA RISPETTARE (molto importante)

L'utente si chiama **David**. Non è uno sviluppatore. Queste regole sono state date esplicitamente e valgono sempre.

### 2.1 Comunicazione
- **Rispondi sempre in italiano**, in modo semplice, **senza gergo tecnico** (se un termine serve, spiegalo in una riga). Frasi corte, elenchi, niente muri di testo.
- Quando c'è da fare qualcosa sul suo computer o in un pannello web, dai **istruzioni passo-passo, una parte alla volta**, con i **comandi completi da incollare** (mai «lancia il deploy»: scrivi `cd …` e `npx wrangler deploy`). Alla fine di ogni parte chiedi/aspetta **«fatto»**.
- **Non chiedere a David la sua password** e non scriverla mai nei file. La password admin è un segreto Cloudflare che ha impostato lui («Non scrivermi la password qui: tienila tu»).
- Quando David scrive **«aspetta il mio Procedi»** (o «dimmi se è possibile ed aspetta il Procedi») **non modificare nulla** finché non scrive **«Procedi»**: rispondi con fattibilità, rischi e cosa faresti. Se invece la richiesta è chiara e a basso rischio, lavora direttamente.
- **Sii onesto sui limiti**: dichiara cosa NON hai potuto provare (per esempio: l'app sulla Fire TV, la manopola dell'auto, Mediaset in Safari). Distingui «verificato con dati veri» da «provato dall'utente».
- Prima di pubblicare una modifica che può peggiorare qualcosa che funziona, **dillo**; se l'utente dice che è peggiorata, **revertila subito** (è già successo: vedi §17).
- Vuole che le cose funzionino **online** («hosting esterno, non deve rimanere sul Mac»). Il Mac serve solo per lanciare i comandi di pubblicazione.
- Non vuole password per **guardare** i canali: solo `/admin` è protetta.
- Il **sito web normale non deve cambiare** quando si aggiunge una funzione per un altro dispositivo (es. app Fire TV, modo auto): le novità per un dispositivo devono essere isolate (`/auto`, app separata).

### 2.2 Le regole di avvio sessione (hook) — NON IGNORARLE
Il file `.claude/hooks/consensi-avvio.sh` (registrato in `.claude/settings.json`, evento SessionStart) stampa a inizio sessione istruzioni **obbligatorie** dell'utente:
1. Come **prima risposta** fare 4 scelte con `AskUserQuestion`, **una alla volta**: (1) «Nuovo Progetto» / «Progetto Esistente» (se esistente: scegliere il progetto — qui `M3U-PLAYER-WEB`);
   (2) cartella di lavoro (sottocartelle + «Radice del progetto» + «Crea nuova cartella»); (3) **Sicurezza** Sì/No: «Autorizzi il passaggio dal branch claude/... a main?» (push fast-forward, mai force push);
   (4) promemoria `/restore`.
2. Con **«Sì»** alla Sicurezza (è sempre stato «Sì» finora), **senza chiedere nulla**, è sempre permesso: pubblicare su branch e su **`main`** a fine lavoro (**push fast-forward, MAI force push**),
   creare Pull Request, **aggiungere una riga a `REGISTRO-SALVATAGGI.md`** (data, commit di partenza, file modificati, come tornare indietro con `git checkout <commit>`).
   A **fine lavoro** scrivere **«Fai Sync»** (David ha sul Mac un file `Sync.command` nella radice del repo che fa `git pull --ff-only`).
3. **Promemoria da scrivere** (dopo la domanda di sicurezza e a fine lavoro): *«Ricorda: con /restore vedi gli ultimi 20 salvataggi e puoi tornare a una versione precedente.»*
4. Paginazione di `AskUserQuestion`: max 4 opzioni → mostrare TUTTI gli elementi a pagine di 3 + «Altri (pagina successiva)» / «Torna alla prima pagina».
5. **Lavorare solo dentro `/code`** (il repository). Qualsiasi cosa fuori da `/code` richiede permesso prima («voglio che sia TUTTO su /code!!!»). Per questo anche la guida PDF e i suoi sorgenti sono nel repository.
- Comando `/restore` (`.claude/commands/restore.md`): legge le ultime 20 righe del registro, le mostra numerate, chiede quale ripristinare, mostra `git diff --stat`, ripristina con `git checkout <commit> -- <percorso>` + nuovo commit «Ripristino a <commit>» (mai riscrivere la storia).
- Se esiste un `CLAUDE.md` nella radice del repo, rimanda a questo file.

### 2.3 Messaggi di commit
Italiano, riga breve e descrittiva (es. «M3U-PLAYER-WEB: guida completa in PDF e tema Vetrina senza sovrapposizioni»), e in fondo le righe di attribuzione richieste dall'ambiente
(`Co-Authored-By: …` e `Claude-Session: …`) se il sistema le indica. **Non mettere nomi di modello nei file del repository.**

### 2.4 Stile del codice
- **Commenti in italiano**, stessa densità del codice circostante; nomi in italiano/inglese misti come già presenti; apostrofi ASCII (`e'`, `piu'`) nei testi dentro il codice/HTML già esistenti (non cambiare lo stile dei file).
- **Nessuna dipendenza** nel sito e in `server.js` (solo librerie di riproduzione da CDN: hls.js, dash.js, mpegts.js). L'app Android usa solo Media3. Mantieni così: leggerezza prima di tutto (Fire TV Stick Lite = 1 GB RAM).
- Non introdurre grafica pesante/animazioni costose; il sito deve andare bene su Fire TV Lite/telefoni vecchi.

---

## 3. Ambiente di lavoro della sessione (sandbox Claude Code sul web) — cosa si può e non si può fare

- Repo clonato in **`/home/user/code`**. Cartella temporanea di sessione (scratchpad) indicata dal sistema: usala per file temporanei, non `/tmp` a caso.
- **GitHub**: niente `gh` CLI. Si usano i **tool MCP `mcp__github__*`** (es. `actions_list`, `actions_get`, `get_job_logs`, `actions_run_trigger`, `get_file_contents`, PR). `git push origin main` funziona; **`git push` di TAG fallisce** (proxy: «remote end hung up»):
  per i punti di ripristino si usano **rami** (`git push origin <sha>:refs/heads/<nome>`), non tag. I log delle esecuzioni GitHub Actions si leggono con `get_job_logs`.
- **Rete (proxy con lista di host consentiti)**:
  - Raggiungibili: `github.com` (anche download release), `raw.githubusercontent.com`, `registry.npmjs.org`, `maven.google.com` SOLO l'indice (gli artefatti stanno su `dl.google.com`, **bloccato**), `repo.maven.apache.org`, `services.gradle.org`.
  - **NON raggiungibili**: `tv.vannini.online` (con `curl`; si può leggere con il tool **TinyFish** `fetch_content`), `dl.google.com` (quindi **niente Android SDK**), la maggior parte degli host di stream/EPG di terzi, `www.50canale.tv` ecc.
  - Per cercare/leggere pagine esterne usa **TinyFish** (`mcp__TinyFish__search`, `fetch_content`); i risultati lunghi vengono salvati in un file: si leggono con Python.
- **Android**: non c'è l'Android SDK → **l'APK non si compila in locale**; lo costruisce **GitHub Actions** (§12). In locale si verifica il codice Java con `javac` contro `android.jar` (`org.robolectric:android-all:9-robolectric-4913185-2` da Maven Central) + **stub scritti a mano** delle API Media3 (non scaricabili), più un test di parità con il JavaScript (§14).
- **Strumenti presenti**: Node 20/22, Java 21, Gradle 8.14.3 (per generare il wrapper; la CI usa il wrapper 8.9), ffmpeg (libvpx per VP8/WebM; **il Chromium di Playwright non ha H.264**: per video di prova usa WebM VP8), pdftotext/pdfinfo/pdftoppm, Python con pypdf e reportlab,
  **Playwright** in `/opt/node-tools/node_modules/playwright` con Chromium in `/opt/pw-browsers/chromium` (`executablePath` esplicito, `args: ['--no-sandbox']`).
- **Attendere eventi esterni** (build GitHub, ecc.): non fare polling con `sleep`; usa `send_later` (mcp claude-code-remote) per un controllo programmato, poi riferisci.
- **Trappola `pkill`**: `pkill -f "node server.js"` uccide anche la shell se il pattern compare nella riga di comando del comando stesso. Usa pattern a parentesi `"[n]ode server.js"` e **non** mettere nello stesso comando l'avvio di un server con quel testo. Avvia i server con `nohup … &` in un comando e fai i test in un altro.
- **Secondo piano**: i server di prova locali (porte 8791–8803 usate nelle prove) vanno fermati a fine lavoro.
- Il sito pubblico **non si può testare dal sandbox**: si prova in locale con `server.js` e Playwright; la verifica reale la fa David (e va dichiarato).

---

## 4. Architettura

```
 LISTE M3U (indirizzi)                 CLOUDFLARE WORKER «tv-vannini»  (tv.vannini.online)                     CLIENT
 ┌──────────────────────┐   scarica    ┌──────────────────────────────────────────────┐   /playlist.m3u    ┌────────────────────┐
 │ 1 extra.m3u (GitHub) │ ───────────▶ │ unisce come TESTO (non analizza: 10 ms CPU)  │ ─────────────────▶ │ Sito (public/*)    │
 │ 2 IPTV-Italia        │  ogni 6 h    │ #X-SOURCE:n davanti a ogni lista             │   /api/hidden      │ App Fire TV (Java) │
 │ 3 iptv-org Italia    │  (cron) o    │ KV: playlist, meta, sources, src:<hash>,     │ ─────────────────▶ │ /auto (stessa pag.)│
 │ 4 Free-TV Italia     │  «Salva e    │     hidden, rl:<ip>                          │   /api/epg         └────────────────────┘
 └──────────────────────┘  aggiorna»   │ serve anche pagina, /admin, /auto, API       │ ◀─── release GitHub «epg-latest/epg.json»
                                       └──────────────────────────────────────────────┘      (preparata ogni 2 h da GitHub Actions)
 GitHub Actions:  «Fire TV APK» (a ogni modifica di firetv/)  →  release `firetv-latest/tv-vannini.apk`
                  «Guida programmi (EPG)» (ogni 2 h + modifiche) →  release `epg-latest/epg.json`
```

**Principi di progetto** (da non violare senza motivo):
1. **Il Worker non analizza mai la playlist**: la unisce come testo (piano gratuito = ~10 ms di CPU per richiesta). Tutta l'«intelligenza» (raggruppare, ordinare, filtrare italiani, nascondere) sta nel **client** (sito e app), con **la stessa logica scritta due volte** (JS e Java) e un test di parità.
2. **Le fonti sono sempre indirizzi.** Il caricamento di un file/testo in admin **sostituisce tutto e spegne le fonti** (`DELETE sources`): evitarlo; per usare un file, metterlo nel repo e usare il suo indirizzo `raw.githubusercontent.com` (come `extra.m3u`).
3. **Un solo posto per ogni regola**: `public/dtt-it.js` (JS) ↔ `firetv/.../Dtt.java` (Java). Se cambi una regola (numeri DTT, riconoscimento italiani, ordinamento, chiavi EPG) cambia **entrambi** e rilancia il test di parità (§14).
4. **Niente segreti nel repository** (è pubblico). L'eccezione voluta: la chiave di firma dell'APK (`firetv/app/tv-vannini.keystore`, password `tv-vannini`) serve solo a far installare gli aggiornamenti sopra le versioni precedenti (app installata a mano, mai su uno store).
5. **Leggerezza**: nessuna libreria nel sito, app Android senza librerie UI (solo `Activity`, `ListView`, `SurfaceView`).

---

## 5. Mappa dei file (tutto sotto `M3U-PLAYER-WEB/`, salvo diversa indicazione)

### Radice del repository (`/code`)
- `REGISTRO-SALVATAGGI.md` — tabella delle pubblicazioni (§15). **Ogni lavoro aggiunge una riga.**
- `.claude/settings.json`, `.claude/hooks/consensi-avvio.sh`, `.claude/commands/restore.md` — regole di avvio sessione e comando `/restore` (§2.2). `settings.json` ha anche un permesso `Bash(rea setup --client claude_code --yes)` (progetto REA, non rilevante qui).
- `Sync.command` — script del Mac dell'utente: trova la cartella `code` e fa `git pull --ff-only`.
- `.github/workflows/firetv-apk.yml`, `epg.yml` — automazioni di questo progetto (c'è anche `deploy-model3d.yml`, di un altro progetto: parte a ogni push su `main`, non c'entra).
- Altre cartelle (`APTV/`, `REA/`, `MODEL3D/`, `LEAD-COLLECTOR/`, …) sono **altri progetti**: non toccarle lavorando qui. `APTV/` contiene lo studio dell'app iOS APTV (scaffold SwiftUI non compilato e `GUIDA-FUNZIONAMENTO.md`): è ciò da cui è partita l'idea del player, **non** fa parte del sistema attuale.

### `public/` — il sito (servito identico da Worker e da `server.js`)
| File | Ruolo |
|---|---|
| `index.html` | Pagina: elenco `#channels`, barra in basso (`.dock`: ricerca, gruppi, `#itOnly`, tema), lettore `#player` con barra `#bar`, `#info`, `#msg`, `#streamUrl`; meta PWA/iOS; carica hls.js, mpegts.js, dash.js da jsDelivr |
| `app.js` (≈670 righe) | Tutta la logica client (§7) |
| `m3u.js` | `parseM3U(text)` → `{channels, epgUrl}`; gestisce `#X-SOURCE:n`, `x-src`, `tvg-chno`, `#EXTGRP`. Gira anche in Node (test) |
| `dtt-it.js` | Regole italiane/DTT: `key`, `idKey`, `canonicalKey`, `lcnOf`, `cleanName`, `isItalian`, `identity`, `groupChannels`, `sortGroups`, `preferWorking`, `sortDtt`. **Fonte di verità** delle regole (Java: `Dtt.java`) |
| `style.css`, `themes.css`, `theme.js` | Stile base; 5 temi (`aurora` predefinito, `notte`, `televideo`, `vetrina`, `carta`) via `html[data-theme=…]`; `theme.js` applica il tema salvato prima del disegno |
| `admin.html`, `admin.js` | Area admin: accesso, «Liste (fonti)», «Canali visibili», sostituzione playlist singola |
| `login.html`, `login.js` | Login spettatore (usato solo con `VIEWER_PASSWORD` sul server Node; sul Worker `/login.html` rimanda a `/`) |
| `manifest.webmanifest`, `icon*.png/svg` | PWA/icone (iPhone: «Aggiungi alla schermata Home») |

### `cloudflare/` — il Worker
- `src/worker.js` — Worker completo (§8). `wrangler.toml` — configurazione (§13.1). `package.json` — solo `wrangler ^4` (`npx wrangler deploy`). `test-worker.mjs` — prove del Worker in Node con KV finto.

### Server alternativo
- `server.js` (+ `Dockerfile`, `.dockerignore`, `DEPLOY.md`, `sample.m3u`) — stesse API del Worker, dati su file in `DATA_DIR`. Non in uso in produzione.

### `epg/`, `firetv/`, `mac/`, `guida/`
- `epg/build-epg.mjs` — prepara `epg.json` (§10). Prova: `test-epg.mjs`.
- `firetv/` — progetto Android/Gradle (§9): `app/src/main/java/online/vannini/tv/{MainActivity,Channel,M3u,Dtt,Epg}.java`, `AndroidManifest.xml`, `res/`, `app/build.gradle`, `app/tv-vannini.keystore`, `gradlew`+`gradle/wrapper` (Gradle 8.9), `FIRETV.md`.
- `mac/crea-icona-tv.sh` — crea sul Desktop l'app «TV Vannini» che apre il sito con Safari (§13.4).
- `guida/` — sorgente della guida PDF (`parts/*.html`, `img/*.jpg`, `build.mjs`, `stamp.py`). Output: `GUIDA-TV-VANNINI.pdf` (§14.5).
- `extra.m3u` — canali aggiunti a mano (Rai 3 Toscana n. 3, 50 Canale n. 18).
- `anteprime/` — vecchie anteprime dei temi (storico). `README.md` — descrizione breve + sezioni per funzione.
- Test: `test-m3u.js`, `test-dtt.js`, `test-server.js`, `test-epg.mjs`, `cloudflare/test-worker.mjs` (§14).
- Strumenti di verifica: `strumenti/prova-browser.mjs` (prova nel browser: pagina normale invariata + `/auto`), `firetv/strumenti/` (`verifica.sh`, `IdCheck.java`, `idcheck.js`, `stub/` = finte API Media3 per compilare senza Android SDK).

---

## 6. Formati e regole dei dati

### 6.1 Playlist unita (`/playlist.m3u`)
```
#EXTM3U
#X-SOURCE:1
#EXTINF:-1 tvg-id="Rai3.it" tvg-chno="3" group-title="Rai",Rai 3 Toscana
https://…/relinker…
#X-SOURCE:2
#EXTINF:-1 …,Nome
https://…
```
- `#X-SOURCE:n` = posizione (1-based) della lista di provenienza **nell'elenco delle fonti** (anche se una fonte intermedia è fallita, `n` resta la sua posizione). Il parser assegna `channel.src = n`. Un attributo `x-src="n"` su un `#EXTINF` ha la precedenza.
- Il Worker toglie l'intestazione `#EXTM3U` di ogni lista e antepone `#X-SOURCE:n`. Un flusso HLS singolo (manifest) incollato come «lista» diventa un canale solo.
- Il parser **scarta** righe non http/https (es. `rtmp://`), accetta BOM, `#EXTGRP`, attributi con/senza virgolette.

### 6.2 Dati nel KV del Worker (binding `DATA`)
| Chiave | Contenuto |
|---|---|
| `playlist` | testo M3U unito (max 18 MB) |
| `meta` | `{channels, groups:null, bytes, updatedAt}` |
| `sources` | `{urls:[…], status:[{url, ok, fromCache, channels, error, at}], updatedAt}` — max **8** indirizzi |
| `src:<sha256(url)>` | ultima copia buona di ogni fonte `{body, count}` (usata se la fonte non risponde) |
| `hidden` | `{ids:[…identità dei canali…], updatedAt}` — max 20.000 id da ≤300 caratteri |
| `rl:<ip>` | limitatore di tentativi login `{count, until}` (TTL 120 s) |
Secret del Worker: **`ADMIN_PASSWORD`** (impostato con `npx wrangler secret put ADMIN_PASSWORD`; cambiarla disconnette tutti). Variabili opzionali: `EPG_URL` (altro indirizzo per la guida), `ALLOW_PRIVATE_URLS=1` (solo prove).
Nel server Node gli stessi dati stanno in file: `playlist.m3u`, `playlist.prev.m3u`, `sources.json`, `hidden.json`, `src-cache/`, chiave sessioni (in `DATA_DIR`).

### 6.3 Identità di un canale e raggruppamento (**uguale in JS e Java**)
`identity(c)` = `(paese-straniero) | (tag tra parentesi non-qualità e non «ital») | (n<numeroDTT> oppure key(cleanName))`.
- `key(nome)`: minuscolo, senza accenti, **senza testo tra `()`/`[]`**, `+`→` plus `, solo `[a-z0-9]`, toglie qualità finale (`hd|fhd|uhd|sd|4k|hevc|h265`), senza spazi.
- `idKey(id)`: per `tvg-id`/id XMLTV: `Rai1.it@SD`, `Rai.1.HD..101.it`, `Rai 1.it` → tutti `rai1` (toglie `@…`, suffisso paese di 2 lettere, token qualità, numero finale di posizione ≥3 cifre).
- `cleanName(c)`: toglie prefisso `[12] ` e segni «cerchiati» finali tipo `Ⓖ` (U+24B6–24E9, usati da Free-TV).
- `tableLcn(c)`: numero DTT dalla **tabella interna** (nome o id); `lcnOf(c)`: `tvg-chno` > prefisso `[n]` > tabella.
- **Tabella LCN** (scritta a mano da memoria — può avere errori): 1 rai1, 2 rai2, 3 rai3, 4 rete4, 5 canale5, 6 italia1/italiauno, 7 la7, 8 tv8, 9 nove, 20 (20/20mediaset), 21 rai4, 22 iris, 23 rai5, 24 raimovie, 25 raipremium, 26 cielo, 27 twentyseven, 28 tv2000, 29 la7d, 30 la5, 31 realtime, 32 qvc, 33 foodnetwork, 34 cine34, 35 focus, 36 rtl1025, 37 warnertv, 38 giallo, 39 topcrime, 40 boing, 41 k2, 42 raigulp, 43 raiyoyo, 44 frisbee, 45 cartoonnetwork, 46 cartoonito, 47 super, 48 rainews24, 49 italia2, 50 skytg24, 51 tgcom24, 52 dmax, 54 raistoria, 55 mediasetextra, 57 raisport, 146 raiscuola. (Elenco completo e autorevole: `public/dtt-it.js`, costante `LCN`, e `Dtt.java`.)
- **Riconoscere un canale italiano** (`isItalian`): (1) se l'id ha paese (`.xx`): italiano solo se `it`; (2) altrimenti niente tag-paese tra parentesi nel nome (es. «TV8 (Moldova)» escluso); (3) prefisso `[n]` → sì; (4) gruppo che contiene Italy/Italia/Italian* → sì; (5) nome/id nella tabella LCN → sì.
- **Alternative di uno stesso canale** (`groupChannels`): tutte le voci con la stessa identità formano un gruppo; indirizzi duplicati tolti; ordinate da `rankAlts`: **senza `[Geo-blocked]`** → **fonte più in alto (`src` minore)** → senza `[Not 24/7]` → **risoluzione più alta** (`(\d{3,4})p` nel nome) → ordine originale. Il gruppo ha `head` = prima alternativa, `lcn`, `labels` (gruppi della lista), `firstIndex`.
- **Ordine** (`sortGroups`): prima i gruppi con numero (crescente), poi gli altri per nome (collator italiano), a parità `firstIndex`.
- `preferWorking`: se esiste una versione senza `[Geo-blocked]`, nasconde quelle con; (ora largamente sostituito dalle alternative).
- **Canali nascosti**: l'elenco `hidden.ids` contiene **`group.id` = `identity()`** (es. `||n3`, `||antennasicilia`, `|moldova|n8`). Il filtro lo applicano **sito e app** (nel Worker non si fa nulla).
- **Regola «Italiani (DTT)»** nel sito: `state.it` (default **true**, salvato in `localStorage['m3u-player:it']`): mostra i gruppi con almeno un'alternativa italiana, ordinati DTT; con `false`: tutti, nell'ordine della lista.

### 6.4 `epg.json` (guida programmi) — §10 per i dettagli
`{ "updated": "ISO", "channels": { "<chiave>": [[inizioSecUnix, fineSecUnix, "Titolo"], …] } }` — fino a 8 programmi per chiave, dal programma in corso a +8 h; più chiavi (da id e da nomi) possono puntare allo stesso programma; ≈77 KB, ≈234 chiavi.

---

## 7. Il sito (client): `public/`

Tutto il codice del lettore è un'unica funzione anonima in `app.js` (nessun modulo/bundler). Stato in `const state`.

### 7.1 Caricamento e elenco
- `loadPlaylist()`: in parallelo `fetch('playlist.m3u')` e `fetch('api/hidden')` (se fallisce → si vede tutto); `M3U.parseM3U` → `state.channels`; `DTT.groupChannels` → `state.groups`; poi `fillGroups()` (menu «gruppi») e `applyFilter()`.
- `baseGroups()`: toglie i gruppi nascosti (`state.hidden`), poi se `state.it` filtra gli italiani e ordina DTT.
- `renderMore()`: mostra **300** righe per volta (`PAGE`), pulsante `#more` «Mostra altri».
- `row(g, n)`: `<li><button>` con: numero, logo (`<img>` con fallback `monogram` = sigla colorata), `.nm` (`.name` + `.epg`), `×N` se N>1 alternative, gruppo. Il pulsante conserva `b._g = g`.
- `epgNow(g)/epgText(g)/paintEpg()/loadEpg()`: guida programmi (§10): `fetch('api/epg')` all'avvio e ogni **10 min**; `paintEpg` ogni **60 s**; mostra «Programma · poi HH:MM Titolo» nelle righe, nel titolo del lettore (`setTitle()`) e come `artist` dei Media Session. Solo per gruppi con almeno un'alternativa italiana.
- Chiavi `localStorage`: `m3u-player:alt` (mappa `group.id → url` dell'ultima fonte che ha funzionato), `m3u-player:it` (`'1'/'0'`), `m3u-player:theme-v2` (tema; la «v2» serve a ignorare scelte vecchie e partire da Aurora).
- Temi: `theme.js` imposta `data-theme` prima del rendering; i temi in `themes.css` ridefiniscono `li button`, `.name`, `.num`, ecc. **Attenzione**: `.name`/`.nm`/`.epg` sono usati da tutti i temi; il tema `vetrina` è una **griglia di riquadri** (`ol { display:grid }`) e per il `.epg` ha regole dedicate (va a capo, max 2 righe).

### 7.2 Riproduzione (`start(c)`)
1. `stopPlayback()` ferma tutto (hls.js/dash.js/mpegts.js, `video.removeAttribute('src')`).
2. Tipo: `typeFromUrl` (`.m3u8`→hls, `.mpd`→dash, `.ts/.aac/.mp3`→ts); se sconosciuto `probe(url)` (legge i primi byte, segue i reindirizzamenti; `#EXTM3U`→hls, `<MPD`→dash, altro→ts).
3. Pagina `https` + flusso `http:` → si prova la versione `https:`.
4. Motori: **hls.js** (tutti tranne Safari) con `{lowLatencyMode:false, liveSyncDurationCount:5, liveMaxLatencyDurationCount:12, maxBufferLength:40, maxMaxBufferLength:90, backBufferLength:30}`;
   **HLS nativo** su Safari/iOS; **dash.js** `{delay:{liveDelay:25}, liveCatchup:{enabled:false}, buffer:{fastSwitchEnabled:false, bufferTimeDefault:25, bufferTimeAtTopQuality:40, bufferTimeAtTopQualityLongForm:40, bufferToKeep:20}, gaps:{jumpGaps:true,jumpLargeGaps:true}, retryAttempts:{MPD:3,MediaSegment:4}}`;
   **mpegts.js** per TS grezzo (se `mseLivePlayback`); altrimenti `video.src` diretto. (Il margine dash.js a 25 s serve: con meno, Rete 4/Italia 1 si fermavano dopo pochi secondi.)
5. **Failover**: `failFn` è chiamato su errore fatale o allo scadere di **`STARTUP_MS` = 20 s** senza `playing`; `failover()` passa all'alternativa successiva (`state.cur = {g, i}`), altrimenti `diagnose()` spiega il motivo (token `exp=` scaduto, 401/403/451, 404/410, non-HLS, DRM, CORS…). Il pulsante `#alt` (`cycleSource`) cambia fonte a mano.
6. Quando parte (`playing`) si salva la fonte in `ALT_KEY` (è **per browser**: Chrome e Safari possono mostrare «fonte 1/3» e «2/3» per lo stesso canale; è normale).
7. `<video>` ha `controls` (controlli nativi del browser) `autoplay playsinline`.
- Tipi di flusso/limiti: DRM non riproducibile; flussi senza CORS non vanno con hls.js (Safari nativo sì); per questo l'app Fire TV legge canali che il browser non legge.

### 7.3 Lettore, tutto schermo, finestra flottante, tasti
- `openPlayer(g)` mostra `#player` (fixed, a tutto schermo), richiede Fullscreen sul `player`, avvia `playGroup(g)`; `closePlayer()` ferma e chiude. Uscire dal tutto schermo (Esc/pulsante `#fsToggle`, tasto **F**) **lascia il video acceso** a finestra; la **X** torna all'elenco.
- Barra `#bar` (autonascondimento 3 s, `showBar()`): `prev`, `title`, `alt`, `next`, `pipBtn` (PiP, tasto **P**), `fsToggle`, `fsBtn` (solo iPhone senza Fullscreen elemento e non standalone: `webkitEnterFullscreen`), `infoBtn` (**I**, `infoText()`: motore, tipo, indirizzo, risoluzione, frame persi, buffer, qualità, banda), `close`.
- Tasti (capture, `document keydown`): `→`/`PageDown` successivo, `←`/`PageUp` precedente, `I`, `F`, `P`.
- **Media Session** (`updateMediaSession`, `setActionHandler('previoustrack'/'nexttrack')`): tasti multimediali (su Mac **F7/F9**) cambiano canale anche con il PiP. Safari 15 (Monterey) **non mostra** i pulsanti ⏮⏭ nella finestra PiP (Chrome sì); F7/F9 funzionano.
- Fonte di «schermo nero con audio» su **Safari** con DASH (Mediaset): tentativo di ritardare l'avvio finché c'erano 3 s di buffer **peggiorava** → rimosso (commit `4f3f3c3`). Non riprovare allo stesso modo.
- Su iPhone: PWA installabile (`manifest.webmanifest`, icone 180/192/512, `viewport-fit`, safe-area), pulsante `#fsBtn`.

### 7.4 Area admin (`admin.html` / `admin.js`)
- Accesso: `POST /api/login {password}`; sessione = cookie `sid` (firmato HMAC, 400 giorni, `HttpOnly; SameSite=Strict; Secure`).
- «Liste (fonti)»: textarea, un indirizzo per riga, `POST /api/sources {urls}` (salva e aggiorna), `POST /api/sources/refresh` (aggiorna ora); stato per fonte (✓/⚠/✗) da `GET /api/sources`.
- «Canali visibili» (`loadChannels` in `admin.js`): scarica `/playlist.m3u` e `/api/hidden`, costruisce i gruppi con **gli stessi `m3u.js`/`dtt-it.js`** (l'admin li carica), elenco con checkbox (400 righe per volta + ricerca/filtri: tutti/italiani/non italiani/visibili/nascosti), «Mostra/Nascondi quelli in elenco», **Salva** → `POST /api/hidden {ids}`.
- Sezione ripiegata «Sostituisci con una sola playlist»: da indirizzo (`/api/playlist-url`), file/testo (`/api/playlist`). **Spegne le fonti**; sconsigliata.
- Nota CSS: `#info` (pannello diagnostico del lettore) è limitato a `#player #info` perché `admin.html` ha un `<p id="info">`.

---

## 8. Il servizio online

### 8.1 Worker (`cloudflare/src/worker.js`) — rotte
| Metodo e percorso | Accesso | Cosa fa |
|---|---|---|
| `GET /healthz` | libero | `ok` |
| `GET /playlist.m3u` (e HEAD) | libero | playlist unita dal KV (in streaming) o `SAMPLE` se vuota |
| `GET /api/epg` | libero | passa `epg.json` da `EPG_URL` (release GitHub), cache 20 min (Cache API), ≤1 MB, deve iniziare con `{` |
| `GET /api/hidden` | libero | `{"ids":[…]}` |
| `POST /api/hidden` | **admin** | salva `{ids}` (validazione: array di stringhe ≤300 car., ≤20.000, doppioni tolti) |
| `POST /api/login`, `/api/logout` | — | cookie `sid`; 5 errori → blocco 60 s per IP (`cf-connecting-ip`) |
| `GET /api/status` | admin | `meta` (canali, byte, data) |
| `GET /api/sources`, `POST /api/sources`, `POST /api/sources/refresh` | admin | gestisce le fonti (max 8, solo http/https, ≤2000 car.) e le riunisce |
| `POST /api/playlist`, `/api/playlist-url` | admin | sostituisce tutto (cancella `sources`) |
| `GET /auto`, `/auto/` | libero | `/auto` = stessa pagina (riscritta in `/`); `/auto/` → 302 `/auto` |
| `/login.html` | — | 302 `/` (nessuna password per guardare) |
| altro `GET` | libero | file statici da `ASSETS` (cartella `public/`), con intestazioni di sicurezza |
- `run_worker_first = true`: il Worker vede **tutte** le richieste e poi passa agli asset.
- Sicurezza: CSP (`default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; img-src * data: blob:; media-src * blob:; connect-src *; worker-src blob:; frame-ancestors 'none'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`; i `POST` richiedono **same-origin** (`Origin`); scaricare liste vieta indirizzi privati/locali (`isPrivateHost`, salvo `ALLOW_PRIVATE_URLS=1`); download fonte: timeout 25 s, ≤18 MB.
- `scheduled()` (cron `0 */6 * * *` in `wrangler.toml`): se ci sono fonti → `refreshSources`. **Richiede il sottodominio `workers.dev` dell'account** (già creato dall'utente il 19/10/2026; se un nuovo deploy segnala «code 10063» vuol dire che manca).
- `refreshSources`: scarica **in parallelo** tutte le fonti; per ognuna `prepare()` (verifica `#EXTM3U`, toglie intestazione, conta `#EXTINF`); se una fonte fallisce usa `src:<hash>`; se nessuna è utilizzabile **non tocca** la playlist; unisce con `#X-SOURCE:n`.
- Limiti piano gratuito: ~10 ms CPU/richiesta, 50 richieste esterne/esecuzione (da qui `MAX_SOURCES=8`), KV 1.000 scritture/giorno. Una lista da 11.000 canali (`iptv-org/index.m3u`) **può non starci**: usare liste per paese.
- La password admin dà anche la chiave della sessione (`sha256('m3u-player-session:'+password)`).

### 8.2 Server Node (`server.js`) — differenze
- Variabili: `PORT` (3000), `HOST` (127.0.0.1), `TRUST_PROXY=1`, `DATA_DIR`, `ADMIN_PASSWORD` (se manca la genera e la stampa all'avvio), `VIEWER_PASSWORD` (opzionale: protegge anche la visione), `ALLOW_PRIVATE_URLS=1`, `EPG_URL`.
- Limiti: `MAX_PLAYLIST` 10 MB per fonte, `MAX_MERGED` 40 MB, `MAX_SOURCES` 20, aggiornamento fonti ogni 6 h (timer interno). Analizza la playlist per contare i gruppi (`groups` in `/api/status`).
- Stesse rotte del Worker (incluse `/auto`, `/api/epg` con cache in memoria 20 min, `/api/hidden`).
- Prove: `node test-server.js` (avvia server temporanei su porta libera).

---

## 9. App Fire TV (`firetv/`)

- **Pacchetto** `online.vannini.tv`, nome «TV Vannini», `versionCode 6`, `versionName '1.5'` (in `app/build.gradle`), `minSdk 22`, `targetSdk/compileSdk 34`, Java 17, AGP 8.5.2, Gradle wrapper 8.9, **Media3 1.3.1** (`media3-exoplayer`, `-exoplayer-hls`, `-exoplayer-dash`). Release **minificata** (R8 + shrinkResources) e **firmata** con `app/tv-vannini.keystore` (alias/password `tv-vannini`, solo per gli aggiornamenti).
- **Aumentare la versione a ogni modifica dell'app** (`versionCode` +1, `versionName`), perché l'APK si installa sopra il precedente e l'intestazione dell'elenco mostra `v<versionName>`.
- **Manifest**: `INTERNET`, `RECEIVE_BOOT_COMPLETED` (+ `BootReceiver` per `BOOT_COMPLETED`/`QUICKBOOT_POWERON`); `touchscreen` e `leanback` non obbligatori; `LAUNCHER` + `LEANBACK_LAUNCHER`; `usesCleartextTraffic=true` (molti flussi sono `http`); `banner` 640×360 per la Home; `screenOrientation=landscape`; tema Material senza barra.
- **Interfaccia** costruita **in codice** (nessun XML di layout): `ListView` (righe: numero, nome + riga programma, gruppo), `SurfaceView` per il video, `TextView` di sovrapposizione (banner canale, messaggi, info). Colori: sfondo `#0A0B1E`, accento `#7B5CFF`.
- **Dati**: `PLAYLIST_URL = https://tv.vannini.online/playlist.m3u`, `EPG_URL = …/api/epg`, `HIDDEN_URL = …/api/hidden`. User-Agent da browser Android. Timeout 10 s connessione / 20 s lettura; file max 24 MB. Copia della playlist in `filesDir/playlist.m3u` (parte subito da quella, poi scarica la nuova) e dei nascosti in `hidden.json`.
- **Classi**: `M3u` (parser = `m3u.js`), `Dtt` (= `dtt-it.js`: stessa tabella LCN, stesse regole; `Dtt.Group` ha `id, alts, head, lcn, labels, firstIndex`), `Epg` (parsa `epg.json` con `org.json`; chiavi per gruppo = `key(cleanName)` e `idKey(tvgId)` di ogni alternativa + `canonicalKey(lcn)`; `nowNext(g)`, `text(g)`), `Channel`, `MainActivity` (tutto il resto).
- **Elenco**: filtro «Italiani (DTT)» (preferenza `it` in SharedPreferences `tv`), gruppo scelto, canali nascosti tolti (`base()`); intestazione = «TV · filtro · N canali (M nascosti dall'admin) · vX.Y» o il messaggio di stato (che dice a che punto è il caricamento o l'errore: «Scarico la lista…», «Scaricati N KB…», «Impossibile caricare…», «Letti N canali, nessuno con questo filtro»).
- **Telecomando**: elenco ▲▼ scorre, OK guarda, **MENU** = dialogo filtri («Italiani», «Tutti i canali», «Aggiorna la lista», «Avvio automatico all'accensione», «Gruppo: …»). Video: ◄/▼/canale-giù/prev = precedente, ►/▲/canale-su/next = successivo (con attesa di 350 ms se si scorre in fretta), **OK** info (server, risoluzione, fonte), **MENU** cambia fonte, Play/Pausa pausa, **Indietro** torna all'elenco (il rilascio del tasto viene «inghiottito» con `swallowUp` per non uscire dall'app).
- **Riproduzione**: ExoPlayer con `DefaultHttpDataSource` (UA da browser, redirect cross-protocol, timeout 10/15 s), `DefaultLoadControl(15000, 30000, 2500, 5000)` (poco buffer per il Lite). MIME dedotto dall'indirizzo (`.m3u8`/`.mpd`); se sconosciuto e l'errore è `PARSING_CONTAINER_UNSUPPORTED` si riprova **come HLS**. `BEHIND_LIVE_WINDOW` → `seekToDefaultPosition()`+`prepare()`.
- **Ripresa e avvio automatico (1.5, 25/10/2026, NON ancora provati su Fire TV vera)**: l'ultimo canale visto è in `SharedPreferences` `tv` chiave `last` (id del gruppo, scritta in `playGroup`). All'apertura dell'app, appena la lista (anche dalla copia salvata) è pronta, `resumeLast()` apre quel canale (se non nascosto). `onStop` (riposo/Home) chiude il lettore e ricorda `resumeOnStart`; `onStart` lo riapre da solo al risveglio. **Indietro** dal lettore imposta `userLeft=true`: finché non si apre un canale a mano non riparte da solo. `BootReceiver` apre `MainActivity` al riavvio della Fire TV (preferenza `boot`, predefinita attiva, si spegne da MENU → «Avvio automatico all'accensione»). Limiti: **non parte** quando si risveglia dal riposo (nessun riavvio); su Fire OS 8+ (Android 10+) Android blocca l'apertura dallo sfondo; al riavvio la rete può non essere ancora pronta (primo tentativo può fallire, poi failover/riprovare).
- **Failover**: timer 20 s (avvio e ogni `BUFFERING`); errore o timeout → alternativa successiva, altrimenti messaggio «Questo canale non parte (…)». Fonte che parte salvata in SharedPreferences (`alt|<group.id>`).
- **Cicli**: all'avvio `refresh()` (cache → hidden → playlist), `epgReload` ogni 10 min (scarica EPG **e** nascosti), `epgTick` ogni 60 s ridisegna l'elenco. `onStop` chiude il lettore e libera ExoPlayer.
- **Build e consegna**: automazione «Fire TV APK» (§12) → release **`firetv-latest`**, file **`tv-vannini.apk`**. Installazione sulla Fire TV con l'app **Downloader** all'indirizzo `https://github.com/davidvannini-cyber/code/releases/download/firetv-latest/tv-vannini.apk` (istruzioni in `FIRETV.md` e nella guida PDF). Si installa **sopra** la versione precedente.
- **Dispositivi dell'utente**: Fire TV Stick **Lite** (il più debole, 1 GB RAM), Stick, 4K; **Fire OS 7.7.1.7** (Android 9). L'utente ha provato l'app sulla Fire TV e l'ha giudicata «velocissima».
- **Come si verifica senza SDK**: compilare i `.java` con `javac -cp android.jar` + **stub Media3** (`ExoPlayer`, `DefaultHttpDataSource`, `DefaultLoadControl`, `DefaultMediaSourceFactory`, `MediaItem`, `MimeTypes`, `PlaybackException`, `Player`, `Format`, `UnstableApi`, `androidx.annotation.OptIn`) e un **test di parità** Java↔JS sugli stessi dati (id dei gruppi, ordine, chiavi EPG). Poi la conferma vera viene dalla build su GitHub (guarda i log se fallisce).
- **Limiti noti**: niente DRM; niente ricerca testuale (scomoda col telecomando); niente loghi (per leggerezza); il banner/overlay è semplice.

---

## 10. Guida programmi (EPG)

- **Scopo**: riga «Programma in onda · poi HH:MM Titolo» sotto ogni canale italiano (sito, titolo del lettore, Media Session, app Fire TV), **senza** scaricare/analizzare guide da decine di MB sul dispositivo.
- **Pipeline**: GitHub Actions «Guida programmi (EPG)» (`.github/workflows/epg.yml`; cron `23 */2 * * *` + `workflow_dispatch` + push su `epg/**`, `public/dtt-it.js`, il workflow) → `node M3U-PLAYER-WEB/test-epg.mjs` → `node M3U-PLAYER-WEB/epg/build-epg.mjs epg.json` → `gh release upload epg-latest epg.json --clobber` (crea la release `epg-latest` se manca; `--latest=false`).
  Il Worker/server la espone come **`/api/epg`** (stessa origine → niente CORS; il download diretto della release non ha CORS). Il client la scarica ogni 10 min.
- **Fonti XMLTV** (elenco `SOURCES` in `epg/build-epg.mjs`, in ordine di preferenza): `https://epgshare01.online/epgshare01/epg_ripper_IT1.xml.gz` (~195 canali, ~154 con programmi; id tipo `Rai1.it`, `Rai.1.HD..101.it`, `Canale.5.it`, `LA7.HD.it`) e `https://www.open-epg.com/files/italy3.xml.gz` (63 canali, id con spazi `Rai 1.it`). Se una fonte non risponde si usano le altre; se **nessuna** → il job fallisce **senza** sovrascrivere il file; se < 10 chiavi → fallisce.
- **Algoritmo** (`buildEpg`): per ogni canale tiene i programmi con `fine > ora` e `inizio < ora+8h` (max 8), per ogni chiave (id→`DTT.idKey`, nomi→`DTT.key`) sceglie il candidato con **programma in corso**, poi quello che copre più ore, poi la fonte preferita. Orari XMLTV `YYYYMMDDHHMMSS ±HHMM` → secondi UNIX. Titoli decodificati (entità XML, CDATA).
- **Risultati misurati** (19/10/2026): 234 chiavi, 76.9 KB, **42/44 canali principali** con programma in corso (mancano **Warner TV** e **Rai Scuola**); i canali **locali** (es. 50 Canale) di norma non hanno guida.
- **Come cambiare/aggiungere una fonte**: modifica `SOURCES`, lancia `node test-epg.mjs`, poi «Run workflow» (GitHub → Actions → «Guida programmi (EPG)») per rigenerare subito. Controlla nei log le righe `<url>: N canali, M con programmi`.
- Matching: la **stessa regola chiavi** è in `dtt-it.js` (`key`, `idKey`, `canonicalKey`) e `Dtt.java`; se la cambi, rigenera la guida e rifai il test di parità.
- ⚠️ GitHub **sospende i workflow programmati dopo 60 giorni senza attività** nel repository: basta un commit per riattivarli.

---

## 11. Modo auto (`/auto`)

- **Contesto dell'utente**: BMW con sistema **NBT**, **Apple CarPlay**, app **APTV** (iOS, di terzi) che ha un «Browser» dentro CarPlay (Quick → Browser). La manopola iDrive (rotazione, inclinazione = frecce, pressione, tasti Back/Menu) in CarPlay muove un «focus» su **tutti** gli elementi dello schermo (menu CarPlay compresi): nel browser di APTV la manopola «gira un po' sui canali e poi esce sui menu CarPlay»; i **tasti direzionali su/giù** invece muovono bene tra i canali. Il tasto **Indietro** dell'auto esce dal sito (nessuna cronologia) e fa riaprire tutto.
- **Soluzione**: indirizzo dedicato **`https://tv.vannini.online/auto`** (o `?auto=1`). `const AUTO = location.pathname.replace(/\/+$/,'') === '/auto' || ?auto=1` in `app.js`; imposta `html.auto`. **Tutto il codice nuovo è sotto `if (AUTO)`** → la pagina normale è identica a prima (verificato con test Playwright confrontando i due percorsi).
- **Comportamento in `/auto`**:
  - elenco: **una sola riga raggiungibile con Tab** (`tabindex=0` solo sulla selezionata, le altre `-1`; anche i controlli del `.dock`, `#more`, link header/footer hanno `tabindex=-1`);
  - `ArrowDown`/`Tab` = successivo, `ArrowUp`/`Shift+Tab` = precedente, **a giro** (in fondo si carica il resto se serve, poi torna in cima: non si esce mai verso CarPlay); `Enter` apre (click nativo del pulsante);
  - video: `ArrowUp`/`ArrowRight`/`Tab` = canale successivo, `ArrowDown`/`ArrowLeft`/`Shift+Tab` = precedente, `Enter`/Spazio = mostra la barra; il focus passa a `#player` (`tabindex=-1`) così Invio non riapre la riga sotto;
  - **cronologia**: all'apertura `history.pushState`; `popstate` chiude il lettore e riseleziona la riga del canale che si stava guardando (`autoSelect` + un secondo `focus()` dopo 200 ms perché l'uscita dal tutto schermo può togliere il fuoco); il pulsante X usa `leavePlayer()` (`history.back()` se è stato fatto il push);
  - aspetto: righe `min-height:64px`, `outline` 4 px nell'accento sul selezionato (`html.auto li button:focus`).
- Rotte: Worker e server riscrivono `/auto` → `index.html`; i percorsi nell'HTML sono **relativi** (`playlist.m3u`, `api/epg`, `style.css`) e funzionano da `/auto` (non da `/auto/`, per questo c'è il 302).
- **Stato**: verificato con browser di prova; **da provare in auto** (non si sa se la manopola BMW arrivi alla pagina come tasti/Tab o resti a livello CarPlay; se resta a livello CarPlay la pagina non può trattenerla → si usano le frecce). APTV, secondo la stampa, non riproduce video con l'auto in movimento.

---

## 12. Automazioni GitHub (`.github/workflows/`)

| File | Quando parte | Cosa fa | Risultato |
|---|---|---|---|
| `firetv-apk.yml` («Fire TV APK») | push su `main` che tocca `M3U-PLAYER-WEB/firetv/**` o il workflow; `workflow_dispatch` | Java 17 (Temurin) → `./gradlew assembleRelease` in `M3U-PLAYER-WEB/firetv` (usa l'Android SDK preinstallato sul runner) → copia `app-release.apk` come `tv-vannini.apk` → artifact → **ricrea la release `firetv-latest`** (`gh release delete firetv-latest --cleanup-tag --yes; gh release create …`) | `https://github.com/davidvannini-cyber/code/releases/download/firetv-latest/tv-vannini.apk` |
| `epg.yml` | cron ogni 2 h, push su `epg/**`/`dtt-it.js`/workflow, manuale | vedi §10 | release `epg-latest` (`epg.json`) |
| `deploy-model3d.yml` | ogni push su `main` | **altro progetto** (GitHub Pages di MODEL3D) | ignorare |
- `permissions: contents: write` serve per le release. `concurrency` su `epg`.
- **Controllare un'esecuzione**: tool MCP `actions_list` (`list_workflow_runs`, `resource_id` = nome del file), `actions_get`, `get_job_logs` (`job_id` da `list_workflow_jobs`, `return_content:true`).
- La build dell'app dura ~1,5–2 minuti; la guida programmi ~20 secondi.
- **Se la build Android fallisce**: leggere i log; errori tipici sarebbero API Media3 diverse dagli stub o risorse mancanti. Non si può riprodurre in locale (niente SDK).

---

## 13. Pubblicare e operazioni (lato utente: Mac)

### 13.1 Il Mac dell'utente
- macOS **12.6 Monterey** (wrangler avverte «Unsupported macOS version»: **non è un problema**). Terminale; repository in **`/Users/davidvannini_1/Documents/progetti/code`** (prompt tipo `YesMobility@MacBook`). Browser predefinito **Chrome**; usa **Safari** per il lettore (PiP pulito). Sul Mac `Sync.command` fa `git pull --ff-only`.
- Safari 15 (Monterey): **nessun «Nascondi barra degli strumenti»**; «Aggiungi al Dock» esiste solo da macOS 14 (Sonoma) → per questo c'è lo script `mac/crea-icona-tv.sh` (§13.4).

### 13.2 Pubblicare il sito su Cloudflare (due passaggi diversi!)
1. **Scaricare i file nel Mac**: `cd /Users/davidvannini_1/Documents/progetti/code && git pull origin main` (o doppio clic su `Sync.command`). «Already up to date» significa solo che i file ci sono già. **Non pubblica nulla online.**
2. **Pubblicare**: `cd M3U-PLAYER-WEB/cloudflare && npx wrangler deploy`. Deve finire con `Deployed tv-vannini`, `tv.vannini.online (custom domain)`, `schedule: 0 */6 * * *`, senza errori. **Solo questo cambia il sito online.** (È la confusione più frequente dell'utente: spiegarla sempre.)
3. Ricarica «forte» nel browser: Safari **⌥⌘E** poi **⌘R**; Chrome **⇧⌘R**.
- Quando cambia **solo l'app** (`firetv/`) non serve `wrangler deploy`; quando cambia **solo il sito/Worker** non serve ricostruire l'app.
- `wrangler.toml`: **`routes = [...]` deve stare PRIMA delle sezioni `[...]`** (altrimenti TOML lo assegna alla sezione precedente e wrangler lo ignora con un avviso). `[assets] directory="../public" binding="ASSETS" run_worker_first=true`; `[[kv_namespaces]] binding="DATA" id="f6599f26a4ac4cacbe1d7a3ffd6dd54d"`; `[triggers] crons=["0 */6 * * *"]`.
- Errore «code 10063 … workers.dev subdomain» al deploy: aprire sul pannello Cloudflare **Compute → Workers & Pages** (crea il sottodominio), poi rilanciare il deploy. **Già risolto**; compare solo su un account nuovo.
- Prima installazione (storico, in `DEPLOY-CLOUDFLARE.md`): `npm install` in `cloudflare/`, `npx wrangler login`, `npx wrangler kv namespace create DATA` (id in `wrangler.toml`; rispondere **no** se chiede di aggiungerlo da solo), `npx wrangler deploy`, `npx wrangler secret put ADMIN_PASSWORD` (la chiede senza mostrarla).
- Tornare a Render (piano B): vedi `DEPLOY.md` e in fondo a `DEPLOY-CLOUDFLARE.md` (rimuovere il dominio dal Worker, CNAME `tv` verso Render, rimettere le liste).

### 13.3 Operazioni quotidiane dell'utente (le spiega la guida PDF, cap. 12)
- **Liste (fonti)** in `/admin` (ordine = priorità). Ordine attuale consigliato (19/10/2026): 1 `…/M3U-PLAYER-WEB/extra.m3u` (raw GitHub, **sempre per primo**), 2 `https://github.com/Tundrak/IPTV-Italia/raw/main/iptvitaplus.m3u`, 3 `https://iptv-org.github.io/iptv/countries/it.m3u`, 4 `https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_italy.m3u8`.
  (La prima volta l'utente aveva **caricato un file** invece di un indirizzo: ha sostituito tutto e spento le fonti. Il file Free-TV era già un indirizzo.)
- **Canali locali** → `extra.m3u` (`#EXTINF:-1 tvg-id="…" tvg-chno="N" group-title="Italia",Nome` + indirizzo). Per far **fondere** un canale con un altro (es. Rai 3 Toscana dentro Rai 3) usare lo **stesso `tvg-id`** (`Rai3.it`): con `extra.m3u` per primo diventa la prima fonte e il suo nome (`head`) compare in elenco. Un canale nuovo italiano ha bisogno di `group-title="Italia"` (o tabella LCN) per passare il filtro «Italiani».
- **Nascondere canali**: `/admin` → «Canali visibili» → Salva.
- **App**: Downloader → URL dell'APK (§9). **Punti di ripristino**: §15.

### 13.4 `mac/crea-icona-tv.sh`
Crea `~/Desktop/TV Vannini.app` (AppleScript compilato con `osacompile`: `tell application "Safari" … make new document with properties {URL:"https://tv.vannini.online"}`), scarica `icon-512.png` dal sito e costruisce l'icona (`sips`+`iconutil`). Lancio: `bash M3U-PLAYER-WEB/mac/crea-icona-tv.sh`. La prima volta macOS chiede il permesso di controllare Safari. (Un tentativo di nascondere la barra via System Events è stato **tolto**: su Monterey la voce di menu non esiste.)

---

## 14. Prove e verifiche (cosa lanciare PRIMA di pubblicare)

Dalla cartella `M3U-PLAYER-WEB/` (richiede Node ≥ 18; per il Worker anche `npm install` in `cloudflare/` solo se si usa wrangler):

| Comando | Cosa verifica |
|---|---|
| `node test-m3u.js` | parser M3U (attributi, `#X-SOURCE`, BOM, righe scartate, `tvg-chno`) |
| `node test-dtt.js` | regole italiane/DTT: riconoscimento, identità, ordine, alternative, `[Geo-blocked]`… |
| `node test-server.js` | server Node end-to-end (avvia istanze temporanee su porta libera): login, sessioni, fonti multiple, `/auto`, `/api/epg`, `/api/hidden`, traversal, ecc. |
| `cd cloudflare && node test-worker.mjs` | il **Worker** in Node con KV finto (stesse prove + 11.000 canali) |
| `node test-epg.mjs` | `epg/build-epg.mjs`: orari, XMLTV, scelta fonti, chiavi |
| `node strumenti/prova-browser.mjs` | **browser vero** (Playwright/Chromium): pagina normale invariata + `/auto` (tappe, frecce, Indietro) |
| `bash firetv/strumenti/verifica.sh [playlist.m3u]` | **app Java**: compila con `android.jar` + stub Media3 e confronta con il JS (gruppi, id, ordine) |
- `npm test` (in `M3U-PLAYER-WEB/`) lancia solo i primi tre.
- Dopo **ogni** modifica di `dtt-it.js`/`Dtt.java`/`m3u.js`/`M3u.java`: `test-dtt.js` **e** `firetv/strumenti/verifica.sh` (idealmente anche con una playlist vera: Free-TV via `raw.githubusercontent.com`).
- Differenze Java/JS **note e accettate**: ordine alfabetico dei canali **senza numero** con accenti/punteggiatura (Collator Java vs ICU di Node) e indirizzi che JS normalizza (`:80` tolto).

### 14.1 Provare il sito in locale
```
cd M3U-PLAYER-WEB
mkdir -p /tmp/dati && cp sample.m3u /tmp/dati/playlist.m3u     # o una playlist tua
PORT=8790 DATA_DIR=/tmp/dati ADMIN_PASSWORD=prova-prova-prova EPG_URL=http://127.0.0.1:8799/epg.json ALLOW_PRIVATE_URLS=1 nohup node server.js > /tmp/srv.log 2>&1 &
```
(poi aprire `http://127.0.0.1:8790/`, `/auto`, `/admin`; fermare il server a fine prova.) Con `ADMIN_PASSWORD` non impostata il server ne genera una e la stampa.

### 14.2 Playwright: trucchi che servono
- Importare da `/opt/node-tools/node_modules/playwright`; `chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })`.
- Bloccare le librerie esterne: `page.route('**/cdn.jsdelivr.net/**', r => r.fulfill({contentType:'text/javascript', body:''}))` (e per provare il lettore **sostituire** dash/hls con uno stub che registra le chiamate, come fatto per i test di Safari).
- Il filtro «Italiani (DTT)» è attivo di default: per vedere canali non italiani fare `uncheck('#itOnly')`.
- **Video di prova**: Chromium di Playwright non ha H.264 → `ffmpeg -f lavfi -i "gradients=…,format=yuv420p" … -c:v libvpx -auto-alt-ref 0 out.webm`, servito con un piccolo server statico (con supporto `Range`), e una voce `Rai 1` con `http://127.0.0.1:PORTA/prova.webm`.
- `boundingBox()` è relativo alla viewport: per `fullPage`+`clip` sommare `scrollY`; evitare `.uncheck()`/`.click()` che scrollano se si vuole una schermata dall'alto (l'header admin è `sticky`).
- Test del **Worker reale** (workerd) non fatto: `test-worker.mjs` usa il Worker in Node con un KV finto (sufficiente finora). `npx wrangler dev` richiede un account.

### 14.3 Cosa NON si può verificare nel sandbox (dichiaralo sempre)
App sulla Fire TV vera; manopola/CarPlay/APTV; riproduzione di Mediaset/Rai reali (host bloccati); comportamento reale di Safari con DASH; il sito pubblico `tv.vannini.online` (si legge solo con TinyFish `fetch_content`).

### 14.4 Dopo la pubblicazione
- Worker: nessun controllo automatico; chiedere all'utente di aprire il sito (e `/api/epg`, `/api/hidden`) o leggerli con TinyFish.
- App: controllare la build su GitHub (`actions_list` su `firetv-apk.yml`), poi far installare con Downloader e farsi dire cosa legge in cima (versione e «N nascosti»).

### 14.5 Rigenerare la guida PDF (`GUIDA-TV-VANNINI.pdf`)
`node M3U-PLAYER-WEB/guida/build.mjs` (con `PLAYWRIGHT=/opt/node-tools/node_modules/playwright` se serve): concatena `guida/parts/*.html`, stampa con Chromium (A4), cerca con `pdftotext` le pagine dei capitoli e le scrive nell'indice (due passaggi), poi `stamp.py` (pypdf+reportlab) aggiunge il piè di pagina (non sulla copertina) e i metadati.
Le immagini in `guida/img/*.jpg` sono **schermate vere** prese con Playwright da un `server.js` locale con la lista Free-TV + `extra.m3u` e una `epg.json` reale scaricata dalla release `epg-latest` (indirizzi nel pannello info sostituiti con esempi; video di prova «Immagine di prova»). Se il sito cambia aspetto, rifare le schermate e aggiornare i capitoli interessati. **Aggiornare la guida quando cambia una funzione** (almeno i capitoli 7–11 e «Stato e glossario»).

---

## 15. Registro, punti di ripristino, regole di push

- **`REGISTRO-SALVATAGGI.md`** (radice del repo): tabella `| Data | Commit di partenza | File modificati (descrizione) | Come tornare indietro |`. **Una riga per lavoro**, aggiunta nello **stesso commit** del lavoro. «Commit di partenza» = l'hash di `HEAD` **prima** del lavoro (es. `` `f8f1aed` `` e `` `git checkout f8f1aed` ``). La descrizione è il testo che `/restore` mostra.
- **Punti di ripristino stabili** (rami, **non modificarli mai**):
  - `punto-stabile-2026-10-19` (`bcc9756`): sito + app 1.1 + `extra.m3u` + icona Mac + cambio canale da PiP, **prima della guida programmi**;
  - `punto-stabile-2026-10-19-epg` (`b7feb21`): + guida programmi, app 1.2;
  - `punto-stabile-2026-10-25-firetv14` (`06ae81d`): stato prima dell'app 1.5 (include `/auto`, guida PDF, questo file).
  - `punto-stabile-2026-10-19-admin` (`45a58fd`): + canali nascosti, Free-TV, app 1.4 — **il più completo** (precede modo auto `/auto`, guida PDF e questo file).
  Ne va creato uno nuovo **quando l'utente dice che è soddisfatto di un livello** («non voglio perdere questo livello»): `git push origin <sha>:refs/heads/punto-stabile-<data>-<nome>` + riga nel registro. Nome ramo del tipo `punto-stabile-AAAA-MM-GG-<parola>`.
- **Tag**: `git push` di tag **non funziona** nel sandbox (proxy). Usare rami.
- **Push**: solo **fast-forward su `main`** (con permesso «Sì» dell'avvio), **mai force push**, mai riscrivere la storia; se `git pull` richiede merge, farlo (non rebase di `main`). Conflitti: unire, non scartare il lavoro altrui.
- **Ripristino**: `/restore` oppure `git checkout <commit-o-ramo> -- <percorso>` + nuovo commit; per pubblicare quella versione sul sito: `npx wrangler deploy` (l'utente); l'APK si ricostruisce dal commit (workflow manuale su quel ramo se serve).
- **A fine lavoro**: aggiornare registro (+ questo file se serve), commit, `git push origin main`, poi **«Fai Sync»** e il promemoria `/restore` (§2.2).

---

## 16. Decisioni di progetto e perché

| Decisione | Motivo |
|---|---|
| Hosting su **Cloudflare Worker + KV** (piano gratuito), Render solo piano B | L'utente vuole tutto **online**, gratuito, sul suo dominio; il Mac non deve restare acceso. Provato prima Cloudflare, Render come ripiego |
| Il Worker **non analizza** la playlist | Limite di ~10 ms di CPU: liste grandi andrebbero oltre. Unione come testo + `#X-SOURCE:n` |
| Logica italiana/DTT **nel client** e **duplicata** JS↔Java con test di parità | Il Worker non può farla; l'app deve dare lo stesso risultato del sito |
| Fonti **solo come indirizzi**; file = repo + raw URL | Il caricamento di un file sostituiva tutto e spegneva le fonti (successo davvero) |
| **Ordine delle fonti = priorità**; `extra.m3u` primo | Rai 3 Toscana deve essere la prima fonte di «Rai 3» (stesso `tvg-id`) |
| **Failover automatico a 20 s** + ricordo della fonte buona **per browser** | Molte fonti sono spente/geo-bloccate/scadute; ogni browser ricorda la propria |
| Margini live ampi (hls.js 5 segmenti, dash.js 25 s) | Rete 4/Italia 1 si fermavano dopo pochi secondi con margini piccoli |
| App Fire TV **nativa (ExoPlayer)**, non un WebView | «Il più leggero possibile» (Stick Lite), niente limiti CORS/browser; il WebView sarebbe stato più rapido da fare ma più pesante |
| APK costruito da **GitHub Actions** e consegnato via **release pubblica** + Downloader | Nel sandbox non c'è l'SDK; repo pubblico → link scaricabile senza account |
| Chiave di firma **nel repo** | Serve solo agli aggiornamenti sopra l'app installata a mano |
| **EPG preparata su GitHub** (ogni 2 h) e passata dal Worker | Le guide XMLTV pesano 13 MB: impossibile su Worker gratuito, telefono o Lite; il file finale è ~77 KB |
| `/api/epg` come **proxy** del Worker (non link diretto alla release) | Le release non hanno CORS; stessa origine è più semplice e si può mettere in cache |
| **Canali nascosti** salvati per `identity` e applicati dal client | Valgono per sito e app, anche se un canale arriva da più liste |
| **Modo auto** = indirizzo `/auto` con codice sotto `if (AUTO)` | Garanzia che PC/telefono/Fire TV non cambino |
| Punti di ripristino come **rami**, non tag | I tag non si possono pubblicare dal sandbox |
| Tentativo «Safari: aspetta buffer prima di partire» **tolto** | Allungava l'attesa invece di ridurre i secondi neri (dichiarato dall'utente) |
| Nessuna password per guardare | Scelta dell'utente: liste pubbliche, viewer personale |

---

## 17. Trappole già incontrate (non ripeterle)

- **`wrangler.toml`**: `routes` dopo una sezione `[...]` viene ignorato. Tenerlo in cima.
- **Cron senza `workers.dev`**: errore `10063`; aprire Workers & Pages sul pannello (già risolto).
- **«Already up to date» ≠ sito aggiornato**: `git pull` scarica i file; `npx wrangler deploy` pubblica. L'utente li confonde: spiegarlo ogni volta (§13.2).
- **Safari ricorda la fonte vecchia**: dopo aver cambiato l'ordine delle liste, un browser che ricordava una fonte cattiva continua a usarla → «cambia fonte» a mano (si ricorda poi quella buona).
- **Caricare un file in `/admin`** spegne le fonti (è successo): rimettere gli indirizzi.
- **Tema Vetrina + riga EPG**: la riga si sovrapponeva tra riquadri → regole dedicate in `themes.css` (corretto). Ogni nuovo elemento dentro `li` va controllato in **tutti e 5 i temi** (soprattutto Vetrina, Televideo).
- **`#info`** esiste sia nel lettore (pannello diagnostico) sia in `admin.html`: lo stile è limitato a `#player #info`.
- **iOS/Safari**: niente Fullscreen API sull'elemento → `webkitEnterFullscreen` sul `<video>`; Safari 15 non mostra ⏮⏭ nel PiP (F7/F9 sì); non si può nascondere la barra degli strumenti.
- **Mediaset in Safari**: la fonte DASH mostra qualche secondo di schermo nero con audio; non risolto (il tentativo di ritardare la partenza peggiorava).
- **Fonti geo-bloccate/morte** (TV8, Nove spesso senza fonti funzionanti; Sky con token `exp=` scaduti): non si risolvono; l'utente cerca altre liste.
- **TinyFish/markdown** rovina i file M3U (unisce le righe): per scaricare una playlist vera usare `curl` su `raw.githubusercontent.com` (raggiungibile).
- **`git push` di tag** → «remote end hung up»: usare rami.
- **`pkill -f`** può uccidere la propria shell (§3).
- **`ListView` Android + `swallowUp`**: il rilascio di BACK dopo aver chiuso il lettore farebbe uscire dall'app → gestito in `dispatchKeyEvent`.
- **`Dtt.idKey` usa `android.text.TextUtils.join`** (non `String.join`: non disponibile su API < 26 senza desugaring).
- **Worker**: `AbortSignal.timeout` e `caches.default` vanno protetti in Node (`typeof caches !== 'undefined'`) per i test.

---

## 18. Stato: provato / da provare / limiti

**Provato dall'utente**: sito su PC (Safari e Chrome), iPhone (tutto schermo), PiP e F7/F9 in Safari, liste multiple + Free-TV, Rai 3 Toscana e 50 Canale, admin (liste e canali visibili sul sito), guida programmi (sito e app «funziona alla grande»), app Fire TV (elenco/riproduzione, «velocissimo»), cambio fonte (Italia 1 fonte 2/3 su Safari).
**Verificato solo da me (dati veri o browser di prova)**: canali nascosti nell'app 1.4, modo auto (browser di prova), parità Java↔JS, tema Vetrina corretto, guida PDF.
**Da provare/confermare**: (0) **app 1.5**: riapertura sull'ultimo canale (apertura, risveglio dal riposo) e avvio dopo riavvio della Fire TV (Fire OS 7.7.1.7); (1) **canali nascosti sull'app Fire TV 1.4** (prima di 1.4 l'utente li vedeva ancora: probabilmente versione vecchia installata; la 1.4 mostra «v1.4» e «N nascosti» in cima); (2) **`/auto` in auto** (BMW NBT + CarPlay + APTV): manopola, frecce, tasto Indietro.
**Limiti noti** (non risolvibili dal sito): secondi neri con audio su Safari con fonti DASH; fascia scura nel PiP di Chrome (è del browser); manopola gestita a livello CarPlay; niente DRM; fonti morte di alcuni canali.

---

## 19. Regole per mantenere questo file vero
1. Ogni modifica che cambia comportamento, rotte, dati, versioni dell'app, workflow o regole → aggiornare la sezione relativa **nello stesso commit**.
2. Aggiornare la data in testa e la riga di §18 (provato/da provare).
3. Non scrivere mai nel file password, email, token, ID di account (repo pubblico). L'ID del KV è già pubblico in `wrangler.toml`.
4. Se aggiungi una funzione per un dispositivo, mantieni **isolata** la sua logica (come `/auto`, app separata) e verifica che il comportamento normale resti identico (`strumenti/prova-browser.mjs`).
5. Se cambi `dtt-it.js`/`Dtt.java`, lancia sempre `firetv/strumenti/verifica.sh` con una playlist vera.

---

## 20. Ricette per le modifiche tipiche

| Voglio… | Tocca | Poi |
|---|---|---|
| **Correggere un numero DTT** o aggiungere un canale alla tabella | `LCN` in `public/dtt-it.js` **e** `LCN` in `Dtt.java` | `test-dtt.js`, `verifica.sh`; `wrangler deploy` (sito) e nuova versione app (versionCode+1); rigenerare la guida EPG non serve |
| **Aggiungere un canale locale** | `extra.m3u` (`tvg-id`/`tvg-chno`/`group-title`) | commit; in `/admin` «Aggiorna ora» (o attendere le 6 h) |
| **Nuova fonte EPG** | `SOURCES` in `epg/build-epg.mjs` | `test-epg.mjs`; «Run workflow» di `epg.yml`; controllare i log |
| **Nuovo tema** | `themes.css` (+ `THEMES` in `theme.js`, opzione in `index.html` `#theme`) | provarlo con righe **con EPG**, lista lunga, mobile; aggiornare guida |
| **Nuovo endpoint** | `worker.js` **e** `server.js` (stesso contratto), test in `test-worker.mjs`/`test-server.js` | `wrangler deploy` |
| **Nuovo comando nell'app** | `MainActivity.java` (+ `FIRETV.md`, guida PDF) | `versionCode`/`versionName`, `verifica.sh`, push → build; l'utente aggiorna da Downloader |
| **Cambiare i margini live / buffer** | `start()` in `app.js` (hls.js/dash.js) o `DefaultLoadControl` in `MainActivity.java` | prova reale sui canali Mediaset/Rai: rischio di rimettere le fermate |
| **Cambiare la password admin** | l'utente: `npx wrangler secret put ADMIN_PASSWORD` | disconnette tutti |
| **Tornare indietro** | §15 | |
| **Aggiornare la guida PDF** | `guida/parts/*.html`, schermate | `node guida/build.mjs` |

---

## 21. Idee e lavori non fatti (backlog)
- Conferma `/auto` in auto e, se la manopola non arriva alla pagina, valutare altre strategie (solo frecce; pagina «auto» ancora più semplice: un canale alla volta con grandi pulsanti).
- **Watchdog contro le fermate** (sito e app): cambio fonte automatico se un canale resta fermo 20–25 s *dopo* essere partito (oggi c'è solo l'avvio; nell'app c'è il timer su `BUFFERING`). Non rileva il «loop dei 20 secondi» (il video scorre).
- «Indietro» del browser sul **PC** che chiuda il video (oggi lo fa solo `/auto`): proposto, non richiesto.
- Opzione **«Stabile / Più vicino alla diretta»** (latenza), gesti di swipe sul telefono, rimuovere temi inutilizzati, nascondere canali morti a mano (fatto: admin).
- Altre liste per **TV8 / Nove** (l'utente le cercherà); guida programmi per **Warner TV / Rai Scuola** e canali locali.
- Loghi nell'app Fire TV (oggi no, per leggerezza); ricerca testuale nell'app.
- Password per la visione (`VIEWER_PASSWORD` esiste solo nel server Node).
- Aggiornare periodicamente hls.js/dash.js/mpegts.js (versioni fisse in `index.html`: hls.js 1.5.17, dash.js 4.7.4, mpegts.js 1.7.3) e Media3 (1.3.1).

---

## 22. Glossario
- **M3U/M3U8**: lista di canali (`#EXTM3U`, `#EXTINF`) · **HLS** (`.m3u8`) / **DASH** (`.mpd`) / **TS**: formati di streaming · **DRM**: protezione a chiavi (non riproducibile) · **CORS**: permesso del server perché una pagina web legga un flusso.
- **DTT / LCN**: digitale terrestre / numero del canale sul telecomando · **Fonte**: una versione di un canale in una lista · **Alternative**: più fonti dello stesso canale · **Identità** (`identity`): chiave che riconosce lo stesso canale tra liste.
- **EPG / XMLTV**: guida programmi / suo formato · **PiP**: Picture-in-Picture (finestra flottante) · **PWA**: sito installabile come app.
- **Worker / KV**: programma e archivio di Cloudflare · **APK**: file di installazione Android · **Downloader**: app Fire TV usata per scaricare l'APK · **APTV**: app iOS di terzi con browser in CarPlay · **NBT**: sistema infotainment BMW dell'utente.
- **Punto di ripristino**: ramo `punto-stabile-*` immutabile · **Fai Sync**: messaggio finale che invita l'utente a sincronizzare il Mac.
