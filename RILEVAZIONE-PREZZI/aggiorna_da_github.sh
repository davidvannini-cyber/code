#!/bin/bash
# Gira SUL MAC MINI M1, lanciato dal workflow GitHub (non da un timer). Scarica da GitHub solo la cartella RILEVAZIONE-PREZZI e,
# se e' cambiato qualcosa, aggiorna ~/rilevazione-prezzi e riavvia il server.
# Non tocca mai: prezzi.db, venv, logs, .browser-profile.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
DEST="$HOME/rilevazione-prezzi"
CLONE="$HOME/.rilevazione-prezzi-git"
LOG="$DEST/logs/aggiorna.log"
mkdir -p "$DEST/logs"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S')  $*" >> "$LOG"; }

PRIMA_VOLTA=0
if [ ! -d "$CLONE/.git" ]; then
  PRIMA_VOLTA=1
  git clone --quiet --depth 1 --filter=blob:none --sparse \
    https://github.com/davidvannini-cyber/code.git "$CLONE" || { log "ERRORE: clone non riuscito"; exit 1; }
  git -C "$CLONE" sparse-checkout set RILEVAZIONE-PREZZI
fi

git -C "$CLONE" fetch --quiet --depth 1 origin main || { log "rete non disponibile, riprovo al prossimo giro"; exit 0; }
if [ "$PRIMA_VOLTA" = 0 ] && git -C "$CLONE" diff --quiet HEAD FETCH_HEAD -- RILEVAZIONE-PREZZI; then
  exit 0   # nessuna novita'
fi
git -C "$CLONE" reset --quiet --hard FETCH_HEAD
SRC="$CLONE/RILEVAZIONE-PREZZI"

# controllo di sintassi: un errore manderebbe il server in crash ripetuto
for f in "$SRC"/*.py; do
  python3 -m py_compile "$f" 2>>"$LOG" || { log "ERRORE di sintassi in $(basename "$f"): aggiornamento annullato"; exit 1; }
done
find "$SRC" -name __pycache__ -prune -exec rm -rf {} +

rsync -a --backup --backup-dir="$DEST/.copia-precedente" \
  --exclude='prezzi.db*' --exclude='venv/' --exclude='logs/' --exclude='.browser-profile/' \
  --exclude='.copia-precedente/' --exclude='__pycache__/' --exclude='esempi/' --exclude='debug_airbnb.*' \
  "$SRC"/ "$DEST"/ || { log "ERRORE: copia non riuscita"; exit 1; }
chmod +x "$DEST"/*.sh
log "Aggiornato a $(git -C "$CLONE" rev-parse --short HEAD); riavvio il server"
launchctl kickstart -k "gui/$(id -u)/online.vannini.prezzi.server" >> "$LOG" 2>&1
