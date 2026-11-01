#!/bin/bash
# Gira SUL MAC MINI M1, una volta sola. Attiva il controllo di GitHub ogni 5 minuti.
set -e
DEST="$HOME/rilevazione-prezzi"
LABEL="online.vannini.prezzi.aggiorna"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
chmod +x "$DEST/aggiorna_da_github.sh"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$DEST/aggiorna_da_github.sh</string></array>
  <key>StartInterval</key><integer>300</integer>
  <key>RunAtLoad</key><true/>
</dict></plist>
PL
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Fatto. Controllo GitHub ogni 5 minuti. Log: $DEST/logs/aggiorna.log"
