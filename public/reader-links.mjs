const repository = 'https://github.com/eresuntomatito/terrarium-seasons-of-wonder/blob/main/';
const origin = 'https://terrarium.invalid';
const reportPattern = /^\d{4}-\d{2}-\d{2}_s\d+(?:-[a-z0-9-]+)?\.md$/;

export function validPagePath(value) {
  return typeof value === 'string' && /^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.md$/.test(value)
    && value.split('/').every(part => part !== '.' && part !== '..');
}

export function validateCatalog(catalog) {
  if (catalog?.version !== 1 || !Array.isArray(catalog.pages)) throw new Error('Unsupported wiki catalog');
  const paths = new Set();
  return catalog.pages.map(page => {
    if (!validPagePath(page?.path) || paths.has(page.path) || typeof page.title !== 'string'
      || !page.title.trim() || typeof page.section !== 'string' || !page.section.trim()) {
      throw new Error('Invalid wiki catalog entry');
    }
    paths.add(page.path);
    return { path: page.path, title: page.title, section: page.section };
  });
}

export function readerHref(sourcePath, fragment = '') {
  if (sourcePath.startsWith('docs/') && validPagePath(sourcePath.slice(5))) {
    const query = new URLSearchParams({ section: 'wiki', page: sourcePath.slice(5) });
    return `/reports.html?${query}${fragment ? '#' + encodeURIComponent(fragment) : ''}`;
  }
  const file = sourcePath.slice('reports/status/'.length);
  if (sourcePath.startsWith('reports/status/') && reportPattern.test(file)) {
    const query = fragment ? '?anchor=' + encodeURIComponent(fragment) : '';
    return `/reports.html${query}#${encodeURIComponent(file)}`;
  }
  return null;
}

export function resolveDocumentUrl(value, { sourcePath, pages, image = false }) {
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f\\]/.test(value) || value.startsWith('//')) return null;
  let resolved;
  try { resolved = new URL(value, `${origin}/${sourcePath}`); } catch { return null; }
  if (resolved.origin !== origin) {
    if (resolved.protocol === 'https:' || resolved.protocol === 'http:' || (!image && resolved.protocol === 'mailto:')) return resolved.href;
    return null;
  }
  let target, fragment;
  try { target = decodeURIComponent(resolved.pathname.slice(1)); fragment = decodeURIComponent(resolved.hash.slice(1)); } catch { return null; }
  if (/[\u0000-\u0020\u007f\\]/.test(target) || target.split('/').some(part => part === '..' || part === '.' || part.startsWith('.'))) return null;
  if (image) {
    return /^(?:docs\/assets|reports\/status\/img)\/[A-Za-z0-9_./-]+\.(?:png|svg|jpe?g|webp)$/i.test(target) ? '/' + target : null;
  }
  if (target === 'reports/status/README.md') return '/reports.html';
  const local = target.startsWith('docs/') && pages.has(target.slice(5));
  const href = local || target.startsWith('reports/status/') ? readerHref(target, fragment) : null;
  if (href) return href;
  if (/^docs\/assets\/[A-Za-z0-9_./-]+\.(?:png|svg|jpe?g|webp|gif)$/i.test(target)) return '/' + target;
  if (!target) return '/';
  return repository + target.split('/').map(encodeURIComponent).join('/') + (fragment ? '#' + encodeURIComponent(fragment) : '');
}

export function reportLabel(file) {
  const match = file.match(/^(\d{4}-\d{2}-\d{2})_s(\d+)(?:-([a-z0-9-]+))?\.md$/);
  return match ? { title: `Season ${match[2]}${match[3] ? ' · ' + match[3].replace(/-/g, ' ') : ''}`, sub: match[1] } : { title: file, sub: '' };
}

export function validReport(file) { return typeof file === 'string' && reportPattern.test(file); }
