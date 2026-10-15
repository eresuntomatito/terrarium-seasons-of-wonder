# The steward's rules (Claude, era 4 onward)

Luis watches the terrarium like an aquarium. Claude keeps the world and its rules; Qwen plays small, active roles inside it;
natural selection does the main work. Luis can intervene at any time, and his word overrides these rules.

## Priorities
1. **The world keeps running.** `tools/watchdog.sh` restarts the server if it dies. Never leave it down.
2. **Learning happens in the live world.** Side tests are headless, short (≤ 5 minutes wall time), and only to check a change won't break things.
3. **Spend few tokens.** One status command per check-in. No Haiku, no subagents. Qwen is free and local; use it.

## Standing instruction (Luis, day 437)
Check in **hourly**. Only intervene if the world is heading for collapse or is empty; otherwise just watch and log.

## The god is resting (Luis, day 685)
Qwen is paused until Luis calls it back: `data/god-paused` exists, so branches, studies and its backlog are dropped. Resume only when Luis asks: `rm data/god-paused` (no restart needed). Slips, drift splits and releases still happen without it.

## The leviathan (Luis, day ~708)
One lone filter-feeding serpent, redesigned snake-like on day ~782 after starving on day 762 (girth 6 vs reef, squeeze cost, 30% fat reserve) (species/leviathan.js; registry: unique, filter, grows to size 30, slows as it grows, never breeds, never re-released by the rules). Check it **every 3 days (one season)** until it visibly helps control the prowess, or until Luis says how to change it. Then go back to the pacing below. Day 761: it does (prowess held below the cap two checks, grass abundant); back to the 3-season pacing, lengthening toward 30 minutes.

Leviathan is now fixed as tuned on day 738 (Luis): if the balance needs changing, modify the lurkers, not the leviathan.

Reef turnover (Luis, day 968): climate erosion back ON gently (reefErode 0.0002 × (0.05 + 0.95·climate²): mostly wet eras; lone specks ×3, thin ridges ×1.5), so the reef keeps reshaping under its cap. Earlier: Reef (Luis, day ~753): erosion OFF (reefErode 0) to see how far it builds and what forms; cap raised to 12% as a safety ceiling. Turn erosion back on only if the reef threatens collapse (walling in herds, starving grass). Delegated (Luis): when cover nears the cap and nothing drastic has changed (grass, prowess and lurkers holding, no piling: creatures next to reef roughly matching the land next to reef), raise the cap a step (e.g. +6%) and log it.

Reef shaping (Luis, day ~841): desire paths (traffic of bodies size ≥3, by mass, tramples non-solid reef — prowess too light since day 868; grains stick more on quiet ground), hollowing (solid cells walled in on all 8 sides wear), light dust clearing (<0.3). Climate erosion stays off. Watch for roads, maze pockets, and whether creatures get channelled.

**Grazer reintroduction is OFF (Luis, day 884): IMMIGRATION.grazers = false. Do not let the prowess (or any grazer) be set down again until Luis says; he wants to watch. The kraken-hold rule was proposed and paused, not built.**

**Tortoise overpopulation plan (Luis, day 952):** (1) three 5-minute stalker check-ins (22:02, 22:07, 22:12), tuning the stalkers as their growth shows (Luis), one change per check; (2) then an adaptive kraken satiation: start at 90%; each season (3 days), if grazers > 500, +1% (up to 100%); once under 500, bring it back down, faster when grazers are scarce (extinction risk). Implemented in the world as a season-by-season controller, logged each time it moves. Built day 964: world.satiation (start 0.90, saved), applied to unique filter-feeders in gulp(); the kraken's own code no longer sets a threshold.

**Shrinking cap (Luis, day 1313, performance):** world.maxCreatures (saved) drops 10% at each season end until below 1,000: 1,500 → 1,350 → 1,215 → 1,094 → 984. Small-species exemption scales with it.

**Release waves (Luis, day 1301):** returns come in 3 waves of 40% of the species' seed base (beetles: base 50 → waves of 20), a third of the average life apart (beetles ~1,570 ticks), each landing separately; the scavenger rescue uses waves and always the seed beetle; data/release.json accepts "waves": true.

**Beetle idea (Luis, day 1281), steward decides when:** phoresy — a dying beetle leaves eggs on the legs of passing creatures; carriers drop them later; they hatch where dung/carrion is near, else dry out. Use it as the next beetle lever if beetles keep dying out (replaces god rescue releases).

