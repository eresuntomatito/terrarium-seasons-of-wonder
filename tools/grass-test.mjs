// Headless experiment: grass that evolves (rollout.grassvar) against today's rules. argv: base | gv, ticks, world file.
//   Prints every N/6 ticks: bodies, starvation, grass total, and the grass strains (hardiness, sweetness) in dry vs wet cells.
import fs from 'fs';
const { World } = await import(process.cwd() + '/sim/world.mjs');
const v = process.argv[2], N = +process.argv[3] || 30000, src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); w.log = () => {};
w.rollout = { ...w.rollout, grassvar: v === 'gv' ? 0 : Infinity };
const tot = key => Object.values(w.stats).reduce((a, x) => a + (x[key] ?? 0), 0), s0 = tot('starved');
// Long-run dryness of each cell: an average of moisture over the run.
const dry = new Float32Array(w.plants.length); let samples = 0, minPlants = Infinity, errors = 0;
for (let k = 1; k <= 6; k++) {
  for (let i = 0; i < N / 6; i++) {
    try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); }
    if (i % 200 === 0) { for (let j = 0; j < dry.length; j++) dry[j] += w.moisture[j]; samples++; minPlants = Math.min(minPlants, w.plants.reduce((a, b) => a + b, 0)); }
  }
  const idx = [...dry.keys()].filter(j => w.plants[j] > 0.02).sort((a, b) => dry[a] - dry[b]), third = Math.floor(idx.length / 3);
  const mean = (arr, a) => arr.length ? +(arr.reduce((s, j) => s + a[j], 0) / arr.length).toFixed(3) : null;
  const dryC = idx.slice(0, third), wetC = idx.slice(-third);
  console.log(JSON.stringify({ v, t: k * N / 6, bodies: w.creatures.filter(c => !c.dead).length, starved: tot('starved') - s0, plants: Math.round(w.plants.reduce((a, b) => a + b, 0)), minPlants: Math.round(minPlants),
    hardyDry: mean(dryC, w.grassHardy), hardyWet: mean(wetC, w.grassHardy), sweetDry: mean(dryC, w.grassSweet), sweetWet: mean(wetC, w.grassSweet), hardyAll: mean(idx, w.grassHardy), sweetAll: mean(idx, w.grassSweet), errors }));
}
