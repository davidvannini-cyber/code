#!/bin/bash
# Toglie il server sempre attivo e la rilevazione giornaliera. I dati (prezzi.db) restano.
UIDN="$(id -u)"
for L in server rileva; do
  launchctl bootout "gui/$UIDN/online.vannini.prezzi.$L" 2>/dev/null || true
  rm -f "$HOME/Library/LaunchAgents/online.vannini.prezzi.$L.plist"
done
echo "Automazione rimossa."