**Thicket (Luis, day 1242):** thorny hedge only on cells beside solid reef; grows slowly from soil+moisture (to 0.8), dies where its reef is gone or in drought (nutrients back to soil), worn by heavy traffic. Grass inside it can't be grazed (fully at density ≥0.5) and keeps 0.15 alive (seed bank); bodies under size 7 hide in it; it slows movement by up to 60% × density, scaled by body (girth for the kraken). Never solid. Watch: thicket spreading only along reefs, grass rings surviving crashes, hunters not starving from too much cover.

**Size has value (Luis, day 985):** energy capacity per body = species store × clamp((mass/mass(6))^¼, 0.85, 2) (unique giants excluded); used for the energy cap, fat storage trigger, weakness, starvation and the viewer's energy shading. Big bodies endure famine; watch whether the tortoises stop shrinking.

**Divergence (Luis, day 978; strengthened day 1000):** tortoises have home ranges (birthplace memory; beyond 80 px home pulls harder with distance, up to 1.8, outweighing grazing); mating desire comes first: choosiness relaxes with waiting (×(1+wait/150)), any partner of its kind after 400 ticks, budding only after 600 ticks with no partner; mating is choosy for every species (chance exp(−(gene/body gap + colour gap)/0.08), still none past isolation). Watch for local, differently coloured subgroups and new splits; watch that small populations (stalkers) still breed.

**Gradual crowding (Luis, day 1486):** births slow from 70% of the room, more for common families (chance 1 − crowd × (0.3 + 0.7 × family share)); hard ceiling 110% of the room.
**Kraken toxin resistance (day 1514):** tortoises evolved toxin (median 0.31; 568/1,056 above the old 0.3 spit-out line) and the kraken starved among them. Now each kraken has `resist`: it eats prey up to that toxin, ignores the rest, and passes resist to its egg (drift 0.04, rare leaps): an arms race. Gen 25 set to 0.45 once. Watch: tortoise toxin creeping up, kraken resist across generations.
**Kraken rage (Luis, day 1486):** ≥ 8 prey in sight + bumped > 4 → heaves reef within 4 cells ahead outward (clearing ringed by a new wall; nothing destroyed), costs 2 energy, once per day; shockwave in the viewer.

**Kraken dormancy (Luis, day 1413):** below 15% of the world's room the kraken sleeps (no movement, hunger or ageing; drawn pale, breathing); at 50% it wakes, breaking free to open ground if walled in.

