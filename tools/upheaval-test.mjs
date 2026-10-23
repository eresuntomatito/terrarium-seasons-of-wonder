// Headless experiment: the upheaval (rollout.upheaval), compressed to UPHEAVAL_SEASONS (default 4) on a copy of the world.
//   UPHEAVAL_SEASONS=4 node tools/upheaval-test.mjs [world] [ticks]
import fs from 'fs';
const { World, PHYSICS: P, W, H, GW, CELL, SEASON_TICKS } = await import(process.cwd() + '/sim/world.mjs');
P.upheavalSeasons = +(process.env.UPHEAVAL_SEASONS ?? 4);
const src = process.argv[2] ?? 'data/world.json', N = +process.argv[3] || Math.round((P.upheavalSeasons + 1) * SEASON_TICKS);
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); const logs = []; w.log = m => logs.push(m);
w.rollout = { ...w.rollout, upheaval: w.season + 1 };
const [cx, cy] = P.upheavalAt, peak = () => { let m = -9; for (let y = cy - 150; y < cy + 150; y += 8) for (let x = cx - 150; x < cx + 150; x += 8) m = Math.max(m, w.elevAt((x + W) % W, (y + H) % H)); return m; };
const ring = () => { let s = 0, k = 0; for (let a = 0; a < 6.28; a += 0.2) { s += w.elevAt((cx + 200 * Math.cos(a) + W) % W, (cy + 200 * Math.sin(a) + H) % H); k++; } return s / k; };
const starved = () => Object.values(w.stats).reduce((a, x) => a + (x.starved ?? 0), 0), s0 = starved();
let errors = 0, t0 = performance.now();
console.log(JSON.stringify({ t: 0, peak: +peak().toFixed(2), ring200: +ring().toFixed(2), meseta: +w.elevAt(600, 416).toFixed(2) }));
for (let k = 1; k <= 6; k++) {
  for (let i = 0; i < N / 6; i++) { try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n').slice(1, 3).join(' ')); } }
  const C = w.creatures.filter(c => !c.dead), E = w.elevMap(), lo = Math.min(...E);
  console.log(JSON.stringify({ t: Math.round(k * N / 6), peak: +peak().toFixed(2), Tpeak: +w.tempAt(cy, undefined, cx).toFixed(2), ring200: +ring().toFixed(2), lowest: +lo.toFixed(2), quakes: logs.filter(l => /ground heaves|ground lurches/.test(l)).length, big: logs.filter(l => /heaves/.test(l)).length,
    bodies: C.length, species: new Set(C.map(c => c.species)).size, starved: starved() - s0, crag: [...w.climbNeed()].filter(x => x > 0.5).length, wet: [...w.water].filter(d => d > 0.01).length, ms: +((performance.now() - t0) / (N / 6)).toFixed(1), errors, done: !!w.upheaval?.done }));
  t0 = performance.now();
}
console.log(logs.filter(l => /heaves|lurches|settles/.test(l)).slice(0, 3).join('\n'));
