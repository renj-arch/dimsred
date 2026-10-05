'use strict';
// Where does a term actually live in the source bank?
//
//   node scripts/diag-term-source.js "scientific temper"
//
// The entity table claims 33 sentences for a term that the bucket row holds only
// 2 of. That gap is either a counting artefact or real missing coverage, and the
// two call for different fixes, so this counts occurrences per source file and
// then follows one record all the way to the sentence.
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var Q = path.join(ROOT, 'data', 'questions');

var term = (process.argv[2] || 'scientific temper').toLowerCase();
var termRe = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

var idx = JSON.parse(fs.readFileSync(path.join(Q, 'archive-cat-index.json'), 'utf8'));
var cats = Array.isArray(idx) ? idx : idx.categories;

var hits = [];
cats.forEach(function (c) {
  var files = Array.isArray(c.file) ? c.file : [c.file];
  files.forEach(function (f) {
    var full = path.join(ROOT, f);
    if (!fs.existsSync(full)) return;
    var txt = fs.readFileSync(full, 'utf8');
    var n = (txt.match(termRe) || []).length;
    if (n > 0) hits.push({ cat: c.name, file: f, n: n });
  });
});

hits.sort(function (a, b) { return b.n - a.n; });
console.log('"' + term + '" appears in ' + hits.length + ' source file(s), ' +
  hits.reduce(function (a, h) { return a + h.n; }, 0) + ' occurrences total');
console.log('');
hits.slice(0, 20).forEach(function (h) {
  console.log('  ' + String(h.n).padStart(4) + '  ' + h.cat.padEnd(30) + h.file);
});

// Follow one record to see what the builder would actually keep from it.
if (hits.length) {
  var top = hits[0];
  console.log('');
  console.log('=== records in ' + top.file + ' ===');
  var data = JSON.parse(fs.readFileSync(path.join(ROOT, top.file), 'utf8'));
  var shown = 0;
  function walk(v, ctx) {
    if (shown >= 4) return;
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) {
      v.forEach(function (x) { walk(x, ctx); });
      return;
    }
    if (v.subSubjects && typeof v.subSubjects === 'object' && !Array.isArray(v.subSubjects)) {
      Object.keys(v.subSubjects).forEach(function (k) {
        walk(v.subSubjects[k], { cat: ctx.cat, sub: k });
      });
      return;
    }
    if (v.question !== undefined || v.fact !== undefined) {
      var hay = (v.fact || '') + ' ' + (v.question || '') + ' ' + (v.answer || '');
      if (!termRe.test(hay)) return;
      termRe.lastIndex = 0;
      shown++;
      console.log('  --- ' + shown + '  subSubject=' + JSON.stringify(v.subSubject) +
        '  subject=' + JSON.stringify(v.subject) + '  cat=' + JSON.stringify(v.category));
      console.log('      question: ' + String(v.question).slice(0, 120));
      var fact = String(v.fact || '');
      termRe.lastIndex = 0;
      var m = termRe.exec(fact);
      console.log('      fact (' + fact.length + ' chars): ' +
        (m ? '...' + fact.slice(Math.max(0, m.index - 100), m.index + 200).replace(/\s+/g, ' ') + '...' : 'term not in fact'));
      return;
    }
    Object.keys(v).forEach(function (k) {
      walk(v[k], { cat: ctx.cat || k, sub: ctx.sub });
    });
  }
  walk(data, { cat: top.cat });
}