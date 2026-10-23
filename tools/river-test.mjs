// Headless test of the big river (rollout.bigriver, s1837). Run on a COPY of the world:
//   node tools/river-test.mjs <old|new|drought|wet|old_drought|old_wet> [seasons=14] [world=data/world.json]
// old: bigriver never; new: on from the next season (10-season rise); drought: new, with the rain forced dry; wet: new, rain forced high.
import fs from 'fs';
const { World, GW, GH, W, CELL, SEASON_TICKS } = await import(process.cwd() + '/sim/world.mjs');
const variant = process.argv[2] ?? 'new', seasons = +process.argv[3] || 14, src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); w.log = () => {};
if (!variant.startsWith('old')) w.rollout = { ...w.rollout, bigriver: process.env.FULL ? w.season - 30 : w.season + 1 };
if (variant === 'drought' || variant === 'old_drought') { w.rain = () => 0.05; w.climate = () => 0; } // the worst dry spell, all run
if (variant === 'wet' || variant === 'old_wet') { w.rain = () => 0.95; w.climate = () => 1; }
if (process.env.NOBODIES) { w.creatures = []; w.step = ((orig) => function () { this.creatures = []; return orig.call(this); })(w.step); } // fast water-only tuning
const SX = Math.round(952 / CELL), BAND = Math.round(110 / CELL), SWIM = 0.073, P = w.constructor.PHYSICS;
const section = (label) => { // elevation and water across the seam river at three rows, every 2 cells
  const E = w.elevMap(); const out = {};
  for (const gy of [8, 40, 70]) { const row = [], wat = []; for (let dx = -14; dx <= 14; dx += 2) { const i = gy * GW + ((SX + dx + GW) % GW); row.push(+E[i].toFixed(2)); wat.push(+w.water[i].toFixed(2)); } out['y' + gy] = { z: row.join(' '), water: wat.join(' ') }; }
  console.log('SECTION', label, JSON.stringify(out, null, 1));
};
const report = (s) => {
  let wetRows = 0, dry = 0, dryStrict = 0, widthSum = 0, depSum = 0, nDep = 0, deep = 0, nW = 0, vol = 0, wetCells = 0, maxD = 0;
  for (let gy = 0; gy < GH; gy++) { let cnt = 0, deepRow = 0, any = 0;
    for (let dx = -BAND; dx <= BAND; dx++) { const d = w.water[gy * GW + ((SX + dx + GW) % GW)]; if (d > 0.005) any++; if (d > 0.02) { cnt++; depSum += d; nDep++; if (d > SWIM) { deep++; deepRow++; } maxD = Math.max(maxD, d); } }
    widthSum += cnt; if (!any) dry++; if (!deepRow) dryStrict++; }
  for (let i = 0; i < w.water.length; i++) if (w.water[i] > 0.005) { wetCells++; vol += w.water[i]; }
  const sec = w.records.sections ?? [], last = sec.slice(-2), sum = k => last.reduce((a, r) => a + (k === 'crossings' ? Object.values(r.crossings).reduce((x, y) => x + y, 0) : r[k]), 0);
  const C = w.creatures.filter(c => !c.dead);
  console.log(JSON.stringify({ variant, season: w.season, rise: +w.riverRise().toFixed(2), width: +(widthSum / GH * CELL).toFixed(0) + 'px', meanDepth: +(depSum / Math.max(1, nDep)).toFixed(3), maxDepth: +maxD.toFixed(2),
    shareDeep: +(deep / Math.max(1, nDep)).toFixed(2), rowsDry: dry, rowsNoSwimDeep: dryStrict, volume: +vol.toFixed(1), wetCells, crossings2s: sum('crossings'), turned2s: sum('turnedBack'), fell2s: sum('fell'),
    bodies: C.length, species: new Set(C.map(c => c.species)).size, swimMean: +(C.reduce((a, c) => a + (c.swim ?? 0), 0) / Math.max(1, C.length)).toFixed(3), swimOver02: +(C.filter(c => (c.swim ?? 0) > 0.2).length / Math.max(1, C.length)).toFixed(3),
    msTick: +((performance.now() - t0) / (n || 1)).toFixed(1), errors }));
};
let errors = 0, t0 = performance.now(), n = 0; section('start');
for (let t = 1; t <= seasons * SEASON_TICKS; t++) {
  try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); } n++;
  if (t % (2 * SEASON_TICKS) === 0) { report(); t0 = performance.now(); n = 0; }
}
section('end');
