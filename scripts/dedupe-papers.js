#!/usr/bin/env node
'use strict';
// Remove duplicate questions from every stored paper, and fix the counts that
// were frozen into the paper when it was assembled.
//
// Why this exists
//
// scripts/lib/question-dedupe.js landed on 2026-11-11, and the question bank
// still carries repeats from imports that predate it. Papers already on disk
// were assembled before the gate:
//
//   14 of 19 full papers had at least one duplicate
//   neet-full-2026-11-07  64 of 200      ctet-full-2026-11-07  43 of 150
//   upsc-full-...-csat    35 of 80       sbi-clerk-full        23 of 100
//   18 of 60 practice sets had one each
//
// full-paper-lane.js now gates assembly and build-full-papers.js refuses a
// freshly assembled paper that still repeats, so nothing new ships broken. The
// papers already published are still wrong, and `pageTitle` / `pageDesc` /
// `meta` / `sectionsMeta[].count` were computed from the pre-drop count, so
// removing a question without fixing them would leave the page contradicting
// its own JSON.
//
//   node scripts/dedupe-papers.js --dry    # report only
//   node scripts/dedupe-papers.js          # rewrite papers-data/*.json
//
// The page builders must run afterwards:
//   node scripts/build-full-papers.js
//   node scripts/build-papers.js

var fs = require('fs');
var path = require('path');
var qd = require('./lib/question-dedupe.js');

var ROOT = path.join(__dirname, '..');
var DIR = path.join(ROOT, 'papers-data');
var DRY = process.argv.indexOf('--dry') !== -1;

// "100 Q" and "100 questions" are the two shapes the builders write. Only the
// number that immediately precedes one of those words is the count, so a marks
// figure or a year elsewhere in the string is never touched.
function fixCounts(s, oldN, newN) {
  if (typeof s !== 'string' || oldN === newN) return s;
  return s.replace(new RegExp('\\b' + oldN + '\\b(?=\\s*(?:Q\\b|questions\\b))', 'g'), String(newN));
}

function renumber(questions) {
  questions.forEach(function (q, i) { q.q = i + 1; });
}

var files = fs.readdirSync(DIR).filter(function (f) { return f.endsWith('.json'); }).sort();
var changed = [];
var totalDropped = 0;

files.forEach(function (f) {
  var fp = path.join(DIR, f);
  var raw = fs.readFileSync(fp, 'utf8');
  var crlf = raw.indexOf('\r\n') !== -1;
  var data;
  try { data = JSON.parse(raw); } catch (e) { return; }
  var questions = data.questions;
  if (!Array.isArray(questions) || !questions.length) return;

  var res = qd.findDuplicates(questions);
  var dupes = res.duplicates || [];
  if (!dupes.length) return;

  totalDropped += dupes.length;
  var before = questions.length;
  var drop = new Set(dupes.map(function (d) { return d.question; }));
  var kept = questions.filter(function (q) { return !drop.has(q); });
  renumber(kept);

  var after = kept.length;
  var counts = {};
  kept.forEach(function (q) { counts[q.section] = (counts[q.section] || 0) + 1; });

  if (Array.isArray(data.sectionsMeta)) {
    data.sectionsMeta = data.sectionsMeta
      .map(function (sm) { return Object.assign({}, sm, { count: counts[sm.name] || 0 }); })
      .filter(function (sm) { return sm.count > 0; });
  }
  if (Array.isArray(data.sections)) {
    data.sections = data.sections
      .filter(function (s) { return counts[s.name] > 0; })
      .map(function (s) { return Object.assign({}, s, { count: counts[s.name] || 0 }); });
  }
  if (data.totalQuestions != null) data.totalQuestions = after;
  data.questions = kept;
  data.pageTitle = fixCounts(data.pageTitle, before, after);
  data.pageDesc = fixCounts(data.pageDesc, before, after);
  data.meta = fixCounts(data.meta, before, after);

  changed.push({ file: f, before: before, after: after, dropped: dupes.length, reason: dupes[0].reason });

  if (!DRY) {
    var out = JSON.stringify(data, null, 2) + '\n';
    if (crlf) out = out.replace(/\n/g, '\r\n');
    fs.writeFileSync(fp, out, 'utf8');
  }
});

changed.forEach(function (c) {
  console.log('  ' + c.file.padEnd(48) + ' ' + String(c.before).padStart(4) + ' -> ' + String(c.after).padStart(4) +
    '  (dropped ' + c.dropped + ', ' + c.reason + ')');
});
console.log((DRY ? 'DRY: ' : '') + changed.length + ' paper(s) ' + (DRY ? 'would change' : 'rewritten') +
  ', ' + totalDropped + ' duplicate question(s) removed');
