#!/bin/bash
# Crea "Lead Collector.app" sulla scrivania (app vera, con icona). Si esegue una volta sola.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
LAUNCHER="$DIR/Lead Collector.app/Contents/MacOS/launcher"
APP="$HOME/Desktop/Lead Collector.app"
chmod +x "$LAUNCHER"
rm -rf "$APP"
TMP="$(mktemp -d)/avvia.applescript"
cat > "$TMP" <<EOS
do shell script "/bin/bash " & quoted form of "$LAUNCHER" & " >/dev/null 2>&1 &"
EOS
osacompile -o "$APP" "$TMP"
cp "$DIR/Lead Collector.app/Contents/Resources/icon.icns" "$APP/Contents/Resources/applet.icns"
touch "$APP"
echo "Fatto: $APP"
