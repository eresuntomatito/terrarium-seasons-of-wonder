// Steward readout (run from the project root: node tools/defence.mjs): food-made defences (toxin from thicket, shell from minerals) and who eats whom.
import fs from 'fs';
const w = JSON.parse(fs.readFileSync('data/world.json', 'utf8'));
const q = a => { a = a.slice().sort((x, y) => x - y); return a.length ? [0.1, 0.5, 0.9].map(p => a[Math.floor(p * (a.length - 1))].toFixed(2)).join('/') : '-'; };
const by = {}; for (const c of w.creatures) (by[c.species] ??= []).push(c);
for (const [s, a] of Object.entries(by)) {
  if (a.length < 3 && s !== 'kraken') continue;
  console.log(`${s} ${a.length}: toxGene ${q(a.map(c => c.toxin ?? 0))} toxStock ${q(a.map(c => c.toxStock ?? 1))} effTox ${q(a.map(c => (c.toxin ?? 0) * (c.toxStock ?? 1)))} | armGene ${q(a.map(c => c.armor ?? 0))} minStock ${q(a.map(c => c.minStock ?? 1))} effArm ${q(a.map(c => (c.armor ?? 0) * (c.minStock ?? 1)))} | resist ${q(a.map(c => c.resist ?? 0.3))}`);
}
// Habitat split per tortoise-family species (palatable / toxic, soft / shelled).
const tox = c => (c.toxin ?? 0) * (c.toxStock ?? 1), arm = c => (c.armor ?? 0) * (c.minStock ?? 1);
const lin = w.registry ?? {};
for (const [s, T] of Object.entries(by)) {
  if (T.length < 10 || (T[0].gut ?? 0) > 0.5) continue;
  const n = (a, b) => T.filter(c => (tox(c) >= 0.25) === a && (arm(c) >= 0.25) === b).length;
  const cx = T.reduce((a, c) => a + c.x, 0) / T.length, cy = T.reduce((a, c) => a + c.y, 0) / T.length;
  console.log(`${s} morphs (centre ${cx.toFixed(0)},${cy.toFixed(0)}): palatable&soft ${n(false, false)} toxic&soft ${n(true, false)} palatable&shelled ${n(false, true)} toxic&shelled ${n(true, true)}`);
}
console.log(`kills: kraken ${w.stats.kraken?.kills} stalker ${w.stats.stalker?.kills} | tick ${w.tick}`);
// Ground (grass loops): root health of land cells, and the soil.
if (w.rootHealth?.length) { const r = Object.values(w.rootHealth), reef = Object.values(w.reef ?? {}); let worn = 0, rec = 0, ok = 0; r.forEach((v, i) => { if ((reef[i] ?? 0) >= 0.6) return; if (v < 0.3) worn++; else if (v < 0.8) rec++; else ok++; }); console.log(`ground: roots worn ${worn} recovering ${rec} healthy ${ok}`); }
