// AI-written by Codex (GPT-6), from Claude's s2058 shrubland spec.
// Eight seasons per variant; only rollout.shrubland changes. No live writes.
// Run: node tools/shrubland-test.mjs [save]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { World, GW, GH, SEASON_TICKS, PHYSICS as P } from '../sim/world.mjs';

const seasons = 8, byteLimit = 1_000_000_000;
const sum = a => a.reduce((s, x) => s + x, 0);
const rounded = n => +n.toFixed(6);
const at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW);
function census(w) {
  let thicketCells = 0, densitySum = 0, reefEdge = 0, soilThicket = 0;
  let landCells = 0, saplings = 0, matureTrees = 0, grassPlants = 0;
  for (let i = 0; i < GW * GH; i++) {
    const x = i % GW, y = i / GW | 0;
    const edge = w.reef[i] < P.reefSolid && [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].some(j => w.reef[j] >= P.reefSolid);
    densitySum += w.thicket[i];
    if (w.thicket[i] >= 0.1) { thicketCells++; if (edge) reefEdge++; else soilThicket++; }
    // Land includes bare rock and steep ground, excludes solid reef and deep water.
    if (w.reef[i] < P.reefSolid && w.water[i] <= P.treeDeep) landCells++;
    if (w.trees[i] >= P.treeMature) matureTrees++;
    else if (w.trees[i] > 0) saplings++;
    if (w.plants[i] > 0) grassPlants++;
  }
  return { thicketCells, densitySum: rounded(densitySum), reefEdge, soilThicket, landCells, saplings, matureTrees, grassPlants };
}

// Seed the host simulation's random stream identically; ecological changes can diverge its consumption.
function seedRandom() {
  let state = 2058;
  Math.random = () => { state = (state + 0x6D2B79F5) | 0; let t = Math.imul(state ^ state >>> 15, 1 | state); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function worker(variant, save, output) {
  assert.ok(['old', 'new'].includes(variant));
  seedRandom();
  const raw = JSON.parse(fs.readFileSync(save)), liveRollout = { ...raw.rollout };
  assert.ok(raw.season >= raw.rollout?.digest, 'M3 must be live before shrubland');
  raw.rollout = { ...liveRollout };
  delete raw.rollout.shrubland;
  if (variant === 'new') raw.rollout.shrubland = raw.season;
  const w = new World(raw); w.log = () => {};
  const preserved = { ...w.rollout }; delete preserved.shrubland;
  const expected = { ...liveRollout }; delete expected.shrubland;
  assert.deepEqual(preserved, expected, 'all other rollout settings must be preserved');
  for (const [key, season] of Object.entries(expected)) if (raw.season >= season) assert.ok(w.rolled(key), `${key} must stay live`);
  console.log(JSON.stringify({ variant, initialSeason: w.season, initialTick: w.tick, rollout: w.rollout, initial: census(w) }));
  const child = w.child.bind(w), die = w.die.bind(w), feedNow = w.feedNow.bind(w), updateTrees = w.updateTrees.bind(w);
  let births = 0, starved = 0, food = 0, browse = 0, saplingsFromThicket = 0;
  w.child = (...args) => { const c = child(...args); births++; return c; };
  w.die = (c, cause) => { if (!c.dead && cause === 'starved') starved++; return die(c, cause); };
  w.feedNow = (c, energy, level, kind) => { if (energy > 0) { food += energy; if (kind === 'browse') browse += energy; } return feedNow(c, energy, level, kind); };
  w.updateTrees = () => {
    const born = w.treesBorn ?? 0, spread = w.treesSpread ?? 0;
    updateTrees();
    // updateTrees establishes by succession or neighbour spread; dung seeds happen outside this call.
    saplingsFromThicket += (w.treesBorn ?? 0) - born - ((w.treesSpread ?? 0) - spread);
  };
  const rows = []; let errors = 0, elapsed = 0, ticks = 0;
  for (let s = 1; s <= seasons; s++) {
    births = starved = food = browse = saplingsFromThicket = 0;
    const start = performance.now(); let seasonTicks = 0;
    for (let i = 0; i < SEASON_TICKS; i++) {
      try { w.step(); seasonTicks++; } catch (e) { errors++; console.error(e.stack); break; }
    }
    const ms = performance.now() - start; elapsed += ms; ticks += seasonTicks;
    const row = { variant, s, season: w.season, ...census(w), saplingsFromThicket,
      browseShare: rounded(food ? browse / food : 0), bodies: w.creatures.filter(c => !c.dead).length,
      births, starved, msPerTick: rounded(ms / (seasonTicks || 1)), errors };
    rows.push(row); console.log(JSON.stringify(row));
    if (errors) break;
  }
  fs.writeFileSync(output, JSON.stringify({ rows, errors, ticks, msPerTick: elapsed / (ticks || 1) }));
  if (errors) process.exitCode = 1;
}

if (process.argv[2] === '--worker') {
  worker(...process.argv.slice(3));
} else {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terrarium-shrubland-'));
  fs.chmodSync(dir, 0o700);
  try {
    const source = path.resolve(process.argv[2] ?? 'data/world.json'), save = path.join(dir, 'world.json');
    assert.ok(fs.statSync(source).size < byteLimit - 1_000_000, 'save copy must remain below 1 GB');
    fs.copyFileSync(source, save);
    assert.ok(fs.statSync(save).size < byteLimit - 1_000_000);
    // Parse once now: both workers read this same immutable, coherent save copy.
    JSON.parse(fs.readFileSync(save));
    console.log('Private copy; eight seasons each; sequential workers at nice 10; fixed seed 2058. All temporary files removed on exit.');
    const results = {};
    for (const variant of ['old', 'new']) {
      const output = path.join(dir, `${variant}.json`);
      const code = await new Promise((resolve, reject) => {
        const p = spawn('nice', ['-n', '10', process.execPath, fileURLToPath(import.meta.url), '--worker', variant, save, output], { stdio: 'inherit' });
        p.on('error', reject); p.on('exit', resolve);
      });
      assert.equal(code, 0, `${variant} worker must finish without errors`);
      results[variant] = JSON.parse(fs.readFileSync(output));
    }
    const old = results.old, next = results.new, a = old.rows.at(-1), b = next.rows.at(-1);
    const checks = {
      complete: [old, next].every(r => r.rows.length === seasons && r.ticks === seasons * SEASON_TICKS),
      errorsZero: old.errors === 0 && next.errors === 0,
      thicketAtLeastOld: b.thicketCells >= a.thicketCells,
      notRunaway: b.landCells > 0 && b.thicketCells / b.landCells < 0.08,
      bodiesAtLeast160: next.rows.every(r => r.bodies >= 160),
      performanceWithin10Percent: next.msPerTick <= old.msPerTick * 1.1,
    };
    for (const [variant, r] of Object.entries(results)) console.log(JSON.stringify({ summary: variant,
      ...r.rows.at(-1), birthsTotal: sum(r.rows.map(x => x.births)), starvedTotal: sum(r.rows.map(x => x.starved)),
      saplingsFromThicketTotal: sum(r.rows.map(x => x.saplingsFromThicket)), msPerTick: rounded(r.msPerTick) }));
    console.log(JSON.stringify({ checks, landShare: rounded(b.thicketCells / b.landCells), timeRatio: rounded(next.msPerTick / old.msPerTick) }));
    if (!checks.notRunaway) console.error('Runaway: halve P.shrubGrow and rerun before handing off.');
    if (Object.values(checks).some(pass => !pass)) process.exitCode = 1;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('Private save copy and temporary results deleted.');
  }
}
