// Live readout of the evolving grass (rollout.grassvar): strains in the driest and wettest thirds of the grassy cells
// (by today's moisture) and in the cold north / warm south.
//   node tools/grass.mjs
import fs from 'fs';
const w = JSON.parse(fs.readFileSync('data/world.json', 'utf8'));
const H = w.grassHardy ?? [], S = w.grassSweet ?? [], P = w.plants, M = w.moisture ?? [], GW = 120;
if (!H.length) { console.log('no grass strains saved yet'); process.exit(); }
const live = [...P.keys()].filter(i => P[i] > 0.02), mean = (a, x) => a.length ? (a.reduce((s, i) => s + x[i], 0) / a.length).toFixed(3) : '-';
const byM = M.length ? [...live].sort((a, b) => M[a] - M[b]) : live, third = Math.floor(byM.length / 3);
const dry = byM.slice(0, third), wet = byM.slice(-third), north = live.filter(i => Math.floor(i / GW) < 40), south = live.filter(i => Math.floor(i / GW) >= 40);
const sd = (a, x) => { const m = a.reduce((s, i) => s + x[i], 0) / a.length; return Math.sqrt(a.reduce((s, i) => s + (x[i] - m) ** 2, 0) / a.length).toFixed(3); };
console.log(`season ${w.season} · grassvar ${w.season >= (w.rollout?.grassvar ?? Infinity) ? 'ON' : 'at ' + w.rollout?.grassvar} · grassy cells ${live.length}`);
console.log(`hardiness all ${mean(live, H)} (sd ${sd(live, H)}) · dry third ${mean(dry, H)} · wet third ${mean(wet, H)} · north ${mean(north, H)} · south ${mean(south, H)}`);
console.log(`sweetness all ${mean(live, S)} (sd ${sd(live, S)}) · dry third ${mean(dry, S)} · wet third ${mean(wet, S)} · north ${mean(north, S)} · south ${mean(south, S)}`);
