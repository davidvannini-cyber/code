#!/bin/bash
# Installa su macOS (launchd):
#  1) il server, sempre attivo e riavviato da solo se si ferma
#  2) la rilevazione automatica ogni giorno all'ora indicata
# Uso:  ./installa_automatico.sh [ORA] [MINUTI]      (predefinito 6 15)
# Si disinstalla con ./disinstalla_automatico.sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PY="$DIR/venv/bin/python3"
HOUR="${1:-6}"
MIN="${2:-15}"
AGENTS="$HOME/Library/LaunchAgents"
LOGS="$DIR/logs"
UIDN="$(id -u)"

if [ ! -x "$PY" ]; then
  echo "Non trovo $PY"
  echo "Prima crea l'ambiente: python3 -m venv venv && source venv/bin/activate && pip install playwright && playwright install chromium"
  exit 1
fi
mkdir -p "$AGENTS" "$LOGS"

cat > "$AGENTS/online.vannini.prezzi.server.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>online.vannini.prezzi.server</string>
  <key>ProgramArguments</key><array><string>$PY</string><string>$DIR/server.py</string></array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>EnvironmentVariables</key><dict>
    <key>BOOKING_SOURCE</key><string>playwright</string>
    <key>AIRBNB_SOURCE</key><string>playwright</string>
    <key>HEADED</key><string>1</string>
    <key>PATH</key><string>/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOGS/server.log</string>
  <key>StandardErrorPath</key><string>$LOGS/server.log</string>
</dict></plist>
EOF

cat > "$AGENTS/online.vannini.prezzi.rileva.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>online.vannini.prezzi.rileva</string>
  <key>ProgramArguments</key><array><string>$PY</string><string>$DIR/rileva.py</string></array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>EnvironmentVariables</key><dict>
    <key>HEADED</key><string>1</string>
    <key>PATH</key><string>/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StartCalendarInterval</key><dict>
    <key>Hour</key><integer>$HOUR</integer>
    <key>Minute</key><integer>$MIN</integer>
  </dict>
  <key>StandardOutPath</key><string>$LOGS/rileva.log</string>
  <key>StandardErrorPath</key><string>$LOGS/rileva.log</string>
</dict></plist>
EOF

for L in server rileva; do
  launchctl bootout "gui/$UIDN/online.vannini.prezzi.$L" 2>/dev/null || true
  launchctl bootstrap "gui/$UIDN" "$AGENTS/online.vannini.prezzi.$L.plist"
done

echo
echo "Fatto."
echo " - Server sempre attivo: http://localhost:8000"
echo " - Rilevazione ogni giorno alle $(printf '%02d:%02d' "$HOUR" "$MIN")"
echo " - Registri: $LOGS/server.log e $LOGS/rileva.log"
echo "Per provare subito la rilevazione:  launchctl kickstart gui/$UIDN/online.vannini.prezzi.rileva"
