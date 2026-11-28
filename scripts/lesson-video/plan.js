'use strict';
/**
 * plan.js — turn a parsed lesson into a complete slide deck.
 *
 * Every substantive block must land in at least one slide (see `coverage`), so a
 * lecture can never silently omit a section. Long paragraphs are split into
 * sentences and chunked into readable bullets; tables and lists are paginated.
 */
const WORDS_PER_BULLET = 20;
const BULLETS_PER_SLIDE = 5;
const TABLE_ROWS_PER_SLIDE = 6;

function words(s) { return String(s || '').trim() ? String(s).trim().split(/\s+/).length : 0; }

// Split prose into sentences without breaking common abbreviations.
function sentences(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const out = [];
  let buf = '';
  const abbrev = /\b(?:e\.g|i\.e|etc|vs|Dr|Mr|Mrs|Ms|Prof|St|No|fig|cf|ca|approx|c|Ma|Ga|BCE|CE)$/i;
  for (const part of t.split(/(?<=[.!?])\s+/)) {
    const candidate = (buf ? buf + ' ' : '') + part;
    if (abbrev.test(part.replace(/[.!?]+$/, '')) || /^[A-Z]\.$/.test(part)) { buf = candidate; continue; }
    out.push(candidate.trim()); buf = '';
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function chunkSentences(sents) {
  // Greedy packing into bullet-sized sentences; a single long sentence is split
  // by words so it still fits on screen.
  const bullets = [];
  let cur = '';
  for (let s of sents) {
    if (words(s) > WORDS_PER_BULLET * 1.6) {
      const ws = s.split(/\s+/);
      let line = '';
      for (const w of ws) {
        if (words(line + ' ' + w) > WORDS_PER_BULLET && line) { bullets.push(line); line = ''; }
        line = line ? line + ' ' + w : w;
      }
      if (line) { if (cur) { bullets.push(cur); cur = ''; } bullets.push(line); }
      continue;
    }
    if (cur && words(cur + ' ' + s) > WORDS_PER_BULLET) { bullets.push(cur); cur = ''; }
    cur = cur ? cur + ' ' + s : s;
  }
  if (cur) bullets.push(cur);
  return bullets.map((b) => b.replace(/[.;,]\s*$/, '').trim()).filter(Boolean);
}

function paginate(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function planLesson(doc, opts) {
  opts = opts || {};
  const slides = [];
  const covered = new Set();
  let section = { level: 2, heading: doc.title || 'Introduction' };
  let pendingCartoon = null;

  function push(slide) {
    slide.section = section.heading;
    slide.level = section.level;
    (slide.blockIds || []).forEach((id) => covered.add(id));
    slides.push(slide);
  }

  // Title card.
  push({
    kind: 'title',
    heading: doc.title || 'Lecture',
    subtitle: [doc.exam && doc.exam.toUpperCase(), doc.subject].filter(Boolean).join(' · '),
    bullets: (opts.titleBullets || []),
    narration: 'Lecture: ' + (doc.title || '') + '.',
    blockIds: []
  });

  for (const b of doc.blocks) {
    if (b.type === 'h2' || b.type === 'h3' || b.type === 'h4') {
      section = { level: b.type === 'h2' ? 2 : b.type === 'h3' ? 3 : 4, heading: b.text };
      // Section divider carries any cartoon that immediately follows the heading.
      push({ kind: 'section', heading: b.text, level: section.level, bullets: [], narration: b.text + '.', blockIds: [b.id] });
      continue;
    }
    if (b.type === 'cartoon') {
      push({
        kind: 'cartoon', heading: section.heading, caption: b.caption, svg: b.svg,
        bullets: [], narration: 'Look at the diagram: ' + b.caption + '.', blockIds: [b.id]
      });
      pendingCartoon = null;
      continue;
    }
    if (b.type === 'photo') {
      push({
        kind: 'note', heading: section.heading, caption: b.caption || b.alt || '',
        bullets: b.caption ? [b.caption] : [], narration: b.caption || '', blockIds: [b.id]
      });
      continue;
    }
    if (b.type === 'p' || b.type === 'quote') {
      const bullets = chunkSentences(sentences(b.text));
      const pages = paginate(bullets, BULLETS_PER_SLIDE);
      if (!pages.length) pages.push([b.text]);
      pages.forEach((page, i) => {
        push({
          kind: 'content', heading: section.heading, bullets: page,
          narration: page.join(' '), blockIds: i === 0 ? [b.id] : []
        });
      });
      continue;
    }
    if (b.type === 'list') {
      const items = b.items.map((x) => x.replace(/[.;,]\s*$/, '').trim()).filter(Boolean);
      const pages = paginate(items, BULLETS_PER_SLIDE);
      pages.forEach((page, i) => {
        push({
          kind: 'content', heading: section.heading, bullets: page, ordered: b.ordered,
          narration: page.join('; '), blockIds: i === 0 ? [b.id] : []
        });
      });
      continue;
    }
    if (b.type === 'table') {
      const header = b.rows[0] || [];
      const body = b.rows.slice(1);
      const pages = body.length ? paginate(body, TABLE_ROWS_PER_SLIDE) : [b.rows];
      pages.forEach((rows, i) => {
        const shown = (i === 0 && header.length && body.length) ? [header].concat(rows) : rows;
        push({
          kind: 'table', heading: section.heading, table: { header: body.length ? header : [], rows },
          bullets: [], narration: 'Table: ' + shown.map((r) => r.join(', ')).join('. ') + '.',
          blockIds: i === 0 ? [b.id] : []
        });
      });
      continue;
    }
    // h1 is already the title; ignore.
  }

  // Outro: recap the section headings (covers the "no missing" promise again).
  const heads = [];
  for (const s of slides) if (s.kind === 'section' && !heads.includes(s.heading)) heads.push(s.heading);
  if (heads.length) {
    push({
      kind: 'takeaways', heading: 'Recap — what we covered',
      bullets: heads.slice(0, 10),
      narration: 'Recap. ' + heads.join('. ') + '.',
      blockIds: []
    });
  }

  // Coverage over every block that carries text.
  const textBlocks = doc.blocks.filter((b) => b.type !== 'h1');
  const missing = textBlocks.filter((b) => !covered.has(b.id));
  return {
    slides,
    coverage: {
      total: textBlocks.length,
      covered: textBlocks.length - missing.length,
      pct: textBlocks.length ? Math.round(1000 * (textBlocks.length - missing.length) / textBlocks.length) / 10 : 100,
      missing: missing.map((b) => ({ type: b.type, text: (b.text || b.caption || b.items && b.items[0] || '').slice(0, 80) }))
    },
    wordCount: doc.blocks.reduce((n, b) => n + words(b.text || (b.items || []).join(' ') || (b.rows || []).map((r) => r.join(' ')).join(' ') || b.caption), 0)
  };
}

module.exports = { planLesson, sentences, chunkSentences, words };