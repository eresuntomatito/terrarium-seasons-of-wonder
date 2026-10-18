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
const FRAME_STRIDE = 14;
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

// The clock (s1562): each tick starts 1000/TICKS_PER_SEC ms after the previous one STARTED (setInterval waited that long
// after it ended, so a 30 ms tick ran at ~23 a second, not 30). A long tick starts the next at once; a backlog of more
// than a few ticks (after the Mac sleeps) is dropped rather than raced through.
let nextTick = performance.now();
function clock() {
  tickOnce();
  const now = performance.now(); nextTick += 1000 / TICKS_PER_SEC;
  if (nextTick < now - 4 * 1000 / TICKS_PER_SEC) nextTick = now;
  setTimeout(clock, Math.max(0, nextTick - now));
}
function tickOnce() {
  try {
    world.step();
  } catch (e) {
    console.error(`tick ${world.tick}:`, e);
    return;
  }
  if (world.tick % 2 === 0) broadcast('frame', world.frame());
  if (world.tick % 20 === 0) broadcast('terrain', world.terrain());
  if (world.tick % 60 === 0) { const wf = world.waterFrame(); if (wf) broadcast('water', wf); }
  if (world.tick % 60 === 0) broadcast('reef', { map: world.reefMap(), thicket: world.thicketMap(), trees: world.treeMap(), insects: world.insectMap(), climate: world.climate() });
  if (world.tick % 900 === 0) broadcast('species', world.speciesList()); // evolved code and drift
  if (world.tick % 300 === 0) stewardRelease();
}
setTimeout(clock, 0);

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
  res.write(message('reef', { map: world.reefMap(), thicket: world.thicketMap(), trees: world.treeMap(), insects: world.insectMap(), climate: world.climate() }));
  res.write(message('god', god));
  res.write(message('past', { history: world.history, events: world.events, stats: world.stats, records: world.records, traits: world.traits() }));
  res.write(message('terrain', world.terrain()));
  res.write(message('frame', { ...world.frame(), temp: world.tempFrame() })); // the land at once (viewer session's request, s1560): no flat terraces while waiting for the next temp frame
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

  // The curated documentation, read-only, for the local reader (Codex's request, s1620): GET /docs/library.json, the
  // Markdown pages that catalog lists, and image assets under docs/. Nothing else: no other types, no hidden files or
  // folders, no path that resolves (after symlinks) outside docs/.
  if (url.pathname.startsWith('/docs/')) {
    const DOCS = fs.realpathSync(path.join(ROOT, 'docs')), deny = () => res.writeHead(404).end('not found');
    if (req.method !== 'GET' && req.method !== 'HEAD') return deny();
    let rel; try { rel = decodeURIComponent(url.pathname.slice('/docs/'.length)); } catch { return deny(); }
    if (!rel || rel.includes('\0') || rel.split('/').some(seg => !seg || seg.startsWith('.'))) return deny(); // no hidden parts, no empty or dot segments
    const file = path.join(DOCS, rel);
    let real; try { real = fs.realpathSync(file); } catch { return deny(); }
    if (!real.startsWith(DOCS + path.sep) || !fs.statSync(real).isFile()) return deny();
    const ext = path.extname(real).toLowerCase(), IMG = { '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
    let type = IMG[ext];
    if (rel === 'library.json') type = 'application/json';
    else if (ext === '.md') { // only pages the catalog lists
      let pages = []; try { pages = JSON.parse(fs.readFileSync(path.join(DOCS, 'library.json'), 'utf8')).pages ?? []; } catch {}
      if (pages.some(p => path.normalize(String(p.path)) === path.normalize(rel))) type = 'text/markdown; charset=utf-8';
    }
    if (!type) return deny();
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(real).pipe(res);
  }

  // Status reports (reports/status/*.md): the list as JSON, and each report's text, for public/reports.html.
  // Reports and whether Luis has read them (data/reports-read.json): GET lists [{file, read}], newest first;
  // POST /api/reports/read {"file"} marks one read.
  const READ = path.join(ROOT, 'data', 'reports-read.json');
  const readSet = () => { try { return new Set(JSON.parse(fs.readFileSync(READ, 'utf8'))); } catch { return new Set(); } };
  if (url.pathname === '/api/reports') {
    const dir = path.join(ROOT, 'reports', 'status'), read = readSet();
    const list = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}_s\d+(-[a-z0-9-]+)?\.md$/.test(f))
      // newest first by season (numeric: s998 before s1021 in time), then by when the file was written
      .map(f => ({ f, s: +f.match(/_s(\d+)/)[1], m: fs.statSync(path.join(dir, f)).mtimeMs })).sort((a, b) => b.s - a.s || b.m - a.m).map(x => x.f) : [];
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(list.map(file => ({ file, read: read.has(file) }))));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/reports/read') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 1000) req.destroy(); });
    req.on('end', () => {
      try {
        const { file } = JSON.parse(body);
        if (typeof file === 'string' && /^\d{4}-\d{2}-\d{2}_s\d+(-[a-z0-9-]+)?\.md$/.test(file) && fs.existsSync(path.join(ROOT, 'reports', 'status', file))) {
          const read = readSet(); read.add(file); fs.writeFileSync(READ, JSON.stringify([...read]));
          res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
        } else res.writeHead(400).end('bad report');
      } catch { res.writeHead(400).end('bad request'); }
    });
    return;
  }
  if (url.pathname.startsWith('/reports/status/')) {
    const file = path.normalize(path.join(ROOT, url.pathname.slice(1)));
    if (!file.startsWith(path.join(ROOT, 'reports', 'status')) || !/\.(md|png|svg)$/.test(file) || !fs.existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': file.endsWith('.png') ? 'image/png' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
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
