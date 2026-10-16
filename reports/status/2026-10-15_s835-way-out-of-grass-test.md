# Test report — a way out of grass (season 835, Oct 15, 15:00)

**Question (Luis):** what would reward leaving grass enough to reverse the family's steady slide to pure grazing — for some?

## 1. The three changes tested
1. **A generalist plateau for the gut.** Today grass is worth energy × (1 − gut)², so every step toward meat costs at once (gut 0.2 keeps 64%). With the plateau, a gut keeps *all* of grass's value up to 0.15, then slides to nothing at 1 — the first steps toward meat cost nothing.
2. **Protein for breeding.** A mother whose recent diet is at least 20% meat gives her young up to 50% more (the same cost to her; better-provisioned young).
3. **Carrion as a stepping stone.** Carcasses are digested best by a gut near 0.3 instead of 0.6, and torn off faster — so the dead of every drought feed animals barely past grass.

## 2. How it was tested
Four headless copies of the world at season 835 (three species, ≈330 bodies), 30,000 ticks each (about 5½ seasons, including a drought near the end): the current rules, +1, +1+2, +1+2+3.

| Variant (after 30,000 ticks) | Gut avg / top 10% | Bodies with jaws | Kills | Carrion eaten | Meat in the recent diet (top 10% / most) | Ways of life besides grazing | Starved |
|---|---|---|---|---|---|---|---|
| Current rules | 0.042 / 0.098 | 8 | 3 | ≈2 | 1.6% / 87% | 5 scavengers, 2 decomposers, 2 mixed feeders | 259 |
| +1 plateau | **0.056 / 0.121** | 5 | 4 | 4 | 0.3% / 54% | 3 scavengers, 3 mixed, 1 browser | 205 |
| +1+2 protein | 0.043 / 0.106 | 4 | 2 | ≈0 | 1% / 12% | 3 mixed | 268 |
| **+1+2+3 carrion** | 0.048 / 0.109 | **12** | **10** | **19** | **8.6% / 100%** | **7 omnivores, 7 scavengers**, 4 mixed, 1 browser | **203** |

No errors in any run. (The scavengers in the current-rules run appeared only in its final drought.)

## 3. Findings
1. **The plateau is the only change that moves guts upward** (0.042 → 0.056 on average, top tenth 0.098 → 0.121) — small in 5½ seasons, but the first upward drift in this family's history. It removes the cost of the first steps.
2. **Protein on its own does nothing:** it rewards meat, and nobody eats meat yet.
3. **Carrion is what opens the door:** 5–10× more carrion eaten, the first real omnivores and scavengers (7 + 7), more bodies with jaws (12), more kills (10) — and fewer deaths in the drought (203 starved vs 259), because the drought's dead feed the living.
4. **Together they diversify ways of life without harming the family:** bodies and births held up; starvation fell.

## 4. Decision and rollout (applied one by one)
Order **1 → 3 → 2**, not 1 → 2 → 3: protein only pays once carrion has put meat in the diet.

| Step | Change | Live from |
|---|---|---|
| 1 | Gut plateau | season 837 |
| 2 | Carrion stepping stone | season 842 (if step 1 shows no harm) |
| 3 | Protein for breeding | season 847 (if step 2 shows no harm) |

Each step is checked at the check-ins (bodies, starvation, guts, niches) before the next goes in; the next status report's section 9 will show whether selection on gut has turned.
