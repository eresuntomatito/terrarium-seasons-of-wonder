// AI-written by Codex. Step 4 checks and a 12-season comparison; never writes to data/.
// Optional: node tools/tissue-test.mjs <save>. All existing rollouts are retained.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { World, PHYSICS as P, SEASON_TICKS } from '../sim/world.mjs';
const mass = s => (s / 5) ** 2;
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const sd = a => a.length ? Math.sqrt(mean(a.map(x => (x - mean(a)) ** 2))) : null;
const corr = (a, b) => {
  if (a.length < 2) return null;
  const ma = mean(a), mb = mean(b); let xy = 0, xx = 0, yy = 0;
  for (let i = 0; i < a.length; i++) { xy += (a[i] - ma) * (b[i] - mb); xx += (a[i] - ma) ** 2; yy += (b[i] - mb) ** 2; }
  return xx && yy ? xy / Math.sqrt(xx * yy) : null;
};
const round = x => x === null ? null : +x.toFixed(6);
const rng = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const close = (a, b) => assert.ok(Math.abs(a - b) <= 1e-9, `${a} != ${b}`);
const total = (w, k) => Object.values(w.stats).reduce((s, x) => s + (x[k] ?? 0), 0);
const load = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const clone = x => JSON.parse(JSON.stringify(x));

async function units(save, dir) {
  // Pin the pre-tissue source blob so this remains a regression check after the feature is committed.
  let original = execFileSync('git', ['show', '304280c4c761b2e3687c5088572eef00a849f118'], { encoding: 'utf8' });
  for (const mod of ['noise', 'species']) original = original.replace(`'./${mod}.mjs'`, JSON.stringify(new URL(`../sim/${mod}.mjs`, import.meta.url).href));
  const baseline = path.join(dir, 'world-original.mjs'); fs.writeFileSync(baseline, original, { mode: 0o600 });
  const { World: OldWorld } = await import(pathToFileURL(baseline).href);
  const raw = load(save); delete raw.rollout.tissue;
  function run(C) {
    Math.random = rng(2264); const w = new C(clone(raw)); w.log = () => {};
    for (let i = 0; i < 300; i++) w.step();
    return w.toJSON();
  }
  assert.deepEqual(run(World), run(OldWorld));
  console.log('unit: key off matches pre-change world after 300 ticks (full serialized state, including positions)');
  Math.random = rng(2264);
  const w = new World(clone(raw)); w.log = () => {}; w.rollout.tissue = w.season - P.tissueRamp; w.tissueSeason();
  const parent = w.creatures.find(c => !w.registry[c.species].unique);
  parent.energy = 10; parent.toxin = 0; parent.toxStock = 0;
  const held = c => c.energy + w.bodyHeld(c);
  // The caller transfers the ordinary gift first, just as breed does.
  const birth = (donors, gift, remaining = 1) => {
    const before = donors.reduce((s, c) => s + held(c), 0);
    donors[0].energy -= gift;
    const kid = w.child(parent, parent.x, parent.y, gift, [...parent.genes], parent.gen + 1, parent.size, parent.gut, [...parent.k], {}, donors, remaining);
    close(before, donors.reduce((s, c) => s + held(c), 0) + held(kid));
    close(kid.body, mass(w.bodySize(kid)) * P.bodyEnergy * P.tissueBirth);
    return kid;
  };
  const kid = birth([parent], 1);
  kid.age = P.growTicks; kid.energy = 2;
  const before = held(kid), oldSize = w.bodySize(kid); w.growTissue(kid); close(before, held(kid)); assert.ok(w.bodySize(kid) >= oldSize);
  const energy = kid.energy, tissue = kid.body; kid.energy = 0; const size = w.bodySize(kid); w.growTissue(kid);
  close(kid.body, tissue); close(w.bodySize(kid), size); kid.energy = energy;
  const poor = { ...parent, energy: 1.00001 }; const small = birth([poor], 1); assert.ok(small.grownFrac < 0.4);
  // Paired parents: tissue is charged to both and the total transfer is conserved.
  parent.energy = 10; const other = { ...parent, energy: 10 }; birth([parent, other], 1);
  for (const cause of ['starved', 'old', 'burnt', 'eaten']) {
    const dead = { ...kid, toxin: 0, toxStock: 0, energy: cause === 'starved' ? 0 : 2 };
    const expected = held(dead); w.die(dead, cause);
    close(w.corpses.at(-1).energy, expected * (cause === 'eaten' ? P.scraps : 1));
    if (cause === 'eaten') close(w.corpses.at(-1).energy + expected * (1 - P.scraps), expected);
  }
  w.creatures.push(kid); w.tissueFrozen = true;
  const restored = new World(clone(w.toJSON()));
  close(restored.creatures.at(-1).body, kid.body); close(restored.creatures.at(-1).grownFrac, kid.grownFrac);
  close(restored.tissueLevel, w.tissueLevel); assert.equal(restored.tissueFrozen, true);
  const unique = Object.entries(w.registry).find(([, r]) => r.unique)?.[0];
  if (unique) assert.equal(w.tissueOn({ species: unique }), false);
  w.creatures = w.creatures.slice(0, 159); w.tissueFrozen = false; w.tissueLevel = 0.3; w.tissueSeasonAt = undefined; w.tissueSeason();
  close(w.tissueLevel, 0.3); assert.equal(w.tissueFrozen, true);
  console.log('unit: birth, paired birth, smaller birth, growth, unpaid growth, all death causes conserved within 1e-9; persistence, unique exemption, ramp freeze passed');
}

