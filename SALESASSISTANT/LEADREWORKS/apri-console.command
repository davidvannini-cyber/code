#!/bin/bash
# Apre la Lead Rework Console in Chrome "a finestra intera" (modalità app: senza
# barra indirizzi/tab, con i controlli nativi della finestra macOS), non a
# schermo intero — stessa idea dell'app "Suggerimenti Vendita".
# Doppio clic su questo file per avviare (la prima volta macOS potrebbe chiedere
# conferma: tasto destro sul file -> Apri).
# Profilo Chrome da usare SEMPRE (nome della CARTELLA del profilo, da chrome://version -> "Percorso profilo").
# Senza questa indicazione Chrome sceglie l'ultimo profilo usato, anche uno vuoto, e la Console si apre senza lead.
PROFILO="Profile 1"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Uno spazio "crudo" in un indirizzo file:// (es. una cartella chiamata "HD REM")
# manda in confusione Chrome, che apre la finestra ma senza caricare nulla:
# va convertito in %20 prima di costruire l'URL.
DIR_URL="${DIR// /%20}"
# -n forza una nuova istanza di Chrome: se Chrome è già aperto, "open -a" da solo
# si limita a riportarlo in primo piano e ignora i parametri (--app, l'indirizzo
# da aprire) perché vengono letti solo all'avvio di un nuovo processo.

# Prima colonna (sinistra) sullo schermo principale, larghezza 35%, altezza circa 90%:
# stesso layout di background.js (browser-extension) e degli altri due pannelli
# di Suggerimenti Vendita — menu 15% (menu_finestra.py, parte dal 35%) e
# pannello chiamata 25% (Contents/MacOS/avvia, parte dal 50%). Layout approvato
# dall'utente il 2026-09-29: tre finestre affiancate; altezza portata al 90% il 2026-10-27.
# Area libera dello schermo (senza barra dei menu e Dock), in percentuale: uguale su monitor esterno e portatile.
GEO=$(osascript -l JavaScript -e 'ObjC.import("AppKit"); var s=$.NSScreen.screens.objectAtIndex(0); var f=s.frame, v=s.visibleFrame; [v.origin.x, f.size.height-(v.origin.y+v.size.height), v.size.width, v.size.height].map(Math.round).join(" ")' 2>/dev/null)
set -- $GEO
if [ $# -eq 4 ]; then
  open -na "Google Chrome" --args --profile-directory="$PROFILO" --app="file://$DIR_URL/src/lead-rework-console.html" --window-position=$1,$2 --window-size=$(( $3 * 35 / 100 )),$(( $4 * 90 / 100 ))
else
  # Fallback se osascript non è disponibile per qualche motivo: comportamento precedente.
  open -na "Google Chrome" --args --profile-directory="$PROFILO" --app="file://$DIR_URL/src/lead-rework-console.html" --start-maximized
fi
