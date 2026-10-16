// Headless experiment: earthquakes (orography step 3) on the live world (relief, water, wading on), one every 3,000 ticks.
//   node tools/quake-test.mjs [ticks] [world]
import fs from 'fs';
const { World, GW } = await import(process.cwd() + '/sim/world.mjs');
const N = +process.argv[2] || 15000, src = process.argv[3] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); const logs = []; w.log = t => logs.push(t);
const tot = key => Object.values(w.stats).reduce((a, x) => a + (x[key] ?? 0), 0), s0 = tot('starved');
let errors = 0, q = 0;
for (let t = 1; t <= N; t++) {
  try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); }
  if (t % 3000 === 0) {
    const big = q++ % 2 === 1, ev = w.earthquake(big);
    const T = w.tectonic; let up = 0, down = 0, mx = 0; for (const v of T) { if (v > 0.01) up++; if (v < -0.01) down++; mx = Math.max(mx, Math.abs(v)); }
    let wet = 0, pond = 0; w.water.forEach((v, i) => { if (v > 0.005) wet++; if (v > 0.05) pond++; });
    console.log(JSON.stringify({ t, big, mag: ev.mag, len: ev.len, raisedCells: up, sunkCells: down, maxShift: +mx.toFixed(3), wet, deepWater: pond, bodies: w.creatures.filter(c => !c.dead).length, starved: tot('starved') - s0, errors }));
    console.log('  ', logs.filter(l => /earth/.test(l)).at(-1));
  }
}