function worker(v, save, out) {
  Math.random = rng(2264);
  const raw = load(save), keys = clone(raw.rollout); delete raw.rollout.tissue;
  if (v === 'new') raw.rollout.tissue = raw.season;
  for (const [k, value] of Object.entries(keys)) if (k !== 'tissue') assert.equal(raw.rollout[k], value);
  const w = new World(raw); w.log = () => {};
  const rows = [], matured = new Set(); let errors = 0, samples = [], meats;
  const originalDie = w.die.bind(w);
  // Physiological maturity excludes cooldown, willingness, climbing and illness: these postpone breeding, not maturity.
  const isMature = c => c.age > Math.max(P.maturity * (c.mature ?? 1) * (w.rolled('climate') ? 1 + P.waterSlow * (c.water ?? P.waterStart) : 1), P.growTicks * 0.75)
    && (!w.tissueOn(c) || (c.grownFrac ?? 1) >= 0.85);
  w.die = (c, cause) => {
    if (!w.registry[c.species].unique) {
      const adult = w.bodySize(c) >= c.size * (c.grown ?? 1) * 0.999999;
      meats[adult ? 'adult' : 'young'].push(Math.max(0, c.energy) + w.bodyHeld(c));
      if (cause === 'eaten') meats[adult ? 'killAdult' : 'killYoung'].push(Math.max(0, c.energy) + w.bodyHeld(c));
    }
    return originalDie(c, cause);
  };
  for (const c of w.creatures) if (isMature(c)) matured.add(c.id);
  for (let s = 1; s <= 12; s++) {
    meats = { adult: [], young: [], killAdult: [], killYoung: [] }; samples = [];
    const b0 = total(w, 'born'), st0 = total(w, 'starved'), e0 = total(w, 'eaten'), broken = total(w, 'broken'), seizures = total(w, 'seizures'), start = performance.now();
    for (let i = 0; i < SEASON_TICKS; i++) {
      if (i && i % 900 === 0) console.log(`${v} season ${s}/12: ${i}/${SEASON_TICKS} ticks`);
      try {
        w.step();
        for (const c of w.creatures) if (!w.registry[c.species].unique && !matured.has(c.id) && isMature(c)) {
          matured.add(c.id); samples.push([c.sizeGene ?? c.size, c.age]);
        }
      } catch (e) { errors++; console.error(e.stack); break; }
    }
    const ms = (performance.now() - start) / SEASON_TICKS;
    const cs = w.creatures.filter(c => !c.dead && !w.registry[c.species].unique), sizes = cs.map(c => c.sizeGene ?? c.size).sort((a, b) => a - b);
    if (cs.some(c => ![c.energy, c.x, c.y, w.bodySize(c), w.bodyHeld(c)].every(Number.isFinite))) errors++;
    errors += total(w, 'broken') - broken + total(w, 'seizures') - seizures;
    const quantile = p => sizes.length ? sizes[Math.floor((sizes.length - 1) * p)] : null;
    const row = { variant: v, s, season: w.season, bodies: cs.length, births: total(w, 'born') - b0, starved: total(w, 'starved') - st0, eaten: total(w, 'eaten') - e0,
      sizeP10: quantile(0.1), sizeP50: quantile(0.5), sizeP90: quantile(0.9), sizeSD: sd(sizes), corrSizeLitter: corr(cs.map(c => c.sizeGene ?? c.size), cs.map(c => c.litter ?? 1)),
      corrSizeMaturity: corr(samples.map(x => x[0]), samples.map(x => x[1])), maturitySamples: samples.length,
      meatAdult: mean(meats.adult), meatYoung: mean(meats.young), killMeatAdult: mean(meats.killAdult), killMeatYoung: mean(meats.killYoung),
      adultDeaths: meats.adult.length, youngDeaths: meats.young.length, adultKills: meats.killAdult.length, youngKills: meats.killYoung.length,
      tissueRamp: w.tissueRise(), tissueFrozen: !!w.tissueFrozen, msPerTick: ms, errors };
    for (const [k, x] of Object.entries(row)) if (typeof x === 'number') row[k] = round(x);
    rows.push(row); console.log(JSON.stringify(row)); if (errors) break;
  }
  fs.writeFileSync(out, JSON.stringify(rows), { mode: 0o600 });
  if (errors) process.exitCode = 1;
}

