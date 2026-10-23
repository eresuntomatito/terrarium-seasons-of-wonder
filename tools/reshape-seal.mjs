// Replace the square ring with a natural, porous ridge around an oval (Luis, s2428: "clean previous seal… don't make it so clean
// and geometric; it can be a bit porous but make it hard to get out"). Run only while the server is held (or on a copy via SAVE=).
// node tools/reshape-seal.mjs [cx cy rx ry]   — edits the tectonic layer; isoBox becomes a counted oval (no invisible wall).
import fs from 'node:fs';
import { World, PHYSICS as P, W, H, GW, GH, CELL } from '../sim/world.mjs';
const file = process.env.SAVE ?? 'data/world.json', raw = JSON.parse(fs.readFileSync(file)), w = new World(raw);
const [cx, cy, rx, ry] = (process.argv.length > 2 ? process.argv.slice(2) : [316, 37, 116, 269]).map(Number);
const R = w.reliefMap(), r = w.reliefRise(), T = w.tectonic, E = i => R[i] * r + T[i], at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW);
const old = raw.isoBox;
// 1. The old square ring settles back: each of its cells takes the mean height of the land 3–4 cells around it (outside the ring).
if (old && old.x0 !== undefined) {
  const g0 = Math.floor(old.x0 / CELL), g1 = Math.floor(old.x1 / CELL) - 1, h0 = Math.floor(old.y0 / CELL), h1 = Math.floor(old.y1 / CELL) - 1;
  const onRing = (gx, gy) => gx >= g0 && gx <= g1 && gy >= h0 && gy <= h1 && Math.min(gx - g0, g1 - gx, gy - h0, h1 - gy) < 2;
  const target = new Map();
  for (let gy = h0; gy <= h1; gy++) for (let gx = g0; gx <= g1; gx++) if (onRing(gx, gy)) {
    let s = 0, n = 0; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = gx + dx, y = gy + dy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 3 || onRing(x, y)) continue; s += E(at(x, y)); n++; }
    target.set(at(gx, gy), s / n);
  }
  for (const [i, t] of target) T[i] = t - R[i] * r;
  console.log(`old square ring: ${target.size} cells settled back into the land around them`);
}
// 2. A ragged ridge along the oval: width 1–3 cells, crest 1.1–1.6 (crags 0.7, beyond every climber today), a few lower saddles
// (0.85–0.95: climbable by the best), and the river channel left as a gorge (swimmers may pass).
const n1 = t => 0.5 + 0.25 * Math.sin(3 * t + 1.3) + 0.15 * Math.sin(7 * t + 0.4) + 0.1 * Math.sin(13 * t + 2.2); // 0…1-ish along the ring
const n2 = t => 0.5 + 0.3 * Math.sin(5 * t + 2.7) + 0.2 * Math.sin(11 * t + 0.9);
const saddle = t => Math.sin(4 * t + 0.6) > 0.93; // a few short, lower stretches
let lifted = 0, ridge = 0, saddles = 0, gorge = 0;
for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
  const x = (gx + 0.5) * CELL, y = (gy + 0.5) * CELL, dx = ((x - cx + W * 1.5) % W) - W / 2, dy = ((y - cy + H * 1.5) % H) - H / 2;
  const t = Math.atan2(dy / ry, dx / rx), rho = Math.hypot(dx / rx, dy / ry), reff = 1 / Math.hypot(Math.cos(t) / rx, Math.sin(t) / ry);
  const wobble = 14 * (n2(t * 1.7) - 0.5), dist = (rho - 1) * reff + wobble, half = CELL * (0.6 + 1.4 * n1(t));
  if (Math.abs(dist) > half) continue;
  const i = at(gx, gy);
  if ((w.water?.[i] ?? 0) > 0.04) { gorge++; continue; } // the river keeps its way through: a gorge
  const isSaddle = saddle(t), h = isSaddle ? 0.85 + 0.1 * n2(t) : 1.1 + 0.5 * n1(t * 2.3) * (1 - Math.abs(dist) / half * 0.4);
  if (E(i) < h) { lifted += h - E(i); T[i] += h - E(i); }
  ridge++; if (isSaddle) saddles++;
}
raw.tectonic = Array.from(T, v => Math.round(v * 1e4) / 1e4);
raw.isoBox = { cx, cy, rx, ry, since: raw.season + 1, block: false }; raw.isoBlocked = 0; raw.isoIn = 0; raw.isoOut = 0;
for (const c of raw.creatures) delete c.isoSide;
fs.writeFileSync(file, JSON.stringify(raw));
console.log(`new ridge: ${ridge} cells (${saddles} saddle cells), ${gorge} river cells left as a gorge; lift ${lifted.toFixed(1)}; oval ${JSON.stringify(raw.isoBox)}`);
