#!/bin/bash

# Ottiene l'altezza dello schermo (macOS)
SCREEN_HEIGHT=$(system_profiler SPDisplaysDataType | grep "Resolution:" | head -n1 | awk '{print $2}')

# Se il comando sopra non funziona, usa un valore di fallback
if [ -z "$SCREEN_HEIGHT" ]; then
    SCREEN_HEIGHT=1440  # fallback per MacBook Air/Pro standard
fi

# Calcola il 70% dell'altezza
WINDOW_HEIGHT=$((SCREEN_HEIGHT * 70 / 100))

# Se WINDOW_HEIGHT è ancora vuoto, usa fallback
if [ -z "$WINDOW_HEIGHT" ] || [ "$WINDOW_HEIGHT" -lt 600 ]; then
    WINDOW_HEIGHT=900
fi

# Apre Chrome in modalità app con l'altezza calcolata
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --app="file:///Users/davidvannini_1/Documents/progetti/code/SALESASSISTANT/SUGGERIMENTIVENDITA/unified-dashboard.html" \
  --window-size=1400,$WINDOW_HEIGHT &
