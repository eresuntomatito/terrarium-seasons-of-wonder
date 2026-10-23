// Headless experiment: honest dung (rollout.honestdung, free gift fading over P.honestFade seasons) against the free dung of old, on a copy of the world.
// Default 36000 ticks = 6.7 seasons; prints every N/4 ticks. Conservation: dung energy from the ground <= dungEff x (dung dropped + store at start).
//   node tools/dung-test.mjs old|honest [ticks] [world]    (copy data/world.json first; this never writes it)
import fs from 'fs';
const { World, PHYSICS: P } = await import(process.cwd() + '/sim/world.mjs');
if (process.env.HONEST_FADE) P.honestFade = +process.env.HONEST_FADE; // try another fade length
const v = process.argv[2], N = +process.argv[3] || 36000, src = process.argv[4] ?? 'data/world.json';
const w = new World(JSON.parse(fs.readFileSync(src, 'utf8'))); w.log = () => {};
w.rollout = { ...w.rollout, honestdung: v === 'old' ? Infinity : w.season };
const eff = P?.dungEff ?? 0.3, sum = a => a.reduce((x, y) => x + y, 0);
let inc = {}, errors = 0, t0 = performance.now();
const feed = w.feed.bind(w); w.feed = (c, e, l, kind) => { inc[kind] = (inc[kind] ?? 0) + e; return feed(c, e, l, kind); };
let store0 = sum(w.dungMap ?? []), gift0 = 0, dropped0 = w.dungDropped ?? 0, eaten0 = w.dungEaten ?? 0;
const q = (a, p) => a.length ? +a[Math.min(a.length - 1, Math.floor(p * a.length))].toFixed(3) : 0;
for (let k = 1; k <= 4; k++) {
  for (let i = 0; i < N / 4; i++) { try { w.step(); } catch (e) { if (!errors++) console.error('ERROR', e.message, e.stack.split('\n')[1]); } }
  const C = w.creatures.filter(c => !c.dead), g = C.map(c => c.gut ?? 0).sort((a, b) => a - b), tot = sum(Object.values(inc)) || 1;
  const stat = f => Object.values(w.stats).reduce((a, x) => a + (x[f] ?? 0), 0);
  const share = Object.fromEntries(Object.entries(inc).map(([a, b]) => [a, +(b / tot).toFixed(3)]));
  const gift = (w.giftEnergy ?? 0) - gift0, dropped = (w.dungDropped ?? 0) - dropped0, eaten = (w.dungEaten ?? 0) - eaten0, dungE = inc.dung ?? 0;
  const o = { v, t: k * N / 4, bodies: C.length, species: new Set(C.map(c => c.species)).size, pop: C.reduce((m, c) => (m[c.species] = (m[c.species] ?? 0) + 1, m), {}), starved: stat('starved'), eaten: stat('eaten'), plants: Math.round(sum(w.plants)),
    share, gut: { med: q(g, 0.5), p90: q(g, 0.9), max: q(g, 1), over15: g.filter(x => x > 0.15).length }, dungStore: +sum(w.dungMap ?? []).toFixed(2), dungEnergy: +dungE.toFixed(1),
    ms: +((performance.now() - t0) / (N / 4)).toFixed(1), errors };
  if (v !== 'old') Object.assign(o, { giftFactor: +w.dungGift().toFixed(2), gift: +gift.toFixed(1), storeEnergy: +(dungE - gift).toFixed(1), dropped: +dropped.toFixed(2), eatenDung: +eaten.toFixed(2), ceiling: +(eff * (dropped + store0)).toFixed(2), conserved: dungE - gift <= eff * (dropped + store0) + 1e-6 });
  console.log(JSON.stringify(o)); inc = {}; gift0 = w.giftEnergy ?? 0; dropped0 = w.dungDropped ?? 0; eaten0 = w.dungEaten ?? 0; store0 = sum(w.dungMap ?? []); t0 = performance.now();
}
