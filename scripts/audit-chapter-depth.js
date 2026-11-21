#!/usr/bin/env node
'use strict';
// Chapter-depth audit for the UPSC Mains course.
//
// The syllabus audit asked "is the topic mentioned?". This asks the harder
// question: "is there a real chapter, at textbook depth, with its sub-topics?"
//
// For every chapter in data/chapter-map.json it finds the best-matching
// section on the expected lesson page(s), measures that section's words, and
// checks the chapter's required sub-topics. Status:
//
//   ok       best section >= minWords
//   thin     best section < minWords
//   stub     best section < 40% of minWords (a heading with almost no body)
//   missing  no lesson or no matching section at all
//
// It is a heuristic. Depth is words in the section; sub-topics are keyword
// presence. A human must verify accuracy. But it cannot be fooled by a topic
// appearing once: a 20-word section is reported as a stub.
//
//   node scripts/audit-chapter-depth.js              # human report
//   node scripts/audit-chapter-depth.js --json       # machine-readable
//   node scripts/audit-chapter-depth.js --strict     # exit 1 on missing/stub
//   node scripts/audit-chapter-depth.js --generic    # every lesson, thin sections
//
// Writes data/chapter-depth.json.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAP_FILE = path.join(ROOT, 'data', 'chapter-map.json');
const OUT_FILE = path.join(ROOT, 'data', 'chapter-depth.json');

const args = process.argv.slice(2);
const asJson = args.indexOf('--json') !== -1;
const strict = args.indexOf('--strict') !== -1;
const generic = args.indexOf('--generic') !== -1;

function stripNonProse(html) {
  return String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}
function prose(html) {
  return stripNonProse(html).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}
function words(text) {
  return String(text || '').split(/\s+/).filter(w => w.length > 1).length;
}
function plain(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

// Build a two-level table of contents from the page. Top-level entries are
// <h2> chapters; each carries its <h3> subsections. A chapter's depth is the
// whole h2 block — its own text plus every child h3 — not the sliver of text
// before the first sub-heading. Splitting on h2 and h3 together (the first
// version) scored a 1,000-word chapter as 0 whenever the heading was followed
// straight by a sub-heading.
function sections(html) {
  const h = stripNonProse(html);
  const parts = h.split(/(<h[23]\b[^>]*>[\s\S]*?<\/h[23]>)/i);
  const tops = [];
  let cur = null;
  for (let i = 1; i < parts.length; i += 2) {
    const level = /^<h2/i.test(parts[i]) ? 2 : 3;
    const heading = plain(parts[i]);
    const body = prose(parts[i + 1] || '');
    if (level === 2) {
      cur = { level: 2, heading: heading, text: body, children: [] };
      tops.push(cur);
    } else {
      const child = { level: 3, heading: heading, text: body, children: [] };
      if (cur) cur.children.push(child); else tops.push(child);
    }
  }
  return tops;
}

function blockWords(block) {
  return words(block.text) + block.children.reduce((n, c) => n + words(c.text), 0);
}
function blockText(block) {
  return block.text + ' ' + block.children.map(c => c.text).join(' ');
}

function matches(heading, names) {
  const h = String(heading || '').toLowerCase();
  return (names || []).some(n => h.indexOf(String(n).toLowerCase()) !== -1);
}

function hasTerm(text, term) {
  const t = String(term || '').toLowerCase();
  if (!t) return false;
  return String(text || '').toLowerCase().indexOf(t) !== -1;
}

// Best chapter match on one page: prefer an h2 whose whole block matches,
// else an h3 subsection. Returns {words, heading, text, level} or null.
function bestMatch(html, names) {
  let best = null;
  for (const t of sections(html)) {
    if (matches(t.heading, names)) {
      const w = blockWords(t);
      if (!best || w > best.words) best = { words: w, heading: t.heading, text: blockText(t), level: 2 };
    }
    for (const c of t.children) {
      if (!matches(c.heading, names)) continue;
      const w = words(c.text);
      if (!best || w > best.words) best = { words: w, heading: c.heading, text: c.text, level: 3 };
    }
  }
  return best;
}

function auditChapter(chapter) {
  const minWords = Math.max(50, parseInt(chapter.minWords || 600, 10) || 600);
  let best = null;
  let bestFile = '';
  let anyLesson = false;
  let pageText = '';
  const lessonFiles = [];
  for (const rel of chapter.lessons || []) {
    const fp = path.join(ROOT, rel);
    if (!fs.existsSync(fp)) { lessonFiles.push({ file: rel, exists: false }); continue; }
    anyLesson = true;
    lessonFiles.push({ file: rel, exists: true });
    const html = fs.readFileSync(fp, 'utf8');
    pageText += ' ' + prose(html);
    const m = bestMatch(html, chapter.headings);
    if (m && (!best || m.words > best.words)) { best = m; bestFile = rel; }
  }

  const subTopics = chapter.subTopics || [];
  // Sub-topics are checked against the whole mapped page(s), not just the best
  // block. A broad chapter (Parliament, Centre-State) legitimately keeps its
  // sub-topics in sibling sections, and a block-only check reported them
  // missing when they were plainly on the page.
  const evidence = pageText;
  const missingSubTopics = subTopics.filter(t => !hasTerm(evidence, t));
  const pagePresent = subTopics.filter(t => hasTerm(pageText, t)).length;
  const namePresent = hasTerm(pageText, chapter.name);

  let status;
  if (!anyLesson) status = 'missing';
  else if (best) {
    if (best.words < minWords * 0.4) status = 'stub';
    else if (best.words < minWords) status = 'thin';
    else status = 'ok';
  } else if (namePresent || pagePresent >= 2) {
    // Mentioned on the page but with no chapter of its own.
    status = 'scattered';
  } else {
    status = 'missing';
  }

  return {
    id: chapter.id,
    name: chapter.name,
    status: status,
    words: best ? best.words : 0,
    minWords: minWords,
    heading: best ? best.heading : '',
    level: best ? best.level : 0,
    file: best ? bestFile : '',
    pageHits: pagePresent,
    missingSubTopics: missingSubTopics,
    subTopics: subTopics,
    lessons: lessonFiles
  };
}

// Generic mode: every course lesson, every section under 200 words.
function genericScan() {
  const root = path.join(ROOT, 'upsc', 'course');
  const rows = [];
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) {
        const rel = path.relative(ROOT, p).replace(/\\/g, '/');
        for (const t of sections(fs.readFileSync(p, 'utf8'))) {
          const tw = blockWords(t);
          if (t.heading && tw > 0 && tw < 250) rows.push({ words: tw, heading: t.heading, file: rel });
          for (const c of t.children) {
            const cw = words(c.text);
            if (c.heading && cw > 0 && cw < 150) rows.push({ words: cw, heading: t.heading + ' › ' + c.heading, file: rel });
          }
        }
      }
    }
  };
  walk(root);
  rows.sort((a, b) => a.words - b.words);
  console.log('Generic scan: sections under 200 words across upsc/course/');
  console.log('count: ' + rows.length);
  rows.slice(0, 60).forEach(r => console.log(String(r.words).padStart(5) + ' | ' + r.heading.slice(0, 66) + ' | ' + r.file));
}

