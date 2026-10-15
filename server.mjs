// Runs the terrarium forever, streams it to any open page, and lets the miniature page pray.
// Run: node server.mjs   (add --fresh to start a new world instead of resuming data/world.json)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mutate } from './god/mutate.mjs';
import { startGod } from './god/evolution.mjs';
import { World, W, H, CELL, GW, GH, TICKS_PER_DAY, SEASON_TICKS, GENERATIONS_PER_MUTATION } from './sim/world.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
// Numbers per creature in a frame. The viewer reloads itself when this changes, so an open tab never misreads frames.
const FRAME_STRIDE = 13;
const PORT = 8000, TICKS_PER_SEC = 30, SAVE_EVERY_MS = 30_000;
const SAVE = path.join(ROOT, 'data', 'world.json');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' };

// --- the world ---

const resume = !process.argv.includes('--fresh') && fs.existsSync(SAVE);
const world = new World(resume ? JSON.parse(fs.readFileSync(SAVE, 'utf8')) : null);
console.log(resume ? `resumed at tick ${world.tick}` : 'new world');

function save() {
  fs.mkdirSync(path.dirname(SAVE), { recursive: true });
  fs.writeFileSync(SAVE + '.tmp', JSON.stringify(world));
  fs.renameSync(SAVE + '.tmp', SAVE);
}
setInterval(save, SAVE_EVERY_MS);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { save(); console.log(`saved at tick ${world.tick}`); process.exit(0); });

// --- live stream (server-sent events) ---

const clients = new Set();
const message = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const broadcast = (event, data) => { if (clients.size) { const m = message(event, data); for (const res of clients) res.write(m); } };

world.onEvent = e => { console.log(`[${e.t}] ${e.text}`); broadcast('event', e); };
world.onHistory = h => broadcast('history', { h, stats: world.stats, records: world.records, traits: world.traits() });
world.onSpecies = () => broadcast('species', world.speciesList());
let god = { state: 'idle' };
startGod(world, s => { god = s; broadcast('god', s); });

setInterval(() => {
  try {
    world.step();
  } catch (e) {
    console.error(`tick ${world.tick}:`, e);
    return;
  }
  if (world.tick % 2 === 0) broadcast('frame', world.frame());
  if (world.tick % 20 === 0) broadcast('terrain', world.terrain());
  if (world.tick % 60 === 0) broadcast('reef', { map: world.reefMap(), thicket: world.thicketMap(), climate: world.climate() });
  if (world.tick % 900 === 0) broadcast('species', world.speciesList()); // evolved code and drift
  if (world.tick % 300 === 0) stewardRelease();
}, 1000 / TICKS_PER_SEC);

// The steward's hand: data/release.json ({"name": "lurker", "count": 8, "hunter": true?}) sets a species down once, without a restart.
const RELEASE = path.join(ROOT, 'data', 'release.json');
function stewardRelease() {
  // The steward's cut: data/vicariance.json ({"name": "tortoise"}) splits that species into four by quarters of the land.
  const CUT = path.join(ROOT, 'data', 'vicariance.json');
  if (fs.existsSync(CUT)) { try { world.vicariance(JSON.parse(fs.readFileSync(CUT, 'utf8')).name); } catch (e) { console.error('vicariance:', e.message); } fs.rmSync(CUT, { force: true }); }
  if (!fs.existsSync(RELEASE)) return;
  try {
    const { name, count, hunter, waves, traits, every, times } = JSON.parse(fs.readFileSync(RELEASE, 'utf8')), sp = world.registry[name];
    // "every" (ticks) and "times": a series of packs, the first now; "traits" shapes every body the same way.
    if (sp && every && times) { (world.waves ??= []); for (let k = 0; k < times; k++) world.waves.push({ name, count, hunter: hunter ?? true, traits, at: world.tick + k * every, steward: true }); world.log(`The steward will send ${count} ${name}s ${times} times, ${every} ticks apart.`); }
    else if (sp && waves) world.scheduleWaves(name, false, hunter ?? (sp.avgGut ?? sp.gut) >= 0.5); // "waves": true staggers it
    else if (sp) world.reintroduce(hunter ?? (sp.avgGut ?? sp.gut) >= 0.5, name, count, traits ?? null, true); // "hunter": true sends a line back as hunters
    else console.error(`release: no species ${name}`);
  } catch (e) { console.error('release:', e.message); }
  fs.rmSync(RELEASE, { force: true });
}

function stream(req, res) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
  res.write(message('meta', { W, H, CELL, GW, GH, TICKS_PER_DAY, TICKS_PER_SEC, SEASON_TICKS, GENERATIONS_PER_MUTATION, FRAME_STRIDE }));
  res.write(message('species', world.speciesList()));
  res.write(message('reef', { map: world.reefMap(), thicket: world.thicketMap(), climate: world.climate() }));
  res.write(message('god', god));
  res.write(message('past', { history: world.history, events: world.events, stats: world.stats, records: world.records, traits: world.traits() }));
  res.write(message('terrain', world.terrain()));
  clients.add(res);
  req.on('close', () => clients.delete(res));
}

// --- http ---

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/stream') return stream(req, res);

  if (req.method === 'POST' && url.pathname === '/pray') {
    const name = url.searchParams.get('species') ?? 'wanderer';
    try {
      const result = await mutate(name);
      console.log(`${name}: ${result.born ? 'born' : 'stillborn (' + result.error + ')'} in ${result.seconds.toFixed(1)}s`);
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(502, { 'content-type': 'application/json' }).end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Status reports (reports/status/*.md): the list as JSON, and each report's text, for public/reports.html.
  if (url.pathname === '/api/reports') {
    const dir = path.join(ROOT, 'reports', 'status');
    const list = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}_s\d+\.md$/.test(f)).sort().reverse() : [];
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(list));
    return;
  }
  if (url.pathname.startsWith('/reports/status/')) {
    const file = path.normalize(path.join(ROOT, url.pathname.slice(1)));
    if (!file.startsWith(path.join(ROOT, 'reports', 'status')) || !file.endsWith('.md') || !fs.existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
    return;
  }

  // Static files: / -> public/index.html, /species/* -> species/*, everything else from public/.
  const rel = url.pathname === '/' ? 'public/index.html'
    : url.pathname.startsWith('/species/') ? url.pathname.slice(1)
    : 'public' + url.pathname;
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'text/plain', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`terrarium at http://localhost:${PORT}`));
