#!/usr/bin/env node
'use strict';
// Syllabus coverage audit for the UPSC Mains course.
//
// The question "is the course complete, with no gaps?" needs a number. This
// maps each official GS Paper I-IV syllabus topic (data/syllabus-map.json) to
// the lesson pages that should carry it, then reports, per topic:
//
//   covered  the expected lesson(s) exist and the topic's keywords appear
//   thin     the lesson(s) exist but the keywords barely appear
//   missing  no expected lesson exists, or none of the keywords appear
//
// It is a HEURISTIC. Keyword presence is evidence a topic is on the page, not
// proof that the treatment is accurate, deep or current. A human must verify
// every 'thin' and 'missing' row before it is treated as a real defect.
//
//   node scripts/audit-syllabus-coverage.js            # human report
//   node scripts/audit-syllabus-coverage.js --json     # machine-readable
//   node scripts/audit-syllabus-coverage.js --strict   # exit 1 if any missing
//
// Writes data/syllabus-coverage.json next to the report.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAP_FILE = path.join(ROOT, 'data', 'syllabus-map.json');
const OUT_FILE = path.join(ROOT, 'data', 'syllabus-coverage.json');

const args = process.argv.slice(2);
const asJson = args.indexOf('--json') !== -1;
const strict = args.indexOf('--strict') !== -1;

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

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Count a term as a whole token/word (not a substring of a larger word).
function countTerm(text, term) {
  const t = String(term || '').toLowerCase();
  if (!t) return 0;
  const re = new RegExp('(?<![a-z0-9])' + escapeRe(t) + '(?![a-z0-9])', 'g');
  const m = String(text || '').toLowerCase().match(re);
  return m ? m.length : 0;
}

function readMap() {
  if (!fs.existsSync(MAP_FILE)) {
    console.error('missing ' + path.relative(ROOT, MAP_FILE));
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
}

const map = readMap();
const topics = [];
const byPaper = {};

for (const [paperId, paper] of Object.entries(map.papers || {})) {
  byPaper[paperId] = { name: paper.name || paperId, covered: 0, thin: 0, missing: 0, topics: 0 };
  for (const topic of paper.topics || []) {
    const minHits = Math.max(1, parseInt(topic.minHits || '3', 10) || 3);
    const lessons = [];
    let totalHits = 0;
    let anyExists = false;
    for (const rel of topic.lessons || []) {
      const fp = path.join(ROOT, rel);
      if (!fs.existsSync(fp)) {
        lessons.push({ file: rel, exists: false, hits: 0, words: 0 });
        continue;
      }
      anyExists = true;
      const html = fs.readFileSync(fp, 'utf8');
      const text = prose(html);
      let hits = 0;
      for (const term of topic.terms || []) hits += countTerm(text, term);
      lessons.push({ file: rel, exists: true, hits: hits, words: words(text) });
      totalHits += hits;
    }
    let status;
    if (!anyExists) status = 'missing';
    else if (totalHits < minHits) status = 'thin';
    else status = 'covered';

    byPaper[paperId].topics++;
    byPaper[paperId][status]++;
    topics.push({
      paper: paperId,
      id: topic.id,
      topic: topic.topic,
      status: status,
      hits: totalHits,
      minHits: minHits,
      lessons: lessons
    });
  }
}

const summary = {
  papers: Object.keys(byPaper).length,
  topics: topics.length,
  covered: topics.filter(t => t.status === 'covered').length,
  thin: topics.filter(t => t.status === 'thin').length,
  missing: topics.filter(t => t.status === 'missing').length,
  byPaper: byPaper
};

const out = {
  generatedAt: new Date().toISOString(),
  source: map.source,
  note: map.note,
  summary: summary,
  topics: topics
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n');

if (asJson) {
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
} else {
  console.log('Syllabus coverage audit (heuristic)');
  console.log('generated  ' + out.generatedAt);
  console.log('source     ' + out.source);
  console.log('');
  for (const [paperId, p] of Object.entries(byPaper)) {
    console.log(p.name);
    console.log('  topics ' + p.topics + '  covered ' + p.covered + '  thin ' + p.thin + '  missing ' + p.missing);
    topics.filter(t => t.paper === paperId && t.status !== 'covered').forEach(t => {
      console.log('  ' + (t.status === 'missing' ? 'MISSING' : 'THIN   ') + ' ' + t.id + ' (' + t.hits + '/' + t.minHits + ' hits): ' + t.topic);
    });
    console.log('');
  }
  console.log('Overall: ' + summary.covered + '/' + summary.topics + ' covered, ' + summary.thin + ' thin, ' + summary.missing + ' missing');
  console.log('Report: ' + path.relative(ROOT, OUT_FILE));
  console.log('This is a keyword heuristic, not a certification of accuracy or completeness.');
}

if (strict && summary.missing > 0) process.exit(1);