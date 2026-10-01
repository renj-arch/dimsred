// Test the proposed water-stress outline exactly as written.
//
//   node scripts/diag-water-stress.js <repo-root>
//
// Checks three things the proposal assumes but does not verify: that pickOutline
// matches the question, that every claim term resolves to an entity, and that the
// resolved entity has enough sentences to support a heading.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = process.argv[2] || path.join(__dirname, '..');
var QB = path.join(ROOT, 'data/ask-qb');

var OUTLINE = [
  ['1. Definition', 'water stress', ['water scarcity', 'water crisis']],
  ['2. Regional patterns', 'regional water stress', ['state-wise water stress']],
  ['3. Causes', 'causes of water stress', ['groundwater depletion', 'monsoon variability']]
];

var QUESTION = 'What is water stress? How and why does it differ regionally in India?';

console.log('=== 1. does pickOutline match this question? ===');
// Mirrors pickOutline() in ask.html.
var KEYS = {
  'indian ocean region national security': 1,
  'water stress regional distribution': 1
};
function pickOutline(q) {
  var low = q.toLowerCase();
  var best = null, bestScore = 0;
  Object.keys(KEYS).forEach(function (k) {
    var words = k.split(' ').filter(function (w) { return w.length > 3; });
    var hits = words.filter(function (w) { return low.indexOf(w) !== -1; }).length;
    var score = words.length ? hits / words.length : 0;
    if (score > bestScore) { bestScore = score; best = k; }
  });
  if (!best || bestScore < 0.4) return null;
  return { key: best, score: bestScore };
}
var pick = pickOutline(QUESTION);
if (!pick) {
  console.log('  NO MATCH -> doAsk() falls through to the navigational path.');
  console.log('  The outline below would never be consulted for this question.');
} else {
  console.log('  matched "' + pick.key + '" at ' + (pick.score * 100).toFixed(0) + '%');
}

console.log('');
console.log('=== 2. does every claim term resolve? ===');
var qb = require(path.join(ROOT, 'scripts/lib/ask-qb.js'));
var ed = new qb.EntityDir().load(fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8'));
var need = {};
OUTLINE.forEach(function (p) {
  [p[1]].concat(p[2] || []).forEach(function (t) {
    var ids = ed.lookup(t);
    console.log('  ' + (t + '                              ').slice(0, 32) +
      (ids ? 'resolves -> ' + JSON.stringify(ids) : 'NO EXACT ENTITY'));
    (ids || []).forEach(function (ci) { need[ci] = 1; });
  });
});

console.log('');
console.log('=== 3. sentence depth of each resolved entity (minSupport = 2) ===');
var manifest = JSON.parse(fs.readFileSync(path.join(QB, 'manifest.json'), 'utf8'));
var cache = {};
function shard(ci) {
  if (!(ci in cache)) {
    var p = path.join(QB, 'ask-qb.' + ci + '.json');
    cache[ci] = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
  }
  return cache[ci];
}
OUTLINE.forEach(function (p) {
  [p[1]].concat(p[2] || []).forEach(function (t) {
    (ed.lookup(t) || []).forEach(function (ci) {
      var rows = shard(ci);
      if (!rows) { console.log('  ' + t.padEnd(30) + ' shard ' + ci + ' MISSING'); return; }
      var hit = rows.filter(function (r) { return (r[0] || '').toLowerCase() === t.toLowerCase(); })[0];
      var n = hit ? hit[1].length : 0;
      console.log('  ' + t.padEnd(30) + ' ' + String(n).padStart(3) + ' sentences  ' +
        (n >= 2 ? '-> ANSWERED' : n === 1 ? '-> too thin' : '-> entity row missing'));
      if (n >= 2) console.log('        "' + String(hit[1][0]).slice(0, 100) + '"');
    });
  });
});

console.log('');
console.log('=== 4. verdict ===');
var unresolved = [];
OUTLINE.forEach(function (p) {
  if (!ed.lookup(p[1])) unresolved.push(p[1] + ' (no alternate resolves either)' ||
    ([p[1]].concat(p[2] || []).some(function (t) { return ed.lookup(t); }) ? '' : ''));
});
OUTLINE.forEach(function (p) {
  var anyTerm = [p[1]].concat(p[2] || []).some(function (t) { return ed.lookup(t); });
  var anyDeep = [p[1]].concat(p[2] || []).some(function (t) {
    return (ed.lookup(t) || []).some(function (ci) {
      var rows = shard(ci);
      if (!rows) return false;
      var hit = rows.filter(function (r) { return (r[0] || '').toLowerCase() === t.toLowerCase(); })[0];
      return hit && hit[1].length >= 2;
    });
  });
  console.log('  ' + p[0].padEnd(20) +
    (anyDeep ? 'would ANSWER' : anyTerm ? 'resolves but TOO THIN' : 'ABSENT from corpus'));
});