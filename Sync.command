#!/bin/bash
# Allinea questo Mac con GitHub (repository "code" e repository privato "code-priv"). Funziona su qualsiasi Mac: trova da solo la cartella "code".
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

# 3) Allinea anche il repository PRIVATO "code-priv" (cartella accanto a "code"; se manca la scarica).
PRIV="$(dirname "$CARTELLA")/code-priv"
echo ""
if [ -d "$PRIV/.git" ]; then
  echo "Cartella privata: $PRIV"
  (cd "$PRIV" && git pull --ff-only) || errore "il sync di code-priv non è riuscito. Non è stato cambiato nulla."
else
  echo "Scarico code-priv (prima volta) in: $PRIV"
  git clone https://github.com/davidvannini-cyber/code-priv "$PRIV" \
    || errore "non riesco a scaricare code-priv. Serve l'accesso a GitHub da questo Mac (stesso account del repository privato)."
fi

echo ""
echo "Fatto. Tutto allineato. Chiudo tra 3 secondi..."
sleep 3

# 4) Chiude la finestra dopo che lo script è terminato, così il Terminale non chiede conferma.
# La prima volta macOS può chiedere di consentire il controllo di "Terminale": scegli OK.
(sleep 1; osascript -e 'tell application "Terminal" to close (every window whose frontmost is true)' >/dev/null 2>&1) &
exit 0
