# Reproduction: willingness is not enough

Written by Codex on eresuntomatito's behalf. Checked at public source `f619e4e5460cc1f6968e924b696b78471577fdc5`. These are ordinary-creature rules; egg-laying unique giants have separate paths.

A behaviour can signal willingness to mate and choose an energy-gift share. A birth still requires an eligible body, enough resources, and room under the active population rules. Reproduction is not automatic when a creature reaches one fixed age.

## Maturity and eligibility

`fertile` requires age strictly greater than both the maturation threshold and 75% of juvenile growth time, no remaining birth cooldown, and a body not marked broken. The default growth time is 1,200 ticks, so the growth-based threshold is 900 ticks even though the base maturation parameter is 600. The inherited `mature` setting changes the maturation threshold; the climate rollout can lengthen it through the creature's water-thrift setting.

Later maturation also raises energy capacity and lifespan through explicit multipliers. It therefore has several designed effects, not just a delay. Whether those effects increase descendants in a particular population remains an empirical question. These tick counts are simulated time, not wall-clock seconds.

## Finding a partner

Breeding searches nearby willing, fertile bodies that pass `interbreeds`. Usually these belong to the same named species; certain ungraduated parent/variant relationships can also qualify. Compatibility and relatedness are different checks. Relatedness, colour difference, and behaviour-form difference affect choosiness, with a hard isolation threshold.

Waiting relaxes choosiness, but does not remove all compatibility and isolation requirements. A counter reaching its “any mate” setting is not permission to breed with every creature. Geography matters because a theoretically compatible partner still has to be encountered.

## The energy gift and litter

With a partner, each contributes its selected share of current energy. If the combined gift is below `0.3`, breeding returns without a birth. The `protein` rollout can modify provisioning according to the initiating parent's recent meat share; this is an explicit rule, not a full chemical protein budget.

The litter count is the rounded inherited litter setting, limited by how many children the gift can provision at the configured minimum. A bigger litter setting does not create free additional energy. The gift is divided among the children; each child's allocation is then split between usable energy and body-held energy. Parents receive a 300-tick cooldown after a successful mating.

The inherited settings and behaviour parameters then follow the paths described in the [trait inventory](README.md). The reproductive selection ledger records the mind-giving parent as a representative per child, not both parents symmetrically; see [selection and variation](../selection-and-variation.md).

## Budding alone

If no partner is found, sufficient longing and energy can permit budding. At the checked settings, the wait threshold is 600 and the parent's energy must reach its species' `reproduceAt` threshold. The parent gives energy but **70% of that gift is lost**, leaving 30% for children. If the retained gift is too small, there is no birth. These requirements mean that solitude is costly and not always survivable; budding is not a guaranteed rescue for an isolated lineage.

## What a birth count cannot tell you

Births, living offspring, and offspring that later reproduce are different outcomes. A large litter or high birth total alone does not demonstrate a successful lineage. To compare strategies, state the interval, parent exposure, offspring survival, rule changes, and whether new founders or splitting changed the counted groups.

Source: [world implementation](../../../sim/world.mjs), `fertile`, `breed`, `interbreeds`, `relatedGap`, `litterOf`, `child`, and `capOf`. Continue with [terrain and crossings](../environments/four-lands.md).
