import fs from 'fs';
const { World } = await import(process.cwd() + '/sim/world.mjs');
const w = new World(JSON.parse(fs.readFileSync('data/world.json', 'utf8')));
const logs = []; w.log = t => logs.push(t);
const k = w.creatures.find(c => c.species === 'kraken'); if (k) { k.energy = 3; k.bumps = 6; } // force the trapped rage and shove paths
let errors = 0;
for (let i = 0; i < 400; i++) { try { w.step(); } catch (e) { errors++; if (errors < 3) console.log('ERROR', e.message, e.stack.split('\n')[1]); } }
console.log('errors', errors, 'shoved', k?.shoved ?? 'never', 'raged', k?.raged ?? 'never');
console.log(logs.filter(t => /rage|steward|first season/.test(t)).slice(0, 4).join('\n'));
