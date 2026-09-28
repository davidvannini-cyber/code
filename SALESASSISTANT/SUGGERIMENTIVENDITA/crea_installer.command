#!/bin/bash
# ============================================================================
# crea_installer.command
#
# Crea "Suggerimenti Vendita.dmg": un installer come quelli delle app Mac
# vere, con l'icona dell'app da trascinare nella cartella Applicazioni.
# Va eseguito UNA VOLTA (o ogni volta che vuoi rigenerare il .dmg dopo aver
# modificato l'app), con un doppio click, su un Mac — usa "hdiutil", un
# programma che esiste solo su macOS, per questo il .dmg non può essere
# creato altrove.
#
# Al termine trovi "Suggerimenti Vendita.dmg" nella cartella del progetto:
# è il file da distribuire. Chi lo apre vede una finestra con l'icona
# dell'app e un collegamento alla cartella Applicazioni: basta trascinare
# l'una sull'altro, come per qualsiasi altra app scaricata da internet.
# L'app resta lì dentro Applicazioni, pronta da riaprire quando serve,
# esattamente come qualunque altra applicazione installata sul Mac.
# ============================================================================

set -e

cd "$(dirname "$0")"
RADICE="$(pwd)"
APP="$RADICE/Suggerimenti Vendita.app"
NOME_VOLUME="Suggerimenti Vendita"
DMG_FINALE="$RADICE/Suggerimenti Vendita.dmg"

if [ ! -d "$APP" ]; then
  echo "ERRORE: non trovo \"Suggerimenti Vendita.app\" in questa cartella."
  exit 1
fi

echo "============================================================"
echo " Creazione installer: Suggerimenti Vendita.dmg"
echo "============================================================"
echo ""

echo "Aggiorno il codice dentro l'app con quello di questa cartella..."
RISORSE_APP="$APP/Contents/Resources/progetto"
for CARTELLA in audio-capture matching-engine server schema overlay menu; do
  rm -rf "$RISORSE_APP/$CARTELLA"
  cp -R "$RADICE/$CARTELLA" "$RISORSE_APP/$CARTELLA"
done
echo "  (nota: se avevi fatto crescere la libreria script usando l'app già"
echo "  installata, questo passo la sovrascrive con quella qui in"
echo "  schema/esempio-libreria-script.json — copiala qui prima di rifare"
echo "  l'installer se vuoi redistribuire quella cresciuta.)"
echo ""

STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

echo "Preparo il contenuto dell'installer..."
cp -R "$APP" "$STAGING/"
ln -s /Applications "$STAGING/Applicazioni"

# Non distribuire mai venv/, logs/ o .env di un'installazione di test fatta
# in questa stessa cartella: chi riceve il .dmg deve fare il proprio setup
# (l'.env in particolare conterrebbe le TUE API key).
rm -rf "$STAGING/Suggerimenti Vendita.app/Contents/Resources/progetto/venv" \
       "$STAGING/Suggerimenti Vendita.app/Contents/Resources/progetto/logs" \
       "$STAGING/Suggerimenti Vendita.app/Contents/Resources/progetto/.env"

rm -f "$DMG_FINALE"
DMG_TEMPORANEO="$STAGING/temp.dmg"

echo "Costruisco l'immagine disco..."
hdiutil create -volname "$NOME_VOLUME" -srcfolder "$STAGING/Suggerimenti Vendita.app" \
  -fs HFS+ -format UDRW -size 300m "$DMG_TEMPORANEO" > /dev/null

# Ricrea il collegamento ad Applicazioni dentro l'immagine (hdiutil -srcfolder
# sopra ha impacchettato solo l'app: qui aggiungiamo l'alias separatamente
# per poterlo posizionare a piacere nella finestra Finder).
MOUNT_DIR="/Volumes/$NOME_VOLUME"
hdiutil attach "$DMG_TEMPORANEO" -mountpoint "$MOUNT_DIR" -nobrowse -quiet
ln -s /Applications "$MOUNT_DIR/Applicazioni"

echo "Sistemo l'aspetto della finestra..."
osascript <<EOF
tell application "Finder"
  tell disk "$NOME_VOLUME"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set the bounds of container window to {200, 150, 680, 420}
    set viewOptions to the icon view options of container window
    set arrangement of viewOptions to not arranged
    set icon size of viewOptions to 96
    set position of item "Suggerimenti Vendita.app" of container window to {110, 140}
    set position of item "Applicazioni" of container window to {370, 140}
    close
    open
    update without registering applications
  end tell
end tell
EOF

sync
hdiutil detach "$MOUNT_DIR" -quiet

echo "Comprimo l'immagine finale..."
hdiutil convert "$DMG_TEMPORANEO" -format UDZO -o "$DMG_FINALE" -quiet

echo ""
echo "Fatto: $DMG_FINALE"
echo "Aprilo per verificare che la finestra mostri l'icona dell'app e il collegamento ad Applicazioni."
