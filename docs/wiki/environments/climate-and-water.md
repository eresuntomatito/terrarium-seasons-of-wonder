# Climate is more than a weather label

Written by Codex on eresuntomatito's behalf. Checked at public source `f619e4e5460cc1f6968e924b696b78471577fdc5`; later live working changes are not covered.

The viewer's rain, drought, warm-era, and wet-era labels describe different parts of the model. A dry spell can coexist with green ground or stored water. Neither a label nor a photograph directly measures a creature's energy costs or an ecosystem's productivity.

## Temperature belongs to a place and time

Without the climate rollout, `tempAt` returns 0.5. With it, temperature includes changing era offsets and initially a north–south gradient. As relief rises, a coordinate-aware query blends toward temperature determined by elevation and the era offset. A query without the horizontal coordinate follows a fallback path, so analysis must use the same query context as the mechanism being interpreted.

These are bounded simulation values, not degrees Celsius. Calling 0.2 “freezing” states the model threshold, not a calibrated physical temperature.

## Coat, fat, size, and water thrift

For ordinary bodies under climate rules, `climateCost` combines cold, heat, dryness, and coat upkeep. Its insulation expression is `0.7 × coat + 0.3 × min(1, fat load)`. Insulation reduces the cold term but increases the heat term. Body size modifies those terms in different directions. Thus a thicker coat is not universally beneficial, and acquired fat is not merely stored food.

Below moisture 0.3, a dryness penalty is reduced by the inherited creature field `water`. This field is a thrift setting; it is **not** stored drinking water, water depth, or swimming skill. Climate-dependent maturity can also be delayed by water thrift. Separate [reproduction](../traits/reproduction.md), [movement](../traits/movement-and-sight.md), and energetic costs before evaluating a net benefit.

Unique species bypass this ordinary climate-cost function. That exception does not imply all environmental effects are disabled for them.

## Moving water changes the possibilities

Water is routed between neighbouring ground cells using surface height and directional tilt. Rain, snow/melting, evaporation, erosion, and the active terrain affect the result. Flow can carve ground, wear reef, and wet nearby banks; deep water can also inhibit grass. This is a discrete update scheme, not a calibrated fluid-dynamics simulation.

`waterAt` returns zero liquid depth for dry cells and for water below the freezing threshold, marking the latter as ice. This changes the liquid-water movement need without proving that a particular region actually freezes. The season-1396 report explicitly noted that its lowland climate was not cold enough for the proposed ice passage; a possible mechanism is not an observed event.

The `waterfood` rollout makes aquatic plants available under its own access rules; `highfood` adds lichen on high ground, with feeding benefits linked partly to coat. These sources of food do not appear in every fresh world simply because their code exists.

## Useful observations

To ask whether a climate event affected a species, record the active rollouts, actual local temperature/moisture/water, body settings, food access, and survival or reproduction over an interval. Compare like periods and note interventions. Co-occurring rain, a rising trait mean, and a population increase do not alone isolate a climatic cause.

Sources: [world implementation](../../../sim/world.mjs), `tempEra`, `tempAt`, `climateCost`, `waterAt`, water updates, and `eat`; [season-1396 report](../../../reports/status/2026-10-17_s1396.md). Continue with [the four lands](four-lands.md), [mineral supply and reef](minerals-and-reef.md), and [evidence standards](../evidence.md).
