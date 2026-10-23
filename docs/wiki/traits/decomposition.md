# Decomposer feeding: a supply that can run out

**AI-written by Codex (GPT-6), publishing collaborator, on eresuntomatito's behalf.** Source-reviewed 23 October 2026 at local `34d66d7` / public `68e670c`. Which path runs depends on the world's saved rollouts and parameter overrides; a fresh world does not enable every later rule.

The inherited `decomp` setting helps a body use dung and carcasses. It does not create food. In the newer dung path, a body must find a finite supply on the ground. Carrion feeding likewise takes a bite from a carcass. The ability, the available food, the amount swallowed and the later energy gain are separate quantities.

## From a meal to dung on the ground

With `honestdung` active, eligible feeding paths book the part of a meal not extracted by the gut into a carried energy quantity, `dungE`. As the body moves, it drops a fraction into `dungMap` at its current cell. This is separate from the older carried fertility quantity, `dung`; the two should not be added as if they were the same material measurement.

`eatDung` removes available energy from the eater's cell and its neighbouring cells, up to the requested amount. Food taken by one body is unavailable to the next. The present lookup clips its three-by-three neighbourhood at map edges; it does not wrap that lookup across the seam.

For an ordinary evolved dung-eater, the request depends on decomposer ability, feeding habit and, when active, local climate. The path skips dead, climbing or digestion-full bodies and has ability thresholds and special-species exclusions. There need not be a living grazer beside the eater: the dropped supply can remain after its producer has moved on.

The default extraction factor, `dungEff`, is 0.8 before later feeding modifiers. Some consumed material contributes fertility, and uneaten dung decays toward fertility at a temperature-dependent rate. These are designed model accounts, not a complete biochemical conservation calculation. In particular, later skill-pay modifiers and energy handling must be included before making a claim about the whole energy budget.

## Why an older report describes free food near grazers

Before `honestdung`, proximity to a qualifying grazer could award energy without deducting a finite dung stock. The new rollout fades that old gift over a default ten seasons; both paths can therefore operate during the transition. If the rollout is absent, the older path remains available. The separate beetle/parasite-line routine also has its own dung and host rules.

The [mosali history](../species/mosali.md) belongs to an earlier rule period. Its dung-associated abundance is not evidence of the same resource budget as today's finite-stock path. Keep report date and active rules together.

## A carcass is accessible food, not guaranteed income

Carrion feeding checks the body's configured gut threshold or its ability to open a carcass, as well as reach and digestion capacity. It subtracts a bite from `corpse.energy`. Yield depends on the body's gut fit, `decomp`, active carcass rules and later feeding modifiers.

With `carcass2`, the carcass-stage multiplier is capped so that this stage offers no more than the raw bite removed. That cap precedes `feed` and its possible skill-pay adjustment; it is not proof of conservation across the full pipeline.

With `insects`, opening a carcass requires both decomposer ability and a sufficiently large recent share of dung/carrion feeding. A qualifying opener can access a carcass despite a plant-leaning gut, take a larger bite, and temporarily slow its rot. Merely having a high inherited `decomp` value does not establish that recent diet.

The newer `carrionfit` curve, when `gutcurves` is active, gives carrion a broad gut-fit plateau around 0.4 with gradual shoulders. This makes low-to-middle guts more capable of using it; it neither supplies corpses nor makes a body choose them. Earlier gut curves remain in the code for other rollout states.

Carcasses also lose energy through decay and can feed other consumers. Reaching a corpse earlier, fitting its food and digesting it fast enough are distinct advantages. Longer-lasting carcasses were tested but not released at the steward's Oct 23 handoff; they are not an assumed current setting.

## Eating, digestion and the name of a way of life

With the digestion rollout, ordinary bodies queue food in per-kind gut pools. Spendable energy and the recent-diet records arrive as those pools empty. A bite removed from the ground is therefore not necessarily an immediate increase in the viewer's energy meter.

Decomposer ability still contributes to upkeep and reduces grazing yield through the relevant factors. Later breadth/skill rules add further interactions. No one coefficient is the body's entire cost or benefit.

To investigate success, compare inherited ability, available dung/carcass stocks, amounts removed, digestion, recent dietary shares, survival and descendants. A species name or diet label alone cannot show which mechanism caused its history. See [the evidence guide](../evidence.md) and [the current-world account](../current-world.md). The older [digestion page](digestion.md) retains its earlier checked formulas and is awaiting its own rewrite.

Source: [world implementation](../../../sim/world.mjs), especially `eatDung`, `rotDung`, `dungGift`, `infestations`, `opens`, `eat`, `carrionDigests`, `gutFit`, `feed`, `digest` and `feedNow`. The revision above fixes this account's boundary; the link follows the checkout.
