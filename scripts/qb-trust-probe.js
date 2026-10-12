// Corpus trust probe: how much of the source material is reliable enough to
// build a mains answer on?
//
//   node scripts/qb-trust-probe.js
//
// WHY: retrieval quality is capped by corpus quality. The BM25 audit reported
// 11/12 headings "covered", but several matches were nonsense -- "SAGAR" matched
// an Indus-basin place name, "maritime domain awareness" matched a domain
// squatter in .ly. Before tuning a ranker, it is worth knowing whether the
// sentences themselves are usable. A corpus carrying recent unsourced political
// claims cannot support a cited answer no matter how well it is ranked.
//
// Sentences printed here are verbatim slices of a record's `fact`, so the
// wording, the date and the source field can be judged directly.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');

function splitSentences(text) {
  return String(text || '').split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}

var files = ['defence-security.json', 'defence-security-2.json', 'defence-security-3.json',
  'international-relations.json', 'india-international-relations.json',
  'disaster-management.json', 'indian-society.json'];

// The entity the audit surfaced as suspicious.
var TARGET = 'strait of hormuz';

var bySource = {};
var byYear = {};
var byType = {};
var total = 0, withFact = 0;
var targets = [];

files.forEach(function (f) {
  var p = path.join(ROOT, 'data', 'questions', f);
  if (!fs.existsSync(p)) { console.log('  (missing) ' + f); return; }
  var parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
  Object.keys(parsed).forEach(function (cat) {
    var subs = parsed[cat] && parsed[cat].subSubjects;
    if (!subs || typeof subs !== 'object') return;
    Object.keys(subs).forEach(function (ss) {
      var arr = subs[ss];
      if (!Array.isArray(arr)) return;
      arr.forEach(function (rec) {
        if (!rec) return;
        total++;
        if (typeof rec.fact === 'string' && rec.fact.trim()) withFact++;
        bySource[rec.source || '(none)'] = (bySource[rec.source || '(none)'] || 0) + 1;
        byType[rec.type || '(none)'] = (byType[rec.type || '(none)'] || 0) + 1;
        var y = String(rec.pubDate || '').slice(0, 4);
        if (y) byYear[y] = (byYear[y] || 0) + 1;
        if (ss.toLowerCase().indexOf(TARGET) !== -1 || cat.toLowerCase().indexOf(TARGET) !== -1) {
          targets.push({ sub: ss, cat: cat, rec: rec });
        }
      });
    });
  });
});

console.log('=== corpus provenance (files scanned: ' + files.length + ') ===');
console.log('  records=' + total + '  with `fact`=' + withFact + '\n');
console.log('  source:');
Object.keys(bySource).sort(function (a, b) { return bySource[b] - bySource[a]; }).slice(0, 10)
  .forEach(function (k) { console.log('    ' + String(k).padEnd(14) + bySource[k]); });
console.log('  type:');
Object.keys(byType).sort(function (a, b) { return byType[b] - byType[a]; }).slice(0, 6)
  .forEach(function (k) { console.log('    ' + String(k).padEnd(14) + byType[k]); });
console.log('  pubDate year:');
Object.keys(byYear).sort().slice(-8)
  .forEach(function (k) { console.log('    ' + String(k).padEnd(14) + byYear[k]); });
console.log('');

console.log('=== records filed under a "' + TARGET + '" subSubject: ' + targets.length + ' ===');
console.log('');
targets.slice(0, 6).forEach(function (t, i) {
  var r = t.rec;
  console.log('  [' + (i + 1) + '] subSubject: ' + t.sub + '   category: ' + t.cat);
  console.log('      source  : ' + r.source + '    pubDate: ' + r.pubDate + '    type: ' + r.type);
  console.log('      question: ' + String(r.question || '').slice(0, 160));
  console.log('      answer  : ' + String(r.answer || '').slice(0, 120));
  console.log('      fact    : ' + String(r.fact || '').slice(0, 420));
  console.log('');
});
if (targets.length > 6) console.log('  ... and ' + (targets.length - 6) + ' more\n');

console.log('=== what a question derived from one of these looks like ===');
if (targets.length) {
  var r = targets[0].rec;
  splitSentences(r.fact).slice(0, 3).forEach(function (s, i) {
    console.log('  ' + (i + 1) + '. ' + s.slice(0, 220));
  });
}
