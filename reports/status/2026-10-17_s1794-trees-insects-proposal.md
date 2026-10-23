# Proposal: trees, fruits and cones, flowers, insects and insect-eaters (season 1794, Oct 17)

**Asked by Luis (s1794):** trees, fruits and cones (and nuts), insects and flowers, and animals that can come to eat insects. All of it should be *logical to the current geology and ecology*, with the rules and the **seeds** that let it emerge rather than putting it all in place. Fruits and cones should give browsers diversity, and later different nutrients. Insects with short lives that fly and migrate, transforming the vegetation, if that's affordable. The priority: **refuge for grazers and browsers**, and insects and insect-eaters that can sustain themselves, before any brakes on meat-eating.

Nothing below is built yet. **Luis answered the questions at s1803;** see section 6 for the decisions and the build plan.

## 1. Why the refuge is gone, and why trees are the answer

- **The world's only woody plant, the thicket, can only grow on the edge of solid reef.** That's the code's rule: `updateThicket` grows it where a cell touches solid reef and kills it everywhere else.
- **The reef lost 85%** to the post-upheaval water, the quakes and frost, and to too few carcasses to rebuild it. **The thicket died with it** (~2,000 dense cells before the upheaval, ~270 now).
- **With them went the prey's cover**, hiding the young, and with browsing (1% of diets).

**Trees break that dependency:** woody plants that stand on soil, chosen by the rock, the water and the cold, not by reef.

## 2. The design in five layers, each tied to what the world already has

### A. Trees (the refuge)
- **A per-cell canopy** (0–1, slow: about 20 seasons to mature) and a **tree kind** chosen by where it grows, so the geology decides the forest:

  | Kind | Grows on | Climate | Food it bears |
  |---|---|---|---|
  | **Fruit trees** (broadleaf) | **soft rock / clay**, and alluvium | warm and moist (T > 0.4, moisture > 0.5) | **fruit** (soft, sweet, short-lived) |
  | **Nut trees** | **soluble rock (limestone)** | mild | **nuts** (hard shell, rich, long-lasting) |
  | **Conifers** | **hard rock**, and the heights up to the treeline (T > 0.2) | cold, drier | **cones** (seeds, resinous, durable) |

- **Seeds, not planting:**
  - existing thicket where the soil suits a kind turns into saplings slowly (succession: shrub → tree);
  - a mature tree's seeds spread to suitable neighbours;
  - **animals that eat fruit carry its seeds in their dung**, planting new trees where they walk. That's a mutualism, and it pays off in phase B.
- **What trees do:**
  - **cover:** under canopy, bodies are hidden at a distance and big bodies are slowed. The existing thicket rules extend to it: `thicketHide`, `sightThicket`, `thicketDrag`. **This is the refuge.**
  - **shade:** grass grows slower under trees. The meadow and the wood become different places.
  - **roots:** water wears soil and reef less where trees stand. A gentle check on the erosion that destroyed the reef.
  - **leaf litter:** fertility back to the soil.
- **What kills trees:** drought, frost (below the treeline), browsing of saplings, and quakes (falls). There's no fire for now.

### B. Fruits, nuts and cones (diversity for browsers)
- **Mature trees bear seasonally:** fruit in the warm part of the climate cycle, nuts and cones in the cool. Each is a per-cell food store with its own shelf life: fruit rots in a few days (into soil, and food for insects), nuts and cones keep for seasons.
- **Each asks for a different body**, which is the browsers' diversity:

  | Food | Energy per unit (proposed) | To reach it | Kept by |
  |---|---|---|---|
  | **Fruit** | high, quick (sugar) | **size or climbing** for fruit on the tree; fallen fruit for anyone | a plant gut (as grass) |
  | **Nuts** | high, rich in fat (more of it stored as fat, as `fatRich` already does) | **a hard mouth:** gape plus a new inherited bite-strength trait (dormant at start) | a plant gut |
  | **Cones** | moderate; durable, a winter food | the hard mouth, or patience (a long handling time) | a plant gut |

- **Later (your "different nutrients"):** fruit gives quick energy, nuts fat, cones minerals (for shells). Today's world tracks energy, fat and minerals already, so this extends naturally. *Recommended as a later step, once the foods themselves are working.*

### C. Flowers (the link between plants and insects)
- **Flowers open seasonally** on fruit trees and in wet meadows (grass under warmth and moisture), as a per-cell bloom that lasts some days.
- **Fruit needs pollination:** a fruit tree only sets fruit in proportion to the insects that visited its flowers. This closes the loop: **flowers → insects → fruit → fruit-eaters → seeds in dung → trees**.

### D. Insects (cheap enough as a field, not as animals)
- **Not individual creatures.** Hundreds of thousands of flying agents would cost far more than the whole world does today. Instead, **an insect density per cell** (0–1), like scent or water:
  - **born** where there's food: flower nectar, rotting fruit, dung, carcasses, leaves;
  - **short-lived:** they decay quickly without food;
  - **flying and migrating:** the field spreads to neighbouring cells each update, and drifts with the climate (toward warmth and bloom), so swarms travel across the map;
  - **acting on the vegetation:** they pollinate flowers, chew leaves (a small cost to trees and grass in outbreaks), and speed the breakdown of dung and carcasses.
