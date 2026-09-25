# PRESENTAZIONE-YESMOBILITY — Handoff (stato al 2026-09-25)

Materiale di presentazione del sistema di gestione lead YesMobility: la catena **CRM → Lead Rework Console → Suggerimenti Vendita**.
Copre la sessione del **21–25 settembre 2026**.

Contiene due documenti distinti:
1. **`presentazione.html`**: deck di **16 slide** per il team/management, linguaggio non tecnico ("cosa fa e perché conviene").
2. **`architettura-tecnica.*`**: documento tecnico ad uso interno (11 capitoli), in HTML + PDF + DOCX.

I progetti descritti vivono in `SALESASSISTANT/LEADREWORKS/` e `SALESASSISTANT/SUGGERIMENTIVENDITA/`, ciascuno con il proprio `HANDOFF.md`.

---

## 1. Stato attuale

| Elemento | Stato |
|---|---|
| Deck 16 slide (`presentazione.html`) | Completo e autonomo: screenshot e loghi incorporati in base64, nessuna dipendenza locale |
| Slide 15 "Cosa ci aspettiamo" | **Numeri ancora da definire**: segnaposto `？%`, `？min`, `？` |
| Documento tecnico HTML | Completo, 11 capitoli, allineato al layout 40/19/40 |
| Documento tecnico PDF | Generato il **2026-09-22**, 10 pagine A4 |
| Documento tecnico DOCX | Generato il **2026-09-21**: è **la versione più vecchia** e contiene residui della conversione HTML (vedi §5) |
| Screenshot | 7 catture reali: **contengono dati personali di un lead vero** (vedi §4) |

---

## 2. Il deck: 16 slide

| # | Sezione | Titolo / contenuto | Visual |
|---|---|---|---|
| 1 | Copertina | "Il sistema che prepara ogni chiamata al posto tuo" | Logo YesMobility |
| 2 | Il punto di partenza | "Oggi ogni chiamata parte da zero": chiamate improvvisate, informazioni sparse, lead che si raffreddano | 4 icone SVG |
| 3 | Come funziona 1/6 | I dati arrivano da soli dal CRM | Icona SVG + box "Il vantaggio" |
| 4 | Come funziona 2/6 | Il sistema capisce a che punto è la trattativa | idem |
| 5 | Come funziona 3/6 | Strategia su misura, senza mai scoprire le carte (riservatezza) | idem |
| 6 | Come funziona 4/6 | La strategia diventa parole pronte da dire | idem |
| 7 | Come funziona 5/6 | Guida sempre visibile + suggerimenti live "in meno di 300 ms" | idem |
| 8 | Come funziona 6/6 | Più si usa, più diventa efficace (libreria che cresce) | idem |
| 9 | Riepilogo | I 6 passi in un colpo d'occhio | Sequenza numerata |
| 10 | Uno sguardo reale 1/5 | Tutto parte da un clic nel CRM | `screenshots/1.png` |
| 11 | Uno sguardo reale 2/5 | I dati arrivano già organizzati | `screenshots/2.png` |
| 12 | Uno sguardo reale 3/5 | Stato e strategia proposti in automatico | `screenshots/3.png` |
| 13 | Uno sguardo reale 4/5 | Script pronto → "Invia a Suggerimenti Vendita" | `screenshots/4.png` |
| 14 | Uno sguardo reale 5/5 | Durante la chiamata: canovaccio, apertura, obiezione sul prezzo | `5_1.png`, `5_2.png`, `5_3.png` |
| 15 | Guardando avanti | "Cosa ci aspettiamo": + chiusure, − tempo di preparazione, + lead recuperati, standard costante | **Numeri segnaposto** |
| 16 | Chiusura | "Lo stesso lavoro di sempre. Fatto meglio, da subito." + "Prossimo passo: iniziamo a usarlo" | Logo Momandis + firma |

---

## 3. Contenuti inclusi

