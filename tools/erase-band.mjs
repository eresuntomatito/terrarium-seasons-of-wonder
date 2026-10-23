// Wear down the crags that cut the sealed oval in two (Luis, s2434): inside the oval (rho < 0.85, the outer ridge untouched), every
// cell too steep to cross in the given map rows sinks to the mean height of the passable land within 4 cells, with a little noise.
// node tools/erase-band.mjs rowFrom rowTo   (rows of 8-px cells; wraps, e.g. 74 6). Run while held, or SAVE=copy.
import fs from 'node:fs';
import { World, W, H, GW, GH, CELL } from '../sim/world.mjs';
const file = process.env.SAVE ?? 'data/world.json', raw = JSON.parse(fs.readFileSync(file)), w = new World(raw), b = raw.isoBox;
const [r0, r1] = process.argv.slice(2).map(Number), inRows = y => r0 <= r1 ? y >= r0 && y <= r1 : y >= r0 || y <= r1;
const N = w.climbNeed(), R = w.reliefMap(), r = w.reliefRise(), T = w.tectonic, E = i => R[i] * r + T[i], at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW);
const rho = i => { const x = (i % GW + 0.5) * CELL, y = (((i / GW) | 0) + 0.5) * CELL, dx = ((x - b.cx + W * 1.5) % W) - W / 2, dy = ((y - b.cy + H * 1.5) % H) - H / 2; return Math.hypot(dx / b.rx, dy / b.ry); };
const cut = []; for (let i = 0; i < N.length; i++) if (inRows((i / GW) | 0) && rho(i) < 0.85 && N[i] >= 0.3) cut.push(i);
const targets = cut.map(i => { const x = i % GW, y = (i / GW) | 0; let s = 0, n = 0; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const j = at(x + dx, y + dy); if (N[j] < 0.3 && rho(j) < 0.9) { s += E(j); n++; } } return [i, n ? s / n : E(i) * 0.6]; });
for (const [i, t] of targets) { const noise = 0.03 * Math.sin(i * 0.37) + 0.02 * Math.sin(i * 1.13); T[i] -= E(i) - (t + noise); }
raw.tectonic = Array.from(T, v => Math.round(v * 1e4) / 1e4); fs.writeFileSync(file, JSON.stringify(raw));
const N2 = new World(JSON.parse(JSON.stringify(raw))).climbNeed(); console.log(`worn down ${cut.length} crag cells in rows ${r0}–${r1}; still steep there: ${cut.filter(i => N2[i] >= 0.3).length}`);
