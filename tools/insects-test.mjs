// Headless experiment: flowers, insects, decomposers on carcasses and the snap skill (Luis, s1803/s1930; roadmap step 3b; rollout.insects)
// against the old rules, on a copy of the world.
//   node tools/insects-test.mjs old|new|fast|pol|oldt|audit [ticks] [world]    (copy data/world.json first; this never writes it)
// fast  = new, with insect intake x10 (w.insFast) and snap drift x10, to see whether insect-eating can start.
// audit = no run: the insect pass alone, many times on the frozen world, checking that energy is conserved (stores + insects + heat),
//         that the field never goes NaN or negative, stays bounded, and wraps at the edges.
// Prints every N/4 ticks (default 8 seasons, so every 2 seasons): insects, bloom, fruit made, carcass flows and lifetimes, dung decay,
// income by feed kind, snap, ways of life, bodies, starved, eaten, the insect books, ms/tick.
import fs from 'fs';
const { World, PHYSICS: P, GW, GH, CELL, SEASON_TICKS } = await import(process.cwd() + '/sim/world.mjs');
const v = process.argv[2] ?? 'new', N = +process.argv[3] || 8 * SEASON_TICKS, src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); w.log = () => {};
w.rollout = { ...w.rollout, insects: v === 'old' ? Infinity : w.season };
if (v === 'oldt') { w.rollout.insects = Infinity; w.treeFast = 25; }
if (v === 'fast') { w.insFast = 10; P.snapDrift *= 10; w.treeFast = 25; } // fast also grows the trees x25 (there are almost no mature fruit trees yet)
if (v === 'pol') w.treeFast = 25; // new + trees x25: pollination, with a fruit forest within the run
const sum = a => Array.from(a).reduce((x, y) => x + y, 0), n = GW * GH, S = P.insScale;
if (v === 'audit') {
  const total = () => { let t = sum(w.fertility) + sum(w.dungMap) + sum(w.plants) * P.plantEnergy + sum(w.fruit) * P.fruitEnergy * P.plantEnergy + sum(w.trees) * P.insLeafE + sum(w.corpses.map(c => c.energy)) + sum(w.insects) * S;
    const L = w.insLedger ?? {}; return t + (L.heat ?? 0) + (L.lost ?? 0); };
  for (let i = 0; i < 400; i++) w.step(); // warm up the world a little (bodies, corpses), then freeze it
  w.corpses.push({ x: 300, y: 300, species: w.creatures[0].species, cause: 'old', age: 0, energy: 20 }, { x: 5, y: 5, species: w.creatures[0].species, cause: 'old', age: 0, energy: 20 });
  w.fertility.fill(0.5); w.dungMap[5] = 3; w.insects.fill(0); w.bloom.fill(0); w.insects[0] = 1; w.insects[GW - 1 + (GH - 1) * GW] = 0; // a pulse in the corner cell: it must reach the far edges
  const t0 = total(), m0 = sum(w.insects); let bad = 0, maxv = 0, minv = 0;
  const tr = w.trees.slice(), lost0 = (w.insLedger?.lost ?? 0), clip0 = 0;
  for (let i = 0; i < 600; i++) { w.tick += 10; w.updateInsects(); for (const x of w.insects) { if (!Number.isFinite(x)) bad++; maxv = Math.max(maxv, x); minv = Math.min(minv, x); } if (i === 2) { const I = w.insects; console.log(JSON.stringify({ wrap: 'after 3 passes', cornerFar: +I[GW - 1].toFixed(5), cornerBottom: +I[(GH - 1) * GW].toFixed(5), left: +I[1].toFixed(5), down: +I[GW].toFixed(5) })); } }
  const t1 = total();
  console.log(JSON.stringify({ audit: 'energy (fertility + dung + plants + fruit + canopy + carcasses + insects + heat ledger)', before: +t0.toFixed(2), after: +t1.toFixed(2), drift: +(t1 - t0).toFixed(3), note: 'drift < 0 only from fertility clipped at 2; > 0 would be free energy', nan: bad, min: minv, max: +maxv.toFixed(3), insectMass: +(sum(w.insects) * S).toFixed(3), ledger: w.insLedger }));
  process.exit(0);
}
const cellAt = (x, y) => Math.floor(y / CELL) * GW + Math.floor(x / CELL);
let inc = {}, errors = 0, t0 = performance.now(), insMs = 0, insCalls = 0, carrionToOpeners = 0, carrionAll = 0, dungRot = 0, dungRotCalls = 0;
const feed = w.feed.bind(w); w.feed = (c, e, l, kind) => { inc[kind] = (inc[kind] ?? 0) + e; if (kind === 'carrion') { carrionAll += e; if (w.opens(c)) carrionToOpeners += e; } return feed(c, e, l, kind); };
const upd = w.updateInsects.bind(w); w.updateInsects = () => { const a = performance.now(); upd(); insMs += performance.now() - a; insCalls++; };
const rot = w.rotDung.bind(w); w.rotDung = () => { const a = sum(w.dungMap); rot(); dungRot += a - sum(w.dungMap); dungRotCalls++; };
const stat = f => Object.values(w.stats).reduce((a, x) => a + (x[f] ?? 0), 0);
const step = () => { try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); } };
// carcass lifetimes: watched every 10 ticks; one that vanishes with <= husk left was consumed, one with more was timed out
const seen = new Map(); let life = { consumed: [], timed: [] };
const watch = () => { const now = new Set(w.corpses); for (const [c, b] of seen) if (!now.has(c)) { (b.a >= 900 * P.corpseLife * (b.l ?? 1) - 30 ? life.timed : life.consumed).push(w.tick - b.t); seen.delete(c); } for (const c of now) { const b = seen.get(c); if (b) b.a = c.age; else seen.set(c, { t: w.tick, a: c.age, l: c.lasts }); } };
const starved0 = stat('starved'), eaten0 = stat('eaten'), fert0 = sum(w.fertility);
let L0 = { ...(w.insLedger ?? {}) }, pot0 = w.fruitPot ?? 0, made0 = w.fruitMade ?? 0, open0 = w.carcassOpened ?? 0, mass0 = sum(w.insects) * S, dung0 = sum(w.dungMap);
const mean = a => a.length ? +(sum(a) / a.length).toFixed(0) : null, med = a => a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : null;
for (let k = 1; k <= 4; k++) {
  for (let i = 0; i < N / 4; i++) { step(); if (i % 10 === 0) watch(); }
  const C = w.creatures.filter(c => !c.dead), tot = sum(Object.values(inc)) || 1, I = w.insects, B = w.bloom, L = w.insLedger ?? {}, d = key => (L[key] ?? 0) - (L0[key] ?? 0);
  let bad = 0, mx = 0, mn = 0, hi = 0, bl = 0, blMax = 0; for (let i = 0; i < n; i++) { const x = I[i]; if (!Number.isFinite(x)) bad++; mx = Math.max(mx, x); mn = Math.min(mn, x); if (x > 0.3) hi++; if (B[i] > 0.05) bl++; blMax = Math.max(blMax, B[i]); }
  const niches = {}; for (const c of C) { const nn = w.nicheOf(c); niches[nn] = (niches[nn] ?? 0) + 1; }
  const snaps = C.map(c => c.snap ?? 0), pot = (w.fruitPot ?? 0) - pot0, made = (w.fruitMade ?? 0) - made0, mass1 = sum(I) * S;
  const o = { v, t: k * N / 4, season: w.season,
    insects: { mean: +(sum(I) / n).toFixed(4), max: +mx.toFixed(3), over03: hi, bloomCells: bl, bloomMax: +blMax.toFixed(2), nanOrNeg: bad + (mn < 0 ? 1 : 0) },
    fruit: { stored: +sum(w.fruit).toFixed(1), potential: +pot.toFixed(3), made: +made.toFixed(3), pollination: pot ? +(made / pot).toFixed(3) : null },
    carcass: { corpses: w.corpses.length, toInsects: +(d('carcass') * P.insEff).toFixed(2), toFertility: +(d('carcass') * P.insSoil).toFixed(2), bittenByOpeners: +((w.carcassOpened ?? 0) - open0).toFixed(2), carrionToOpeners: +carrionToOpeners.toFixed(2), carrionAll: +carrionAll.toFixed(2),
      lifeConsumed: { n: life.consumed.length, mean: mean(life.consumed), med: med(life.consumed) }, lifeTimedOut: { n: life.timed.length, mean: mean(life.timed), med: med(life.timed) } },
    dung: { rotToSoil: +dungRot.toFixed(3), insectsAte: +d('dung').toFixed(3), store: +sum(w.dungMap).toFixed(2), storeStart: +dung0.toFixed(2) },
    share: Object.fromEntries(Object.entries(inc).map(([a, b]) => [a, +(b / tot).toFixed(3)])), income: Object.fromEntries(Object.entries(inc).map(([a, b]) => [a, +b.toFixed(0)])),
    snap: { mean: +(sum(snaps) / Math.max(1, snaps.length)).toFixed(4), over01: snaps.filter(x => x > 0.1).length, max: +Math.max(0, ...snaps).toFixed(3), insectEaten: +(L.eaten ?? 0).toFixed(2) },
    ways: niches, insectivoreSpecies: Object.values(w.registry).filter(sp => sp.extinct === null && sp.dietLabel === 'insectivore').length,
    bodies: C.length, species: new Set(C.map(c => c.species)).size, starved: stat('starved') - starved0, eaten: stat('eaten') - eaten0, fertility: +(sum(w.fertility) - fert0).toFixed(1), plantsMean: +(sum(w.plants) / n).toFixed(4),
    books: v === 'old' ? null : { stored: +(mass1 - mass0).toFixed(3), born: +d('toIns').toFixed(3), died: +d('die').toFixed(3), eatenByBodies: +d('eaten').toFixed(3), clipped: +d('lost').toFixed(3), residual: +(mass1 - mass0 - d('toIns') + d('die') + d('eaten') + d('lost')).toFixed(4),
      fromStores: { nectar: +d('nectar').toFixed(2), fruit: +d('fruit').toFixed(2), dung: +d('dung').toFixed(2), leaves: +d('leaf').toFixed(2), carcass: +d('carcass').toFixed(2) } },
    ms: +((performance.now() - t0) / (N / 4)).toFixed(2), insectPassMs: insCalls ? +(insMs / insCalls).toFixed(3) : 0, insectMsPerTick: +(insMs / (N / 4)).toFixed(4), errors };
  console.log(JSON.stringify(o)); t0 = performance.now(); L0 = { ...L }; pot0 = w.fruitPot ?? 0; made0 = w.fruitMade ?? 0; open0 = w.carcassOpened ?? 0; mass0 = mass1; dung0 = sum(w.dungMap);
  inc = {}; carrionToOpeners = carrionAll = dungRot = 0; insMs = insCalls = 0; life = { consumed: [], timed: [] };
}
