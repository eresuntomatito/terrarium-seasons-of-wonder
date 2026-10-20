// M3, AI-written by Codex: ten seasons, private save, nice -n 10. Never writes to the live save.
// node tools/digest-test.mjs [save]; optional TERRARIUM_M3_BASELINE points to the pre-edit world.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { compileBehavior } from '../sim/species.mjs';
import { World, PHYSICS as P, SEASON_TICKS, CELL, GW } from '../sim/world.mjs';

const kinds = ['grass', 'browse', 'cone', 'nut', 'fruit', 'insect', 'carrion', 'flesh', 'dung', 'host'];
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const round = x => Number.isFinite(x) ? +x.toFixed(6) : null;
const rng = () => { let n = 2031; return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296); };
function seedBehaviors(w) {
  for (const [key, g] of Object.entries(w.genome)) {
    const prefix = 'let __m3seed = 2031; const __m3random = () => ((__m3seed = (Math.imul(__m3seed,1664525)+1013904223) >>> 0)/4294967296);\n';
    w.behaviors[key] = compileBehavior(key, prefix + g.template.replace(/Math\.random\s*\(/g, '__m3random('), g.consts);
  }
}
function variantSave(raw, variant) {
  const s = structuredClone(raw); s.rollout ??= {}; delete s.rollout.digest;
  if (variant === 'new') s.rollout.digest = s.season;
  assert.ok(s.season >= s.rollout.physics && s.season >= s.rollout.footprint, 'physics and footprint must stay live');
  return s;
}
function correlation(points) {
  if (points.length < 2) return null;
  const mx = mean(points.map(p => p[0])), my = mean(points.map(p => p[1]));
  let xy = 0, xx = 0, yy = 0;
  for (const [x, y] of points) { xy += (x - mx) * (y - my); xx += (x - mx) ** 2; yy += (y - my) ** 2; }
  return xx && yy ? xy / Math.sqrt(xx * yy) : null;
}
function calibration(raw) {
  // Median grass bite at today's occupied grazer cells, adult size 5.5, replenished grass in memory.
  // Keep climate/strain/food factors: this measures gut capacity, independently of grass exhaustion.
  const w = new World(variantSave(raw, 'new')); w.log = () => {};
  const rolled = w.rolled.bind(w); w.rolled = key => !['waterfood', 'highfood', 'trees'].includes(key) && rolled(key);
  w.eatTrees = () => {}; w.eatInsects = () => {}; w.near = () => {}; w.browses = () => false;
  const loads = [];
  w.feed = (c, e, level, kind) => { if (kind === 'plant' && e > 0) loads.push(e / Math.max(0.05, P.plantEnergy * w.grassGut(c.gut))); };
  for (const original of w.creatures.filter(c => !w.registry[c.species].unique && w.grazes(c))) {
    const c = { ...original, size: 5.5, grown: 1, age: P.growTicks + 1, energy: 0, eats: true, gutLoad: 0, climbing: null };
    w.plants[Math.floor(c.y / CELL) * GW + Math.floor(c.x / CELL)] = 1;
    w.eat(c, w.registry[c.species], w.scale(c));
  }
  loads.sort((a, b) => a - b); assert.ok(loads.length, 'grass calibration needs occupied grass');
  const bite = loads[Math.floor(loads.length / 2)], c = { species: w.creatures.find(c => !w.registry[c.species].unique).species, size: 5.5 };
  w.bodySize = body => body.size;
  const cap = w.digestCap(c), fraction = -Math.expm1(-1 / P.digTime.plant);
  let load = 0, full = 0, samples = 0;
  for (let t = 0; t < 30000; t++) {
    load *= 1 - fraction;
    const blocked = load >= cap;
    if (t >= 6000) { full += +blocked; samples++; }
    if (!blocked) load += bite;
  }
  const result = { size: 5.5, occupiedGrassSamples: loads.length, medianRawBite: bite, digCap: P.digCap,
    suggestedDigCap: 0.6 * bite * P.digTime.plant / (5.5 / 5) ** 2, fullShare: full / samples };
  console.log(`Grass calibration ${JSON.stringify(result)}; continuous hungry grazer, ample current grass in memory, full measured after release/before intake.`);
  assert.ok(result.fullShare >= 0.35 && result.fullShare <= 0.45, 'size-5.5 grass full duty cycle must be 35–45%');
}
async function checks(raw, dir) {
  const off = variantSave(raw, 'old'), future = structuredClone(off); future.rollout.digest = off.season + 1000;
  let Before = World;
  if (process.env.TERRARIUM_M3_BASELINE) {
    const source = fs.readFileSync(process.env.TERRARIUM_M3_BASELINE, 'utf8').replace(/from '\.\/(noise|species)\.mjs'/g,
      (_, name) => `from '${new URL(`../sim/${name}.mjs`, import.meta.url).href}'`);
    const baseline = path.join(dir, 'baseline.mjs'); fs.writeFileSync(baseline, source);
    Before = (await import(pathToFileURL(baseline).href)).World;
  }
  const random = Math.random, results = [];
  try {
    for (const [Model, save] of [[Before, off], [World, off], [World, future]]) {
      Math.random = rng(); const w = new Model(structuredClone(save)); seedBehaviors(w); w.log = () => {};
      for (let i = 0; i < 300; i++) w.step();
      results.push(w.creatures.map(c => [c.id, c.x, c.y, c.vx, c.vy, c.energy, c.ate, c.fat, c.recent]));
    }
  } finally { Math.random = random; }
  assert.deepEqual(results[0], results[1], 'key off matches baseline positions, energy, fat and diet at 300 ticks');
  assert.deepEqual(results[1], results[2], 'absent/future digest are identical at 300 ticks');
  console.log(`300-tick key-off checks passed (${Before === World ? 'seeded clones' : 'actual pre-edit implementation'}); physics and footprint retained.`);

  const w = new World(variantSave(raw, 'new')); w.log = () => {};
  const original = w.creatures.find(c => !w.registry[c.species].unique);
  const body = () => ({ ...structuredClone(original), x: 0, y: 0, size: 5.5, grown: 1, age: P.growTicks + 1, climbing: null,
    gutE: 0, gutLoad: 0, gutPools: {}, energy: 0, ate: 0, fat: 0, recent: undefined });
  const c = body(); let incoming = 0;
  for (const [kind, e] of [['plant', 0.01], ['fruit', 0.02], ['flesh', 0.03]]) { w.feed(c, e, 2, kind); incoming += e; }
  assert.equal(c.ate, 0); assert.equal(c.energy, 0, 'food is not immediately available');
  for (let i = 0; i < 2000; i++) { w.tick++; w.digest(c); assert.ok(Math.abs(incoming - c.ate - c.gutE) < 1e-9, 'food = released + retained'); }
  const big = { ...c, size: c.size * Math.sqrt(2) };
  assert.ok(Math.abs(w.digestCap(big) / w.digestCap(c) - 2) < 1e-12, 'capacity doubles with mass');
  const grass = body(), fruit = body(); w.feed(grass, 0.01, 1, 'plant'); w.feed(fruit, 0.01, 1, 'fruit');
  w.digest(grass); w.digest(fruit); assert.ok(grass.ate < fruit.ate, 'grass releases slower than fruit');
  const mixed = body(); w.feed(mixed, 0.01, 1, 'plant'); w.feed(mixed, 0.02, 3, 'flesh');
  w.creatures = [mixed];
  const restored = new World(JSON.parse(JSON.stringify(w.toJSON()))).creatures[0];
  for (const key of ['gutE', 'gutLoad', 'gutPools']) assert.deepEqual(restored[key], mixed[key], `persist ${key}`);
  const legacy = new World(structuredClone(raw));
  for (const c of legacy.creatures) { assert.equal(c.gutE, raw.creatures.find(o => o.id === c.id)?.gutE ?? 0); assert.ok(c.gutPools); }
  const full = body(); full.gutLoad = w.digestCap(full); w.feed(full, 1, 1, 'fruit'); assert.equal(full.gutE, 0);
  const climber = body(); climber.climbing = { left: 10 }; w.feed(climber, 1, 1, 'fruit'); assert.equal(climber.gutE, 0);
  w.eatInsects(climber, 1); // No swarm access permitted while climbing.
  const held = w.bodyHeld(mixed); mixed.gutE += 0.2; assert.ok(Math.abs(w.bodyHeld(mixed) - held - 0.2) < 1e-12);
  for (const cause of ['starved', 'eaten']) {
    const dead = { ...mixed, energy: 0 };
    const expected = w.bodyHeld(dead) * (cause === 'eaten' ? P.scraps : 1) * (1 - w.toxinOf(dead));
    w.die(dead, cause); assert.ok(Math.abs(w.corpses.at(-1).energy - expected) < 1e-12, `gut energy reaches ${cause} carcass`);
  }
  const unique = Object.keys(w.registry).find(k => w.registry[k].unique);
  if (unique) { const u = { ...body(), species: unique, gutLoad: 1e9 }; w.feed(u, 0.01, 1, 'plant'); assert.equal(u.gutE, 0); assert.equal(u.ate, 0.01); }
  console.log('Unit checks passed: conservation <1e-9, capacity/mass, grass vs fruit, pools/persistence/defaults, full/climbing intake, carcass energy, unique exemption.');
  calibration(raw);
}

if (process.argv[2] === '--calibrate') {
  calibration(JSON.parse(fs.readFileSync(process.argv[3] ?? 'data/world.json')));
} else if (process.argv[2] === '--worker') {
  const [variant, save, output] = process.argv.slice(3), raw = JSON.parse(fs.readFileSync(save));
  Math.random = rng(); const w = new World(variantSave(raw, variant)); seedBehaviors(w); w.log = () => {};
  const die = w.die.bind(w), child = w.child.bind(w), release = w.feedNow.bind(w), digest = w.digest.bind(w);
  let births = 0, starved = 0, eaten = 0, full = 0, samples = 0, shares = {}, perBody = new Map();
  w.child = (...a) => { births++; return child(...a); };
  w.die = (c, cause) => { if (!c.dead) { starved += +(cause === 'starved'); eaten += +(cause === 'eaten'); } return die(c, cause); };
  w.feedNow = (c, energy, level, kind) => {
    release(c, energy, level, kind);
    if (!(energy > 0) || w.registry[c.species].unique) return;
    const key = kind === 'plant' ? 'grass' : kind; shares[key] = (shares[key] ?? 0) + energy;
    const b = perBody.get(c.id) ?? { total: 0, grass: 0 }; b.total += energy; b.grass += kind === 'plant' ? energy : 0; perBody.set(c.id, b);
  };
  w.digest = c => { digest(c); full += +w.digestFull(c); samples++; };
  const rows = []; let errors = 0, elapsed = 0, ticks = 0;
  for (let s = 1; s <= 10; s++) {
    births = starved = eaten = full = samples = 0; shares = {}; perBody = new Map(); let spent = 0;
    for (let i = 0; i < SEASON_TICKS; i++) {
      const start = performance.now();
      try { w.step(); ticks++; } catch (e) { errors++; console.error(e.stack); break; }
      spent += performance.now() - start;
    }
    elapsed += spent;
    const cs = w.creatures.filter(c => !c.dead), ordinary = cs.filter(c => !w.registry[c.species].unique);
    const sizes = ordinary.map(c => w.bodySize(c)).sort((a, b) => a - b), percentile = p => round(sizes[Math.floor((sizes.length - 1) * p)]);
    const total = Object.values(shares).reduce((s, x) => s + x, 0), points = ordinary.filter(c => perBody.get(c.id)?.total > 0).map(c => {
      const b = perBody.get(c.id); return [w.bodySize(c), b.grass / b.total];
    });
    const row = { variant, s, season: w.season, bodies: cs.length, births, starved, eaten,
      size: { p10: percentile(0.1), p50: percentile(0.5), p90: percentile(0.9) },
      dietShares: Object.fromEntries(kinds.map(k => [k, round(total ? (shares[k] ?? 0) / total : 0)])),
      fullShare: samples ? round(full / samples) : 0, sizeGrassCorrelation: round(correlation(points)), correlationBodies: points.length,
      msPerTick: round(spent / SEASON_TICKS), errors };
    rows.push(row); console.log(JSON.stringify(row)); if (errors) break;
  }
  fs.writeFileSync(output, JSON.stringify({ rows, errors, msPerTick: elapsed / ticks })); process.exitCode = errors ? 1 : 0;
} else {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terrarium-digest-')), save = path.join(dir, 'world.json');
  try {
    const source = path.resolve(process.argv[2] ?? 'data/world.json');
    assert.ok(fs.statSync(source).size < 200 * 1024 ** 2, 'private save budget <200 MB (total temp <1 GB)');
    fs.copyFileSync(source, save); fs.chmodSync(save, 0o600);
    console.log(`Private test PID ${process.pid}, ten seasons (${10 * SEASON_TICKS} ticks) per variant; nice -n 10. Temp files removed on completion.`);
    const raw = JSON.parse(fs.readFileSync(save));
    const old = variantSave(raw, 'old'), next = variantSave(raw, 'new'); delete next.rollout.digest;
    assert.deepEqual(old, next, 'variants differ ONLY in rollout.digest');
    console.log(`Retained rollout.physics=${old.rollout.physics}, rollout.footprint=${old.rollout.footprint}; snapshot season ${old.season}.`);
    await checks(raw, dir);
    const outcomes = await Promise.allSettled(['old', 'new'].map(async variant => {
      const output = path.join(dir, `${variant}.json`);
      const code = await new Promise((resolve, reject) => {
        const p = spawn('nice', ['-n', '10', process.execPath, fileURLToPath(import.meta.url), '--worker', variant, save, output], { stdio: 'inherit' });
        p.on('error', reject); p.on('exit', resolve);
      });
      assert.equal(code, 0, `${variant} worker exit`); return [variant, JSON.parse(fs.readFileSync(output))];
    }));
    // Let both workers finish before cleanup, including when one fails.
    const results = Object.fromEntries(outcomes.map(result => { if (result.status === 'rejected') throw result.reason; return result.value; }));
    for (const [variant, r] of Object.entries(results)) {
      const total = k => r.rows.reduce((n, x) => n + x[k], 0);
      console.log(`${variant} SUMMARY ${JSON.stringify({ ...r.rows.at(-1), births: total('births'), starved: total('starved'), eaten: total('eaten'),
        meanFullShare: mean(r.rows.map(x => x.fullShare)), msPerTick: r.msPerTick })}`);
    }
    const a = results.old, b = results.new, timing = (b.msPerTick / a.msPerTick - 1) * 100;
    const passes = { errors: !a.errors && !b.errors, population: b.rows.at(-1).bodies >= 160, timing: timing <= 15 };
    console.log(`PASS CRITERIA ${JSON.stringify(passes)}; timing change ${timing.toFixed(2)}%.`);
    console.log(`Size/grass Pearson r, final season: old ${a.rows.at(-1).sizeGrassCorrelation}, new ${b.rows.at(-1).sizeGrassCorrelation}; per-season released energy for surviving ordinary bodies. One pair does not establish lasting adaptation. Rollout remains steward-only.`);
    if (Object.values(passes).some(x => !x)) process.exitCode = 1;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); console.log('Private test copies deleted.'); }
}
