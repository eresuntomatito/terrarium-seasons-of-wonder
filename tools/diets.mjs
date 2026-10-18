// Diets for a status report's section 5b (Luis, s1683): what each species has been eating lately (each body's recent
// diet, fading over ~1 day), the family's totals, and how the ways of life have shifted across past reports.
//   node tools/diets.mjs [world]       (default data/world.json; history from data/cycles.jsonl)
import fs from 'fs';
const w = JSON.parse(fs.readFileSync(process.argv[2] ?? 'data/world.json', 'utf8'));
const C = w.creatures.filter(c => !c.dead && c.species !== 'kraken' && c.recent?.ate > 0.05);
const parts = c => { const r = c.recent, a = r.ate, meat = r.meat ?? 0, carrion = r.carrion ?? 0, browse = r.browse ?? 0, dung = r.dung ?? 0, host = r.host ?? 0;
  return { grass: Math.max(0, a - meat - browse - dung - host) / a, browse: browse / a, dung: dung / a, carrion: carrion / a, flesh: Math.max(0, meat - carrion) / a, host: host / a }; };
const by = {}; for (const c of C) (by[c.species] ??= []).push(parts(c));
const pct = v => (v * 100).toFixed(0).padStart(3) + '%', K = ['grass', 'browse', 'dung', 'carrion', 'flesh', 'host'];
const mean = a => Object.fromEntries(K.map(k => [k, a.reduce((s, p) => s + p[k], 0) / a.length]));
console.log('| Species | Bodies | ' + K.join(' | ') + ' |'); console.log('|---|---|' + K.map(() => '---').join('|') + '|');
for (const [s, a] of Object.entries(by).sort((x, y) => y[1].length - x[1].length)) { const m = mean(a); console.log(`| ${s} | ${a.length} | ` + K.map(k => pct(m[k])).join(' | ') + ' |'); }
const all = mean(Object.values(by).flat()); console.log(`| **family** | ${C.length} | ` + K.map(k => '**' + pct(all[k]).trim() + '**').join(' | ') + ' |');
try { const L = fs.readFileSync('data/cycles.jsonl', 'utf8').trim().split('\n').map(JSON.parse).filter(x => x.niches).slice(-6);
  console.log('\nWays of life at past snapshots (each body\'s recent diet):'); for (const x of L) console.log(`  ${x.label.padEnd(8)} ${Object.entries(x.niches).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`); } catch {}
