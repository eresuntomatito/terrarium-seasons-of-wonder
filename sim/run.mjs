// Run a fresh world headless, as fast as possible, and print its history.
// Usage: node sim/run.mjs [ticks]   Try physics variants with PHYSICS='{"overpower":1.3}', species with TUNE='{"stalker":{...}}'.
import { World, PHYSICS, TICKS_PER_DAY } from './world.mjs';

const ticks = Number(process.argv[2]) || 20000;
Object.assign(PHYSICS, JSON.parse(process.env.PHYSICS ?? '{}'));
const w = new World(null);
for (const [name, over] of Object.entries(JSON.parse(process.env.TUNE ?? '{}'))) Object.assign(w.registry[name], over);
if (!process.env.QUIET) w.onEvent = e => { if (!/oldest|th generation/.test(e.text)) console.log(`    [${e.t}] ${e.text}`); };

const t0 = performance.now();
for (let i = 1; i <= ticks; i++) {
  w.step();
  if (i % (TICKS_PER_DAY * 2) === 0) {
    const traits = w.traits();
    const pops = Object.entries(traits).filter(([n]) => w.lastCounts[n] > 0)
      .map(([n, t]) => `${n} ${w.lastCounts[n]} (${t.role} tl${t.tl} s${t.size} g${t.gut})`).join('  ');
    const plants = w.plants.reduce((a, b) => a + b, 0);
    console.log(`day ${String(i / TICKS_PER_DAY).padStart(3)}  plants ${plants.toFixed(0).padStart(5)}  ${pops || '(empty)'}  ${((performance.now() - t0) / i).toFixed(1)}ms/tick`);
  }
}
