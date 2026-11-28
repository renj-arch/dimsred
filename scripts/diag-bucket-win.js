// Measure the fetch win from entity buckets vs category shards.
//
//   node scripts/diag-bucket-win.js <repo-root>
//
// Runs the same outlines through both schemes and reports bytes transferred,
// because the entire argument for buckets is that a question downloads less. If
// buckets did not reduce transfer, they would be pure added complexity.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = process.argv[2] || path.join(__dirname, '..');
var QB = path.join(ROOT, 'data/ask-qb');
var manifest = JSON.parse(fs.readFileSync(path.join(QB, 'manifest.json'), 'utf8'));
var buckets = JSON.parse(fs.readFileSync(path.join(QB, 'bucket', 'buckets.json'), 'utf8'));
var ents = fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8');
var qb = require(path.join(ROOT, 'scripts/lib/ask-qb.js'));
var ed = new qb.EntityDir().load(ents);
// The bucket hash lives in the builder, which is safe to require because main()
// only runs when it is the entry module.
var B = require(path.join(ROOT, 'scripts/lib/build-ask-qb-buckets-hash.js'));

var byBucket = {};
buckets.buckets.forEach(function (b) { byBucket[b.bucket] = b; });

var QUESTIONS = [
  ['oceanography: currents vs water masses', [
    ['1. Current', 'ocean current', []],
    ['2. Gulf Stream', 'gulf stream', []],
    ['3. Canary', 'canary current', []],
    ['4. Upwelling', 'upwelling', []],
    ['5. AABW', 'antarctic bottom water', []],
    ['6. Reefs', 'coral reef', []],
    ['7. ACC', 'antarctic circumpolar current', []],
    ['8. Humboldt', 'humboldt current', []],
    ['9. El Nino', 'el nino', []],
    ['10. Water mass', 'water mass', []]
  ]],
  ['water stress in India', [
    ['1. Definition', 'water stress', ['water scarcity']],
    ['2. Regional', 'regional water stress', []],
    ['3. Causes', 'causes of water stress', ['groundwater depletion']],
    ['4. Drought', 'drought', []],
    ['5. Irrigation', 'irrigation', []],
    ['6. Harvesting', 'rainwater harvesting', []]
  ]],
  ['federalism', [
    ['1. Sixth Schedule', 'sixth schedule', []],
    ['2. Reorganisation', 'linguistic reorganisation', []],
    ['3. Article 370', 'article 370', []],
    ['4. Districts', 'autonomous district', []]
  ]]
];

var totalCat = 0, totalB = 0;
console.log('bucket scheme: ' + buckets.bucketCount + ' buckets, avg ' +
  (buckets.buckets.reduce(function (a, b) { return a + b.bytes; }, 0) /
   buckets.buckets.length / 1024).toFixed(0) + ' KB, max ' +
  (buckets.buckets.reduce(function (a, b) { return Math.max(a, b.bytes); }, 0) / 1024).toFixed(0) + ' KB');
console.log('');

QUESTIONS.forEach(function (q) {
  var catIds = {}, catBytes = 0, bucketIds = {}, bucketBytes = 0;
  q[1].forEach(function (p) {
    [p[1]].concat(p[2] || []).forEach(function (t) {
      var ids = ed.lookup(t);
      if (ids) {
        ids.forEach(function (ci) {
          catIds[ci] = 1;
          if (manifest.categories[ci]) catBytes += manifest.categories[ci].bytes || 0;
        });
      }
      // The bucket is computed from the query term itself. This is the property
      // that makes the scheme work without an index: bucketOf(normalised name) is
      // pure, so the browser can go straight from an EntityDir hit to a file.
      var bi = B.bucketOf(t, buckets.bucketCount);
      if (byBucket[bi]) {
        bucketIds[bi] = 1;
        bucketBytes += byBucket[bi].bytes;
      }
    });
  });
  totalCat += catBytes; totalB += bucketBytes;
  var nCat = Object.keys(catIds).length, nB = Object.keys(bucketIds).length;
  console.log(q[0]);
  console.log('  category  ' + String(nCat).padStart(3) + ' shard(s)  ' +
    (catBytes / 1048576).toFixed(1).padStart(7) + ' MB');
  console.log('  buckets   ' + String(nB).padStart(3) + ' bucket(s) ' +
    (bucketBytes / 1048576).toFixed(1).padStart(7) + ' MB   ' +
    (catBytes ? ((1 - bucketBytes / catBytes) * 100).toFixed(0) + '% less' : 'n/a'));
});

console.log('');
console.log('total: category ' + (totalCat / 1048576).toFixed(1) + ' MB -> buckets ' +
  (totalB / 1048576).toFixed(1) + ' MB  (' +
  ((1 - totalB / totalCat) * 100).toFixed(0) + '% reduction)');
console.log('');
var worst = buckets.buckets.reduce(function (a, b) { return Math.max(a, b.bytes); }, 0);
console.log('floor: one bucket per distinct entity, so a 10-entity question');
console.log('never costs more than 10 x largest bucket = ' + (worst * 10 / 1048576).toFixed(1) + ' MB,');
console.log('against 90 MB of category-shard budget. That is the headroom win.');