# M3 build spec: digestion takes time, stomach ∝ mass (season 2031, Oct 20)

*Written by the world steward (Claude) for the builder (Codex CLI). Source: proposal `2026-10-18_s2008-movement-physics-diet-proposal.md` §4a and Luis's decision 6 (§8). Build only after M2 (`physics`) is live; the world is released one key at a time.*

**The natural model (Jarman–Bell):** stomach capacity ∝ M¹, energy needs ∝ M^0.75 (upkeep already does `k ** 0.75`, `sim/world.mjs` ~2430). Big bodies can live on slow, poor food by holding it longer; small bodies need quick, rich food. The goal is diets that split by body size, with no hand-made walls.

## Scope and rules for the builder
- Edit only `sim/world.mjs` and add `tools/digest-test.mjs`. One rollout key, **`digest`**.
- With the key off, behaviour is bit-for-bit the old one.
- New body state (`c.gutLoad`, `c.gutE`) survives `toJSON()` and defaults when missing.
- Unique species are exempt.
- Never touch `data/`.
- The old experiment `P.stomach` (off, 0) stays as it is. The new model is separate and doesn't use `P.stomach`, `c.bulk` or `P.stomachHold`/`stomachEmpty`.

## 1. The stomach holds food, and energy comes out over time
With `digest` rolled, `feed(c, energy, level, kind)` (~2839) doesn't add energy at once:
- **The food goes into the stomach:**
  - `c.gutE += energy` (digestible energy waiting);
  - `c.gutLoad += energy × P.digBulk[kind] / max(0.05, eff)`.

  `eff` is the same per-kind gut efficiency the old stomach branch computes, so bulk follows the raw food eaten.
- **Each tick** (in `step()`, near the `digesting--` line ~2422), the stomach releases:
  - `out = c.gutE × (1 − exp(−1 / τ))`;
  - `τ = P.digTime[kind mix]`: keep per-kind pools, or one pool with a load-weighted τ (the simpler one is fine; say which).

  `out` passes through the **old** `feed()` body, so fat, `ate`, `recent` and the diet bookkeeping are unchanged and are counted when the energy is released. `gutLoad` falls in proportion.
- **Digestion times τ** (ticks; a season is `SEASON_TICKS`):
  - grass 600;
  - browse 400;
  - cone 300;
  - nut 200;
  - fruit 120;
  - insect 80;
  - carrion 100;
  - flesh 150.

  These are the parameters to tune.

## 2. Capacity ∝ mass
- `cap(c) = P.digCap × mass(bodySize(c))`, where `mass(5) = 1`, in the same units as `gutLoad`.
- When `gutLoad ≥ cap`, the body can't take food. Gate it where the old experiment set `full` in `eat()` (~2670), and in carrion/flesh/fruit/insect intake.
- A filter-feeder's `gulp` stays exempt (it's unique).
- Start `P.digCap` so that a size-5.5 grazer on today's grass is full ~35–45% of the time (measure it). Give one line explaining the derivation.

## 3. Hunger pressure stays honest
- A body still decides to eat by its energy, as now.
- A full stomach doesn't feed it, so starving with a full stomach of grass is possible for a small body. That's the intended pressure, not a bug.
- Energy still in the stomach at death goes to the carcass, as body energy does now. Find how `die()` sizes the carcass and add `c.gutE`.

## 4. Dung
`honestdung` stays as it is: the undigested part is computed at the bite, as today.

## 5. Test: `tools/digest-test.mjs`
Model it on `tools/footprint-test.mjs`: old vs new, `nice -n 10`, a private copy, **10 seasons** (the proposal asks for 10+ because past leaner-food steps shocked the world).
- **Unit checks** (assert):
  - key off → identical positions after 300 ticks;
  - energy conservation: food in = released + still in the stomach (to 1e-9);
  - capacity doubles with mass;
  - grass releases slower than fruit;
  - persistence through `toJSON`.
- **Per season:**
  - bodies, births, starved, eaten;
  - **size p10/p50/p90**;
  - **diet shares** by kind (from `ate` per kind, or `recent`);
  - the share of the time bodies are full;
  - the correlation of size with the grass share;
  - ms/tick, errors.
- **Pass:**
  - errors 0;
  - final bodies ≥ 160;
  - ms/tick within +15%.
- **Report** whether size and diet start to correlate (the point of M3).

## Done means
`node tools/smoke.mjs` prints `errors 0`, and `node tools/digest-test.mjs` runs to the end. Report what changed and the numbers. **Don't activate the key; the steward releases it.**
