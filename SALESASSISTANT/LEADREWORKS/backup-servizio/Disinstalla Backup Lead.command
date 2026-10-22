#!/bin/bash
# Toglie il servizio di backup automatico. NON cancella i backup in ~/BACKUP-LEAD.
PLIST="$HOME/Library/LaunchAgents/it.yesmobility.leadbackup.plist"
launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || launchctl unload "$PLIST" >/dev/null 2>&1
rm -f "$PLIST"
rm -rf "$HOME/Library/Application Support/LeadReworkBackup"
echo "Servizio rimosso. I backup in ~/BACKUP-LEAD sono rimasti dove sono."
sleep 4
