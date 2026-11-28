'use strict';
// Which mains topics does the router fail to recognise?
//
//   node scripts/diag-route-gaps.js [topN]
//
// The first version of this ranked unrouted entities by their entities.tsv
// weight and was useless: every weight there was 134 (a per-file record count
// that saturates), so "heaviest" just meant alphabetical, and the top of the
// list was papal elections and US regimental units -- real corpus rows that no
// mains syllabus expects to route.
//
// The right axis is the question, not the entity. This drives real mains
// questions through routeFor() and reports the ones that come back null, plus
// the vocabulary those questions use that the router has never seen. That is
// the actionable list: each row is a topic a candidate actually gets asked,
// with no framing, no fit/strain expansion, and no route to fall back on.
var fs = require('fs');
var path = require('path');
var ask = require('./lib/ask-core.js');
var ROOT = path.join(__dirname, '..');
var TOP = +(process.argv[2] || 30);

// Real questions from the repo, not invented ones.
var mq = require(path.join(ROOT, 'data', 'mains-questions.json'));
var questions = Array.isArray(mq) ? mq : (mq.questions || []);

console.log('=== routing the repo\'s mains questions ===');
console.log('router knows ' + Object.keys(ask.conceptRoutes).length + ' concepts');
console.log('questions    ' + questions.length);
console.log('');

var unrouted = [];
questions.forEach(function (q) {
  var text = q.question || '';
  var subj = typeof ask.subjectOf === 'function' ? ask.subjectOf(text) : null;
  var route = typeof ask.routeFor === 'function' ? ask.routeFor(text) : null;
  var line = {
    id: q.id,
    paper: q.paper || '?',
    topic: q.topic || '(no topic)',
    subject: subj,
    route: route && route.key ? route.key : null
  };
  if (!line.route) unrouted.push(line);
  console.log((line.route ? '  routed   ' : '  NO ROUTE ') +
    (line.route || '-').padEnd(26) + ' ' + line.subject + '   [' + line.id + ']');
});

console.log('');
console.log('=== summary ===');
console.log('  routed    ' + (questions.length - unrouted.length) + ' / ' + questions.length);
console.log('  unrouted  ' + unrouted.length);
if (unrouted.length) {
  console.log('');
  console.log('=== unrouted topics, for the route table ===');
  unrouted.slice(0, TOP).forEach(function (r) {
    console.log('  ' + r.paper.padEnd(5) + (r.subject || '(no subject)'));
    console.log('        topic: ' + r.topic);
  });
}

// Which words these questions lean on that no route mentions. A word appearing
// in an unrouted question and in no fit/strain list is the candidate seed.
console.log('');
console.log('=== vocabulary no route mentions (unrouted questions only) ===');
var routes = ask.conceptRoutes;
var known = Object.create(null);
Object.keys(routes).forEach(function (k) {
  [].concat(routes[k].fit || [], routes[k].strain || []).forEach(function (p) {
    known[String(p).toLowerCase()] = 1;
  });
  known[k.toLowerCase()] = 1;
});
var STOP = /^(the|a|an|of|and|or|in|to|for|on|as|is|are|be|by|with|that|this|it|its|at|from|what|which|how|why|who|when|where|does|do|you|your|if|not|no|but|has|have|had|will|would|can|could|should|they|them|their|there|any|all|one|two|they|about|into|over|under|more|most|other|such|only|own|same|so|than|too|very|can|just|should|now|may|may)$/;
var counts = Object.create(null);
unrouted.forEach(function (r) {
  var q = questions.filter(function (x) { return x.id === r.id; })[0] || {};
  String((q.question || '') + ' ' + r.topic).toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .forEach(function (w) {
      if (w.length < 5 || STOP.test(w) || known[w]) return;
      counts[w] = (counts[w] || 0) + 1;
    });
});
var seeds = Object.keys(counts).filter(function (w) { return counts[w] > 0; })
  .sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
if (!seeds.length) console.log('  (none)');
seeds.slice(0, TOP).forEach(function (w) {
  console.log('  ' + String(counts[w]).padStart(3) + '  ' + w);
});