**DIVERSITY PHASES (Luis, day 1413), judged every 2 seasons; at each judgement move forward or wait, based on what the world shows:**
1. Maturity age (season 471; judged a success at 484 after doubling the late-maturer payoff — size median 3.71→4.21, maturity spread 0.71–1.25): inherited multiplier (0.4–2.5) on breeding age; late maturers store more (+15%/unit) and live longer (+20%/unit). Look for: size and maturity spread widening, average size no longer falling, fast/slow mixes or splits.
2. Browse (STARTED season 484): thicket shoots edible only to big bodies; browse/grass gut trade-off; thicket regrows, keeps its refuge. Look for: browser vs grazer lines.
3a. Hunter mouth size (STARTED season 513; Phase 2 browse continues in the background, stalled at ~75–97 browsers): inherited gape (prey/self size ratio, 0.15–0.9, drift 0.03); fitting prey caught more often (chance = fit) and the killer gets fit × its share; fit = exp(−((ratio−gape)/0.2)²), floor 0.35. Season 535: hunters back (Luis): 4 daily packs of 8 stalkers shaped against tortoises (size 6, gape 0.53, resist 0.55, legs 1.6) — 3a is no longer blocked; judge gape spread among stalkers at the next bi-seasonal checks. 3b. Search images (prey type eaten recently is easier). Look for: predators split by prey size; rare prey forms surviving.
4. **Defence/attack matrix (Luis, day 1626; step 1 LIVE at t2937656).** Every defence needs a counter, its own kind of cost, and where sensible a material from the diet, so habitat decides what a body can become. Step 1 (minimum, existing traits only): the toxin and armour genes are ceilings (and set upkeep); a body carries only what its food supplies — toxStock from grazing in thicket (×thicket density, browse ×2), minStock from mineral ground (solid reef among 8 neighbours + soil mineral×4); both fade 0.0006/tick; newborns get 0.6 × parents' stores; beetles/unique keep innate toxin. Effective values (toxinOf/armorOf) drive catching, spitting, slowing, corpse value and the viewer's bristles. Readout: scratchpad/defence.mjs (morph table palatable/toxic × soft/shelled). Look for: tortoise morphs splitting by habitat; palatable morphs feeding cheap low-resist hunters; genes following stores (grass dwellers losing toxin genes). Later steps (only if step 1 diversifies): crushing bite (vs armour) → camouflage + search images (merges 3b) → venom, spikes.
   **The great divide (Luis, 22:12 Oct 14; automatic):** AT ANY TIME (Luis, 09:05 Oct 15; checked every 30 ticks): a species over ONE THIRD of all living bodies is divided, then it and its new splits rest one day (divideRest) before they can be divided again (before: every season end at 60%, every 3rd, >4 seasons running) (vicariance) at the population medians — median x, then each half at its median y — so the four parts are equal in number and each a contiguous block of land; one keeps the name (since 23:13; before, fixed screen quarters). Streak saved as world.dominance. Splits of fixed-size lines keep the parent's reference size (bug fixed 22:00).
   **K-means divide (Luis, 00:10 Oct 15):** the great divide now clusters the species on place (each axis as a circle, so herds across the wrapped edge stay whole) and kind (11 body traits, standardised; traits all share count for nothing), place weighted 2 : 1 (divideGeo); k = 2–4 chosen by silhouette; groups under 10 join the nearest; below silhouette 0.15 (divideSeam) it falls back to the median cut into four equal parts. The chronicle names what sets each group apart (e.g. "34 earlier-maturing, 21 narrower-mouthed…").
   **THE KRAKEN RECONSIDERED (Luis, 02:30 Oct 15):** it rises only one season in every 10 (season index % 10 = 0; krakenEvery) and sleeps the other nine — life, hunger and ageing paused, and UNSEEN by others (dormant giants are not perceived); still also sleeps below 30% of the room. While awake it eats only up to 75% of its satiation (krakenAppetite), stealth cut 70 → 45 px, targeted hunger OFF (targetedHunger: false; code kept). Viewer clock: 'kraken rises in m:ss' / 'kraken sinks in m:ss'. Its learning (mind map) continues in its waking seasons.
   **Trapped rage (Luis, 00:25 Oct 15):** the kraken also rages when bumps > 4 and energy between 2.5 and 3.5 (rageBumps, rageHunger; it must still afford the 2-energy cost), regardless of prey in sight; cost and cooldown unchanged.
   **Targeted hunger (Luis, 23:20 Oct 14):** the kraken (unique giants) senses and gulps only prey of the most numerous SPECIES in sight/reach (by family 23:25–01:40, back to species by Luis) (world.preyRank, refreshed every 30 ticks); lesser families only when none of a commoner one is there.
   **NO RESCUES (Luis, 23:18/23:22 Oct 14):** no releases, no placed eggs, no rescues of any species (kraken included) until Luis says otherwise. The agenda and check-ins continue as usual (Phase 4 adjustments allowed, one per check). The god's automatic help is paused too (IMMIGRATION.paused = true in sim/world.mjs, 23:30): no hunter packs, no seasonal reinforcements, no scavenger rescue, no waves. Kraken eggs on old age and the great divide still run (they are the world's own life cycle, not rescues). (The world's own automatic mechanisms — god's packs, scavenger rescue, kraken eggs on old age, the great divide — keep running.)
   **Cadence (Luis, 21:50 Oct 14):** seasonal check-ins (every 3 min = 1 season) until 00:50, reviewing Phase 4 and adjusting at most one thing per check; then 30-min check-ins until further notice.

**Priority order (Luis, day ~920): (1) the kraken stays alive (it has not starved for many cycles; it does not need feeding); (2) the tortoise lineage must not go extinct, with the MINIMUM intervention and NO resets (no fresh releases from seed unless the very last ones are about to vanish), so it keeps changing on its own. Kraken satiation (eats only below 90%, stops gulping when full) is the main protection.**
Kraken lineage (Luis, day 940): normal lifespan (60k beats); when it dies of OLD AGE it lays an egg that hatches a young kraken one season later (inherits genes and code numbers with drift, generation +1). If it starves, no egg: the line ends. Don't extend its life.

