// Migration paths and their bottlenecks (Luis, s2650): from a copy of the live world, (1) traffic — where bodies actually walk over
// a stretch of ticks, and which way; (2) least-cost routes between the places life gathers (species' centres, the lake country),
// costed by the climbing the land asks and the depth of water (for a typical body); (3) the pinch points on those routes — cells
// that ask more climbing than most bodies can give — with how much traffic reaches them. Read-only. Run: node tools/paths.mjs [ticks]
import fs from 'node:fs';
import { World, W, H, GW, GH, CELL, PHYSICS as P } from '../sim/world.mjs';
const w = new World(JSON.parse(fs.readFileSync(process.env.SAVE ?? 'data/world.json'))), ticks = +(process.argv[2] ?? 1350);
const at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW), cs = () => w.creatures.filter(c => !c.dead);
// 1. traffic
const N = new Float32Array(GW * GH), FX = new Float32Array(GW * GH), FY = new Float32Array(GW * GH); let prev = new Map(cs().map(c => [c.id, [c.x, c.y]]));
for (let t = 0; t < ticks; t++) { w.step(); if (t % 3) continue; const now = new Map(); for (const c of cs()) { now.set(c.id, [c.x, c.y]); const p = prev.get(c.id); if (!p) continue; let dx = c.x - p[0], dy = c.y - p[1]; if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W; if (dy > H / 2) dy -= H; if (dy < -H / 2) dy += H; const i = at(Math.floor(c.x / CELL), Math.floor(c.y / CELL)); N[i]++; FX[i] += dx; FY[i] += dy; } prev = now; }
// 2. routes: cost = 1 + 25 × climb need (cells above the best climber's reach are walls), + swim cost for deep water
const need = w.climbNeed(), climbs = cs().map(c => c.climb ?? 0).sort((a, b) => a - b), best = climbs.at(-1), typical = climbs[climbs.length >> 1];
const swimDepth = 0.08, cost = i => { if (need[i] > best) return Infinity; const d = w.water?.[i] ?? 0; return 1 + 25 * Math.max(0, need[i] - 0.15) + (d > swimDepth ? 6 : 0); };
const route = (a, b) => { const dist = new Float64Array(GW * GH).fill(Infinity), from = new Int32Array(GW * GH).fill(-1), done = new Uint8Array(GW * GH); const q = [[0, a]]; dist[a] = 0;
  while (q.length) { let k = 0; for (let j = 1; j < q.length; j++) if (q[j][0] < q[k][0]) k = j; const [d, i] = q[k]; q[k] = q[q.length - 1]; q.pop(); if (done[i]) continue; done[i] = 1; if (i === b) break;
    const x = i % GW, y = (i / GW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(x + dx, y + dy), c = cost(j); if (done[j] || !isFinite(c)) continue; if (d + c < dist[j]) { dist[j] = d + c; from[j] = i; q.push([d + c, j]); } } }
  const path = []; for (let i = b; i >= 0 && i !== a; i = from[i]) path.push(i); return isFinite(dist[b]) ? path.reverse() : null; };
const cell = (x, y) => at(Math.floor(x / CELL), Math.floor(y / CELL));
const hubs = {}; for (const c of cs()) { const h = (hubs[c.species] ??= { x: 0, y: 0, n: 0 }); h.x += c.x; h.y += c.y; h.n++; } // (no wrap correction: patches are compact)
const places = Object.entries(hubs).map(([k, h]) => [k, cell(h.x / h.n, h.y / h.n)]); places.push(['lake country', cell(220, 355)]);
const pinch = new Map(); let lines = [];
for (const [name, from] of places) { const tgt = name === 'lake country' ? null : 'lake country'; // every place to the lake country, and to its two nearest places
  const others = places.filter(([n]) => n !== name).map(([n, i]) => [n, i, Math.hypot((i % GW) - (from % GW), ((i / GW) | 0) - ((from / GW) | 0))]).sort((a, b) => a[2] - b[2]).slice(0, 2);
  for (const [n, to] of others.concat(tgt ? [[tgt, places.at(-1)[1]]] : [])) { if (n < name && n !== 'lake country') continue; const p = route(from, to); if (!p) { lines.push(`${name} → ${n}: NO ROUTE for a body that climbs ${best.toFixed(2)}`); continue; }
    const hard = p.filter(i => need[i] > typical), maxNeed = Math.max(...p.map(i => need[i])), traffic = p.reduce((s, i) => s + N[i], 0) / p.length;
    for (const i of hard) pinch.set(i, (pinch.get(i) ?? 0) + 1);
    lines.push(`${name} → ${n}: ${p.length} cells, max climb ${maxNeed.toFixed(2)} (typical body ${typical.toFixed(2)}), ${hard.length} cells beyond a typical climber, mean traffic ${traffic.toFixed(1)}`); } }
console.log(`traffic over ${ticks} ticks: busiest cells ${[...N].sort((a, b) => b - a).slice(0, 3).map(x => x | 0).join(', ')}; cells walked at all ${[...N].filter(x => x > 0).length}/${N.length}`);
console.log(lines.join('\n'));
const top = [...pinch.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([i, k]) => `(${(i % GW) * CELL + 4},${((i / GW) | 0) * CELL + 4}) need ${need[i].toFixed(2)} on ${k} routes, traffic ${N[i] | 0}`);
console.log('PINCH POINTS (cells most routes must climb through):\n  ' + top.join('\n  '));
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify({ season: w.season, pinch: [...pinch.entries()], traffic: Array.from(N) }));
