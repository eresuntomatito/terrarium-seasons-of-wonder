// The body footprint (rollout.footprint, Luis s2012 decision 9): six seasons old vs new on one private copy.
// Run: node tools/footprint-test.mjs [save] [outDir]. Workers run niced in parallel; results go to outDir (default: a temp dir).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { World, W, H, SEASON_TICKS } from '../sim/world.mjs';
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const wrap = (x, m) => (x % m + m) % m;
const delta = (a, b, m) => wrap(b - a + m / 2, m) - m / 2;
// Bodies overlapping another body's drawn length (0.45 × size, as the viewer draws them), and the largest pile.
function piles(w, cs) {
  let overlapping = 0, biggest = 0;
  for (const c of cs) {
    let n = 0; const r = 0.45 * w.bodySize(c);
    for (const o of cs) if (o !== c && Math.hypot(delta(c.x, o.x, W), delta(c.y, o.y, H)) < r) n++;
    if (n) overlapping++; biggest = Math.max(biggest, n + 1);
  }
  return { overlapping, biggest };
}
if (process.argv[2] === '--worker') {
  const [variant, save, output] = process.argv.slice(3), raw = JSON.parse(fs.readFileSync(save));
  raw.rollout ??= {}; delete raw.rollout.footprint; if (variant === 'new') raw.rollout.footprint = raw.season;
  const w = new World(raw); w.log = () => {};
  const die = w.die.bind(w), child = w.child.bind(w); let born = 0, starved = 0, eaten = 0;
  w.child = (...a) => { born++; return child(...a); };
  w.die = (c, cause) => { if (!c.dead) { if (cause === 'starved') starved++; if (cause === 'eaten') eaten++; } return die(c, cause); };
  const rows = []; let errors = 0, elapsed = 0;
  for (let s = 1; s <= 6; s++) {
    born = starved = eaten = 0; const start = performance.now(); let willing = 0, samples = 0, pile = { overlapping: 0, biggest: 0 };
    for (let i = 0; i < SEASON_TICKS; i++) {
      try { w.step(); } catch (e) { errors++; console.error(e.stack); break; }
      if (i % 300 === 0) { const cs = w.creatures.filter(c => !c.dead); const p = piles(w, cs); pile.overlapping += p.overlapping / cs.length; pile.biggest = Math.max(pile.biggest, p.biggest); willing += mean(cs.map(c => +!!c.willing)); samples++; }
    }
    elapsed += performance.now() - start;
    const cs = w.creatures.filter(c => !c.dead);
    const row = { variant, s, season: w.season, bodies: cs.length, species: new Set(cs.map(c => c.species)).size, births: born, starved, eaten,
      overlapShare: +(pile.overlapping / samples).toFixed(3), biggestPile: pile.biggest, willingShare: +(willing / samples).toFixed(3), errors };
    rows.push(row); console.log(JSON.stringify(row)); if (errors) break;
  }
  fs.writeFileSync(output, JSON.stringify({ rows, errors, msPerTick: elapsed / (6 * SEASON_TICKS) })); process.exitCode = errors ? 1 : 0;
} else {
  const dir = process.argv[3] ?? fs.mkdtempSync(path.join(os.tmpdir(), 'terrarium-footprint-')); fs.mkdirSync(dir, { recursive: true });
  const save = path.join(dir, 'world.json'); fs.copyFileSync(path.resolve(process.argv[2] ?? 'data/world.json'), save);
  console.log(`Private save: ${save}; six seasons each, old and new in parallel (nice 10).`);
  const results = Object.fromEntries(await Promise.all(['old', 'new'].map(async v => {
    const output = path.join(dir, `${v}.json`);
    const code = await new Promise((res, rej) => { const p = spawn('nice', ['-n', '10', process.execPath, fileURLToPath(import.meta.url), '--worker', v, save, output], { stdio: 'inherit' }); p.on('error', rej); p.on('exit', res); });
    if (code !== 0) process.exitCode = 1; return [v, JSON.parse(fs.readFileSync(output))];
  })));
  for (const [v, r] of Object.entries(results)) {
    const t = k => r.rows.reduce((s, x) => s + x[k], 0), e = r.rows.at(-1);
    console.log(`${v}: bodies ${e.bodies}, species ${e.species}, births ${t('births')}, starved ${t('starved')}, eaten ${t('eaten')}, overlap ${mean(r.rows.map(x => x.overlapShare)).toFixed(3)}, biggest pile ${Math.max(...r.rows.map(x => x.biggestPile))}, willing ${mean(r.rows.map(x => x.willingShare)).toFixed(3)}, ${r.msPerTick.toFixed(3)} ms/tick, errors ${r.errors}`);
  }
  fs.rmSync(save); console.log(`Results kept in ${dir} (save copy removed).`);
}
