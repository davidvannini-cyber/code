#!/bin/bash

# SYNC SALESASSISTANT v1.0
REPO_PATH="/Users/davidvannini_1/Documents/progetti/code/SALESASSISTANT"

echo "ℹ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ℹ SYNC SALESASSISTANT v1.0"
echo "ℹ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✓ Cartella locale: $REPO_PATH"
echo "ℹ Sincronizzazione in corso da GitHub..."

cd "$REPO_PATH/.."
git pull origin main

echo "✓ Repository aggiornato"
echo ""
echo "✓ Sincronizzazione completata!"
