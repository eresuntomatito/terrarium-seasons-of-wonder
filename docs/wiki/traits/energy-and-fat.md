# Energy and fat: a reserve with a carrying cost

Written by Codex on eresuntomatito's behalf. Checked at public source `370995aba5d21eb56b8544a5989056da59a1edd2`.

An inherited `thrift` setting is not the fat currently carried, and fat is not the same pool as spendable energy. Body-held energy is another quantity again. Their separate rules matter to hunger, movement, reproduction, and the value of a carcass.

## Three pools, not one fullness meter

| Quantity | Role |
| --- | --- |
| `energy` | Spendable budget for upkeep, movement, reproduction, and other implemented costs. |
| `fat` | Acquired reserve that can later return energy, while imposing load-related costs. |
| Body-held energy | Energy booked into the body and available through death/feeding paths, not ordinary spendable energy. |

The source's mass function is proportional to size squared. These are model units, not a calibrated three-dimensional animal or biochemical energy budget. Introduced founders and ordinary births also have different body-energy rules; do not assume every unit in a newcomer was paid for by its parents.

## Storing and burning

`feed` receives the digested meal value. Above a thrift-dependent fraction of energy capacity, it directs a share toward fat; `thrift` affects when storage starts, its share, and capacity. Other food-richness settings can modify the share. At the checked settings, storing converts energy with efficiency 0.85 and clamps fat to the current fat capacity. Excess energy above spendable capacity can also enter storage.

When energy falls below 30% of capacity, a body with fat can burn up to 0.01 reserve units per simulation step, returning 85% of the amount burned as spendable energy. Both directions lose value. A fat body can still starve if intake and release cannot keep up with its costs.

For a body of current mass `M`:

```text
fat capacity = 0.8 × (0.5 + thrift) × M
```

The separate `fatLoad` calculation uses a baseline `0.8 × M`, not this thrift-adjusted capacity, and increases its load measure more sharply above the configured obesity threshold. “Full fat store” and “same load” are therefore not interchangeable across bodies.

## Reserves affect performance

Fat raises movement expenditure and upkeep, lowers the speed limit and turning ability, drains sprint reserve faster, and slows its recovery. Under climate rules it also contributes insulation, which can help in cold and increase heat cost. See [movement and sight](movement-and-sight.md) and [climate](../environments/climate-and-water.md). These interacting effects do not establish a universally best thrift setting.

Spendable capacity depends on species storage, current body mass, and maturation setting; unique giants have exceptions. Recent food intake is tracked separately from both stored energy and fat. An intake total is not net gain after every cost.

## Age is another clock

The main step adds `pulse` to `age`, and decrements reproductive cooldown by pulse. That age counter is measured in modeled heartbeats, not simply simulation ticks. Growth, sight, fertility, and lifespan often compare against this counter even where a parameter name contains “Ticks.” A body can experience a different age rate because of the implemented heart-rate formula. Report wall time, simulation tick, and individual age separately.

## Evidence to look for

To compare storage strategies, inspect inherited thrift, actual reserve, expenditure, conditions, age, meals, and descendants over a defined interval. A fatter survivor is not alone proof that thrift caused survival; abundant food can both fatten a body and help it live. Historical reports supply hypotheses, not a universal optimum.

Source: [world implementation](../../../sim/world.mjs), `mass`, `capOf`, `store`, `fatCap`, `fatLoad`, `feed`, `bodyHeld`, `heartRate`, and the main expenditure/burn path. Continue with [reproduction](reproduction.md) and [selection](../selection-and-variation.md).
