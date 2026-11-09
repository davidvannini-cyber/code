#!/bin/bash
# Toglie il servizio dati. NON cancella i lead in ~/DATI-LEAD (ma senza servizio la Console si apre solo in sola lettura).
PLIST="$HOME/Library/LaunchAgents/it.yesmobility.leadbackup.plist"
launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || launchctl unload "$PLIST" >/dev/null 2>&1
rm -f "$PLIST"
rm -rf "$HOME/Library/Application Support/LeadReworkBackup"
echo "Servizio rimosso. I lead in ~/DATI-LEAD sono rimasti dove sono."
sleep 4
