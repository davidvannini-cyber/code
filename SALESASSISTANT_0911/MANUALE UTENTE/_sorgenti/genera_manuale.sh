#!/bin/bash
# Rigenera TUTTO il manuale: schermate (dati di prova) + PDF dei layout C ed E + verifiche.
# Uso:  bash genera_manuale.sh          (schermate + PDF)
#       bash genera_manuale.sh solo-pdf (solo PDF, riusa le schermate già catturate)
# Requisiti: python3 (pypdf, websockets, pillow), node + playwright (globale) con Chromium, font Inter / Bitstream Charter / DejaVu.
set -e
QUI="$(cd "$(dirname "$0")" && pwd)"
RADICE="$(cd "$QUI/../.." && pwd)"          # cartella SALESASSISTANT
export NODE_PATH="$(npm root -g)"
cd "$QUI"
if [ "$1" != "solo-pdf" ]; then
  (cd "$RADICE" && python3 -m http.server 8768 >/dev/null 2>&1) &
  PID_HTTP=$!
  python3 "$QUI/fake_ws.py" >/dev/null 2>&1 &
  PID_WS=$!
  trap 'kill $PID_HTTP $PID_WS 2>/dev/null' EXIT
  sleep 2
  node cattura_tutto.js
fi
python3 manuale.py
echo "Fatto. I PDF sono nella cartella MANUALE UTENTE."
