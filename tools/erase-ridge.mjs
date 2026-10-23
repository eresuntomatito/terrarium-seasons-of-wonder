// Remove the river-valley ridge without a trace (Luis, s2568: "remove it, don't leave trace that there ever was a ridge").
// The ridge's cells (the same ragged band tools/reshape-seal.mjs raised, plus a cell of margin) are filled back in from the land
// around them (repeated neighbour averaging, so slopes and valleys run through), with a little noise; the oval and its counters
// are dropped from the save. Run only while the server is held (or on a copy via SAVE=).
import fs from 'node:fs';
import { World, W, H, GW, GH, CELL } from '../sim/world.mjs';
const file = process.env.SAVE ?? 'data/world.json', raw = JSON.parse(fs.readFileSync(file)), w = new World(raw);
const { cx, cy, rx, ry } = raw.isoBox ?? { cx: 316, cy: 37, rx: 116, ry: 269 };
const R = w.reliefMap(), r = w.reliefRise(), T = w.tectonic, at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW);
const n1 = t => 0.5 + 0.25 * Math.sin(3 * t + 1.3) + 0.15 * Math.sin(7 * t + 0.4) + 0.1 * Math.sin(13 * t + 2.2);
const n2 = t => 0.5 + 0.3 * Math.sin(5 * t + 2.7) + 0.2 * Math.sin(11 * t + 0.9);
const band = new Uint8Array(GW * GH);
for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
  const x = (gx + 0.5) * CELL, y = (gy + 0.5) * CELL, dx = ((x - cx + W * 1.5) % W) - W / 2, dy = ((y - cy + H * 1.5) % H) - H / 2;
  const t = Math.atan2(dy / ry, dx / rx), rho = Math.hypot(dx / rx, dy / ry), reff = 1 / Math.hypot(Math.cos(t) / rx, Math.sin(t) / ry);
  const dist = (rho - 1) * reff + 14 * (n2(t * 1.7) - 0.5), half = CELL * (0.6 + 1.4 * n1(t)) + CELL; // + a cell of margin
  if (Math.abs(dist) <= half) band[at(gx, gy)] = 1;
}
const E = Float64Array.from(T, (v, i) => R[i] * r + v), cells = []; for (let i = 0; i < E.length; i++) if (band[i]) cells.push(i);
const before = cells.reduce((a, i) => a + E[i], 0) / cells.length;
for (let it = 0; it < 400; it++) for (const i of cells) { const x = i % GW, y = (i / GW) | 0; E[i] = (E[at(x + 1, y)] + E[at(x - 1, y)] + E[at(x, y + 1)] + E[at(x, y - 1)]) / 4; }
for (const i of cells) { const x = i % GW, y = (i / GW) | 0; E[i] += 0.025 * Math.sin(x * 0.9 + y * 0.37) * Math.sin(y * 0.71 - x * 0.23); T[i] = E[i] - R[i] * r; }
raw.tectonic = Array.from(T, v => Math.round(v * 1e4) / 1e4);
delete raw.isoBox; delete raw.isoBlocked; delete raw.isoIn; delete raw.isoOut;
for (const c of raw.creatures) { delete c.isoSide; delete c.wall; }
fs.writeFileSync(file, JSON.stringify(raw));
console.log(`ridge erased: ${cells.length} cells filled from the land around them (mean height ${before.toFixed(2)} → ${(cells.reduce((a, i) => a + E[i], 0) / cells.length).toFixed(2)}); oval and counters removed`);
