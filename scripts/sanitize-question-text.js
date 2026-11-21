#!/usr/bin/env node
'use strict';
// Remove C0 control characters from question banks and paper data.
//
// Older extracted solutions carry stray NUL bytes inside Hindi glosses (the
// Devanagari source lost its characters and left the separator behind). A NUL
// is invisible on the page but makes git classify the generated HTML as binary,
// so diffs stop being reviewable and `git add` cannot show the change. This
// pass is idempotent and only rewrites a file when a control character was
// actually found.
//
//   node scripts/sanitize-question-text.js
//   node scripts/sanitize-question-text.js --dry-run

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var DRY = process.argv.includes('--dry-run');
var CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function cleanString(s) {
  if (!CONTROL.test(s)) return s;
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function walk(value, hits) {
  if (typeof value === 'string') {
    var next = cleanString(value);
    if (next !== value) hits.count++;
    return next;
  }
  if (Array.isArray(value)) return value.map(function (v) { return walk(v, hits); });
  if (value && typeof value === 'object') {
    var out = {};
    Object.keys(value).forEach(function (k) { out[k] = walk(value[k], hits); });
    return out;
  }
  return value;
}

function processFile(file) {
  var raw = fs.readFileSync(file, 'utf8');
  var data;
  try { data = JSON.parse(raw); } catch (e) {
    console.log('  skipped unreadable JSON: ' + path.relative(ROOT, file));
    return 0;
  }
  var hits = { count: 0 };
  var clean = walk(data, hits);
  if (!hits.count) return 0;
  if (!DRY) fs.writeFileSync(file, JSON.stringify(clean, null, 2) + '\n', 'utf8');
  console.log('  ' + path.relative(ROOT, file) + ': cleaned ' + hits.count + ' string(s)');
  return hits.count;
}

var total = 0;
var dirs = ['question-bank', 'papers-data'];
dirs.forEach(function (dir) {
  var full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return;
  console.log(dir + ':');
  fs.readdirSync(full).filter(function (f) { return /\.json$/i.test(f); }).forEach(function (f) {
    total += processFile(path.join(full, f));
  });
});

console.log((DRY ? 'DRY RUN: ' : '') + 'sanitized ' + total + ' string(s)');

// Static previous-year pages were built once from the same corpus and still
// carry the stray NUL. Clean the generated HTML as well so `git diff` stays
// textual and text search can index the solutions.
var exams = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer', 'upsc', 'ibps-po',
  'sbi-clerk', 'ssc-gd', 'ctet', 'nda', 'cds', 'clat'];
var htmlFixed = 0;
exams.forEach(function (exam) {
  var dir = path.join(ROOT, exam, 'papers');
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).filter(function (f) { return /\.html$/i.test(f); }).forEach(function (f) {
    var file = path.join(dir, f);
    var raw = fs.readFileSync(file, 'utf8');
    if (!CONTROL.test(raw)) return;
    var next = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ');
    if (!DRY) fs.writeFileSync(file, next, 'utf8');
    console.log('  ' + path.relative(ROOT, file) + ': cleaned HTML control characters');
    htmlFixed++;
  });
});
console.log((DRY ? 'DRY RUN: ' : '') + 'sanitized ' + htmlFixed + ' HTML page(s)');
