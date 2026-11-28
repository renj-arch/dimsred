'use strict';
/**
 * lesson-doc.js — parse a lesson page into an ordered, complete document model.
 *
 * The lecture-video lane must cover *everything* on the page, so this walks the
 * body in document order and keeps every substantive block: headings,
 * paragraphs, lists, tables and figures (with their captions and inline cartoon
 * SVG). It deliberately drops chrome (nav/header/footer/aside/script/style).
 *
 * Two hashes come out of it:
 *   proseHash  — headings + prose + list items + table cells + figure captions.
 *                This is what the fact audit certifies; cartoon geometry is
 *                excluded so re-drawing a diagram does not invalidate an audit.
 *   videoHash  — proseHash + cartoon SVG + photo refs. A change here means the
 *                rendered video no longer matches the page (must re-render).
 */
const crypto = require('crypto');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
function decode(s) {
  return String(s || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, k) => {
    const key = k.toLowerCase();
    if (ENTITIES[key] != null) return ENTITIES[key];
    if (key[0] === '#') {
      const n = key[1] === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
      return isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return m;
  });
}
function stripTags(s) {
  return decode(String(s || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li|tr|div|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim();
}
function norm(s) { return stripTags(s).replace(/\s+/g, ' ').trim(); }
function sha(s) { return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16); }

// Remove page chrome so we only parse lesson content.
function contentRegion(html) {
  let s = String(html);
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
  s = s.replace(/<header[\s\S]*?<\/header>/gi, ' ');
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
  s = s.replace(/<aside[\s\S]*?<\/aside>/gi, ' ');
  s = s.replace(/<form[\s\S]*?<\/form>/gi, ' ');
  return s;
}

const BLOCK = /<(h1|h2|h3|h4|p|ul|ol|table|figure|blockquote)\b([^>]*)>([\s\S]*?)<\/\1>/gi;

function parseTable(inner) {
  const rows = [];
  const re = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = re.exec(inner))) {
    const cells = [];
    const cre = /<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let c;
    while ((c = cre.exec(m[1]))) cells.push(norm(c[2]));
    if (cells.some((x) => x)) rows.push(cells);
  }
  return rows;
}
function parseList(inner) {
  const items = [];
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = re.exec(inner))) { const t = norm(m[1]); if (t) items.push(t); }
  return items;
}

function parseLesson(html, meta) {
  meta = meta || {};
  const body = contentRegion(html);
  const doc = { title: meta.title || '', exam: meta.exam || '', subject: meta.subject || '', blocks: [] };
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(body);
  if (h1) doc.title = doc.title || norm(h1[1]);

  let m;
  BLOCK.lastIndex = 0;
  while ((m = BLOCK.exec(body))) {
    const tag = m[1].toLowerCase();
    const attrs = m[2] || '';
    const inner = m[3];
    if (/passage-cartoon/.test(attrs)) {
      const svg = (inner.match(/<svg[\s\S]*?<\/svg>/i) || [])[0] || '';
      const cap = (inner.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i) || [, ''])[1];
      doc.blocks.push({ type: 'cartoon', caption: norm(cap), svg });
      continue;
    }
    if (/passage-photo/.test(attrs)) {
      const img = (inner.match(/<img\b[^>]*\bsrc="([^"]+)"/i) || [])[1] || '';
      const alt = (inner.match(/<img\b[^>]*\balt="([^"]*)"/i) || [])[1] || '';
      const cap = (inner.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i) || [, ''])[1];
      doc.blocks.push({ type: 'photo', caption: norm(cap), alt: norm(alt), src: img });
      continue;
    }
    if (tag === 'h1') { const t = norm(inner); if (t) doc.blocks.push({ type: 'h1', text: t }); continue; }
    if (tag === 'h2' || tag === 'h3' || tag === 'h4') { const t = norm(inner); if (t) doc.blocks.push({ type: tag, text: t }); continue; }
    if (tag === 'p') { const t = norm(inner); if (t) doc.blocks.push({ type: 'p', text: t }); continue; }
    if (tag === 'blockquote') { const t = norm(inner); if (t) doc.blocks.push({ type: 'quote', text: t }); continue; }
    if (tag === 'ul' || tag === 'ol') { const items = parseList(inner); if (items.length) doc.blocks.push({ type: 'list', ordered: tag === 'ol', items }); continue; }
    if (tag === 'table') { const rows = parseTable(inner); if (rows.length) doc.blocks.push({ type: 'table', rows }); continue; }
  }

  // Prose = everything that carries a factual claim. Cartoon SVG geometry, photo
  // URLs and image alt text are excluded so an audit survives a redraw.
  const proseParts = [];
  const videoParts = [];
  for (const b of doc.blocks) {
    if (b.type === 'cartoon') {
      proseParts.push('FIG ' + b.caption);
      videoParts.push('FIG ' + b.caption + '\u0001' + b.svg);
    } else if (b.type === 'photo') {
      proseParts.push('PHOTO ' + b.caption);
      videoParts.push('PHOTO ' + b.caption + '\u0001' + b.src + '\u0001' + b.alt);
    } else if (b.type === 'list') {
      proseParts.push('LIST ' + b.items.join(' | '));
      videoParts.push('LIST ' + b.items.join(' | '));
    } else if (b.type === 'table') {
      const flat = b.rows.map((r) => r.join(' | ')).join(' // ');
      proseParts.push('TABLE ' + flat);
      videoParts.push('TABLE ' + flat);
    } else {
      proseParts.push(b.type.toUpperCase() + ' ' + b.text);
      videoParts.push(b.type.toUpperCase() + ' ' + b.text);
    }
  }
  doc.proseHash = sha(proseParts.join('\n'));
  doc.videoHash = sha(videoParts.join('\n'));
  doc.proseText = proseParts.join('\n');

  // Derived metadata used by the planner.
  const rel = meta.rel || '';
  const parts = rel.split('/');
  doc.exam = doc.exam || parts[0] || '';
  doc.subject = doc.subject || (parts.length > 2 ? parts[parts.length - 1].replace(/^lesson-/, '').replace(/\.html$/, '') : '');
  doc.blocks.forEach((b, i) => { b.id = i; });
  return doc;
}

module.exports = { parseLesson, stripTags, norm, sha, decode };