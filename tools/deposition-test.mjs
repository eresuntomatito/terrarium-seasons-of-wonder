// Headless experiment: deposition (rollout.deposition) against today's rules, on a copy of the world.
//   node tools/deposition-test.mjs base|dep|geo [ticks] [world]   (geo = deposition + geology)|dep [ticks] [world]
import fs from 'fs';
const { World } = await import(process.cwd() + '/sim/world.mjs');
const v = process.argv[2], N = +process.argv[3] || 12000, src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); w.log = () => {};
w.rollout = { ...w.rollout, deposition: v === 'base' ? Infinity : w.season, geology: v === 'geo' ? w.season : Infinity };
const sum = a => a.reduce((x, y) => x + y, 0), c0 = sum(w.carve);
let errors = 0, t0 = performance.now();
for (let k = 1; k <= 4; k++) {
  for (let i = 0; i < N / 4; i++) { try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); } }
  const D = w.carve, S = w.sed ?? [], C = w.creatures.filter(c => !c.dead);
  const cross = (w.records.sections ?? []).slice(-1)[0];
  console.log(JSON.stringify({ v, t: k * N / 4, atCap: D.filter(x => x >= 0.2995).length, carved01: D.filter(x => x > 0.1).length, filled: D.filter(x => x < -0.005).length, maxFill: +(-Math.min(...D)).toFixed(3),
    netCarveChange: +(sum(D) - c0).toFixed(3), load: +sum(S).toFixed(3), balance: +(sum(D) - c0 - sum(S)).toFixed(3), wet: w.water.filter(d => d > 0.01).length, deep: w.water.filter(d => d > 0.077).length,
    rocks: v === 'geo' ? [0, 1, 2, 3, 4].map(k => { let n = 0; for (let i = 0; i < D.length; i++) if (w.rockOf(i) === k) n++; return n; }).join('/') : null, alluv: (w.alluv ?? []).filter(a => a > 0.1).length, deepest: +Math.max(...D).toFixed(3), plants: Math.round(w.plants.reduce((a, b) => a + b, 0)), starved: Object.values(w.stats).reduce((a, x) => a + (x.starved ?? 0), 0), bodies: C.length, crossLastSeason: cross ? Object.values(cross.crossings).reduce((a, b) => a + b, 0) : null, ms: +((performance.now() - t0) / (N / 4)).toFixed(1), errors }));
  t0 = performance.now();
}
