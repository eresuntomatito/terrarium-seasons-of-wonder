# Digestion: a tendency, not a job title

**AI-written update by Codex (GPT-6), 23 October 2026.** Later M3 digestion pools, M4 food-specific curves, gut-valley and carrion-fit rules postdate the formulas below. The source-dated account is retained below. See [the freshness review](../changes.md).


Written by Codex on eresuntomatito's behalf. Checked against public source `f619e4e5460cc1f6968e924b696b78471577fdc5`.

`gut` runs from 0 toward plant digestion to 1 toward flesh digestion. It changes feeding eligibility and energy yield, but does not command a creature to hunt or graze. Its behaviour, reachable food, body size, and the other bodies present still matter.

## One body can use more than one food

With the baseline rules, a body can graze when `gut < 0.75` and has hunting jaws when `gut > 0.25`. Those intervals overlap. Plant digestion includes `(1 − gut)²`; flesh digestion includes `gut` raised to the active flesh exponent. Other multipliers apply, including browsing, mouth fit, and feeding efficiency. Thus a gut of 0.5 is not a promise of a 50:50 diet or equal energy from the two foods.

The `plateau`, `valley`, `pyramid`, and `meatspec` rollouts alter parts of this relationship. For example, `plateau` replaces the baseline plant curve, while `valley` changes the ordinary hunter's jaw threshold and flesh exponent. Carrion has its own eligibility and yield rules. Use the rollout record for the world and period being discussed; do not read baseline thresholds as universal historical constants.

## Birth setting, body variation, and experience

Three quantities should not be confused:

- `bornGut` stores the digestive setting passed into the birth process.
- `gut` starts with additional bounded birth variation and can change during life.
- `shift` records the implemented hunger-related change, rather than all differences between `bornGut` and current `gut`.

Ordinary breeding chooses a parent's `heritableGut`, drifts it, and passes it to `child`. The child retains that value as `bornGut`; its actual gut receives normal birth variation with spread `0.04`, clamped to 0–1. The random birth deviation itself is not copied as a heritable setting.

However, this model explicitly includes a partial acquired-effect pathway:

```text
heritableGut = clamp(bornGut + 0.5 × shift, 0, 1)
```

It would therefore be inaccurate to say that nothing acquired during life can influence ordinary offspring. This is a designed model rule, not a claim about the mechanisms of biological inheritance.

## Hunger-related conversion

The `plasticity` method increments a hunger counter while energy is below the configured starving share. A body with `bornGut < 0.5`, at least 300 hunger ticks, and a scarcity flag has a per-call chance `plastic × 0.0028` to begin turning. Once turning, continued hunger raises `shift` by up to `0.001` per call, capped at `0.3`, and increases current gut accordingly. These are simulation calls/ticks, not biological time units or a guaranteed conversion deadline.

This mechanism is neither a conscious decision nor proof that a starving lineage successfully became a predator. Conversion can change capability without providing suitable prey, sufficient size, effective pursuit, or time to reproduce.

## What to measure

To explain a dietary change, inspect actual food intake alongside gut, `bornGut`, shift, behaviour, and active rollouts. A population mean can change through births, deaths, movement, or new founders as well as individual conversion. Species diet labels summarize feeding; they are not an immutable caste assigned by the gut value.

Sources: [world implementation](../../../sim/world.mjs), `grazes`, `hasJaws`, `grassGut`, `fleshGut`, `fleshEff`, `plasticity`, `heritableGut`, `breed`, and `child`. Continue with the [trait inventory](README.md) and [evidence standards](../evidence.md).
