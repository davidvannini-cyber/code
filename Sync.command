#!/bin/bash
# Allinea questo Mac con GitHub. Funziona su qualsiasi Mac: trova da solo la cartella "code".
# Se va tutto bene: mostra "Fatto", aspetta 3 secondi e chiude la finestra.
# Se c'è un errore: la finestra resta aperta così puoi leggere il messaggio.

errore() {
  echo ""
  echo "ATTENZIONE: $1"
  read -p "Leggi sopra e premi Invio per chiudere."
  exit 1
}

# 1) Cerca la cartella "code": prima dove si trova questo file, poi nei posti più comuni.
QUI="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
CARTELLA=""
for c in "$QUI" "$HOME/Documents/progetti/code" "$HOME/Documents/code" "$HOME/code"; do
  if [ -d "$c/.git" ]; then CARTELLA="$c"; break; fi
done
[ -z "$CARTELLA" ] && errore "cartella 'code' non trovata."

# 2) Prende le novità da GitHub.
cd "$CARTELLA" || errore "non riesco ad aprire $CARTELLA"
echo "Cartella: $CARTELLA"
git pull --ff-only || errore "il sync non è riuscito. Non è stato cambiato nulla."

echo ""
echo "Fatto. Tutto allineato. Chiudo tra 3 secondi..."
sleep 3

# 3) Chiude la finestra dopo che lo script è terminato, così il Terminale non chiede conferma.
# La prima volta macOS può chiedere di consentire il controllo di "Terminale": scegli OK.
(sleep 1; osascript -e 'tell application "Terminal" to close (every window whose frontmost is true)' >/dev/null 2>&1) &
exit 0
