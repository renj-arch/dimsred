'use strict';
// Is the basic-structure material in the corpus, and can Ask reach it?
//
//   node scripts/diag-basic-structure.js
//
// Three separate questions, deliberately not conflated:
//   1. Do the SOURCE files mention it?
//   2. Does the ask-qb index (what Ask answers from) mention it?
//   3. Is it reachable through an entity row, or only through full-text search?
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var Q = path.join(ROOT, 'data', 'questions');
var QB = path.join(ROOT, 'data', 'ask-qb');

var TERMS = [
  'golak nath', 'sajjan singh', 'shankari prasad', 'kesavananda',
  'minerva mills', 's r bommai', 'chandrachud', 'coelho',
  'basic structure', 'article 368', 'fundamental rights',
  'judicial review', 'federalism', 'separation of powers'
];

function countInFiles(dir, re, label) {
  var hits = {};
  TERMS.forEach(function (t) { hits[t] = { files: 0, occurrences: 0, examples: [] }; });
  var files = fs.readdirSync(dir).filter(function (f) { return f.endsWith('.json'); });
  var scanned = 0;
  files.forEach(function (f) {
    var txt;
    try { txt = fs.readFileSync(path.join(dir, f), 'utf8').toLowerCase(); }
    catch (e) { return; }
    scanned++;
    TERMS.forEach(function (t) {
      var at = txt.indexOf(t);
      if (at === -1) return;
      hits[t].files++;
      // Count non-overlapping occurrences.
      var n = 0, from = 0;
      for (;;) {
        var i = txt.indexOf(t, from);
        if (i === -1) break;
        n++; from = i + t.length;
      }
      hits[t].occurrences += n;
      if (hits[t].examples.length < 2) {
        hits[t].examples.push({
          file: f,
          snippet: txt.slice(Math.max(0, at - 130), at + t.length + 170).replace(/\s+/g, ' ')
        });
      }
    });
  });
  console.log('=== ' + label + ' (' + scanned + ' files scanned) ===');
  TERMS.forEach(function (t) {
    var h = hits[t];
    console.log('  ' + t.padEnd(20) +
      (h.occurrences ? (h.occurrences + ' occurrences in ' + h.files + ' files')
        : 'ABSENT'));
  });
  return hits;
}

// 1 + 2. The source bank, then the index Ask answers from.
var src = countInFiles(Q, null, 'data/questions (source bank, 8.7 GB)');
var idx = countInFiles(path.join(QB, 'bucket'), null, 'data/ask-qb/bucket (index Ask answers from)');

// 3. Reachability: which terms have an entity row?
var tsv = fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8').split('\n');
var names = tsv.map(function (l) { var i = l.indexOf('\t'); return (i < 0 ? l : l.slice(0, i)); });
console.log('');
console.log('=== entity rows (Ask resolves a heading to one of these) ===');
TERMS.forEach(function (t) {
  var hits = names.filter(function (n) { return n.toLowerCase().indexOf(t) !== -1; });
  console.log('  ' + t.padEnd(20) +
    (hits.length ? hits.length + ' row(s): ' + hits.slice(0, 2).join(' | ')
      : 'no entity row -- unreachable by entity lookup'));
});

console.log('');
console.log('=== a real quote from the source bank ===');
(function () {
  for (var i = 0; i < TERMS.length; i++) {
    var t = TERMS[i];
    if (src[t].examples.length) {
      console.log('  "' + t + '" in ' + src[t].examples[0].file + ':');
      console.log('    ...' + src[t].examples[0].snippet + '...');
      break;
    }
  }
})();

console.log('');
console.log('=== the same term in the index ===');
(function () {
  for (var i = 0; i < TERMS.length; i++) {
    var t = TERMS[i];
    if (idx[t].examples.length) {
      console.log('  "' + t + '" in ' + idx[t].examples[0].file + ':');
      console.log('    ...' + idx[t].examples[0].snippet + '...');
      break;
    }
    if (src[t].examples.length) {
      console.log('  "' + t + '" is in the source bank but NOT in the index.');
      console.log('    source: ' + src[t].examples[0].file);
      console.log('    ...' + src[t].examples[0].snippet + '...');
      break;
    }
  }
})();