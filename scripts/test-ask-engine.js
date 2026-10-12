// Test the ask engine against questions where the honest answer is known.
//
// The point of these cases is not that the engine returns something. It is that
// the engine's *refusals* are correct, because a retrieval engine that answers
// a question its corpus cannot support is worse than no engine: the output looks
// authoritative and the reader cannot tell it was assembled from fragments.
'use strict';
var fs = require('fs');
var path = require('path');
var ask = require('../scripts/lib/ask-core.js');

var payload = require('./lib/ask-index-load.js').read(path.resolve(__dirname, '..'));
var nodes = payload.nodes.map(function (r) { return { id: r[0], name: r[1], type: r[2], cat: r[3], desc: r[4] }; });
var idx = ask.buildIndex({ nodes: nodes, links: payload.links, thin: payload.thin, thinWhy: payload.thinWhy });

var CASES = [
  {
    q: 'Examine whether the constitutional office of the Lok Sabha Speaker has become vulnerable to partisan politics under the current anti-defection regime. What institutional changes are required to ensure the neutrality of the Lok Sabha Speaker in managing a polarised House?',
    expect: 'refuse',
    why: 'The corpus has no node for the Speaker as an institution, and no node for the Tenth Schedule, Kihoto Hollohan or Keisham Meghachandra Singh. Any answer here would be reconstructed from nothing.'
  },
  {
    q: 'What is the anti-defection law in India?',
    expect: 'either',
    why: 'There is a node literally named "Anti-defection law (India)", but its desc is "Paragraph-7: Bar of jurisdiction of courts." which the gate must reject as a fragment.'
  },
  {
    q: 'Discuss the environmental impact of the Bhopal gas tragedy.',
    expect: 'either',
    why: 'Bhopal is a major UPSC topic; the corpus should hold quotable sentences. If it refuses, that is a real coverage gap worth knowing.'
  },
  {
    q: 'What were the aims and outcomes of the Indian National Congress at its founding in 1885?',
    expect: 'either',
    why: 'Well-covered historical node; a working engine should return grounded quotes with source links.'
  }
];

var fails = 0;
CASES.forEach(function (c, n) {
  var res = ask.retrieve(idx, c.q, 12);
  var out = ask.compose(c.q, res);
  var verdict = out.refused ? 'REFUSED' : 'ANSWERED';
  console.log('\n───────── CASE ' + (n + 1) + ' ─────────');
  console.log('Q: ' + c.q.slice(0, 110) + (c.q.length > 110 ? '…' : ''));
  console.log('expected: ' + c.expect + '   actual: ' + verdict +
    '   coverage: ' + (res.coverage * 100).toFixed(0) + '%' +
    '   type: ' + res.analysis.type +
    '   ontology: [' + res.analysis.ontologyHits.join(', ') + ']');
  if (res.reason) console.log('reason: ' + res.reason);
  console.log('why this case exists: ' + c.why);
  if (out.refused) {
    console.log('ANSWER SHOWN: ' + out.answer.split('\n')[0]);
  } else {
    console.log('evidence (' + out.sources.length + ' sources):');
    res.evidence.slice(0, 5).forEach(function (e) {
      console.log('   • [' + e.node.name + '] ' + e.sentence.slice(0, 150));
    });
    if (out.unmetDimensions && out.unmetDimensions.length) {
      console.log('unmet dimensions: ' + out.unmetDimensions.join(', '));
    }
  }
  if (c.expect === 'refuse' && !out.refused) {
    fails++;
    console.log('*** TEST FAILURE: should have refused but produced an answer.');
  }
});

console.log('\n=== SUMMARY ===');
console.log(fails ? 'FAILED: ' + fails + ' case(s) answered without support' : 'all expectations met');
process.exit(fails ? 1 : 0);
