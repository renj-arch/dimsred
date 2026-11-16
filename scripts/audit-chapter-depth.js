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

// Return [{heading, text, words}] splitting on h2/h3. Table-of-contents
// headings (zero body words) are kept but lose every max-words comparison.
function sections(html) {
  const h = stripNonProse(html);
  const parts = h.split(/(<h[23]\b[^>]*>[\s\S]*?<\/h[23]>)/i);
  const out = [];
  for (let i = 1; i < parts.length; i += 2) {
    const heading = plain(parts[i]);
    const body = parts[i + 1] || '';
    out.push({ heading: heading, text: prose(body), words: words(prose(body)) });
  }
  return out;
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

function auditChapter(chapter) {
  const minWords = Math.max(50, parseInt(chapter.minWords || 600, 10) || 600);
  let best = { words: 0, heading: '', file: '' };
  let anyLesson = false;
  const lessonFiles = [];
  for (const rel of chapter.lessons || []) {
    const fp = path.join(ROOT, rel);
    if (!fs.existsSync(fp)) { lessonFiles.push({ file: rel, exists: false }); continue; }
    anyLesson = true;
    lessonFiles.push({ file: rel, exists: true });
    for (const s of sections(fs.readFileSync(fp, 'utf8'))) {
      if (!matches(s.heading, chapter.headings)) continue;
      if (s.words > best.words) best = { words: s.words, heading: s.heading, file: rel };
    }
  }
  let status;
  if (!anyLesson || !best.heading) status = 'missing';
  else if (best.words < minWords * 0.4) status = 'stub';
  else if (best.words < minWords) status = 'thin';
  else status = 'ok';

  const evidence = best.heading ? best.text : '';
  const missingSubTopics = (chapter.subTopics || []).filter(t => !hasTerm(evidence, t));

  return {
    id: chapter.id,
    name: chapter.name,
    status: status,
    words: best.words,
    minWords: minWords,
    heading: best.heading,
    file: best.file,
    missingSubTopics: missingSubTopics,
    subTopics: chapter.subTopics || [],
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
        for (const s of sections(fs.readFileSync(p, 'utf8'))) {
          if (!s.heading || s.words === 0) continue;
          if (s.words < 200) rows.push({ words: s.words, heading: s.heading, file: rel });
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
  byPaper[paperId] = { name: paper.name || paperId, ok: 0, thin: 0, stub: 0, missing: 0, chapters: 0 };
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
    console.log('  chapters ' + p.chapters + '  ok ' + p.ok + '  thin ' + p.thin + '  stub ' + p.stub + '  missing ' + p.missing);
    chapters.filter(c => c.paper === paperId && c.status !== 'ok').forEach(c => {
      const miss = c.missingSubTopics.length ? '  missing: ' + c.missingSubTopics.slice(0, 6).join(', ') : '';
      console.log('  ' + c.status.toUpperCase().padEnd(7) + c.id + '  ' + c.words + '/' + c.minWords + ' words' + (c.heading ? '  [' + c.heading + ']' : '') + miss);
    });
    console.log('');
  }
  console.log('Overall: ' + summary.ok + '/' + summary.chapters + ' ok, ' + summary.thin + ' thin, ' + summary.stub + ' stub, ' + summary.missing + ' missing');
  console.log('Report: ' + path.relative(ROOT, OUT_FILE));
  console.log('Heuristic: section word count + sub-topic keywords. Verify accuracy by hand.');
}

if (strict && (summary.missing > 0 || summary.stub > 0)) process.exit(1);