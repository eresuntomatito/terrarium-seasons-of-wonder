// Stress test for hidden minds (slips carried within a species): many slips, then check minds run, spread and split cleanly.
import fs from 'fs';
const { World, PHYSICS } = await import(process.cwd() + '/sim/world.mjs');
const w = new World(JSON.parse(fs.readFileSync('data/world.json', 'utf8')));
PHYSICS.mindSlip = 0.05; // ~25× the usual rate, to exercise the path
const logs = []; w.log = t => logs.push(t);
let errors = 0;
const check = () => {
  let bad = 0, carriers = 0, minds = 0;
  for (const c of w.creatures) {
    if (c.dead) continue;
    const g = w.genome[w.mindKey(c)];
    if (!g || c.k.length !== g.consts.length) bad++;
    if (c.morph) carriers++;
  }
  for (const n of w.living()) minds += Object.keys(w.registry[n].morphs ?? {}).length;
  return { bad, carriers, minds, species: w.living().length, seizures: Object.values(w.stats).reduce((a, s) => a + (s.seizures ?? 0), 0) };
};
const t0 = w.tick, before = check();
for (let k = 0; k < 6; k++) { for (let i = 0; i < 1000; i++) { try { w.step(); } catch (e) { if (errors++ < 2) console.log('ERROR', e.message, e.stack.split('\n')[1]); } } console.log(`t+${w.tick - t0}`, JSON.stringify(check())); }
console.log('errors', errors, 'seizures before', before.seizures);
console.log(logs.filter(t => /think differently|new way of thinking|divide along/.test(t)).slice(0, 8).join('\n'));
