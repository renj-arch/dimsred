// Detects whether the Ask question-bank index has fallen behind the archive.
//
// The Ask tables under data/ask-qb/ are a build-time snapshot. The archive under
// data/questions/ keeps growing, and nothing re-reads it at runtime: a new record
// reaches Ask only when the builders are re-run. Without this check a stale index
// is served silently, which looks like "Ask cannot find that topic" rather than
// "Ask was never rebuilt".
//
// Run it before a deploy, and from CI:
//   node scripts/check-ask-qb-fresh.js
//
// Exit code 0 means fresh, 1 means stale or missing, so a pipeline step is enough.

'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var MANIFEST = path.join(ROOT, 'data', 'ask-qb', 'manifest.json');
var CAT_INDEX = path.join(ROOT, 'data', 'questions', 'archive-cat-index.json');

function fail(msg) {
  console.error('STALE: ' + msg);
  console.error('');
  console.error('Rebuild with:');
  console.error('  node scripts/build-ask-qb.js');
  console.error('  node scripts/build-ask-qb-dir.js');
  console.error('  node scripts/build-ask-qb-concepts.js');
  process.exit(1);
}

if (!fs.existsSync(MANIFEST)) {
  fail('data/ask-qb/manifest.json does not exist. The question-bank index was never built.');
}
if (!fs.existsSync(CAT_INDEX)) {
  fail('data/questions/archive-cat-index.json does not exist, so the archive size cannot be read.');
}

var manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
var catIndex = JSON.parse(fs.readFileSync(CAT_INDEX, 'utf8'));

// The per-category totals in the archive index add up to the number of records in
// the source corpus, which is the same number the builder records as it scans.
// It grows monotonically as records are added, so equality means nothing has been
// added since the build.
var sourceRecords = catIndex.reduce(function (sum, c) { return sum + (c.total || 0); }, 0);
var indexed = (manifest.stats || {}).records;

if (typeof indexed !== 'number') {
  fail('data/ask-qb/manifest.json has no stats.records, so freshness cannot be checked.');
}

// Authoritative record count: read the category files themselves.
//
// archive-cat-index.json's `total` fields are written only by
// build-archive-single.js, from its own in-memory tree. Wiki Fill appends into
// data/questions/*.json directly and never updates them, so the declared totals
// can silently fall behind the files they describe. Run #6 hit exactly that:
// totals said 15,901,975, the builder scanned 15,901,991, and the branch below
// reported "the archive was probably rewritten rather than appended to" -- an
// accusation of corruption that was simply false. All 16 records were Indian
// Tribes, appended without a count update.
//
// So whenever the cheap declared count disagrees with the index, this recomputes
// the truth before drawing a conclusion. It costs a full pass over ~8.5 GB, which
// is why it runs only on the mismatch path; the common "declared == indexed" case
// still exits without touching the corpus.
function groundTruth() {
  var total = 0;
  var missing = [];
  catIndex.forEach(function (c) {
    var files = Array.isArray(c.file) ? c.file : [c.file];
    files.forEach(function (f) {
      var p = path.join(ROOT, f);
      if (!fs.existsSync(p)) { missing.push(f); return; }
      var j = JSON.parse(fs.readFileSync(p, 'utf8'));
      // Shape: { Subject: { subSubjects: { SubSub: [...] } } }
      Object.keys(j).forEach(function (s) {
        var h = j[s];
        if (!h || typeof h !== 'object') return;
        var g = (h.subSubjects && typeof h.subSubjects === 'object') ? h.subSubjects : h;
        Object.keys(g).forEach(function (k) { if (Array.isArray(g[k])) total += g[k].length; });
      });
    });
  });
  return { total: total, missing: missing };
}

if (sourceRecords === indexed) {
  console.log('FRESH: Ask index covers all ' + sourceRecords.toLocaleString() + ' archive records.');
  console.log('Built ' + (manifest.builtAt || '?') + ' from ' + (manifest.categories || []).length + ' categories.');
  process.exit(0);
}

console.log('Declared category totals disagree with the built index; verifying against the corpus...');
var truth = groundTruth();
if (truth.missing.length) {
  fail('category files listed in archive-cat-index.json are missing: ' + truth.missing.slice(0, 3).join(', ') +
    (truth.missing.length > 3 ? ' (+' + (truth.missing.length - 3) + ' more)' : ''));
}

if (truth.total === indexed) {
  // The corpus and the index agree; only the metadata is behind. Nothing is
  // actually stale, so this must not report as a stale index.
  console.error('OK: the corpus holds ' + truth.total.toLocaleString() + ' records and the index covers the same number.');
  console.error('');
  console.error('But archive-cat-index.json totals sum to ' + sourceRecords.toLocaleString() +
    ', so its counts are behind the files (records were appended without updating them).');
  console.error('Diagnose and repair with:');
  console.error('  node scripts/diag-cat-index-totals.js');
  process.exit(1);
}

if (truth.total < indexed) {
  fail('the archive holds FEWER records (' + truth.total.toLocaleString() +
    ') than the index was built from (' + indexed.toLocaleString() +
    '), so records really were removed or rewritten rather than appended to. Rebuild and diff the output.');
}

// Genuine staleness: the corpus is larger than what the tables were built from.
console.log('STALE: the archive has grown since the last Ask build.');
console.log('');
console.log('  archive records now : ' + truth.total.toLocaleString());
console.log('  records in the index: ' + indexed.toLocaleString());
console.log('  not yet indexed     : ' + (truth.total - indexed).toLocaleString());
console.log('');
if (sourceRecords !== truth.total) {
  console.log('Note: archive-cat-index.json totals sum to ' + sourceRecords.toLocaleString() +
    ', which is behind the files. Repair with scripts/diag-cat-index-totals.js.');
  console.log('');
}
console.log('Ask will not see the new records until it is rebuilt. Run:');
console.log('  node scripts/build-ask-qb.js');
console.log('  node scripts/build-ask-qb-dir.js');
console.log('  node scripts/build-ask-qb-concepts.js');
process.exit(1);
