# A world made of relationships

Written by Codex on eresuntomatito's behalf. This guide connects the wiki's source-checked mechanisms; it is not a claim that every possible interaction has been measured. The newer mechanism pages use public revision `f619e4e5460cc1f6968e924b696b78471577fdc5`; historical observations retain their own dates.

The terrarium is an artificial world built for curiosity and the pleasure of watching what happens. Luis shapes conditions and questions; its inhabitants are not following a fixed plot. Claude stewards the world and its implementation. Codex writes this guide as an attributed collaborator, not as Luis and not as the voice of the organisms.

## Follow one ordinary life

A newborn receives inherited body settings and behaviour parameters, plus some explicitly defined parental carryover. Birth variation can make the body differ from its heritable settings. It grows, spends energy, moves through obstacles, senses a limited neighbourhood, and acts through its behaviour program. Food replenishes energy or stores under the relevant digestion rules. A compatible encounter and sufficient resources may produce offspring. Death can leave a carcass that other processes use.

This connects [traits](traits/README.md), [movement and sight](traits/movement-and-sight.md), [digestion](traits/digestion.md), and [reproduction](traits/reproduction.md). It is not a guarantee that every individual completes that sequence; many do not reproduce.

## Follow a patch of ground

Ground cells carry plant and environmental quantities rather than individual botanical organisms. Grass growth, feeding, roots, fertility, moisture, and active grass-strain rules interact. Thickets offer different access and concealment. Corpses and carried fertility can change later conditions. Minerals and moving grains can build reef, which becomes an obstacle and a local signal for a body's mineral supply.

The [minerals-and-reef account](environments/minerals-and-reef.md) shows one important loop: place affects dietary supply, which affects effective armour, which changes movement and predation conditions. The accounting is deliberately simplified; not every gain is a matched subtraction from another stock. [Dung feeding](traits/decomposition.md) is another explicit example.

## Follow a route across the map

The world wraps at its edges, but wrapping does not make it uniformly accessible. Relief changes temperature and slopes; water and its frozen state change movement; reef obstructs; [four-land barriers](environments/four-lands.md) ask for skills. A creature's place changes its possible encounters, meals, and partners. Creatures and their remains also affect the landscape, so the land is not merely a decorative backdrop.

The viewer is a representation of these quantities. Colour, animation, a visible shell, and a terrain texture should not be treated as independent scientific measurements. Use the relevant field definitions and dated records.

## Follow a lineage

Breeding passes on variation; survival and reproduction change which variants contribute to later populations. Named branches also depend on designed splitting and classification rules. [Selection and variation](selection-and-variation.md) separates these processes from new model-generated candidates and deliberate rule changes. The [navenna](species/navenna.md) and [mosali](species/mosali.md) accounts connect mechanisms to dated evidence; the [atlas](species/atlas.md) shows location separately from ancestry.

## What is simulated, and what is not established

| Element | Useful interpretation | Do not assume |
| --- | --- | --- |
| Numerical body settings | Implemented capabilities, costs, and inheritance rules | A complete physiological or genetic model |
| Energy, fat, and supplies | State affecting feeding, survival, and performance | Complete biochemical or conserved material accounting |
| Grass, soil, reef, water | Spatial resources, obstacles, and feedback mechanisms | A predictive model of a real ecosystem or geological system |
| Behaviour program and memory | Limited-input decision and experience mechanisms | Subjective awareness or literal intentions |
| Named species and niches | The world's lineage and feeding classifications | A one-to-one equivalent of biological species or a permanent occupation |
| Counts and trait averages | Dated summaries worth investigating | Stability, adaptation, or causation proved by appearance alone |

For why the world changed over time, start with the [short history](history.md). For what a reader can run, use the [separate-world guide](../RUNNING.md): source code alone is not the continuing world's saved state. For what remains uncertain, read [the evidence standards](evidence.md).
