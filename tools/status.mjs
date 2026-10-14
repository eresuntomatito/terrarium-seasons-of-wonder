// One compact look at the live world, for the steward's check-ins. Reads the last save and the log.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const s = JSON.parse(fs.readFileSync(ROOT + 'data/world.json', 'utf8'));
const DAY = 1800;
console.log(`tick ${s.tick} (day ${(s.tick / DAY).toFixed(1)}), season ${s.season}, saved ${Math.round((Date.now() - fs.statSync(ROOT + 'data/world.json').mtimeMs) / 1000)}s ago`);
let pl = 0, green = 0; for (const p of s.plants) { pl += p; if (p > 0) green++; }
const soil = s.fertility.reduce((a, b) => a + b, 0) / s.fertility.length;
const reefSolid = (s.reef ?? []).filter(v => v >= 0.6).length, reefAny = (s.reef ?? []).filter(v => v > 0).length;
const thick = (s.thicket ?? []).filter(v => v > 0.3).length;
console.log(`reef ${reefSolid} solid cells (${(reefSolid / s.plants.length * 100).toFixed(1)}%), thicket ${thick} cells`);
console.log(`reef-detail ${reefSolid} solid cells (${(reefSolid / s.plants.length * 100).toFixed(1)}%), ${reefAny} with any, grains ${(s.grains ?? []).length}`);
console.log(`plants ${pl.toFixed(0)} (${green}/${s.plants.length} cells green), soil ${soil.toFixed(2)}, corpses ${s.corpses.length}`);
const isVariant = r => !!((r.slip || r.variant) && !r.graduated);
const by = {}; for (const c of s.creatures) (by[c.species] ??= []).push(c);
for (const [n, cs] of Object.entries(by)) {
  const r = s.registry[n], avg = f => (cs.reduce((a, c) => a + f(c), 0) / cs.length).toFixed(2), st = s.stats[n];
  console.log(`  ${n} (${r.lineage}${isVariant(r) ? `, variant of ${r.parent}` : ''}) ${cs.length}: ${r.dietLabel ?? r.role ?? '?'} tl${r.tl} size ${avg(c => c.size)} gut ${avg(c => c.gut)} energy ${avg(c => c.energy)} gen≤${Math.max(...cs.map(c => c.gen))} drift ${r.drift ?? 0} | born ${st.born} starved ${st.starved} eaten ${st.eaten} kills ${st.kills}`);
}
const regs = Object.values(s.registry);
const sp = regs.filter(r => !isVariant(r)), vs = regs.filter(isVariant);
console.log(`species ever ${sp.length} (extinct ${sp.filter(r => r.extinct !== null).length}, held ${sp.filter(r => r.waiting).length}) | variants ever ${vs.length} (faded ${vs.filter(r => r.extinct !== null).length}, graduated ${regs.filter(r => r.graduated).length})`);
const h = s.history, step = Math.max(1, Math.floor(h.length / 8));
console.log('history:', h.filter((_, i) => i % step === 0).slice(-8).map(e => `d${(e.t / DAY).toFixed(1)} p${Math.round(e.plants)} ${Object.entries(e.pops).map(([k, v]) => k.slice(0, 5) + v).join(',')}`).join(' | '));
const log = fs.readFileSync(ROOT + 'data/server.log', 'utf8').trim().split('\n').filter(l => !/oldest .* ever recorded|th generation of/.test(l));
console.log('log:\n' + log.slice(-int(process.argv[2] ?? 15)).map(l => '  ' + l.slice(0, 200)).join('\n'));
function int(x) { return parseInt(x, 10); }
