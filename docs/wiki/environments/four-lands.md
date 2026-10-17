# Four lands, not four sealed boxes

Written by Codex on eresuntomatito's behalf. Mechanisms checked at public revision `f619e4e5460cc1f6968e924b696b78471577fdc5`. The continuing world's `sections` rollout began at season 1396; a fresh source checkout does not enable it automatically.

**Later implementation, public `370995aba5d21eb56b8544a5989056da59a1edd2`:** the section below describes the earlier gate. The later `canStep` path ignores rising needs at or below `0.15`, tries passable directions along a barrier, remembers a wall briefly, and can move an under-skilled body downhill with an energy cost when difficult terrain rises beneath it. The soft probability margin remains, but a rejected move no longer always just reverses velocity. Do not apply the earlier description unchanged to the newer reports. Deposition also changes the ground through time; a completed rise is not a permanently fixed layout.

The map still wraps. The redesign makes the edges difficult terrain rather than replacing the simulation with a literal rectangular enclosure: a mountain wall follows the top/bottom seam, and a river follows the left/right seam. An interior ridge and channels create four lowland sections. The transformation rises over ten seasons rather than appearing all at once.

## What divides the land

The relief combines a western peak, an eastern plateau, a mountain spine, and two channel systems. Lowlands tilt toward drainage; deep channels cut through the raised barriers. Water and earthquakes can subsequently alter conditions. North/south and west/east section labels are geographic bookkeeping, not four species territories or four isolated experiments.

## Crossing is a body–place interaction

When `crossGate` evaluates a move into a different cell, entering ground with greater climbing need can require a climbing check. Entering water with greater swimming need can require a swimming check. Water need depends on depth relative to the creature's leg setting times its current body size, so the same water is not equally difficult for every creature.

Each applicable check uses the body's skill, the destination's need, and a soft margin of `0.1`:

```text
pass probability = clamp((skill − need + 0.1) / 0.2, 0, 1)
```

At equal skill and need, the probability is 0.5 per check. This is a stochastic movement gate, not a guarantee that a sufficiently persistent body will cross any barrier. Other obstructions and movement rules remain relevant. Rejected moves reverse and halve velocity; repeated failed gates can also reset the body's home point.

Moving toward easier ground generally does not require the same rising-need check. There is an additional safeguard for bodies caught in water beyond their swimming ability: they cannot use that predicament to escape to the opposite bank. Frozen water is treated as zero liquid depth by `waterAt`, which can change access without a genetic change.

## What a crossing count means

The method periodically classifies eligible lowland positions as NW, NE, SW, or SE. Channel interiors and high ground are not immediately assigned a new side. A recorded crossing is a change in that eligible classification, not a complete movement trajectory, a direct count of successful gate trials, or proof of interbreeding across a barrier. The source keeps a bounded list of recent crossing locations.

## What this may change—and what is unproven

The rules provide mechanisms for different access, energetic costs, encounters, and mating opportunities. They do not establish that four distinct communities will evolve, that climbing or swimming must increase, or that every extinction is caused by isolation. To investigate those possibilities, compare dated distributions, crossing records, traits, reproduction, and environmental state under known rollouts. A green photograph cannot establish ecological stability.

Sources: [world implementation](../../../sim/world.mjs), `sectionsRise`, `reliefMap`, `climbNeed`, `crossGate`, and `waterAt`. See [trait inventory](../traits/README.md), [evidence standards](../evidence.md), and [running a separate world](../../RUNNING.md).
