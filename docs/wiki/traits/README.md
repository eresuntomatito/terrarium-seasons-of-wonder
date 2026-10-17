# What a creature carries

Written by Codex on eresuntomatito's behalf. Source inventory checked against public revision `f619e4e5460cc1f6968e924b696b78471577fdc5`, not the steward's unfinished working changes.

A creature is not just its species description. Its inherited settings, the body produced at birth, its current supplies, its age, and its behaviour all matter. This inventory is a navigation aid, not a claim that every field has a measured evolutionary effect.

## Inherited body settings

| Fields | What they represent in this implementation |
| --- | --- |
| `sizeGene`, `bornGut`, `gapeGene` | Heritable size, [digestive tendency](digestion.md), and mouth setting. Birth variation produces a body that can differ from these values; digestion also has an explicit partial acquired-shift inheritance path. |
| `legs`, `wind` | Movement setting and sprint endurance. |
| `plastic` | Propensity for the implemented hunger-related digestive conversion. |
| `thrift` | Fat-storage strategy; distinct from the fat currently carried. |
| `armor`, `toxin` | Defence capacities; ordinary bodies also need dietary supplies to express them. See [armour](armour.md). |
| `resist` | Toxin resistance; the unique giant's feeding rules can also increase it during life. |
| `litter`, `mature` | Reproductive allocation and maturation setting. Actual litter size also depends on the energy gift. |
| `browse`, `decomp`, `parasitism` | Settings for using shoots, carrion, and parasitic feeding. Eligibility and benefits depend on the relevant feeding implementation. |
| `eyes` | Sight setting, combined with species perception, body size, age, and vegetation. |
| `coat`, `water` | Climate-related settings; `water` here is a creature's thrift setting, not a water-depth measurement. |
| `swim`, `climb` | Movement skills whose effects depend on active terrain and water rules. |
| `hueShift` | Inherited colour variation, not by itself a measure of food eaten. |

`World.inherit` chooses each listed ordinary-body setting from one parent or the other and applies its drift function. Size and gut transmission are handled along the breeding path; `child` records the heritable values separately from birth variation. A species' registry averages are not a complete description of each individual.

## Other heritable variation

Individuals also carry four personal `genes`, numerical behaviour parameters `k`, and a behaviour form (`morph`). `genomeOf` extracts eligible numeric literals from behaviour code into the parameter template; it does not turn every part of the JavaScript program into a numerical gene. Behaviour-code slips are a separate kind of variation. These mechanisms deserve their own explanation rather than being collapsed into body-trait mutation.

## Acquired or changing state

| State | Why it is not simply an inherited trait |
| --- | --- |
| Energy, fat, stamina | Change with feeding, movement, storage, and expenditure. `thrift` is not fat; `wind` is not remaining stamina. |
| `minStock`, `toxStock` | Supplies change with access to food and decay. Ordinary offspring start with 60% of the parental mean stock: a parental carryover, not a mutation of the defence capacity. |
| Age, growth, location | Change during life; location also changes what can be reached or eaten. |
| Hunger, digestive `shift`, current `gut` | A living body's digestion can differ from the birth setting used for inheritance. |
| Memory and taste aversion | Individual experience, not a species-wide decision. The egg-laying giant has a special inherited-map mechanism; do not generalize it to ordinary creatures. |

Some properties cross categories: `resist` has both inheritance and an acquired-tolerance path for giant feeding; parental supply carryover is neither purely independent inheritance nor independent environment.

## Derived properties

`bodySize`, effective `armorOf` and `toxinOf`, sight, movement limits, energy capacity, maturity eligibility, and predation eligibility combine settings with current state and context. A published mean of one field does not necessarily measure one of these derived outcomes. Species diet roles likewise describe observed feeding rather than assigning an immutable food-chain class.

## Evidence and limits

This is a source inventory, not a completed reference or an experimental ranking of useful traits. Later rollouts are not automatically enabled in a [fresh world](../../RUNNING.md), and unique species have exceptions. Individual pages should identify applicable rollouts, costs, benefits, measurements, and missing evidence. See [reading the evidence](../evidence.md).

Sources: [world implementation](../../../sim/world.mjs), especially `spawn`, `inherit`, `child`, `breed`, `geneOf`, `armorOf`, `toxinOf`, and `traits`; [behaviour compiler](../../../sim/species.mjs), especially `genomeOf`. These links follow the checkout; the revision above fixes this inventory's boundary.
