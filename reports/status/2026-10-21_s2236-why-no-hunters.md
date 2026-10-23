# Why no hunters? The missing pressures (season 2236, Oct 21)

*Written by the world steward, Claude (Opus 5.5), an AI, at Luis's request. Not written by Luis.*

**The question (Luis):** even if every region offers the same life, why hasn't a hunting species emerged? What pressures are missing that would push hunters to appear?

**Method:**
- I read the hunting rules in `sim/world.mjs`.
- On a copy of the live save (s2236, 241 bodies), I measured 2,000 ticks of real feeding, what a kill is worth at each gut, and who can be caught.
- I checked the server log's history.

**Companion report:** [why no split](2026-10-21_s2235-why-no-split.md).

## The short answer
**In this world, a well-fed body never hunts its own species.** It eats kin only when starving (energy below 30% of its maximum: `cannibalHunger`). Since s1853 there has been **one species**, so there is **no legitimate prey at all**.

Hunters did exist: the log holds **250 "have become hunters" events** (the stalkers and others) from the era of many species. They vanished with the other species. So the deepest missing pressure is **prey that isn't family**. And that is blocked by the problem in the companion report: no new species can split off. It's a loop.

## 1. The rule: kin is off the menu
- `wouldEat(c, o)` returns true for another species, or **for one's own kind only when hungry**.
- In 2,000 ticks of live feeding there were **0 kills**. Meat (flesh) was **0.0005%** of all intake, and carrion 0.4%.
- The "eaten" deaths in the reports (~300–600 per window) are the **starving eating the young**: a famine behaviour, not a way of life.

## 2. Even if kin were fair game, a kill doesn't pay
**Who can be caught:**
- A body can overpower only prey ≥ 1.2× smaller, more with armour. The mean armour of 0.40 raises the bar to ~1.45× smaller.
- Everyone is about the same size (size varies only ±15%), so **only the young are catchable**: 21 of 241 bodies.

**What a kill is worth, against grazing in the same time:**
- Grazing brings ~**0.0018 energy per tick**. Over the 240 ticks of handling a kill, that's ~**0.42**.
- A young prey holds ~**0.92** energy. What a hunter keeps depends on its gut:

| Gut | Grass worth | Kill worth (fit × efficiency) | One young kill gives | Grazing in the same time |
|---|---|---|---|---|
| 0.04 (today) | 1.00 | 0.02 | 0.01 (no jaws yet) | 0.42 |
| 0.3 | 0.83 | 0.13 | 0.10 | 0.35 |
| 0.4 | 0.60 | 0.21 | 0.16 | 0.25 |
| 0.5 | 0.37 | 0.29 | 0.23 | 0.16 |
| 0.8 | 0.03 | 0.76 | 0.59 | 0.01 |

- **There's no gradient to climb.** Moving from gut 0.04 to 0.5 costs nearly two-thirds of a body's grass value long before meat pays. Guts drift only ~0.04 per generation, and today's maximum gut is 0.21.
- **The prey can't feed a predator population.** About 100 young are born per season, ~92 energy of catchable meat. A full hunter (gut 0.8) needs ~11 energy a season, so even catching every newborn, the young could feed **at most ~6 hunters**. The rest of the population is too big to catch.

## 3. The missing pressures

| Missing pressure | What's there today | What hunters need |
|---|---|---|
| **Prey of another kind** | One species since s1853; kin are eaten only in famine | A second species (or a rule that lets distant kin be prey) |
| **Prey that's catchable** | Everyone the same size, armoured; only newborns qualify | Smaller-bodied prey, or a size spread within the world |
| **Meat that pays early** | The middle guts lose grass faster than they gain meat | A bridge: carrion or insects that pay a middle gut (carrion is 1% of the diet, insects 0%) |
| **Grass that fails** | Grass is still 85% of the diet; the 30% leaner grass didn't move guts | Times or places where plants can't feed everyone while bodies are plentiful |
| **A reason to stay a hunter** | No population of hunters can persist (≤ 6 even in theory) | Prey numbers ≥ ~10× hunter numbers |

## 4. What could change it (for Luis to decide; nothing is built)

| Option | What it does | Kind |
|---|---|---|
| **A. Fix the split loop first** | The B + A test from the companion report (body test sees the new skills, plus skills cost) | Being tested now |
| **B. A second root** | Seed a small, different species: small-bodied grazers or insect-eaters, below the quilikes' size. The quilikes get prey of another kind, catchable by size. Luis already listed "a second root" among the whitepaper ideas | A deliberate intervention, Luis's call |
| **C. Distant kin are prey** | A fed body may hunt its own kind when the kin gap is wide (e.g. > 0.18, the far 25% of pairs). Predator bands could form inside the species, and the niche split could then make them a species | New rule; risky (could turn into mass cannibalism) |
| **D. A carrion bridge** | Make carrion richer for middle guts, so the step from grazer to scavenger pays, and from scavenger to hunter | Parameter-level |
| **E. Size spread** | Let body size drift wider (`sizeDrift`), so small bodies exist to be prey | Parameter |

**The steward's recommendation:**
- **B (a second root)** is the most direct route to real predators: it supplies the missing prey in one step, and the quilikes' existing jaws, gape and pack rules can do the rest.
- **A** is already in testing and helps any new species last.
- **C and E** shouldn't be done alone; they mostly make the famine-eating worse.
