// A/B a food or behaviour rollout on a copy of the live save (Luis, s2448: food values, follow).
// Run: ROLLOUT=k1,k2 node tools/food-test.mjs <save> <seasons> > out.log   (ROLLOUT empty = the control arm)
import fs from 'node:fs';
import { World, PHYSICS as P, SEASON_TICKS } from '../sim/world.mjs';
const raw = JSON.parse(fs.readFileSync(process.argv[2])), seasons = +(process.argv[3] ?? 4), keys = (process.env.ROLLOUT ?? '').split(',').filter(Boolean);
for (const k of keys) raw.rollout[k] = raw.season;
if (process.env.TUNE) raw.tune = { ...(raw.tune ?? {}), ...JSON.parse(process.env.TUNE) }; // TUNE='{"key":value}' parameter overrides for this arm
const w = new World(raw), inc = {}, feed = w.feed.bind(w), die = w.die.bind(w), dead = {};
w.feed = (c, e, l, kind) => { if (e > 0) inc[kind] = (inc[kind] ?? 0) + e; return feed(c, e, l, kind); };
w.die = (c, why, ...a) => { const k = why + (c.age < P.maturity * (c.mature ?? 1) ? ':young' : ''); dead[k] = (dead[k] ?? 0) + 1; return die(c, why, ...a); };
const born0 = () => Object.values(w.stats).reduce((a, s) => a + (s.born ?? 0), 0); let b0 = born0();
for (let s = 1; s <= seasons; s++) {
  for (let t = 0; t < SEASON_TICKS; t++) w.step();
  const cs = w.creatures.filter(c => !c.dead), T = Object.values(inc).reduce((a, b) => a + b, 0), sp = {};
  for (const c of cs) sp[c.species] = (sp[c.species] ?? 0) + 1;
  let can = [0, 0, 0, 0]; for (let i = 0; i < w.trees.length; i++) if (w.trees[i] >= P.treeMature) can[w.treeKind[i]] += w.trees[i];
  console.log(JSON.stringify({ arm: (keys.join('+') || 'control') + (process.env.TUNE ? '+tune' : ''), s, season: w.season, bodies: cs.length, species: sp, born: born0() - b0, deaths: { ...dead }, fat: +(cs.reduce((a, c) => a + (c.fat ?? 0), 0) / cs.length).toFixed(3),
    diet: Object.fromEntries(Object.entries(inc).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(100 * v / T).toFixed(1)])), canopy: can.slice(1).map(x => +x.toFixed(1)), fruitStore: +w.fruit.reduce((a, b) => a + b, 0).toFixed(2), insects: +(w.insects.reduce((a, b) => a + b, 0) * P.insScale).toFixed(1) }));
  for (const k in inc) delete inc[k]; for (const k in dead) delete dead[k]; b0 = born0();
}
