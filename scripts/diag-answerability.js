'use strict';
// Why did a question retrieve nine irrelevant entities at "100% coverage"?
//
//   node scripts/diag-answerability.js "analyse the role of micro, small and
//   medium enterprises in India's economic development"
//
// Prints the whole decision chain, so an over-claim can be attributed to a
// specific gate rather than argued about. For each step it shows what the
// engine saw and which threshold it cleared.
//
// The MSME question is the worked example because it is a clean failure: every
// gate passed and nothing about the answer was about MSMEs.
var fs = require('fs');
var path = require('path');
var ask = require('./lib/ask-core.js');
var ROOT = path.join(__dirname, '..');

var q = process.argv[2] ||
  "analyse the role of micro, small and medium enterprises in India's economic development";

var payload = require('./lib/ask-index-load.js').read(ROOT);
var nodes = payload.nodes.map(function (r) {
  return { id: r[0], name: r[1], type: r[2], cat: r[3], desc: r[4] };
});
var idx = ask.buildIndex({ nodes: nodes, links: payload.links, thin: payload.thin, thinWhy: payload.thinWhy });

console.log('Q: ' + q);
console.log('');

var subject = ask.subjectOf(q);
var route = ask.routeFor(subject, q);
console.log('--- routing ---');
console.log('  subject        ' + JSON.stringify(subject));
console.log('  route          ' + (route ? route.key +
  (route.viaVocabulary ? ' (via vocabulary)' : ' (by name)') : 'null'));
console.log('  MIN_COVERAGE   ' + ask.MIN_COVERAGE);
console.log('  MIN_EVIDENCE   ' + ask.MIN_EVIDENCE);
console.log('');

var r = ask.retrieve(idx, q, 12);
console.log('--- gate decision ---');
console.log('  refused        ' + r.refused);
console.log('  reason         ' + (r.reason || '(answered)'));
console.log('  coverage       ' + Math.round(r.coverage * 100) + '%');
console.log('  termCoverage   ' + Math.round((r.termCoverage || 0) * 100) + '%');
console.log('  dimCoverage    ' + Math.round((r.dimensionCoverage || 0) * 100) + '%');
console.log('  subjectMatched ' + r.subjectMatched);
console.log('  evidence       ' + r.evidence.length + ' sentence(s)');
console.log('');

// The part that matters: does any evidence mention the subject at all? The gate
// checks term coverage and evidence count, never whether the sentences are about
// the thing asked, so a gate can pass on sentences that share vocabulary and
// nothing else.
console.log('--- is any evidence actually about the subject? ---');
var subjWords = String(subject).toLowerCase().split(/[^a-z0-9]+/)
  .filter(function (w) { return w.length > 3; });
console.log('  subject words  ' + JSON.stringify(subjWords));
var related = r.evidence.filter(function (e) {
  var s = String(e.sentence).toLowerCase();
  return subjWords.some(function (w) { return s.indexOf(w) !== -1; });
});
console.log('  evidence naming a subject word: ' + related.length + ' of ' + r.evidence.length);
related.slice(0, 5).forEach(function (e) {
  console.log('    - ' + e.sentence.slice(0, 100));
});
console.log('');

console.log('--- what got answered with ---');
(r.evidence || []).slice(0, 9).forEach(function (e, i) {
  var hits = subjWords.filter(function (w) {
    return String(e.sentence).toLowerCase().indexOf(w) !== -1;
  });
  console.log('  ' + (i + 1) + '. ' + (e.entity || '(no entity)') +
    (hits.length ? '  [' + hits.join(', ') + ']' : '  [no subject word]'));
  console.log('     ' + String(e.sentence).slice(0, 110));
});
console.log('');
console.log('Read: the gate is satisfied by term overlap and a sentence count.');
console.log('Coverage measures how much of the question\'s vocabulary the evidence');
console.log('accounts for. It cannot distinguish "about MSMEs" from "shares words');
console.log('with a question about MSMEs", so a wrong answer and a right one score');
console.log('the same. That is the bug, and no threshold change fixes it.');