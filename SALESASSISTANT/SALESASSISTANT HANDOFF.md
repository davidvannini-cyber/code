# SALESASSISTANT — Handoff di sintesi (stato al 2026-09-30)

Sintesi unica di `HANDOFF.md`, `RIEPILOGO_SISTEMA.md` e `README.md`. È il file da usare per riprendere il lavoro. In caso di conflitto tra i documenti: **codice > `HANDOFF.md` > README > RIEPILOGO_SISTEMA**. Per i dettagli, vedi `HANDOFF.md`.

## 1. Cos'è
Assistente live per le chiamate di vendita YesMobility. Ascolta la voce del cliente, la trascrive (Deepgram) e mostra all'operatore il suggerimento più adatto preso dalla libreria script (17 script, 16 attivi).

Percorso repo: `SALESASSISTANT/SUGGERIMENTIVENDITA/`. Sul Mac: `/Users/davidvannini_1/Documents/progetti/code/SALESASSISTANT/SUGGERIMENTIVENDITA/` (aggiornato con `git pull origin main`).

## 2. Architettura
```
Chrome (getUserMedia) → PCM16 mono 16 kHz → WebSocket 8765
  → server_suggerimenti.py (HTTP 8766 serve overlay/index.html)
  → Deepgram nova-2, italiano, endpointing 300 ms
  → motore_suggerimenti.py: embedding locale MiniLM-L12 multilingue;
    tie-break con Claude Haiku solo nei casi ambigui
  → suggerimento mostrato nel pannello chiamata (overlay)
```
- Il microfono è catturato **dal browser**, non da Python: l'app senza Developer ID non ottiene in modo affidabile il permesso microfono (TCC).
- Hardware: splitter TRRS. Il Mac riceve solo la voce del cliente; la voce dell'operatore va direttamente al telefono e non viene trascritta.
- Generazione testi script con AI: `genera_testo_script.py` (Sonnet). Frasi del cliente salvate in `logs/frasi_raccolte.jsonl` per la revisione dal menu.

## 3. Componenti
- `Suggerimenti Vendita.app`: bundle autosufficiente, con una **copia completa** del progetto in `Contents/Resources/progetto/`. L'app legge solo quella copia.
- `Contents/MacOS/avvia`: launcher vero (~1030 righe), esiste solo nel bundle. `avvia_sistema.command` è una versione vecchia e divergente (niente Gestione Lead, niente layout finestre).
- `menu/`: finestra Cocoa (PyObjC + WebKit), server "lead in attesa" sulla porta 8767, schema URL `suggerimentivendita://`.
- `overlay/index.html`: pannello chiamata (selettore dispositivo, spia livello, AGC + limiter, canovaccio, suggerimenti, Pausa / Termina).
- `matching-engine/`, `audio-capture/` (solo test da terminale), `schema/`, `server/`.
- `Crea Installer.app` / `crea_installer.command`: generano il `.dmg` e risincronizzano il bundle.

## 4. Tre modalità di chiamata (menu)
| Modalità | Azione | Canovaccio |
|---|---|---|
| Chiamata YesMobility | `avvia_chiamata_yesmobility` | nessuno |
| Chiamata Gestione Lead | `avvia_chiamata_gestione_lead` (`?avvio=gestione_lead`) | dalla Lead Rework Console, via estensione Chrome (`chrome.storage.local`); il pulsante si illumina quando c'è un lead in attesa |
| Rinforzo Facile Salire | `avvia_chiamata_rinforzo` | fisso, `schema/canovaccio-rinforzo-facile-salire.json` |

Il menu ha anche gli strumenti: rivedi frasi raccolte, aggiungi script (anche con testo AI), libreria, profilo azienda, setup ambiente, API key, test audio, test matching.

## 5. Layout a 3 finestre (approvato il 2026-09-29)
Tutte alte il 60% dello schermo: **Lead Rework Console 35%** (da 0%) · **Menu 15%** (da 35%) · **Overlay 25%** (da 50%).
- Console: `../LEADREWORKS/browser-extension/background.js`.
- Menu: `menu/menu_finestra.py` (`LARGHEZZA_FRAZIONE`, `OFFSET_FRAZIONE`, `ALTEZZA_FRAZIONE`).
- Overlay: `avvia` → `avvia_chiamata_comune` (`col_w`, `col_x`, `col_h`) **e** lo script di posizionamento in `overlay/index.html`. Vanno aggiornati **entrambi** i punti.
- Ripristino grafica: tag `grafica-ok-2026-09-29` (cartella `RIPRISTINO-GRAFICA-2026-09-29/`) e `grafica-posizioni-ok-2026-09-29` (cartella `RIPRISTINO-GRAFICA-POSIZIONI-2026-09-29/`). Ogni file va rimesso anche nella copia dentro il bundle.

