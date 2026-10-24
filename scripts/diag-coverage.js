'use strict';
// How much of data/questions is reachable by Ask's index build?
//
//   node scripts/diag-coverage.js
//
// Answers three questions with counts rather than estimates:
//   1. Which files does the category index not list, and do they hold records?
//   2. How many records does the index cover versus how many exist on disk?
//   3. How many are dropped by the per-record and per-entity caps, and how many
//      entities hit the cap (so their coverage is partial, not complete)?
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var Q = path.join(ROOT, 'data', 'questions');

var idx = JSON.parse(fs.readFileSync(path.join(Q, 'archive-cat-index.json'), 'utf8'));
var cats = Array.isArray(idx) ? idx : idx.categories;
// The index lists repo-relative paths with forward slashes. Normalise both sides
// to that form so the comparison does not depend on the platform separator.
function keyOf(rel) { return String(rel).replace(/\\/g, '/').replace(/^\.\//, ''); }
var listedAbs = {};
cats.forEach(function (c) {
  (Array.isArray(c.file) ? c.file : [c.file]).forEach(function (f) {
    if (f) listedAbs[keyOf(f)] = 1;
  });
});

var onDisk = fs.readdirSync(Q).filter(function (f) { return /\.json$/.test(f); })
  .map(function (f) { return 'data/questions/' + f; });

// Counts real records only. A record is an object carrying a string id, matching
// the shape build-ask-qb.js extracts. Counting array elements instead treats every
// hash in a bloom shard as a record, which is how the first run of this diagnostic
// reported 23M records in files that hold none.
function countRecords(data) {
  var n = 0;
  function isRecord(x) {
    return x && typeof x === 'object' && !Array.isArray(x) && typeof x.id === 'string';
  }
  function walk(v) {
    if (v == null || typeof v !== 'object') return;
    if (Array.isArray(v)) {
      for (var i = 0; i < v.length; i++) {
        if (isRecord(v[i])) n++;
        else walk(v[i]);
      }
      return;
    }
    if (isRecord(v)) { n++; return; }
    for (var k in v) {
      if (Object.prototype.hasOwnProperty.call(v, k)) walk(v[k]);
    }
  }
  walk(data);
  return n;
}

var MAX_SENTENCES_PER_ENTITY = 24;

var unlisted = [];
onDisk.forEach(function (f) { if (!listedAbs[f]) unlisted.push(f); });

console.log('index categories        ' + cats.length);
console.log('files listed in index   ' + Object.keys(listedAbs).length);
console.log('json files on disk       ' + onDisk.length);
console.log('on disk but not listed   ' + unlisted.length);
console.log('');

var unlistedRecords = 0;
var groups = {};
unlisted.forEach(function (f) {
  var name = path.basename(f);
  var group = /^search-filter\./.test(name) ? 'search-filter.N (bloom shards)'
    : /^(manifest|catalog|archive-index|archive-cat-index)\.json$/.test(name) ? 'index/metadata'
    : name;
  var size = fs.statSync(path.join(ROOT, f)).size;
  var records = 0, err = null;
  try { records = countRecords(JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'))); }
  catch (e) { err = e.message.slice(0, 60); }
  unlistedRecords += records;
  groups[group] = groups[group] || { files: 0, mb: 0, records: 0, errs: 0 };
  groups[group].files++;
  groups[group].mb += size / 1048576;
  groups[group].records += records;
  if (err) groups[group].errs++;
});

console.log('unlisted files by group');
Object.keys(groups).sort(function (a, b) { return groups[b].mb - groups[a].mb; })
  .forEach(function (g) {
    console.log('  ' + g.padEnd(30) + groups[g].files + ' files  ' +
      groups[g].mb.toFixed(1) + ' MB  ' + groups[g].records + ' records' +
      (groups[g].errs ? '  (' + groups[g].errs + ' unparseable)' : ''));
  });
console.log('');
console.log('records in unlisted files ' + unlistedRecords);
console.log('');

// Entity-level coverage: an entity at the cap has a truncated record, so anything
// it says beyond sentence 24 is not answerable through Ask.
var manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ask-qb', 'manifest.json'), 'utf8'));
console.log('index manifest');
console.log('  builtAt    ' + manifest.builtAt);
console.log('  files      ' + manifest.stats.files);
console.log('  records    ' + manifest.stats.records);
console.log('  keptSent   ' + manifest.stats.keptSent);
console.log('  dupes      ' + manifest.stats.dupes);
console.log('  parseErr   ' + manifest.stats.parseErr);
console.log('  kept share ' + (100 * manifest.stats.keptSent / manifest.stats.records).toFixed(1) + '% of records yielded a sentence');
console.log('');

// Read the bucket shards to count entities at the cap. 968 MB, so this streams
// them one at a time rather than holding the index in memory.
var bdir = path.join(ROOT, 'data', 'ask-qb', 'bucket');
var files = fs.readdirSync(bdir).filter(function (f) { return /^bucket\.\d+\.json$/.test(f); })
  .sort(function (a, b) { return (+a.match(/(\d+)/)[1]) - (+b.match(/(\d+)/)[1]); });
var entities = 0, atCap = 0, sentTotal = 0, maxSents = 0, cappedExamples = [];
files.forEach(function (f) {
  var rows = JSON.parse(fs.readFileSync(path.join(bdir, f), 'utf8'));
  rows.forEach(function (r) {
    var n = (r[1] || []).length;
    entities++;
    sentTotal += n;
    if (n > maxSents) maxSents = n;
    if (n >= MAX_SENTENCES_PER_ENTITY && cappedExamples.length < 8) {
      cappedExamples.push((r[0] || '?') + ' (' + n + ')');
    }
    if (n >= MAX_SENTENCES_PER_ENTITY) atCap++;
  });
});
console.log('entity coverage');
console.log('  entities          ' + entities);
console.log('  sentences         ' + sentTotal);
console.log('  mean per entity   ' + (sentTotal / entities).toFixed(1));
console.log('  max sentences     ' + maxSents + ' (cap is ' + MAX_SENTENCES_PER_ENTITY + ')');
console.log('  entities at cap   ' + atCap + ' (' + (100 * atCap / entities).toFixed(1) + '%)');
console.log('  examples          ' + cappedExamples.join('; '));
console.log('');
console.log('An entity at the cap is truncated: its later sentences are in');
console.log('data/questions but absent from data/ask-qb, so Ask cannot quote them.');