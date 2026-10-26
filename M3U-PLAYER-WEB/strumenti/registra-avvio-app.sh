#!/bin/bash
# Registra cosa fa la Fire TV mentre un'app (di solito TiviMate) si apre da sola dopo lo spegnimento/riaccensione.
# Guarda il registro del SISTEMA della TV dell'utente (adb logcat): non tocca l'app, non copia nulla.
# Uso:   bash registra-avvio-app.sh inizia  <indirizzo-IP-della-Fire-TV>
#        ... (spegni col telecomando, riaccendi, aspetta che l'app si apra) ...
#        bash registra-avvio-app.sh fine    <indirizzo-IP-della-Fire-TV>   [nome.pacchetto, predefinito ar.tvplayer.tv]
# Il risultato e' sul Desktop: registro-avvio-app.txt (righe utili) e registro-avvio-app-completo.txt.gz (tutto).
set -e
CMD="$1"; IP="$2"; PKG="${3:-ar.tvplayer.tv}"
if [ -z "$CMD" ] || [ -z "$IP" ]; then echo "Uso: bash registra-avvio-app.sh inizia|fine <indirizzo-IP-Fire-TV> [pacchetto]"; exit 1; fi
ADB="$(command -v adb || true)"
[ -z "$ADB" ] && [ -x "$HOME/platform-tools/adb" ] && ADB="$HOME/platform-tools/adb"
[ -z "$ADB" ] && { echo "adb non trovato. Scaricalo da Google (vedi le istruzioni) in $HOME/platform-tools"; exit 1; }

"$ADB" disconnect "$IP:5555" >/dev/null 2>&1 || true
"$ADB" connect "$IP:5555" | tail -1
"$ADB" -s "$IP:5555" get-state >/dev/null 2>&1 || { echo "Non riesco a parlare con la Fire TV. Controlla: Debug ADB acceso, indirizzo giusto, e accetta il riquadro sulla TV."; exit 1; }
A="$ADB -s $IP:5555"

if [ "$CMD" = "inizia" ]; then
  $A logcat -G 16M || true          # registro piu' grande, cosi' non si perde niente durante il riposo
  $A logcat -b all -c               # lo svuota
  echo "FATTO. Ora: chiudi l'app, spegni la Fire TV col telecomando, aspetta 20 secondi, riaccendi,"
  echo "aspetta che l'app si apra da sola (o 1 minuto), poi lancia:  bash registra-avvio-app.sh fine $IP"
elif [ "$CMD" = "fine" ]; then
  OUT="$HOME/Desktop/registro-avvio-app"
  $A logcat -b all -d -v threadtime > "$OUT-completo.txt" 2>&1 || true
  grep -iE "$PKG|ScreenOn|SCREEN_|screen on|screen off|DREAM|HDMI|CEC|cec_|standby|wakefulness|PowerManager|Display ?Power|interactive|START u0|Displayed |BOOT_COMPLETED|LOCKED_BOOT|USER_PRESENT|am_proc_start|am_start|dream|sleep|wake" "$OUT-completo.txt" > "$OUT.txt" || true
  gzip -f "$OUT-completo.txt"
  echo "FATTO. File sul Desktop: registro-avvio-app.txt  (allegalo alla chat). Righe: $(wc -l < "$OUT.txt")"
  echo "Il file contiene solo il registro del sistema della TV (niente password). Se vuoi controllarlo, aprilo prima di inviarlo."
else
  echo "Comando sconosciuto: $CMD (usa inizia o fine)"; exit 1
fi
