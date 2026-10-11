// Serves the terrarium page and lets it pray to the local god. Run: node server.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mutate } from './god/mutate.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8000;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');

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
