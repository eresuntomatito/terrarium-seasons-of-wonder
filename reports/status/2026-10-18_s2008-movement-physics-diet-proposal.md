# Proposal: movement at the map's scale, physics in metres, and diets that diversify (season 2008, Oct 18)

**Asked by Luis (s2005), in his order of priority:**
1. adapt species' movement to the map's scale, given how trees, cliffs, mountains and the geography are represented;
2. physics updates: climbing should take time ("going up"), and swimming should look slower and depend on the swim skill and on strength (size and energy, if that's simpler), with a reference scale in metres;
3. incentivise diet diversification: remove the walls, make grass a poorer source of energy, or require bigger stomachs and more time for the same energy, which favours bigger bodies (ruminants).

Nothing below is built. Section 5 lists the decisions for Luis, and section 6 is the roadmap.

## 1. A reference scale in metres

Every number in this section comes from the code and the live save at s2008.

| Thing | In the world | Proposed metres | Basis |
|---|---|---|---|
| **A world unit (1 px)** | — | **0.65 m** | the viewer's realistic scale (s1950): a mature crown (~11 units) is a ~7 m tree |
| A cell (8 units) | grid of 120 × 80 | 5.2 m | |
| **The map** | 960 × 640 units | **624 m × 416 m** (a valley of 0.26 km²) | |
| **A body** | `size` 4.7–5.9 (median 5.3) | **~1.8 m long, deer-sized** (the viewer draws 0.45 × size; the world counts ~size) | |
| **An average tree** | one canopy cell | **crown 7 m, height ~15 m** (a stand of 2–4 crowns per mature cell) | the viewer's stands |
| **A height unit** | elevation 0.09…1.88 | **proposed 1.0 = 100 m**, so the dome is ~190 m and the river's bed ~−70 m | leaves cliffs where `steepRef` 0.02/unit ≈ 72° slopes |
| **A movement tick** | median speed 1.3 units/tick | **~0.65 s**, so a body walks 1.3 m/s, a deer's walk | |
| A lifetime | 26,000 ticks (~4.8 seasons) | **4.7 hours of movement time** | |

**The two clocks.** At a walking pace a tick is 0.65 s, but a life is only 4.7 hours of that. Biology runs about **10,000× faster than movement**. That's normal for a world meant to be watched: a season can read as about a year. But it means **a body walks a whole map's worth every few minutes and crosses it about 35 times in its life.**

**The key finding:** a real deer's home range is 1–2 km across. This whole map (0.6 km) is smaller than one deer's home. So at deer scale, distance alone can never isolate a population. Genes mix across the whole map every generation, and only barriers (the river, the cliffs) can hold groups apart. That's why the new species rule (which needs a body difference) has found no split for 160 seasons.

## 2. Movement at the map's scale (priority 1)

| Option | What changes | Effect on isolation | Cost and risk |
|---|---|---|---|
| **A. Home ranges** *(recommended)* | Each body anchors to where it was born. It forages within a range radius R and is pulled back gently when it strays. Young disperse once, to a new anchor up to a few R away. R scales with body mass, like real herbivores (∝ mass): about 60–120 m (100–180 units) for today's bodies | **Strong:** isolation by distance appears, local bands can adapt (highland, river), and drift and niche splits find gathered groups | Cheap (one anchor per body, one pull in steering). Risk: herds bunch at good anchors and starve in droughts. Wide dispersal in hunger can soften that |
| B. Slower cruising | maxSpeed × ~0.3 | Moderate | Slows hunting, escape and foraging everywhere. Starvation risk in droughts |
| C. A bigger map | More cells (e.g. 1.5× each side) | Strong | ~2.3× the work per tick: memory and speed. Not recommended on this machine |
| D. Smaller creatures | Declare bodies hare-sized (0.5 m): the viewer draws them smaller, and ranges shrink | Strong | It changes the world's character, and the trees become huge |

**How the land joins in (with A):**
- **Trees** are cover inside a range, and the anchor is where young are born.
- **Cliffs and mountains** become range edges, since a range rarely spans a cliff (the climbing cost of section 3 makes that so).
- **The river:** a range spans the river only for good swimmers. So **swimmers on the far bank become a genuinely separate band**, the natural path to an aquatic or river species.

## 3. Physics in metres (priority 2)

**Today** (from the code):
- steep ground slows a body by up to 40% (`slopeSlow`), less with long legs;
- climbing costs energy ∝ rise × mass (`climbCost`);
- crags and cliffs are a **yes/no gate** each step (`crossGate`), with no time spent going up;
- wading slows by up to 70% (`wadeSlow`);
- **deep water slows nothing extra:** a swimmer moves at its land speed;
- strength isn't a trait.

**Proposed** (one rollout key, all at the reference scale):

| Rule | Proposal | Natural reference |
|---|---|---|
| **Strength** | `strength = (mass / mass(5))^(2/3) × (0.5 + 0.5 × energy share)`, derived not inherited: muscle scales with cross-section, and hunger weakens | muscle force ∝ mass^⅔ |
| **Walking on slopes** | speed × Tobler's hiking curve, `exp(−3.5 × |rise/run + 0.05|)`, with long legs flattening it | Tobler (1993): fastest on a slight downhill, ~⅓ speed at 30° |
| **Climbing takes time** | On crags and cliffs a body enters a **climbing state** with vertical speed `v_up = 0.4 m/s × climb skill × strength`. A 20 m cliff takes ~50 s (~80 ticks) for a good climber and never happens for a non-climber. While climbing, the body can't eat or flee and is visible to hunters. Coming down is faster, with a fall risk ∝ (1 − climb) | mountain goats ~0.3–0.5 m/s vertical |
| **Swimming is slower, and skill and strength matter** | In swim-deep water, `speed = walk × (0.2 + 0.5 × swim) × strength^0.5`. The current pushes downstream (`sweep` exists) and a weak swimmer drifts. Upkeep stays | deer swim ~1 m/s, slower than they walk |
| **Wading** | unchanged (slows ×0.3–1 with depth) | |

**What it does:**
- the heights become costly to reach, so highland bands stay up there (isolation by height);
- the river becomes a real crossing that takes time, so swimmers gain in reach and in safety from hunters;
- size gains value, through strength for climbing and swimming. That works with section 4.

## 4. Diets that diversify (priority 3)

**Today:**
- grass is **89% of all income**;
- guts are bunched at **0.04** (p10–p90 0–0.12);
- grass keeps full value up to gut 0.15 (`gutPlateau`) and then falls away; meat needs a high gut;
- a middle gut gets little of either. That's **the gut valley, the wall**;
- trees and insects exist but give under 1%;
- a stomach model exists (`P.stomach`, off since the s789 test, when the world had no foods that differ).

**The natural model, the Jarman–Bell principle:** a body's gut capacity grows with its mass (∝ M¹), while its energy needs grow more slowly (∝ M^0.75). So **big bodies can live on poor, slow food like grass by holding it longer (ruminants)**, while small bodies must eat rich, quick food: fruit, seeds, insects, meat. This one rule gives each body size its own diet, without hand-made walls.

| Piece | Proposal |
|---|---|
| **a. Digestion takes time (roadmap steps 5–6, merged)** | Each food has a **digestion time**: grass long, browse medium, fruit, insects and meat short. Energy comes out as the stomach processes, not at the bite. **Stomach capacity ∝ body mass**, so a small body fills up on grass and starves slowly, and a big one does fine |
| **b. Grass poorer per unit, honestly** | Lower grass energy per unit (e.g. ×0.7), but with (a) a big body still gets enough. Done gradually over ~10 seasons, as the earlier leaner-grass steps were |
| **c. Remove the walls: smooth the gut valley** | Replace the plateau and valley with **overlapping fit curves**: each food has an ideal gut and a broad tolerance (grass 0.0–0.4, browse 0.1–0.5, insects 0.2–0.6, carrion 0.4–0.9, flesh 0.5–1.0). Every step toward meat pays a little, with no dead zone |
| d. Trees and insects as real food | Already built. They grow with time; shrubland (on the backlog) would add browse |

**Expected effect:** bodies split by size and diet. Big grazers (ruminants) hold the grass, and smaller bodies turn to browse, fruit, insects and carrion. That's the diet diversity Luis is after, and those differences *are* body differences, so the new species rule can pass them.

**Risk:** a lean-food shock. Every past leaner-grass step caused a hunger crash before the world adapted. Mitigation: phase it in over seasons and test headless for 10+ seasons first. No rescues, as always.

## 5. How much each change matters (assessment)

| Change | Diversity gain | Realism | Cost (ms/tick) | Risk | Order |
|---|---|---|---|---|---|
| Home ranges | **high** (isolation is the missing ingredient) | high | ~0.2 | medium (bunching) | **1** |
| Strength (derived) | enabler | high | ~0 | low | 2 |
| Slope speed (Tobler) | low–medium | high | ~0 | low | 2 |
| Climbing takes time | medium (highland isolation) | high | ~0.1 | medium (stuck bodies) | 2 |
| Swimming speed by skill | medium (river bands) | high | ~0 | low | 2 |
| Digestion time + stomach ∝ mass | **high** (size-diet split) | high | ~0.3 | **high** (hunger) | 3 |
| Leaner grass | medium (only with digestion) | medium | 0 | high | 3 |
| Smooth gut valley | high (opens the path to meat) | medium | 0 | medium (predation returns) | 3 |
| Body footprint ↔ drawing (viewer Q3a) | none (looks) | medium | 0 | low | any |

**Traits that will matter most:** body size (through strength and the stomach), climb and swim (now real costs and gains), gut (once the valley is smooth), legs (slopes). Fat stays the hunger buffer.

## 6. Decisions for Luis

1. **The scale references:** 1 unit = 0.65 m, a cell 5.2 m, height 1.0 = 100 m, a deer-sized body, a 7 m crown and 15 m trees, and a movement tick of ~0.65 s with life in time-lapse. *Recommended: yes.*
2. **Movement:** A, home ranges (recommended), or B, C or D?
3. **Home range size:** R ∝ body mass, ~60–120 m for today's bodies, with one dispersal for the young? *Recommended: yes.*
4. **Physics:** strength derived from size and energy, Tobler slopes, a climbing state with vertical speed, swimming speed by skill and strength? *Recommended: all, under one key.*
5. **Climbing while vulnerable:** can climbers be caught (no fleeing while climbing)? *Recommended: yes.*
6. **Digestion:** digestion time per food plus stomach capacity ∝ mass (energy roadmap steps 5–6 brought forward)? *Recommended: yes.*
7. **Grass:** leaner by ~30%, over 10 seasons, only together with 6? *Recommended: yes, with 6.*
8. **The gut valley:** replace it with overlapping fit curves? *Recommended: yes, as the last piece.* It reopens the road to meat, so the predator's cost (already planned) follows it.
9. **The body footprint** (viewer Q3a): the world's body footprint shrinks toward the drawn size (spacing, mating and pile distances) or stays? *Recommended: shrink it with home ranges.*

## 7. Roadmap (once decided; the steward updates the backlog)

Each step is built by Codex from the steward's spec, tested headless for ~8 seasons on a copy, and goes live at the start of a 15-minute window, with the next window for monitoring. Then ≥ 10 seasons of watching before the next big step.

| Step | Contents | Watch |
|---|---|---|
| **M1** | Home ranges, plus the body footprint (decisions 2, 3, 9) | crossings, local bands, splits attempted and passed |
| **M2** | Physics: strength, Tobler slopes, climbing state, swimming speed (decisions 4, 5) | highland and river bands, falls, time spent climbing |
| **M3** | Digestion time and stomach ∝ mass (decision 6), then leaner grass (decision 7) | size spread, diet shares, starvation |
| **M4** | Smooth the gut valley (decision 8), then **the predator's cost** (Luis's earlier order) | guts, omnivores, predation |
| Then | the step 4 proposal (bodies hold what they cost), shrubland (bottom; its trigger, thicket < 40, is close: 44) | |

