#!/bin/bash
# ============================================================================
# ripara_permessi.command
#
# Da lanciare quando "Suggerimenti Vendita.app" (o uno degli altri
# eseguibili qui accanto) si rifiuta di aprirsi dopo un download/estrazione
# da zip, con errori tipo:
#   "Non disponi dei permessi necessari per aprire l'applicazione..."
#   "...da uno sviluppatore non identificato"
#
# Cosa fa, sulla cartella del progetto (quella che contiene questo file):
# 1. Ripristina il permesso di esecuzione su tutti gli eseguibili del
#    progetto (l'app principale, l'app che crea l'installer, gli script da
#    terminale, questo stesso file).
# 2. Rimuove l'attributo di quarantena Gatekeeper da tutta la cartella, così
#    macOS non blocca più l'apertura come "sviluppatore non identificato".
#
# Uso: doppio click, oppure se anche questo si rifiuta di aprirsi, apri
# Terminale (Cmd+Spazio, scrivi "Terminale") e incolla:
#   bash "/percorso/della/cartella/sales-ai-assistant/ripara_permessi.command"
# ============================================================================

cd "$(dirname "$0")"
RADICE="$(pwd)"

echo "============================================================"
echo " Riparazione permessi — Suggerimenti Vendita"
echo "============================================================"
echo ""
echo "Cartella progetto: $RADICE"
echo ""

echo "1. Ripristino permesso di esecuzione..."
for ESEGUIBILE in \
  "Suggerimenti Vendita.app/Contents/MacOS/avvia" \
  "Crea Installer.app/Contents/MacOS/crea_installer" \
  "avvia_sistema.command" \
  "crea_installer.command" \
  "ripara_permessi.command"
do
  chmod +x "$RADICE/$ESEGUIBILE" 2>/dev/null \
    && echo "   OK: $ESEGUIBILE" \
    || echo "   ATTENZIONE: non trovato ($ESEGUIBILE)"
done

echo ""
echo "2. Rimozione attributo di quarantena Gatekeeper..."
if command -v xattr &> /dev/null; then
  xattr -dr com.apple.quarantine "$RADICE" 2>/dev/null
  echo "   Fatto (se l'attributo non era presente, non cambia nulla)."
else
  echo "   Comando xattr non trovato: passo saltato (normale se non sei su macOS)."
fi

echo ""
echo "============================================================"
echo " Fatto. Ora prova a riaprire \"Suggerimenti Vendita.app\"."
echo ""
echo " Se compare ancora un avviso di sviluppatore non identificato:"
echo " tasto destro sull'app -> Apri -> conferma \"Apri\" nel dialogo"
echo " (va fatto solo la prima volta)."
echo "============================================================"
echo ""
read -p "Premi INVIO per chiudere..." _
