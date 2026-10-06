#!/bin/bash
# Allinea questo Mac con GitHub e poi chiude da solo la finestra del Terminale.
cd /Users/davidvannini_1/Documents/progetti/code && git pull --ff-only
echo ""
read -p "Fatto. Premi Invio per chiudere."

# Chiude la finestra del Terminale che ha lanciato lo script.
# Il comando parte in secondo piano e chiude la finestra dopo che lo script è già terminato,
# così il Terminale non chiede conferma. La prima volta macOS può chiedere di consentire il controllo di "Terminale": scegli OK.
(sleep 1; osascript -e 'tell application "Terminal" to close (every window whose frontmost is true)' >/dev/null 2>&1) &
exit 0
