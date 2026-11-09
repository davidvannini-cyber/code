#!/bin/bash
# Crea "Lead Rework.app" sulla scrivania (app vera, con icona). Si esegue una volta sola.
# L'app resta aperta finché il programma di avvio ha finito (così macOS può chiedere il permesso Automazione per Chrome).
# L'app sulla scrivania richiama il programma di avvio dentro questa cartella: se aggiorni il
# progetto (Sync) non serve rifarla; se sposti la cartella, rieseguire questo file.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
LAUNCHER="$DIR/Lead Rework.app/Contents/MacOS/launcher"
APP="$HOME/Desktop/Lead Rework.app"
chmod +x "$LAUNCHER"
rm -rf "$APP"
TMP="$(mktemp -d)/avvia.applescript"
cat > "$TMP" <<EOS
do shell script "/bin/bash " & quoted form of "$LAUNCHER" & " >/dev/null 2>&1"
EOS
osacompile -o "$APP" "$TMP"
cp "$DIR/Lead Rework.app/Contents/Resources/icon.icns" "$APP/Contents/Resources/applet.icns"
touch "$APP"
echo "Fatto: $APP"