## 6. Porte
8765 WebSocket (audio + suggerimenti) · 8766 HTTP overlay · 8767 `/lead-in-attesa` (finché il menu è aperto).

## 7. Problemi aperti (audio, da tarare in chiamata reale)
1. **Microfono sbagliato**: se lo splitter non è il predefinito di macOS, Chrome ascolta il microfono integrato senza errori. Scegliere lo splitter esplicitamente nel selettore.
2. **AGC** sul segnale di linea: può "pompare" il rumore e abbassare l'inizio delle frasi.
3. **`echoCancellation` / `noiseSuppression`** attivi ma inutili (nessun altoparlante da cancellare): provarli disattivati, uno alla volta.
4. La **spia** misura il segnale *dopo* AGC e compressore: non mostra la saturazione a monte.
5. Nessun guadagno digitale nel browser (`GUADAGNO_AUDIO` vale solo da terminale): leve = livello di ingresso macOS + AGC + volume del telefono.
6. il ricampionamento è lineare senza anti-aliasing (la cattura ora usa `AudioWorklet`).

Diagnosi in ordine: spia → log server (`picco ultimo secondo` ≈ 0 = niente audio, ≈ 32768 = saturazione) → dispositivo esplicito → livello macOS → volume telefono → vincoli `getUserMedia`.

## 8. Sincronizzazione e regole operative
- Flusso: sandbox → GitHub (`origin main`) → Mac (`git pull`, poi SYNC SALESASSISTANT).
- Ogni modifica a un sorgente **non ha effetto sull'app** finché non è copiata anche nel bundle (o si rigenera l'installer). Attenzione: `schema/esempio-libreria-script.json` nel bundle verrebbe sovrascritta.
- Dopo ogni modifica dentro il bundle, sul Mac: Cmd+Q (il server non ricarica il proprio codice) → `codesign --force --deep --sign "<Apple Development>" "Suggerimenti Vendita.app"` → se serve `tccutil reset Microphone …` / `ripara_permessi.command` → se serve `lsregister -f`.
- Dopo modifiche a `../LEADREWORKS/browser-extension/` ricaricare l'estensione in `chrome://extensions`.
- Da non ribaltare: microfono dal browser; niente file fuori dal bundle (`~/Documents` è bloccato per app non firmata); canovaccio solo via estensione; `exec` nel launcher (evita la doppia istanza).

## 9. Discrepanze rilevate tra i documenti
Risolte il 2026-10-09: `README.md` §4.3 (ora 25%, layout 35/15/25), `RIEPILOGO_SISTEMA.md` (3 modalità, porta 8767, pannello in Chrome app), `apri-console.command` (ora 35% × 60%), `avvia_sistema.command` (ora usa l'audio dal browser e ha le 3 modalità).
Restano volutamente separate: la libreria di LEADREWORKS (26 script, numerati 1–27) e quella di SUGGERIMENTIVENDITA (17 script).
Da riallineare nel bundle: i commenti in `Contents/MacOS/avvia` citano ancora le vecchie percentuali (40%/19%); non toccati per non dover rifirmare l'app.

## 10. TODO
- [ ] Tarare l'audio in una chiamata reale (§7) e annotare qui la configurazione che funziona.
- [x] ~~Spia prima del compressore / avviso clipping~~: fatto il 2026-10-09.
- [x] ~~Avviso microfono integrato~~: fatto il 2026-10-09 (da verificare dal vivo).
- [x] ~~Migrare `ScriptProcessor` → `AudioWorklet`~~: fatto il 2026-10-09 (con fallback a ScriptProcessor).
- [ ] Testare dal vivo: bagliore 8767 al primo avvio a freddo, istanza singola dopo `exec`, layout 35/15/25.
- [ ] Espandere la libreria script a 20–30 voci; valutare condizioni CRM nei dialoghi di "Aggiungi script".
