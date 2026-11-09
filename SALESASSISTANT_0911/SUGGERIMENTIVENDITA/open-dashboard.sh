#!/bin/bash

# Apre Chrome in modalità app
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --app="file:///Users/davidvannini_1/Documents/progetti/code/SALESASSISTANT/SUGGERIMENTIVENDITA/unified-dashboard.html" &

# Aspetta che la finestra si apra
sleep 3

# Usa AppleScript per ridimensionare al 70% (900px altezza standard)
osascript << 'EOF'
tell application "System Events"
    tell process "Google Chrome"
        set the size of the first window to {1400, 900}
        set the position of the first window to {0, 0}
    end tell
end tell
EOF
