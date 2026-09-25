#!/bin/bash
export PATH="/root/.local/bin:$PATH"
SESSION="claude-rc"
cd /root/progetti/mio-progetto

tmux kill-session -t "$SESSION" 2>/dev/null
tmux new-session -d -s "$SESSION" "claude remote-control"

while tmux has-session -t "$SESSION" 2>/dev/null; do
  sleep 10
done
