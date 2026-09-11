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

verifica_python() {
  if ! command -v python3 &> /dev/null; then
    echo "ERRORE: python3 non trovato. Installalo da python.org o con 'brew install python@3.11', poi riprova."
    exit 1
  fi
  VERSIONE=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
  echo "python3 trovato (versione $VERSIONE)."
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
    python3 -m venv "$VENV_DIR"
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

avvia_sistema_completo() {
  intestazione
  echo "--- Avvio sistema completo (audio + matching + overlay) ---"
  echo ""
  attiva_venv_o_avvisa || { pausa; return; }
  carica_api_key_o_avvisa || { pausa; return; }

  read -p "Indice del device audio: " INDICE
  read -p "Path del contesto sessione [INVIO per usare l'esempio]: " CONTESTO
  if [ -z "$CONTESTO" ]; then
    CONTESTO="contesto-sessione-esempio.json"
  fi

  echo ""
  echo "Apro l'overlay in una finestra flottante (sempre in primo piano)..."
  python overlay/overlay_finestra.py > logs/overlay.log 2>&1 &
  PID_OVERLAY=$!
  sleep 1.5
  if kill -0 "$PID_OVERLAY" 2>/dev/null; then
    echo "Overlay aperto in una finestra sempre in primo piano."
  else
    echo "Finestra flottante non disponibile (dettagli in logs/overlay.log), apro nel browser..."
    PID_OVERLAY=""
    open "$RADICE/overlay/index.html"
  fi

  echo "Avvio il server. Premi Ctrl+C per fermare la chiamata e tornare al menu."
  echo ""
  (cd server && python server_suggerimenti.py --contesto "$CONTESTO" --device "$INDICE") || true

  [ -n "$PID_OVERLAY" ] && kill "$PID_OVERLAY" 2>/dev/null
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
  echo "6) Avvia il sistema completo per una chiamata"
  echo "7) Esci"
  echo ""
  read -p "Scelta [1-7]: " SCELTA
  echo ""

  case "$SCELTA" in
    1) setup_ambiente ;;
    2) configura_api_key ;;
    3) elenca_device_audio ;;
    4) test_cattura_audio ;;
    5) test_motore_matching ;;
    6) avvia_sistema_completo ;;
    7) echo "A presto."; exit 0 ;;
    *) echo "Scelta non valida."; pausa ;;
  esac
done
