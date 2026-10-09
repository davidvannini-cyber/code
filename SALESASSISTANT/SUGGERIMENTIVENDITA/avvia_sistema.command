#!/bin/bash
# ============================================================================
# avvia_sistema.command
#
# File eseguibile: su macOS si lancia con un doppio click (si apre in
# Terminale ed esegue questo script). Copre, tramite un menu, tutti i
# passaggi descritti in README.md: setup ambiente, configurazione API key,
# test dei singoli componenti, avvio del sistema completo.
#
# Se al doppio click macOS si rifiuta di aprirlo (Gatekeeper, file scaricato
# da internet): tasto destro sul file -> Apri -> conferma "Apri" nel
# dialogo. Va fatto solo la prima volta.
#
# Versione a terminale per il debug (log a video). Il launcher vero, con tutte
# le funzioni (menu grafico, porta 8767 "lead in attesa", layout finestre,
# strumenti), è Suggerimenti Vendita.app/Contents/MacOS/avvia. Qui l'audio è
# catturato dal browser come nell'app; "Gestione Lead" richiede che l'estensione
# Chrome di LEADREWORKS abbia un lead in attesa (nessun bagliore nel menu).
# ============================================================================

set -e

# Si posiziona sempre nella cartella del progetto, indipendentemente da dove
# viene lanciato lo script (fondamentale perché aperto con doppio click).
cd "$(dirname "$0")"
RADICE="$(pwd)"

VENV_DIR="$RADICE/venv"
ENV_FILE="$RADICE/.env"
mkdir -p "$RADICE/logs"

# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

pausa() {
  echo ""
  read -p "Premi INVIO per tornare al menu..." _
}

intestazione() {
  clear
  echo "============================================================"
  echo " Sistema di suggerimenti AI live per chiamate di vendita"
  echo "============================================================"
  echo ""
}

# Cerca un python3 che funzioni davvero nei percorsi di installazione noti,
# non solo tramite il PATH corrente (utile soprattutto se questo script viene
# lanciato in contesti con un PATH ridotto).
trova_python3_sistema() {
  local candidati=(
    "/usr/local/bin/python3"
    "/opt/homebrew/bin/python3"
    "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3"
    "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3"
    "/Library/Frameworks/Python.framework/Versions/3.11/bin/python3"
    "/Library/Frameworks/Python.framework/Versions/3.10/bin/python3"
    "/usr/bin/python3"
  )
  local candidato
  for candidato in "${candidati[@]}"; do
    if [ -x "$candidato" ] && "$candidato" --version 2>&1 | grep -q "^Python 3\."; then
      echo "$candidato"
      return 0
    fi
  done
  if command -v python3 &> /dev/null; then
    candidato=$(command -v python3)
    if "$candidato" --version 2>&1 | grep -q "^Python 3\."; then
      echo "$candidato"
      return 0
    fi
  fi
  return 1
}

