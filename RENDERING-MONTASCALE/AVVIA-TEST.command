#!/bin/bash
# Doppio clic per avviare tutto: aggiorna, installa, avvia backend+frontend, apre il browser.
cd "$(dirname "$0")" || exit 1
ROOT="$(git rev-parse --show-toplevel)"

echo "Aggiorno il progetto..."
git -C "$ROOT" pull --ff-only origin main 2>&1 | tail -2

KEYFILE="$HOME/.montascale-gemini-key"
if [ ! -s "$KEYFILE" ]; then
  echo "Prima volta: incolla la GEMINI_API_KEY e premi Invio:"
  read -r KEY
  echo "$KEY" > "$KEYFILE"
fi
echo "GEMINI_API_KEY=$(cat "$KEYFILE")" > backend/.env

for d in backend frontend; do
  [ -d "$d/node_modules" ] || (cd "$d" && npm install --no-audit --no-fund)
done

lsof -ti:3001 | xargs kill 2>/dev/null
lsof -ti:5173 | xargs kill 2>/dev/null

(cd backend && npm run dev > /tmp/montascale-backend.log 2>&1) &
(cd frontend && npm run dev > /tmp/montascale-frontend.log 2>&1) &

sleep 5
open http://localhost:5173
echo "Attivo su http://localhost:5173 — chiudi questa finestra per fermare tutto."
trap 'kill 0' EXIT
wait
