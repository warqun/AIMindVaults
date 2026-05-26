// AIMindVaults Visualization — markdown mini parser (W5)
// Phase 2.5 spec § 5.4: 외부 의존성 0 — h1~h3 / p / ul / li / code (inline + fenced) / blockquote 만.
// 시안 07 · 08 의 .preview .pbody 클래스 위에서 렌더.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ESC[c]); }

function inlineFmt(s) {
  let t = escapeHtml(s);
  t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^\*\n]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^\*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${label}</a>`);
  return t;
}

export function renderMarkdown(text) {
  if (!text) return '';
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push(`<pre class="md-code" data-lang="${escapeHtml(lang)}"><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) { out.push(`<h${h[1].length}>${inlineFmt(h[2].trim())}</h${h[1].length}>`); i++; continue; }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push(`<blockquote>${inlineFmt(buf.join(' '))}</blockquote>`);
      continue;
    }
    if (/^[\-\*]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^[\-\*]\s+/.test(lines[i])) { buf.push(lines[i].replace(/^[\-\*]\s+/, '')); i++; }
      out.push(`<ul>${buf.map((b) => `<li>${inlineFmt(b)}</li>`).join('')}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { buf.push(lines[i].replace(/^\d+\.\s+/, '')); i++; }
      out.push(`<ol>${buf.map((b) => `<li>${inlineFmt(b)}</li>`).join('')}</ol>`);
      continue;
    }
    // GFM table: header row + 구분선 + body rows
    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s|:\-]+\|\s*$/.test(lines[i + 1])) {
      const headerCells = line.split('|').slice(1, -1).map((c) => c.trim());
      i += 2; // header + separator skip
      const bodyRows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) {
        const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim());
        bodyRows.push(cells);
        i++;
      }
      const thead = `<thead><tr>${headerCells.map((c) => `<th>${inlineFmt(c)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${inlineFmt(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }
    if (line.trim() === '') { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,3}\s|>|[\-\*]\s|\d+\.\s|```|\|)/.test(lines[i])) { buf.push(lines[i]); i++; }
    out.push(`<p>${inlineFmt(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

export function splitFrontmatter(text) {
  if (!text || !/^---\s*\n/.test(text)) return { frontmatter: '', body: text || '' };
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { frontmatter: '', body: text };
  return { frontmatter: m[1], body: m[2] };
}
