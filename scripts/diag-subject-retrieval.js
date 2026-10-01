'use strict';
// Does the node that title-matches the subject actually get retrieved?
//
//   node scripts/diag-subject-retrieval.js
//
// The MSME question reports subjectMatched=true, so the gate believes the
// subject is in the corpus. The corpus really does have a node for it:
// "Ministry of Micro, Small and Medium Enterprises". But that node is not among
// the retrieved candidates, so the nine quoted sentences come from nodes whose
// only relationship to the subject is shared vocabulary.
//
// That is the specific mechanism behind the over-claim: the gate confirms the
// subject exists somewhere in the index, then answers from sentences that have
// nothing to do with it. Existence and retrieval are separate facts and only the
// first one is checked.
var fs = require('fs');
var path = require('path');
var ask = require('./lib/ask-core.js');
var ROOT = path.join(__dirname, '..');

var payload = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ask-index.json'), 'utf8'));
var nodes = payload.nodes.map(function (r) {
  return { id: r[0], name: r[1], type: r[2], cat: r[3], desc: r[4] };
});
var idx = ask.buildIndex({ nodes: nodes, links: payload.links });

var CASES = [
  "analyse the role of micro, small and medium enterprises in India's economic development",
  'Discuss the environmental impact of the Bhopal gas tragedy.',
  'What is the anti-defection law in India?'
];

CASES.forEach(function (q) {
  console.log('Q: ' + q);
  var subject = ask.subjectOf(q);
  var r = ask.retrieve(idx, q, 12);
  console.log('  subject        ' + JSON.stringify(subject));
  console.log('  subjectMatched ' + r.subjectMatched);
  console.log('  answered       ' + !r.refused);

  // Which corpus nodes actually title-match this subject?
  var matched = [];
  idx.nodes.forEach(function (n) {
    if (/Micro, Small/i.test(n.node.name) || /Ministry of Housing/i.test(n.node.name)) {
      matched.push(n.node.name);
    }
  });
  var candNames = r.candidates.map(function (c) { return c.name; });
  var subjectNode = candNames.filter(function (n) { return /Micro, Small/i.test(n); });
  console.log('  MSME ministry retrieved?  ' + (subjectNode.length ? subjectNode.join(' | ') : 'NO'));
  console.log('  candidates (' + candNames.length + ')');
  candNames.slice(0, 6).forEach(function (n) { console.log('     - ' + n); });
  console.log('');
});

// Across every subject that title-matches, how often does the matching node make
// it into the candidate list? A low rate here is the generalisation of the MSME
// failure, and it is worth knowing before any gate is tuned.
console.log('=== does the title-matching node reach the candidate list? ===');
var probes = [
  ['Ministry of Micro, Small and Medium Enterprises', 'Ministry of Micro, Small'],
  ['Ministry of Housing and Urban Poverty Alleviation', 'Ministry of Housing'],
  ['Electricity sector in India', 'Electricity sector']
];
probes.forEach(function (p) {
  var q = 'Analyse the role of ' + p[0] + ' in India.';
  var r = ask.retrieve(idx, q, 12);
  var names = r.candidates.map(function (c) { return c.name; });
  var hit = names.filter(function (n) { return n.indexOf(p[1]) !== -1; });
  console.log('  ' + (hit.length ? 'retrieved ' : 'MISSING  ') + p[0].slice(0, 44));
  if (r.refused) console.log('      refused: ' + String(r.reason).slice(0, 90));
});