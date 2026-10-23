# Step 4 build spec: bodies hold what they cost (season 2264, Oct 21)

*Written by the world steward, Claude (Opus 5.5), an AI, for the builder (Codex CLI). Luis approved it (s2261: "implement proposals", size study option B).*

**Sources:**
- energy roadmap `2026-10-17_s1588-energy-roadmap.md`, step 4;
- size study `2026-10-21_s2254-size-study.md` §5 B.

**Today:**
- `P.bornBody = 0`, so a body born in the world holds no tissue energy. `bodyHeld(c)` = `c.body ?? mass × bodyEnergy × bornBody` (+ fat, + gutE), which for born bodies is 0 + fat.
- Growth to adult size is free, and a carcass or kill is only working energy plus fat (~4 for an adult, ~0.9 for a young body).

**The goal:** building tissue costs energy, and that energy comes back at death as meat or carcass. Size gets a true price: big young are costly and slow to raise, small young cheap and fast. Prey become real meals.

## Scope and rules for the builder
- Edit only `sim/world.mjs` and add `tools/tissue-test.mjs`. One rollout key, **`tissue`**.
- With the key off, behaviour is bit-for-bit the old one.
- Unique species are exempt.
- Never touch `data/`. Use private temp copies.
- **Don't edit the s2261 keys' code** (climbweight, coldheights, trees2, smallfood, bodies' `id`, `bands`).

## 1. Tissue as a body's own store
- With `tissue` rolled, each non-unique body tracks `c.body`: energy locked in tissue.
- **At birth:** `c.body` = the newborn's mass × `bodyEnergy` × `P.tissueBirth` (0.4, the share of adult tissue a newborn starts with, scaled by its birth size). **The parents pay it,** on top of the existing gift (`give`). If the parents can't pay the full tissue cost, the litter shrinks (`litterOf`) or the young are born smaller. Choose the smaller change to the existing code, and say which.
- **While growing** (`bodySize` grows to adult over `growTicks`): each tick, the tissue still missing toward `mass(bodySize) × bodyEnergy` is built at most at `P.tissueRate` per tick, paid from `c.energy`.
  - A body that can't pay grows slower: its effective growth is capped by `c.body`. That means `bodySize` grows only as fast as tissue is paid for. Keep this simple: e.g. a per-body growth factor `c.grownFrac` that advances only when paid, used in `bodySize`.
- Adult upkeep is unchanged.

## 2. Tissue comes back at death
`bodyHeld(c)` already counts `c.body`. Make sure every death path (`die`: starved, old, eaten, burnt) passes `c.body` into the carcass or kill exactly as body energy is passed today. No energy may be created or destroyed: birth cost = what the parents lose; growth cost = what the body loses; death returns it.

## 3. Roll in gently
`P.tissueBirth` and the growth cost ramp from 0 to full over `P.tissueRamp` = 10 seasons from the rollout season, like `skillcost`. Grass ramp precedent: freeze the ramp if bodies < 160.

## 4. Test: `tools/tissue-test.mjs`
Old vs new, from a private copy of the current save, **12 seasons** (the ramp plus 2), with every live rollout in both. Model it on `tools/variant-test.mjs`.
- **Unit checks:**
  - key off → identical positions after 300 ticks;
  - **energy conservation** over a birth, a growth tick and a death (to 1e-9);
  - persistence through `toJSON`.
- **Per season:**
  - bodies, births, starved, eaten;
  - size p10/p50/p90 and SD;
  - the correlation of adult size with litter and with age at maturity;
  - mean meat per carcass or kill (adult, young);
  - ms/tick, errors.
- **Pass:**
  - errors 0;
  - bodies ≥ 160 every season;
  - ms/tick within +10%.
- **Report** whether size spread widens and whether meat per kill rises.

## Done means
`node tools/smoke.mjs` prints `errors 0`, and the test runs to the end. Report what changed (functions, params) and the numbers. **Don't activate the key; the steward releases it.**
