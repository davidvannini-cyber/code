#!/bin/bash
# Apre la Lead Rework Console in Chrome "a finestra intera" (modalità app: senza
# barra indirizzi/tab, con i controlli nativi della finestra macOS), non a
# schermo intero — stessa idea dell'app "Suggerimenti Vendita".
# Doppio clic su questo file per avviare (la prima volta macOS potrebbe chiedere
# conferma: tasto destro sul file -> Apri).
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Uno spazio "crudo" in un indirizzo file:// (es. una cartella chiamata "HD REM")
# manda in confusione Chrome, che apre la finestra ma senza caricare nulla:
# va convertito in %20 prima di costruire l'URL.
DIR_URL="${DIR// /%20}"
# -n forza una nuova istanza di Chrome: se Chrome è già aperto, "open -a" da solo
# si limita a riportarlo in primo piano e ignora i parametri (--app, l'indirizzo
# da aprire) perché vengono letti solo all'avvio di un nuovo processo.

# Prima colonna (sinistra) sullo schermo principale, larghezza 40%: stesso
# schema usato per il menu di Suggerimenti Vendita (19%, menu_finestra.py) e
# per il pannello chiamata (40%, Contents/MacOS/avvia dentro Suggerimenti
# Vendita.app) — tre finestre affiancate in proporzioni fisse, invece di
# finestre sparse di dimensioni diverse. Proporzioni scelte dall'utente.
BOUNDS=$(osascript -e 'tell application "Finder" to get bounds of window of desktop' 2>/dev/null)
if [ -n "$BOUNDS" ]; then
  SCREEN_W=$(echo "$BOUNDS" | awk -F', ' '{print $3}')
  SCREEN_H=$(echo "$BOUNDS" | awk -F', ' '{print $4}')
  COL_W=$(( SCREEN_W * 40 / 100 ))
  open -na "Google Chrome" --args --app="file://$DIR_URL/src/lead-rework-console.html" --window-position=0,0 --window-size=${COL_W},${SCREEN_H}
else
  # Fallback se osascript non è disponibile per qualche motivo: comportamento precedente.
  open -na "Google Chrome" --args --app="file://$DIR_URL/src/lead-rework-console.html" --start-maximized
fi
