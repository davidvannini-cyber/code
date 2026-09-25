#!/bin/bash

# Script di sincronizzazione locale per SALESASSISTANT
# Sincronizza il repo GitHub con la copia locale su Mac
# Uso: bash sync-local.sh

set -e

# ==================== CONFIGURAZIONE ====================
LOCAL_PATH="/Users/davidvannini_1/Documents/progetti/SALESASSISTANT"
REPO_URL="https://github.com/davidvannini-cyber/code.git"
BRANCH="main"
PYTHON_SERVER_DIR="$LOCAL_PATH/SUGGERIMENTIVENDITA"
PYTHON_SERVER_PORT=8765  # WebSocket server
PYTHON_SERVER_SCRIPT="$PYTHON_SERVER_DIR/server.py"

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==================== FUNZIONI ====================

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verifica che la cartella locale esista
check_local_path() {
    if [ ! -d "$LOCAL_PATH" ]; then
        log_error "Cartella locale non trovata: $LOCAL_PATH"
        exit 1
    fi
    if [ ! -d "$LOCAL_PATH/.git" ]; then
        log_error "Non è un repository Git: $LOCAL_PATH"
        exit 1
    fi
}

# Fa git pull e cattura i file modificati
sync_from_github() {
    log_info "Sincronizzazione in corso da GitHub..."
    cd "$LOCAL_PATH"

    # Cattura lo stato prima del pull
    local before_head=$(git rev-parse HEAD)

    # Esegui il pull
    if git pull origin "$BRANCH" --quiet; then
        local after_head=$(git rev-parse HEAD)

        if [ "$before_head" = "$after_head" ]; then
            log_success "Già aggiornato (nessun cambiamento)"
            return 1  # Nessun aggiornamento
        else
            log_success "Repository aggiornato"
            return 0  # Aggiornato
        fi
    else
        log_error "Errore durante git pull"
        exit 1
    fi
}

# Mostra i file aggiornati
show_updated_files() {
    log_info "File aggiornati:"
    cd "$LOCAL_PATH"

    # Mostra i file modificati nell'ultimo commit
    git diff-tree --no-commit-id --name-only -r HEAD | while read file; do
        echo "   • $file"
    done
}

# Controlla se SUGGERIMENTIVENDITA è stato modificato
has_suggerimentivendita_changes() {
    cd "$LOCAL_PATH"

    # Verifica se ci sono file modificati in SUGGERIMENTIVENDITA
    if git diff-tree --no-commit-id --name-only -r HEAD | grep -q "SUGGERIMENTIVENDITA/"; then
        return 0  # Sì, ci sono cambiamenti
    else
        return 1  # No, nessun cambiamento
    fi
}

# Riavvia il server Python
restart_python_server() {
    log_info "Riavvio del server Python..."

    # Termina i processi Python in ascolto sulla porta
    local pids=$(lsof -ti :$PYTHON_SERVER_PORT 2>/dev/null || true)

    if [ -n "$pids" ]; then
        log_warning "Termino processi sulla porta $PYTHON_SERVER_PORT: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi

    # Verifica che il file server.py esista
    if [ ! -f "$PYTHON_SERVER_SCRIPT" ]; then
        log_warning "File server.py non trovato in $PYTHON_SERVER_DIR"
        log_info "Riavvio manuale necessario: cd $PYTHON_SERVER_DIR && python server.py"
        return 1
    fi

    # Avvia il server in background
    cd "$PYTHON_SERVER_DIR"
    nohup python server.py > /tmp/suggerimentivendita_server.log 2>&1 &
    local server_pid=$!

    # Attendi un secondo e verifica che il processo sia ancora attivo
    sleep 1
    if kill -0 $server_pid 2>/dev/null; then
        log_success "Server Python avviato (PID: $server_pid)"
        log_info "Log: /tmp/suggerimentivendita_server.log"
        return 0
    else
        log_error "Fallimento nell'avvio del server Python"
        cat /tmp/suggerimentivendita_server.log 2>/dev/null || true
        return 1
    fi
}

# ==================== MAIN ====================

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "SYNC SALESASSISTANT v1.0"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verifica
check_local_path
log_success "Cartella locale: $LOCAL_PATH"
echo ""

# Sincronizza
if sync_from_github; then
    echo ""
    show_updated_files
    echo ""

    # Se SUGGERIMENTIVENDITA è cambiato, riavvia il server
    if has_suggerimentivendita_changes; then
        echo ""
        log_warning "Cambiamenti rilevati in SUGGERIMENTIVENDITA"
        restart_python_server
    else
        log_info "SUGGERIMENTIVENDITA non modificato - server non riavviato"
    fi
else
    log_info "Nessun aggiornamento disponibile"
fi

echo ""
log_success "Sincronizzazione completata!"
echo ""
