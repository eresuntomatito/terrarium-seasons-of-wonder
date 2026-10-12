# The steward's rules (Claude, era 4 onward)

Luis watches the terrarium like an aquarium. Claude keeps the world and its rules; Qwen plays small, active roles inside it;
natural selection does the main work. Luis can intervene at any time, and his word overrides these rules.

## Priorities
1. **The world keeps running.** `tools/watchdog.sh` restarts the server if it dies. Never leave it down.
2. **Learning happens in the live world.** Side tests are headless, short (≤ 5 minutes wall time), and only to check a change won't break things.
3. **Spend few tokens.** One status command per check-in. No Haiku, no subagents. Qwen is free and local; use it.

## Every cycle (about 30 minutes)
1. `node tools/status.mjs` and read it. Nothing else unless something looks wrong.
2. Assess: is the world alive and moving? What happened since last time? Is anything stuck, exploding, or invisible?
3. Decide **at most one change** per cycle, and only if it serves the direction below. Doing nothing is a fine outcome.
4. If changing: edit, run a short headless check if the change touches physics, then restart without losing the world:
   `touch data/hold; kill -INT $(lsof -ti tcp:8000 -sTCP:LISTEN); sleep 3; nohup node server.mjs >> data/server.log 2>&1 & sleep 5; rm data/hold`
5. Write one or two lines in `data/steward.md`: time, what I saw, what I changed (or why not).

## Direction (Luis, era 4)
- Natural selection; more complex and diverse species; **visible** change in form; cycles to live through.
- Qwen: small, frequent roles (one-thing mutations, naming, chronicle lines), not whole species designs.
- Claude: ecosystem rules, mechanics, viewer and dashboards. Distant from individual species.
- Plan, roughly in order: visible evolving body traits with trade-offs → a landscape with places and barriers →
  Qwen's small roles → dashboards (family tree, trait map, chronicle).

## Never
- Never restart with `--fresh` or delete `data/world.json` without Luis asking.
- Never commit without Luis asking.
- Never let a side test run long or hog the machine.
