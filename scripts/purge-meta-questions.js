#!/usr/bin/env node
/**
 * purge-meta-questions.js — remove exam-strategy noise from the study banks.
 *
 * "What is the best strategy for attempting Paper A: Indian Language questions
 * in the exam? A. Attempt all questions B. Easy questions first..." is not a
 * General Studies question. It teaches nothing, its "correct answer" is an
 * opinion, and it makes a serious paper look like a school quiz. 348 of these
 * shipped because the topic import path never ran the quality gate.
 *
 * This removes them from the topic banks, the question banks and the generated
 * mock-test data, refreshes the counts, and writes both the .json and the
 * window.__examData .js twin. The pattern lives in lib/question-quality.js, so
 * new generators reject the same class before it is stored.
 *
 *   node scripts/purge-meta-questions.js            # rewrite
 *   node scripts/purge-meta-questions.js --check    # exit 1 if any remain
 *   node scripts/purge-meta-questions.js --dry-run
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { isMetaQuestion } = require('./lib/question-quality');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');
const DRY = process.argv.includes('--dry-run');

const textOf = (q) => String((q && (q.text || q.question || q.q)) || '');
// The exact four-option template these items were generated from. If all four
// appear, it is an exam-strategy question no matter how the stem is worded.
const STRATEGY_OPTIONS = [
  'attempt all questions',
  'easy questions first, then difficult',
  'difficult questions first',
  'random order'
];
function isMeta(q) {
  if (isMetaQuestion(textOf(q))) return true;
  const opts = ((q && (q.options || q.opts)) || []).map((o) => String((o && o.text) || o).toLowerCase().trim());
  return STRATEGY_OPTIONS.every((x) => opts.indexOf(x) !== -1);
}

const report = { generatedAt: new Date().toISOString(), files: [], examples: [] };
let total = 0;

function note(file, n, sample) {
  if (!n) return;
  total += n;
  report.files.push({ file, removed: n });
  if (sample && report.examples.length < 12) report.examples.push({ file, text: sample });
}

function writeIf(rel, text) {
  if (CHECK || DRY) return;
  fs.writeFileSync(path.join(ROOT, rel), text, 'utf8');
}

// ── 1. Curated topic banks (and their window.__examData twins) ─────────────
const topicDir = path.join(ROOT, 'data', 'topics');
if (fs.existsSync(topicDir)) {
  for (const name of fs.readdirSync(topicDir).filter((f) => f.endsWith('.json'))) {
    const rel = 'data/topics/' + name;
    let doc;
    try { doc = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch (e) { continue; }
    let removed = 0, sample = '';
    for (const section of doc.sections || []) {
      const before = (section.questions || []).length;
      section.questions = (section.questions || []).filter((q) => {
        if (!isMeta(q)) return true;
        if (!sample) sample = textOf(q);
        removed++;
        return false;
      });
      if (typeof section.count === 'number') section.count = section.questions.length;
      if (section.count !== before && typeof section.count !== 'number') section.count = section.questions.length;
    }
    if (removed) {
      doc.total = (doc.sections || []).reduce((n, s) => n + (s.questions || []).length, 0);
      const compact = JSON.stringify(doc);
      writeIf(rel, compact + '\n');
      const jsRel = 'data/topics/' + name.replace(/\.json$/, '.js');
      if (fs.existsSync(path.join(ROOT, jsRel))) writeIf(jsRel, 'window.__examData=' + compact + ';');
      note(rel, removed, sample);
    }
  }
}

// ── 2. Question banks ──────────────────────────────────────────────────────
const bankDir = path.join(ROOT, 'question-bank');
if (fs.existsSync(bankDir)) {
  for (const name of fs.readdirSync(bankDir).filter((f) => f.endsWith('.json') && !/meta/.test(f))) {
    const rel = 'question-bank/' + name;
    let doc;
    try { doc = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch (e) { continue; }
    if (!Array.isArray(doc.questions)) continue;
    const before = doc.questions.length;
    let sample = '';
    doc.questions = doc.questions.filter((q) => {
      if (!isMeta(q)) return true;
      if (!sample) sample = textOf(q);
      return false;
    });
    const removed = before - doc.questions.length;
    if (removed) {
      doc.total = doc.questions.length;
      writeIf(rel, JSON.stringify(doc, null, 2) + '\n');
      note(rel, removed, sample);
    }
  }
}

// ── 3. Mock tests: filter window._mockTestData in place ────────────────────
function extractObject(html, marker) {
  const at = html.indexOf(marker);
  if (at < 0) return null;
  const start = html.indexOf('{', at + marker.length);
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return { start, end: i + 1, json: html.slice(start, i + 1) }; }
  }
  return null;
}

function walk(dir, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'data' || e.name === 'scripts') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

for (const abs of walk(ROOT, [])) {
  let html;
  try { html = fs.readFileSync(abs, 'utf8'); } catch (e) { continue; }
  if (html.indexOf('_mockTestData') < 0) continue;
  const box = extractObject(html, '_mockTestData');
  if (!box) continue;
  let doc;
  try { doc = JSON.parse(box.json); } catch (e) { continue; }
  if (!Array.isArray(doc.questions)) continue;
  const before = doc.questions.length;
  let sample = '';
  doc.questions = doc.questions.filter((q) => {
    if (!isMeta(q)) return true;
    if (!sample) sample = textOf(q);
    return false;
  });
  const removed = before - doc.questions.length;
  if (!removed) continue;
  doc.totalQuestions = doc.questions.length;
  if (doc.questions.every((q) => typeof q.marks === 'number')) {
    doc.totalMarks = doc.questions.reduce((n, q) => n + q.marks, 0);
  }
  let next = html.slice(0, box.start) + JSON.stringify(doc) + html.slice(box.end);
  // Keep the visible counts honest; only touch the exact old numbers.
  next = next.split('>' + before + ' Questions<').join('>' + doc.questions.length + ' Questions<');
  const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
  writeIf(rel, next);
  note(rel, removed, sample);
}

if (!CHECK && !DRY) {
  fs.writeFileSync(path.join(ROOT, 'data', 'meta-questions-report.json'),
    JSON.stringify(report, null, 2) + '\n', 'utf8');
}

console.log('meta/exam-strategy questions ' + (CHECK ? 'remaining: ' : 'removed: ') + total);
report.files.sort((a, b) => b.removed - a.removed).slice(0, 12)
  .forEach((f) => console.log('  ' + f.removed + '  ' + f.file));
report.examples.slice(0, 4).forEach((e) => console.log('  e.g. ' + e.text.slice(0, 100)));

if (CHECK && total) {
  console.error('FAIL ' + total + ' exam-strategy question(s) still in the banks');
  process.exitCode = 1;
} else if (!total) {
  console.log('no exam-strategy questions found');
}