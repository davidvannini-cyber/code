#!/bin/bash
# Prepara l'agente vocale sul Mac (una volta sola, poi dopo ogni aggiornamento se cambia requirements.txt).
cd "$(dirname "$0")/orchestratore" || exit 1
echo "Preparo l'agente vocale…"
if ! command -v python3 >/dev/null; then echo "Manca Python 3: installalo da python.org e rilancia."; read -r -p "Premi Invio"; exit 1; fi
python3 -m venv .venv && ./.venv/bin/pip install --upgrade pip >/dev/null && ./.venv/bin/pip install -r requirements.txt
if [ ! -f config.local.json ]; then cp config.esempio.json config.local.json; echo "Creato config.local.json: aprilo e scrivi i nomi dei dispositivi audio (vedi COME-USARE.md)."; fi
echo "Fatto."
read -r -p "Premi Invio per chiudere"
