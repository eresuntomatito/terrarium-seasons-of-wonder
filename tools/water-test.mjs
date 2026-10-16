// Headless calibration of the river (orography step 2): full relief, water on (and wading if 'wade'); prints water stats.
//   node tools/water-test.mjs [ticks] [wade] [world]
import fs from 'fs';
const { World, GW, GH } = await import(process.cwd() + '/sim/world.mjs');
const N = +process.argv[2] || 6000, wade = process.argv[3] === 'wade', src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); w.log = () => {};
const off = process.argv[3] === 'off'; w.rollout = { ...w.rollout, relief: w.season - 40, water: off ? Infinity : 0, wading: wade ? 0 : Infinity };
const tot = key => Object.values(w.stats).reduce((a, x) => a + (x[key] ?? 0), 0), s0 = tot('starved');
let errors = 0, t0 = performance.now(); const reef0 = w.reef.reduce((a, b) => a + b, 0);
for (let k = 1; k <= 6; k++) {
  for (let i = 0; i < N / 6; i++) { try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); } }
  const Wt = w.water; let wet = 0, vol = 0, max = 0, deep = 0, xs = [];
  for (let i = 0; i < Wt.length; i++) if (Wt[i] > 0.005) { wet++; vol += Wt[i]; max = Math.max(max, Wt[i]); if (Wt[i] * 60 > 4) deep++; const gy = (i / GW) | 0; if (gy < 15) xs.push(i % GW); }
  const snow = w.snow.reduce((a, b) => a + b, 0), carve = Math.max(...w.carve);
  const C = w.creatures.filter(c => !c.dead), inW = C.filter(c => (w.water[Math.floor(c.y / 8) * GW + Math.floor(c.x / 8)] ?? 0) > 0.005).length;
  const hx = {}; for (let i = 0; i < Wt.length; i++) if (Wt[i] > 0.005) { const x = Math.floor((i % GW) / 10) * 10; hx[x] = (hx[x] ?? 0) + 1; }
  console.log(JSON.stringify({ hx, t: k * N / 6, season: w.season, rain: +w.rain().toFixed(2), wetCells: wet, deepCells: deep, volume: +vol.toFixed(2), maxDepth: +max.toFixed(3), snow: +snow.toFixed(2), carveMax: +carve.toFixed(3),
    riverX_top: xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null, reefLost: +(reef0 - w.reef.reduce((a, b) => a + b, 0)).toFixed(1), bodies: C.length, inWater: inW, starved: tot('starved') - s0,
    swim: +(C.reduce((a, c) => a + (c.swim ?? 0), 0) / C.length).toFixed(3), ms: +((performance.now() - t0) / (N / 6)).toFixed(1), errors }));
  t0 = performance.now();
}
