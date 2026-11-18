#!/usr/bin/env node
/**
 * build-course-freshness.js — "last updated" for every lesson.
 *
 * The question "why is no last-updated shown?" had two causes: nothing rendered
 * one, and the generated lessons carry a date in course-versions.json while the
 * hand-built flagship lessons (Indian History, Polity, Economy, Environment,
 * Current Affairs) carry none at all — the lanes never wrote them because those
 * pages were not generated from course-data.json.
 *
 * The honest date for any file is the last commit that touched it, and that is
 * what this writes. Needs full history, so it runs on a checkout with
 * fetch-depth: 0 (course-freshness.yml), not on the shallow deploy clone.
 *
 *   node scripts/build-course-freshness.js
 *   -> data/course-freshness.json  { "upsc/course/gs/lesson-x.html": "2026-11-17" }
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'course-freshness.json');

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/^lesson-.*\.html$/.test(e.name)) out.push(full);
  }
  return out;
}

const files = [];
for (const exam of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!exam.isDirectory()) continue;
  const course = path.join(ROOT, exam.name, 'course');
  if (fs.existsSync(course)) walk(course, files);
}

const map = {};
let withDate = 0;
for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  try {
    const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', rel], {
      cwd: ROOT, encoding: 'utf8'
    }).trim();
    if (date) { map[rel] = date; withDate++; }
  } catch (e) { /* a file outside git history keeps no date */ }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
// Sorted keys so a rebuild with unchanged history is a byte-identical no-op.
const sorted = {};
Object.keys(map).sort().forEach((k) => { sorted[k] = map[k]; });
fs.writeFileSync(OUT, JSON.stringify(sorted, null, 1) + '\n', 'utf8');
console.log('course freshness: ' + withDate + '/' + files.length + ' lessons dated -> ' +
  path.relative(ROOT, OUT));