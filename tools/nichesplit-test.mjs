// Stable-band niche splits (s2315, Luis): old vs new (lifeDiffNiche, held 10 checks, 20 founders), with what happens to new species.
// Run: node tools/nichesplit-test.mjs <save> <seasons> [outDir]   (worker: --worker <old|new> <save> <seasons> <out>)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { World, PHYSICS as P, SEASON_TICKS } from '../sim/world.mjs';
if (process.argv[2] === '--worker') {
  const [v, save, seasons, out] = process.argv.slice(3), raw = JSON.parse(fs.readFileSync(save));
  if (v === 'new') raw.tune = { ...(raw.tune ?? {}), lifeDiffNiche: 1, nicheDays: 9, nicheFounders: 20 };
  const w = new World(raw); w.log = () => {}; const deaths = {}, born = {}, splits = [];
  const die = w.die.bind(w); w.die = (c, cause) => { if (!c.dead) { const d = deaths[c.species] ??= {}; d[cause] = (d[cause] ?? 0) + 1; d[cause + (c.age < P.growTicks ? ':young' : '')] = (d[cause + (c.age < P.growTicks ? ':young' : '')] ?? 0) + 0; } return die(c, cause); };
  const split = w.splitSpecies.bind(w); w.splitSpecies = (...a) => { splits.push({ season: w.season, parent: a[0], founders: a[1].length, why: a[4] ?? 'drift' }); return split(...a); };
  const rows = []; let errors = 0;
  for (let s = 1; s <= +seasons; s++) {
    for (let i = 0; i < SEASON_TICKS; i++) { try { w.step(); } catch (e) { errors++; console.error(e.stack); break; } }
    const cs = w.creatures.filter(c => !c.dead), per = {};
    for (const c of cs) per[c.species] = (per[c.species] ?? 0) + 1;
    const kills = Object.fromEntries(Object.entries(w.stats).filter(([n]) => per[n]).map(([n, st]) => [n, st.kills ?? 0]));
    const row = { v, s, season: w.season, bodies: cs.length, species: per, splits: splits.length, deaths: JSON.parse(JSON.stringify(deaths)), kills, blocked: { ...w.spStat().blocked }, passed: { ...w.spStat().passed }, errors };
    rows.push(row); console.log(JSON.stringify(row)); if (errors) break;
  }
  fs.writeFileSync(out, JSON.stringify({ rows, splits })); process.exitCode = errors ? 1 : 0;
} else {
  const [src, seasons = '12'] = process.argv.slice(2), dir = process.argv[4] ?? fs.mkdtempSync(path.join(os.tmpdir(), 'terrarium-nichesplit-'));
  fs.mkdirSync(dir, { recursive: true }); const save = path.join(dir, 'world.json'); fs.copyFileSync(src, save);
  await Promise.all(['old', 'new'].map(v => new Promise(res => spawn('nice', ['-n', '10', process.execPath, fileURLToPath(import.meta.url), '--worker', v, save, seasons, path.join(dir, v + '.json')], { stdio: 'inherit' }).on('exit', res))));
  fs.rmSync(save); console.log(`done; results in ${dir}`);
}
