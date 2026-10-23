# Roadmap: closing the energy loop (season 1588, Oct 17)

**Asked by Luis (s1588):** a roadmap to implement recommendations 1–4 of the [energy report](2026-10-17_s1581-energy-flows.md), gradually, using Sonnet subagents where that saves usage, with a proposed pace. Then: *which foods exist, how much energy each gives per unit, and what a body needs to reach it* (section 3).

## 1. The steps

Each step follows the same cycle:
1. **Build:** a Sonnet subagent implements the change behind a rollout switch and tests it headless (old vs new, on a copy of the live world).
2. **Review:** the steward reviews the code and the numbers and reruns the energy ledger.
3. **Live:** the steward sets the switch in the live save.
4. **Watch:** at least 10 seasons before the next step, with the ledger rerun at the end.

| Step | What changes | Why | Size | Risk | Who builds |
|---|---|---|---|---|---|
| **1. Honest dung** *(being built now)* | Dung lies on the ground (a store per cell) and carries the energy grazers didn't digest. Decomposers eat it until it's gone, and uneaten dung breaks down into soil. The old free gift **fades out over ~5 seasons**. | The free gift is 65% of all animal income. | medium | **high**: two-thirds of income is replaced by a real source of about a third. Watch the dung lines. | Sonnet (running) |
| **1b. Carrion can't yield more than a carcass holds** | Cap what a carcass gives at what it holds: today a decomposer gut with the carcass bonus can draw up to **1.8×** the carcass's energy. | A second, smaller leak (about 40 a season today), found while building the food table. | tiny | low | the steward, folded into step 2 |
| **2. Kill leftovers stay on the carcass** | Whatever no diner keeps from a kill (77% today) is left on the carcass, not lost. | Scavengers and decomposers get the hunter's leftovers, and carrion stops being a trickle. | small | low | Sonnet |
| **3. Decomposers on carcasses** | Decomposer ability gives access to carcasses, not only the carrion-gut bonus, and rot slows while decomposers are feeding. | Energy cycles through bodies before reaching the soil. | small–medium | low–medium: the dung lines gain a second food | Sonnet |
| **4. Bodies hold what they cost** | Building tissue costs energy (at birth from the parents' gift, and while growing), and the tissue returns it at death as meat or carcass. | Prey become real meals in proportion to size, so hunting can pay. | **large** | **high**: it changes births, growth and every food chain | **design first:** a one-page proposal for Luis (what tissue costs, how much returns, what young cost), then Sonnet builds |
| **5. A stomach, conserved** | The existing stomach model (bulk per food, capacity by body mass) switched on, with energy arriving as the stomach empties. | Big bodies take big meals; bulky food fills before it pays. | medium | low–medium | Sonnet |
| **6. Digestion time by food** | Plants empty slowly, flesh and carrion quickly. A kill's handling time becomes part of digestion. | Meat-eaters gain time: a real advantage without inflating energy. | small | low | Sonnet |
| **7. Dung reflects digestion** | What the stomach doesn't absorb leaves as dung, from every food, carrying the energy the gut didn't extract (built on step 1's dung store). **Note (s1604, from step 1's test):** grazers digest grass at 100% up to gut 0.15 today, so honest dung alone leaves decomposers little (~9% of income). Step 7 should give every gut a realistic assimilation, roughly half for grass, with plant value rebalanced so grazers aren't starved by it. | Decomposers live on what was actually wasted; dung quality follows the eaters. | small–medium | low–medium | Sonnet |
| *8. (optional) The mouth apart from the gut* | Bite size from body mass and food, not from (1 − gut). | A meat-leaning gut isn't punished twice at grass. | small | changes the gut valley; judge last | Sonnet |

**Order (agreed by Luis, s1597):** 1 → 1b + 2 (together; both are small and both concern carcasses) → 3 → proposal for 4 → 4 → 5 → 6 → 7 → (8). Each later step is only worth judging once the earlier ones have settled. Steps 2 and 3 put energy into the detritus chain that step 1 makes honest. Step 4 changes what everything is worth, so it comes last.

## 2. Pace (proposed)

| When | What | Usage |
|---|---|---|
| **Now → next check-ins** | Step 1: subagent finishes; steward reviews and goes live (5-season fade); watch ~10 seasons (~40 min at 24 ticks/s); ledger | one Sonnet run + one short review |
| **Next usage window** | Steps 1b + 2: one subagent builds and tests both; live; watch 10 seasons; ledger | one Sonnet run |
| **The window after** | Step 3, same cycle | one Sonnet run |
| **Then** | Step 4 proposal (the steward, short), Luis decides; Sonnet builds; longer test (2 × 30,000 ticks); live with a gradual rollout; watch 20 seasons | one proposal + one longer Sonnet run |
| **After that** | Steps 5, 6, 7 (and 8 if wanted), one per usage window, same cycle | one Sonnet run each |

**About one step per usage window.** All of it fits in a day or two of world time without crowding any window.

**Ways to save usage while this runs:**
- Sonnet does the building and testing; the steward (Opus) only reviews, goes live and interprets the ledger.
- **Check-ins could drop from every 30 minutes to every hour** while the world is just being watched. A season is about 3.7 minutes now, so an hourly check still sees ~16 seasons. *Luis's call; recommended.*
- Status reports stay on the 30-season rule; the ledger runs once per step, not at every check.

## 3. The foods: what each gives, and how a body takes it in

*(Revised s1589 at Luis's request: the table now follows the whole digestive path — mouth, bite, stomach, digestion time, dung.)*

*"Per unit"* means one unit of the food as it lies in the world (a full grass cell is 1). Energy is in the body's own units: a body of about size 6 holds roughly 2 of working energy, plus its fat. The "gut" is one inherited number from 0 (a plant gut) to 1 (a meat gut). Today it decides both what a mouth can do and how well food is digested.

### 3a. Today, food by food

| Food | Energy per unit | Mouth / jaws | Bite (per tick) | Stomach: capacity and fit to the gut | Digestion time | Dung left | Shut off by |
|---|---|---|---|---|---|---|---|
| **Grass** | **0.19** at best (0.55 × lean grass 35%), × quality 0.6–1.3 (dry → wet), × strain (−30% hardy, +40% sweet) | any gut below 0.75 can graze | 0.08 × √mass × (1 − gut); 0.15 of each cell stays as roots | **no capacity limit**; fit: full value up to gut 0.15, then falling ((1 − gut)/0.85)²; −30% × dung ability, −50% × browse | **none**: energy arrives at the bite | **40% of the raw bite** as a load, dropped at 1% a tick as soil fertility. It doesn't depend on how well the gut used the bite | dense thicket (> 0.5) |
| **Water plants** | **0.19** × the grass fit | as grass | 0.06 × √mass × access (waders 0.4–1, swimmers 2 × swim) | none; the grass fit | none | **none** | deep water without swimming; ice |
| **Lichen** | **0.08–0.23** (more with a thick coat) | as grass | 0.03 × √mass × (1 − gut) | none; the grass fit | none | **none** | the lowlands; frost doesn't stop it |
| **Thicket shoots** | **4 × (1 − gut) × browse** × 0.8–1.4 (best dry) × up to 1.8 in the cold | a browsing mouth: browse trait > 0.1 **and** body ≥ size 4 | 0.04 × √mass × browse; the hedge keeps 0.45 | none; fit (1 − gut) × browse | none | **none** | small bodies; a meat gut |
| **Dung** | today a gift of 0.036 × ability per pass (no source); honest dung (step 1) ~0.3 per unit of what lies on the ground | decomposer ability (any above a trace) | a pass every 10 ticks | none; fit = the ability | none | — | — (step 1 changes it) |
| **Carrion** | 0.7 × (1 − \|gut − 0.3\| / 0.55) × (1 + dung ability) × 1.3: **up to 1.8× what the carcass holds** (a leak, step 1b) | any gut above 0.1 can tear at a carcass it touches | 0.15 × √mass, one carcass at a time | none; fit best at gut 0.3 | none | **none** | heat rots carcasses (the cold keeps them) |
| **Flesh** | a half-way gut keeps **~0.1–0.25** of what the prey held (gut^0.5 × 35%, rising to 90% for a meat gut); the killer takes half first × jaw fit, and the rest is shared by everyone jawed within 40 px | **jaws** (gut > 0.15); size ≥ 1.2 × prey × (1 + 0.6 × shell × crack); **gape** must match the prey's size (fit floor 0.35) | the whole kill at once | none; fit gut^0.5 × keep | **handling 240 ticks × √(prey ÷ own mass)**: no new kill meanwhile, though it may still graze | **none** | shells (0.95 today ⇒ ~1.9× the prey's size alone), toxin, hiding, speed, herds |
| **A host** (parasites) | half of 0.04 × ability, taken from the host | parasitism ability; touching an infested host of another kind | 0.04 × ability per touch | none | none | none | healthy hosts |
| **Own fat** | stored at 85%, burned when hungry; rich food fattens more (meat 1.3×, carrion 1.1×, shoots 1×, grass 0.7× the fat share) | — | — | a fat cap of 0.8 × mass × thrift | — | — | fat slows a body and costs upkeep |

**What a prey holds:** working energy up to its cap (2–4), fat (up to 0.8 × mass × thrift) and tissue, which is almost nothing today (step 4). The average kill this season held **1.3**.

### 3b. How digestion works today, and where it doesn't hang together

- **A mouth with no stomach behind it.** Energy arrives the moment food is bitten. The only limits are the bite per tick and the fuel cap (any surplus goes to fat). A stomach model exists in the code (bulk by food, capacity, emptying), but it's switched off (`stomach 0`). Tested at s789, it made no difference in that world.
- **One number does three jobs.** The gut sets the mouth (grazing bite × (1 − gut), jaws above 0.15), the extraction (how much of each food is kept), and nothing else. Only the gape is a separate mouth trait, and it applies only to prey.
- **Digestion takes no time,** except after a kill (handling). So a slow, bulky food like grass costs nothing in time, and a dense food like meat gains nothing from being quick.
- **Dung is a fixed slice of the grass bite.** It doesn't reflect digestion: a grass-adapted gut and a meat gut leave the same dung from the same bite, though the meat gut digested far less of it. Water plants, lichen, shoots, carrion and flesh leave no dung at all.
- **Extraction losses simply vanish.** What a gut fails to extract from grass (about 700 a season) leaves only as fertility, and a kill's unkept share is lost.

### 3c. A more coherent digestion (using what the world already has)

| Stage | More coherent version | What it would change |
|---|---|---|
| **Mouth** | Keep the gut for extraction and the gape for prey, and let bite size follow body mass and the food (grass, shoots, flesh), not the gut. A meat gut stops shrinking the grass bite, so only extraction punishes it. | separates *can it bite* from *can it digest* |
| **Stomach** | Turn the existing stomach model on, conserved: food enters the stomach by its **raw bulk** (grass bulky, shoots bulkier, carrion and flesh dense: the existing `stomachBulk`). Capacity grows with body mass, and a full stomach can't take more. | big bodies can eat big meals; bulky food fills the stomach before its energy arrives |
| **Digestion time** | The stomach empties at a rate that depends on the food: **plants slowly** (fibre), **flesh and carrion quickly**. Energy arrives as it empties, at the gut's fit for that food. | meat-eaters gain time (they eat less often and spend less time feeding), a real advantage for carnivory without inflating energy |
| **Dung** | What leaves the stomach undigested **is** the dung: its amount is the bulk not absorbed, and its energy is what the gut failed to extract. All foods leave dung (meat leaves little but rich in nutrients). | dung quality follows the eater: grazers with poor guts leave rich dung, specialists leave poor dung; decomposers follow the right herds |
| **Fat** | as today (rich food fattens more; conserved, since only the share going to fat changes) | — |

## 4. Recommendations: adjust and complement the roadmap

*Steps 1 (honest dung, being built by the Sonnet subagent) and 1b–4 stay as they are. These are additions, placed after them, so nothing changes under work in progress.*

1. **Step 5: a stomach, conserved.** Revive the existing stomach model (bulk per food, capacity by body mass, emptying), but make energy arrive as the stomach empties instead of at the bite. Test it as at s789, but now in a world where meat and carrion matter (after steps 2–4); at s789 it made no difference because they didn't. *Sonnet; medium; low–medium risk.*
2. **Step 6: digestion time by food.** Emptying rates: plants slow, shoots slower, flesh and carrion fast. A kill's handling time becomes part of digestion (one rule instead of two). *Sonnet; small, once step 5 is in.*
3. **Step 7: dung that reflects digestion** (it extends step 1 once that has settled). What the stomach doesn't absorb leaves as dung, with its bulk and its leftover energy, from every food. Decomposers then live on *what was actually wasted*, and dung quality follows the eaters. *Sonnet; small–medium; built on step 1's dung store.*
4. **Step 8 (optional): the mouth apart from the gut.** Bite size from body mass and food, not from (1 − gut), so a meat-leaning gut isn't doubly punished at grass. Small, but it changes the gut valley, so it's best judged after the others.
5. **Measurement throughout.** Extend `tools/energy-ledger.mjs` with a **digestion-loss line per food** (eaten raw vs absorbed vs left as dung). Every step can then be judged on the same map. *Small; the steward.*

**Order after the current roadmap:** 1 → 1b + 2 → 3 → 4 → **5 → 6 → 7** → (8). Same pace: one step per usage window, Sonnet builds, watch at least 10 seasons in between.

**Why this order:** steps 1–4 make the energy *honest* (no free sources, nothing vanishing, prey worth eating). Steps 5–7 make the *intake* realistic (time, capacity, waste), which is what gives each role its own trade-off: grazers with bulk and time, hunters with risk and speed, decomposers with what the others leave. Only then is it worth asking which traits and costs let each role emerge.
