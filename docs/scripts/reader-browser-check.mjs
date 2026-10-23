import assert from 'node:assert/strict';

export default async function checkReader(page) {
  const initial = new URL(page.url());
  const base = /^https?:$/.test(initial.protocol) ? initial.origin : 'http://localhost:8000';
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(15000);
  const errors = [];
  const writes = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.method() !== 'GET' && request.method() !== 'HEAD') writes.push(request.url());
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  try {
    await page.goto(base + '/reports.html?section=wiki', { waitUntil: 'domcontentloaded' });
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
    await page.goto(base + '/reports.html?section=wiki', { waitUntil: 'domcontentloaded' });
  }
  await page.locator('#report h1').waitFor();
  assert.equal(await page.locator('#reader-title').textContent(), 'World Wiki');
  const pages = await page.locator('#list button').count();
  assert.ok(pages >= 25);
  assert.equal(await page.locator('#list .unread').count(), 0);
  await page.getByRole('button', { name: 'The world as a whole', exact: true }).click();
  await page.locator('#report h1').waitFor();
  await page.waitForFunction(() => document.querySelector('#report h1')?.textContent.includes('world'));
  assert.ok(page.url().includes('world-guide.md'));
  assert.equal(await page.locator('#source-link').getAttribute('href'), '/docs/wiki/world-guide.md');
  await page.getByRole('button', { name: 'A dated species atlas', exact: true }).click();
  await page.locator('#report img').waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('#report img')].every(image => image.complete && image.naturalWidth > 0));
  assert.equal(await page.locator('#report img').first().getAttribute('src'), '/docs/assets/mosali-s1448-density.svg');
  assert.equal(writes.length, 0, 'Wiki reading must never write report read state');
  await page.screenshot({ path: '/private/tmp/terrarium-wiki-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Traits and bodies', exact: true }).click();
  await page.locator('#report table').first().waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile page should not overflow horizontally');
  await page.screenshot({ path: '/private/tmp/terrarium-wiki-mobile.png' });

  const file = '2026-10-17_s1544.md';
  const older = '2026-10-17_s1509.md';
  const read = [];
  await page.route('**/api/reports', route => route.fulfill({ json: [{ file, read: false }, { file: older, read: true }] }));
  await page.route('**/reports/status/*.md', route => route.fulfill({ contentType: 'text/plain', body: '# Test report\n\n## Water\n\nA **report** with `code`.\n\n[Other report](2026-10-17_s1509.md)' }));
  await page.route('**/api/reports/read', route => {
    read.push(route.request().postDataJSON().file);
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto(base + '/reports.html#' + file);
  await page.getByRole('heading', { name: 'Test report', exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector('#list button.on')?.classList.contains('unread'));
  assert.equal(await page.locator('#reader-title').textContent(), 'World Status Reports');
  assert.deepEqual(read, [file]);
  const olderRead = page.waitForResponse(response => response.url().endsWith('/api/reports/read') && response.request().postDataJSON().file === older);
  await page.getByRole('button', { name: /Season 1509/ }).click();
  await page.waitForURL('**/reports.html#' + older);
  await page.waitForFunction(() => document.querySelector('#source-link')?.getAttribute('href')?.endsWith('s1509.md'));
  await olderRead;
  assert.equal(read.at(-1), older);
  const revisitedRead = page.waitForResponse(response => response.url().endsWith('/api/reports/read') && response.request().postDataJSON().file === file);
  await page.goBack();
  await page.waitForURL('**/reports.html#' + file);
  await page.waitForFunction(() => document.querySelector('#source-link')?.getAttribute('href')?.endsWith('s1544.md'));
  await revisitedRead;
  assert.equal(read.at(-1), file);

  await page.goto(base + '/reports.html?section=wiki&page=CODEX.md');
  await page.getByText('This page is not in the reading list.', { exact: false }).waitFor();
  await page.route('**/docs/library.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto(base + '/reports.html?section=wiki');
  await page.getByText('Reading list unavailable.', { exact: true }).waitFor();
  await page.goto(base + '/reports.html#' + file);
  await page.getByRole('heading', { name: 'Test report', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  return { pages, wikiWrites: 0, reportReadRequests: read.length, browserErrors: errors, screenshots: ['/private/tmp/terrarium-wiki-desktop.png', '/private/tmp/terrarium-wiki-mobile.png'], reportsWereMocked: true };
}
