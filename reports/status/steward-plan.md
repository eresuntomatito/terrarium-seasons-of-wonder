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
- **Fat:** recovers ≥ 0.3 again via the woods; no step until it settles.
- **A finding to check:** the booming woods buffer every grass cut (bodies browse and eat fruit, which are plants), so KPI2 gains and KPI1 stays flat. If gut ≥ 0.3 stays ~0% after 2 more steps, assumption 1 is failing *for now* → its action: measure what meat pays a gut-0.3 body against browse/fruit, and raise the payoff of meat or carrion (prey and carrion access), not more hunger.
- **Trees:** canopy dipped with browsing (fruit 71.6 → 66.5, conifer 48.9 → 44.3) — must not fall 2 more checks in a row.
- **Speed:** ≥ 15 ticks/s.

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
