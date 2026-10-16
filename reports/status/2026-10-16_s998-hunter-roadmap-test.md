# Test report — the hunter roadmap (season 998, Oct 16, 00:40)

**Question (Luis):** why has no hunter emerged, and what happens if we lower every wall in its way? Test first, then release gradually over an hour.

## 1. The walls, and the switch for each
| Wall | Why it blocks hunting | Switch |
|---|---|---|
| **The gut valley** | Jaws needed gut > 0.25, and meat digested as gut × 0.9. At gut 0.3 grass is worth 68% and flesh 27%, so an animal halfway along is bad at both. | **A · valley:** flesh digests as gut^0.5 (gut 0.3 → 49%), jaws from gut 0.15 |
| **Nobody small enough to eat** | A hunter must be 1.2× its prey (more if the prey has a shell). Every adult is 5.4–7.1, so taking a typical adult needs a body of ~8.3. | **B · skill:** the size needed falls by up to 30% with a hunter's build (gape and legs) |
| **Packs need hunters first** | Pack help counted only jawed members of the same species, and there were 4 jawed animals in the whole family. | **D · packkin:** jawed relatives of the same branch (parent or sister species) hunt together |
| **One size for all** | Everyone descends from one line and converged on size ~6.3, so there is no prey class. | **C · sizevar:** bodies differ twice as much from their parents at birth |
| **Room counted in heads** | A size-10 and a size-5 each take one place, so being big costs nothing in room and small lines can't be more numerous. | **M · massroom:** room by body mass, (size/5)², with a head limit of 375 for the machine |

## 2. How it was tested
Six cumulative variants (current rules, A, A+B, A+B+D, A+B+D+C, all + M), two runs each, 20,000 ticks (≈3.7 seasons, through the start of a drought), all from the world at season 991.

| Variant | Kills | Kills of adults | Starved | Bodies | Species | Size spread (sd) | Animals with jaws (>0.15 / >0.25) |
|---|---|---|---|---|---|---|---|
| Current rules | 4 / 13 | 1 / 0 | 46 / 43 | 331 / 329 | 5 / 4 | 0.44 / 0.51 | 29 / 3 · 33 / 5 |
| A | **198 / 224** | **95 / 114** | 29 / 49 | 329 / 330 | 6 / 6 | 0.45 | 19 / 1 · 32 / 5 |
| A+B | **383 / 340** | **212 / 190** | 48 / 37 | 329 / 331 | 4 / 3 | 0.45 / 0.42 | 40 / 7 · 38 / 2 |
| A+B+D | 357 / 266 | 187 / 154 | 61 / 54 | 331 / 330 | 4 / 5 | 0.42 / 0.46 | 43 / 4 · 24 / 1 |
| A+B+D+C | 283 / 257 | 168 / 162 | 58 / 39 | 329 / 329 | 4 / 4 | **0.53 / 0.59** | 32 / 8 · 23 / 3 |
| All + M | 316 / **396** | 180 / **220** | 32 / 56 | **299 / 314** | 5 / 6 | **0.48 / 0.64** (sizes 4.9–8.5) | 22 / 2 · 28 / 9 |

No errors in any run, and the same speed in every variant.

## 3. Findings
1. **The gut valley was the main wall.** Flattening it alone raised kills about 25-fold (8 → 211), half of them grown animals, a first in this world.
2. **Hunting skill doubles it again** (→ 362), and gape rose in those runs (0.62 → 0.66): the build that hunts now pays.
3. **Packs by branch add nothing measurable yet:** too few hunters stand near each other. It is cheap, and should matter once hunters are common.
4. **Wider birth sizes** widen the size spread by about a third within 4 seasons, the start of a prey class.
5. **Room by mass** keeps the same mass with fewer, larger animals (and makes size more variable). At 1.55 per place it held slightly fewer heads (299–314). **Set to 1.6 per place for release**, which is neutral for today's world.
6. **No harm:** the population held and starvation did not rise. The species count varied (3–6), with no collapse.
7. **Not yet hunters:** meat is still a side food (90th-percentile meat share ≤ 7%) and guts did not move in 4 seasons. These switches open the door; selection has to walk through it.

## 4. Decision and rollout (one switch every 4 seasons, ≈ 12 minutes)
| Switch | Live from |
|---|---|
| A · valley | season 1000 |
| B · skill | season 1004 |
| D · packkin | season 1008 |
| C · sizevar | season 1012 |
| M · massroom | season 1016 |

A monitor checks every 10 minutes. If bodies fall below 280, or a species halves within 3 seasons mostly by being eaten, the remaining switches are postponed and the reason is logged.

**Side finding (capacity, same night):** with no room limit, numbers jumped from 330 to 3,100 in 3,000 ticks. The grass carried at least 1,200 animals in wet spells with almost no starvation. But 500 animals already cost 55–80 ms a tick, and the live world needs 33 or less, so **a food-led world is not viable on this machine**.
