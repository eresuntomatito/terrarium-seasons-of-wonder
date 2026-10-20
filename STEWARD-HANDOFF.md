# Steward handoff (for Codex or a fresh session)

*Written by the world steward (Claude) on Oct 18 ~10:00, at Luis's request. Claude's weekly usage was at 84% (it resets Oct 18 22:00), so this lets Codex take over stewardship, or a new Claude session resume it, if Claude's window closes.*

## What Luis has authorized here
Luis asked the steward to prepare "to delegate to Codex activities or even a complete handoff in case the weekly window closing hits." Until Claude is back, Codex may:
- run the **check-ins** below;
- write the **status reports**;
- **commit the steward's files** on the 12-hour rule;
- **go live with a change already built, tested and scheduled** on the release calendar (in `STEWARD.md`).

**Codex should not design or build new world rules.** Big moves are Luis's call; ask him in `AGENTS.md`.

## The world keeps itself running
- The server (`node server.mjs`, port 8000) runs on its own, and `tools/watchdog.sh` restarts it if it dies or freezes. **No agent is needed for the world to live.**
- The world commits its own "Season …" commits. Leave them alone.

## Hard rules (Luis)
1. **No rescues:** never help a species, add food, or undo a collapse. A collapse is the world's own story.
2. **At most one small adjustment per check-in,** only when the world shows a need. Test it headless on a *copy* of `data/world.json` first, then log it. Any new rule or big change is Luis's decision.
3. **Ownership:**
   - steward: `sim/`, `server.mjs`, `tools/`, `STEWARD.md`, `STEWARD-HANDOFF.md`, `reports/status/`, `data/steward.md`;
   - viewer session: `public/index.html`;
   - Codex: `docs/`, `README.md`, `LICENSE`.

   In `AGENTS.md`, the steward writes only in the "World ↔ viewer coordination" section. **Stage only steward files.**
4. **Commits:** on `main` only, the steward's files only, once 12 h old (last steward commit `354b88d`, Oct 18 03:10; or see `git log`). Commit sooner when another agent asks in `AGENTS.md`. End the message with an attribution line naming the agent.
5. **Never edit `data/world.json` while the server runs.** Use `tools/restart.sh`.

## Check-in (every 30 min: the steward's cron ran at :07 and :37)
```
node tools/status.mjs        # season, bodies, species, reef/thicket, the chronicle's last lines
node tools/defence.mjs       # toxin/armour per species, kills
node tools/apex.mjs          # sizes, guts, hunters
node -e 'const w=JSON.parse(require("fs").readFileSync("data/world.json"));for(const e of w.records.sections.slice(-2)){const c=Object.values(e.crossings||{}).reduce((x,y)=>x+y,0);console.log(e.season,"cross",c,"back",e.turnedBack,"fell",e.fell)}'
```
Then:
- append **one line** to `data/steward.md`: date, season, what you saw, and what you did;
- read `AGENTS.md` for requests from the viewer session;
- **report due:** if (current season − the newest `reports/status/YYYY-MM-DD_sNNNN.md` without suffix) ≥ 30, write a report following `reports/status/README.md`. Its sections are listed there, and the latest ones (`2026-10-18_s1933.md`) are the model. Tools:
  - `node tools/diets.mjs`;
  - `node tools/diversity.mjs <prev> <now>`;
  - `node tools/cycle.mjs sNNNN` (a selection snapshot, so the next report can compare);
  - screenshots via `tools/snapshot.mjs` and `tools/orography.mjs` + `tools/orography-shot.mjs`, using the browser script at `~/.claude/skills/browser-automation/browser.mjs`. Skip the screenshots if that isn't available.

## Restarts and go-lives
```
zsh tools/restart.sh                 # restart only (new code loads)
zsh tools/restart.sh <key> [<key>…]   # also switch on rollout.<key> from the next season
```
Before a go-live, run `node tools/smoke.mjs`, which must print `errors 0`. After it, check `node tools/status.mjs` shows the tick advancing. The old "heap out of memory" lines in `data/server.log` are from before Oct 18; ignore them.

## State at handoff (s1942, Oct 18 ~10:00)
- **One species:** the quilikes, about 240, alone since s1853.
  - Swimmers (swim > 0.2) rose from 1 to **117**, driven by the big river.
  - Trees: about 10 saplings, none mature.
  - Thicket 74 cells, reef 21.
- **Live rollouts this week:**
  - `trees` (s1838) and a tree fix (s1899);
  - `speciate2` (s1847: no great divide; new species need a real body difference, plus a grace season);
  - `bigriver` (s1863);
  - **`insects` (s1942, step 3b:** flowers, insects, decomposers on carcasses, snap, insectivore).
- **Release calendar** (also in `STEWARD.md`, OPEN THREADS item 0):
  0. **Done since writing:** room by niche live s1951; commit 376447f. A Codex CLI build (habitat labels, `rollout.habitat`) was started 10:20. If it is finished and untested, Codex may test it (smoke + `tools/habitat-test.mjs`); go live only if both pass.
  1. **10:15 Oct 18: room by niche** (`zsh tools/restart.sh nicheroom`): built, tested and scheduled. If it's not live yet (check `rollout.nicheroom` in the save), Codex may do it.
  2. Then **no new builds until the weekly usage resets (22:00)**. Next on the roadmap, Luis's order:
     - the step 4 proposal (bodies hold what they cost; a proposal for Luis, not a build);
     - swim/climb in the selection ledger (`tools/cycle.mjs`; a tool change);
     - then a cost of being a predator (Luis's call);
     - **thicket** at the bottom: move it up if the thicket falls under ~40 cells or the trees lose their last seed source.
- **Next report due ~s1963.**

## Where everything is
- `STEWARD.md`: rules, history, open threads (item 0 is the newest).
- `data/steward.md`: the steward's log, one line per check-in.
- `reports/status/`: the reports and the README index.
- The roadmaps:
  - `reports/status/2026-10-17_s1588-energy-roadmap.md`;
  - `reports/status/2026-10-17_s1693-energy-roadmap-v2.md`;
  - `reports/status/2026-10-17_s1794-trees-insects-proposal.md`.
