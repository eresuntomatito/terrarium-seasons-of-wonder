# Roadmap v2: closing the energy loop, and the ways of life (season 1693, Oct 17)

**Asked by Luis (s1692):** where we are in closing the loops of the energy cycle and making congruent how species get their energy. An updated roadmap with the foods, energy per unit and how that energy is reachable in today's world; the ways of life possible and the walls for each; and recommendations to promote food-chain diversity.

**Sources:** a fresh energy ledger (`tools/energy-ledger.mjs`, one season on a copy of the live world, s1693, with the upheaval's last settling switched off on the copy), trait statistics of the living, and the code. It replaces the food table of [roadmap v1](2026-10-17_s1588-energy-roadmap.md); v1's step plan still holds and is updated below.

## 1. Where the loops stand

| Loop | v1 (s1581) | Now (s1693) | Status |
|---|---|---|---|
| **Dung:** grazers → dung → decomposers | free gift, **65%** of all income, from nothing | honest: dung carries what grazers didn't digest (**7.9%** of income) | ✅ **closed** (step 1, s1620) |
| **Nutrients:** soil → plants → dung, withering, rot → soil | closed | closed | ✅ |
| **Carcasses:** deaths → carcasses → carrion eaters | 34% of deaths' energy came back into bodies | **26%** | ❌ open: a carcass can yield up to 1.8× what it holds (step 1b), and most carcass energy rots |
| **Kills:** prey → hunter | 77% of a kill vanished | **77%** (57 of 74) | ❌ open (step 2) |
| **Prey as meals** | a kill held ~1.3 | ~1.2 per kill (median living body 3.0) | ❌ open (step 4) |
| **Mineral:** rot → reef → water → soil; shells | mostly closed | mostly closed; reef down 1,239 → 891 cells (quakes, water) | ◐ |

**One season now (s1693):**
- **Energy in:** the sun grew **1,504** of plant energy.
- **Income: 2,790**:
  - plants **75%** (grass, plus water plants and lichen);
  - shoots **16%**;
  - dung **8%**;
  - carrion **1%**;
  - flesh **0.2%**.
- **Spent:** living costs took **2,835**.
- **Deaths:** **128**, including 62 kills worth 74.

The world now runs honestly on plants. **The meat side of the loop is the part still open.**

## 2. The foods: what each gives and how it can be reached *in today's world*

*"Per unit"* = one unit of the food as it lies in the world (a full grass cell is 1). "Available" = what lies in the world now (s1693).

| Food | Available now | Energy per unit | Mouth / bite | Stomach / gut fit | Time | Dung left | What the world requires to reach it | What blocks it today |
|---|---|---|---|---|---|---|---|---|
| **Grass** | 6,446 units | **0.19** (0.55 × lean 35%) × quality 0.6–1.3 × strain | any gut < 0.75; 0.08 × √mass × (1 − gut) | full value up to gut 0.15 | none | the undigested part (step 1) | standing on it; not inside dense thicket | drought; −30% × dung ability, −50% × browse |
| **Thicket shoots** | 992 units (was ~2,000) | **4 × (1 − gut) × browse**, × 0.8–1.4 (dry best), up to × 1.8 in the cold | browse > 0.1 **and** size ≥ 4; 0.04 × √mass × browse | (1 − gut) × browse | none | none | a browsing mouth, enough size | the hedge's floor (0.45 kept); the hedge is shrinking |
| **Water plants** | 1,046 units | **0.19** × the grass fit | waders at the edges (0.4 + 0.6 × swim), swimmers in the deep (2 × swim) | the grass fit | none | none | **swimming** (living: median 0.09, best 0.15) | droughts empty the water; deep water needs swimming |
| **Lichen** | **5,138 units**, the largest untouched store, most of it on the risen dome | **0.08–0.23** (more with a thick coat) | 0.03 × √mass × (1 − gut) | the grass fit | none | none | reaching ground above 0.35: **climbing** onto crags (need 0.4–0.7) | **climbing** (living: median 0.14, best 0.20) |
| **Dung** (honest) | 0.48 on the ground | **0.8 × its energy** (what grazers didn't digest) | decomposer ability | the ability | none | — | following the herds | supply: grazers digest grass almost fully, so little is left (step 7) |
| **Carrion** | 8.7 on 8 carcasses | 0.7 × fit (best gut 0.3) × (1 + dung ability) × 1.3: **up to 1.8× what's there** (the leak, step 1b) | any gut > 0.1; 0.15 × √mass | best gut 0.3 | none | none | arriving before rot | **scarcity**: kills leave only 15% as scraps (step 2); heat rots |
| **Flesh** (a kill) | a living body holds fuel + fat + tissue: **median 3.0** (1.8–3.6) | a half-way gut keeps **~0.1–0.25** of the prey; the killer takes half × jaw fit; the rest is shared within 40 px | **jaws:** gut > 0.15 (living: max 0.22); **gape** fitting the prey | gut^0.5 × 35% (up to 90% for a meat gut) | handling 240 ticks × √(prey ÷ own mass) | none | size ≥ 1.2 × prey × (1 + 0.6 × shell × crack); jawed kin nearby help (packs); weak prey count smaller | **shells** (living: 0.50–0.63), **toxin** (0.39–0.66, everyone, harmful to any eater whose resistance is lower), prey hide in grass and thicket, kills mostly vanish |
| **A host** (parasites) | infested bodies (rare) | half of 0.04 × ability, from the host | parasitism (living max 0.18) | — | none | none | a weak, crowded, infested host of another kind | healthy hosts; the ability is low |
| **Own fat** | 78–133 across the family | stored at 85%, burned when hungry; rich foods fatten more | — | thrift | — | — | — | it slows a body and costs upkeep |

## 3. The ways of life the world allows, and the wall in front of each

*A body's way of life comes from its diet over the last day (the world's niche rules). Splits by way of life now need **30 founders within 200 px** (s1692).*

| Way of life | Defined by | Living now | What it lives on | **The wall today** | What would open it |
|---|---|---|---|---|---|
| **Grazer** | mostly grass | ~140 | grass | none, beyond drought and lean grass (35%) | — |
| **Mixed feeder** | grass and shoots | ~90 | grass + shoots | the shrinking hedge | — |
| **Browser** | shoots ≥ 50% | ~6 | shoots | the hedge has halved; shoots need size ≥ 4 | thicket recovery; browsing at smaller sizes |
| **Swimmer / water-plant feeder** | *(no niche label)* | — | water plants | **swimming** is low (best 0.15); the water comes and goes; **no niche label**, so no way-of-life split for it | an aquatic niche label; water plants a little richer for swimmers |
| **High-country lichen feeder** | *(no niche label)* | ~0 (the west emptied) | lichen, 5,138 units unused | **climbing:** crags need 0.4–0.7, and the best climber is 0.20. No step along the way pays, the same kind of valley as the gut's. Cold costs upkeep without a thick coat | a gentler climbing ramp (partial climbers reach the lower crags); a lichen niche label |
| **Decomposer** | dung ≥ 25% | ~3 | honest dung | **supply:** grazers digest grass almost fully, so little energy is left in dung | step 7 (realistic digestion: grass ~half digested, plant value rebalanced) |
| **Scavenger** | meat ≥ 30%, half from carcasses | ~3 | carrion | **scarcity:** kills leave 15%, carcasses rot first; the carrion leak inflates the little there is | **steps 1b + 2 + 3** |
| **Omnivore** | meat ≥ 20% | ~2 | grass + some meat | **the gut valley:** between gut 0.15 and 0.5, grass gets worse and meat is still poor | step 8 (mouth apart from gut); meat kept better by half-way guts |
| **Hunter** | meat ≥ 60%, mostly kills | 0 | prey | **five walls at once:**<br>1. prey hold little (~1.2 per kill);<br>2. 77% of a kill vanishes;<br>3. shells need ~1.6× the prey's size alone;<br>4. **universal toxin** harms the eater;<br>5. no jawed line (max gut 0.22) | **step 4** (bodies hold what they cost), **step 2**, a resistance path, a toxin cost |
| **Parasite** | host ≥ 25% | 0 | hosts | infestations are rare and hosts healthy; the ability is low (0.18) | crowding and weakness do it; little to change |
| **Apex** | ≥ 30% of meat from meat-eaters | 0 | hunters | there are no hunters | hunters first |

**Reading:** the world allows ten ways of life, but **energy reaches only three**: grazers, mixed feeders, and some browsing. Two big stores sit almost untouched: lichen (5,138 units, behind the climbing valley) and water plants (1,046 units, behind low swimming). The meat side is shut by five walls, three of which are in the roadmap already.

## 4. The roadmap, updated

| Step | What | Status |
|---|---|---|
| 1. Honest dung | dung carries what grazers didn't digest; the free gift faded over 10 seasons | ✅ **live s1620** (dung 65% → 8% of income, real) |
| — Falls fix | a cliff is ground that drops away | ✅ s1637 |
| — Niche splits | 30 founders within 200 px | ✅ s1692 |
| **1b. Carrion cap** | a carcass can't give more than it holds | ✅ **live s1766** (with 1c and 2; carrion ×2.4 in testing) |
| **2. Kill leftovers stay on the carcass** | what no diner keeps feeds the carcass, not nothing | ✅ **live s1766** as a meal limit (most of the old "77% lost" is digestion loss, which step 7 turns into dung) |
| **1c. Toxin from what is eaten** *(Luis, s1694)* | the toxin stock fills only from thicket shoots actually eaten, not from standing in thicket. Toxin becomes the browsers' trade-off, and open-ground grazers palatable prey. The cost stays 30% × gene | ✅ **live s1766** |
| 3. Decomposers on carcasses | decomposer ability opens carcasses; rot slows where they feed | then |
| 4. Bodies hold what they cost | tissue costs energy to build and returns it as meat | proposal for Luis first |
| 5. A stomach, conserved | bulk, capacity by mass; energy as it empties | after 4 |
| 6. Digestion time by food | plants slow, meat fast | after 5 |
| 7. Dung reflects digestion | realistic assimilation (grass ~half), plant value rebalanced | after 6 |
| 8. Mouth apart from gut | bite from mass and food, not (1 − gut) | optional |

**Toxin (Luis, s1694):** 1c is added above and built with 1b + 2. Toxin and resistance are now in the selection ledger (toxin from s1694), so reports show which way selection pulls. The upkeep cost is unchanged. *Saved for later:* a body-made toxin path, and slower-fading colour avoidance (warning colours, mimicry).

**Pace:** one step per usage window. Sonnet builds and tests, the steward reviews and goes live, and we watch at least 10 seasons with the ledger rerun after each.

## 5. Recommendations: rules that would promote food-chain diversity

*Beyond the roadmap, in order of how much they'd open. Each would go live only with your word, built behind a switch and tested headless.*

1. **Keep the roadmap order.** Steps 1b + 2 + 3 fill carcasses and open the scavenger and decomposer chain. Step 4 makes prey real meals, the precondition for any hunter.
2. **Toxin as a choice, not a default.** Every body carries toxin (0.39–0.66), because it comes from eating thicket leaves and everyone does. A hunter is poisoned by almost any prey. Options:
   - toxin builds only in bodies that *browse* (not in any body passing a hedge);
   - toxin costs more upkeep;
   - a hunter's resistance grows with what it eats, at a cost.

   That opens a real **toxic vs palatable** split, and with it prey choice and mimicry.
3. **A gentler climbing ramp.** Make the crag need rise smoothly from 0.2 (low crags) to 0.7 (summits), not only from 0.78 elevation up. Partial climbers then reach the lower lichen. The 5,138-unit lichen store on the new dome becomes a **high-country niche**, and the west may refill with a mountain species.
4. **Niche labels for water and heights.** Add "aquatic" (water plants ≥ 30% of the diet) and "highland" (lichen ≥ 30%) to the ways of life. Bands living that way can then split into their own species, as browsers and decomposers already can.
5. **The gut valley** (step 8 plus a half-way meat share). Half-way guts keep a little more meat, and the grass bite no longer shrinks with the gut, so stepping toward meat stops being a loss at every step.
6. **Room by niche, not only by heads.** When the head cap is full, let a species in an *underused* way of life still breed. This stops one booming line from blocking the rare ones (the s1603 collapse).
7. **Measure it.** Rerun the ledger and `tools/diets.mjs` after every change; reports already carry the new diets section (5b).

## 6. Caveats
- **One season** is behind the ledger; the shares are structural, the totals seasonal.
- **The ledger's "plant" line** counts grass, water plants and lichen, while its "eaten raw" line counts grass only. That's why digested (2,098) exceeds eaten raw (1,694).
- **The upheaval** settles at s1694, and the land and its foods will keep shifting for a while after.
