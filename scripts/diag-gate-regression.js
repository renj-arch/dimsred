'use strict';
// Does the subject-term gate refuse questions the corpus can actually answer?
//
//   node scripts/diag-gate-regression.js
//
// The new gate refuses when fewer than half of the subject's rare terms appear in
// the evidence. A gate that only ever refuses is useless, so this runs a spread
// of questions whose honest answers are known -- entity lookups, broad topics,
// and the mains set -- and reports which side of the gate each falls on.
//
// The expectation is not that everything passes. Refusing a question the corpus
// cannot support is the correct outcome and this engine exists to do it. What
// would be a bug is refusing one whose evidence is right there.
var fs = require('fs');
var path = require('path');
var ask = require('./lib/ask-core.js');
var ROOT = path.join(__dirname, '..');

var payload = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ask-index.json'), 'utf8'));
var nodes = payload.nodes.map(function (r) {
  return { id: r[0], name: r[1], type: r[2], cat: r[3], desc: r[4] };
});
var idx = ask.buildIndex({ nodes: nodes, links: payload.links });

// Each case says whether the corpus is expected to hold quotable material, so a
// refusal can be read as a corpus gap or a gate bug without guessing.
var CASES = [
  ['Who was Dadabhai Naoroji?', true, 'single named entity'],
  ['What is the Indian National Congress?', true, 'well-known entity'],
  ['Discuss the environmental impact of the Bhopal gas tragedy.', true,
    'the test file expects an answer, but its own evidence was unrelated'],
  ['Explain the role of the Comptroller and Auditor General of India.', true,
    'named constitutional office'],
  ['What is the Green Revolution?', true, 'named historical development'],
  ['Discuss the making of the Indian constitution.', true, 'broad but well-cored topic'],
  ['What is the role of science and technology in India?', true, 'broad topic, route exists'],
  ['Analyse the role of micro, small and medium enterprises in India economic development.', false,
    'the reported over-claim: no evidence mentions enterprises'],
  ['Examine the constitutional office of the Lok Sabha Speaker.', false,
    'known refusal, corpus has no node for the office'],
  ['What is the anti-defection law in India?', false, 'known thin refusal']
];

console.log('=== expected answers vs the gate ===');
console.log('');
var disagree = [];
CASES.forEach(function (c) {
  var q = c[0], shouldAnswer = c[1], note = c[2];
  var r = ask.retrieve(idx, q, 12);
  var answered = !r.refused;
  var ok = answered === shouldAnswer;
  if (!ok) disagree.push({ q: q, shouldAnswer: shouldAnswer, answered: answered, note: note, r: r });
  console.log((ok ? '  ok    ' : '  CHECK ') +
    (answered ? 'answered' : 'refused ').padEnd(9) +
    ' expected ' + (shouldAnswer ? 'answer ' : 'refuse ') +
    '  ' + q.slice(0, 54));
  if (!ok) console.log('        ' + String(r.reason || '').slice(0, 150));
});

console.log('');
console.log('=== summary ===');
console.log('  cases           ' + CASES.length);
console.log('  as expected     ' + (CASES.length - disagree.length));
console.log('  worth reading   ' + disagree.length);
if (disagree.length) {
  console.log('');
  console.log('For each disagreement, the question is whether the corpus holds the');
  console.log('material or the gate is still too strict. That is a judgement about');
  console.log('the corpus, not something this script can decide.');
}