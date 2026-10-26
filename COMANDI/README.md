# COMANDI

Qui stanno **tutti i comandi** che David può scrivere a Claude (`/promemoria`, `/restore`, …) e le istruzioni per usarli.

| Cosa | Dove |
|---|---|
| Il comando (testo che Claude segue) | `COMANDI/<nome>.md` |
| Le istruzioni per David, in italiano semplice | `COMANDI/istruzioni/<nome>.md` |
| **Il PDF unico con le istruzioni di tutti i comandi** | `COMANDI/COMANDI-ISTRUZIONI.pdf` (si rigenera da solo con lo script) |
| Lo script che copia i comandi dove Claude li legge e costruisce il PDF | `COMANDI/costruisci.mjs` |

## Regole (per Claude, ogni volta che si crea o si cambia un comando)
1. Scrivi/modifica il comando in **`COMANDI/<nome>.md`** (mai direttamente in `.claude/commands/`: quella cartella è una copia generata).
2. Scrivi/aggiorna le **istruzioni** in `COMANDI/istruzioni/<nome>.md` con queste sezioni: *A cosa serve · Come si usa · Esempi · Cosa succede · Cose da non fare · Se qualcosa non va*. Italiano semplice, frasi corte.
3. Lancia **`node COMANDI/costruisci.mjs`** dalla radice del repository: copia i comandi in `.claude/commands/` e **rigenera il PDF unico**. Lo script avvisa se un comando non ha le istruzioni.
4. Committa insieme: comando, istruzioni, `.claude/commands/<nome>.md` e il PDF; aggiungi la riga a `REGISTRO-SALVATAGGI.md`.
5. A fine lavoro scrivi «Fai Sync».

`node COMANDI/costruisci.mjs --verifica` controlla soltanto che ogni comando abbia le istruzioni.
Il PDF richiede Playwright con Chromium (come `M3U-PLAYER-WEB/guida/build.mjs`): variabile `PLAYWRIGHT` per indicare dove sta.