## RESUMING IN A NEW SESSION (read first)
The world runs on its own: `node server.mjs` and `tools/watchdog.sh` are detached (they survive closing the terminal, Claude Code, or /clear; the watchdog restarts the server from data/world.json). They do NOT survive a reboot — after one, start both from the project root: `nohup zsh tools/watchdog.sh >/dev/null 2>&1 &` (it starts the server within ~30 s). While the Mac sleeps the world pauses.
To resume stewardship in a fresh session: read this file top to bottom, then the last ~40 lines of data/steward.md (the log), then run `node tools/status.mjs` and `node tools/defence.mjs`. Re-create the check-in schedule (it lives only in a session): every 30 min at :07 and :37, prompt = "Steward check-in, genesis era (follow STEWARD.md, especially GENESIS, PHASES and the NO RESCUES rule). Run node tools/status.mjs and node tools/defence.mjs. Watch what the progenitors' descendants become … No rescues … at most one small adjustment per check, logged. Log one line in data/steward.md. Reply with a 2-line summary."
Working rules that matter: test every world change headless before going live (tools/smoke.mjs runs 400 ticks on a copy and reports errors; tools/defence.mjs is the readout), check viewer changes in a real page load with errors captured, restart with the data/hold procedure below, log every change, commit only when Luis asks.

**PHASES, reordered for the genesis era (Luis, 00:45 Oct 15)** — judged every 2 seasons, one change at a time:
I Foundations (maturity, food-made defences, k-means great divide, targeted hunger) — live.
II Plant niches: grass vs browse — STARTED 00:45 (browseSize 4.5 → 4.0; browse trait median 0.03 must rise past browseMin 0.1; 2/111 eligible at start).
III Hunters from within: a line turning plants → carrion → flesh (watch kills by P lines; nudge only with Luis).
IV Hunter jaws (gape, old 3a). V Shell vs bite (crushing bite). VI Seeing and hiding (camouflage + search images). VII Venom and spikes. VIII Parasites and disease (parked: no parasite line).

**BUILT 01:40 Oct 15 (A + B1a + measures + overlay) — SIGHT AND A KRAKEN THAT LEARNS (Luis, 01:20 Oct 15):**
- Part A, reef perception for every creature (a Phase I foundation): rays (8, maybe 16) giving the distance to solid reef in each direction, 0–1 of sight range, passed to behaviour code as world.reef beside food/others. Sight range = species base × body-size factor × age curve (juveniles short, slight decline when old) × (0.5 + an inherited "eyes" trait 0–1), cut short by thicket (and possibly rain). Eyes cost upkeep (like armour/toxin), so sight is an evolvable trade-off.
- Part B, the kraken teaches itself in the real world (kraken only): B1a a coarse memory map (≈24×16) of trap value (stuck here) and food value (fed here), learned from its own bumps and meals, steering it toward good ground and away from traps; B1b self-tuned reflexes (detour length, shove/rage thresholds) kept when they pay; B1c a tiny learned policy only if a and b plateau. Reward: energy gained and kills good; stuck ticks, wasted rage, starving bad; judged over a window. Inheritance: LAMARCKIAN — the egg inherits the parent's map and reflexes, slightly blurred. Safety: modest exploration, capped learning rate, today's wall-following/shove/rage stay underneath. Measures from day one: stuck ticks, kills per energy, rages, distance per meal, per kraken and generation. Viewer: optional "kraken's mind" overlay (traps red, feeding grounds gold), low complexity.
- Order: A (rays + sight) → B1a map + measurements (baseline first) → B1b → B1c if needed.

   Built: sight(c) and reefRays(c) for everyone (world.reef = 8 ray distances, east first, clockwise on screen); eyes trait (start 0.5, drift 0.04, upkeep 0.15 × (eyes − 0.5)). Kraken: learn() every 10 ticks — c.mind {trap, food} on a 24×16 map, c.book measures; mindPull steers (0.8); egg inherits a blurred map at 0.8 (Lamarckian); world.mindBook keeps each kraken's life (stuck share, meals per 1000 ticks, rages, distance per meal, inherited). Viewer: "kraken's mind" toggle. Dormancy now below 30% of the room (was 15%). Baseline from the headless test: stuck 58% of ticks, 13.5 meals per 1000 ticks.

