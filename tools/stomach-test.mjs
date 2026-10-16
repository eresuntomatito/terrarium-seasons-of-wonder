// Headless experiment: the stomach at a given strength (argv[2]) on a copy of the world, for argv[3] ticks.
import fs from 'fs';
const { World, PHYSICS } = await import(process.cwd() + '/sim/world.mjs');
const s = +process.argv[2], N = +process.argv[3] || 5000;
PHYSICS.stomach = s; if (process.env.EMPTY) PHYSICS.stomachEmpty = +process.env.EMPTY; if (process.env.HOLD) PHYSICS.stomachHold = +process.env.HOLD;
const w = new World(JSON.parse(fs.readFileSync(process.argv[4] ?? 'data/world.json', 'utf8')));
const logs = []; w.log = t => logs.push(t);
const fam = () => w.creatures.filter(c => !c.dead && c.species !== 'kraken');
const tot = key => Object.entries(w.stats).filter(([n]) => (w.registry[n]?.lineage ?? '').startsWith('P')).reduce((a, [, x]) => a + (x[key] ?? 0), 0);
const b0 = { born: tot('born'), starved: tot('starved'), kills: tot('kills'), eaten: tot('eaten') };
let errors = 0, fullSamples = 0, samples = 0;
const mean = (a, f) => a.length ? a.reduce((x, c) => x + f(c), 0) / a.length : 0;
for (let i = 0; i < N; i++) {
  try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message); }
  if (s && i % 50 === 0) for (const c of fam()) { samples++; const k = w.scale(c), bite = w.registry[c.species].biteSize * Math.sqrt(k); if ((c.bulk ?? 0) >= PHYSICS.stomachHold * bite) fullSamples++; }
}
const C = fam(), niches = C.reduce((m, c) => { const n = w.nicheOf(c); m[n] = (m[n] ?? 0) + 1; return m; }, {});
const ms = C.map(c => c.recent?.ate > 0.3 ? c.recent.meat / c.recent.ate : 0).sort((a, b) => a - b);
const fatOf = c => (c.fat ?? 0) / ((w.bodySize(c) / 5) ** 2);
const byGut = [[0, 0.1], [0.1, 0.2], [0.2, 1]].map(([lo, hi]) => { const g = C.filter(c => c.gut >= lo && c.gut < hi); return `${lo}-${hi}: n${g.length} E${mean(g, c => c.energy).toFixed(2)} fat${mean(g, fatOf).toFixed(2)}`; });
console.log(JSON.stringify({ strength: s, empty: PHYSICS.stomachEmpty, hold: PHYSICS.stomachHold, ticks: N, errors, bodies: C.length, species: w.living().filter(n => !w.registry[n].unique).length,
  born: tot('born') - b0.born, starved: tot('starved') - b0.starved, kills: tot('kills') - b0.kills, eaten: tot('eaten') - b0.eaten,
  energy: +mean(C, c => c.energy).toFixed(2), fat: +mean(C, fatOf).toFixed(3), gut: +mean(C, c => c.gut).toFixed(3),
  timeFull: samples ? +(fullSamples / samples).toFixed(3) : 0, niches, meatP99: +(ms[Math.floor(0.99 * (ms.length - 1))] ?? 0).toFixed(3), meatMax: +(ms.at(-1) ?? 0).toFixed(3),
  byGut, splits: logs.filter(t => /that live as|drifted apart/.test(t)).length }));
