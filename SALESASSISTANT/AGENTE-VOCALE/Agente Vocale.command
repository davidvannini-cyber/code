#!/bin/bash
# Avvia l'agente vocale (lasciare questa finestra aperta durante le chiamate).
cd "$(dirname "$0")/orchestratore" || exit 1
PY=./.venv/bin/python3; [ -x "$PY" ] || PY=python3
( sleep 2; open "http://127.0.0.1:$(grep -o '"porta": *[0-9]*' config.local.json 2>/dev/null | grep -o '[0-9]*$' || echo 8770)/?t=$(grep -o '"token": *"[^"]*"' config.local.json 2>/dev/null | cut -d'"' -f4)" ) &
exec "$PY" orchestratore.py
