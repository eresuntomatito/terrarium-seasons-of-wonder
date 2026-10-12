#!/bin/zsh
# Keeps the terrarium alive: if nothing listens on :8000 for two checks in a row, restart the server (resuming the save).
# A file data/hold makes it stand back, for deliberate restarts.
cd "${0:A:h}/.."
misses=0
while true; do
  if [[ -e data/hold ]] || lsof -ti tcp:8000 -sTCP:LISTEN >/dev/null; then misses=0
  else
    misses=$((misses + 1))
    if (( misses >= 2 )); then
      echo "[watchdog $(date +%H:%M:%S)] server down, restarting" >> data/server.log
      nohup node server.mjs >> data/server.log 2>&1 &
      misses=0; sleep 20
    fi
  fi
  sleep 15
done