if (generic) { genericScan(); process.exit(0); }

if (!fs.existsSync(MAP_FILE)) {
  console.error('missing ' + path.relative(ROOT, MAP_FILE));
  process.exit(2);
}
const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));

const chapters = [];
const byPaper = {};
for (const [paperId, paper] of Object.entries(map.papers || {})) {
  byPaper[paperId] = { name: paper.name || paperId, ok: 0, thin: 0, stub: 0, scattered: 0, missing: 0, chapters: 0 };
  for (const ch of paper.chapters || []) {
    const r = auditChapter(ch);
    r.paper = paperId;
    chapters.push(r);
    byPaper[paperId].chapters++;
    byPaper[paperId][r.status]++;
  }
}

const summary = {
  papers: Object.keys(byPaper).length,
  chapters: chapters.length,
  ok: chapters.filter(c => c.status === 'ok').length,
  thin: chapters.filter(c => c.status === 'thin').length,
  stub: chapters.filter(c => c.status === 'stub').length,
  scattered: chapters.filter(c => c.status === 'scattered').length,
  missing: chapters.filter(c => c.status === 'missing').length,
  byPaper: byPaper
};
const out = {
  generatedAt: new Date().toISOString(),
  source: map.source,
  note: map.note,
  summary: summary,
  chapters: chapters
};
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n');

if (asJson) {
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
} else {
  console.log('Chapter depth audit');
  console.log('generated  ' + out.generatedAt);
  console.log('');
  for (const [paperId, p] of Object.entries(byPaper)) {
    console.log(p.name);
    console.log('  chapters ' + p.chapters + '  ok ' + p.ok + '  thin ' + p.thin + '  stub ' + p.stub + '  scattered ' + p.scattered + '  missing ' + p.missing);
    chapters.filter(c => c.paper === paperId && c.status !== 'ok').forEach(c => {
      const miss = c.missingSubTopics.length ? '  missing: ' + c.missingSubTopics.slice(0, 6).join(', ') : '';
      const where = c.heading ? '  [' + c.heading + ']' : (c.pageHits ? '  (' + c.pageHits + ' sub-topics on page, no chapter heading)' : '');
      console.log('  ' + c.status.toUpperCase().padEnd(10) + c.id + '  ' + c.words + '/' + c.minWords + ' words' + where + miss);
    });
    console.log('');
  }
  console.log('Overall: ' + summary.ok + '/' + summary.chapters + ' ok, ' + summary.thin + ' thin, ' + summary.stub + ' stub, ' + summary.scattered + ' scattered, ' + summary.missing + ' missing');
  console.log('Report: ' + path.relative(ROOT, OUT_FILE));
  console.log('Heuristic: chapter word count (h2 block incl. h3) + sub-topic keywords. Verify accuracy by hand.');
}

if (strict && (summary.missing > 0 || summary.stub > 0)) process.exit(1);