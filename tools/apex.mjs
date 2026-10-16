// Readout for the "room for an apex" rules (s1371): is anything on the path to an apex predator?
//   node tools/apex.mjs
// Per species: bodies, size (inherited) and grown size (with growth after adulthood), gut, gape, kills, and how many live
// as hunters / apex by recent diet; the family's largest bodies; shells; mass shares (rare-room).
import fs from 'fs';
const w = JSON.parse(fs.readFileSync('data/world.json', 'utf8'));
const C = w.creatures.filter(c => !c.dead && w.registry[c.species] && !w.registry[c.species].unique);
const by = {}; for (const c of C) (by[c.species] ??= []).push(c);
const m = (a, f) => a.reduce((s, c) => s + (f(c) ?? 0), 0) / a.length, mass = s => (s / 5) ** 2;
const niche = c => { const r = c.recent; if (!r || r.ate < 0.3) return 'grazer'; if ((r.apex ?? 0) / r.ate >= 0.3) return 'apex'; if (r.meat / r.ate >= 0.6) return 'hunter'; if (r.meat / r.ate >= 0.2) return 'omnivore'; return 'other'; };
const totMass = C.reduce((s, c) => s + mass(c.size * (c.grown ?? 1)), 0);
console.log(`season ${w.season} · bodies ${C.length} · rules from s${w.rollout?.growon ?? '—'} · family mass ${totMass.toFixed(0)}`);
for (const [n, a] of Object.entries(by).sort((x, y) => y[1].length - x[1].length)) {
  const ns = a.reduce((o, c) => { const k = niche(c); o[k] = (o[k] ?? 0) + 1; return o; }, {});
  const sm = a.reduce((s, c) => s + mass(c.size * (c.grown ?? 1)), 0);
  console.log(`  ${n.padEnd(10)} ${String(a.length).padStart(3)} · size ${m(a, c => c.size).toFixed(2)} → grown ${m(a, c => c.size * (c.grown ?? 1)).toFixed(2)} (max ${Math.max(...a.map(c => c.size * (c.grown ?? 1))).toFixed(1)}) · gut ${m(a, c => c.gut).toFixed(3)} (max ${Math.max(...a.map(c => c.gut)).toFixed(2)}) · gape ${m(a, c => c.gape ?? 0.5).toFixed(2)} · armour ${m(a, c => c.armor ?? 0).toFixed(2)} · kills ${w.stats[n]?.kills ?? 0} · mass share ${(sm / totMass * 100).toFixed(0)}% · ${JSON.stringify(ns)}`);
}
const big = [...C].sort((a, b) => b.size * (b.grown ?? 1) - a.size * (a.grown ?? 1)).slice(0, 5);
console.log(`largest bodies: ${big.map(c => `${c.species} ${(c.size * (c.grown ?? 1)).toFixed(1)} (gut ${c.gut.toFixed(2)})`).join(' · ')}`);
console.log(`apex by diet: ${C.filter(c => niche(c) === 'apex').length} · hunters by diet: ${C.filter(c => niche(c) === 'hunter').length} · max gut ${Math.max(...C.map(c => c.gut)).toFixed(2)}`);