- **Optional later:** split it into two fields, pollinators (on flowers) and decomposers (dung and carrion flies). *Recommended to start with one.*
- **Cost:** one or two more grid layers, updated every ~10 ticks over 9,600 cells. That's about the cost of the water: **well under 1 ms a tick.** Feasible.

### E. Insect-eaters (a new way of life, and a bridge across the gut valley)
- **A body eats insects from its own cell.** Access comes from a new inherited skill (**"snap"**: a quick tongue or beak, dormant at 0, like swimming and climbing), and the bite scales with the local density.
- **Insects are digested best by a middle gut (about 0.3–0.5).** That's exactly the valley that blocks the way from plants to meat today. **Insectivory becomes the stepping stone:** a grazer that starts eating insects gains from a meat-leaning gut at every step. That's how many meat-eaters evolved in nature.
- **Trophic level:** insects count as level ~2.5 (they eat plants), so insect-eaters sit at ~3. That's food-chain depth without hunting.
- **A new way-of-life label, "insectivore"** (insects ≥ 30% of the diet), so bands living that way can split into species.

## 3. Cost and feasibility

| Piece | Extra state | Extra work per tick | Verdict |
|---|---|---|---|
| Trees | canopy + kind per cell | an update every ~60 ticks (like the thicket) | cheap |
| Fruits, nuts, cones | 3 food stores per cell | seasonal; eaten in `eat()` like shoots | cheap |
| Flowers | bloom per cell | seasonal | cheap |
| Insects | 1–2 fields | spread + growth every ~10 ticks (like the water) | **< 1 ms** |
| Insect-eating, new traits | 2 genes (bite strength, snap) | in `eat()` and sensing | small |
| Individual flying insects | — | — | **too costly; not proposed** |

**In total, an estimated 2–4 ms a tick** on today's ~30 ms. The world stays near its current speed.

## 4. Phasing (one step per usage window; Sonnet builds and tests, the steward reviews and goes live)

1. **Trees** (refuge first): the three kinds by rock and climate, succession from thicket and seed spread, and cover, shade, roots and litter. *Watch: do the young survive more? Does the reef's wear slow?*
2. **Fruits, nuts and cones,** with the bite-strength trait and seed dispersal through dung. *Watch: browsers return, and split by food?*
3. **Flowers and insects:** the field, pollination, decomposition. *Watch: swarms, outbreaks, the fruit set.*
4. **Insect-eating:** the snap skill, the middle-gut digestion, the "insectivore" label. *Watch: a way across the gut valley?*
5. *(Later)* **Nutrients by food:** sugar, fat, minerals.

The energy roadmap continues alongside: step 3 (decomposers on carcasses) fits with insects in phase 3. Step 4 (bodies hold what they cost) comes after.

## 5. Questions for Luis
1. **Three tree kinds tied to the three rocks** (fruit on clay, nuts on limestone, conifers on hard rock and the heights)? Recommended: yes. It makes the forest follow the geology.
2. **Seeds by succession from the remaining thicket, plus seed spread and dung dispersal**, with nothing planted? Recommended: yes, with a slow start; the first saplings in ~5–10 seasons. The alternative is a few seed groves in the best places to start faster.
3. **Insects as one field first,** with two kinds later? Recommended: yes.
4. **New dormant skills** (bite strength for nuts and cones, "snap" for insects), like swimming and climbing? Recommended: yes.
5. **How strong a refuge:** as thicket today (hidden beyond close range, big bodies slowed), or stronger under mature canopy? Recommended: as thicket, a little stronger in old wood.
6. **Pace:** phase 1 now, then one phase per usage window?

## 6. Luis's decisions (s1803) and the build plan

| # | Decision |
|---|---|
| 1 | **Yes, three kinds by rock.** He added two rules: **roots reduce soil erosion** (and the water's wear of reef), and **strong water flow breaks or uproots trees** |
| 2 | **Yes:** succession, seed spread and dung dispersal; nothing planted |
| 3 | **Yes:** insects as one field first |
| 4 | **Yes:** dormant bite-strength and snap skills |
| 5 | **Cover as thicket today** (hidden beyond close range, big bodies slowed). **Luis clarified that "but in high drought" means fire:** dense woods in severe drought can catch fire. This is included only if cheap: lightning ignition where it's very dry and densely wooded, a bounded spread through dry wood, and burnt canopy returned as ash (fertility). Grass is unharmed. **If fire stays in, animals must react (Luis):** they flee burning ground, and bodies caught in it lose energy and can die (cause "burnt"). **How trees look is the viewer session's to design:** it should iterate scenarios (drought, snow, season, the three kinds) so trees aren't drawn as a flat mass |
| 6 | **All of it fits within energy-roadmap step 3** (decomposers on carcasses) |

**The build, as roadmap step 3, in two Sonnet passes, each headless-tested before going live:**
- **3a:** trees (kinds, succession, cover, shade, roots, breakage by flow, litter, and fire in high drought if cheap); fruit, nuts and cones; the bite skill; seeds carried by fruit-eaters. Rollout key `trees`.
- **3b:** flowers and pollination, the insect field, decomposers opening carcasses (rot slows where they feed), the snap skill, middle-gut digestion of insects, and the insectivore label.
