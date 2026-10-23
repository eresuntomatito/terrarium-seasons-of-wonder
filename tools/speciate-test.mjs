// Headless experiment: real species (Luis, s1837; rollout.speciate2) against the old splits, on a copy of the world.
//   node tools/speciate-test.mjs old|new|new03|new07|force [seasons] [world]    (copy data/world.json first; this never writes it)
// new = speciate2 on from the first tick (speciateGap 0.5); new03 / new07 = gap 0.3 / 0.7. Prints every 2 seasons: bodies, species, births by kind
// force = new, with two splits made by hand at the start (12 and 25 bodies of the biggest species) to exercise grace, kin sparing and the merge back.
// (niche / drift / mind / divide), splits blocked by the body test, merges back, extinctions (how), kin spared, eaten share, ms/tick; at the end each
// new species' body gap against its null at birth, and the chronicle lines of splits and merges.
import fs from 'fs';
const { World, PHYSICS: P, SEASON_TICKS } = await import(process.cwd() + '/sim/world.mjs');
const v = process.argv[2] ?? 'new', seasons = +process.argv[3] || 10, src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); const lines = []; w.log = t => lines.push(`s${w.season} ${t}`);
w.rollout = { ...w.rollout, speciate2: v === 'old' ? Infinity : w.season };
const forced = [];
if (v === 'new03') P.speciateGap = 0.3; if (v === 'new07') P.speciateGap = 0.7;
const born = { niche: 0, drift: 0, mind: 0, divide: 0 }, ext = { eaten: 0, starved: 0, old: 0, other: 0 }; let ctx = null, errors = 0;
for (const k of ['nicheSplit', 'vicariance']) { const f = w[k].bind(w); w[k] = (...a) => { const o = ctx; ctx = k === 'nicheSplit' ? 'niche' : 'divide'; try { return f(...a); } finally { ctx = o; } }; }
const split = w.splitSpecies.bind(w);
w.splitSpecies = (parent, members, values, mindKey, story) => { const kind = ctx ?? (story && /think differently/.test(story) ? 'mind' : 'drift'); born[kind]++; return split(parent, members, values, mindKey, story); };
const mx = w.markExtinct.bind(w); w.markExtinct = n => { const c = w.lastDeath?.cause; ext[c in ext ? c : 'other']++; return mx(n); };
const stat = f => Object.values(w.stats).reduce((a, x) => a + (x[f] ?? 0), 0);
if (v === 'force') {
  const big = w.living().sort((a, b) => w.lastCounts[b] - w.lastCounts[a])[0], pool = w.creatures.filter(c => !c.dead && c.species === big && c.k?.length);
  for (const n of [12, 25]) { const mem = pool.splice(0, n), vals = mem[0].k.slice(); ctx = 'niche'; w.splitSpecies(big, mem, vals, big, `${n} forced`); ctx = null; forced.push(w.speciesNames.at(-1)); }
  const [a, b] = forced, R = w.registry;
  console.log(JSON.stringify({ forced, parent: big, grace: forced.map(n => w.graceOn(R[n])), interbreeds: { aParent: w.interbreeds(a, big), parentA: w.interbreeds(big, a), sisters: w.interbreeds(a, b) } }));
  const mc = w.creatures.find(c => c.species === big), ma = w.creatures.find(c => c.species === a); mc.energy = 0.9 * w.registry[big].maxEnergy; // fed, so not cannibal
  console.log(JSON.stringify({ wouldEatSpared: w.wouldEat(mc, ma), hungryEats: (mc.energy = 0, w.wouldEat(mc, ma)) }));
}
const e0 = stat('eaten'), s0 = stat('starved'), o0 = stat('old'), b0 = stat('burnt');
const N = SEASON_TICKS * seasons; let t0 = performance.now(), tAll = t0;
for (let i = 1; i <= N; i++) {
  try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); }
  if (i % (SEASON_TICKS * 2) === 0 || i === N) {
    const C = w.creatures.filter(c => !c.dead), sp = w.spStat(), d = stat('eaten') - e0, dead = d + stat('starved') - s0 + stat('old') - o0 + stat('burnt') - b0;
    console.log(JSON.stringify({ v, season: w.season, bodies: C.length, species: new Set(C.map(c => c.species)).size, born: { ...born }, passed: sp.passed, blocked: sp.blocked, merged: sp.merged, ext: { ...ext }, kinSpared: sp.spared,
      eatenShare: +(d / Math.max(1, dead)).toFixed(3), ms: +((performance.now() - t0) / (SEASON_TICKS * 2)).toFixed(1), errors })); t0 = performance.now();
  }
}
const sp = w.spStat();
console.log(JSON.stringify({ v, summary: true, ms: +((performance.now() - tAll) / N).toFixed(2), gapsSeen: sp.gaps.length, passedGaps: sp.gaps.filter(g => g.ok).map(g => `${g.kind} ${g.name}: ${g.founders}/${g.of} rms ${g.rms} null ${g.nul}`), blockedGaps: sp.gaps.filter(g => !g.ok).length,
  blockedRms: (a => a.length ? { median: a[a.length >> 1], max: a.at(-1) } : null)(sp.gaps.filter(g => !g.ok).map(g => g.rms - g.nul).sort((a, b) => a - b)) }));
if (v === 'force') console.log(JSON.stringify({ forced: forced.map(n => ({ n, extinct: w.registry[n].extinct, blended: w.registry[n].blended, live: w.creatures.filter(c => !c.dead && c.species === n).length })), mixedBirths: 'see births' }));
console.log(lines.filter(t => /become a kind|drifted apart|blend back|divide|part along|extinct/.test(t)).slice(0, 40).join('\n'));
