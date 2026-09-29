#!/bin/bash

# Apre Chrome in modalità app
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --app="file:///Users/davidvannini_1/Documents/progetti/code/SALESASSISTANT/SUGGERIMENTIVENDITA/unified-dashboard.html" &

# Aspetta che la finestra si apra (2 secondi)
sleep 2

# Usa AppleScript per ridimensionare la finestra al 70% dell'altezza
osascript << 'EOF'
tell application "Google Chrome"
    activate
    set screenHeight to (call method "screen" of object (first window)) / 1
    set newHeight to round (screenHeight * 0.7)
    set bounds of first window to {0, 0, 1400, newHeight}
end tell
EOF
