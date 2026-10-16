# Test report — a stomach (season 789, Oct 15, 12:30)

**Status: experiment only. Nothing here is applied to the live world** (`P.stomach = 0`). The code is in place, switched off, so it can be turned on later at any strength.

## 1. The idea (Luis)
How easily an animal gets energy depends on the *form* of its food:
- **Grass** is bulky and poor: a stomach fills with it long before it fills with energy, so grazers eat almost all the time (the cow).
- **Meat** is dense and rich: one meal fills the animal, then it rests and digests (the lion).
- **Rich food fattens:** a surplus from meat or grain becomes fat more readily than one from grass.

The aim: give each diet its own costs, so that specialising pays — without blocking gradual drift between diets. The kraken is exempt (a special species: it eats as it always has).

## 2. What was built (switched off)
- **A stomach per body.** Food fills it by its *raw amount*, not its energy: grass 1 per unit, thicket shoots 1.5, meat 0.3, carrion 0.4. Because the energy a body gets from a mouthful depends on how well its gut suits that food, a full stomach holds much more energy for a matched gut than for a mismatched one — that is the specialisation pressure.
- **A full stomach cannot eat** until it empties (it empties steadily as it digests).
- **Rich food fattens more:** a surplus becomes fat at 0.7× (grass), 1.0× (shoots), 1.1× (carrion), 1.3× (meat).
- **Strength 0 … 1** scales it all; at 0 nothing changes.

## 3. How it was tested
Headless copies of the world at season 789 (a drought; 4 species; ≈330 bodies at the 330 ceiling), 5,000 ticks each, two runs per setting:

| Setting | Stomach full (share of time) | Bodies | Born | Starved | Energy | Fat | Kills |
|---|---|---|---|---|---|---|---|
| Off | 0% | 329–331 | 39–47 | 6–12 | 1.81–1.84 | 0.42 | 0–3 |
| Strength 0.5 (as designed) | 0% | 332 | 40–43 | 4–5 | 1.87–1.89 | 0.42–0.43 | 0–3 |
| Strength 1 (as designed) | 0% | 331 | 39–46 | 5–11 | 1.78–1.85 | 0.42 | 0–1 |
| Strength 1, tighter (empties 0.4 / 0.25 / 0.15 of a bite per tick) | 1% / 5% / **20%** | 329–331 | 38–42 | 5–7 | 1.88–1.92 | 0.42–0.43 | 0–2 |

And a **recovering world** (half the herd, lush grass everywhere — food and young plentiful):

| Setting | Stomach full | Born | Starved | Energy | Fat | Kills |
|---|---|---|---|---|---|---|
| Off | 0% | 187–191 | 0–5 | 1.94–1.98 | 0.44 | 2–6 |
| Strength 1, tighter (0.25) | 10–12% | 189–190 | 2–4 | 1.96–1.99 | 0.43–0.44 | 2–5 |

By gut (strength 1, tighter): bodies with gut 0–0.1 had energy 1.92–2.03, gut 0.2+ had 1.67–1.79 — the **same gap as with the stomach off** (1.61–1.83).

No errors in any run.

## 4. Findings
1. **As designed, the stomach never fills.** Real intake is far below the bite rate: animals walk between patches, grass is often thin, and a crowded herd shares it. The limit on eating today is *finding* food, not *digesting* it.
2. **Even when it does fill (up to 20% of the time), nothing changes** — energy, fat, births and starvation match the stomach-off runs. Bodies sit near their energy ceiling; intake beyond that only becomes fat, and fat barely moved either.
3. **The meat side could not be tested:** hunting has nearly vanished (0–6 kills per 5,000 ticks). The family's gut fell to 0.09 on average — almost nobody has jaws now. Juvenile hunting, which ran to hundreds of kills at season 740–760, has faded with the meat-leaning lines (the omorushes died out at season 788).
4. **Specialisation toward grass is already strong without it:** the existing rule (grass energy × (1 − gut)²) has driven the whole family to gut 0.04–0.09. What the world lacks is not a *cost of grazing* but a *reason to leave grass*.

## 5. Recommendations (not applied)
1. **Don't switch the stomach on now.** In this world it would add complexity without changing anything.
2. **Revisit it when a meat-eating line exists** (Phase III). That is when "feast and rest" versus "graze all day" — and meat fattening better through droughts — would actually separate ways of life.
3. **Levers that would work now, to give a reason to leave grass:**
   - **Grass quality that varies:** dry-season grass gives less energy than wet-season grass (as real grass does), so lean seasons push toward shoots, carrion or meat. *Most promising.*
   - **Make thicket shoots worth it again:** browsing faded because shoots need a larger body and a browsing gut; a smaller threshold or a richer shoot in dry seasons would reopen the browser niche.
   - **Meat fattens more** (the "rich food" half of the stomach, on its own): an omnivore that eats some meat carries more fat into droughts and survives them better than a pure grazer. Cheap to apply and to test.
4. **Testing gap:** 5,000 ticks shows physiology, not evolution. If any of the above goes ahead, test with 20,000–30,000-tick runs to see whether guts actually move.

## 6. Also agreed (Luis, 12:15)
- **Decomposers and parasites** (dung, infested hosts) open to the progenitor's family at the first check-in after the grass recovers from the current drought — held back now because parasitism in a drought, with four grass species and no rescues, is a collapse risk.
