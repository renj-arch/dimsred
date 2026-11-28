// Why does the archive find "El Nino" but the evidence shards report it absent?
//
//   node scripts/diag-el-nino.js
//
// The archive search and the evidence path are reading different things, and both
// answers are locally correct. This isolates exactly where the disagreement lives,
// because the two possibilities have opposite fixes:
//
//   1. the text IS in a shard, and the entity table is missing the row
//   2. the text is NOT in any shard, and the builder dropped it
//
// Only the second is a bug in the build. If it is the first, the fix is a different
// entity name, not a different builder.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var QB = path.join(ROOT, 'data', 'ask-qb');
var qb = require(path.join(ROOT, 'scripts/lib/ask-qb.js'));
var H = require(path.join(ROOT, 'scripts/lib/build-ask-qb-buckets-hash.js'));

var TERMS = ['el nino', 'water mass', 'pelagic thresher'];
var raw = fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8');
var rows = raw.split('\n').filter(Boolean);

console.log('=== 1. entity table ===');
TERMS.forEach(function (t) {
  var startsSomewhere = rows.some(function (l) {
    return l.toLowerCase().indexOf(t) !== -1;
  });
  var ed = new qb.EntityDir().load(raw);
  console.log('  "' + t + '"');
  console.log('    substring present in table : ' + startsSomewhere);
  console.log('    lookup() result            : ' + JSON.stringify(ed.lookup(t)));
});

console.log('');
console.log('=== 2. rows in the table containing the term ===');
TERMS.forEach(function (t) {
  rows.forEach(function (l) {
    if (l.toLowerCase().indexOf(t) !== -1) {
      console.log('  "' + t + '" in: ' + l.slice(0, 88));
    }
  });
});

console.log('');
console.log('=== 3. is the TEXT present in any bucket shard? ===');
var hits = {};
TERMS.forEach(function (t) { hits[t] = []; });
var scanned = 0, withText = 0;
for (var b = 0; b < 512; b++) {
  var fp = path.join(QB, 'bucket', 'bucket.' + b + '.json');
  if (!fs.existsSync(fp)) continue;
  scanned++;
  var parsed = JSON.parse(fs.readFileSync(fp, 'utf8'));
  parsed.forEach(function (r) {
    var name = (r[0] || '').toLowerCase();
    var sents = (r[1] || []).join(' ').toLowerCase();
    TERMS.forEach(function (t) {
      if (sents.indexOf(t) !== -1) {
        withText++;
        if (hits[t].length < 3) hits[t].push({ entity: r[0], bucket: b, n: (r[1] || []).length });
      }
    });
    // Record whether the term is the entity NAME or only appears inside the text.
    TERMS.forEach(function (t) {
      if (name.indexOf(t) !== -1 && hits[t].indexOf(hits[t].length) === -1) {
        if (hits[t].length < 6 && !hits[t].some(function (x) { return x.entity === r[0]; })) {
          hits[t].push({ entity: r[0] + '  [NAME MATCH]', bucket: b, n: (r[1] || []).length });
        }
      }
    });
  });
}
console.log('  buckets scanned: ' + scanned);
TERMS.forEach(function (t) {
  console.log('  "' + t + '": ' + hits[t].length + ' row(s) with the text in a sentence');
  hits[t].forEach(function (h) {
    console.log('      bucket ' + h.bucket + '  entity "' + h.entity + '"  ' + h.n + ' sentences');
  });
});

console.log('');
console.log('=== 4. which bucket would the term hash to? ===');
TERMS.forEach(function (t) {
  var bi = H.bucketOf(t, 512);
  console.log('  "' + t + '" -> bucket ' + bi +
    (hits[t].length ? '  (text lives here, under a different entity name)'
                    : '  (no row in this bucket carries the text)'));
});

console.log('');
console.log('=== 5. how the builder names a row ===');
console.log('  The entity name in a shard is the record SUBJECT, not any noun in the');
console.log('  sentence. So "El Nino" can appear verbatim in a fact sentence while');
console.log('  remaining absent from the entity table, and the entity-anchored');
console.log('  lookup can never resolve it.');