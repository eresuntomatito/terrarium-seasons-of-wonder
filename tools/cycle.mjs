// Cycle snapshot (every ~15,000 ticks during a monitoring run): appends one line to data/cycles.jsonl with the world's
// state and, from the selection ledger, which traits the living, the breeders and each cause of death carry —
// the raw material for a report's "what shapes the species" analysis.
//   node tools/cycle.mjs [label]
import fs from 'fs';
import { World, LEDGER } from '../sim/world.mjs';
const w = JSON.parse(fs.readFileSync('data/world.json', 'utf8'));
const S = 5400, C = w.creatures.filter(c => !c.dead && c.species !== 'kraken');
const TRAITS = Object.fromEntries(LEDGER);
const mean = (a, f) => a.length ? a.reduce((s, c) => s + f(c), 0) / a.length : null;
const living = Object.fromEntries(Object.entries(TRAITS).map(([k, f]) => [k, +mean(C, f).toFixed(4)]));
const sd = Object.fromEntries(Object.entries(TRAITS).map(([k, f]) => { const m = living[k]; return [k, +Math.sqrt(mean(C, c => (f(c) - m) ** 2)).toFixed(4)]; }));
const L = w.ledger ?? { deaths: {}, parents: { n: 0 } };
const book = e => e && e.n ? { n: e.n, ...Object.fromEntries(Object.keys(TRAITS).map(k => [k, +((e[k] ?? 0) / e.n).toFixed(4)])) } : { n: 0 };
const species = {};
for (const c of C) (species[c.species] ??= []).push(c);
const plants = w.history?.at(-1)?.plants ?? 0; // the world's own grass total (the save stores grass rounded per cell)
const niche = c => { const r = c.recent; if (!r || r.ate < 0.3) return 'grazer'; if ((r.host ?? 0) / r.ate >= 0.25) return 'parasite'; if ((r.dung ?? 0) / r.ate >= 0.25) return 'decomposer'; if ((r.apex ?? 0) / r.ate >= 0.3) return 'apex'; const meat = r.meat / r.ate, br = r.browse / r.ate, grass = 1 - meat - br, dead = r.meat > 0 ? (r.carrion ?? 0) / r.meat : 0;
  if (meat >= 0.6) return dead >= 0.5 ? 'scavenger' : 'hunter'; if (meat >= 0.3 && dead >= 0.5) return 'scavenger'; if (meat >= 0.2) return 'omnivore'; if (br >= 0.5) return 'browser'; if (br >= 0.2 && grass >= 0.2) return 'mixed feeder'; return 'grazer'; };
const habitat = Object.assign(Object.create(World.prototype), { rollout: w.rollout, season: w.season });
const snap = {
  label: process.argv[2] ?? '', time: new Date().toISOString(), tick: w.tick, season: Math.floor(w.tick / S), bodies: C.length, plants: Math.round(plants),
  species: Object.fromEntries(Object.entries(species).map(([n, a]) => [n, { n: a.length, gut: +mean(a, TRAITS.gut).toFixed(3), browse: +mean(a, TRAITS.browse).toFixed(3), size: +mean(a, TRAITS.size).toFixed(2) }])),
  niches: C.reduce((o, c) => { const n = habitat.rolled('habitat') ? habitat.nicheOf(c) : niche(c); o[n] = (o[n] ?? 0) + 1; return o; }, {}),
  living, sd, parents: book(L.parents), deaths: Object.fromEntries(Object.entries(L.deaths).map(([k, e]) => [k, book(e)])),
  kraken: (() => { const k = w.creatures.find(c => c.species === 'kraken'); return k ? { gen: k.gen, energy: +k.energy.toFixed(2), dormant: !!k.dormant, kills: w.stats.kraken.kills } : null; })(),
};
fs.appendFileSync('data/cycles.jsonl', JSON.stringify(snap) + '\n');
console.log(`cycle ${snap.label} · tick ${snap.tick} · season ${snap.season} · bodies ${snap.bodies} · species ${Object.keys(species).length} · plants ${snap.plants} · niches ${JSON.stringify(snap.niches)} · ledger: parents ${snap.parents.n}, deaths ${JSON.stringify(Object.fromEntries(Object.entries(snap.deaths).map(([k, v]) => [k, v.n])))}`);
