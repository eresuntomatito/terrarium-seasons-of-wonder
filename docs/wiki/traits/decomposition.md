# Decomposer ability: two different meals

Written by Codex on eresuntomatito's behalf. Checked at public source `f619e4e5460cc1f6968e924b696b78471577fdc5`.

The inherited `decomp` setting supports two feeding paths: energy from being near qualifying grazers, and improved digestion of a carcass bite. It is not a microscopic simulation of decay organisms, and the two paths do not use the same resource accounting.

## Dung feeding is a proximity rule

The relevant routine looks for a nearby living body of another species, with gut below `0.5` and not a unique species. One qualifying neighbour is enough for the boolean proximity condition; the formula does not count separate dung piles. Without `smooth`, the receiver's decomposer ability must exceed `0.15`; with it, a trace above `0.005` can qualify. Unique and registry-marked parasite species are excluded as receivers from this path.

When the proximity condition is met, energy is computed from `dungFeed`, the body's `decomp`, and a climate multiplier when active. The receiver also adds fertility to its own cell. **This is not a bite deducted from a finite pile of dung.** It is a designed proximity-based feeding rule. Grass-eating bodies separately carry and drop a fertility load, but that load is not the stock consumed by this decomposer calculation.

That distinction limits claims about conservation, nutrient competition, and how many decomposers one grazer can support. The code provides an interaction mechanism, not a full material budget.

## Carrion feeding consumes a finite carcass

Carrion is different. A qualifying body with gut above `0.1` and a corpse in reach removes a bite from that corpse's energy. The bite's yield is multiplied by `carrionDigests(gut) × (1 + decomp)`, plus active carcass-rule effects. Decomposer ability helps yield but does not remove the gut eligibility requirement or make a distant carcass accessible.

Other corpse rules govern decay, fertility, reef formation, and disappearance. Energy a predator leaves behind is therefore not guaranteed to reach a scavenger.

## Costs and distinctions

`decomp` contributes `0.3 × decomp` within an additive upkeep multiplier. Grazing yield also includes a penalty from decomposer and parasitic abilities, bounded so that this particular combined factor does not fall below `0.2`. Those factors combine with other body, food, and environmental effects; they are not isolated whole-body cost percentages.

A high inherited ability is not the same as a high fraction of energy recently received from dung or carrion. The model tracks feeding kinds separately. A report calling a body a decomposer by recent diet need not mean that it exclusively eats dead flesh, and a named species need not share one exact diet across all members.

## Connecting the account to a species

The [mosali account](../species/mosali.md) records a dung-niche history and high decomposer ability. Its dated body sample alone does not measure actual dung intake or prove that this ability caused abundance. Explaining its role requires feeding records, nearby grazers, costs, competing foods, and the active rules for the period.

Source: [world implementation](../../../sim/world.mjs), the decomposer part of the interaction routine, `eat`, `carrionDigests`, `feed`, and the metabolism calculation. See [digestion](digestion.md), [mineral supply and reef](../environments/minerals-and-reef.md), and [evidence standards](../evidence.md).