### Screenshot (`screenshots/`, incorporati nel deck)
| File | Cosa mostra | Slide |
|---|---|---|
| `1.png` | Scheda lead nel CRM Facile Salire con il pulsante "Invia a Lead Rework Console" | 10 |
| `2.png` | Lead Rework Console: dati del lead | 11 |
| `3.png` | Lead Rework Console: stato del lead e analisi strategica | 12 |
| `4.png` | Lead Rework Console: script generati + invio a Suggerimenti Vendita | 13 |
| `5_1.png` | Menu Suggerimenti Vendita + pannello chiamata con il canovaccio | 14 |
| `5_2.png` | Suggerimento di apertura in tempo reale | 14 |
| `5_3.png` | Gestione di un'obiezione sul prezzo | 14 |

Nel deck sono **incorporati in base64** (le copie in `screenshots/` servono solo come sorgente). Sostituire un file in `screenshots/` **non** aggiorna il deck: va rigenerato il base64 nell'HTML (vedi §6).

### Diagrammi
- **Deck**: nessun diagramma vero; icone SVG lineari inline (slide 2–8, 10, 16) e la sequenza dei 6 passi (slide 9).
- **Documento tecnico**: diagrammi fatti in HTML/CSS (niente immagini né SVG): tabelle dei componenti, box "Decisione architetturale", tabella delle 3 modalità di chiamata, tabella della disposizione finestre, flusso end-to-end a frecce (§11: CRM → `chrome.storage.local` → Console → Suggerimenti Vendita → Deepgram → matching → suggerimento).

### Design
- **Stessa identità visiva delle app**: sfondo `#0e1117` / pagina `#05070a`, card `#1b1f29`, teal `#14b8a6`, viola `#8b5cf6`, ambra `#f59e0b` (i colori dei pulsanti del menu Suggerimenti Vendita), testo `#f3f4f6` / `#9ca3af`.
- Font **Manrope** (titoli) + **IBM Plex Sans** (testo), più **IBM Plex Mono** nel documento tecnico, da Google Fonts.
- Ogni slide: gradienti radiali teal/viola, logo YesMobility in alto a destra, numero "N / 16" in basso a destra.
- Firma "© Designed and krafted by Momandis David Vannini" in chiusura (stesso testo usato nelle app).
- Navigazione: scroll verticale con **scroll-snap** (una slide per schermata), nessun JavaScript.

---

## 4. TODO

### Priorità alta: prima di mostrare o condividere il deck fuori dal team
- [ ] **Anonimizzare gli screenshot.** `1.png` (e probabilmente `2.png`–`4.png`) mostrano nome, telefono, email e indirizzo di un **lead reale** del CRM, oltre al nome di una collega. Sostituirli con catture di un lead di prova o sfocare i dati, poi rigenerare il base64 nel deck. Vale anche per il PDF.
- [ ] **`5_1.png` mostra un canovaccio non più conforme**: nomina "Facile Salire" ("organizziamo un sopralluogo … con Facile Salire") e chiude sul sopralluogo. Dal 24/09 le regole della Lead Rework Console vietano entrambe le cose. Rifare la cattura con uno script generato dalla versione attuale.
- [ ] `5_1.png` mostra anche il badge rosso **"disconnesso — nuovo tentativo tra 2s"** nel pannello chiamata: da rifare con il pannello connesso.
- [ ] **Slide 15**: sostituire i segnaposto `？%`, `？min`, `？` con valori reali o obiettivi concordati, oppure riformulare la slide senza numeri.

