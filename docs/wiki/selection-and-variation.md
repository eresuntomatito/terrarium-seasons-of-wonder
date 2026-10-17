# Variation is offered; outcomes are not promised

Written by Codex on eresuntomatito's behalf. Model mechanisms checked at public revision `f619e4e5460cc1f6968e924b696b78471577fdc5`. This page compares concepts with an artificial world; it does not claim that the world reproduces biological evolution in full.

## The central distinction

Differences between organisms and differences in reproductive contribution are not the same thing. Selection concerns their association; transmission determines what reaches descendants. Mathematical treatments distinguish these components rather than treating any changed population mean as selection. See Steven A. Frank's theoretical treatment, [*Natural selection. IV. The Price equation*](https://arxiv.org/abs/1204.1515). This wiki does not calculate a Price-equation decomposition for the terrarium.

## What supplies variation here

| Mechanism | What changes | Why the distinction matters |
| --- | --- | --- |
| Body-trait inheritance and drift | Numerical settings passed through breeding | Descendants vary without a new named species being required. |
| Birth variation | The expressed size, gut, or gape of a newborn | The extra random deviation is not itself copied as the heritable setting. |
| Behaviour-parameter drift | Individual constants used by a behaviour template | One source program can support individually different decisions. |
| Behaviour-code slips | The program form carried by a group of offspring | Structural behaviour variation is distinct from tuning a constant. |
| Individual experience and parental carryover | Supplies, digestive shift, giant memory, or tolerance, according to specific rules | This model includes explicit acquired-effect pathways; do not assume a universal genes-versus-environment boundary. |
| Model-generated introductions | Candidate behaviour and species proposals from the integration | This is an additional source of novelty, not the same operation as ordinary birth mutation. |
| Steward intervention | Rules, parameters, terrain, releases, or implementation | A deliberately changed law of the world is not an adaptation evolved by its creatures. |

The [trait inventory](traits/README.md) and [digestion account](traits/digestion.md) identify concrete examples. Random numerical drift is the code's name for an inheritance operation; it should not automatically be equated with the population-genetic term *genetic drift*.

## What could favor one variant

In this implementation, body and behaviour differences can affect food access, energy use, predation eligibility, mating opportunities, and offspring production. Their effects are conditional: armour can help against an attacker but require supply and upkeep; swimming can alter access only where the active rules make water relevant. A benefit in one encounter is not a measurement of total reproductive success.

To make a defensible selection claim, specify the population, interval, inherited characteristic, survival or reproduction measure, and active rules. Compare appropriate starting cohorts or exposure, not just the traits of whichever creatures happen to be alive later. Ask whether the apparent change instead involves founders, movement, splitting, rule changes, or chance.

## The ledger is evidence, not an automatic verdict

`World.record` accumulates trait sums for deaths by cause and for parent records. `child` records the mind-giving parent once per child, representing the pair; it does not supply a complete equal record for both parents. Giant deaths are excluded from this ordinary ledger. Several traits are not tracked, and a cumulative mean can mix periods with different rules.

Parent and death summaries are useful clues. They are not automatically individual lifetime fitness, a matched control, or a causal estimate of selection on one trait. A planned comparison must state its denominator, time window, missing traits, and intervention history. No causal ranking of all traits is established by this page.

## History matters, but this is not a bacterial experiment

Blount, Borland, and Lenski tested historical contingency by replaying evolution from stored bacterial samples at different points in a lineage's history; their citrate-use results depended on prior history. That is an example of an experimental method, not evidence about this terrarium. [Original 2008 study](https://pmc.ncbi.nlm.nih.gov/articles/PMC2430337/).

**Codex's proposed analogue:** compare isolated copies from a reviewed saved moment under explicitly stated rules and multiple runs. This could investigate a narrow model question; it would not reproduce the bacterial experiment, establish a biological law, or justify experiments on the continuing world without authorization.

Sources for model claims: [world implementation](../../sim/world.mjs), `inherit`, `child`, `breed`, `record`, `die`, and `slipMind`; [behaviour compiler](../../sim/species.mjs), `genomeOf` and `slip`. Continue with [evidence standards](evidence.md).
