// Three seasons per variant on one private save copy. No world callbacks or live writes.
//   nice -n 10 node tools/habitat-test.mjs [both|old|new] [world]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { World, PHYSICS as P, SEASON_TICKS, CELL, GW } from '../sim/world.mjs';

const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
const round = v => +v.toFixed(4);
const quant = a => { a.sort((a, b) => a - b); return round(a[Math.max(0, Math.ceil(a.length * 0.9) - 1)] ?? 0); };
const living = w => w.creatures.filter(c => !c.dead && !w.registry[c.species].unique);
function aquaticReport(variant, r) {
  const seen = r.rows.filter(x => x.niches.aquatic);
  return `Aquatic observations ${variant}: ${seen.length ? seen.map(x => `season ${x.season}: ${x.niches.aquatic}, ${JSON.stringify(x.aquaticWhere)}`).join('; ') : 'none at season samples'}; ${Math.max(...r.rows.map(x => x.niches.aquatic)) < P.speciateMin ? 'sampled counts never reached the speciate2 founder floor' : 'census counts alone do not establish a spatially gathered band'}.`;
}
function checks(w) {
  const q = Object.assign(Object.create(World.prototype), { season: 1, rollout: { habitat: 1 } });
  const c = { hab: { water: P.habAquatic, high: P.habHigh } };
  assert.equal(q.nicheOf(c), 'aquatic');
  c.hab.water = 0; assert.equal(q.nicheOf(c), 'highland');
  c.recent = { ate: 1, meat: 0, browse: 0.3 }; assert.equal(q.nicheOf(c), 'highland');
  c.recent.browse = 0.6; assert.equal(q.nicheOf(c), 'browser');
  for (const [key, label] of [['host', 'parasite'], ['dung', 'decomposer'], ['insect', 'insectivore']]) {
    c.recent = { ate: 1, meat: 0, browse: 0, [key]: 0.8 }; assert.equal(q.nicheOf(c), label);
  }
  c.recent = { ate: 1, meat: 0.8, browse: 0 }; assert.equal(q.nicheOf(c), 'hunter');
  c.recent.carrion = 0.8; assert.equal(q.nicheOf(c), 'scavenger');
  c.recent = { ate: 1, meat: 0.3, browse: 0 }; assert.equal(q.nicheOf(c), 'omnivore');
  c.recent = { ate: 1, meat: 0, browse: 0 };
  delete q.rollout.habitat; assert.equal(q.nicheOf(c), 'grazer');
  const b = { x: 0, y: 0, legs: 1, hab: { water: 0, high: 0, t: 0 } };
  Object.assign(q, { tick: P.habRecent, waterAt: () => ({ d: 1, i: 0 }), bodySize: () => 5, elevMap: () => [P.habHeight] });
  q.rememberHabitat(b); assert.ok(Math.abs(b.hab.water - (1 - Math.exp(-1))) < 1e-12);
  assert.equal(b.hab.water, b.hab.high);
  q.waterAt = () => ({ d: 0, i: 0 }); q.elevMap = () => [0]; q.tick += P.habRecent;
  q.rememberHabitat(b); assert.ok(Math.abs(b.hab.water - (1 - Math.exp(-1)) * Math.exp(-1)) < 1e-12);
  q.ledger = { parents: { n: 7 }, deaths: { old: { n: 3 } } };
  q.record('parents', { swim: 0.4, climb: 0.2 }); q.record('old', {});
  assert.equal(q.ledger.parents.n, 8); assert.equal(q.ledger.parents.swim, 0.4);
  assert.equal(q.ledger.deaths.old.n, 4); assert.equal(q.ledger.deaths.old.climb, 0);
  const body = w.creatures[0], prev = body.hab;
  body.hab = { water: 0.41, high: 0.61, t: w.tick };
  const restored = new World(JSON.parse(JSON.stringify(w.toJSON())));
  assert.deepEqual(restored.creatures[0].hab, body.hab);
  if (prev === undefined) delete body.hab; else body.hab = prev;
  // Both habitat bands reach the existing body test; a failed test never splits them.
  for (const label of ['aquatic', 'highland']) {
    const pool = Array.from({ length: P.speciateMin + P.nicheMin + 1 }, (_, id) => ({ id, species: 'test', x: 0, y: 0, k: [1], band: id < P.speciateMin }));
    let attempts = 0;
    const t = Object.assign(Object.create(World.prototype), { season: 1, rollout: { habitat: 1, speciate2: 1 }, registry: { test: {} }, creatures: pool,
      nicheOf: c => c.band ? label : 'grazer', gather: a => a, realDifference: () => { attempts++; return false; }, splitSpecies: () => assert.fail('body test bypassed') });
    for (let i = 0; i < P.nicheDays + 1; i++) t.nicheSplit('test');
    assert.equal(attempts, 1);
  }
  console.log('checks: thresholds, specialist priority, fading, persistence, old ledger and habitat body-test gate passed');
}

