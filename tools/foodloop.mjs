// The food-loop directive's readout (Luis, s2303: provoke insect- and carrion-eating; keep trees alive). Reads data/world.json only.
// Run: node tools/foodloop.mjs
import fs from 'node:fs';
import { World, PHYSICS as P } from '../sim/world.mjs';
const w = new World(JSON.parse(fs.readFileSync('data/world.json'))), cs = w.creatures.filter(c => !c.dead);
const sum = a => Array.from(a ?? []).reduce((s, x) => s + x, 0), mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
// Recent diet, from each body's own fading record: shares of what it ate lately.
const R = { ate: 0, meat: 0, carrion: 0, browse: 0, dung: 0, insect: 0, host: 0 };
for (const c of cs) { const r = c.recent; if (!r) continue; for (const k of Object.keys(R)) R[k] += r[k] ?? 0; }
const pct = k => (100 * R[k] / (R.ate || 1)).toFixed(1);
const trees = { sap: [0, 0, 0, 0], mat: [0, 0, 0, 0], canopy: [0, 0, 0, 0] };
for (let i = 0; i < w.trees.length; i++) if (w.trees[i] > 0.01) { const k = w.treeKind[i]; (w.trees[i] >= P.treeMature ? trees.mat : trees.sap)[k]++; trees.canopy[k] += w.trees[i]; }
const st = w.stats[cs[0]?.species] ?? {};
console.log(JSON.stringify({
  season: w.season, bodies: cs.length, starved: st.starved, born: st.born, fat: +mean(cs.map(c => c.fat ?? 0)).toFixed(3),
  dietPct: { carrion: +pct('carrion'), insect: +pct('insect'), meat: +pct('meat'), dung: +pct('dung'), browse: +pct('browse') },
  eaters: { carrion10: cs.filter(c => c.recent?.ate > 0.3 && (c.recent.carrion ?? 0) / c.recent.ate >= 0.1).length, insect10: cs.filter(c => c.recent?.ate > 0.3 && (c.recent.insect ?? 0) / c.recent.ate >= 0.1).length },
  genes: { gut: +mean(cs.map(c => c.gut)).toFixed(3), snap: +mean(cs.map(c => c.snap ?? 0)).toFixed(3), decomp: +mean(cs.map(c => c.decomp ?? 0)).toFixed(3) },
  insects: { energy: +(sum(w.insects) * P.insScale).toFixed(2), cells: Array.from(w.insects ?? []).filter(v => v > 0.01).length, bloom: +sum(w.bloom).toFixed(1) },
  corpses: { n: w.corpses.length, energy: +w.corpses.reduce((s, c) => s + (c.energy ?? 0), 0).toFixed(1) },
  trees: { fruit: `${trees.sap[1]}/${trees.mat[1]}`, nut: `${trees.sap[2]}/${trees.mat[2]}`, conifer: `${trees.sap[3]}/${trees.mat[3]}`, canopy: trees.canopy.slice(1).map(x => +x.toFixed(1)), fruitStore: +sum(w.fruit).toFixed(2) },
  grass: { food: w.grassFood, lean: w.grassLean }, tune: w.tune ?? {},
}));
