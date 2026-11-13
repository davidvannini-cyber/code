# Istruzioni per Claude (repository `code`)

**Progetto M3U-PLAYER-WEB («TV Vannini»)** — sito `tv.vannini.online`, app Fire TV, modo auto `/auto`, admin, guida programmi:
**prima di qualsiasi lavoro su questo progetto leggi per intero `M3U-PLAYER-WEB/STATO-PROGETTO.md`.**
Contiene architettura, mappa dei file, formati dati, regole dell'utente, trucchi dell'ambiente (niente Android SDK, rete limitata, tag non pubblicabili),
come provare e pubblicare, decisioni già prese, cose già tentate e fallite, stato (provato / da provare) e backlog. Non rianalizzare il codice da zero: parti da lì e aggiornalo.

**Progetto RILEVAZIONE-PREZZI** (da novembre 2026 si lavora nel repository **privato `code-priv`**, cartella `RILEVAZIONE-PREZZI/`; qui resta una copia ferma; prezzi di Booking e Airbnb attorno a Pievepelago, pagina `prezziaffitti.vannini.online`): **prima di lavorarci leggi `RILEVAZIONE-PREZZI/CLAUDE.md`** (architettura, dove gira sull'M1, decisioni, limiti, lavoro da fare).

**Progetto SALESASSISTANT** (Lead Rework, Suggerimenti Vendita, app Rubrica Android, agente vocale): da novembre 2026 si lavora nel repository **privato `code-priv`**, cartella `SALESASSISTANT/`. Qui resta solo una **copia di riserva ferma** (`SALESASSISTANT_OLD/`, stato del 9 novembre 2026): non modificarla.

Esiste anche un progetto in un repository **privato** separato (`tv-player`): non è in questo repository; se David lo nomina, il suo clone locale sta in `tv-player/` (ignorato da git).

**Comandi di David** (`/promemoria`, `/restore`, e quelli futuri): vivono in `COMANDI/` (comando + `istruzioni/` + **un solo PDF** `COMANDI-ISTRUZIONI.pdf`). Quando crei o cambi un comando segui `COMANDI/README.md` (scrivi in `COMANDI/`, lancia `node COMANDI/costruisci.mjs`, committa anche il PDF).

**Promemoria/email programmate**: se David chiede un promemoria via email (anche ripetuto), leggi `AUTOMAZIONI/promemoria-gmail/COME-USARE.md` (si crea una **bozza** Gmail con oggetto `[PROM quando] Titolo`; non usare `create_trigger`: le routine non hanno Gmail).

Promemoria minimi (dettagli nel file):
- **Regole di codifica per tutti i progetti**: segui la skill `karpathy-guidelines` (`.claude/skills/karpathy-guidelines/SKILL.md`): pensa prima di scrivere, codice semplice, modifiche mirate, obiettivi verificabili.
- Rispondi **in italiano semplice**, senza gergo; istruzioni passo-passo con comandi completi; non chiedere né scrivere password.
- Segui l'hook di avvio (`.claude/hooks/consensi-avvio.sh`): 4 domande iniziali con `AskUserQuestion`, lavoro solo dentro `/code`, a fine lavoro riga nel `REGISTRO-SALVATAGGI.md`, push fast-forward su `main` (mai force push), poi «Fai Sync» e il promemoria `/restore`.
- Se David scrive «aspetta il mio Procedi», **non modificare nulla** finché non scrive «Procedi».
- La pagina web normale **non deve cambiare** quando si aggiungono funzioni per altri dispositivi (isolale: `/auto`, app separata).
- Prima di pubblicare lancia le prove (`M3U-PLAYER-WEB/STATO-PROGETTO.md` §14); dichiara sempre cosa non hai potuto provare (Fire TV vera, auto, siti esterni).
- Il «Sync» di David = icona sulla scrivania che lancia `Sync.command` (`git pull --ff-only` di tutto il repo **e anche del repository privato `code-priv`**, cartella accanto a `code`): digli «Fai Sync», non comandi git a mano.
- Pubblicare il sito = `git pull` + `npx wrangler deploy` **dal Mac dell'utente** (due cose diverse: spiegalo sempre).
- Repository **pubblico**: mai segreti, email o ID di account nei file.
