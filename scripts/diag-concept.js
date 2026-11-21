'use strict';
// Is a concept routed, and does the corpus actually support it?
//
//   node scripts/diag-concept.js "scientific temper"
//
// Answers three separate things that are easy to conflate:
//   1. Does the router know the concept?
//   2. Does the corpus contain sentences about it?
//   3. Does an entity row exist for it?
//
// A concept can pass (1) and fail (3), which is the case worth knowing about:
// routing resolves the question to a category, but retrieval is anchored to
// entity names, so a routed concept with no entity row quotes nothing.
var fs = require('fs');
var path = require('path');
var ask = require('./lib/ask-core.js');
var ROOT = path.join(__dirname, '..');
var QB = path.join(ROOT, 'data', 'ask-qb');

var terms = process.argv.slice(2);
if (!terms.length) terms = ['scientific temper'];

// conceptRoutes is the table itself, not a getter.
var routes = ask.conceptRoutes || {};
var routeKeys = Object.keys(routes);
console.log('router knows ' + routeKeys.length + ' concepts');
console.log('');

// Entity table, so reachability is a measurement not a guess.
var tsv = fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8');
function entityRows(t) {
  return tsv.split('\n').filter(function (l) {
    var i = l.indexOf('\t');
    var n = (i < 0 ? l : l.slice(0, i)).toLowerCase();
    return n.indexOf(t) !== -1;
  });
}

terms.forEach(function (t) {
  var q = t.toLowerCase();
  console.log('=== ' + t + ' ===');

  var direct = routeKeys.filter(function (k) { return k === q; });
  var related = routeKeys.filter(function (k) {
    return k !== q && (k.indexOf(q) !== -1 || q.indexOf(k) !== -1);
  });
  console.log('  router:    ' + (direct.length ? 'exact route "' + direct[0] + '"'
    : related.length ? 'related routes: ' + related.slice(0, 6).join(' | ')
    : 'NO ROUTE'));
  if (direct.length) {
    var r = routes[direct[0]];
    console.log('              fit: ' + JSON.stringify(r.fit || []).slice(0, 200));
    if (r.strain) console.log('              strain: ' + JSON.stringify(r.strain).slice(0, 200));
  }

  var rows = entityRows(q);
  console.log('  entities:  ' + (rows.length ? rows.length + ' row(s)'
    : 'NO ENTITY ROW -- retrieval cannot anchor here'));

  // Corpus presence: does the phrase index know the phrase?
  var H = require('./lib/build-ask-qb-buckets-hash.js');
  var shard = path.join(QB, 'phrase', 'phrase.' + H.bucketOf(q, 512) + '.json');
  if (fs.existsSync(shard)) {
    var idx = JSON.parse(fs.readFileSync(shard, 'utf8'));
    var hit = idx[q];
    console.log('  phrase ix: ' + (hit ? 'df=' + hit.d + ' in ' + hit.b.length +
      ' buckets, e.g. ' + (hit.e || []).slice(0, 2).join(' | ') : 'phrase absent'));
  } else {
    console.log('  phrase ix: shard not deployed');
  }
  console.log('');
});

// What routes exist at all, so a gap is visible next to what is covered.
console.log('=== all routes ===');
var sorted = routeKeys.slice().sort();
for (var i = 0; i < sorted.length; i += 4) {
  console.log('  ' + sorted.slice(i, i + 4).map(function (s) { return s.padEnd(28); }).join(''));
}