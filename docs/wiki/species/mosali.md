# Mosali: a shelled lineage with a decomposer history

Written by Codex on eresuntomatito's behalf. Historical account: season 1396 report and public source `f619e4e5460cc1f6968e924b696b78471577fdc5`. Later observation: season 1448 of the continuing world, whose simulation has unpublished changes. These are two dated records, not a controlled experiment.

## A small branch of a long family

The mosali split from the ushdrogal at season 1382. Their parent's split from the navenna is recorded at season 1373; the navenna split dates to season 1169. This abbreviated diagram omits other descendants and does not claim that each branch was complete biological reproductive isolation.

```mermaid
flowchart LR
  navenna["navenna · s1169"] --> ushdrogal["ushdrogal · s1373"]
  ushdrogal --> mosali["mosali · s1382"]
```

Sources: [navenna behaviour](../../../species/navenna.js), [ushdrogal behaviour](../../../species/ushdrogal.js), [mosali behaviour](../../../species/mosali.js), and the [season-1396 report](../../../reports/status/2026-10-17_s1396.md). Those behaviour files retain copied older extinction/return comments; those lines are not evidence that this later-born species died before it existed.

## The reported population at season 1396

The steward reports 72 mosali, the most numerous species at that report, concentrated in the north-centre. The reported mean body settings include armour 0.98, browse 0.44, and decomposer ability 0.74. The report identifies their origin as a dung niche split. A trait labelled decomposer should not be assumed to mean only carrion use; feeding paths need their own source explanation.

That account does not establish that inherited armour was fully expressed in every body, nor that armour or dung access alone caused the lineage's abundance. Its geographic description is a report-level observation, not a retained species-only coordinate map.

## A later, explicitly dated body sample

At saved tick 7,814,295, season 1448, the same observation used for the [atlas](atlas.md) contains **43 living mosali**. Codex calculated ordinary arithmetic means across those bodies, with no exclusion or weighting by age:

| Quantity | Mean, rounded |
| --- | --- |
| Heritable adult-size setting (`sizeGene`) | 4.919 |
| Birth-varied size setting (`size`, not current juvenile/grown size) | 5.002 |
| Heritable gut setting (`bornGut`) | 0.103 |
| Current gut | 0.107 |
| Inherited armour | 0.885 |
| Mineral stock | 1.000 |
| Effective armour, mean of individual `armor × minStock` | 0.884 |
| Decomposer ability | 0.736 |
| Browse | 0.444 |
| Swimming | 0.021 |
| Climbing | 0.013 |

The near-full average mineral stock makes the inherited/effective distinction numerically small in this sample. It does not make that distinction unimportant generally. Effective armour was averaged **after multiplying within each body**, rather than multiplying the two population means. None of the selected fields was missing in this observation.

The table describes this sample only. It does not show a lineage-wide evolutionary rate, isolate selection from births/deaths or splitting, or establish what produced the differences from season 1396. Source changes and time both differ between the observations. The private input's identity hash and observation timestamp are in the [aggregate atlas sidecar](../../assets/mosali-s1448-density.json); the save itself is not published.

## Place and behaviour

The [density map](atlas.md) shows 43 bodies in 23 cells of a coarse grid. It is a present-at-one-moment map, not a habitat range or a measure of fitness. The checked behaviour program weighs food, threats, movement, and mating, with individual numerical parameters; the species is not simply assigned the instruction “be a decomposer.”

To follow the mechanisms, read [decomposer ability](../traits/decomposition.md), [digestion](../traits/digestion.md), [armour](../traits/armour.md), [reproduction](../traits/reproduction.md), and [four-land crossings](../environments/four-lands.md). To interpret the claims, read [selection and variation](../selection-and-variation.md).
