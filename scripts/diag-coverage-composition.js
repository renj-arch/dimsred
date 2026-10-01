'use strict';
// Which of the question's terms are the evidence actually accounting for?
//
//   node scripts/diag-coverage-composition.js
//
// The MSME question reports coverage 100% with no MSME evidence. Coverage is
// 0.70 * termCov + 0.30 * dimCov, and both come out at 100%, so the number is
// arithmetically correct and factually useless. This shows why: it prints every
// term the score counted, and whether any sentence in the evidence contains it.
//
// The distinction the engine needs and does not have: a term is "covered" if a
// sentence contains it, but "micro", "medium" and "enterprises" are the only
// words that make this question an MSME question, and they appear in none of the
// nine sentences. The terms that ARE covered -- "india", "development",
// "government" -- would equally cover a question about any Indian ministry.
'use strict';
var fs = require('fs');
var path = require('path');
var ask = require('./lib/ask-core.js');
var ROOT = path.join(__dirname, '..');

var payload = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ask-index.json'), 'utf8'));
var nodes = payload.nodes.map(function (r) {
  return { id: r[0], name: r[1], type: r[2], cat: r[3], desc: r[4] };
});
var idx = ask.buildIndex({ nodes: nodes, links: payload.links });

var q = process.argv[2] ||
  "analyse the role of micro, small and medium enterprises in India's economic development";

var subject = ask.subjectOf(q);
var r = ask.retrieve(idx, q, 12);
var evidence = r.evidence || [];
var blob = evidence.map(function (e) { return ' ' + String(e.sentence).toLowerCase(); }).join('');

console.log('Q: ' + q);
console.log('coverage ' + Math.round(r.coverage * 100) + '%   termCov ' +
  Math.round((r.termCoverage || 0) * 100) + '%   dimCov ' +
  Math.round((r.dimensionCoverage || 0) * 100) + '%');
console.log('');

var analysis = r.analysis || {};
var terms = analysis.terms || {};
console.log('=== the candidate terms the score counted ===');
console.log('  covered    term            df        evidence contains it');
Object.keys(terms).forEach(function (t) {
  var present = blob.indexOf(String(t).toLowerCase()) !== -1;
  console.log('  ' + (present ? 'yes' : 'NO ') + '        ' + String(t).padEnd(15) +
    String(idx.df[t] || 0).padStart(7) + '   ' + (present ? '' : '<-- absent from every sentence'));
});

console.log('');
console.log('=== the subject words, and whether any sentence has them ===');
var subjWords = String(subject).toLowerCase().split(/[^a-z0-9]+/)
  .filter(function (w) { return w.length > 3; });
var distinguishing = [];
subjWords.forEach(function (w) {
  var present = blob.indexOf(w) !== -1;
  var df = idx.df[w] || 0;
  console.log('  ' + (present ? 'covered  ' : 'ABSENT   ') + w.padEnd(13) +
    'df=' + String(df).padStart(6) + '  in ' + subjWords.length + ' subject words');
  if (!present && df < 500) distinguishing.push(w);
});
console.log('');
console.log('=== what a gate would need ===');
console.log('  evidence sentences          ' + evidence.length);
console.log('  subject words absent from all evidence: ' +
  (subjWords.filter(function (w) { return blob.indexOf(w) === -1; }).join(', ') || '(none)'));
console.log('  of those, corpus-rare (df<500): ' + (distinguishing.join(', ') || '(none)'));
console.log('');
console.log('The question is about enterprises. "enterprises" appears in 0 of ' +
  evidence.length + ' quoted sentences, yet termCov is 100%, because termCov');
console.log('counts any term any sentence contains and "india"/"development"');
console.log('supply that on their own. A term that no sentence contains cannot');
console.log('be evidence for the subject, whatever else the sentence does contain.');