if (process.argv[2] === '--aquatic-report') {
  for (const variant of ['old', 'new']) console.log(aquaticReport(variant, JSON.parse(fs.readFileSync(path.join(process.argv[3], `${variant}.json`), 'utf8'))));
} else if (process.argv[2] === '--worker') {
  const [variant, save, result] = process.argv.slice(3), raw = JSON.parse(fs.readFileSync(save, 'utf8'));
  raw.rollout ??= {}; delete raw.rollout.habitat;
  if (variant === 'new') raw.rollout.habitat = raw.season;
  const w = new World(raw); w.log = () => {};
  checks(w);
  const rows = []; let errors = 0, totalMs = 0;
  for (let s = 1; s <= 3; s++) {
    const start = performance.now();
    for (let i = 0; i < SEASON_TICKS; i++) {
      try { w.step(); } catch (e) { errors++; console.error(e.stack); break; }
    }
    const ms = performance.now() - start; totalMs += ms;
    const C = living(w), niches = { aquatic: 0, highland: 0 }, where = {};
    for (const c of C) {
      const n = w.nicheOf(c); niches[n] = (niches[n] ?? 0) + 1;
      if (n === 'aquatic') { const i = Math.floor(c.y / CELL) * GW + Math.floor(c.x / CELL), region = `${c.x < 480 ? 'W' : 'E'}${c.y < 320 ? 'N' : 'S'}`;
        const at = where[region] ??= { n: 0, depth: 0, height: 0 }; at.n++; at.depth += w.water[i]; at.height += w.elevMap()[i]; }
    }
    for (const at of Object.values(where)) { at.depth = round(at.depth / at.n); at.height = round(at.height / at.n); }
    const stat = w.spStat(), passed = stat.passed.niche ?? 0, blocked = stat.blocked.niche ?? 0;
    const row = { variant, elapsedSeasons: s, season: w.season, bodies: C.length, species: new Set(C.map(c => c.species)).size, niches,
      water: { mean: round(mean(C.map(c => c.hab?.water ?? 0))), p90: quant(C.map(c => c.hab?.water ?? 0)) },
      high: { mean: round(mean(C.map(c => c.hab?.high ?? 0))), p90: quant(C.map(c => c.hab?.high ?? 0)) },
      swim: { mean: round(mean(C.map(c => c.swim ?? 0))), above02: C.filter(c => c.swim > 0.2).length },
      nicheAttempts: passed + blocked, nichePasses: passed, speciate2: { passed: stat.passed, blocked: stat.blocked }, aquaticWhere: where, msPerTick: round(ms / SEASON_TICKS), errors };
    rows.push(structuredClone(row)); console.log(JSON.stringify(row));
    if (errors) break;
  }
  fs.writeFileSync(result, JSON.stringify({ rows, errors, msPerTick: totalMs / (rows.length * SEASON_TICKS) }));
  process.exitCode = errors ? 1 : 0;
} else {
  const variant = process.argv[2] ?? 'both';
  assert.ok(['old', 'new', 'both'].includes(variant), 'variant must be old, new or both');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terrarium-habitat-')), save = path.join(dir, 'world.json');
  fs.copyFileSync(path.resolve(process.argv[3] ?? 'data/world.json'), save);
  console.log(`Private input copy: ${save}; each variant runs ${SEASON_TICKS * 3} ticks.`);
  const results = {};
  for (const v of variant === 'both' ? ['old', 'new'] : [variant]) {
    const result = path.join(dir, `${v}.json`);
    const code = await new Promise((resolve, reject) => {
      const child = spawn('nice', ['-n', '10', process.execPath, fileURLToPath(import.meta.url), '--worker', v, save, result], { stdio: 'inherit' });
      child.on('error', reject); child.on('exit', resolve);
    });
    results[v] = JSON.parse(fs.readFileSync(result, 'utf8'));
    if (code !== 0) process.exitCode = 1;
  }
  console.log('Changed: rememberHabitat (10-tick stagger, one-day EMA), habitatLabel/nicheOf/measureRoles/nicheSplit; habEvery/habRecent/habAquatic=0.4/habHigh=0.6/habHeight=0.5; shared swim/climb LEDGER; cycle/diets.');
  for (const [v, r] of Object.entries(results)) { const end = r.rows.at(-1);
    console.log(`${v}: bodies ${end.bodies}, species ${end.species}, aquatic ${end.niches.aquatic}, highland ${end.niches.highland}; aquatic locations ${JSON.stringify(end.aquaticWhere)}; niche attempts/passes ${end.nicheAttempts}/${end.nichePasses}; ${r.msPerTick.toFixed(3)} ms/tick; errors ${r.errors}`);
    console.log(aquaticReport(v, r)); }
  if (results.old && results.new) console.log(`Cost new-old: ${(results.new.msPerTick - results.old.msPerTick).toFixed(3)} ms/tick; stochastic trajectories differ, so this is not an isolated overhead benchmark.`);
  console.log('Risks: ten-tick sampling misses brief crossings; cold-start habitat memory takes about a day; labels also affect niche crowding; three seasons cannot establish long-term splits. Swim/climb old ledger history contributes zero with its original n.');
  console.log('Steward activation only: rollout.habitat = <season>');
  console.log(`Results retained in ${dir}`);
}
