'use strict';
// Re-bucket the question-bank evidence by ENTITY instead of by CATEGORY.
//
// The category shards work, but they are the wrong granularity. Measured across
// the built set: 483,382 entities / 5,892,879 sentences / 828.1 MB, but only
// 1,796 bytes per entity on average, and World Geography alone is 59.2 MB with
// 33,422 entities. A question needing ten specific entities therefore downloads
// 182 MB to read perhaps 18 KB of it -- and at the shipped 90 MB budget the
// largest shard is dropped, taking five of that question's ten headings with it.
// See scripts/diag-fetch-budget.js for the measured curve.
//
// Buckets are assigned by hashing the entity's normalised name, so the bucket for
// an entity is computable at query time from the name alone. No index file is
// needed: EntityDir already hands back the exact resolved name, and the browser
// hashes that name the same way. Total bytes are unchanged -- only the partition
// differs, which is what turns a 182 MB fetch into roughly 16 MB.
//
// This reads the already-built category shards rather than the 8.5 GB corpus, so
// it runs in seconds instead of hours, and it inherits their provenance arrays.

var fs = require('fs');
var path = require('path');
var ask = require('./lib/ask-core.js');
var hash = require('./lib/build-ask-qb-buckets-hash.js');

var ROOT = path.join(__dirname, '..');
var QBDIR = path.join(ROOT, 'data', 'ask-qb');
var OUTDIR = path.join(QBDIR, 'bucket');

// Target bucket size. 2 MB keeps a single fetch comfortably under the 90 MB page
// budget even when a question's entities scatter across many buckets, while
// staying large enough that a few hundred files cover the whole corpus.
var TARGET_BYTES = 2 * 1024 * 1024;
// Bucket count is fixed rather than derived, because both the builder and the
// browser must agree on it without exchanging state. 512 gives ~1.9 MB average
// buckets at the current corpus; the builder reports the real average, which is
// the signal that the constant needs revisiting.
var BUCKETS = hash.BUCKETS;

var bucketOf = hash.bucketOf;

function main() {
  var manifestPath = path.join(QBDIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('no manifest.json -- run build-ask-qb.js first');
    process.exit(1);
  }
  var manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  // bucket -> { entities: Map(name -> row), bytes: number }
  // A Map per bucket rather than one object keyed by slug: two entities can share
  // a slug but differ in case or spacing, and silently merging them would lose
  // sentences without any error.
  var buckets = [];
  for (var i = 0; i < BUCKETS; i++) buckets.push({ ents: new Map(), bytes: 0 });

  var stats = { shards: 0, rows: 0, merged: 0, sentences: 0, missing: 0 };
  var t0 = Date.now();

  manifest.categories.forEach(function (cat) {
    var m = /ask-qb\.(\d+)\.json$/.exec(cat.file);
    if (!m) return;
    var p = path.join(ROOT, cat.file);
    if (!fs.existsSync(p)) { stats.missing++; return; }
    var rows;
    try { rows = JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch (e) { stats.missing++; return; }
    stats.shards++;

    rows.forEach(function (row) {
      var name = String(row[0] || '').trim();
      if (!name) return;
      var sents = row[1] || [];
      if (!sents.length) return;
      stats.rows++;

      var bi = bucketOf(name, BUCKETS);
      var b = buckets[bi];
      var ek = name.toLowerCase();

      // An entity present in several categories merges into one bucket row.
      // Sentences are deduped because the same Wikipedia paragraph backs
      // fill-in-the-blank items across categories, and the cap has to be applied
      // after merging or the merged entity would silently lose its tail.
      var cur = b.ents.get(ek);
      if (!cur) {
        cur = { name: name, sents: [], meta: [], cats: {} };
        b.ents.set(ek, cur);
      } else {
        stats.merged++;
      }
      (row[2] || []).forEach(function (c) { cur.cats[c] = 1; });
      var meta = row[3] || [];
      for (var k = 0; k < sents.length; k++) {
        if (cur.sents.length >= 24) break;
        var s = String(sents[k]).trim();
        if (!s) continue;
        var dup = false;
        for (var j = 0; j < cur.sents.length; j++) {
          if (cur.sents[j].slice(0, 160) === s.slice(0, 160)) { dup = true; break; }
        }
        if (dup) continue;
        cur.sents.push(s);
        var mv = meta[k] || {};
        cur.meta.push({ source: mv.source || '', pubDate: mv.pubDate || '' });
      }
      stats.sentences += sents.length;
    });
    process.stderr.write('  read ' + stats.shards + '/' + manifest.categories.length + '\r');
  });

  // Write each bucket, skipping the empty ones so no 2-byte files are deployed.
  var per = [];
  var written = 0, totalBytes = 0, totalEnts = 0, totalSents = 0;
  for (var b2 = 0; b2 < BUCKETS; b2++) {
    var bk = buckets[b2];
    if (!bk.ents.size) continue;
    var list = [];
    bk.ents.forEach(function (v) {
      var ns = v.sents.slice(0, 24);
      // meta is sliced in step with sents so the parallel-array invariant that
      // ask-qb.js and ask-entity-evidence.js both rely on cannot drift.
      list.push([v.name, ns, Object.keys(v.cats), v.meta.slice(0, ns.length)]);
    });
    var json = JSON.stringify(list);
    var name = 'bucket.' + b2 + '.json';
    fs.writeFileSync(path.join(OUTDIR, name), json);
    var bytes = Buffer.byteLength(json);
    per.push({ bucket: b2, file: 'data/ask-qb/bucket/' + name,
      entities: list.length, sentences: list.reduce(function (a, r) { return a + r[1].length; }, 0),
      bytes: bytes });
    written++; totalBytes += bytes;
    totalEnts += list.length;
    totalSents += list.reduce(function (a, r) { return a + r[1].length; }, 0);
  }

  var bm = {
    builtAt: new Date().toISOString(),
    builtFrom: manifest.builtFrom,
    scheme: 'entity-hash',
    bucketCount: BUCKETS,
    targetBytes: TARGET_BYTES,
    buckets: per
  };
  fs.writeFileSync(path.join(OUTDIR, 'buckets.json'), JSON.stringify(bm));

  var avg = per.length ? totalBytes / per.length : 0;
  process.stderr.write('\nbuckets written : ' + written + '/' + BUCKETS + '\n');
  process.stderr.write('entities        : ' + totalEnts + '\n');
  process.stderr.write('sentences       : ' + totalSents + '\n');
  process.stderr.write('total           : ' + (totalBytes / 1048576).toFixed(1) + ' MB\n');
  process.stderr.write('avg bucket      : ' + (avg / 1024).toFixed(0) + ' KB (target ' +
    (TARGET_BYTES / 1024) + ' KB)\n');
  process.stderr.write('largest bucket  : ' +
    (per.reduce(function (a, c) { return Math.max(a, c.bytes); }, 0) / 1024).toFixed(0) + ' KB\n');
  process.stderr.write('merged rows     : ' + stats.merged + '\n');
  process.stderr.write('shards read     : ' + stats.shards + ' (' + stats.missing + ' missing)\n');
  process.stderr.write('elapsed         : ' + ((Date.now() - t0) / 1000).toFixed(1) + 's\n');
}

if (require.main === module) main();
module.exports = { bucketOf: bucketOf, BUCKETS: BUCKETS };