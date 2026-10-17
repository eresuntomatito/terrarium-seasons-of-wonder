# Continue a copy of the published world

Written and checked by Codex on eresuntomatito's behalf, with Luis's authorization and the active steward's source-compatibility handoff.

The [published-world release](https://github.com/eresuntomatito/terrarium-seasons-of-wonder/releases/tag/world-s1561) offers one static state: **season 1561**, tick **8,427,282**, **236 living bodies**. It is not a live mirror or a recurring release service. Your continuation is independent of Luis's running world and need not produce the same events.

## Download and match the source

Download `world-s1561.json.gz` and `world-s1561-manifest.json` from that release. The gzip is 1,295,972 bytes (about 1.30 MB). Keep both outside your separate checkout initially. The [manifest copy](assets/world-s1561-manifest.json) records the state, source, transformations, and hashes.

Use a **new directory**, with Node.js and Git available:

```sh
git clone https://github.com/eresuntomatito/terrarium-seasons-of-wonder.git terrarium-published-world
cd terrarium-published-world
git checkout 3ae141f3244c2641fc2244df94aa4e7a31c5026e
```

That detached checkout is intentional: it pins the compatible publication source. No install step is required. Do not run `--fresh`, overwrite your own save, or perform these steps in the live development world. Port 8000 must be free before starting the server. The server is local-first, not a reviewed public hosting setup.

## Restore without overwriting

From that checkout's root, replace the two example download paths below with your actual paths. The command verifies the downloaded hashes and state identifiers, refuses an existing `data/world.json`, and creates the model-pause flag. It does not start the server or invoke a model.

```sh
node --input-type=module - /path/to/world-s1561.json.gz /path/to/world-s1561-manifest.json <<'JS'
import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
const [archive, manifestFile] = process.argv.slice(2);
assert(archive && manifestFile, 'Pass the downloaded gzip and manifest paths');
assert(fs.existsSync('server.mjs'), 'Run from the separate terrarium checkout root');
assert(!fs.existsSync('data/world.json'), 'Existing world: stop and use a separate checkout; nothing was overwritten');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const compressed = fs.readFileSync(archive);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(compressed), manifest.gzipSHA256);
const bytes = zlib.gunzipSync(compressed);
assert.equal(hash(bytes), manifest.restoredJSONSHA256);
const world = JSON.parse(bytes);
assert.equal(world.version, manifest.saveVersion);
assert.equal(world.season, manifest.season);
assert.equal(world.tick, manifest.tick);
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/god-paused', '', { flag: 'a' });
fs.writeFileSync('data/world.json', bytes, { flag: 'wx' });
console.log(`Restored season ${world.season}, tick ${world.tick}; queued model work stays paused.`);
JS
node server.mjs
```

Open http://localhost:8000. Ctrl+C saves and stops your copy; starting again resumes it. Keep the saved file to continue. See [running a separate world](RUNNING.md) for automatic local species/Git behaviour and model-pause limits. Closing the browser alone does not stop the server.

## What was reviewed and changed

This is a normally written live save copied once, then reviewed. The only deliberate transformation clears **94 queued study requests** (`pendingStudies`) to avoid distributing future model work. Bodies, terrain, registry, behaviour code, and historical summaries remain. The release is not the whole runtime directory: server/steward logs, bridge/session files, credentials, and private transcripts were not packaged.

Bounded scans inspected 17,889 strings without credential/home-path pattern matches; that does not prove absence of every possible private detail. The manifest identifies the private input by hash without publishing unrelated files.

The compatible source is local steward `d1ad73d` / public `370995a`, included in pinned publication `3ae141f`. It predates later live-only performance, dung, and viewer work. The reviewed state loaded, produced the geology frame fields, advanced 20 steps, serialized/reloaded, and advanced once more in isolation without model/Git callbacks. The fresh server path was checked separately. This is not deterministic replay, a long-term stability test, or a promise that an arbitrary later source can load the file unchanged. Constructor-time derived-state updates may occur on restore.

Gzip SHA-256: `4d9385cde36225a0f65fb94a8ac3ed440619034e1e6f900fe6d1726819b9b64d`.

Decompressed JSON SHA-256: `56caa9c12085719c008b8c456e37563574b4de6d8dd3c0f9a0bfbb4fae906d27`.
