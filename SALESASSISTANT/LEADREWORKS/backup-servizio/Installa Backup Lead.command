#!/bin/bash
# Installa il servizio DATI dei lead: la cartella ~/DATI-LEAD dove la Console legge e salva i lead.
# Parte da solo con il Mac. Lo si lancia con un doppio clic (anche per aggiornarlo). Non cancella nessun dato.
cd "$(dirname "$0")" || exit 1
SRC="$(pwd)/servizio_backup.py"
DEST_DIR="$HOME/Library/Application Support/LeadReworkBackup"
PLIST="$HOME/Library/LaunchAgents/it.yesmobility.leadbackup.plist"
ETICHETTA="it.yesmobility.leadbackup"

PY="$(command -v python3)"
if [ -z "$PY" ] || ! "$PY" --version >/dev/null 2>&1; then
  echo "Python 3 non trovato su questo Mac: non posso installare il servizio."
  echo "Scrivi a Claude cosa vedi qui sopra."
  read -r -p "Premi Invio per chiudere…" _; exit 1
fi

mkdir -p "$DEST_DIR" "$HOME/Library/LaunchAgents" "$HOME/DATI-LEAD"
cp "$SRC" "$DEST_DIR/servizio_backup.py" || { echo "Copia non riuscita"; read -r -p "Premi Invio…" _; exit 1; }
# Descrizione dei salvataggi, accanto ai dati (si aggiorna a ogni installazione)
[ -f "$(dirname "$SRC")/README.txt" ] && cp "$(dirname "$SRC")/README.txt" "$HOME/DATI-LEAD/README.txt"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$ETICHETTA</string>
  <key>ProgramArguments</key>
  <array><string>$PY</string><string>$DEST_DIR/servizio_backup.py</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardErrorPath</key><string>$DEST_DIR/errori.log</string>
  <key>StandardOutPath</key><string>$DEST_DIR/uscita.log</string>
</dict>
</plist>
EOF

UID_NUM="$(id -u)"
launchctl bootout "gui/$UID_NUM" "$PLIST" >/dev/null 2>&1
launchctl bootstrap "gui/$UID_NUM" "$PLIST" 2>/dev/null || launchctl load -w "$PLIST" 2>/dev/null
launchctl kickstart -k "gui/$UID_NUM/$ETICHETTA" >/dev/null 2>&1
sleep 2

if curl -s --max-time 5 http://127.0.0.1:8769/stato | grep -q '"dati-v2"'; then
  echo ""
  echo "✅ Servizio dati installato e attivo."
  echo "   I lead vivono in: $HOME/DATI-LEAD (file leads.json, copie giornaliere in copie/)"
  echo "   Riparte da solo ad ogni accensione del Mac."
  echo "   Copie automatiche in $HOME/DATI-LEAD/copie: una per giorno (30 giorni) e una per ora (48 ore)."
  echo "   (Copia esterna facoltativa: iCloud Drive se attivo, oppure la cartella scritta in DATI-LEAD/copia-esterna.txt)"
  echo "   Ora ricarica la Console: in alto a destra deve comparire «✓ Dati nella cartella ~/DATI-LEAD»."
else
  echo ""
  echo "⚠️  Il servizio non risponde. Guarda: $DEST_DIR/errori.log"
  echo "   Scrivi a Claude cosa vedi qui sopra."
fi
sleep 5
