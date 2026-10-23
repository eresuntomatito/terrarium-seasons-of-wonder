import { renderMarkdown } from './reader-markdown.mjs';
import { validateCatalog, resolveDocumentUrl, readerHref, reportLabel, validReport } from './reader-links.mjs';

const list = document.getElementById('list');
const article = document.getElementById('report');
const title = document.getElementById('reader-title');
const sectionTitle = document.getElementById('section-title');
const sourceLink = document.getElementById('source-link');
const wiki = new URL(location.href).searchParams.get('section') === 'wiki';
let pages = [], reports = [], currentSource = '', lastLocation = '', request;

try {
  const theme = localStorage.getItem('theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {}

function message(element, text) {
  const paragraph = document.createElement('p');
  paragraph.className = 'empty';
  paragraph.textContent = text;
  element.replaceChildren(paragraph);
}

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return response.json();
}

function selected() {
  const url = new URL(location.href);
  if (wiki) return { source: 'docs/' + (url.searchParams.get('page') ?? pages[0]?.path ?? ''), anchor: decodeFragment(url.hash) };
  const file = decodeFragment(url.hash) || reports.find(report => !report.read)?.file || reports[0]?.file || '';
  return { source: 'reports/status/' + file, anchor: url.searchParams.get('anchor') ?? '' };
}

function decodeFragment(hash) {
  try { return decodeURIComponent(hash.replace(/^#/, '')); } catch { return ''; }
}

function navigate(source) {
  history.pushState(null, '', readerHref(source));
  show();
}

function navigation() {
  list.replaceChildren();
  let group = '';
  const entries = wiki ? pages.map(page => ({ ...page, source: 'docs/' + page.path }))
    : reports.map(report => ({ ...report, ...reportLabel(report.file), source: 'reports/status/' + report.file }));
  for (const entry of entries) {
    if (wiki && entry.section !== group) {
      const heading = document.createElement('h3');
      heading.textContent = entry.section;
      list.append(heading);
      group = entry.section;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.source = entry.source;
    button.textContent = entry.title;
    if (!wiki) {
      button.classList.toggle('unread', !entry.read);
      const subtitle = document.createElement('small');
      subtitle.textContent = entry.sub + (!entry.read ? ' · new' : '');
      button.append(subtitle);
    }
    button.addEventListener('click', () => navigate(entry.source));
    list.append(button);
  }
  if (!entries.length) message(list, wiki ? 'No wiki pages yet.' : 'No reports yet.');
}

async function show() {
  lastLocation = location.href;
  request?.abort();
  request = new AbortController();
  const signal = request.signal;
  const { source, anchor } = selected();
  const entry = wiki ? pages.find(page => 'docs/' + page.path === source)
    : reports.find(report => 'reports/status/' + report.file === source);
  sourceLink.hidden = true;
  for (const button of list.querySelectorAll('button')) {
    const active = button.dataset.source === source;
    button.classList.toggle('on', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (!entry) {
    currentSource = '';
    message(article, 'This page is not in the reading list. Choose a page from the navigation.');
    return;
  }
  if (currentSource === source) { sourceLink.hidden = false; scrollToAnchor(anchor); return; }
  currentSource = '';
  message(article, 'Loading…');
  try {
    const response = await fetch('/' + source, { signal });
    if (!response.ok) throw new Error('Page unavailable');
    const markdown = await response.text();
    if (signal.aborted) return;
    const context = { sourcePath: source, pages: new Set(pages.map(page => page.path)) };
    article.innerHTML = renderMarkdown(markdown, {
      resolveLink: value => resolveDocumentUrl(value, context),
      resolveImage: value => resolveDocumentUrl(value, { ...context, image: true }),
    });
    currentSource = source;
    document.title = `${wiki ? entry.title : reportLabel(entry.file).title} · Terrarium`;
    sourceLink.href = '/' + source;
    sourceLink.hidden = false;
    scrollToAnchor(anchor);
    if (!wiki) {
      const marked = await fetch('/api/reports/read', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: entry.file }),
      }).catch(() => null);
      if (marked?.ok) {
        entry.read = true;
        for (const button of list.querySelectorAll('button')) {
          if (button.dataset.source !== source) continue;
          button.classList.remove('unread');
          button.querySelector('small').textContent = reportLabel(entry.file).sub;
        }
      }
    }
  } catch (error) {
    if (error.name !== 'AbortError') message(article, 'This page could not be loaded. Choose it again to retry.');
  }
}

function scrollToAnchor(anchor) {
  const heading = anchor ? document.getElementById(anchor) : null;
  if (heading && article.contains(heading)) heading.scrollIntoView();
  else window.scrollTo(0, 0);
}

async function start() {
  title.textContent = wiki ? 'World Wiki' : 'World Status Reports';
  sectionTitle.textContent = wiki ? 'Explore the world' : 'Reports';
  document.getElementById(wiki ? 'wiki-link' : 'reports-link').setAttribute('aria-current', 'page');
  try {
    const catalogPromise = json('/docs/library.json').then(validateCatalog);
    if (wiki) pages = await catalogPromise;
    else {
      const results = await Promise.all([json('/api/reports'), catalogPromise.catch(() => [])]);
      if (!Array.isArray(results[0])) throw new Error('Invalid reports list');
      reports = results[0].filter(report => validReport(report?.file));
      pages = results[1];
    }
    navigation();
    if (wiki ? pages.length : reports.length) await show();
    else message(article, wiki ? 'No wiki pages yet.' : 'No reports yet.');
    const locationChanged = () => { if (location.href !== lastLocation) show(); };
    window.addEventListener('popstate', locationChanged);
    window.addEventListener('hashchange', locationChanged);
  } catch {
    message(list, 'Reading list unavailable.');
    message(article, 'The reading list could not be loaded. Reload this page to retry; the world is still available above.');
  }
}

start();
