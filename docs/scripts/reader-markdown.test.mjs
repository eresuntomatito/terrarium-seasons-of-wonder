import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../../public/reader-markdown.mjs';

test('renders supported block and inline Markdown', () => {
  const html = renderMarkdown([
    '# A heading',
    'A **strong** and *emphasized* line with `code` and [link](https://example.test/path).',
    '',
    '- first',
    '- second',
    '',
    '1. one',
    '2. two',
    '',
    '> quoted text',
    '',
    '| name | count |',
    '| --- | --- |',
    '| fox | 2 |',
    '',
    '---',
    '',
    '```js',
    '<script>alert(1)</script>',
    '```',
  ].join('\n'));
  assert.match(html, /<h1 id="a-heading">A heading<\/h1>/);
  assert.match(html, /<strong>strong<\/strong>/);
  assert.match(html, /<em>emphasized<\/em>/);
  assert.match(html, /<code>code<\/code>/);
  assert.match(html, /<ul><li>first<\/li><li>second<\/li><\/ul>/);
  assert.match(html, /<ol><li>one<\/li><li>two<\/li><\/ol>/);
  assert.match(html, /<blockquote><p>quoted text<\/p><\/blockquote>/);
  assert.match(html, /<table>/);
  assert.match(html, /<hr>/);
  assert.match(html, /class="language-js"/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('escapes source markup, link labels, image attributes, and unsafe URLs', () => {
  const html = renderMarkdown([
    '<img src=x onerror=alert(1)>',
    '[<svg onload=alert(1)>](javascript:alert(1))',
    '![x" onerror="alert(1)](data:image/svg+xml,bad)',
    '[unsafe](javascript:alert(1)) [also](data:text/html,bad)',
  ].join('\n'));
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&lt;svg onload=alert\(1\)&gt;/);
  assert.match(html, /x&quot; onerror=&quot;alert\(1\)/);
  assert.doesNotMatch(html, /href="(?:javascript|data):/i);
  assert.doesNotMatch(html, /src="(?:javascript|data):/i);
  assert.doesNotMatch(html, /<svg|<img[^>]*onerror|<script/i);
});

test('uses link and image resolvers and renders null resolutions inertly', () => {
  const calls = [];
  const html = renderMarkdown('[page](wiki/a.md) [hidden](wiki/private.md) ![art](img/a.png) ![missing](img/missing.png)', {
    resolveLink: target => { calls.push(['link', target]); return target.endsWith('private.md') ? null : `/docs/${target}`; },
    resolveImage: target => { calls.push(['image', target]); return target.endsWith('missing.png') ? null : `/docs/${target}`; },
  });
  assert.match(html, /<a href="\/docs\/wiki\/a\.md">page<\/a>/);
  assert.match(html, /hidden/);
  assert.doesNotMatch(html, /href="wiki\/private\.md"/);
  assert.match(html, /<img src="\/docs\/img\/a\.png" alt="art">/);
  assert.match(html, /missing/);
  assert.deepEqual(calls, [['link', 'wiki/a.md'], ['link', 'wiki/private.md'], ['image', 'img/a.png'], ['image', 'img/missing.png']]);
});

test('creates unique duplicate heading anchors', () => {
  const html = renderMarkdown('# Same heading\n\n## Same heading\n\n# Same heading\n\n# A\n\n# A\n\n# A-2');
  assert.match(html, /id="same-heading"/);
  assert.match(html, /id="same-heading-1"/);
  assert.match(html, /id="same-heading-2"/);
  assert.match(html, /id="a"/);
  assert.match(html, /id="a-1"/);
  assert.match(html, /id="a-2"/);
});

test('rejects unsafe URLs returned by resolvers and escapes safe URL attributes', () => {
  const html = renderMarkdown('[bad](relative) ![bad](relative) [good](good)', {
    resolveLink: target => target === 'good' ? 'https://example.test/?q="x"&y=1' : 'javascript:alert(1)',
    resolveImage: () => 'data:image/png;base64,AAAA',
  });
  assert.doesNotMatch(html, /href="javascript:/i);
  assert.doesNotMatch(html, /src="data:/i);
  assert.match(html, /href="https:\/\/example\.test\/\?q=&quot;x&quot;&amp;y=1"/);
});

test('protects inline code, passes raw query URLs to resolvers, and neutralizes sentinels', () => {
  const calls = [];
  const html = renderMarkdown('`![art](https://example.com/x)` [query](wiki/a.md?x=1&y=2) \u00000\u0000', {
    resolveLink: target => { calls.push(target); return `/docs/${target}`; },
  });
  assert.match(html, /<code>!\[art\]\(https:\/\/example\.com\/x\)<\/code>/);
  assert.deepEqual(calls, ['wiki/a.md?x=1&y=2']);
  assert.match(html, /href="\/docs\/wiki\/a\.md\?x=1&amp;y=2"/);
  assert.doesNotMatch(html, /\u0000/);
  assert.doesNotMatch(html, /<figure>/);
});

test('rejects protocol-relative and backslash URLs by default', () => {
  const html = renderMarkdown('[protocol](//example.com/path) [backslash](\\\\example.com\\path)');
  assert.doesNotMatch(html, /href=/);
  assert.match(html, /protocol/);
  assert.match(html, /backslash/);
});
