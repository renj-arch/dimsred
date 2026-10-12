// Probe: could the corpus answer the ocean-currents / water-masses question?
//
//   node scripts/diag-ocean-coverage.js <repo-root>
//
// Checks the two things that decide the answer: whether the entity table resolves
// the question's terms, and whether the shards that would be fetched actually
// contain sentences for them. Resolution without sentences is a coverage hole,
// and sentences without resolution are unreachable.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = process.argv[2] || path.join(__dirname, '..');
var QB = path.join(ROOT, 'data/ask-qb');

var TERMS = [
  'ocean current', 'ocean currents', 'water mass', 'water masses',
  'humboldt current', 'peru current', 'gulf stream', 'upwelling',
  'antarctic bottom water', 'north atlantic deep water', 'coral reef',
  'antarctic circumpolar current', 'somali current', 'canary current',
  'kuroshio', 'oyashio', 'labrador current', 'agulhas current', 'el nino'
];

var entityDir = new (require(path.join(ROOT, 'scripts/lib/ask-qb.js')).EntityDir)()
  .load(fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8'));

function loadShard(ci) {
  var p = path.join(QB, 'ask-qb.' + ci + '.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

console.log('=== term resolution (entity table) ===');
var resolved = {};
TERMS.forEach(function (t) {
  var ids = entityDir.lookup(t);
  resolved[t] = ids || null;
  var note = '';
  if (ids) {
    var present = ids.filter(function (ci) { return !!loadShard(ci); }).length;
    note = present ? ' (' + present + '/' + ids.length + ' shard(s) on disk)'
                    : ' (NO shard on disk)';
  }
  console.log('  ' + (t + '                              ').slice(0, 32) +
    (ids ? 'resolves -> ' + JSON.stringify(ids) + note : 'NO EXACT ENTITY') +
    (ids ? '' : '   <-- gap'));
});

console.log('');
console.log('=== what the fetched shards actually contain ===');
var shards = {};
Object.keys(resolved).forEach(function (t) {
  (resolved[t] || []).forEach(function (ci) { shards[ci] = (shards[ci] || 0) + 1; });
});
var cats = {};
Object.keys(shards).forEach(function (ci) {
  var m = null;
  try { m = JSON.parse(fs.readFileSync(path.join(QB, 'manifest.json'), 'utf8')); } catch (e) {}
  cats[ci] = (m && m.categories[ci] ? m.categories[ci].name : '?');
});
Object.keys(shards).sort(function (a, b) { return shards[b] - shards[a]; }).forEach(function (ci) {
  var rows = loadShard(ci);
  if (!rows) {
    console.log('  shard ' + ci + ' (' + cats[ci] + '): MISSING from disk, ' + shards[ci] + ' term(s) point here');
    return;
  }
  console.log('  shard ' + ci + ' (' + cats[ci] + '): ' + rows.length + ' entities, ' +
    rows.reduce(function (a, r) { return a + r[1].length; }, 0) + ' sentences');
  var hits = rows.filter(function (r) {
    return TERMS.some(function (t) {
      return (r[0] || '').toLowerCase() === t;
    });
  });
  hits.forEach(function (r) {
    console.log('      ' + r[0] + ': ' + r[1].length + ' sentences');
    console.log('        "' + String(r[1][0]).slice(0, 88) + '"');
  });
  // Also surface near-misses, because a resolved-but-absent entity is often just
  // named slightly differently in the corpus.
  var near = rows.filter(function (r) {
    var n = (r[0] || '').toLowerCase();
    return /current|water mass|upwelling|thermohaline|conveyor/.test(n);
  }).map(function (r) { return r[0]; });
  if (near.length) console.log('      related names present: ' + JSON.stringify(near.slice(0, 14)));
});

console.log('');
console.log('=== verdict inputs ===');
var nRes = TERMS.filter(function (t) { return resolved[t]; }).length;
var nDisk = TERMS.filter(function (t) {
  return resolved[t] && resolved[t].some(function (ci) { return !!loadShard(ci); });
}).length;
console.log('  terms resolving            : ' + nRes + '/' + TERMS.length);
console.log('  terms with a shard on disk : ' + nDisk + '/' + TERMS.length);
console.log('  terms unreachable          : ' + TERMS.filter(function (t) { return !resolved[t]; }).join(', '));
console.log('  terms whose shard is absent: ' + TERMS.filter(function (t) {
  return resolved[t] && !resolved[t].some(function (ci) { return !!loadShard(ci); });
}).join(', '));