verifica_python() {
  PYTHON3_SISTEMA=$(trova_python3_sistema)
  if [ -z "$PYTHON3_SISTEMA" ]; then
    echo "ERRORE: Python non è installato correttamente su questo Mac (anche se il comando"
    echo "\"python3\" esiste, non funziona davvero — succede quando mancano gli Strumenti da"
    echo "riga di comando di Apple)."
    echo ""
    echo "Soluzione più leggera (circa 30MB, non serve Xcode): vai su python.org/downloads/macos,"
    echo "scarica l'ultima versione stabile (va bene 3.11, 3.12 o 3.13), apri il file .pkg e"
    echo "installa. Poi rilancia questo script."
    exit 1
  fi
  VERSIONE=$("$PYTHON3_SISTEMA" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
  echo "python3 trovato (versione $VERSIONE): $PYTHON3_SISTEMA"
}

# ---------------------------------------------------------------------------
# Passaggio: setup ambiente (venv + dipendenze) — Parte 2 del README
# ---------------------------------------------------------------------------

setup_ambiente() {
  intestazione
  echo "--- Setup ambiente Python ---"
  echo ""
  verifica_python

  if [ ! -d "$VENV_DIR" ]; then
    echo "Creo l'ambiente virtuale in venv/ ..."
    "$PYTHON3_SISTEMA" -m venv "$VENV_DIR"
  else
    echo "Ambiente virtuale già presente, lo riuso."
  fi

  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"

  echo ""
  echo "Installo/aggiorno le dipendenze (può richiedere qualche minuto la prima volta)..."
  pip install --upgrade pip > /dev/null
  pip install -r audio-capture/requirements.txt
  pip install -r matching-engine/requirements.txt
  pip install -r server/requirements.txt
  pip install -r overlay/requirements.txt
  pip install -r menu/requirements.txt

  echo ""
  echo "Setup completato."
  pausa
}

# ---------------------------------------------------------------------------
# Passaggio: configurazione API key — Parte 2.4 del README
# ---------------------------------------------------------------------------

configura_api_key() {
  intestazione
  echo "--- Configurazione API key ---"
  echo ""

  DEEPGRAM_ATTUALE=""
  ANTHROPIC_ATTUALE=""
  if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    DEEPGRAM_ATTUALE="$DEEPGRAM_API_KEY"
    ANTHROPIC_ATTUALE="$ANTHROPIC_API_KEY"
  fi

  if [ -n "$DEEPGRAM_ATTUALE" ]; then
    echo "DEEPGRAM_API_KEY già configurata (finisce con ...${DEEPGRAM_ATTUALE: -4})."
    read -p "Vuoi sostituirla? [s/N] " RISPOSTA
    if [[ "$RISPOSTA" =~ ^[Ss]$ ]]; then
      read -p "Nuova Deepgram API key: " DEEPGRAM_ATTUALE
    fi
  else
    read -p "Deepgram API key (da deepgram.com): " DEEPGRAM_ATTUALE
  fi

  if [ -n "$ANTHROPIC_ATTUALE" ]; then
    echo "ANTHROPIC_API_KEY già configurata (finisce con ...${ANTHROPIC_ATTUALE: -4})."
    read -p "Vuoi sostituirla? [s/N] " RISPOSTA
    if [[ "$RISPOSTA" =~ ^[Ss]$ ]]; then
      read -p "Nuova Anthropic API key: " ANTHROPIC_ATTUALE
    fi
  else
    read -p "Anthropic API key (da console.anthropic.com): " ANTHROPIC_ATTUALE
  fi

  cat > "$ENV_FILE" <<EOF
DEEPGRAM_API_KEY=$DEEPGRAM_ATTUALE
ANTHROPIC_API_KEY=$ANTHROPIC_ATTUALE
EOF

  echo ""
  echo "Salvate in .env (nella cartella del progetto)."
  pausa
}

carica_api_key_o_avvisa() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Nessuna API key configurata. Vai prima a 'Configura API key' nel menu."
    return 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  if [ -z "$DEEPGRAM_API_KEY" ] || [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "API key mancanti nel file .env. Vai prima a 'Configura API key' nel menu."
    return 1
  fi
  return 0
}

attiva_venv_o_avvisa() {
  if [ ! -d "$VENV_DIR" ]; then
    echo "Ambiente non ancora installato. Esegui prima 'Setup ambiente' dal menu."
    return 1
  fi
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
  return 0
}

# ---------------------------------------------------------------------------
# Passaggio: elenco device audio — Parte 3.1 del README
# ---------------------------------------------------------------------------

elenca_device_audio() {
  intestazione
  echo "--- Device audio disponibili ---"
  echo ""
  attiva_venv_o_avvisa || { pausa; return; }
  (cd audio-capture && python cattura_audio_stt.py --list-devices)
  echo ""
  echo "Segnati l'indice del mic-in collegato allo splitter TRRS: ti servirà nei test successivi."
  pausa
}

# ---------------------------------------------------------------------------
# Passaggio: test cattura audio isolato — Parte 3.2 del README
# ---------------------------------------------------------------------------

test_cattura_audio() {
  intestazione
  echo "--- Test cattura audio + trascrizione (senza matching) ---"
  echo ""
  attiva_venv_o_avvisa || { pausa; return; }
  carica_api_key_o_avvisa || { pausa; return; }

  read -p "Indice del device audio (--list-devices dal menu principale per trovarlo): " INDICE
  echo ""
  echo "Avvio... parla vicino al telefono. Premi Ctrl+C per fermare e tornare al menu."
  echo ""
  (cd audio-capture && python cattura_audio_stt.py --device "$INDICE") || true
  pausa
}

# ---------------------------------------------------------------------------
# Passaggio: test motore di matching senza audio — Parte 3.3 del README
# ---------------------------------------------------------------------------

test_motore_matching() {
  intestazione
  echo "--- Test motore di matching (scrivi frasi come se fossi il cliente) ---"
  echo ""
  attiva_venv_o_avvisa || { pausa; return; }
  carica_api_key_o_avvisa || { pausa; return; }

  echo "Premi Ctrl+C per fermare e tornare al menu."
  echo ""
  python matching-engine/motore_suggerimenti.py \
    schema/esempio-libreria-script.json \
    server/contesto-sessione-esempio.json || true
  pausa
}

# ---------------------------------------------------------------------------
# Passaggio: avvio sistema completo — Parte 4 del README
# ---------------------------------------------------------------------------

# $1 (facoltativo): parametro "avvio" dell'overlay ("gestione_lead",
# "rinforzo_facile_salire"); vuoto = Chiamata YesMobility (nessun canovaccio).
# Stesso flusso dell'app (Contents/MacOS/avvia): il microfono è catturato dal
# BROWSER, il server Python (HTTP 8766 + WebSocket 8765) fa da ponte verso
# Deepgram. Qui il server gira in primo piano, così i log si vedono a video.
avvia_sistema_completo() {
  local parametro_avvio="$1"
  intestazione
  echo "--- Avvio chiamata (browser + server + matching) ---"
  echo ""
  attiva_venv_o_avvisa || { pausa; return; }
  carica_api_key_o_avvisa || { pausa; return; }

  local url="http://localhost:8766/"
  [ -n "$parametro_avvio" ] && url="${url}?avvio=${parametro_avvio}"

  # Layout a 3 finestre (stesso dell'app): console 35% · menu 15% · pannello
  # chiamata 25% (parte dal 50%), tutte alte il 60% dello schermo.
  local bounds screen_w screen_h
  bounds=$(osascript -e 'tell application "Finder" to get bounds of window of desktop' 2>/dev/null)

  # Apre Chrome in modalità app quando il server risponde.
  (
    until curl -s -o /dev/null "http://localhost:8766/"; do sleep 0.3; done
    if [ -n "$bounds" ]; then
      screen_w=$(echo "$bounds" | awk -F', ' '{print $3}')
      screen_h=$(echo "$bounds" | awk -F', ' '{print $4}')
      open -na "Google Chrome" --args --app="$url" \
        --window-position=$(( screen_w * 50 / 100 )),0 \
        --window-size=$(( screen_w * 25 / 100 )),$(( screen_h * 60 / 100 ))
    else
      open -na "Google Chrome" --args --app="$url"
    fi
  ) &
  PID_APRI=$!

  echo "Avvio il server (carica il modello: può richiedere qualche secondo)."
  echo "Il pannello si apre da solo in Chrome. Premi Ctrl+C per fermare la chiamata e tornare al menu."
  echo ""
  (cd server && python -u server_suggerimenti.py --browser-audio) || true

  kill "$PID_APRI" 2>/dev/null
  pausa
}

# ---------------------------------------------------------------------------
# Menu principale
# ---------------------------------------------------------------------------

while true; do
  intestazione
  echo "1) Setup ambiente (crea venv + installa dipendenze)   [fai questo la prima volta]"
  echo "2) Configura API key (Deepgram + Anthropic)            [fai questo la prima volta]"
  echo "3) Elenca device audio disponibili"
  echo "4) Test: solo cattura audio + trascrizione"
  echo "5) Test: solo motore di matching (senza audio)"
  echo "6) Chiamata YesMobility            (suggerimenti live, nessun canovaccio)"
  echo "7) Chiamata Gestione Lead           (canovaccio dalla Lead Rework Console)"
  echo "8) Rinforzo Facile Salire           (canovaccio fisso)"
  echo "9) Esci"
  echo ""
  read -p "Scelta [1-9]: " SCELTA
  echo ""

  case "$SCELTA" in
    1) setup_ambiente ;;
    2) configura_api_key ;;
    3) elenca_device_audio ;;
    4) test_cattura_audio ;;
    5) test_motore_matching ;;
    6) avvia_sistema_completo "" ;;
    7) avvia_sistema_completo "gestione_lead" ;;
    8) avvia_sistema_completo "rinforzo_facile_salire" ;;
    9) echo "A presto."; exit 0 ;;
    *) echo "Scelta non valida."; pausa ;;
  esac
done
