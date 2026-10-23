// Headless experiment: trees and their foods (Luis, s1803; roadmap step 3a; rollout.trees) against the old rules, on a copy of the world.
//   node tools/trees-test.mjs old|new|fast|fire [ticks] [world]    (copy data/world.json first; this never writes it)
// fast = new, with growth and seeding x25 (mature forest within the run), fire x FIRE (default 50) so fires happen.
// fire = a forced scenario: a dense patch of conifers with bodies in it is lit; checks they flee and the lingerers are burnt.
// Prints every N/4 ticks: tree cells by kind, mature cells, mean cover, food stores, income by feed kind, bodies, species, starved,
// eaten (and the share that were young), carve and reef, fires, ms/tick, errors. Then the checks (rock, crags, deep water, drought).
import fs from 'fs';
const { World, PHYSICS: P, GW, GH, CELL, W, H } = await import(process.cwd() + '/sim/world.mjs');
const v = process.argv[2] ?? 'new', N = +process.argv[3] || (v === 'fast' ? 16000 : 32000), src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); w.log = () => {};
w.rollout = { ...w.rollout, trees: v === 'old' ? Infinity : w.season };
if (v === 'fast') { w.treeFast = 25; w.fireK = +(process.env.FIRE ?? 50); }
const sum = a => Array.from(a).reduce((x, y) => x + y, 0), n = GW * GH, cellAt = (x, y) => Math.floor(y / CELL) * GW + Math.floor(x / CELL);
let inc = {}, errors = 0, t0 = performance.now(), young = 0, eatenN = 0, burntDeaths = 0;
const feed = w.feed.bind(w); w.feed = (c, e, l, kind) => { inc[kind] = (inc[kind] ?? 0) + e; return feed(c, e, l, kind); };
const die = w.die.bind(w); w.die = (c, cause) => { if (cause === 'eaten') { eatenN++; if (c.age < P.maturity * (c.mature ?? 1)) young++; } if (cause === 'burnt') burntDeaths++; return die(c, cause); };
const stat = f => Object.values(w.stats).reduce((a, x) => a + (x[f] ?? 0), 0);
const step = () => { try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); } };
const starved0 = stat('starved'), eaten0 = stat('eaten'), carve0 = sum(w.carve), reef0 = sum(w.reef);
if (v === 'fire') {
  const fx = Math.floor(GW / 2), fy = Math.floor(GH / 2);
  w.rollout.trees = w.season; w.updateTrees();
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const i = (fy + dy) * GW + fx + dx; w.trees[i] = 0.8; w.treeKind[i] = 3; w.water[i] = 0; w.reef[i] = 0; }
  const bodies = w.creatures.filter(c => !c.dead && !w.registry[c.species].unique).slice(0, 24);
  bodies.forEach((c, k) => { const a = k * 2.4, d = k < 6 ? 0.5 + k * 0.5 : 5 + (k % 6); c.x = (fx + 0.5 + Math.cos(a) * d) * CELL; c.y = (fy + 0.5 + Math.sin(a) * d) * CELL; c.vx = c.vy = 0; }); // 6 inside the patch (it is 9 cells wide), the rest 5-10 cells from its middle (0.5-5 outside its edge)
  const dead0 = new Set();
  const d0 = bodies.map(c => Math.hypot(c.x - (fx + 0.5) * CELL, c.y - (fy + 0.5) * CELL)), P0 = { ...P };
  Object.assign(P, { fireChance: 1, fireDry: 5, fireSpreadMax: 80 }); w.tick += 20 - (w.tick % 20); w.updateTrees(); Object.assign(P, { fireChance: P0.fireChance, fireDry: P0.fireDry });
  console.log(JSON.stringify({ v, lit: sum(w.burning.map(b => b > 0 ? 1 : 0)), bodies: bodies.length, fires: w.fires, cellsBurnt: w.fireCells }));
  let inFlame = 0, peak = 0;
  for (let t = 0; t < 400; t++) { step(); const live = bodies.filter(c => !c.dead), inside = live.filter(c => w.burning[cellAt(c.x, c.y)] > 0).length; inFlame += inside; peak = Math.max(peak, inside);
    if (t % 80 === 79) console.log(JSON.stringify({ t: t + 1, alive: live.length, diedBurnt: bodies.filter(c => c.dead).length, inFlames: inside, burntDeaths, meanDist: +(live.reduce((a, c, k) => a + Math.hypot(c.x - (fx + 0.5) * CELL, c.y - (fy + 0.5) * CELL), 0) / Math.max(1, live.length)).toFixed(1), meanDist0: +(d0.reduce((a, b) => a + b, 0) / d0.length).toFixed(1), fled: live.filter(c => c.fled).length, burning: sum(w.burning.map(b => b > 0 ? 1 : 0)) })); }
  console.log(JSON.stringify({ result: 'fire', burntDeaths, bodyTicksInFlame: inFlame, peakInFlame: peak, errors }));
  process.exit(0);
}
for (let k = 1; k <= 4; k++) {
  for (let i = 0; i < N / 4; i++) step();
  const C = w.creatures.filter(c => !c.dead), tot = sum(Object.values(inc)) || 1, kinds = [0, 0, 0, 0], T = w.trees;
  let mature = 0, cover = 0, ncell = 0; for (let i = 0; i < n; i++) if (T[i] > 0) { kinds[w.treeKind[i]]++; ncell++; cover += T[i]; if (T[i] >= P.treeMature) mature++; }
  const o = { v, t: k * N / 4, season: w.season, trees: { fruit: kinds[1], nut: kinds[2], conifer: kinds[3], mature }, meanCover: +(cover / Math.max(1, ncell)).toFixed(3), cells: ncell,
    stores: { fruit: +sum(w.fruit).toFixed(1), nuts: +sum(w.nuts).toFixed(1), cones: +sum(w.cones).toFixed(1) },
    born: { thicket: w.treesBorn ?? 0, spread: w.treesSpread ?? 0, dung: w.treesDunged ?? 0 }, saplingsBrowsed: +(w.saplingsBrowsed ?? 0).toFixed(2), loss: Object.fromEntries(Object.entries(w.treeLoss ?? {}).map(([a, b]) => [a, +b.toFixed(2)])),
    share: Object.fromEntries(Object.entries(inc).map(([a, b]) => [a, +(b / tot).toFixed(3)])), income: Object.fromEntries(Object.entries(inc).map(([a, b]) => [a, +b.toFixed(0)])),
    bodies: C.length, species: new Set(C.map(c => c.species)).size, starved: stat('starved') - starved0, eaten: stat('eaten') - eaten0, youngShare: eatenN ? +(young / eatenN).toFixed(3) : null, eatenSeen: eatenN,
    bite: +(C.reduce((a, c) => a + (c.bite ?? 0), 0) / Math.max(1, C.length)).toFixed(4), biteMax: +Math.max(0, ...C.map(c => c.bite ?? 0)).toFixed(3),
    carve: +(sum(w.carve) - carve0).toFixed(2), reef: +(sum(w.reef) - reef0).toFixed(1), fires: w.fires ?? 0, fireCells: w.fireCells ?? 0, burntDeaths,
    ms: +((performance.now() - t0) / (N / 4)).toFixed(1), errors };
  console.log(JSON.stringify(o)); t0 = performance.now();
}
if (v !== 'old') { // checks
  const rock = i => w.rockOf(i), NN = w.climbNeed(), bad = { basement: 0, crag: 0, deep: 0, wrongRock: 0 }, era = w.tempEra();
  for (let i = 0; i < n; i++) if (w.trees[i] > 0.02) { const k = w.treeKind[i], r = rock(i), T = w.tempAt(((i / GW | 0) + 0.5) * CELL, era, ((i % GW) + 0.5) * CELL);
    if (r === 4) bad.basement++; if (NN[i] > 0.5) bad.crag++; if (w.water[i] > P.treeDeep) bad.deep++;
    if ((k === 1 && r !== 1 && r !== 3) || (k === 2 && r !== 2) || (k === 3 && r !== 0 && T >= 0.45)) bad.wrongRock++; }
  console.log(JSON.stringify({ check: 'placement (counts of violations)', ...bad, note: 'wrongRock tolerates cells whose rock/temperature changed since planting' }));
  // drought: cover of a broadleaf tree is canopy, in any weather (leaf dropped); the old leaf rule is gone, so cover = canopy for all kinds
  console.log(JSON.stringify({ check: 'cover', rule: 'cover = canopy for every kind (Luis, s1803 correction: fire, not leaf drop)', shelterIsTrees: w._shelter ? true : false }));
}
