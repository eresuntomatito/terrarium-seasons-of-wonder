// M2: six seasons old/new on a private save, parallel nice -n 10 workers. No live writes.
// Run: node tools/physics-test.mjs [save]. Results remain in a private temporary directory.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { compileBehavior } from '../sim/species.mjs';
import { World, PHYSICS as P, W, H, CELL, GW, SEASON_TICKS } from '../sim/world.mjs';
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const sum = o => Object.values(o ?? {}).reduce((s, x) => s + x, 0);
const round = x => Number.isFinite(x) ? +x.toFixed(6) : null;
const wrap = (x, m) => (x % m + m) % m;
const rng = () => { let n = 2031; return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296); };
// Seed each VM's randomness after genome extraction, preserving every inherited code-number index.
function seedBehaviors(w) {
  for (const [key, g] of Object.entries(w.genome)) {
    const prefix = 'let __m2seed = 2031; const __m2random = () => ((__m2seed = (Math.imul(__m2seed,1664525)+1013904223) >>> 0)/4294967296);\n';
    w.behaviors[key] = compileBehavior(key, prefix + g.template.replace(/Math\.random\s*\(/g, '__m2random('), g.consts);
  }
}
// Region/variance method from homerange-test.mjs; retain regional means as well as the ratio.
function structure(w, cs) {
  const groups = {}, E = w.reliefMap(), rise = w.reliefRise();
  for (const c of cs) {
    const i = Math.floor(c.y / CELL) * GW + Math.floor(c.x / CELL), xs = wrap(c.x - P.seamX, W), rx = wrap(P.riverX * W + 22 * Math.sin(c.y / 70) - P.seamX, W);
    const region = E[i] * rise + (w.tectonic?.[i] ?? 0) >= 0.5 ? 'heights' : (c.y < P.ridgeY * H ? 'N' : 'S') + (xs < rx ? 'W' : 'E');
    (groups[region] ??= []).push(c);
  }
  const out = { regions: Object.fromEntries(Object.entries(groups).map(([k, a]) => [k, { bodies: a.length, swim: round(mean(a.map(c => c.swim ?? 0))), climb: round(mean(a.map(c => c.climb ?? 0))) }])) };
  for (const trait of ['swim', 'climb']) {
    const mu = mean(cs.map(c => c[trait] ?? 0)); let between = 0, within = 0;
    for (const g of Object.values(groups)) { const m = mean(g.map(c => c[trait] ?? 0)); between += g.length * (m - mu) ** 2; within += g.reduce((s, c) => s + ((c[trait] ?? 0) - m) ** 2, 0); }
    out[trait] = { between: round(between / (cs.length || 1)), within: round(within / (cs.length || 1)), ratio: within ? round(between / within) : null };
  }
  return out;
}
async function checks(raw, dir, baselineCheck = true) {
  if (baselineCheck) {
  // Compare with the untouched, tracked implementation as well as a second key-off clone.
  const source = execFileSync('git', ['show', 'HEAD:sim/world.mjs'], { encoding: 'utf8' }).replace(/from '\.\/(noise|species)\.mjs'/g, (_, name) => `from '${new URL(`../sim/${name}.mjs`, import.meta.url).href}'`);
  const baseline = path.join(dir, 'baseline.mjs'); fs.writeFileSync(baseline, source);
  const { World: Before } = await import(pathToFileURL(baseline).href);
  const off = structuredClone(raw); delete off.rollout.physics;
  const random = Math.random, worlds = [];
  try {
    for (const Model of [Before, World, World]) {
      Math.random = rng(); const w = new Model(structuredClone(off)); seedBehaviors(w); w.log = () => {};
      for (let i = 0; i < 300; i++) w.step();
      console.log(`Key-off clone ${worlds.length + 1}: 300 ticks complete.`);
      worlds.push(w.creatures.map(c => [c.id, c.x, c.y, c.vx, c.vy, c.energy]));
    }
  } finally { Math.random = random; }
  assert.deepEqual(worlds[1], worlds[0], 'key off matches pre-M2 source after 300 seeded ticks');
  assert.deepEqual(worlds[2], worlds[1], 'key-off seeded clones match');
  }
  const w = new World(structuredClone(raw)); w.rollout.physics = w.season;
  const c = w.creatures.find(c => !w.registry[c.species].unique);
  const q = Object.assign(Object.create(World.prototype), { tick: 1, season: 1, rollout: { physics: 1 }, registry: { test: {} }, bodySize: c => c.size, capOf: () => 10 });
  assert.equal(q.strength({ size: 5, energy: 10 }), 1);
  assert.equal(q.strength({ size: 5, energy: 0 }), 0.5);
  assert.ok(q.strength({ size: 10, energy: 10 }) > 1);
  assert.equal(q.tobler(-0.05), 1); assert.ok(q.tobler(-0.05) > q.tobler(0.1));
  for (const g of [-100, -1, 0, 1, 100]) assert.ok(q.tobler(g) >= 0.25 && q.tobler(g) <= 1);
  c.climbing = { left: 37 }; c.climbEntry = 123; w.climbTicks = 19;
  const restored = new World(JSON.parse(JSON.stringify(w.toJSON())));
  assert.deepEqual(restored.creatures.find(o => o.id === c.id).climbing, { left: 37 });
  assert.equal(restored.creatures.find(o => o.id === c.id).climbEntry, 123); assert.equal(restored.climbTicks, 19);
  const legacy = new World(structuredClone(raw)); assert.equal(legacy.climbTicks, raw.climbTicks ?? 0);
  const prey = { species: 'test', size: 5, energy: 5, climb: 0.8, climbing: { left: 10 } }, hunter = { species: 'test', size: 10, energy: 1, climb: 0.4 };
  assert.equal(q.canCatch(hunter, prey), false); hunter.climb = 0.8; assert.equal(q.canCatch(hunter, prey), true); hunter.climb = 0.4;
  Object.assign(q, { near: (x, y, r, fn) => fn(prey, 0, 0), toxinOf: () => 0, canOverpower: () => true, wouldEat: () => true, growOn: () => {}, die: () => assert.fail('inaccessible prey killed'), feed: () => assert.fail('inaccessible prey fed hunter') });
  q.gulp(hunter, { maxEnergy: 100 }); assert.equal(hunter.energy, 1);
  const N = new Float32Array(GW * H / CELL); N[1] = 0.5;
  Object.assign(q, { climbNeed: () => N, sectionsRise: () => 1 });
  assert.equal(q.canStep({ species: 'test', climb: 0.5 }, 0, 1, true), false);
  Object.assign(q, { scale: () => 1, fatLoad: () => 0, armorOf: () => 0, cruise: () => 1, reliefRise: () => 1,
    elevAt: x => x * 0.01, thicket: new Float32Array(GW * H / CELL) });
  q.registry.test.maxForce = 1;
  const climber = { species: 'test', x: CELL - 0.01, y: 4, vx: 1, vy: 0, climb: 0.9, energy: 10, size: 5, legs: 1, stamina: 10, wind: 1, sprint: true };
  q.crossGate(climber);
  assert.equal(climber.climbing.left, Math.ceil(P.climbMinRise / (P.climbUp * P.tickSeconds * 0.9)));
  assert.ok(Math.hypot(climber.vx, climber.vy) <= P.climbSpeed); assert.equal(climber.sprinting, false);
  const heading = [climber.vx, climber.vy]; q.steer(climber, -100, 100); assert.deepEqual([climber.vx, climber.vy], heading);
  assert.equal(q.fertile(climber), false);
  q.reliefRise = () => 0;
  const swimmer = { species: 'test', x: 0, y: 0, vx: 1, vy: 0, size: 5, energy: 10, legs: 1, wind: 1, stamina: 10, swimming: true, swim: 0.5 };
  q.steer(swimmer, 0, 0); assert.equal(swimmer.vx, P.swimBase + P.swimSkill * 0.5);
  const stronger = { ...swimmer, size: 10, vx: 1 }; delete stronger.strengthTick;
  q.steer(stronger, 0, 0); assert.ok(stronger.vx > swimmer.vx && stronger.vx <= 1);
  q.reliefRise = () => 1;
  const down = { ...climber, x: CELL + 0.01, vx: -1, vy: 0, climbing: null, energy: 10 };
  const randomFall = Math.random;
  try { Math.random = () => 0; q.crossGate(down); } finally { Math.random = randomFall; }
  assert.equal(q.fell, 1); assert.ok(down.energy < 10); assert.equal(down.climbing, null);

  Object.assign(q, { creatures: [{ ...climber, decomp: 1, parasitism: 0.5 }], foul: new Float32Array(GW * H / CELL), near: () => assert.fail('climber fed outside eat()') });
  q.rollout.smooth = 1; q.isParasite = () => true; q.infestations(); q.isParasite = () => false; q.infestations();
  c.climb = 1; c.vx = c.vy = 0; // Isolate the hold from falls or a terrain-gate transition.
  w.log = () => {}; const eat = w.eat.bind(w); w.eat = (body, ...args) => { assert.notEqual(body.id, c.id, 'climber cannot eat'); return eat(body, ...args); };
  w.step(); assert.equal(c.climbing.left, 36); assert.ok(w.climbTicks >= 20);
  console.log(`Unit checks passed: ${baselineCheck ? '300-tick key-off baseline/clones, ' : ''}strength, Tobler peak/floor, persistence/defaults, strict gate, ascent duration/speed/no steering/eating/breeding, climbing prey protection (no kill/energy), swim strength, downhill fall.`);
}
if (['--checks', '--checks-core'].includes(process.argv[2])) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terrarium-physics-checks-'));
  await checks(JSON.parse(fs.readFileSync(process.argv[3])), dir, process.argv[2] !== '--checks-core');
} else if (process.argv[2] === '--worker') {
  const [variant, save, output] = process.argv.slice(3), raw = JSON.parse(fs.readFileSync(save));
  raw.rollout ??= {}; delete raw.rollout.physics; if (variant === 'new') raw.rollout.physics = raw.season;
  Math.random = rng(); const w = new World(raw); seedBehaviors(w); w.log = () => {};
  const die = w.die.bind(w), child = w.child.bind(w); let births = 0, starved = 0, eaten = 0, falls = 0, crossings = 0;
  w.child = (...args) => { births++; return child(...args); };
  w.die = (c, cause) => { if (!c.dead) { if (cause === 'starved') starved++; if (cause === 'eaten') eaten++; } return die(c, cause); };
  // Counters reset at season boundaries; capture their deltas on each gate call.
  const gate = w.crossGate.bind(w);
  w.crossGate = c => { const f = w.fell ?? 0, x = sum(w.crossings); gate(c); falls += (w.fell ?? 0) - f; crossings += sum(w.crossings) - x; };
  const rows = []; let errors = 0, elapsed = 0, ticks = 0;
  for (let s = 1; s <= 6; s++) {
    births = starved = eaten = falls = crossings = 0; let shares = 0, samples = 0, spent = 0;
    for (let i = 0; i < SEASON_TICKS; i++) {
      const start = performance.now();
      try { w.step(); ticks++; } catch (e) { errors++; console.error(e.stack); break; }
      spent += performance.now() - start;
      if (i % 30 === 0) { shares += mean(w.creatures.map(c => +w.isClimbing(c))); samples++; }
    }
    elapsed += spent;
    const cs = w.creatures.filter(c => !c.dead), climbTicks = w.climbTicks ?? 0;
    const row = { variant, s, season: w.season, bodies: cs.length, births, starved, eaten, fell: falls, climbTicks: climbTicks - (rows.at(-1)?.totalClimbTicks ?? raw.climbTicks ?? 0), totalClimbTicks: climbTicks,
      climbingShare: round(shares / samples), crossings, structure: structure(w, cs), msPerTick: round(spent / SEASON_TICKS), errors };
    rows.push(row); console.log(JSON.stringify(row)); if (errors) break;
  }
  fs.writeFileSync(output, JSON.stringify({ rows, errors, msPerTick: elapsed / ticks })); process.exitCode = errors ? 1 : 0;
} else {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terrarium-physics-')), save = path.join(dir, 'world.json');
  fs.copyFileSync(path.resolve(process.argv[2] ?? 'data/world.json'), save);
  console.log(`Test PID ${process.pid}. Private save: ${save}; six seasons (${6 * SEASON_TICKS} ticks) per variant, parallel nice -n 10.`);
  await checks(JSON.parse(fs.readFileSync(save)), dir);
  const results = Object.fromEntries(await Promise.all(['old', 'new'].map(async variant => {
    const output = path.join(dir, `${variant}.json`);
    const code = await new Promise((resolve, reject) => { const p = spawn('nice', ['-n', '10', process.execPath, fileURLToPath(import.meta.url), '--worker', variant, save, output], { stdio: 'inherit' }); p.on('error', reject); p.on('exit', resolve); });
    assert.equal(code, 0, `${variant} worker exit`); return [variant, JSON.parse(fs.readFileSync(output))];
  })));
  for (const [v, r] of Object.entries(results)) {
    const e = r.rows.at(-1), total = key => r.rows.reduce((s, x) => s + x[key], 0);
    console.log(`${v}: bodies ${e.bodies}, births ${total('births')}, starved ${total('starved')}, eaten ${total('eaten')}, fell ${total('fell')}, climbTicks ${total('climbTicks')}, climbing share ${mean(r.rows.map(x => x.climbingShare)).toFixed(6)}, crossings ${total('crossings')}, swim/climb between/within ${e.structure.swim.ratio}/${e.structure.climb.ratio}, ${r.msPerTick.toFixed(3)} ms/tick, errors ${r.errors}`);
  }
  const a = results.old, b = results.new, oldEnd = a.rows.at(-1), newEnd = b.rows.at(-1);
  const passes = { errors: a.errors === 0 && b.errors === 0, population: oldEnd.bodies >= 160 && newEnd.bodies >= 160, timing: b.msPerTick <= 1.15 * a.msPerTick,
    structure: ['swim', 'climb'].some(k => newEnd.structure[k].ratio !== null && oldEnd.structure[k].ratio !== null && newEnd.structure[k].ratio > oldEnd.structure[k].ratio) };
  console.log(`Pass criteria ${JSON.stringify(passes)}; timing change ${((b.msPerTick / a.msPerTick - 1) * 100).toFixed(2)}%. One seeded pair over six seasons does not establish enduring adaptation. Rollout remains steward-only.`);
  fs.rmSync(save); console.log(`Results retained: ${dir} (private save removed).`);
  if (Object.values(passes).some(x => !x)) process.exitCode = 1;
}
