# Landforms, rock, and moving material

Written by Codex on eresuntomatito's behalf. Model boundary: public `370995aba5d21eb56b8544a5989056da59a1edd2`. Engagement evidence comes from the [active steward's account](../../STEWARD-CONCEPTS.md), [geology proposal](../../../reports/status/2026-10-17_s1542-geology-proposal.md), and dated reports—not an assumption that every physical analogy was a conversation.

## The questions that brought these ideas here

The steward records Luis preferring congruent physical processes over preserving an original landscape design. Later, Luis asked whether water was changing elevation, requested deposition, chose three rocks and tilted/folded layers, and questioned river carving below the original reference level. Those questions connect landform, water, material, and living bodies rather than treating terrain as scenery.

## The real-world concepts and their limits here

Water can carry eroded material and deposit it when transport conditions change; the USGS explanation distinguishes suspended sediment, settling, and renewed transport. This gives a useful conceptual contrast between a river merely removing ground and one moving it elsewhere. [USGS: sediment and suspended sediment](https://www.usgs.gov/water-science-school/science/sediment-and-suspended-sediment).

Rock layers also preserve physical structure and history; the USGS explanation discusses how strata and their tilting help geologists interpret a landscape. The terrarium's patterned layers are an analogy, **not** a reconstructed geological chronology or a model of a particular real landscape. [USGS: layers and stratigraphy](https://www.usgs.gov/educational-resources/find-feature-layers).

Within this project, separate the **shape of the land**—relief, peak, plateau, ridge, channels—from **what is exposed there**—rock category, sediment, and recent alluvium. Both can affect a route or a food patch, but they are different state descriptions.

## What the published source actually does

| Conceptual link | Implemented analogue | Important simplification |
| --- | --- | --- |
| Differential erosion | `rockErode` gives five categories different carving multipliers: hard, soft, soluble, deposited sediment, basement. | No detailed mineral chemistry, grain-size distribution, or calibrated erosion rates. |
| Tilted and folded layers | `rockAt` selects a procedural band from height plus fixed tilt/fold offsets; fill above the old ground is sediment. | This assigns exposed categories; it does not simulate the geological events that originally laid down and deformed real strata. |
| Sediment transport | Under `deposition`, `sed` holds a load, carving adds to it, and a share travels with water. Capacity depends on flow/drop; excess can settle. | Discrete cells, update order, thresholds, and fill/carving bounds matter. A general conservation claim needs accounting across those limits, not just the presence of a load array. |
| Deposition changes relief | Deposited load reduces `carve`; negative values mean fill above the old surface. | The sign convention is bookkeeping, not negative physical erosion everywhere. |
| Recent alluvium changes habitat | `alluv` rises with deposits and fades, modifying moisture and plant growth. | A designed resource link, not a prediction of real soil fertility. |
| Rock supports a body | `rockMineral` contributes to the supply signal for mineral stock after a positive grass bite. | The stock gain is not subtracted from a conserved rock-mineral budget. |

The `geology` rollout raises the old carving cap and introduces a hard basement below the chosen reference. A hard category erodes slowly rather than magically proving an absolute, impermeable floor under every combination of rules. The coordinate/elevation zero is the old lowland reference, not an actual sea: there is no sea in this implementation.

## Built, proposed, and observed are separate

The proposal originally says its geology additions are not built; the later steward handoff establishes that rock/layer and soil/mineral pieces were implemented. The proposed general slope-failure and slow-uplift pieces were **not** implemented at this boundary. Existing quake effects do not establish that every proposed slope process exists.

The proposal's images and test summaries are dated evidence about particular conditions. They do not show that every river must form a waterfall, every soluble-rock region must produce a shelled lineage, or that all barriers eventually disappear. To connect geology to a species, examine actual location, food access, mineral stock, effective armour, movement, and descendants over a defined interval.

## Why this is part of the world's story

Luis's choice was not simply a requested final mountain shape. It allowed water, differing materials, and subsequent body–place interactions to change the scene, while retaining explicit designed rules. That is Codex's synthesis of the cited account, not a claim that the terrarium obeys all real physics.

Source: [world implementation](../../../sim/world.mjs), `rockOf`, `rockAt`, `updatePlants`, water/deposition updates, `eat`, and `tempFrame`. Continue with [four-land crossings](../environments/four-lands.md), [minerals and armour](../environments/minerals-and-reef.md), and [the concepts entrance](README.md).
