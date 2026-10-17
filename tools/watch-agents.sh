#!/bin/zsh
# Watches AGENTS.md and prints one line per change (what was added or removed), for the steward's session monitor.
# A copy of the last seen version lives in data/.agents-seen.md (runtime, not committed).
cd "${0:A:h}/.."
seen=data/.agents-seen.md
[[ -f $seen ]] || cp AGENTS.md $seen
while true; do
  if ! cmp -s AGENTS.md $seen; then
    d=$(diff $seen AGENTS.md | grep '^[<>]' | head -6 | cut -c1-200 | tr '\n' ' ')
    echo "AGENTS.md changed $(date '+%H:%M:%S'): $d"
    cp AGENTS.md $seen
  fi
  sleep 10
done
