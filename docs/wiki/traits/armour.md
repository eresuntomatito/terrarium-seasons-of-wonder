# Armour: a capacity and a carried defence

Written by Codex. Mechanisms checked at source revision `39359c9`; observations below refer to season 1328 of Luis's continuing world.

Armour represents a protective body covering through a small set of numerical effects. The model does not construct a shell's anatomy or calculate material strength. It raises the size a hunter needs to overpower prey, slows the protected body, and adds upkeep.

## Inherited does not mean fully expressed

For an ordinary body:

```text
effective armour = inherited armour × mineral stock
```

`armor` is the inherited capacity, bounded between 0 and 1. `minStock` represents supply available to support it. Unique giants are an exception: `armorOf` uses their inherited armour directly.

At birth, `inherit` selects an armour value from one parent and mutates it through `driftArmor`, including occasional larger changes. The child's mineral stock follows a different rule: it receives `0.6` times the parents' mean stock. Its later access to [minerals and reef](../environments/minerals-and-reef.md) changes that stock during feeding. Acquired stock and inherited armour are therefore separate parts of the model.

## Benefits and costs

| Effect | Checked implementation |
| --- | --- |
| Base predation threshold | Required hunter size is `prey size × 1.2 × (1 + 0.6 × effective armour)`, before later weakness, hunting-skill, or pack modifiers. |
| Speed | The movement limit includes a multiplier `1 − 0.2 × effective armour`, alongside hunger, fat, vegetation, slope, and water effects. |
| Upkeep | The metabolism multiplier includes `+0.2 × inherited armour`, alongside costs from other traits. |

The asymmetry matters. When supply fades, the body can lose protection while still paying the inherited capacity's upkeep cost. At full effective armour, the base predation threshold is 60% higher than for an otherwise identical unarmoured prey; the armour speed multiplier is 0.8. These are effects within the model, not biological measurements.

In an isolated check, a size-7 hunter could overpower full-grown size-5 prey with no effective armour, but could not do so when its armour and mineral stock were both 1. A separate controlled feeding comparison changed effective armour through mineral access while holding the inherited value fixed. See [verification](../../VERIFICATION.md).

## What the reports measure

At season 1328, the [navenna account](../species/navenna.md) records a reported armour value of 0.85. This does **not** establish effective armour of 0.85: `World.traits()` averages the bodies' inherited `armor` values, whereas the viewer's frame uses `armorOf`.

The report's language about shells should therefore be read with care. To establish carried protection, one also needs mineral stocks or the effective values. `tools/defence.mjs` distinguishes these measures, but the underlying season-1328 individual stocks are not supplied by that report.

The [season-1326 synthesis](../../../reports/status/2026-10-16_s1326-whitepaper-what-shapes-species.md) associates predation with increasingly armoured bodies. That is evidence to investigate, not proof that mineral access caused this particular lineage to succeed. See [reading the evidence](../evidence.md).

## Sources

[World implementation](../../../sim/world.mjs): `PHYSICS.armorGuard`, `armorSlow`, `armorUpkeep`, `driftArmor`, `inherit`, `armorOf`, `canOverpower`, `steer`, `traits`, and `frame`. The linked file follows the checkout; the revision above identifies the checked version.
