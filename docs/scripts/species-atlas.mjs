import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [input, species, output, observedAt] = process.argv.slice(2);
if (!input || !species || !output || !observedAt || !Number.isFinite(Date.parse(observedAt))) {
  throw new Error('Usage: node docs/scripts/species-atlas.mjs PRIVATE_SAVE SPECIES OUTPUT.svg OBSERVED_AT_ISO');
}
if (!/^[a-z][a-z0-9-]*$/i.test(species) || !output.endsWith('.svg')) throw new Error('Invalid species or SVG output');
const buffer = fs.readFileSync(input);
const world = JSON.parse(buffer);
if (!Number.isFinite(world.season) || !Number.isFinite(world.tick) || !Array.isArray(world.creatures)) throw new Error('Invalid world observation');
const width = 960;
const height = 640;
const columns = 24;
const rows = 16;
const counts = Array(columns * rows).fill(0);
let population = 0;
for (const creature of world.creatures) {
  if (creature.dead || creature.species !== species) continue;
  if (!Number.isFinite(creature.x) || !Number.isFinite(creature.y)) throw new Error('Invalid individual position');
  const wrappedX = ((creature.x % width) + width) % width;
  const wrappedY = ((creature.y % height) + height) % height;
  counts[Math.floor(wrappedY / (height / rows)) * columns + Math.floor(wrappedX / (width / columns))]++;
  population++;
}
if (!population) throw new Error('No living individuals for this species');
const maximum = Math.max(...counts);
const observation = {
  species, observedAt: new Date(observedAt).toISOString(), season: world.season, tick: world.tick,
  sourceSnapshotSHA256: crypto.createHash('sha256').update(buffer).digest('hex'),
  coordinateSpace: { width, height, wraps: true, origin: 'top-left', columns, rows },
  population, counts,
};
const rectangles = counts.map((count, index) => {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const lightness = count ? Math.round(88 - 55 * count / maximum) : 96;
  const colour = count ? `hsl(157, 48%, ${lightness}%)` : '#eef1ed';
  const label = count ? `<text x="${76 + column * 28}" y="${137 + row * 28}" text-anchor="middle" fill="${count / maximum > 0.6 ? '#fff' : '#123a2d'}">${count}</text>` : '';
  return `<rect x="${62 + column * 28}" y="${118 + row * 28}" width="28" height="28" fill="${colour}" stroke="#fff"><title>Column ${column + 1}, row ${row + 1}: ${count} living ${species}</title></rect>${label}`;
}).join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="670" viewBox="0 0 800 670" role="img" aria-labelledby="title description">
<title id="title">${species}: season ${world.season} density map</title>
<desc id="description">${population} living individuals, aggregated into a 24 by 16 grid. Top-left origin; map edges wrap. Counts describe one observation, not a habitat preference.</desc>
<rect width="800" height="670" fill="#faf9f5"/>
<g font-family="system-ui, sans-serif" fill="#183d31">
<text x="62" y="40" font-size="25" font-weight="700">${species} · season ${world.season}</text>
<text x="62" y="68" font-size="15">${population} living bodies · tick ${world.tick}</text>
<text x="62" y="92" font-size="13">Observed ${observation.observedAt} · Codex, on eresuntomatito’s behalf</text>
<g font-size="12">${rectangles}</g>
<text x="62" y="590" font-size="14">Each cell: 40 × 40 simulation units. Numbers: bodies present.</text>
<text x="62" y="614" font-size="14">Blank cells: zero at this moment. Darker green: higher count.</text>
<text x="62" y="638" font-size="13">Edges wrap · no terrain overlay · not a species range or causal explanation</text>
</g></svg>\n`;
const summaryFile = output.replace(/\.svg$/, '.json');
for (const filename of [output, summaryFile]) {
  if (path.resolve(filename) === path.resolve(input) || fs.existsSync(filename)) throw new Error('Refusing to overwrite an existing file');
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, svg);
fs.writeFileSync(summaryFile, JSON.stringify(observation, null, 2) + '\n');
console.log(JSON.stringify({ species, population, season: world.season, occupiedCells: counts.filter(Boolean).length, output, summaryFile }));
