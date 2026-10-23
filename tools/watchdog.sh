#!/bin/zsh
# Keeps the terrarium alive: if nothing listens on :8000 for two checks in a row, restart the server (resuming the save).
# If it listens but is frozen (data/world.json, saved every 30 s, older than 3 minutes on three checks in a row), kill it
# so the next checks restart it. A file data/hold makes it stand back, for deliberate restarts.
cd "${0:A:h}/.."
misses=0; stale=0
while true; do
  if [[ -e data/hold ]]; then misses=0; stale=0
  elif pid=$(lsof -ti tcp:8000 -sTCP:LISTEN); then
    misses=0
    age=$(( $(date +%s) - $(stat -f %m data/world.json 2>/dev/null || date +%s) ))
    if (( age > 180 )); then stale=$((stale + 1)); else stale=0; fi
    if (( stale >= 3 )); then
      echo "[watchdog $(date +%H:%M:%S)] server frozen (no save for ${age} s), killing it to restart" >> data/server.log
      kill -9 ${=pid} 2>/dev/null; stale=0
    fi
  else
    misses=$((misses + 1)); stale=0
    if (( misses >= 2 )); then
      echo "[watchdog $(date +%H:%M:%S)] server down, restarting" >> data/server.log
      nohup node server.mjs >> data/server.log 2>&1 &
      misses=0; sleep 20
    fi
  fi
  sleep 15
done
