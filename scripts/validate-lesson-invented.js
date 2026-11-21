#!/usr/bin/env node
/**
 * validate-lesson-invented.js — gate for data/lesson-invented.json.
 *
 * Ensures every served item is a four-option MCQ whose key is in the options,
 * is marked verified, is not a lesson-meta/exam-strategy question, and does not
 * repeat another item. A broken store would show empty or unanswerable questions
 * behind the "From lesson text" toggle.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { isMetaQuestion, isLessonMeta } = require('./lib/question-quality');

const file = path.resolve(__dirname, '..', 'data', 'lesson-invented.json');
if (!fs.existsSync(file)) {
  console.log('PASS  no lesson-invented store yet');
  process.exit(0);
}

let doc;
try { doc = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
  console.error('FAIL  data/lesson-invented.json does not parse: ' + e.message);
  process.exit(1);
}

const qs = Array.isArray(doc.questions) ? doc.questions : [];
const seen = new Set();
const problems = [];
for (const q of qs) {
  const id = q && q.id || '?';
  if (!q || !q.q || !q.a || !Array.isArray(q.opts) || q.opts.length !== 4) { problems.push(id + ': shape'); continue; }
  if (q.opts.indexOf(q.a) === -1) problems.push(id + ': answer not in options');
  if (new Set(q.opts.map((o) => String(o).toLowerCase().trim())).size !== 4) problems.push(id + ': duplicate options');
  if (q.verified !== true) problems.push(id + ': not verified');
  if (!q.passage || String(q.passage).length < 150) problems.push(id + ': missing passage');
  if (isMetaQuestion(q.q) || isLessonMeta(q.q)) problems.push(id + ': meta question');
  const key = String(q.q).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (seen.has(key)) problems.push(id + ': duplicate question');
  seen.add(key);
}

if (problems.length) {
  console.error('FAIL  lesson-invented store: ' + problems.length + ' problem(s)');
  problems.slice(0, 10).forEach((p) => console.error('  - ' + p));
  process.exit(1);
}
console.log('PASS  lesson-invented: ' + qs.length + ' verified passage-anchored question(s)');