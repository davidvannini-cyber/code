#!/bin/bash
# Avvia MODEL3D: prima il server di sviluppo, poi apre l'app nel browser.
# Puoi copiare questo file sulla Scrivania: trova da solo la cartella "code".
# Per fermare tutto chiudi questa finestra (o premi Ctrl+C).

PORTA=5173
URL="http://localhost:$PORTA/code/MODEL3D/"

errore() {
  echo ""
  echo "ATTENZIONE: $1"
  read -p "Leggi sopra e premi Invio per chiudere."
  exit 1
}

# Il Terminale aperto con doppio clic non carica sempre il PATH di npm.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin:$PATH"
command -v npm >/dev/null 2>&1 || errore "Node.js/npm non trovato. Installalo da https://nodejs.org e riprova."

# 1) Cerca la cartella MODEL3D: prima accanto a questo file, poi nei posti più comuni.
QUI="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
CARTELLA=""
for c in "$QUI" "$HOME/Documents/progetti/code/MODEL3D" "$HOME/Documents/code/MODEL3D" "$HOME/code/MODEL3D"; do
  if [ -f "$c/vite.config.ts" ]; then CARTELLA="$c"; break; fi
done
[ -z "$CARTELLA" ] && errore "cartella MODEL3D non trovata."
cd "$CARTELLA" || errore "non riesco ad aprire $CARTELLA"
echo "Cartella: $CARTELLA"

# 2) Porta già occupata?
if lsof -iTCP:$PORTA -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Il server è già attivo sulla porta $PORTA: apro direttamente l'app."
  open "$URL"
  sleep 3
  exit 0
fi

# 3) Prima volta: installa le dipendenze.
if [ ! -d node_modules ]; then
  echo "Installo le dipendenze (solo la prima volta)..."
  npm install || errore "npm install non è riuscito."
fi

# 4) Avvia il server in secondo piano e chiudilo quando si chiude la finestra.
echo "Avvio il server..."
npm run dev -- --port $PORTA --strictPort >/tmp/model3d-server.log 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT INT TERM HUP

# 5) Aspetta che risponda (max 60 secondi), poi apre l'app.
for i in $(seq 1 60); do
  if curl -s -o /dev/null "$URL"; then break; fi
  kill -0 $SERVER 2>/dev/null || { cat /tmp/model3d-server.log; errore "il server non è partito."; }
  sleep 1
done
curl -s -o /dev/null "$URL" || { cat /tmp/model3d-server.log; errore "il server non risponde."; }

echo "Server pronto. Apro $URL"
open "$URL"
echo ""
echo "MODEL3D è in esecuzione. Lascia questa finestra aperta mentre lavori."
echo "Per fermare tutto chiudila (o premi Ctrl+C)."
wait $SERVER
