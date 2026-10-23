// A fishing country in the empty west highlands (Luis, s2645: "fishing can be a main way of life… almost aquatic"): the stream
// valleys inside an oval are lowered into a chain of lakes (ragged floors below a sill), the steep land around them is left as it is,
// and one outlet river is carved east to the central basin — swimmers can travel it, walkers still face the slopes.
// Run only while the server is held (or on a copy via SAVE=). node tools/make-lakes.mjs [cx cy rx ry]
import fs from 'node:fs';
import { World, W, H, GW, GH, CELL } from '../sim/world.mjs';
const file = process.env.SAVE ?? 'data/world.json', raw = JSON.parse(fs.readFileSync(file)), w = new World(raw);
const [cx, cy, rx, ry] = (process.argv.length > 2 ? process.argv.slice(2) : [220, 355, 160, 165]).map(Number);
const R = w.reliefMap(), r = w.reliefRise(), T = w.tectonic, E = i => R[i] * r + T[i], at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW);
const setE = (i, e) => { T[i] += e - E(i); };
const noise = (x, y) => 0.5 + 0.25 * Math.sin(x * 0.61 + y * 0.23) + 0.25 * Math.sin(x * 0.17 - y * 0.47);
const rho = (gx, gy) => { const dx = ((gx + 0.5) * CELL - cx) / rx, dy = ((gy + 0.5) * CELL - cy) / ry, a = Math.atan2(dy, dx); return Math.hypot(dx, dy) / (1 + 0.18 * Math.sin(3 * a + 0.7) + 0.12 * Math.sin(5 * a + 2.1) + 0.08 * Math.sin(9 * a + 4.0)); }; // a ragged edge, never an oval
const inside = []; for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) if (rho(gx, gy) < 1) inside.push(at(gx, gy));
const sorted = inside.map(E).sort((a, b) => a - b), p45 = sorted[Math.floor(0.45 * sorted.length)];
const FLOOR = +(process.env.FLOOR ?? 0.55), SILL = +(process.env.SILL ?? 0.70), DEEP = 0.1;
// 1. lakes: the valley cells (below the region's 45th percentile), well inside the oval, grown by one cell
const lake = new Set(); for (const i of inside) { const gx = i % GW, gy = (i / GW) | 0; if (E(i) < p45 && rho(gx, gy) < 0.85) lake.add(i); }
for (const i of [...lake]) { const gx = i % GW, gy = (i / GW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(gx + dx, gy + dy); if (rho(gx + dx, gy + dy) < 0.9) lake.add(j); } }
let lowered = 0; for (const i of lake) { const gx = i % GW, gy = (i / GW) | 0, f = FLOOR - DEEP * 0.5 + DEEP * noise(gx, gy); if (E(i) > f) { setE(i, f); lowered++; } }
// 2. shores: a one-cell slope from the lake to the land, so the edges are not cliffs
for (const i of lake) { const gx = i % GW, gy = (i / GW) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = at(gx + dx, gy + dy); if (lake.has(j)) continue; const t = SILL + 0.08 + 0.06 * noise(gx + dx, gy + dy); if (E(j) > t) setE(j, (E(j) + t) / 2); } }
// 2b. transitional water (Luis: "channels or areas that allow transitional swimmers to start settling"): a marsh band two cells
// wide around the lakes, its floor just under the water line (wading depth), and braided shallow side channels winding out
// into the side valleys — wet ground → wadeable → swim-deep, so a modest swimmer can feed at the edges first.
const marsh = new Set();
for (const i of lake) { const gx = i % GW, gy = (i / GW) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = at(gx + dx, gy + dy); if (!lake.has(j) && rho(gx + dx, gy + dy) < 0.95) marsh.add(j); } }
for (const j of marsh) { const gx = j % GW, gy = (j / GW) | 0, t = SILL + (+(process.env.MARSH ?? 0.10)) + 0.08 * noise(gx * 1.7, gy * 1.3); if (E(j) > t) setE(j, t); }
let braid = 0; for (let k = 0; k < 7; k++) { const start = [...lake][Math.floor((k + 0.5) / 7 * lake.size)]; let x = start % GW, y = (start / GW) | 0, a = k * 0.9 + 0.4;
  for (let s = 0; s < 14; s++) { a += 0.6 * Math.sin(s * 1.3 + k); x += Math.round(Math.cos(a)); y += Math.round(Math.sin(a)); if (rho(x, y) > 0.95) break; const i = at(x, y); if (lake.has(i)) continue; const t = SILL + (+(process.env.MARSH ?? 0.10)) + 0.04 * noise(x, y); if (E(i) > t) { setE(i, t); braid++; } marsh.add(i); } }
// 2c. a few fish to start (they spread on their own after)
if (raw.fish) for (const i of lake) raw.fish[i] = Math.max(raw.fish[i] ?? 0, 0.05);
console.log(`marsh ${marsh.size} cells (wading depth), braided channels ${braid} cells`);
// 3. the outlet river: from the lake cell furthest east, a wandering channel to the central basin (x ≈ cx + rx + 220), bed falling from the sill
const east = [...lake].reduce((b, i) => ((i % GW) > (b % GW) ? i : b)), sx = (east % GW + 0.5) * CELL, sy = ((east / GW | 0) + 0.5) * CELL, tx = cx + rx + 220, ty = cy;
let carved = 0; const steps = Math.ceil(Math.hypot(tx - sx, ty - sy) / (CELL / 2));
for (let s = 0; s <= steps; s++) { const t = s / steps, x = sx + (tx - sx) * t, y = sy + (ty - sy) * t + 18 * Math.sin(t * 7.3), bed = SILL - 0.08 * t;
  for (let o = -1; o <= 1; o++) { const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL) + o, i = at(gx, gy), b = bed + (o ? 0.03 : 0); if (E(i) > b) { setE(i, b); carved++; } } }
raw.tectonic = Array.from(T, v => Math.round(v * 1e4) / 1e4); fs.writeFileSync(file, JSON.stringify(raw));
console.log(`lakes: ${lake.size} cells (${lowered} lowered to ~${FLOOR}), outlet river ${carved} cells from (${sx | 0},${sy | 0}) to (${tx | 0},${ty | 0}); region p45 height ${p45.toFixed(2)}`);
