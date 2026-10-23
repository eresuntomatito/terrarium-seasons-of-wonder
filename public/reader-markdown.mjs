const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function safeUrl(value) {
  const url = String(value).trim();
  if (!url || /[\u0000-\u0020]/.test(url)) return null;
  if (url.startsWith('//') || url.includes('\\')) return null;
  if (/^(?:javascript|data|vbscript):/i.test(url)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^(?:https?|mailto):/i.test(url)) return null;
  return url;
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-') || 'section';
}

function inline(source, options) {
  const tokens = [];
  const stash = html => `\u0000${tokens.push(html) - 1}\u0000`;
  const placeholder = /\u0000(\d+)\u0000/g;
  const format = value => escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>');
  const pattern = /`([^`]+)`|!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)|\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
  const clean = String(source).replace(/\u0000/g, '\uFFFD');
  let result = '';
  let cursor = 0;
  let match;
  while ((match = pattern.exec(clean))) {
    result += format(clean.slice(cursor, match.index));
    if (match[1] !== undefined) result += stash(`<code>${escapeHtml(match[1])}</code>`);
    else if (match[2] !== undefined) {
      const alt = match[2];
      const resolved = options.resolveImage ? options.resolveImage(match[3]) : match[3];
      const url = resolved == null ? null : safeUrl(resolved);
      if (!url) result += stash(escapeHtml(alt));
      else {
        const titleAttr = match[4] ? ` title="${escapeHtml(match[4])}"` : '';
        result += stash(`<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"${titleAttr}><figcaption>${escapeHtml(alt)}</figcaption></figure>`);
      }
    } else {
      const label = match[5];
      const resolved = options.resolveLink ? options.resolveLink(match[6]) : match[6];
      const url = resolved == null ? null : safeUrl(resolved);
      if (!url) result += stash(format(label));
      else result += stash(`<a href="${escapeHtml(url)}"${match[7] ? ` title="${escapeHtml(match[7])}"` : ''}>${format(label)}</a>`);
    }
    cursor = pattern.lastIndex;
  }
  result += format(clean.slice(cursor));
  return result.replace(placeholder, (_, tokenIndex) => tokens[Number(tokenIndex)] ?? '');
}

export function renderMarkdown(markdown, { resolveLink, resolveImage } = {}) {
  const options = { resolveLink, resolveImage };
  const lines = String(markdown).replace(/\r/g, '').split('\n');
  const output = [];
  const headingIds = new Set();
  const cells = line => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    let match;
    if ((match = line.match(/^```([^`]*)$/))) {
      const code = [];
      index++;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index++;
      output.push(`<pre><code${match[1].trim() ? ` class="language-${escapeHtml(match[1].trim().replace(/[^a-zA-Z0-9_-]/g, ''))}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    if ((match = line.match(/^(#{1,6})\s+(.*)$/))) {
      const level = match[1].length;
      const content = match[2];
      const base = slugify(content.replace(/`([^`]*)`/g, '$1').replace(/\*\*/g, '').replace(/\*/g, ''));
      let id = base;
      let suffix = 0;
      while (headingIds.has(id)) id = `${base}-${++suffix}`;
      headingIds.add(id);
      output.push(`<h${level} id="${escapeHtml(id)}">${inline(content, options)}</h${level}>`);
      index++; continue;
    }
    if (/^---+\s*$/.test(line)) { output.push('<hr>'); index++; continue; }
    if (line.trim().startsWith('|') && /^\s*\|?\s*:?-{2,}/.test(lines[index + 1] ?? '')) {
      const head = cells(line); index += 2; const rows = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) rows.push(cells(lines[index++]));
      output.push(`<table><thead><tr>${head.map(cell => `<th>${inline(cell, options)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${inline(cell, options)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ''));
      output.push(`<blockquote>${quote.map(part => `<p>${inline(part, options)}</p>`).join('')}</blockquote>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line); const items = [];
      while (index < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[index])) {
        let item = lines[index++].replace(/^\s*([-*]|\d+\.)\s+/, '');
        while (index < lines.length && /^\s{2,}\S/.test(lines[index]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[index])) item += ` ${lines[index++].trim()}`;
        items.push(`<li>${inline(item, options)}</li>`);
      }
      output.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`); continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !/^(?:#{1,6}\s|\s*([-*]|\d+\.)\s|\s*\||\s*>|```|---+\s*$)/.test(lines[index])) paragraph.push(lines[index++].trim());
    if (paragraph.length) output.push(`<p>${inline(paragraph.join(' '), options)}</p>`); else index++;
  }
  return output.join('\n');
}
