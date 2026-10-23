// Headless experiment: carcass2 (Luis, s1757; energy roadmap 1b, 1c, 2) against the old rules, on a copy of the world.
// Carrion capped at the bite taken; toxin only from shoots eaten; a meal limit at kills, the rest left on the carcass. Prints every N/4 ticks.
// Conservation (new): carrion energy fed <= carrion bitten; meat taken + meat left = served.
//   node tools/carcass2-test.mjs old|new [ticks] [world]    (copy data/world.json first; this never writes it)
import fs from 'fs';
const { World, PHYSICS: P } = await import(process.cwd() + '/sim/world.mjs');
if (process.env.TOXIN_SHOOT) P.toxinShoot = +process.env.TOXIN_SHOOT; // try another gain
const v = process.argv[2], N = +process.argv[3] || 16000, src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); w.log = () => {};
w.rollout = { ...w.rollout, carcass2: v === 'old' ? Infinity : w.season };
const sum = a => a.reduce((x, y) => x + y, 0), mean = a => a.length ? +(sum(a) / a.length).toFixed(3) : null;
let inc = {}, errors = 0, t0 = performance.now(), bitten0 = 0, led0 = { kills: 0, served: 0, taken: 0, left: 0 }, kills0 = 0, bitesFed = 0;
const feed = w.feed.bind(w); w.feed = (c, e, l, kind) => { inc[kind] = (inc[kind] ?? 0) + e; return feed(c, e, l, kind); };
const stat = f => Object.values(w.stats).reduce((a, x) => a + (x[f] ?? 0), 0);
kills0 = stat('kills');
for (let k = 1; k <= 4; k++) {
  for (let i = 0; i < N / 4; i++) { try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); } }
  const C = w.creatures.filter(c => !c.dead), tot = sum(Object.values(inc)) || 1;
  const br = C.filter(c => (c.browse ?? 0) > 0.3), nb = C.filter(c => (c.browse ?? 0) < 0.1);
  const share = Object.fromEntries(Object.entries(inc).map(([a, b]) => [a, +(b / tot).toFixed(3)]));
  const L = w.mealLedger ?? { kills: 0, served: 0, taken: 0, left: 0 }, bitten = (w.carrionBitten ?? 0) - bitten0, carrionE = inc.carrion ?? 0;
  const o = { v, t: k * N / 4, bodies: C.length, species: new Set(C.map(c => c.species)).size, starved: stat('starved'), eaten: stat('eaten'), share,
    income: Object.fromEntries(Object.entries(inc).map(([a, b]) => [a, +b.toFixed(1)])), corpses: w.corpses.length, carcassEnergy: +sum(w.corpses.map(c => c.energy)).toFixed(1),
    browsers: { n: br.length, stock: mean(br.map(c => c.toxStock ?? 1)), tox: mean(br.map(c => w.toxinOf(c))) },
    others: { n: nb.length, stock: mean(nb.map(c => c.toxStock ?? 1)), tox: mean(nb.map(c => w.toxinOf(c))) },
    kills: stat('kills') - kills0, ms: +((performance.now() - t0) / (N / 4)).toFixed(1), errors };
  if (v !== 'old') Object.assign(o, { mealKills: L.kills - led0.kills, served: +(L.served - led0.served).toFixed(1), taken: +(L.taken - led0.taken).toFixed(1), left: +(L.left - led0.left).toFixed(1),
    carrionBitten: +bitten.toFixed(2), carrionFed: +carrionE.toFixed(2),
    conserved: carrionE <= bitten + 1e-6 && Math.abs(L.served - led0.served - (L.taken - led0.taken) - (L.left - led0.left)) < 1e-6 });
  console.log(JSON.stringify(o)); inc = {}; led0 = { ...L }; bitten0 = w.carrionBitten ?? 0; kills0 = stat('kills'); t0 = performance.now();
}
