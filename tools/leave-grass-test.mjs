// Headless experiment: the three "way out of grass" changes, switched on by variant (argv[2]: base | p1 | p12 | p123), 30,000 ticks.
import fs from 'fs';
const { World } = await import(process.cwd() + '/sim/world.mjs');
const v = process.argv[2], N = +process.argv[3] || 30000, src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8')));
const logs = []; w.log = t => logs.push(t);
const on = { base: [], p1: ['plateau'], p12: ['plateau', 'protein'], p123: ['plateau', 'protein', 'carrion'], now: ['plateau', 'protein', 'carrion'], smooth: ['plateau', 'protein', 'carrion', 'smooth'], weak: ['plateau', 'protein', 'carrion', 'smooth', 'weak'], pack: ['plateau', 'protein', 'carrion', 'smooth', 'weak', 'pack'] }[v];
w.rollout = { ...w.rollout, plateau: Infinity, protein: Infinity, carrion: Infinity, smooth: Infinity, weak: Infinity, pack: Infinity };
for (const k of on) w.rollout[k] = 0;
const fam = () => w.creatures.filter(c => !c.dead && c.species !== 'kraken');
const tot = key => Object.entries(w.stats).filter(([n]) => (w.registry[n]?.lineage ?? '').startsWith('P')).reduce((a, [, x]) => a + (x[key] ?? 0), 0);
const k0 = tot('kills'), b0 = tot('born'), s0 = tot('starved');
const carrionEaten = () => Object.entries(w.diet).filter(([n]) => (w.registry[n]?.lineage ?? '').startsWith('P')).reduce((a, [, d]) => a + (d.carrion ?? 0), 0);
const c0 = carrionEaten();
let errors = 0;
for (let k = 1; k <= 3; k++) {
  for (let i = 0; i < N / 3; i++) { try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); } }
  const C = fam(), m = f => C.reduce((s, c) => s + f(c), 0) / C.length;
  const niches = C.reduce((o, c) => { const n = w.nicheOf(c); o[n] = (o[n] ?? 0) + 1; return o; }, {});
  const ms = C.map(c => c.recent?.ate > 0.3 ? c.recent.meat / c.recent.ate : 0).sort((a, b) => a - b);
  console.log(JSON.stringify({ v, t: k * N / 3, bodies: C.length, species: w.living().filter(n => !w.registry[n].unique).length, gut: +m(c => c.bornGut ?? c.gut).toFixed(3),
    gutP90: +C.map(c => c.bornGut ?? c.gut).sort((a, b) => a - b)[Math.floor(0.9 * (C.length - 1))].toFixed(3), jaws: C.filter(c => c.gut > 0.25).length,
    kills: tot('kills') - k0, born: tot('born') - b0, starved: tot('starved') - s0, carrion: +(carrionEaten() - c0).toFixed(1),
    meatP90: +(ms[Math.floor(0.9 * (ms.length - 1))] * 100).toFixed(1), meatMax: +(ms.at(-1) * 100).toFixed(0), niches, decomp: +m(c => c.decomp ?? 0).toFixed(3), parasitism: +m(c => c.parasitism ?? 0).toFixed(3), infested: C.filter(c => c.infest > 0).length, splits: logs.filter(t => /that live as|drifted apart|divide along/.test(t)).length, errors }));
}
