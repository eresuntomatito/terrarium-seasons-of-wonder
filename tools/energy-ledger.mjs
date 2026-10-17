// Energy ledger (headless, observes only): one season of a world copy, every store and flow in body-energy units.
//   node tools/energy-ledger.mjs [world] [ticks]      (default data/world.json, one season)
// Plants are counted in body-energy units at a pure grazer's gut and average quality (× plantEnergy × grassFood).
import fs from 'fs';
const { World, PHYSICS: P, SEASON_TICKS } = await import(process.cwd() + '/sim/world.mjs');
const src = process.argv[2] ?? 'data/world.json', N = +process.argv[3] || SEASON_TICKS;
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); w.log = () => {};
const sum = a => { let s = 0; for (const v of a) s += v; return s; };
const plantE = () => sum(w.plants) * P.plantEnergy * (w.grassFood ?? 1);
const live = () => w.creatures.filter(c => !c.dead && !w.registry[c.species].unique);
const bodyPool = () => { let e = 0, f = 0, b = 0; for (const c of live()) { e += Math.max(0, c.energy); f += c.fat ?? 0; b += c.body ?? 0; } return { e, f, b, all: e + f + b }; };
const corpsePool = () => sum(w.corpses.map(k => Math.max(0, k.energy)));
const L = { growth: 0, grazedRaw: 0, income: {}, deathBody: { eaten: 0, starved: 0, old: 0, other: 0 }, kills: 0 };
const feed = w.feed.bind(w); w.feed = (c, e, lvl, kind) => { if (e > 0 && !w.registry[c.species].unique) L.income[kind] = (L.income[kind] ?? 0) + e; return feed(c, e, lvl, kind); };
const die = w.die.bind(w); w.die = (c, cause) => { if (!w.registry[c.species].unique) { const b = Math.max(0, c.energy) + w.bodyHeld(c); L.deathBody[cause in L.deathBody ? cause : 'other'] += b; if (cause === 'eaten') L.kills++; } return die(c, cause); };
const up = w.updatePlants.bind(w); w.updatePlants = (...a) => { const b = plantE(); const r = up(...a); L.growth += plantE() - b; return r; };
const B0 = bodyPool(), C0 = corpsePool(), Pl0 = plantE();
for (let i = 0; i < N; i++) { const p = plantE(), g = L.growth; w.step(); L.grazedRaw += -((plantE() - p) - (L.growth - g)); }
const B1 = bodyPool(), C1 = corpsePool(), Pl1 = plantE();
const income = Object.values(L.income).reduce((a, b) => a + b, 0), deaths = Object.values(L.deathBody).reduce((a, b) => a + b, 0);
const meat = L.deathBody.eaten, toCorpses = deaths - meat + meat * P.scraps;
const carrion = L.income.carrion ?? 0, corpseOut = C0 + toCorpses - C1; // what left the carcasses: eaten (raw) + rot + crumbled
const upkeep = income - (B1.all - B0.all) - deaths; // everything bodies spent on living (metabolism, movement, climbing, cold, wading, falls, lunges, birth losses, fat-making losses)
const f = v => v.toFixed(0).padStart(7);
console.log(`ENERGY LEDGER · ${N} ticks from season ${w.season - Math.round(N / SEASON_TICKS)} · ${live().length} bodies at the end`);
console.log(`\nSTORES (start → end)`);
console.log(`  plants (as grazer energy) ${f(Pl0)} → ${f(Pl1)}`);
console.log(`  bodies: fuel ${B0.e.toFixed(0)} → ${B1.e.toFixed(0)}, fat ${B0.f.toFixed(0)} → ${B1.f.toFixed(0)}, tissue ${B0.b.toFixed(0)} → ${B1.b.toFixed(0)}  (all ${f(B0.all)} → ${f(B1.all)})`);
console.log(`  carcasses ${f(C0)} → ${f(C1)}`);
console.log(`\nFLOWS over the window`);
console.log(`  SUN → plants (net growth after withering)      ${f(L.growth)}`);
console.log(`  plants → grazers' mouths (raw, before the gut) ${f(L.grazedRaw)}   → digested as 'plant' ${f(L.income.plant ?? 0)}  (gut, quality, lean grass, other ways of life)`);
for (const [k, v] of Object.entries(L.income).sort((a, b) => b[1] - a[1])) console.log(`  income: ${k.padEnd(8)} ${f(v)}  ${(v / income * 100).toFixed(1)}%${k === 'dung' ? (w.rolled('honestdung') && w.dungGift() === 0 ? '   (honest: from what grazers left undigested)' : '   ← (partly) created, not taken from any store') : ''}`);
console.log(`  income total                                   ${f(income)}`);
console.log(`  bodies → living costs (metabolism, moving, climbing, cold, births, fat-making)  ${f(upkeep)}`);
console.log(`  bodies → death: starved ${f(L.deathBody.starved)}, old ${f(L.deathBody.old)}, eaten ${f(meat)} (${L.kills} kills), other ${f(L.deathBody.other)}`);
console.log(`  kills: meat ${f(meat)} → eaten as flesh ${f(L.income.flesh ?? 0)}, scraps to carcasses ${f(meat * P.scraps)}, lost ${f(meat * (1 - P.scraps) - (L.income.flesh ?? 0))}`);
console.log(`  carcasses: in ${f(toCorpses)}, out ${f(corpseOut)} = eaten as carrion (digested ${f(carrion)}) + rot and crumble to soil + digestion loss`);
console.log(`\nSHARES: of the sun's net growth, ${(L.grazedRaw / Math.max(1, L.growth) * 100).toFixed(0)}% was grazed; of body income, ${((L.income.dung ?? 0) / income * 100).toFixed(0)}% came from nothing (dung); of all deaths' energy, ${(((L.income.flesh ?? 0) + carrion) / Math.max(1, deaths) * 100).toFixed(1)}% came back into bodies (flesh + carrion).`);
