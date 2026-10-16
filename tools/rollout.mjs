// Live readout for the rollout (kin gap, home ranges, niches) from data/world.json.
import fs from 'fs';
const w = JSON.parse(fs.readFileSync('data/world.json', 'utf8'));
const C = w.creatures.filter(c => !c.dead && c.species !== 'kraken'), W = 960, H = 640;
const d = (a, b, m) => { let x = Math.abs(a - b); return Math.min(x, m - x); };
const q = a => { a.sort((x, y) => x - y); return a.length ? [0.1, 0.5, 0.9].map(p => a[Math.floor(p * (a.length - 1))].toFixed(0)).join('/') : '-'; };
const r = w.rollout ?? {};
const on = k => w.season >= (r[k] ?? Infinity) ? 'ON' : `at season ${r[k]}`;
const niche = c => { // the world's nicheOf (label-based, recent diet)
  const r = c.recent; if (!r || r.ate < 0.3) return 'grazer';
  if ((r.host ?? 0) / r.ate >= 0.25) return 'parasite'; if ((r.dung ?? 0) / r.ate >= 0.25) return 'decomposer';
  const meat = r.meat / r.ate, browse = r.browse / r.ate, grass = 1 - meat - browse, dead = r.meat > 0 ? (r.carrion ?? 0) / r.meat : 0;
  if (meat >= 0.6) return dead >= 0.5 ? 'scavenger' : 'hunter';
  if (meat >= 0.3 && dead >= 0.5) return 'scavenger';
  if (meat >= 0.2) return 'omnivore';
  if (browse >= 0.5) return 'browser';
  if (browse >= 0.2 && grass >= 0.2) return 'mixed feeder';
  return 'grazer'; };
const meatShare = C.map(c => c.recent?.ate > 0.3 ? c.recent.meat / c.recent.ate : 0).sort((a, b) => a - b); // recent diet
console.log(`season ${w.season} | kin ${on('kin')} · home ${on('home')} · niche ${on('niche')}`);
console.log(`home distance p10/50/90: ${q(C.filter(c => c.home).map(c => Math.hypot(d(c.x, c.home.x, W), d(c.y, c.home.y, H))))} px (${C.filter(c => c.home).length} with a home)`);
console.log(`niches ${JSON.stringify(C.reduce((m, c) => { const n = niche(c); m[n] = (m[n] ?? 0) + 1; return m; }, {}))} · meat share p50/p90/max ${[0.5, 0.9, 1].map(p => (meatShare[Math.floor(p * (meatShare.length - 1))] * 100).toFixed(0) + '%').join('/')} · hidden-mind carriers ${C.filter(c => c.morph).length}`);