if (process.argv[2] === '--worker') {
  worker(...process.argv.slice(3));
} else {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terrarium-tissue-')); fs.chmodSync(dir, 0o700);
  const savedRandom = Math.random;
  const stop = () => { fs.rmSync(dir, { recursive: true, force: true }); process.exit(130); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    const source = process.argv[2] ?? 'data/world.json', save = path.join(dir, 'world.json');
    assert.ok(fs.statSync(source).size < 100 * 1024 * 1024, 'save too large for private scratch budget');
    fs.copyFileSync(source, save); fs.chmodSync(save, 0o600);
    console.log(`Private test PID ${process.pid}; scratch <101 MB; workers nice -n 10.`);
    const off = load(save), on = clone(off); delete off.rollout.tissue; on.rollout.tissue = on.season; delete on.rollout.tissue; assert.deepEqual(off, on, 'only rollout.tissue differs');
    console.log(JSON.stringify({ sourceSeason: load(save).season, liveRollouts: load(save).rollout, seasons: 12, seed: 2264, sizes: 'adult genetic sizes across all live non-unique bodies', meat: 'raw energy available at death, before existing scraps/toxin/digestion losses; null means no samples' }));
    await units(save, dir); Math.random = savedRandom;
    // Like variant-test: matched concurrent workers. Lower priority leaves the live server first.
        const outcomes = await Promise.allSettled(['old', 'new'].map(v => new Promise((resolve, reject) => {
      const child = spawn('nice', ['-n', '10', process.execPath, fileURLToPath(import.meta.url), '--worker', v, save, path.join(dir, v + '.json')], { stdio: 'inherit' });
      child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${v} worker exited ${code}`)));
    })));
    for (const result of outcomes) if (result.status === 'rejected') throw result.reason;
    const old = load(path.join(dir, 'old.json')), next = load(path.join(dir, 'new.json'));
    const timeOld = mean(old.map(r => r.msPerTick)), timeNew = mean(next.map(r => r.msPerTick));
    const weighted = (rows, key, n) => { const count = rows.reduce((s, r) => s + r[n], 0); return count ? rows.reduce((s, r) => s + (r[key] ?? 0) * r[n], 0) / count : null; };
    const summary = { errors: old.at(-1).errors + next.at(-1).errors, minBodiesOld: Math.min(...old.map(r => r.bodies)), minBodiesNew: Math.min(...next.map(r => r.bodies)),
      msPerTickOld: timeOld, msPerTickNew: timeNew, timingChangePct: 100 * (timeNew / timeOld - 1), finalSizeSDOld: old.at(-1).sizeSD, finalSizeSDNew: next.at(-1).sizeSD,
      sizeSpreadWidens: next.at(-1).sizeSD > old.at(-1).sizeSD,
      meanMeatAdultOld: weighted(old, 'meatAdult', 'adultDeaths'), meanMeatAdultNew: weighted(next, 'meatAdult', 'adultDeaths'),
      meanMeatYoungOld: weighted(old, 'meatYoung', 'youngDeaths'), meanMeatYoungNew: weighted(next, 'meatYoung', 'youngDeaths'),
      meanKillAdultOld: weighted(old, 'killMeatAdult', 'adultKills'), meanKillAdultNew: weighted(next, 'killMeatAdult', 'adultKills'),
      meanKillYoungOld: weighted(old, 'killMeatYoung', 'youngKills'), meanKillYoungNew: weighted(next, 'killMeatYoung', 'youngKills') };
    summary.pass = summary.errors === 0 && summary.minBodiesOld >= 160 && summary.minBodiesNew >= 160 && timeNew <= timeOld * 1.1;
    console.log('SUMMARY ' + JSON.stringify(summary));
    if (!summary.pass) process.exitCode = 1;
  } finally { Math.random = savedRandom; fs.rmSync(dir, { recursive: true, force: true }); console.log('Private scratch deleted.'); }
}
