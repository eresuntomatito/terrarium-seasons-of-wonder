// Does a longer grace help a new species last? (Luis, s2587.) From one save, force the same split (a gene band of quilikes, gathered
// within 200), then run with a chosen grace and follow the new species season by season.
// Run: GRACE=base|3|5 [BAND='top browsers'] node tools/split-test.mjs <save> <seasons> > out.log
import fs from 'node:fs';
import { World, PHYSICS as P, SEASON_TICKS } from '../sim/world.mjs';
const raw = JSON.parse(fs.readFileSync(process.argv[2])), seasons = +(process.argv[3] ?? 18), grace = process.env.GRACE ?? 'base', band = process.env.BAND ?? 'top browsers';
if (grace !== 'base') { raw.rollout.gracegen = raw.season; raw.tune = { ...(raw.tune ?? {}), graceGens: +grace, graceCap: 30 }; }
const w = new World(raw);
const group = w.creatures.filter(c => !c.dead && c.species === 'quilike' && !c.morph && c.k?.length);
const members = new Map(w.geneBands('quilike', group)).get(band); if (!members) throw new Error('no band ' + band);
const local = w.gather(members, 200), values = local[0].k.map((_, j) => Math.exp(local.reduce((a, c) => a + Math.log(Math.max(1e-9, c.k[j])), 0) / local.length));
const before = new Set(Object.keys(w.registry)); w.splitSpecies('quilike', local, values, 'quilike', `${local.length} quilikes with ${band} split (test)`);
const name = Object.keys(w.registry).find(n => !before.has(n));
const born0 = () => w.stats[name] ?? {};
console.log(JSON.stringify({ grace, band, founders: local.length, name }));
for (let s = 1; s <= seasons; s++) {
  for (let t = 0; t < SEASON_TICKS; t++) w.step();
  const r = w.registry[name], alive = w.creatures.filter(c => !c.dead && c.species === name), st = born0();
  console.log(JSON.stringify({ s, alive: alive.length, inGrace: w.graceOn(r), maxGen: r.maxGen ?? null, blended: !!r.blended, extinct: r.extinct, born: st.born ?? 0, starved: st.starved ?? 0, eaten: st.eaten ?? 0, old: st.old ?? 0, others: w.creatures.filter(c => !c.dead && c.species !== name).length }));
  if (!alive.length) break;
}