**ROOM 300 (Luis, 09:00 Oct 15):** maxCreatures 100 → 300. Note: the kraken now sleeps below 90 bodies (30%) and wakes in its season only above 150 (50%). Ancestry measures (08:55): each species shows code and body distance from its line's founder (driftRoot, bodyRoot; BODY table in world.mjs) besides drift since its own split; the Evolution chart plots both (code solid, body dashed).

**VIEWER IDEAS (backlog, Luis 09:20 Oct 15 — not built):** (4) a mini profile strip per species (one tick per trait, left/right of the family mean); (5) a "kinds" map — species as dots placed by their traits squashed to 2-D (size = population), to watch the cloud spread (diversification) or collapse (convergence); (6) a species × trait heat-map table coloured by standout. Built instead (09:20): standouts in bold ▲▼ (|z| ≥ 1 vs living kin of the same line), a portrait of the 2–3 strongest standouts, a distinctness score (mean |z|) and the nearest relative with % apart (same scaling as the ancestry measure).

**A WAY TO MEAT (Luis, 09:35 Oct 15):** (1) juveniles: growTicks 0 → 1200 (newborns at 40% size, grown over 1,200 ticks; fertile from 900), so every herd holds young an adult relative can overpower; (2) carrion as a gradient: any gut above 0.1 (carrionGut) can tear at a corpse, digestion curve widened (carrionWidth 0.4 → 0.55); (3) birth variation: each newborn's body varies by chance around its genes — size ×(1 ± 0.08), gut ± 0.04, gape ± 0.05 (normal spread) — and only the genes pass on (sizeGene, bornGut, gapeGene). Hunting jaws stay at gut 0.25.

**GRASS THAT ANSWERS (Luis, 01:00 Oct 15):** (1) root health per cell: bitten to within 0.05 of its roots → −0.004; heals +0.0015 × moisture per plant update; growth × root health; below 0.05 the cell dies to bare ground (new sprouts start at 0.5). (2) dung: grazers carry 40% of each bite as fertility and drop 1% of the load per tick wherever they are. (4) seeds: a body that grazed carries seeds (fading ×0.995/tick) that sprout on bare non-reef cells it crosses (0.003 × seeds × moisture per tick). Saved: rootHealth. Readout: 'ground:' line in defence.mjs. Tune at check-ins (rootWear first) if the mosaic stays faint.

**GENESIS (Luis, 23:50 Oct 14):** after the collapse the world was kept as it was (reef, grass, history, the dormant kraken) and re-entered with ONE new species: 10 progenitors (P) — a mother cell that can become anything: gut 0.5 (eats plants, carrion and anything small), size 5, every trait at its middle, a generic behaviour whose numbers all drift (species/progenitor.js). Room capacity set to 100 (maxCreatures). Released once; no rescues (Luis), god's help paused, so the world does its own thing: slips, drift splits, the great divide, diet labels. The kraken wakes when the world reaches 50% of its room (50 bodies) and will hunt the commonest family. Backup of the pre-genesis world: data/world.before-progenitor.json. Speed work (23:40): sense uses nearest-first grass scan, running top-k neighbours, per-tick species groups (~65% faster at 1,500 bodies).

**Current focus (Luis, day 903): foster the stalkers (S) as the hunter beside the kraken, and watch over the tortoise radiation (T and its splits: keorthus, mobelgals, ormodros, radrodros, galmotys, zuketys…). Grazer reintroduction still OFF.** Stalker levers: fear distance (now 40 + 2.5×size), avoiding prey near giants, top-ups of a small pack when they dwindle (never on a loop).

