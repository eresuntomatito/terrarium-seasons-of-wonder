# Shrubland build spec: thicket on soil, not only beside reef (season 2058, Oct 20)

*Written by the world steward, Claude (Opus 5.5), an AI, for the builder (Codex CLI).*

**Source and trigger:** Luis's backlog item (s1934), "thicket finds a place in today's rules (shrubland on soil, so it no longer needs the reef)". Its trigger is thicket < ~40 cells.
- The thicket swings 31–58 cells in this window (s2054: 31, s2058: 58), with the reef at 15–19 solid cells.
- Trees come only by succession from thicket (`treeFromThicket`), so the reef's scarcity caps both browse and the trees' seed supply.

**Build after M3 is live. One key, `shrubland`.**

## Scope and rules for the builder
- Edit only `sim/world.mjs` and add `tools/shrubland-test.mjs`.
- With the key off, behaviour is bit-for-bit the old one, with no new `Math.random()` calls.
- Never touch `data/`. Use private temp copies.

## 1. Shrubland grows on soil
In `updateThicket()` (~1472), with the key rolled, a cell may also grow thicket when **all** of these hold:
- it isn't beside reef (the old edge rule is unchanged and still applies);
- it borders thicket: at least one of its 4 neighbours has `th ≥ P.shrubSeed` (0.3), **or** it already has `th > 0`. Shrubs spread by runners and seed from their own patch;
- the ground suits it:
  - `moisture ≥ P.shrubWet` (0.35);
  - `fertility ≥ P.shrubSoil` (0.3);
  - not deep water, not basement rock (`rock` 4);
  - `climbNeed() ≤ 0.5`;
  - not solid reef;
  - not under mature canopy (`trees ≥ treeMature`).

Growth is `P.shrubGrow` (0.0015, slower than the reef edge's 0.004) × the same density, moisture and soil terms. It draws soil the same way (`thicketUptake`).

## 2. Away from reef, it lives and dies by water and feet
- A non-edge cell holds on while `moisture ≥ P.thicketHardy`. Below that it wears by `thicketDie`, as the drought branch does now.
- Today a cell that isn't beside reef always dies. With the key, only drought, trampling (unchanged) and fire (trees' rule, if fire already burns thicket; don't add it if not) kill it.
- **Cap:** shrubland away from reef tops out at `P.shrubMax` (0.6), below `thicketMax` (0.8). Reef-edge thicket stays the densest.

## 3. Seeds in dung (rare)
- If the world already carries thicket seeds in bodies, reuse them.
- If not, add **nothing**. The spread from §1 is enough, so don't add a new body field.

## 4. Test: `tools/shrubland-test.mjs`
Old vs new, from a private copy of the current save, **8 seasons**, both variants with every live rollout. Model it on `tools/footprint-test.mjs`.
- **Per season:**
  - thicket cells (≥ 0.1) and density sum;
  - reef-edge vs soil thicket;
  - saplings from thicket and mature trees;
  - browse share of the diet;
  - bodies, births, starved;
  - grass plants;
  - ms/tick, errors.
- **Pass:**
  - errors 0;
  - thicket in new ≥ old and **not runaway**: under 8% of land cells after 8 seasons. If it runs away, halve `shrubGrow` and say so;
  - bodies ≥ 160;
  - ms/tick within +10%.

## Done means
`node tools/smoke.mjs` prints `errors 0`, and the test runs to the end. Report what changed and the numbers. **Don't activate the key; the steward releases it.**
