#!/bin/bash
# Crea sul Desktop del Mac l'app "TV Vannini": apre tv.vannini.online con Safari (non con il browser predefinito).
# Safari su macOS 12 (Monterey) non permette di nascondere la barra degli strumenti: il sito si apre con la barra visibile.
set -e

URL="https://tv.vannini.online"
NAME="TV Vannini"
APP="$HOME/Desktop/$NAME.app"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/app.applescript" <<'APPLESCRIPT'
tell application "Safari"
	activate
	make new document with properties {URL:"https://tv.vannini.online"}
end tell
APPLESCRIPT

rm -rf "$APP"
osacompile -o "$APP" "$TMP/app.applescript"

# Icona: la stessa del sito. Se non si scarica, resta quella standard.
if curl -fsSL --max-time 20 "$URL/icon-512.png" -o "$TMP/icon.png"; then
  SET="$TMP/icon.iconset"
  mkdir "$SET"
  for s in 16 32 128 256 512; do
    sips -z "$s" "$s" "$TMP/icon.png" --out "$SET/icon_${s}x${s}.png" >/dev/null
  done
  for s in 16 32 128 256 512; do
    d=$((s * 2))
    sips -z "$d" "$d" "$TMP/icon.png" --out "$SET/icon_${s}x${s}@2x.png" >/dev/null
  done
  iconutil -c icns "$SET" -o "$APP/Contents/Resources/applet.icns" && touch "$APP"
fi

echo "Fatto: sul Desktop c'e' \"$NAME\". La prima volta il Mac chiede il permesso di controllare Safari: premi OK (nessun altro permesso serve)."