### Allineamento contenuti
- [ ] Slide 7 e documento tecnico §6.3 dichiarano **"meno di 300 ms"** tra frase riconosciuta e suggerimento. Verificarlo con una misura reale, oppure ammorbidire la frase (vale solo quando il matching non ricorre a Claude Haiku).
- [ ] Rigenerare **`architettura-tecnica.docx`** dall'HTML attuale: è del 21/09, precede l'HTML e il PDF, e contiene residui di conversione (testo del pulsante "Esporta / Stampa in PDF", entità `&#39;` / `&quot;` non convertite).
- [ ] Rigenerare **`architettura-tecnica.pdf`** dopo ogni modifica all'HTML (ultimo: 22/09).
- [ ] Documento tecnico §9 (compliance): la tabella elenca **4 regole**, manca la 5ª introdotta il 24/09 (mai nominare l'installatore partner al cliente). Aggiungerla e aggiornare il testo di conseguenza. La tabella di §10 è già allineata al layout 40/19/40.

### Pulizia
- [ ] Rimuovere dal repo i file AppleDouble `screenshots/._*.png` e i `.DS_Store`.
- [ ] Valutare se tenere nel repo il PDF (4,8 MB) o solo l'HTML sorgente.

---

## 5. Note tecniche

### `presentazione.html` (~4,4 MB)
- **File unico self-contained**: 24 immagini PNG in base64 (7 screenshot, logo YesMobility ripetuto nelle 16 slide, logo Momandis). Nessuno `<script>`, nessun riferimento a file locali.
- Unica dipendenza esterna: **Google Fonts**. Senza rete si torna a Segoe UI / Arial; il layout regge, cambia solo il carattere.
- **Esportazione in PDF**: pulsante "Esporta / Stampa in PDF" (`window.print()`). `@media print` imposta `@page { size: A4 landscape; margin: 0 }`, un salto pagina per slide, nasconde la barra di stampa e mantiene lo sfondo scuro. In Chrome serve attivare **"Grafica di sfondo"** nel dialogo di stampa, altrimenti gradienti e card spariscono.
- Il peso è dovuto quasi tutto al logo YesMobility (~69 KB) ripetuto 16 volte. Si potrebbe definire una volta sola (classe CSS con `background-image` o `<use>` SVG) per risparmiare ~1 MB.

### `architettura-tecnica.html`
- Stesso sistema di colori e font del deck. Stampa in **A4 verticale** con margini 22 × 18 mm (`@media print`).
- 11 capitoli: panoramica · cattura dati dal CRM · Lead Rework Console · trasferimento verso Suggerimenti Vendita · app nativa · motore di ascolto · canovaccio · miglioramento libreria · compliance · disposizione finestre · flusso end-to-end.
- È la **fonte di verità** del documento tecnico: PDF e DOCX sono derivati e vanno rigenerati da qui.

### Come aggiornare uno screenshot nel deck
1. Sostituire il file in `screenshots/`.
2. Rigenerare la stringa base64, ad es. `base64 -i screenshots/1.png | tr -d '\n'` su macOS.
3. Sostituire il valore `src="data:image/png;base64,…"` dell'immagine corrispondente, riconoscibile dall'`alt` (es. `alt="Scheda lead nel CRM Facile Salire"`).

### Coerenza con i progetti descritti
Il deck descrive il comportamento **al 21–22/09**. Se cambia qualcosa di visibile nelle app (layout, nomi dei pulsanti, regole di compliance), va aggiornato anche qui, in particolare le slide 10–14 e i capitoli 5, 9 e 10 del documento tecnico.

---

## 6. Struttura dei file

```
PRESENTAZIONE-YESMOBILITY/
├── HANDOFF.md                  # questo file
├── presentazione.html          # DECK 16 slide, self-contained (~4,4 MB, immagini in base64)
├── architettura-tecnica.html   # documento tecnico, fonte di verità (11 capitoli)
├── architettura-tecnica.pdf    # export PDF, 10 pagine A4 (22/09)
├── architettura-tecnica.docx   # export Word (21/09, superato, da rigenerare)
├── MOMANDIS LOGO SMALL.png     # logo Momandis (sorgente; nel deck ce n'è una versione incorporata)
└── screenshots/                # sorgenti delle immagini del deck (contengono dati reali: vedi TODO)
    ├── 1.png                   # CRM Facile Salire, pulsante "Invia a Lead Rework Console"
    ├── 2.png                   # Console: dati lead
    ├── 3.png                   # Console: stato + strategia
    ├── 4.png                   # Console: script + invio
    ├── 5_1.png                 # Suggerimenti Vendita: menu + canovaccio
    ├── 5_2.png                 # suggerimento di apertura live
    ├── 5_3.png                 # obiezione sul prezzo
    └── ._*.png                 # file AppleDouble macOS, da rimuovere
```
