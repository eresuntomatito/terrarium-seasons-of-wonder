# Moving and noticing

**AI-written update by Codex (GPT-6), 23 October 2026.** Later M2 physics, body footprints and tracker rules postdate the movement account below. Home-range attraction is built but was off at the Oct 23 handoff. The source-dated account is retained below. See [the freshness review](../changes.md).


Written by Codex on eresuntomatito's behalf. Checked at public source `f619e4e5460cc1f6968e924b696b78471577fdc5`.

Being able to eat something is not enough: the creature must encounter it, notice it, move toward it, and survive the costs. Neither the `legs` trait nor the `eyes` trait is a complete description of those processes.

## Speed is a limit, not a destination

For an ordinary body, cruising speed starts with species `maxSpeed × legs`. Growing special species can have an additional size-related slowdown. `steer` then combines the cruise setting with sprint state, energy weakness, fat load, effective armour, thicket, slope, and wading. A global cap of 5 simulation units per tick applies.

This is the permitted velocity magnitude, not a guarantee of constant motion. Behaviour supplies a steering force; acceleration and turning have their own limits. Reef collision and the [four-land movement gate](../environments/four-lands.md) can obstruct a body that otherwise has a high speed limit. Two equally fast bodies need not reach the same food or partner.

Longer legs can raise the cruise setting and reduce some slope penalties, but also affect upkeep. A claim that “long legs win” needs a specified environment, competing costs, and reproductive evidence rather than a speed formula alone.

## Endurance is not remaining stamina

`wind` is inherited sprint endurance; `stamina` is the changing reserve. A requested sprint occurs only when at least one stamina unit remains. At the checked settings, sprinting raises the speed multiplier to 1.6 and force multiplier to 1.3, while draining stamina by `1 + fat load` per call. Ordinary recovery is bounded by `wind × 90` and reduced by weakness and load.

A high-wind body can therefore have no stamina left. A full reserve does not force it to sprint, and a sprint multiplier can be limited by the global speed cap or by terrain.

## Sight combines body, age, and place

The sight radius is:

```text
species perception × size factor × age factor × (0.5 + eyes) × cover factor
```

The size factor is bounded between 0.7 and 1.4. Juveniles have an age factor rising from 0.6 toward 1; near the end of the sampled lifespan it falls toward 0.8. Thicket above density 0.4 applies the checked cover factor 0.6. Eye setting also has an upkeep effect.

Sight radius is not omniscience. Sensing limits which neighbours and food patches are returned; concealment and special-species rules also apply. The behaviour receives a filtered, bounded view, not the server's entire world state. Reef sensing uses eight directional rays to the first solid cells within sight; it is not a full navigation map.

The sight age curve uses its own maturation expression. Do not assume that its transition, reproductive eligibility, and the viewer's adult flag are identical boundaries; [reproduction](reproduction.md) includes additional growth and climate conditions.

## Questions worth observing

Do failed encounters come from insufficient perception, steering, speed, stamina, a barrier, or insufficient feeding eligibility? A screenshot cannot distinguish all of these. Record version, place, age, energy, relevant traits, and observed behaviour before calling an apparently idle creature broken.

Source: [world implementation](../../../sim/world.mjs), `cruise`, `steer`, `sight`, `reefRays`, `sense`, and `crossGate`. See the [trait inventory](README.md) and [evidence standards](../evidence.md).
