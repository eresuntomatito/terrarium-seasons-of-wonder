// Old vs new for any set of rollout keys, on one private copy, in parallel (s2261: C+D, trees2+smallfood).
// Run: node tools/variant-test.mjs <save> <seasons> key1,key2 [outDir]   (worker: --worker <old|new> <save> <seasons> <keys> <out>)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { World, PHYSICS as P, SEASON_TICKS } from '../sim/world.mjs';
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const corr = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); x += (a[i] - ma) ** 2; y += (b[i] - mb) ** 2; } return x && y ? s / Math.sqrt(x * y) : 0; };
const r3 = x => Number.isFinite(x) ? +x.toFixed(3) : null;
if (process.argv[2] === '--worker') {
  const [v, save, seasons, keys, out] = process.argv.slice(3), raw = JSON.parse(fs.readFileSync(save));
  for (const k of keys.split(',')) { delete raw.rollout[k]; if (v === 'new') raw.rollout[k] = raw.season; }
  const w = new World(raw); w.log = () => {}; const rows = []; let errors = 0;
  for (let s = 1; s <= +seasons; s++) {
    const st0 = Object.values(w.stats).reduce((a, x) => a + (x.starved ?? 0), 0), food = {}, t0 = Date.now();
    const f = w.feedNow.bind(w); w.feedNow = (c, e, l, k) => { f(c, e, l, k); if (e > 0) food[k] = (food[k] ?? 0) + e; };
    for (let i = 0; i < SEASON_TICKS; i++) { try { w.step(); } catch (e) { errors++; console.error(e.stack); break; } }
    w.feedNow = f;
    const cs = w.creatures.filter(c => !c.dead && c.age > P.growTicks), sz = cs.map(c => c.sizeGene ?? c.size), el = cs.map(c => w.elevAt(c.x, c.y));
    const high = cs.filter((c, i) => el[i] >= 0.5).map(c => c.sizeGene ?? c.size), low = cs.filter((c, i) => el[i] < 0.5).map(c => c.sizeGene ?? c.size);
    const trees = { sap: [0, 0, 0, 0], mat: [0, 0, 0, 0] }; for (let i = 0; i < w.trees.length; i++) if (w.trees[i] > 0.01) (w.trees[i] >= P.treeMature ? trees.mat : trees.sap)[w.treeKind[i]]++;
    const tot = Object.values(food).reduce((a, b) => a + b, 0), share = k => r3(100 * (food[k] ?? 0) / (tot || 1));
    const row = { v, s, season: w.season, bodies: w.creatures.filter(c => !c.dead).length, starved: Object.values(w.stats).reduce((a, x) => a + (x.starved ?? 0), 0) - st0,
      sizeMean: r3(mean(sz)), sizeSD: r3(sd(sz)), corrSizeElev: r3(corr(sz, el)), sizeHigh: r3(mean(high)), sizeLow: r3(mean(low)), nHigh: high.length,
      climbTicks: w.climbTicks ?? 0, fruitTrees: `${trees.sap[1]}/${trees.mat[1]}`, nutTrees: `${trees.sap[2]}/${trees.mat[2]}`, conifers: `${trees.sap[3]}/${trees.mat[3]}`,
      dietPct: { grass: share('plant'), browse: share('browse'), fruit: share('fruit'), nut: share('nut'), cone: share('cone'), dung: share('dung') },
      msPerTick: r3((Date.now() - t0) / SEASON_TICKS), errors };
    rows.push(row); console.log(JSON.stringify(row)); if (errors) break;
  }
  fs.writeFileSync(out, JSON.stringify(rows)); process.exitCode = errors ? 1 : 0;
} else {
  const [src, seasons = '8', keys] = process.argv.slice(2), dir = process.argv[5] ?? fs.mkdtempSync(path.join(os.tmpdir(), 'terrarium-variant-'));
  fs.mkdirSync(dir, { recursive: true }); const save = path.join(dir, 'world.json'); fs.copyFileSync(src, save);
  await Promise.all(['old', 'new'].map(v => new Promise(res => spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker', v, save, seasons, keys, path.join(dir, v + '.json')], { stdio: 'inherit' }).on('exit', res))));
  fs.rmSync(save); console.log(`done; results in ${dir}`);
}
