#!/usr/bin/env node
'use strict';
/**
 * clean-course-practice.js — drop invalid questions from lesson practice banks.
 *
 * The paper gate caught duplicate/placeholder/empty options in papers; the
 * lesson `practiceQs` arrays had the same class of defect. This removes those
 * questions from every lesson page so neither the page nor the rebuilt bank can
 * serve them.
 *
 *   node scripts/clean-course-practice.js --dry
 *   node scripts/clean-course-practice.js
 */
const fs = require('fs');
const path = require('path');
const { badQuestion } = require('./lib/paper-quality');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');

function badCourse(q) {
  if (!q) return 'missing';
  const text = q.text != null ? q.text : q.q;
  const rawOpts = q.options || q.opts || [];
  if (!Array.isArray(rawOpts)) return 'options not array';
  const opts = rawOpts.map((o) => (typeof o === 'string' ? o : (o && (o.t != null ? o.t : o.text))));
  const correct = rawOpts.filter((o) => o && (o.c === true || o.correct === true)).map((o) => (o.t != null ? o.t : o.text))[0];
  const answer = q.a != null ? q.a : correct;
  return badQuestion({ text: text, options: opts, answer: answer });
}

let files = 0, total = 0, removed = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== '.git' && e.name !== 'data' && e.name !== 'node_modules') walk(p); continue; }
    if (!/^lesson-.*\.html$/.test(e.name)) continue;
    let s = fs.readFileSync(p, 'utf8');
    const m = /var\s+practiceQs\s*=\s*(\[[\s\S]*?\]);/.exec(s);
    if (!m) continue;
    let qs; try { qs = JSON.parse(m[1]); } catch (e) { continue; }
    if (!Array.isArray(qs) || !qs.length) continue;
    const keep = qs.filter((q) => !badCourse(q));
    if (keep.length === qs.length) continue;
    files++; total += qs.length;
    removed += qs.length - keep.length;
    console.log(path.relative(ROOT, p).replace(/\\/g, '/') + ' (-' + (qs.length - keep.length) + ')');
    if (!DRY) {
      s = s.slice(0, m.index) + 'var practiceQs = ' + JSON.stringify(keep) + ';' + s.slice(m.index + m[0].length);
      fs.writeFileSync(p, s, 'utf8');
    }
  }
})('.');
console.log((DRY ? 'DRY: ' : '') + 'files changed: ' + files + ' | questions looked at: ' + total + ' | removed: ' + removed);