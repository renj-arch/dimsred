// Build one category into a temp tree and inspect the emitted shard.
//
//   node scripts/check-qb-shard-shape.js <repo-root> <category-file> [limitRecords]
//
// Confirms that build-ask-qb.js now writes the 4th provenance element, that it is
// index-aligned with the sentences, and that an old 3-tuple shard still reads
// back as unverified rather than gaining an invented source.
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var ROOT = process.argv[2] || path.join(__dirname, '..');
var CAT = process.argv[3] || 'indian-physical-geography.json';
var TMP = path.join(process.env.TEMP || '.', 'opencode', 'qb-shard-check');
var fails = 0;
function ok(cond, label, detail) {
  if (cond) { console.log('  ok    ' + label); return; }
  fails++;
  console.log('  FAIL  ' + label + (detail ? '  -> ' + detail : ''));
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(path.join(TMP, 'data', 'questions'), { recursive: true });

// Copy the scripts and data the build needs, and one trimmed category file.
fs.mkdirSync(path.join(TMP, 'scripts', 'lib'), { recursive: true });
['build-ask-qb.js'].forEach(function (f) {
  fs.copyFileSync(path.join(ROOT, 'scripts', f), path.join(TMP, 'scripts', f));
});
fs.readdirSync(path.join(ROOT, 'scripts', 'lib')).forEach(function (f) {
  if (/^ask-/.test(f) && /\.js$/.test(f)) {
    fs.copyFileSync(path.join(ROOT, 'scripts', 'lib', f), path.join(TMP, 'scripts', 'lib', f));
  }
});

// Each category file is keyed by its own category name, e.g.
// { "Indian Physical Geography": { subSubjects: ... } }. build-ask-qb.js walks
// that shape, so the trimmed copy must keep the key rather than a wrapper array.
var src = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'questions', CAT), 'utf8'));
var catName = Object.keys(src)[0];
var cat = src[catName];
if (!cat) {
  console.log('  FAIL  ' + CAT + ' has no category key');
  process.exit(1);
}
fs.writeFileSync(path.join(TMP, 'data', 'questions', CAT),
  JSON.stringify({ [catName]: cat }));
// The build is driven by archive-cat-index.json, which is the registry of
// category files; without it the build has nothing to iterate.
fs.copyFileSync(path.join(ROOT, 'data', 'questions', 'archive-cat-index.json'),
  path.join(TMP, 'data', 'questions', 'archive-cat-index.json'));

console.log('building shard for: ' + catName);
var r = cp.spawnSync(process.execPath, ['scripts/build-ask-qb.js'],
  { cwd: TMP, encoding: 'utf8' });
if (r.status !== 0) {
  console.log('  FAIL  build exited ' + r.status);
  console.log((r.stderr || '').slice(-1200));
  process.exit(1);
}

var outDir = path.join(TMP, 'data', 'ask-qb');
var files = fs.readdirSync(outDir).filter(function (f) { return /\.json$/.test(f); });
var shardFile = files.filter(function (f) { return /ask-qb\.\d+\.json$/.test(f); })[0];
ok(!!shardFile, 'a shard was written', files.join(','));
if (!shardFile) process.exit(1);

var rows = JSON.parse(fs.readFileSync(path.join(outDir, shardFile), 'utf8'));
console.log('  ...    ' + rows.length + ' entity row(s) in ' + shardFile);
console.log('');

var withMeta = rows.filter(function (r2) { return Array.isArray(r2[3]); });
ok(withMeta.length === rows.length, 'every row has a 4th provenance element',
  withMeta.length + '/' + rows.length);
ok(rows.every(function (r2) { return r2[1].length === r2[3].length; }),
  'provenance is index-aligned with sentences',
  rows.filter(function (r2) { return r2[1].length !== r2[3].length; })[0] &&
    JSON.stringify(rows.filter(function (r2) { return r2[1].length !== r2[3].length; })[0]).slice(0, 120));

var anySource = rows.some(function (r2) {
  return r2[3].some(function (m) { return m && m.source; });
});
ok(anySource, 'at least one sentence carries a source');

var dateLike = rows.some(function (r2) {
  return r2[3].some(function (m) { return m && /^\d{4}-\d{2}/.test(String(m.pubDate || '')); });
});
ok(dateLike, 'at least one sentence carries a pubDate');

console.log('');
console.log('  sample row:');
var s = rows.find(function (r2) { return r2[3] && r2[3].length && r2[3][0] && r2[3][0].source; }) || rows[0];
console.log('    entity  : ' + s[0]);
console.log('    cats    : ' + JSON.stringify(s[2]));
console.log('    sent[0] : ' + String(s[1][0]).slice(0, 88));
console.log('    meta[0] : ' + JSON.stringify(s[3] && s[3][0]));

console.log('');
console.log('=== a pre-change shard still reads, as unverified ===');
var EE = require(path.join(ROOT, 'scripts/lib/ask-entity-evidence.js'));
var qb = require(path.join(ROOT, 'scripts/lib/ask-qb.js'));
var entityDir = new qb.EntityDir().load(
  fs.readFileSync(path.join(ROOT, 'data/ask-qb/entities.tsv'), 'utf8'));
var legacy = rows.map(function (r2) { return [r2[0], r2[1], r2[2]]; });
var fresh = rows;
[['legacy', legacy], ['rebuilt', fresh]].forEach(function (pair) {
  var tag = pair[0], data = pair[1];
  var res = EE.retrieve(data, 'test', [[cat.name, rows[0][0], []]], entityDir, {});
  var pt = res.points[0];
  var st = pt.evidence[0] && pt.evidence[0].trust;
  console.log('  ' + tag.padEnd(8) + ' trust=' + (st ? st.state : 'n/a') +
    ' source=' + (st ? JSON.stringify(st.source) : 'n/a'));
  if (tag === 'legacy') {
    ok(st && st.state === 'unverified',
      'a 3-tuple row is unverified, never assumed sourced', st && st.state);
  } else {
    ok(st && st.source, 'a 4-tuple row exposes its real source', JSON.stringify(st));
  }
});

console.log('');
console.log(fails ? '=== ' + fails + ' FAILURE(S) ===' : '=== all checks passed ===');
process.exit(fails ? 1 : 0);