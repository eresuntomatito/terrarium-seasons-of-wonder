// Headless check of the rollout (kin gap, home ranges, niche splits) with all three switched on at once.
import fs from 'fs';
const { World } = await import(process.cwd() + '/sim/world.mjs');
const w = new World(JSON.parse(fs.readFileSync('data/world.json', 'utf8')));
const logs = []; w.log = t => logs.push(t);
w.rollout = { kin: 0, home: 0, niche: 0 };
const C = () => w.creatures.filter(c => !c.dead && c.species !== 'kraken');
const born = () => Object.entries(w.stats).filter(([n]) => (w.registry[n]?.lineage ?? '').startsWith('P')).reduce((a, [, s]) => a + s.born, 0);
const q = a => { a.sort((x, y) => x - y); return [0.1, 0.5, 0.9].map(p => a[Math.floor(p * (a.length - 1))]?.toFixed(3)).join('/'); };
const sameGap = () => { const c = C(), g = []; for (let i = 0; i < 1500; i++) { const a = c[Math.random() * c.length | 0], b = c[Math.random() * c.length | 0]; if (a !== b && a.species === b.species) g.push(w.relatedGap(a, b)); } return q(g); };
const away = () => { const d = C().filter(c => c.home).map(c => Math.hypot(c.x - c.home.x, c.y - c.home.y)); return d.length ? q(d) : '-'; };
console.log('start: same-species kin gap', sameGap());
let errors = 0, b0 = born(); const t0 = w.tick;
for (let k = 0; k < 3; k++) {
  for (let i = 0; i < 1500; i++) { try { w.step(); } catch (e) { if (errors++ < 2) console.log('ERROR', e.message, e.stack.split('\n')[1]); } }
  const niches = C().reduce((m, c) => { const n = w.nicheOf(c); m[n] = (m[n] ?? 0) + 1; return m; }, {});
  console.log(`t+${w.tick - t0}: born +${born() - b0} | bodies ${C().length} | same-species gap ${sameGap()} | distance from home ${away()} | niches ${JSON.stringify(niches)}`);
}
console.log('errors', errors);
console.log(logs.filter(t => /live on meat|by browsing|think differently|drifted apart|divide along/.test(t)).slice(0, 6).join('\n') || '(no splits)');
