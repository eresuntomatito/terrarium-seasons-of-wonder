// Six seasons per variant on one private copy. Run: node tools/homerange-test.mjs [both|old|new] [save].
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { World, PHYSICS as P, W, H, CELL, GW, SEASON_TICKS } from '../sim/world.mjs';
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const sum = o => Object.values(o ?? {}).reduce((s, x) => s + x, 0);
const round = x => Number.isFinite(x) ? +x.toFixed(4) : null;
const wrap = (x, m) => (x % m + m) % m;
const delta = (a, b, m) => wrap(b - a + m / 2, m) - m / 2;
const dist = (a, b) => Math.hypot(delta(a.x, b.x, W), delta(a.y, b.y, H));
const radius = (w, c) => Math.max(P.homeMin, Math.min(P.homeMax, P.homeR * (w.bodySize(c) / 5) ** 2));
function structure(w, cs) {
  const groups = {}, E = w.reliefMap(), rise = w.reliefRise();
  for (const c of cs) {
    const i = Math.floor(c.y / CELL) * GW + Math.floor(c.x / CELL), xs = wrap(c.x - P.seamX, W), rx = wrap(P.riverX * W + 22 * Math.sin(c.y / 70) - P.seamX, W);
    const region = E[i] * rise + (w.tectonic?.[i] ?? 0) >= 0.5 ? 'heights' : (c.y < P.ridgeY * H ? 'N' : 'S') + (xs < rx ? 'W' : 'E');
    (groups[region] ??= []).push(c);
  }
  const out = { counts: Object.fromEntries(Object.entries(groups).map(([k, a]) => [k, a.length])) };
  for (const trait of ['swim', 'climb']) {
    const mu = mean(cs.map(c => c[trait] ?? 0)); let between = 0, within = 0;
    for (const g of Object.values(groups)) { const m = mean(g.map(c => c[trait] ?? 0)); between += g.length * (m - mu) ** 2; within += g.reduce((s, c) => s + ((c[trait] ?? 0) - m) ** 2, 0); }
    out[trait] = { between: round(between / (cs.length || 1)), within: round(within / (cs.length || 1)), ratio: within ? round(between / within) : null };
  }
  return out;
}
function checks(w) {
  const q = Object.assign(Object.create(World.prototype), { season: 1, rollout: { homerange: 1 }, bodySize: c => c.size, capOf: () => 10, fertile: () => false,
    climbNeed: () => new Float32Array(GW * H / CELL), reef: new Float32Array(GW * H / CELL), waterAt: () => ({ d: 0 }) });
  const c = { x: 0, y: 0, size: 5, energy: 10, age: 1, home: { x: 140, y: 0 }, homeSeen: true, homeDispersed: true };
  assert.equal(q.homeRadius(c), 140); assert.equal(q.homeRadius({ size: 1 }), 60); assert.equal(q.homeRadius({ size: 20 }), 300);
  assert.deepEqual(q.homeForce(c, 1), [0.25, 0]); c.energy = 1; assert.equal(q.homeForce(c, 1)[0], 0.05);
  c.energy = 10; c.home.x = 70; assert.deepEqual(q.homeForce(c, 1), [0, 0]);
  c.home.x = W - 140; assert.equal(q.homeForce(c, 1)[0], -0.25);
  c.home.x = 300; c.homeFed = P.homeShift - 1; assert.deepEqual(q.homeForce(c, 1), [0, 0]); assert.deepEqual(c.home, { x: 0, y: 0 });
  delete c.home; delete c.homeSeen; q.homeForce(c, 1); assert.deepEqual(c.home, { x: 0, y: 0 });
  c.homeDispersed = false; q.fertile = () => true; const random = Math.random; Math.random = () => 0;
  try { q.homeForce(c, 1); assert.deepEqual(c.home, { x: 140, y: 0 }); q.homeForce(c, 1); assert.deepEqual(c.home, { x: 140, y: 0 });
    c.homeDispersed = false; q.climbNeed = () => new Float32Array(GW * H / CELL).fill(1); q.homeForce(c, 1); assert.deepEqual(c.home, { x: 140, y: 0 });
  } finally { Math.random = random; }
  c.homeDispersed = false; q.climbNeed = () => new Float32Array(GW * H / CELL); q.waterAt = () => ({ d: 100 });
  const lastHome = { ...c.home }; q.homeForce(c, 1); assert.deepEqual(c.home, lastHome);
  // A strong homeward pull cannot reverse an escape force, including fire.
  Object.assign(q, { registry: { test: { maxForce: 1 } }, scale: () => 1, fatLoad: () => 0, thicket: new Float32Array(GW * H / CELL),
    reliefRise: () => 0, cruise: () => 100, armorOf: () => 0, fireLive: false });
  Object.assign(c, { species: 'test', home: { x: 400, y: 0 }, homeSeen: true, homeDispersed: true, vx: 0, vy: 0, wind: 1, stamina: 100, legs: 1 });
  q.steer(c, -1, 0); assert.ok(c.vx < 0);
  c.vx = c.vy = 0; q.fireLive = true; q.fireAway = () => [-1, 0]; q.steer(c, 0, 0); assert.ok(c.vx < 0);
  let reach; q.near = (x, y, r) => { reach = r; }; q.crowded(c); assert.equal(reach, P.crowdRange * P.footprint);
  delete q.rollout.homerange; q.crowded(c); assert.equal(reach, P.crowdRange);
  const b = w.creatures[0], saved = { ...b }; Object.assign(b, { home: { x: 10, y: 20 }, homeSeen: true, homeDispersed: true, homeFed: 45 });
  const restored = new World(JSON.parse(JSON.stringify(w.toJSON()))).creatures[0];
  for (const key of ['home', 'homeSeen', 'homeDispersed', 'homeFed']) assert.deepEqual(restored[key], b[key]);
  for (const key of Object.keys(b)) delete b[key]; Object.assign(b, saved);
  const testWorld = new World(JSON.parse(JSON.stringify(w.toJSON()))); testWorld.rollout.homerange = testWorld.season; testWorld.log = () => {};
  const young = testWorld.creatures.find(c => !testWorld.registry[c.species].unique && !c.broken);
  const thrifty = testWorld.rolled('climate') ? 1 + P.waterSlow * (young.water ?? P.waterStart) : 1;
  Object.assign(young, { age: Math.max(P.maturity * (young.mature ?? 1) * thrifty, P.growTicks * 0.75) - 0.001, cooldown: 0,
    home: { x: young.x, y: young.y }, homeSeen: true, homeDispersed: false });
  testWorld.step(); assert.equal(young.homeDispersed, true, 'dispersal on the heartbeat reaching maturity');
  console.log('checks passed: radius/clamps, pull, hunger, torus, resettling, legacy anchor, one dispersal, barred/deep destinations, escape/fire priority, crowd gate, persistence');
}
if (process.argv[2] === '--checks') {
  checks(new World(JSON.parse(fs.readFileSync(process.argv[3]))));
} else if (process.argv[2] === '--worker') {
  const [variant, save, output] = process.argv.slice(3), raw = JSON.parse(fs.readFileSync(save));
  raw.rollout ??= {}; delete raw.rollout.homerange; if (variant === 'new') raw.rollout.homerange = raw.season;
  const w = new World(raw); w.log = () => {}; checks(w);
  // Keep immutable birth coordinates outside the model, since home can move. Existing residents have only a proxy.
  const origins = new Map(w.creatures.map(c => [c.id, { ...(c.home ?? c), known: false }]));
  const child = w.child.bind(w), die = w.die.bind(w); let born = 0, starved = 0, eaten = 0, deaths = [], proxyDeaths = [];
  w.child = (...args) => { const c = child(...args); born++; origins.set(c.id, { x: wrap(args[1], W), y: wrap(args[2], H), known: true }); return c; };
  w.die = (c, cause) => { if (!c.dead) { const b = origins.get(c.id); if (b) (b.known ? deaths : proxyDeaths).push(dist(c, b)); if (cause === 'starved') starved++; if (cause === 'eaten') eaten++; } return die(c, cause); };
  const rows = []; let errors = 0, elapsed = 0, ticks = 0;
  for (let s = 1; s <= 6; s++) {
    born = starved = eaten = 0; deaths = []; proxyDeaths = [];
    const start = performance.now(), before = structuredClone(w.spStat());
    for (let i = 0; i < SEASON_TICKS; i++) { try { w.step(); ticks++; } catch (e) { errors++; console.error(e.stack); break; } }
    const ms = performance.now() - start; elapsed += ms;
    const cs = w.creatures.filter(c => !c.dead), niches = {};
    for (const c of cs) niches[w.nicheOf(c)] = (niches[w.nicheOf(c)] ?? 0) + 1;
    const st = w.spStat(), crosses = w.records.sections?.at(-1)?.crossings ?? {}, home = cs.filter(c => c.home);
    const row = { variant, elapsedSeasons: s, season: w.season, bodies: cs.length, species: new Set(cs.map(c => c.species)).size, niches,
      home: { sampled: home.length, meanDistance: round(mean(home.map(c => dist(c, c.home)))), beyondR: round(mean(home.map(c => +(dist(c, c.home) > radius(w, c))))) },
      crossings: sum(crosses), crossingDirections: crosses,
      lifetimeDisplacement: { mean: deaths.length ? round(mean(deaths)) : null, deaths: deaths.length, residentProxyMean: proxyDeaths.length ? round(mean(proxyDeaths)) : null, residentDeaths: proxyDeaths.length },
      structure: structure(w, cs), splitAttempts: sum(st.passed) + sum(st.blocked) - sum(before.passed) - sum(before.blocked), splitPasses: sum(st.passed) - sum(before.passed), speciate2: { passed: { ...st.passed }, blocked: { ...st.blocked } },
      starved, eaten, births: born, msPerTick: round(ms / SEASON_TICKS), errors };
    rows.push(row); console.log(JSON.stringify(row)); if (errors) break;
  }
  fs.writeFileSync(output, JSON.stringify({ rows, errors, msPerTick: elapsed / ticks })); process.exitCode = errors ? 1 : 0;
} else {
  const variant = process.argv[2] ?? 'both'; assert.ok(['both', 'old', 'new'].includes(variant));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terrarium-homerange-')), save = path.join(dir, 'world.json');
  fs.copyFileSync(path.resolve(process.argv[3] ?? 'data/world.json'), save);
  console.log(`Private save: ${save}; six seasons (${SEASON_TICKS * 6} ticks) each, parallel nice -n 10 workers.`);
  const results = Object.fromEntries(await Promise.all((variant === 'both' ? ['old', 'new'] : [variant]).map(async v => {
    const output = path.join(dir, `${v}.json`);
    const code = await new Promise((resolve, reject) => { const p = spawn('nice', ['-n', '10', process.execPath, fileURLToPath(import.meta.url), '--worker', v, save, output], { stdio: 'inherit' }); p.on('error', reject); p.on('exit', resolve); });
    if (code !== 0) process.exitCode = 1; return [v, JSON.parse(fs.readFileSync(output))];
  })));
  console.log('Changed: homeRadius/disperseHome/homeForce/steer, step maturity boundary and legacy home gate, child, crowded, breed, gulp/eat. Params: homeR=140, clamp=60..300, homeInner=.6, homePull=.25, homeHunger=.3, homeHungryPull=.2, homeShift=1800, dispersal=3, homeTries=8, homeOppose=.5, footprint=.5, mateFloor=4; oldHomePull=1 preserves legacy home.');
  console.log('Scaled distances: mating max(8,size*2) x .5, floor 4; crowdRange 40 x .5; bite (self+prey)*.6 x .5 + unchanged 2; filter-feeding (self+prey)*gulpReach x .5 + unchanged 2. No body separation/overlap pushes exist in world.mjs; bumps is reef contact, not piling. Broad-phase attack searches stay unchanged.');
  for (const [v, r] of Object.entries(results)) { const e = r.rows.at(-1); console.log(`${v}: final bodies/species ${e.bodies}/${e.species}, crossings ${sum(Object.fromEntries(r.rows.map((x, i) => [i, x.crossings])))}, births ${r.rows.reduce((s,x)=>s+x.births,0)}, starved ${r.rows.reduce((s,x)=>s+x.starved,0)}, eaten ${r.rows.reduce((s,x)=>s+x.eaten,0)}, splits attempts/passes ${r.rows.reduce((s,x)=>s+x.splitAttempts,0)}/${r.rows.reduce((s,x)=>s+x.splitPasses,0)}, final structure ${JSON.stringify(e.structure)}, ${r.msPerTick.toFixed(3)} ms/tick, errors ${r.errors}`); }
  if (results.old && results.new) { const a = results.old.rows, b = results.new.rows;
    console.log(`Crossing proxy for gene flow, new/old: ${(b.reduce((s,x)=>s+x.crossings,0) / (a.reduce((s,x)=>s+x.crossings,0)||1)).toFixed(3)}. Final between/within swim old/new ${a.at(-1).structure.swim.ratio}/${b.at(-1).structure.swim.ratio}, climb ${a.at(-1).structure.climb.ratio}/${b.at(-1).structure.climb.ratio}; six seasons and one stochastic pair cannot establish enduring local adaptation or genetic migration.`);
  }
  console.log('Risks: bunching and drought starvation; dispersal endpoints do not guarantee a passable route; legacy homes are retained, mature residents stay put; rare-food resettling requires one continuously fed day outside R. Lifetime displacement uses births observed in this run; earlier residents are separate proxies. Timing includes contention from both workers.');
  console.log('Steward activation only: rollout.homerange = <season>'); console.log(`Results retained: ${dir}`);
}
