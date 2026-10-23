// Skills cost + body test 2 (s2235): old vs new on one private copy, 10 seasons each in parallel.
// Run: node tools/skillcost-test.mjs <save> [outDir]; worker: --worker <old|new> <save> <out>.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { World, PHYSICS as P, W, H, SEASON_TICKS } from '../sim/world.mjs';
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const wrap = (x, m) => (x % m + m) % m;
const SK = ['climb', 'swim', 'browse', 'snap', 'bite', 'decomp', 'parasitism'];
const corr = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); x += (a[i] - ma) ** 2; y += (b[i] - mb) ** 2; } return x && y ? s / Math.sqrt(x * y) : 0; };
if (process.argv[2] === '--worker') {
  const [v, save, out] = process.argv.slice(3), raw = JSON.parse(fs.readFileSync(save));
  delete raw.rollout.skillcost; delete raw.rollout.bodytest2;
  if (v === 'new') { raw.rollout.skillcost = raw.season; raw.rollout.bodytest2 = raw.season; }
  const w = new World(raw); w.log = () => {}; const st = w.spStat(); st.passed = {}; st.blocked = {}; st.gaps = [];
  const rows = []; let errors = 0;
  for (let s = 1; s <= 10; s++) {
    const st0 = w.stats; const starved0 = Object.values(w.stats).reduce((a, x) => a + (x.starved ?? 0), 0); const t0 = Date.now();
    for (let i = 0; i < SEASON_TICKS; i++) { try { w.step(); } catch (e) { errors++; console.error(e.stack); break; } }
    const cs = w.creatures.filter(c => !c.dead), S = cs.map(c => SK.reduce((a, k) => a + (c[k] ?? 0), 0));
    for (const c of cs) { const xs = wrap(c.x - P.seamX, W), rx = wrap(P.riverX * W + 22 * Math.sin(c.y / 70) - P.seamX, W); c._r = (wrap(c.y, H) < P.ridgeY * H ? 'N' : 'S') + (xs < rx ? 'W' : 'E'); }
    const bw = t => { const mu = mean(cs.map(c => c[t] ?? 0)); let b = 0, wi = 0; for (const r of ['NW', 'NE', 'SW', 'SE']) { const g = cs.filter(c => c._r === r); if (!g.length) continue; const m = mean(g.map(c => c[t] ?? 0)); b += g.length * (m - mu) ** 2; wi += g.reduce((a, c) => a + ((c[t] ?? 0) - m) ** 2, 0); } return +(b / wi).toFixed(4); };
    const last = st.gaps.at(-1);
    const row = { v, s, season: w.season, bodies: cs.length, species: new Set(cs.map(c => c.species)).size,
      starved: Object.values(w.stats).reduce((a, x) => a + (x.starved ?? 0), 0) - starved0,
      S: +mean(S).toFixed(3), climb: +mean(cs.map(c => c.climb)).toFixed(3), swim: +mean(cs.map(c => c.swim)).toFixed(3), browse: +mean(cs.map(c => c.browse)).toFixed(3),
      corrClimbSwim: +corr(cs.map(c => c.climb), cs.map(c => c.swim)).toFixed(3), bwClimb: bw('climb'), bwSwim: bw('swim'),
      passed: { ...st.passed }, blocked: { ...st.blocked }, lastTry: last ? { kind: last.kind, f: last.founders, rms: last.rms, nul: last.nul, ok: last.ok } : null,
      msPerTick: +((Date.now() - t0) / SEASON_TICKS).toFixed(2), errors };
    rows.push(row); console.log(JSON.stringify(row)); if (errors) break;
  }
  fs.writeFileSync(out, JSON.stringify(rows)); process.exitCode = errors ? 1 : 0;
} else {
  const save = process.argv[2], dir = process.argv[3] ?? path.dirname(save);
  await Promise.all(['old', 'new'].map(v => new Promise(res => spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker', v, save, path.join(dir, v + '.json')], { stdio: 'inherit' }).on('exit', res))));
  fs.rmSync(save); console.log('done; save copy removed');
}
