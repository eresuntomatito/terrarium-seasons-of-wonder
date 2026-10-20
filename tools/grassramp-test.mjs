// Headless: the grass ramp (rollout.grassramp, Luis s2013) against the old rules, on a copy of the world. Never writes data/world.json.
//   node tools/grassramp-test.mjs old|new [seasons] [world]
// Every season: bodies, species, ways of life, grass worth (grassLean), frozen, starved / eaten / old in the season, income shares by food.
import fs from 'fs';
const { World, SEASON_TICKS } = await import(process.cwd() + '/sim/world.mjs');
const v = process.argv[2] ?? 'new', S = +process.argv[3] || 7, src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); const logs = []; w.log = s => { if (/grass/.test(s)) logs.push(`[s${w.season}] ${s}`); };
w.rollout = { ...w.rollout, grassramp: v === 'new' ? w.season : Infinity };
let errors = 0, inc = {}; const t0 = performance.now();
const feed = w.feed.bind(w); w.feed = (c, e, l, kind) => { inc[kind] = (inc[kind] ?? 0) + e; return feed(c, e, l, kind); };
const tot = k => Object.values(w.stats).reduce((a, s) => a + (s[k] ?? 0), 0);
for (let s = 1; s <= S; s++) {
  const d0 = { starved: tot('starved'), eaten: tot('eaten'), old: tot('old') }; inc = {};
  for (let t = 0; t < SEASON_TICKS; t++) try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); }
  const live = w.creatures.filter(c => !c.dead), niches = {}; for (const c of live) { const n = w.nicheOf(c); niches[n] = (niches[n] ?? 0) + 1; }
  const all = Object.values(inc).reduce((a, b) => a + b, 0) || 1, share = Object.fromEntries(Object.entries(inc).map(([k, x]) => [k, +(x / all).toFixed(3)]));
  console.log(JSON.stringify({ v, season: w.season, bodies: live.length, species: new Set(live.map(c => c.species)).size, niches, grassLean: w.grassLean ?? 1, frozen: !!w.grassRampFrozen,
    starved: tot('starved') - d0.starved, eaten: tot('eaten') - d0.eaten, old: tot('old') - d0.old, share, msTick: +((performance.now() - t0) / (s * SEASON_TICKS)).toFixed(1), errors }));
}
for (const l of logs) console.log(l);
