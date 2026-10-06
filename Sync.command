#!/bin/bash
# Allinea questo Mac con GitHub.
# Se va tutto bene: mostra "Fatto", aspetta 3 secondi e chiude da solo la finestra del Terminale.
# Se c'è un errore: la finestra resta aperta così puoi leggere il messaggio.
cd /Users/davidvannini_1/Documents/progetti/code && git pull --ff-only
if [ $? -ne 0 ]; then
  echo ""
  read -p "ATTENZIONE: qualcosa non è andato bene. Leggi sopra e premi Invio per chiudere."
  exit 1
fi

echo ""
echo "Fatto. Tutto allineato. Chiudo tra 3 secondi..."
sleep 3

# Chiude la finestra dopo che lo script è terminato, così il Terminale non chiede conferma.
# La prima volta macOS può chiedere di consentire il controllo di "Terminale": scegli OK.
(sleep 1; osascript -e 'tell application "Terminal" to close (every window whose frontmost is true)' >/dev/null 2>&1) &
exit 0
