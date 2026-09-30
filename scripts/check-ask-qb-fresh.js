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

if (sourceRecords === indexed) {
  console.log('FRESH: Ask index covers all ' + sourceRecords.toLocaleString() + ' archive records.');
  console.log('Built ' + (manifest.builtAt || '?') + ' from ' + (manifest.categories || []).length + ' categories.');
  process.exit(0);
}

if (sourceRecords < indexed) {
  fail('the archive now holds FEWER records (' + sourceRecords.toLocaleString() +
    ') than the index was built from (' + indexed.toLocaleString() +
    '), so the archive was probably rewritten rather than appended to. Rebuild and diff the output.');
}

console.log('STALE: the archive has grown since the last Ask build.');
console.log('');
console.log('  archive records now : ' + sourceRecords.toLocaleString());
console.log('  records in the index: ' + indexed.toLocaleString());
console.log('  not yet indexed     : ' + (sourceRecords - indexed).toLocaleString());
console.log('');
console.log('Ask will not see the new records until it is rebuilt. Run:');
console.log('  node scripts/build-ask-qb.js');
console.log('  node scripts/build-ask-qb-dir.js');
console.log('  node scripts/build-ask-qb-concepts.js');
process.exit(1);
