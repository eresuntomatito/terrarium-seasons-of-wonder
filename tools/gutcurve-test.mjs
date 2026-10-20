// M4, AI-written by Codex: ten seasons, private save, nice -n 10. Never writes to the live save.
// node tools/gutcurve-test.mjs [save]; optional TERRARIUM_M4_BASELINE points to the pre-edit world.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { compileBehavior } from '../sim/species.mjs';
import { World, PHYSICS as P, SEASON_TICKS } from '../sim/world.mjs';

const kinds = ['grass', 'browse', 'cone', 'nut', 'fruit', 'insect', 'carrion', 'flesh', 'dung', 'host'];
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const round = x => Number.isFinite(x) ? +x.toFixed(6) : null;
const rng = () => { let n = 2031; return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296); };
function seedBehaviors(w) {
  for (const [key, g] of Object.entries(w.genome)) {
    const prefix = 'let __m4seed = 2031; const __m4random = () => ((__m4seed = (Math.imul(__m4seed,1664525)+1013904223) >>> 0)/4294967296);\n';
    w.behaviors[key] = compileBehavior(key, prefix + g.template.replace(/Math\.random\s*\(/g, '__m4random('), g.consts);
  }
}
function variantSave(raw, variant) {
  const s = structuredClone(raw); s.rollout ??= {}; delete s.rollout.gutcurves;
  if (variant === 'new') s.rollout.gutcurves = s.season;
  for (const [key, season] of Object.entries(raw.rollout ?? {})) {
    if (key !== 'gutcurves') assert.equal(s.rollout[key], season, `retain rollout.${key}`);
  }
  for (const key of ['plateau', 'valley', 'pyramid', 'physics', 'footprint', 'digest']) {
    assert.ok(s.season >= s.rollout[key], `${key} must remain live`);
  }
  return s;
}
const foods = ['plant', 'browse', 'fruit', 'nut', 'cone', 'insect', 'carrion', 'flesh'];
const peaks = [0.05, 0.25, 0.20, 0.20, 0.20, 0.40, 0.55, 0.80];
function efficiency(w, c, kind) {
  return kind === 'plant' ? w.grassGut(c.gut, c) : kind === 'browse' ? w.browseGut(c)
    : ['fruit', 'nut', 'cone'].includes(kind) ? w.treeGut(c)
    : kind === 'insect' ? w.insectGut(c.gut, c) / P.snapEff
    : kind === 'carrion' ? w.carrionDigests(c.gut, c) / P.carrionEfficiency : w.fleshGut(c);
}
async function checks(raw, dir) {
  const off = variantSave(raw, 'old'), future = structuredClone(off); future.rollout.gutcurves = off.season + 1000;
  let Before = World;
  if (process.env.TERRARIUM_M4_BASELINE) {
    const source = fs.readFileSync(process.env.TERRARIUM_M4_BASELINE, 'utf8').replace(/from '\.\/(noise|species)\.mjs'/g,
      (_, name) => `from '${new URL(`../sim/${name}.mjs`, import.meta.url).href}'`);
    const baseline = path.join(dir, 'baseline.mjs'); fs.writeFileSync(baseline, source);
    Before = (await import(pathToFileURL(baseline).href)).World;
  }
  const random = Math.random, results = [];
  try {
    for (const [Model, save] of [[Before, off], [World, off], [World, future]]) {
      Math.random = rng(); const w = new Model(structuredClone(save)); seedBehaviors(w); w.log = () => {};
      for (let i = 0; i < 300; i++) w.step();
      const state = w.toJSON(); delete state.rollout.gutcurves; results.push(state);
    }
  } finally { Math.random = random; }
  assert.deepEqual(results[0], results[1], 'key off matches pre-edit world');
  assert.deepEqual(results[1], results[2], 'absent/future gutcurves are identical');
  console.log(`300-tick full-state key-off checks passed (${Before === World ? 'seeded clones; optional baseline not provided' : 'actual pre-edit implementation'}).`);
  const w = new World(variantSave(raw, 'new')), old = new World(off);
  const original = w.creatures.find(c => !w.registry[c.species].unique);
  const unique = Object.keys(w.registry).find(k => w.registry[k].unique);
  for (let j = 0; j < foods.length; j++) {
    const kind = foods[j]; assert.equal(w.gutFit(peaks[j], kind), 1);
    assert.equal(efficiency(w, { ...original, gut: peaks[j] }, kind), 1, `${kind} peak`);
    for (let i = 0; i <= 1000; i++) {
      const g = i / 1000, c = { ...original, gut: g };
      assert.ok(Math.abs(w.gutFit(Math.min(1, g + 0.01), kind) - w.gutFit(g, kind)) <= 0.05, `${kind} smooth`);
      assert.ok(Math.abs(efficiency(w, c, kind) - w.gutFit(g, kind)) < 1e-12, `${kind} uses fit`);
      if (unique) {
        const u = { ...c, species: unique };
        assert.equal(efficiency(w, u, kind), efficiency(old, u, kind), `${kind} unique exemption`);
      }
      assert.equal(w.hasJaws(c), old.hasJaws(c)); assert.equal(w.grazes(c), old.grazes(c));
    }
  }
  for (let i = 0; i <= 1000; i++) assert.ok(Math.max(...foods.map(k => w.gutFit(i / 1000, k))) >= 0.35, 'no dead zone');
  // Legacy formulas are also checked when a pre-edit source is not supplied.
  for (let i = 0; i <= 100; i++) {
    const g = i / 100, c = { ...original, gut: g };
    assert.equal(old.grassGut(g, c), g <= P.gutPlateau ? 1 : ((1 - g) / (1 - P.gutPlateau)) ** 2);
    assert.equal(old.browseGut(c), 1 - g); assert.equal(old.treeGut(c), old.grassGut(g, c));
    assert.equal(old.insectGut(g, c), P.snapEff * Math.exp(-(((g - P.snapGut) / P.snapWidth) ** 2)));
    assert.equal(old.carrionDigests(g, c), P.carrionEfficiency * Math.max(0, 1 - Math.abs(g - P.carrionPeak2) / P.carrionWidth));
    assert.equal(old.fleshGut(c), g ** P.valleyPower);
  }
  console.log('Unit checks passed: peaks, smooth shoulders, coverage, legacy formulas, unique exemption, unchanged gates. Fits below exclude efficiency multipliers.');
  console.log(['gut', ...foods].join('\t'));
  for (let i = 0; i <= 10; i++) console.log([ (i / 10).toFixed(1), ...foods.map(k => w.gutFit(i / 10, k).toFixed(4)) ].join('\t'));
}
function gutStats(cs) {
  const guts = cs.map(c => c.gut).sort((a, b) => a - b), avg = mean(guts);
  const p = f => round(guts[Math.floor((guts.length - 1) * f)]);
  return { p10: p(0.1), p50: p(0.5), p90: p(0.9), sd: round(Math.sqrt(mean(guts.map(g => (g - avg) ** 2)))) };
}
if (process.argv[2] === '--worker') {
  const [variant, save, output] = process.argv.slice(3), raw = JSON.parse(fs.readFileSync(save));
  Math.random = rng(); const w = new World(variantSave(raw, variant)); seedBehaviors(w); w.log = () => {};
  const die = w.die.bind(w), child = w.child.bind(w), release = w.feedNow.bind(w);
  let births = 0, starved = 0, eaten = 0, shares = {};
  w.child = (...a) => { births++; return child(...a); };
  w.die = (c, cause) => { if (!c.dead) { starved += +(cause === 'starved'); eaten += +(cause === 'eaten'); } return die(c, cause); };
  w.feedNow = (c, energy, level, kind) => {
    release(c, energy, level, kind);
    if (!(energy > 0) || w.registry[c.species].unique) return;
    const key = kind === 'plant' ? 'grass' : kind; shares[key] = (shares[key] ?? 0) + energy;
  };
  const rows = []; let errors = 0, elapsed = 0, ticks = 0;
  console.log(`${variant} initial ordinary gut ${JSON.stringify(gutStats(w.creatures.filter(c => !c.dead && !w.registry[c.species].unique)))}`);
  for (let s = 1; s <= 10; s++) {
    births = starved = eaten = 0; shares = {}; let spent = 0, completed = 0;
    for (let i = 0; i < SEASON_TICKS; i++) {
      const start = performance.now();
      try { w.step(); ticks++; completed++; } catch (e) { errors++; console.error(e.stack); break; }
      spent += performance.now() - start;
    }
    elapsed += spent;
    const cs = w.creatures.filter(c => !c.dead), ordinary = cs.filter(c => !w.registry[c.species].unique);
    const ways = {}; for (const c of ordinary) { const k = w.nicheOf(c); ways[k] = (ways[k] ?? 0) + 1; }
    const total = Object.values(shares).reduce((s, x) => s + x, 0);
    const row = { variant, s, season: w.season, bodies: cs.length, births, starved, eaten, gut: gutStats(ordinary),
      dietShares: Object.fromEntries(kinds.map(k => [k, round(total ? (shares[k] ?? 0) / total : 0)])), ways,
      msPerTick: round(spent / completed), errors };
    rows.push(row); console.log(JSON.stringify(row)); if (errors) break;
  }
  fs.writeFileSync(output, JSON.stringify({ rows, errors, msPerTick: elapsed / ticks })); process.exitCode = errors ? 1 : 0;
} else {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terrarium-gutcurve-')), save = path.join(dir, 'world.json');
  try {
    const source = path.resolve(process.argv[2] ?? 'data/world.json');
    assert.ok(fs.statSync(source).size < 200 * 1024 ** 2, 'private save budget <200 MB (total temp <1 GB)');
    fs.copyFileSync(source, save); fs.chmodSync(save, 0o600);
    console.log(`Private test PID ${process.pid}, ten seasons (${10 * SEASON_TICKS} ticks) per variant; nice -n 10. Temp files removed on completion.`);
    const raw = JSON.parse(fs.readFileSync(save));
    const old = variantSave(raw, 'old'), next = variantSave(raw, 'new'); delete next.rollout.gutcurves;
    assert.deepEqual(old, next, 'variants differ ONLY in rollout.gutcurves');
    console.log(`Snapshot season ${raw.season}; retained rollouts ${JSON.stringify(old.rollout)}.`);
    await checks(raw, dir);
    const outcomes = await Promise.allSettled(['old', 'new'].map(async variant => {
      const output = path.join(dir, `${variant}.json`);
      const code = await new Promise((resolve, reject) => {
        const p = spawn('nice', ['-n', '10', process.execPath, fileURLToPath(import.meta.url), '--worker', variant, save, output], { stdio: 'inherit' });
        p.on('error', reject); p.on('exit', resolve);
      });
      assert.equal(code, 0, `${variant} worker exit`); return [variant, JSON.parse(fs.readFileSync(output))];
    }));
    const results = Object.fromEntries(outcomes.map(result => { if (result.status === 'rejected') throw result.reason; return result.value; }));
    for (const [variant, r] of Object.entries(results)) {
      const total = k => r.rows.reduce((n, x) => n + x[k], 0);
      console.log(`${variant} SUMMARY ${JSON.stringify({ ...r.rows.at(-1), births: total('births'), starved: total('starved'), eaten: total('eaten'), msPerTick: r.msPerTick })}`);
    }
    const a = results.old, b = results.new, timing = (b.msPerTick / a.msPerTick - 1) * 100;
    const passes = { errors: !a.errors && !b.errors, completed: a.rows.length === 10 && b.rows.length === 10,
      population: [...a.rows, ...b.rows].every(r => r.bodies >= 160), timing: timing <= 10 };
    console.log(`PASS CRITERIA ${JSON.stringify(passes)}; timing change ${timing.toFixed(2)}%.`);
    const ga = a.rows.at(-1).gut, gb = b.rows.at(-1).gut;
    console.log(`Gut spread final: SD old ${ga.sd}, new ${gb.sd}; p90-p10 old ${round(ga.p90 - ga.p10)}, new ${round(gb.p90 - gb.p10)}. Widens by SD: ${gb.sd > ga.sd}; by p90-p10: ${gb.p90 - gb.p10 > ga.p90 - ga.p10}. Ten seasons do not establish lasting adaptation. Rollout remains steward-only.`);
    if (Object.values(passes).some(x => !x)) process.exitCode = 1;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); console.log('Private test copies deleted.'); }
}
