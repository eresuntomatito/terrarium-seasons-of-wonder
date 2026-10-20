# M4 build spec: smooth the gut valley with overlapping fit curves (season 2111, Oct 21)

*Written by the world steward, Claude (Opus 5.5), an AI, for the builder (Codex CLI).*

**Source:** proposal `2026-10-18_s2008-movement-physics-diet-proposal.md` §4c and Luis's decision 8 (§8). *The predator's cost, M4's second half, is held. Luis (s2101) wants to think about "skills cost" more broadly ("not everyone can be a master of everything"), and the predator's cost belongs in that discussion.*

**Today:** `rollout.plateau`, `valley` and `pyramid` are live.
- Grass is worth 1 up to gut 0.15, then `((1 − g)/0.85)²`.
- Flesh is `g^0.5 × fleshEff`, with jaws from 0.15.
- Carrion peaks at 0.3 (width 0.55).
- Insects peak at 0.4 (width 0.25).
- Browse is `(1 − g) × browse`.

These are different shapes with different floors and caps, and the living sit bunched at gut 0.04. **The goal:** every food has one fit curve of the same family, each overlapping its neighbours. Every step along the gut axis then trades a little of one food for a little of the next, with no dead zone and no wall.

## Scope and rules for the builder
- Edit only `sim/world.mjs` and add `tools/gutcurve-test.mjs`. One rollout key, **`gutcurves`**.
- With the key off, behaviour is bit-for-bit the old one.
- Unique species are exempt and keep today's functions.
- Never touch `data/`. Use private temp copies.

## 1. One curve family
`fit(g, kind) = exp(−((g − peak) / width)²)`, with a flat top. Within `top` of the peak, fit = 1.

| Food | peak | top | width | Note |
|---|---|---|---|---|
| grass (`plant`) | 0.05 | 0.10 | 0.35 | full value 0–0.15 (as the plateau today), half by ~0.45 |
| browse | 0.25 | 0.10 | 0.35 | multiplies the existing `browse` trait term; replaces `(1 − g)` |
| fruit, nut, cone | 0.20 | 0.10 | 0.40 | today they share `grassGut`; give them their own, slightly meatward |
| insect | 0.40 | 0.05 | 0.30 | close to today's bump, same family |
| carrion | 0.55 | 0.10 | 0.30 | × `carrionEfficiency` |
| flesh | 0.80 | 0.15 | 0.35 | × `fleshEff(c)` (pyramid unchanged) |

- With the key rolled, `grassGut`, the browse factor, the tree-food factor, `insectGut`, `carrionDigests` and `fleshGut` each return their curve (times the same efficiency constants as today, where they have one).
- Update the `eff` lookups in `feed()` and `feedNow()` (the M3 stomach load), so bulk follows the new efficiencies.

## 2. Jaws and grazing gates
- Keep `hasJaws` at the valley's 0.15 and `grazes` as now.
- The curves decide how much a body gets, not whether it may try.

## 3. Test: `tools/gutcurve-test.mjs`
Old vs new, from a private copy of the current save, **10 seasons**, with every live rollout in both. Model it on `tools/digest-test.mjs`.
- **Unit checks:**
  - key off → identical;
  - each curve is 1 at its peak and smooth (no jump > 0.05 between g and g + 0.01);
  - at every gut 0…1, the best food's fit is ≥ 0.35 (no dead zone);
  - print a 0.0/0.1/…/1.0 table of all curves.
- **Per season:**
  - bodies, births, starved, eaten;
  - gut p10/p50/p90 and its SD;
  - diet shares by kind;
  - ways of life;
  - ms/tick, errors.
- **Pass:**
  - errors 0;
  - bodies ≥ 160;
  - ms/tick within +10%.
- **Report** whether the gut spread widens (the point of M4).

## Done means
`node tools/smoke.mjs` prints `errors 0`, and the test runs to the end. Report what changed and the numbers. **Don't activate the key; the steward releases it.**
