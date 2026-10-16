// Headless experiment: the relief (orography step 1) at full height from the start, against today's rules.
//   node tools/relief-test.mjs base|relief [ticks] [world]
import fs from 'fs';
const { World } = await import(process.cwd() + '/sim/world.mjs');
const v = process.argv[2], N = +process.argv[3] || 20000, src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); w.log = () => {};
w.rollout = { ...w.rollout, relief: v === 'relief' ? w.season - 40 : Infinity };
const tot = key => Object.values(w.stats).reduce((a, x) => a + (x[key] ?? 0), 0), s0 = tot('starved');
let errors = 0, t0 = performance.now();
for (let k = 1; k <= 4; k++) {
  for (let i = 0; i < N / 4; i++) { try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); } }
  const C = w.creatures.filter(c => !c.dead), z = c => w.elevAt(c.x, c.y), band = (lo, hi) => C.filter(c => z(c) >= lo && z(c) < hi);
  const m = (a, f) => a.length ? +(a.reduce((s, c) => s + f(c), 0) / a.length).toFixed(3) : null;
  const low = band(0, 0.1), mid = band(0.1, 0.45), high = band(0.45, 2), era = w.tempEra();
  console.log(JSON.stringify({ v, t: k * N / 4, bodies: C.length, starved: tot('starved') - s0, plants: Math.round(w.plants.reduce((a, b) => a + b, 0)),
    nLow: low.length, nMid: mid.length, nHigh: high.length, coatLow: m(low, c => c.coat ?? 0.3), coatHigh: m(high, c => c.coat ?? 0.3), sizeLow: m(low, c => c.size), sizeHigh: m(high, c => c.size),
    Tpeak: +w.tempAt(w.season ? 0.65 * 640 : 0, era, 0.14 * 960).toFixed(2), Tlow: +w.tempAt(0, era, 0.32 * 960).toFixed(2), Tmeseta: +w.tempAt(0.65 * 640, era, 0.65 * 960).toFixed(2),
    ms: +((performance.now() - t0) / (N / 4)).toFixed(1), errors }));
  t0 = performance.now();
}
