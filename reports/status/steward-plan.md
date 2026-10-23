# The steward's plan (living document)

*Written by the world steward, Claude (Opus 5.5), an AI. Not written by Luis. Reviewed and updated at every check-in.*

**Goal (Luis's KPI frame, s2653):** KPI1 eating up the food chain, KPI2 real diversity, KPI3 cost.
**Guard rails:** bodies 120–200 fine, under 80 critical; trees must not collapse; no rescues.

## State (s2666)
- **KPIs are flat:**
  - KPI1: trophic level 2.008; gut ≥ 0.3: 0%.
  - KPI2: diet difference 0.043; 1 way of life (grazer).
  - KPI3: 17–18 ticks/s.
- **Plenty:** fat 0.42, fruit woods at records. Every one of the 8 species grazes in its own patch.

## Thesis
1. **The KPIs are flat because nothing pushes bodies off grass.** In plenty, grass is easy, near and reliable. Every past rise in meat and carrion eating came in hunger (carrion 7.3% at fat 0.07), and every one faded in plenty.
2. **Hunger alone used to make cannibals, not carnivores** (litygals). The rules since s2624 change that:
   - meat pays at a middle gut (gut valley);
   - no cannibals;
   - noses and trackers;
   - skill pays;
   - breeding by condition.

   **So scarcity should now produce lasting meat- and insect-eaters,** not spirals.
3. **Diversity needs places and foods of their own.** The lake country (now open) and the fruit woods (booming) are niches nobody uses yet. Opening access helps KPI2 without adding rules (and so without costing KPI3).

## Actions
- **A. Grass scarcity:** small steps (3%) while fat ≥ 0.30, at most one per ~4 seasons. **Luis agreed (Oct 23).**
- **B. Access:** watch the lake country after the gate opened (s2666). Wear one more pinch point only if routes stay blocked (`tools/paths.mjs`).
- **C. No new rules for now.** Let selection work on what is live, and protect KPI3. Development, if needed, goes to Codex, and I review it.

## Expected by the next check-in
- **Codex:** rain-belt diagnostic finishes (belt arm, seasons 2–6), then task4 (new KPI2 'distinct species') runs — review both; commit with the lens fix; bring rain-belt results to Luis.
- **KPI1:** holds ≥ 2.045 after step 11; next step (12) when ≥ 4 seasons have passed and fat ≥ 0.3, at a safe moment (Codex not editing).
- **KPI3:** recovers ≥ 15 ticks/s once the Codex runs end.

## Riskiest assumptions, and what I'd do if each fails

| # | Assumption | Test | If not confirmed |
|---|---|---|---|
| 1 | **Scarcity now yields lasting meat and insect eating**, not just deaths | After grass steps, gut ≥ 0.3 share rises and **stays** for 10+ seasons. Meat-leaning splits outlive grace. Starvation doesn't spike past ~300 a season | Stop the steps. The problem is the *payoff*: measure the energy a gut-0.3 body gets per tick from meat against grass, and raise the payoff (prey and carrion access), not the hunger |
| 2 | **Meat can pay at all** (35% rule, prey defences: alarm, guard, armour, size) | Bodies with gut ≥ 0.25 have fat ≥ the world mean over 5 seasons | Find which wall binds: kill rate, digestion or defences. Propose easing one (Luis's call if it's a big rule) |
| 3 | **Bodies will reach the lake country now** | Bodies inside within ~5–10 seasons | Run `paths.mjs`. Wear the next pinch, or check whether flock and parental care keep them at home (sociability is evolving) |
| 4 | **Changes don't cost speed** | ≥ 15 ticks/s | Drop or optimise the most expensive recent rule |

## Log of reviews
- **s2666:** plan written. A waits for Luis; B in progress (gate opened s2666); C in force.
- **Luis (Oct 23):** no objection to A — grass steps may resume under the rule above; focus on the KPIs and guard rails.
- **s2693:** expectations beaten on access — 22 bodies in the lake country, a 2nd way of life (aquatic, ≥10 bodies), diet difference 0.043 → 0.067 (KPI2 up); KPI1 flat (tl 2.009, gut≥0.3 0%). Fat 0.455 → action A: grass −3% (lean 0.474 → 0.460). Watch: mature nut trees 33 → 24 (one check).
- **s2699:** fat held 0.453 after step 1 (assumption 1 not yet tested — no hunger yet); KPI2 diet diff 0.067 → 0.090, ways 2 (grazer + mixed feeder; aquatic dipped under 10), lake country 20; KPI1 flat. Trees boom (fruit 69 mature, conifer 53); nut mature 24 → 22 (canopy up). Action A: grass −3% (0.460 → 0.446).
- **s2705:** fat 0.453 → 0.311 after step 2 (starvation ~45/season, fine); bodies turned to the booming woods: BROWSE 13.5% (record), diet difference 0.090 → 0.110 (KPI2 ↑), tl 2.009 → 2.016 (KPI1 ticks up), gut≥0.3 still 0%; lake country 28; nut mature recovered 22 → 28. Action: none — hold step A until fat settles ≥ 0.3.
- **s2711:** fat recovered 0.311 → 0.474 (the woods fed the dip: fruit store used up, browse back to 6.5%); KPI2 ways 2 → 3 (+ highland), diet difference 0.110 → 0.080 (eased as browse fell); KPI1: first bodies with gut ≥ 0.3 (0.4%), tl 2.010; lake country 26; trees at records (fruit canopy 71.6, conifer 68 mature). Action A: grass −3% (0.446 → 0.433).
- **s2716:** fat 0.474 → 0.320 after step 3; bodies switched to browse 10.5% and fruit (store 26.3, record) — the woods buffer the cuts; KPI2 diet difference 0.080 → 0.102 (ways back to 2); KPI1 tl 2.012, gut≥0.3 0% (the 0.4% vanished); lake country 26 → 14; canopy dipped (fruit 66.5, conifer 44.3) under browsing. No action (fat at the threshold). Thesis note: scarcity feeds browsing (KPI2) before meat (KPI1).
- **s2721:** fat recovered 0.320 → 0.382; canopy recovered (fruit 73.4, conifer 45.8); KPI2: 3 ways of life (aquatic back ≥ 10, grazer, mixed feeder), diet difference 0.081; KPI1 flat (tl 2.010, gut≥0.3 0%); lake country 0 bodies (from 14). Action A: grass −3% (0.433 → 0.420), step 4.
- **s2727:** fat 0.382 → 0.514 after step 4 (woods again); KPI1 flat (tl 2.008, gut≥0.3 0%, max gut 0.18) → ASSUMPTION 1 FAILS FOR NOW: scarcity yields browsing, not meat. Action (its fallback): carrion payoff for low/middle guts (rollout 'carrionfit'), delegated to Codex; grass steps paused. KPI2 diet 0.083, ways 1–2; lake country 10 (liligals); trees records (conifer 73 mature).
- **s2732:** the Codex task had not run (wrong CLI flag) — restarted with `codex exec -s workspace-write`; review next check-in. Meanwhile KPI2 rose: diet difference 0.083 → 0.127 (record), browse 12.6%; KPI1 tl 2.018 (gut≥0.3 still 0%); fat 0.46; trees records (fruit canopy 86.1, mature nut 40, conifer 74). No other action.
- **s2737:** Codex delivered 'carrionfit' (gut 0.05: 0.17 → 0.82 of carrion's value; copy smoke: carrion share 0.91% → 1.39%, no errors). Reviewed the diff (2 lines) — RELEASED, live s2738. Numbers: fat 0.455, carrion 1.2%, browse 10.2%, KPI1 tl 2.016 / gut≥0.3 0%, KPI2 diet 0.094 ways 2, trees high.
- **s2742 (carrionfit 4 seasons):** BETTER THAN EXPECTED — carrion 1.2% → 2.9%, carrion eaters 4 → 17, carcasses unused 20+ → 9; KPI1 tl 2.016 → 2.027, gut p90 0.067 → 0.094, max 0.208 (gut≥0.3 still 0%); fat 0.536; KPI2 diet 0.082 ways 2; trees records (mature conifer 85). No action.
- **s2748:** carrionfit holding: carrion 3.0%, eaters 21; KPI1 tl 2.027 → 2.035, gut p90 0.113, max 0.282; KPI2 ways 3 (+ aquatic), diet 0.103, 9 species; fat 0.38; trees records (fruit canopy 92.2). Action A resumed: grass −3% (0.420 → 0.407).
- **s2753:** assumption 1 now CONFIRMING: after step 5 bodies turned to carrion, not only browse — carrion 3.0 → 4.1%, eaters 21 → 36, KPI1 tl 2.035 → 2.054 (best yet), gut p90 0.133; KPI2: OMNIVORE is now a way of life (≥ 10 bodies; ways: omnivore, grazer, mixed feeder), 9 species; fat held 0.506. Trees hit by cold + drought (see above). Action: none — step 6 held for the trees.
- **s2758:** KPI2 RECORD — 4 ways of life (grazer, aquatic, mixed feeder, omnivore), 9 species (quiomush new); KPI1 tl 2.054 → 2.041 (carrion 3.5%, eaters 25, gut p90 0.115, max 0.246); fat 0.527; conifers fell a 2nd time (cold/dry spell), fruit (93 mature, 237 saplings) and nut steady. Action: none — steps held for the conifers.
- **s2764:** plenty again (fat 0.517) and KPI1 sagged: carrion 3.5% → 1.9%, eaters 25 → 11, tl 2.041 → 2.031, gut p90 0.103; KPI2 diet 0.117, ways 2 (aquatic and omnivore dipped under 10); conifers recovered (canopy 36.3, mature 53). Action A: grass −3% (0.407 → 0.395), step 6.
- **s2769:** pattern CONFIRMED — after step 6, carrion 1.9% → 3.5% (eaters 11 → 21), tl 2.031 → 2.043, gut p90 0.117 max 0.262; fat 0.472; trees up (conifer canopy 44.2, mature 63). Gentle steps are the steady lever. Action A: grass −3% (0.395 → 0.383), step 7.
- **s2775:** KPI1 MILESTONE — first bodies with gut ≥ 0.3 (1.2%, max 0.384); carrion 3.3% (eaters 28); tl 2.038; KPI2 diet 0.109, ways 2 (grazer, aquatic); fat 0.456; trees up (mature fruit 109). Action A: grass −3% (0.383 → 0.372), step 8.
- **s2781:** plenty again despite step 8 (fat 0.513, woods buffer); KPI1 tl 2.042, gut≥0.3 0% (max 0.243 — the 1.2% at s2775 came and went); carrion 3.5% (eaters 21), corpses 19; KPI2 diet 0.102, ways 3 (grazer, highland, mixed feeder); trees fine (mature fruit 110). Actions: grass −3% (0.372 → 0.361), step 9; carcass-supply test delegated to Codex.
- **s2785:** KPI1 BEST — tl 2.070, carrion 4.8% (eaters 40), meat 5.9%, gut≥0.3 0.8%; KPI2 ways 4 (grazer, omnivore, mixed feeder, aquatic), diet 0.100; fat 0.531; trees fine. Step 9 worked. Action A: grass −3% (0.361 → 0.350), step 10. Codex tasks 2 and 3 running.
- **s2789:** KPI1 strong (tl 2.058, carrion 5.2% record, eaters 32, meat 5.8%); KPI2 ways 4 incl. SCAVENGER; NEW KPI2 already live (partial Codex code loaded at my restart): proven 0, contact pairs 4, diet apart in contact 0.095, waysAvg 2.95. Carcass longevity test (Codex): carrion +0.1 pp only, no harm → NOT released (supply is limited by deaths, not by rot). No action.
- **s2793:** plenty (fat 0.535) → KPI1 sagged to tl 2.035 (carrion 3.1%, eaters 25); KPI2 ways 3, waysAvg 3.0; trees records (fruit canopy 93.3). Step 11 due but HELD: no restarts while Codex edits code (task3 still measuring, task4 queued). Do step 11 once Codex is done.
- **s2797:** Codex task3 is only measuring now (its code edits are done and load cleanly), so the restart is safe: grass step 11 (0.350 → 0.340). Task4 (new KPI2) still queued.
- **s2802:** step 11 worked as the pattern predicts: carrion 1.9% → 3.5% (eaters 32), fish 1.1% (8 fishers), tl 2.025 → 2.049; KPI2 ways 4 (avg 3.0), diet 0.125; fat 0.423; trees records (fruit canopy 101.5). No action (Codex measuring).
