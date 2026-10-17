# Toxin: capacity, supply, and the eater's response

Written by Codex on eresuntomatito's behalf. Checked at public source `f619e4e5460cc1f6968e924b696b78471577fdc5`.

Toxicity is not one number with one effect. An ordinary prey has an inherited capacity and a dietary stock. An eater has resistance and may have a learned aversion. Those mechanisms influence a meal differently from [armour](armour.md), which changes a predation size threshold.

## Supply supports expression

For an ordinary, non-parasite body, `toxinOf` is `toxin × toxStock`. Unique and registry-marked parasite species bypass the stock multiplier. The inherited setting is not automatically the quantity encountered by a predator.

During `eat`, toxin stock fades by a factor of `0.9999`. An eligible, eating grazer in thicket can replenish it by `0.002 × thicket density`, even if there was no positive grass bite. Browsing shoots adds another thicket-based gain at twice that rate, using the density remaining after the shoot bite. Stock is capped at 1. These are supply rules, not a chemical toxin-production simulation or a conserved thicket-toxin budget.

This differs from mineral replenishment, which requires a positive grass bite in the checked path. Ordinary offspring receive 60% of the parents' mean toxin stock, separately from mutation of inherited toxin capacity.

## A toxic meal can still be a fatal encounter

For ordinary shared predation meals, the harmful part is the amount by which prey's effective toxin exceeds the eater's resistance, bounded below by zero. That excess lowers digested yield. When it exceeds `0.05`, it also causes an explicit energy loss and triggers the aversion update. Prey have already been killed along this path; poison is not an automatic guarantee that the prey survives an attack.

The inherited toxin and resistance settings both contribute upkeep costs. More toxin is therefore not an unconditional advantage, and more resistance does not supply a meal by itself. Filter-feeding giants have special avoidance, tolerance, and acquired-resistance rules; do not generalize those exceptions to every hunter.

## Aversion uses perceived colour

A harmful ordinary predation meal can set aversion to the prey's displayed hue. The code can copy a weaker aversion to nearby same-species bodies, and aversion subsequently fades. The feeding-decision path can then reject prey with sufficiently similar hue.

This is an implemented colour-associated avoidance and local propagation mechanism, not evidence of subjective disgust, language, or a message intentionally sent by the creatures. Displayed hue combines species colour, inherited hue shift, and gut tint; a colour is not a direct toxin assay.

## What would show an ecological effect

Inspect effective toxin and supply, eater resistance, actual meals, aversion state, body costs, and offspring outcomes during a defined interval. A bright stripe or high inherited-toxin average alone does not establish that toxic bodies survived better. Nor does the presence of avoidance code prove that mimicry evolved in a particular population.

Source: [world implementation](../../../sim/world.mjs), `toxinOf`, `eat`, `wouldEat`, `gulp`, `inherit`, and the metabolism/aversion updates. See [trait inventory](README.md), [digestion](digestion.md), and [evidence standards](../evidence.md).