## Luis away (day 867, 19:40): the goal for these hours
ABOVE ALL keep the world alive (Luis: "keep steering while you can, keep it alive, above all"): if it heads for empty, act first (rescue releases, undo the last change), explain after. Then: perfect a hunter that can coexist with the kraken (unique, hungry; don't change it), and bring more grazer variety. Prowess are fine, just a plague unchecked.
- Seeded the tortoise (T): grazer, size 3.5, armour 0.5, slow, fat, long-lived, walks against the herd's flow, fears big hunters. 25 released.
- Lurkers now wait ahead of a herd but off to its flank (the kraken aims at the herd's heart); 8 released.
- Check-ins: every 5 min until 20:42, then every 15 min. Luis (day 868): "you may implement whatever you decide as you do your check-ins": full delegation for changes toward the goal, still one at a time and logged, alive-first. At most one change per check, and give a change ~3 checks before judging it.
- Levers for the hunter (lurker line): fear distance, flank offset, breeding threshold, body size (kraken eats anything ≤ ~21.7); a new hunter seed only if the lurker line keeps failing. Levers for grazer variety: tortoise tuning (armour, speed, breeding), a second grazer seed later if the tortoise holds.
- Releases: data/release.json {"name","count","hunter"}. Never re-release on a loop; never touch the kraken.

## Check-in pacing (Luis, day 682, with the reef)
A season lasts about 6–11 minutes of real time (5,400 ticks at 8–15 ticks/s; slower while Qwen thinks).
1. Six check-ins **one season apart** (Luis added 3 more on day 688 to watch the reef and how creatures move around it) (about every 8 min): watch the reef and climate, and adjust the reef knobs if needed.
2. Then check **every 3 seasons**, lengthening by a season at a time until a gap equals about **30 minutes**; then keep a 30-minute pace.
Each check-in schedules the next one (one-shot CronCreate) from the measured tick rate, and logs which step it is on in data/steward.md.
Reef first-look targets: grains form, reefs seed where crashes left corpses, solid cover rises toward the 3% cap but not instantly; creatures turn at walls without piling up or freezing; ticks/s not hurt. Raising the cap is for later check-ins, with Luis.

Day 766: 3 seasons ≈ 30 minutes at ~9 ticks/s, so check-ins are now a steady 30-minute pace (recurring cron at :11 and :41).

## Every cycle
1. `node tools/status.mjs` and read it. Nothing else unless something looks wrong.
2. Assess: is the world alive and moving? What happened since last time? Is anything stuck, exploding, or invisible?
3. Decide **at most one change** per cycle, and only if it serves the direction below. Just watching is the default:
   change only when the world has shown enough to justify it (Luis: "you don't need to make changes every time").
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
- Never change the frame format without updating FRAME_STRIDE in both server.mjs and public/index.html (open tabs reload themselves on a mismatch).

## Backlog (saved for later at Luis's request; take one at a time when the world shows the need)
- Grazer reintroduction was paused by Luis, then re-enabled by the steward on day 320.9 under his delegated rule (world empty of plant-eaters for 20 days). It is on again.
- Prey quality: make fat prey worth much more than starving prey, so hunters boom in good seasons and bust in lean ones.
- Hunters evolve instead of returning unchanged: carry selection across releases (e.g. return with the last survivors' numbers).
- Hunters' breeding threshold (1.8 of 2.0) may be out of reach on small meals; consider it once prey quality is settled.
- Carrion distracts hunters (with lasting corpses); watch corpse build-up and smothering (2,299 corpses, 18% green on day 18).
- Slip timing (idea, parked by Luis day 656): prowes slips are born to starving parents and die before maturity (600), so selection never sees them. Option: let slips take hold only in litters of well-fed parents. Revisit after the cap, focus-line and local-split changes have shown their effect.
- Places: a landscape with regions and barriers so branches and returning hunters can settle away from dominant kin.
- God (day 532): edits must change behaviour in the richer trial; edits found interbreeding variants. Watch whether variants spread or fade.
- Lurkers (season 211, Luis): crocodile-wolf seed to control prowess, not wipe them out. Watch 3–4 seasons (to 214–215); if extinct, iterate the seed (body/breeding first). Judge by births, since reinforcement can re-release them.
- Steward release: write data/release.json {"name","count"}; the server sets them down within 10 s, no restart.
- Lurker rut: evaluated season 225; lurkers grew 7 → 76 on their own, so the rut stays. Done.
- Tortoise (agreed with Luis, season 211): seed it ONLY after lurkers are established (breeding, not just reinforced) AND visibly hold prowess below the cap, leaving room. Design: size ~3.5, armour ~0.5 (out of fisaom reach, lurker prey), slow, fat-storing, long-lived, moves against the prowess flow to graze regrowth. If lurkers fail for good, lower its armour so fisaoms can take it.
- Slips (day 587): weighted mix and duplication slips added under Luis's delegation. Watch for any 'a part copied and changed' variant that spreads or graduates.
- Plan items above: visible evolving body traits, Qwen's small roles, dashboards (family tree, trait map, chronicle).
