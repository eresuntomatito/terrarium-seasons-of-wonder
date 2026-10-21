#!/bin/zsh
# The steward's ordinary restart (STEWARD.md): hold the watchdog, stop the server (it saves on SIGINT), optionally
# switch on rollout keys from the next season, start it again, release the watchdog.
#   zsh tools/restart.sh                 restart only (new code loads)
#   zsh tools/restart.sh trees speciate2  … and set rollout.<key> = next season for each key not already set
#   zsh tools/restart.sh carrionGut=0     … or a parameter override, saved in the world (world.tune) and applied on load
#   zsh tools/restart.sh world.grassLean=0.665  … or a world value set once (logged in data/steward.md)
cd "${0:A:h}/.." || exit 1
touch data/hold
pid=$(lsof -ti tcp:8000 -sTCP:LISTEN)
[ -n "$pid" ] && kill -INT $pid
for i in {1..20}; do lsof -ti tcp:8000 -sTCP:LISTEN >/dev/null || break; sleep 0.5; done
if [ $# -gt 0 ]; then
  node -e '
    const fs = require("fs"), w = JSON.parse(fs.readFileSync("data/world.json"));
    for (const k of process.argv.slice(1)) {
      if (k.startsWith("world.") && k.includes("=")) { const [key, v] = k.slice(6).split("="); console.log(`world.${key}: ${w[key]} -> ${v}`); w[key] = Number(v); continue; } // a world value set once (e.g. grassLean)
      if (k.includes("=")) { const [key, v] = k.split("="); (w.tune ??= {})[key] = Number(v); console.log(`tune.${key} = ${v}`); continue; } // a parameter override, kept in the save
      if (w.rollout[k] == null) w.rollout[k] = w.season + 1; console.log(`rollout.${k} = ${w.rollout[k]}`); }
    fs.writeFileSync("data/world.json", JSON.stringify(w));' "$@" || { rm -f data/hold; exit 1; }
fi
nohup node server.mjs >> data/server.log 2>&1 &
for i in {1..30}; do curl -s -o /dev/null localhost:8000/ && break; sleep 0.5; done
rm -f data/hold
curl -s -o /dev/null -w 'server %{http_code}\n' localhost:8000/
