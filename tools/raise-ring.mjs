// Raise a ring of high crags around world.isoBox (Luis, s2420: "the world's cliffs and mountains should do that work").
// Run only while the server is held: node tools/raise-ring.mjs [height] [thickness cells]. Edits data/world.json's tectonic layer.
import fs from 'node:fs';
import { World, PHYSICS as P, GW, GH, CELL } from '../sim/world.mjs';
const file = process.env.SAVE ?? 'data/world.json', raw = JSON.parse(fs.readFileSync(file)), w = new World(raw), b = raw.isoBox;
if (!b) { console.error('no isoBox'); process.exit(1); }
const height = +(process.argv[2] ?? 1.15), thick = +(process.argv[3] ?? 2);
const R = w.reliefMap(), r = w.reliefRise(), T = w.tectonic, gx0 = Math.floor(b.x0 / CELL), gx1 = Math.floor(b.x1 / CELL), gy0 = Math.floor(b.y0 / CELL), gy1 = Math.floor(b.y1 / CELL);
let cells = 0, lifted = 0, peak = 0;
for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
  if (gx < gx0 || gx > gx1 || gy < gy0 || gy > gy1) continue; // the ring stands on the box's inner edge
  if (Math.min(gx - gx0, gx1 - gx, gy - gy0, gy1 - gy) >= thick) continue;
  const i = ((gy + GH) % GH) * GW + ((gx + GW) % GW), e = R[i] * r + T[i];
  const target = height + 0.12 * Math.sin(gx * 0.9) * Math.cos(gy * 0.7) + 0.08 * Math.sin((gx + gy) * 0.37); // a ragged crest, not a ruler line
  if (e < target) { T[i] += target - e; lifted += target - e; } cells++; peak = Math.max(peak, R[i] * r + T[i]);
}
// Snap the sealed box to the ring's cell edges, and step anyone standing on the new crags two cells inward (no one stranded).
raw.isoBox = { ...b, x0: gx0 * CELL, y0: gy0 * CELL, x1: (gx1 + 1) * CELL, y1: (gy1 + 1) * CELL };
const cx = (raw.isoBox.x0 + raw.isoBox.x1) / 2, cy = (raw.isoBox.y0 + raw.isoBox.y1) / 2; let moved = 0;
for (const c of raw.creatures) { const gx = Math.floor(c.x / CELL), gy = Math.floor(c.y / CELL);
  if (gx >= gx0 && gx <= gx1 && gy >= gy0 && gy <= gy1 && Math.min(gx - gx0, gx1 - gx, gy - gy0, gy1 - gy) < thick) {
    const dx = cx - c.x, dy = cy - c.y, l = Math.hypot(dx, dy) || 1; c.x += dx / l * CELL * (thick + 1); c.y += dy / l * CELL * (thick + 1); c.vx = 0; c.vy = 0; c.isoSide = true; moved++; } }
console.log(`box snapped to cells ${JSON.stringify(raw.isoBox)}; ${moved} bodies stepped off the new crags, inward`);
raw.tectonic = Array.from(T, v => Math.round(v * 1e4) / 1e4);
fs.writeFileSync(file, JSON.stringify(raw));
console.log(`ring cells ${cells}, total lift ${lifted.toFixed(1)}, crest up to ${peak.toFixed(2)} (crags need ${P.cragNeed} from elevation 1.0; best climber today ${Math.max(...raw.creatures.map(c => c.climb ?? 0)).toFixed(2)})`);
