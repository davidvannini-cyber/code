# Linee guida per generare i PDF del manuale (e di altri documenti)

Questo file spiega come è fatto il **Manuale utente di SALES ASSISTANT** e come rigenerarlo o produrne di nuovi
con **la stessa grafica**. Vale per chiunque (persona o assistente AI) debba rifare il PDF in futuro.

## 1. Cosa c'è in questa cartella

| Percorso | Cosa contiene |
|---|---|
| `Manuale-Utente-SALES-ASSISTANT-Layout-C.pdf` | Manuale finale, layout **C** (barra laterale, A4 orizzontale) |
| `Manuale-Utente-SALES-ASSISTANT-Layout-E.pdf` | Manuale finale, layout **E** (editoriale, A4 verticale) |
| `layout-proposte/` | I 5 campioni A–E mostrati per la scelta (5 pagine ciascuno) |
| `_sorgenti/` | Tutto il necessario per rigenerare i PDF (vedi sotto) |
| `LINEE-GUIDA-GENERAZIONE-PDF.md` | Questo file |

Dentro `_sorgenti/`:

| File | Ruolo |
|---|---|
| `genera_manuale.sh` | **Comando unico**: cattura le schermate e genera i due PDF |
| `cattura_tutto.js` | Cattura le schermate con dati di prova e registra dove mettere i numeri (`callouts.json`) |
| `fake_ws.py` | Piccolo server WebSocket finto, solo per far risultare «connesso» il pannello di chiamata |
| `manuale.py` | Impaginatore: misura i blocchi, li distribuisce sulle pagine, crea indice e collegamenti, stampa il PDF |
| `man_render.js` | Chromium: misura le altezze e stampa il PDF |
| `man_lib.py` | Mattoncini per scrivere i contenuti (`cap`, `h2`, `p`, `passi`, `box`, `tab`, `fig`, infografiche) |
| `man_c1.py`, `man_c2.py`, `man_c3.py` | **Il testo del manuale** (Parti 1-2, Parte 3, Parti 4-6 e appendici) |
| `contenuto.py`, `temi.py` | Icone, componenti di base e CSS dei layout |
| `assets/` | Loghi YesMobility e Momandis, audio di prova |
| `screenshots/` | Le schermate catturate (generate, non modificarle a mano) |
| `genera.py`, `render_pdf.js` | Solo per i 5 campioni in `layout-proposte/` |

## 2. Come rigenerare

Requisiti: `python3` con `pypdf`, `websockets` e `pillow`; `node` con `playwright` installato globalmente e Chromium;
i font **Inter**, **Bitstream Charter** (o Liberation Serif) e **DejaVu Sans Mono** installati. Con font diversi
l'aspetto cambia e anche i punti in cui va a capo il testo.

```bash
bash genera_manuale.sh            # schermate + PDF (circa 2-3 minuti)
bash genera_manuale.sh solo-pdf   # solo PDF, riusa le schermate già catturate
python3 manuale.py E              # solo un layout (C oppure E)
```

Al termine lo script scrive per ogni layout il numero di pagine e **due controlli automatici**:

- `TRABOCCAMENTI:` elenca le pagine in cui qualcosa esce dall'area utile (non deve comparire mai);
- `verifica link: N voci controllate, 0 errori, 0 pagine senza icona Indice` conferma che ogni voce dell'indice atterra
  sulla pagina stampata e che ogni pagina (tranne la copertina) ha l'icona che torna all'indice.

Dopo ogni rigenerazione **apri il PDF e sfoglia almeno le pagine nuove o cambiate**: i controlli automatici non
giudicano la leggibilità.

## 3. Struttura del documento (uguale per entrambi i layout)

1. **Copertina** (pagina 1): logo YesMobility 3D, sotto «SALES ASSISTANT» e «User Manual»; in basso, centrati e piccoli, il
   logo Momandis e «© Designed and krafted by Momandis David Vannini» (la scrittura «krafted» è voluta, come nell'app).
2. **Indice** (da pagina 2): capitoli e sezioni, ognuno **cliccabile** e con il numero di pagina.
3. **Parte 1 – Presentazione**: infografiche dei flussi di lavoro.
4. **Parti 2-5**: istruzioni passo per passo con schermate numerate.
5. **Parte 6**: manutenzione, problemi frequenti, glossario e appendici A-D.

Regole fisse:
- **Ogni pagina tranne la copertina ha l'icona «Indice»** che porta alla pagina 2 (nel layout E in basso a sinistra, nel layout C
  come pulsante in alto nella barra laterale).
