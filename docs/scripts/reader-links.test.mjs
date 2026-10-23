import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateCatalog, resolveDocumentUrl, readerHref, validReport } from '../../public/reader-links.mjs';

const catalog = JSON.parse(fs.readFileSync(new URL('../library.json', import.meta.url), 'utf8'));
const pages = new Set(validateCatalog(catalog).map(page => page.path));
const resolve = (value, image = false) => resolveDocumentUrl(value, { sourcePath: 'docs/wiki/species/atlas.md', pages, image });

test('catalog references existing source Markdown, with no duplicate entries', () => {
  for (const page of catalog.pages) assert.ok(fs.statSync(new URL('../' + page.path, import.meta.url)).isFile());
  assert.throws(() => validateCatalog({ ...catalog, pages: [catalog.pages[0], catalog.pages[0]] }));
  assert.throws(() => validateCatalog({ version: 1, pages: [{ path: '../secret.md', title: 'Bad', section: 'Bad' }] }));
});

test('wiki and report links keep separate reader destinations', () => {
  assert.equal(resolve('mosali.md'), '/reports.html?section=wiki&page=wiki%2Fspecies%2Fmosali.md');
  assert.equal(resolve('../history.md#early-eras'), '/reports.html?section=wiki&page=wiki%2Fhistory.md#early-eras');
  assert.equal(resolve('../../../reports/status/2026-10-17_s1544.md'), '/reports.html#2026-10-17_s1544.md');
  assert.equal(resolve('../../../reports/status/README.md'), '/reports.html');
  assert.equal(readerHref('reports/status/2026-10-17_s1544.md', 'water'), '/reports.html?anchor=water#2026-10-17_s1544.md');
  assert.equal(validReport('no.md'), false);
});

test('assets resolve from original Markdown location', () => {
  assert.equal(resolve('../../assets/mosali-s1448-density.svg', true), '/docs/assets/mosali-s1448-density.svg');
  assert.equal(resolve('../../assets/mosali-s1448-density.json'), 'https://github.com/eresuntomatito/terrarium-seasons-of-wonder/blob/main/docs/assets/mosali-s1448-density.json');
  assert.equal(resolve('../../../species/mosali.js'), 'https://github.com/eresuntomatito/terrarium-seasons-of-wonder/blob/main/species/mosali.js');
  assert.equal(resolve('../../CODEX.md'), 'https://github.com/eresuntomatito/terrarium-seasons-of-wonder/blob/main/docs/CODEX.md');
});

test('unsafe and malformed URLs are inert', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,hi', '//evil.example/x', 'https://good.example/\nunsafe', '/docs/%2e%2e/%2e%2e/.env', '/docs/wiki/%ZZ.md', 'https:\\evil.example/x']) assert.equal(resolve(value), null, value);
  assert.equal(resolve('../../../data/world.json', true), null);
  assert.equal(resolve('https://example.com/paper'), 'https://example.com/paper');
});
