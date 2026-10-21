// The sealed area's readout (Luis, s2417): who is inside and outside, crossings stopped, and how far apart the two pools drift.
// Run: node tools/iso.mjs
import fs from 'node:fs';
import { World, PHYSICS as P } from '../sim/world.mjs';
const w = new World(JSON.parse(fs.readFileSync('data/world.json'))), cs = w.creatures.filter(c => !c.dead);
if (!w.isoBox) { console.log('no sealed area'); process.exit(0); }
const inn = cs.filter(c => w.inIso(c.x, c.y)), out = cs.filter(c => !w.inIso(c.x, c.y)), mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
const per = a => a.reduce((o, c) => (o[c.species] = (o[c.species] ?? 0) + 1, o), {});
const gap = (A, B, n = 400) => { const g = []; for (let i = 0; i < n && A.length && B.length; i++) { const a = A[Math.floor(Math.random() * A.length)], b = B[Math.floor(Math.random() * B.length)]; if (a !== b) g.push(w.relatedGap(a, b)); } return mean(g); };
const tr = a => Object.fromEntries(['size', 'gut', 'climb', 'swim', 'browse', 'decomp', 'snap'].map(k => [k, +mean(a.map(c => k === 'size' ? (c.sizeGene ?? c.size) : (c[k] ?? 0))).toFixed(3)]));
console.log(JSON.stringify({ season: w.season, sealedSince: w.isoBox.since, inside: inn.length, outside: out.length, speciesInside: per(inn), crossingsStopped: w.isoBlocked ?? 0, wentIn: w.isoIn ?? 0, wentOut: w.isoOut ?? 0, zone: w.isoBox,
  kinGap: { insideInside: +gap(inn, inn).toFixed(3), outsideOutside: +gap(out, out).toFixed(3), insideOutside: +gap(inn, out).toFixed(3), mateLimit: P.isolation },
  genesInside: tr(inn), genesOutside: tr(out), maxGenInside: Math.max(0, ...inn.map(c => c.gen)) }));