- Ogni capitolo inizia su una pagina nuova; le sezioni (`h2`) non restano mai sole in fondo a una pagina.
- I numeri di pagina e l'indice sono calcolati dal programma: **non scriverli mai a mano**.

## 4. Specifiche dei due layout

### Layout C – barra laterale (A4 orizzontale, 297 × 210 mm)
- Barra laterale sinistra larga 60 mm, blu scuro `#0f3d52`: logo, pulsante verde **Indice**, le sei Parti (quella corrente evidenziata), numero di pagina.
- Area del testo: margini 13 mm; titolo del capitolo in blu scuro; font **Inter**; corpo 3,3 mm (circa 9,4 pt).
- Colori: blu `#1b6a86`, verde menta `#4fc99b`, blu scuro `#0f3d52`.
- Copertina: striscia blu a sinistra con filetto menta.

### Layout E – editoriale (A4 verticale, 210 × 297 mm)
- Carta color avorio `#fbf7ef`, doppio filetto in alto e filetto in basso, margini laterali 22 mm.
- Titoli in **Bitstream Charter** (serif) con numero di capitolo romano corsivo; testo in **Inter**; corpo 3,45 mm (circa 9,8 pt).
- Colori: blu `#1b6a86`, inchiostro `#1f2b30`, filetti `#cbbfa9`.
- Piè di pagina: icona «Indice» a sinistra, numero di pagina corsivo a destra.

### Elementi comuni
- Icone: linee sottili in SVG (stile Feather), definite in `contenuto.py` e `man_lib.py`.
- **Schermate**: bordo sottile e ombra leggera, con **cerchietti numerati** (`bd`) e legenda accanto o sotto.
- **Riquadri**: azzurro = nota, rosso = attenzione, verde = consiglio.
- **Tabelle**: intestazione blu con testo bianco, righe alternate.
- **Infografiche**: schede con icona, frecce verdi, numeri nei cerchietti.

## 5. Come si scrive o si modifica un contenuto

Il testo sta in `man_c1.py`, `man_c2.py`, `man_c3.py`: ogni funzione `blocchi()` restituisce una lista di mattoncini.

```python
B.append(cap(9, "Titolo del capitolo", "Parte 3", "c9", "Frase introduttiva."))   # nuovo capitolo (nuova pagina)
B.append(h2("c9-pulsante", "9.1", "Titolo della sezione"))                         # sezione: compare nell'indice
B.append(p("Testo con <b>grassetto</b> e <code>comandi</code>."))
B += passi(["Primo passo.", "Secondo passo."])                                      # passi numerati
B.append(box("attenzione", "Testo del riquadro."))                                  # nota | attenzione | consiglio
B.append(tab(["Colonna 1", "Colonna 2"], [["a", "b"]]))                             # tabella (usa tab_split per tabelle lunghe)
B.append(fig("nome-schermata", legend=[("chiave", "Titolo.", "Spiegazione.")], layout="stack", w="100%"))
```

Regole di scrittura (il manuale è per persone **senza nozioni tecniche**):
- Frasi brevi, un'azione per passo, verbo all'imperativo («Premi», «Scegli»). Spiega sempre **che cosa si vede** dopo ogni azione.
- Nomi dei pulsanti **esattamente come nell'app**, in grassetto e tra virgolette basse «…». I messaggi dell'app si riportano alla lettera.
- Spiega ogni parola tecnica la prima volta (o rimanda al glossario).
- Ogni funzione importante ha: a cosa serve → dove si trova → passi → cosa succede → cosa fare se non funziona.
- Mai dati reali: nelle schermate si usano solo lead di prova (es. «Mario Rossi», `mario.rossi@example.com`).
- Quando un riferimento rimanda a un altro capitolo («capitolo 25») **controlla che il numero sia ancora giusto** dopo aver spostato capitoli.

### Aggiungere o cambiare una schermata
1. In `cattura_tutto.js` aggiungi (o modifica) la chiamata `snap(pagina, 'nome-schermata', 'selettore-css', [['chiave', 'selettore-elemento'], ...])`.
   Le chiavi sono gli elementi da numerare; lo script ne salva la posizione in `callouts.json`.
