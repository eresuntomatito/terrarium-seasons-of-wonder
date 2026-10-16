// Headless experiment for the four sections (rollout.sections).
//   node tools/sections-test.mjs map            — ASCII map of the full-grown frame and the skill it asks
//   node tools/sections-test.mjs base|full|ramp [ticks] [world]
//     base: today's rules; full: the frame fully risen from the start; ramp: rising from now over sectionsSeasons
import fs from 'fs';
const { World, W, H, GW, GH, CELL, SEASON_TICKS } = await import(process.cwd() + '/sim/world.mjs');
const v = process.argv[2], N = +process.argv[3] || 16000, src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); w.log = () => {};
const S0 = w.season;
const { PHYSICS: P } = await import(process.cwd() + '/sim/world.mjs');
if (process.env.SECTIONS_SEASONS) P.sectionsSeasons = +process.env.SECTIONS_SEASONS; // compress the rise for a test
w.rollout = { ...w.rollout, sections: v === 'base' ? Infinity : v === 'ramp' ? S0 + 1 : S0 - 20 };
if (v === 'map') {
  const R = w.reliefMap(), Nd = w.climbNeed(), ch = e => ' .:-=+*#%@'[Math.max(0, Math.min(9, Math.floor(e * 9.99)))];
  for (let gy = 0; gy < GH; gy += 2) { let a = '', b = ''; for (let gx = 0; gx < GW; gx++) { const i = gy * GW + gx, e = R[i] + w.tectonic[i] - w.carve[i]; a += ch(e); b += Nd[i] > 0.5 ? '#' : Nd[i] > 0.2 ? '+' : Nd[i] > 0.02 ? '.' : ' '; } console.log(a + ' | ' + b); }
  const n = [...Nd].filter(x => x > 0.02).length; console.log('cells asking climb > 0.02:', n, '> 0.3:', [...Nd].filter(x => x > 0.3).length, '> 0.6:', [...Nd].filter(x => x > 0.6).length);
  process.exit();
}
const tot = key => Object.values(w.stats).reduce((a, x) => a + (x[key] ?? 0), 0), s0 = tot('starved'), e0 = tot('eaten');
let errors = 0, t0 = performance.now(), cross = {}, back = 0;
const wrapX = x => ((x % W) + W) % W;
for (let k = 1; k <= 8; k++) {
  for (let i = 0; i < N / 8; i++) {
    try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n').slice(1, 3).join(' ')); }
    if (w.crossings) { for (const [p, n] of Object.entries(w.crossings)) cross[p] = (cross[p] ?? 0) + n; w.crossings = {}; } back += w.turnedBack ?? 0; w.turnedBack = 0;
  }
  const C = w.creatures.filter(c => !c.dead && !w.registry[c.species].unique), sec = {};
  for (const c of C) { const s = c.sec ?? '?'; sec[s] = (sec[s] ?? 0) + 1; }
  const m = f => C.length ? +(C.reduce((s, c) => s + f(c), 0) / C.length).toFixed(3) : null, mx = f => +Math.max(...C.map(f)).toFixed(2);
  const wet = [...w.water].filter(d => d > 0.077).length;
  console.log(JSON.stringify({ v, t: k * N / 8, rise: +w.sectionsRise().toFixed(2), bodies: C.length, species: new Set(C.map(c => c.species)).size, starved: tot('starved') - s0, eaten: tot('eaten') - e0,
    plants: Math.round(w.plants.reduce((a, b) => a + b, 0)), sec, cross: Object.values(cross).reduce((a, b) => a + b, 0), pairs: cross, turnedBack: back,
    climb: m(c => c.climb ?? 0), climbMax: mx(c => c.climb ?? 0), swim: m(c => c.swim ?? 0), swimMax: mx(c => c.swim ?? 0), deepCells: wet,
    ms: +((performance.now() - t0) / (N / 8)).toFixed(1), errors }));
  t0 = performance.now(); cross = {}; back = 0;
}
