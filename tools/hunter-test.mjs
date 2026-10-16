// Headless experiment: the hunter roadmap, switched on cumulatively by variant (argv[2]: base | A | AB | ABD | ABDC | ABDCM).
//   P pyramid (meat keeps 35%) · L lunge (failed attacks cost)
//   A valley (flatter gut valley) · B skill (gape and legs) · D packkin (packs by branch) · C sizevar (wider size at birth) · M massroom
//   node tools/hunter-test.mjs <variant> [ticks=20000] [world=data/world.json]
import fs from 'fs';
const { World } = await import(process.cwd() + '/sim/world.mjs');
const v = process.argv[2], N = +process.argv[3] || 20000, src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8')));
let extinct = 0, eatenOut = 0; w.log = t => { if (/are extinct/.test(t)) { extinct++; if (/in someone's jaws/.test(t)) eatenOut++; } };
const KEYS = { A: 'valley', B: 'skill', D: 'packkin', C: 'sizevar', M: 'massroom', P: 'pyramid', L: 'lunge' };
w.rollout = { ...w.rollout, valley: Infinity, skill: Infinity, packkin: Infinity, sizevar: Infinity, massroom: Infinity, pyramid: Infinity, lunge: Infinity };
for (const ch of v === 'base' ? '' : v) w.rollout[KEYS[ch]] = 0;
// Count kills of grown bodies (at least 90% of their adult size) as they happen.
let adultKills = 0, kills = 0; const die = w.die.bind(w);
w.die = (c, cause, ...rest) => { if (cause === 'eaten' && !c.dead && c.species !== 'kraken') { kills++; if (w.bodySize(c) >= 0.9 * (c.sizeGene ?? c.size)) adultKills++; } return die(c, cause, ...rest); };
const fam = () => w.creatures.filter(c => !c.dead && c.species !== 'kraken');
const tot = key => Object.entries(w.stats).filter(([n]) => (w.registry[n]?.lineage ?? '').startsWith('P')).reduce((a, [, x]) => a + (x[key] ?? 0), 0);
const s0 = tot('starved'), b0 = tot('born');
let errors = 0, t0 = performance.now();
for (let k = 1; k <= 4; k++) {
  for (let i = 0; i < N / 4; i++) { try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); } }
  const C = fam(), m = f => C.reduce((s, c) => s + f(c), 0) / C.length, q = (a, p) => a.sort((x, y) => x - y)[Math.floor(p * (a.length - 1))];
  const sizes = C.map(c => c.sizeGene ?? c.size), sm = m(c => c.sizeGene ?? c.size);
  const niches = C.reduce((o, c) => { const n = w.nicheOf(c); o[n] = (o[n] ?? 0) + 1; return o; }, {});
  const meat = C.map(c => c.recent?.ate > 0.3 ? c.recent.meat / c.recent.ate : 0);
  console.log(JSON.stringify({ v, t: k * N / 4, bodies: C.length, species: w.living().filter(n => !w.registry[n].unique).length,
    gut: +m(c => c.bornGut ?? c.gut).toFixed(3), gutP90: +q(C.map(c => c.bornGut ?? c.gut), 0.9).toFixed(3), jaws15: C.filter(c => c.gut > 0.15).length, jaws25: C.filter(c => c.gut > 0.25).length,
    kills, adultKills, extinct, eatenOut, smallest: Math.min(...w.living().filter(n => !w.registry[n].unique).map(n => C.filter(c => c.species === n).length)), starved: tot('starved') - s0, born: tot('born') - b0,
    size: +sm.toFixed(2), sizeSd: +Math.sqrt(m(c => ((c.sizeGene ?? c.size) - sm) ** 2)).toFixed(2), sizeMin: +q(sizes, 0).toFixed(1), sizeMax: +q(sizes, 1).toFixed(1),
    gape: +m(c => c.gape ?? 0.5).toFixed(3), legs: +m(c => c.legs ?? 1).toFixed(3), meatP90: +(q(meat, 0.9) * 100).toFixed(1), meatMax: +(q(meat, 1) * 100).toFixed(0), niches,
    msPerTick: +((performance.now() - t0) / (N / 4)).toFixed(1), errors }));
  t0 = performance.now();
}