2. Rilancia `bash genera_manuale.sh`.
3. Nel contenuto usa `fig('nome-schermata', legend=[('chiave', 'Titolo.', 'Spiegazione.'), ...])`: i numeri seguono l'ordine della legenda.
   `layout="side"` mette la legenda a destra, `"stack"` sotto; `pos={"chiave": "l"}` sposta il numero sul bordo sinistro dell'elemento.
4. Se un elemento non viene trovato, lo script lo dice: `target non trovato: …`.

### Cose che NON sono schermate vere
- La **schermata dell'app Android** (capitolo 8) è una *rappresentazione* disegnata nel manuale con i testi reali dell'app (`man_c1.py`).
  Per sostituirla con una foto vera, salva lo screenshot in `_sorgenti/screenshots/` e usa `fig('nome', ...)`.
- Le **finestre di dialogo di macOS** (aggiungi script, API key, ecc.) sono spiegate a parole, con i testi esatti, perché non
  si possono catturare in automatico. Se vuoi inserirle: fai lo screenshot sul Mac, copialo in `_sorgenti/screenshots/` e usa `fig(...)`.
- Le pagine di **Chrome** (`chrome://extensions`) e del **CRM Facile Salire** non sono mostrate.

Le schermate della Console, del menu e del pannello di chiamata sono prese **dal codice reale** aperto in Chromium (non su Mac).
Nel pannello gli stati «clipping» e «microfono integrato» sono forzati per poterli fotografare: i testi sono quelli veri.

## 6. Quando va aggiornato il manuale

| Se cambia… | Rivedi i capitoli |
|---|---|
| `LEADREWORKS/src/lead-rework-console.html` | 5-21, Appendice A, Appendice C |
| `LEADREWORKS/browser-extension/` | 4, 9, 18, 33 |
| `SUGGERIMENTIVENDITA/menu/` o `Contents/MacOS/avvia` | 7, 22, 23, 27-30 |
| `SUGGERIMENTIVENDITA/overlay/index.html` | 24-26 |
| `SUGGERIMENTIVENDITA/schema/esempio-libreria-script.json` | Appendice B |
| `RUBRICA-ANDROID/` | 8, 31 |

Dopo una modifica: aggiorna il testo, rilancia `genera_manuale.sh`, sfoglia le pagine cambiate, poi
**committa i due PDF e le sorgenti insieme** e aggiungi una riga a `REGISTRO-SALVATAGGI.md`.

## 7. Aggiungere un nuovo layout o un nuovo documento

- I 5 campioni A-D-… sono in `temi.py` (funzioni `tema_a`…`tema_e`, solo 5 pagine). Il manuale completo supporta **solo C ed E**:
  `manuale.py` contiene le funzioni di pagina `_pg_C` e `_pg_E` e i CSS `CSS_MAN_C`/`CSS_MAN_E`.
- Per un layout nuovo: scrivi una funzione di pagina simile, il suo CSS (variabili `--ink`, `--accent`, `--card`, … come in `temi.py`)
  e aggiungilo a `genera()`. L'impaginatore non cambia: misura la zona `.corpo` della tua pagina e distribuisce i blocchi.
- Per un documento diverso (altro manuale): copia `_sorgenti/`, sostituisci i contenuti in `man_c*.py` e riusa l'impaginatore.
- Principio guida: **il contenuto è separato dalla grafica**. Il testo non contiene mai misure o numeri di pagina; la grafica non
  contiene mai testo del manuale.

## 8. Problemi tipici

| Sintomo | Causa e rimedio |
|---|---|
| `TRABOCCAMENTI` in elenco | Un blocco è più alto della pagina: spezza la tabella con `tab_split` o riduci la schermata (`w=`). |
| `AVVISO: blocco troppo alto` | Come sopra: il blocco non entra nemmeno in una pagina vuota. |
| `LINK ERRATO` / `LINK MANCANTE` | Un `h2` ha un id duplicato o mancante: gli id devono essere unici. |
| I numeri sulle schermate sono fuori posto | Rilancia `genera_manuale.sh` (non solo `solo-pdf`) dopo aver cambiato una schermata: le posizioni sono in `callouts.json`. |
| Il testo è più largo o va a capo diversamente | Mancano i font Inter / Bitstream Charter: installali. |
| `target non trovato` | Il selettore in `cattura_tutto.js` non corrisponde più alla pagina (è cambiata la Console): aggiornalo. |