## 8. Luis's decisions (s2012)

| # | Decision |
|---|---|
| 1 | **Yes:** the metre scale |
| 2 | **A: home ranges** |
| 3 | **Yes:** range ∝ body mass, one dispersal for the young |
| 4 | **All of it, under one key** |
| 5 | **Yes, with a condition:** a climbing body can be caught only by a hunter that **climbs at least as well** as it does |
| 6 | **Yes:** digestion time per food, stomach capacity ∝ mass |
| 7 | **Yes (s2013), and sooner:** "current species seems very resilient". Grass only (not fruit, nuts, water plants or lichen), 30% leaner over **6 seasons**, with a **stop trigger** (the ramp freezes below 160 bodies, or if starvation is over 60% of a season's deaths). Built by the steward right after M1's build, and released before M1 |
| 8 | **Yes:** smooth the gut valley, with the predator's cost following |
| 9 | **Yes:** shrink the world's body footprint toward the drawn size, with M1 |

**Build order:** M1 (home ranges + footprint) → M2 (physics, with Luis's climbing-catch condition) → M3 (digestion; leaner grass if decision 7 is yes) → M4 (gut valley) → the predator's cost.

## 9. Correction after building M1 (steward, s2018)
- **The world already has home ranges.** An older rule (`homeRange` 120, `oldHomePull`) pulls bodies back toward their birthplace. In the headless run, bodies stayed a mean of ~110 units (~70 m) from home under the old rules. The new pull mostly duplicated it: crossings 1,334 → 1,420, starved 99 → 125, splits 0 / 0.
- **Section 1's "~35 crossings of the map per life" measured path length, not displacement.** Bodies walk far, but within their range.
- **Why regions don't diverge:** selection is nearly the same everywhere. The between/within variance ratio for swim and climb across sections is ~0.03 (old) and ~0.005 (new). Mixing isn't the cause.
- **Steward's recommendation:**
  - hold M1's home-range part;
  - release only the smaller body footprint (decision 9) under its own key;
  - go to **M2 (physics), which makes selection depend on place** (the heights reward climbers, the river rewards swimmers);
  - the grass ramp (decision 7) also proceeds.
