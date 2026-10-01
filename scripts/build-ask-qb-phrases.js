'use strict';
// Build a phrase index over sentence text, sharded by the entity-bucket hash.
//
//   node scripts/build-ask-qb-phrases.js
//
// Why this exists
// ---------------
// Shards are keyed by the record's SUBJECT. So "El Nino" appears verbatim in
// sentences belonging to entities like "Pelagic thresher" and "Effects of climate
// change on livestock", but it is never itself an entity name. Entity-anchored
// lookup cannot resolve it, and worse, hash("el nino") lands in bucket 114 while
// the text sits in buckets 2 and 40 -- so even fetching the "right" bucket for the
// term returns nothing. The archive search finds it only because it streams the
// raw 8.7 GB of category JSON in the browser.
//
// This index is the cheap version: phrase -> buckets that contain it. It is sharded
// by hash(phrase) % bucketCount, the same hash the buckets already use, so a query
// fetches exactly one small index file and learns which bucket files to read. No
// new fetch pattern is introduced into the page.
//
// What is indexed
// ---------------
// Capitalised multiword phrases only. Every word in the corpus is far too many
// entries, and single capitals are mostly sentence-initial noise. Requiring
// internal capitals and a lowercase following word keeps "El Nino", "Quit India"
// and "Rift Valley" while dropping "The", "However" and "In".
//
// Document frequency is capped so a phrase that appears in thousands of sentences
// (usually an artefact, or a phrase too generic to be worth resolving) does not
// bloat the index or produce useless bucket lists.

var fs = require('fs');
var path = require('path');
var H = require('./lib/build-ask-qb-buckets-hash.js');

var ROOT = __dirname.replace(/scripts$/, '');
var QB = path.join(ROOT, 'data', 'ask-qb');
var BUCKET_DIR = path.join(QB, 'bucket');
var OUT_DIR = path.join(QB, 'phrase');

var BUCKET_COUNT = 512;

// A phrase must occur in at least this many distinct sentences to be worth
// resolving. Single-occurrence phrases are usually typos or one-off names, and
// they cost an entry each.
var MIN_DF = 2;

// Above this many buckets a phrase is spread too thinly to be a useful hint: the
// index would tell the caller to read most of the corpus, which is what it was
// built to avoid.
var MAX_BUCKETS = 96;

// Per-phrase cap on the entity names recorded, so one ubiquitous phrase cannot
// dominate a shard file.
var MAX_ENTITIES = 24;

// Pass two holds every surviving phrase in memory, so the number of survivors is a
// hard budget rather than a preference. Measured, not guessed: pass one prints the
// survivor count and the script exits rather than dying at the heap ceiling the way
// the single-pass version did.
var MAX_KEPT = 2500000;

var MAX_WORDS = 4;

// ── phrase extraction ────────────────────────────────────────────────────────

var WORD = /[A-Za-z][A-Za-z'’-]*/g;

function sentencesOf(row) {
  return row && Array.isArray(row[1]) ? row[1] : [];
}

// A capitalised run of 2..MAX_WORDS words, where every word after the first is
// lowercase-initial or a known all-caps acronym. "El Nino" qualifies; "The North"
// does not, because "North" would need the following word to be lowercase and the
// run to continue, which "Pacific" does allow -- but "The" is rejected explicitly
// as a leading function word.
var LEADING_FUNCTION = /^(The|A|An|This|That|These|Those|It|He|She|They|In|On|At|By|For|From|With|As|But|And|Or|So|If|When|While|After|Before|During|Since|Under|Over|Between|However|Therefore|Although|Though|Because|Such|There|His|Her|Its|Their|Our|My)$/;

function phrasesIn(text) {
  var out = [];
  var words = String(text || '').match(WORD) || [];
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    if (!/^[A-Z]/.test(w)) continue;
    if (LEADING_FUNCTION.test(w)) continue;
    // Single capitalised word: keep only if it is also not the sentence subject
    // marker. Bare "El" alone is dropped; "El Nino" is not.
    var run = [w];
    var j = i + 1;
    while (j < words.length && run.length < MAX_WORDS) {
      var n = words[j];
      // Continue on a lowercase word, or on a longer capitalised word (North
      // Pacific), but stop if the next word starts a new clause.
      if (/^[a-z]/.test(n)) { run.push(n); j++; continue; }
      if (/^[A-Z]/.test(n) && n.length > 1 && run.length >= 1 &&
          !/[.!?]$/.test(words[j - 1])) { run.push(n); j++; continue; }
      break;
    }
    if (run.length >= 2) {
      // Index the capitalised head of the run as well as the whole run. "El Nino
      // years" is a real phrase, but a query for "el nino" must still resolve, so
      // the run is truncated at its last capitalised word. Without this the term
      // that motivated the whole index is only findable in its own exact form.
      var lastCap = 0;
      for (var c = 0; c < run.length; c++) {
        if (/^[A-Z]/.test(run[c])) lastCap = c;
      }
      if (lastCap >= 1) out.push(run.slice(0, lastCap + 1).join(' '));
      out.push(run.join(' '));
      // Skip past the run so "North Pacific population shifts" also yields
      // "Pacific population shifts", often the more useful resolution.
      i = j - 1;
    }
  }
  return out;
}

// ── build ────────────────────────────────────────────────────────────────────

function listBuckets() {
  return fs.readdirSync(BUCKET_DIR).filter(function (f) {
    return /^bucket\.\d+\.json$/.test(f);
  }).sort(function (a, b) {
    return parseInt(/\d+/.exec(a)[0], 10) - parseInt(/\d+/.exec(b)[0], 10);
  });
}

function main() {
  if (!fs.existsSync(BUCKET_DIR)) {
    console.error('bucket directory not found: ' + BUCKET_DIR);
    console.error('run scripts/build-ask-qb-buckets.js first');
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  var bucketFiles = listBuckets();
  console.log('reading ' + bucketFiles.length + ' bucket shards');

  // Two passes, because one pass does not fit.
  //
  // The first version built a Map of phrase -> {df, buckets, entities} and died at
  // the 2 GB heap ceiling after 44 s. The shape was the problem: millions of
  // distinct phrases, each costing a string, a wrapper object, and two plain
  // objects. Bounding document frequency cannot rescue that, because the phrases
  // are already resident before any cut is applied.
  //
  // Pass one holds only phrase -> integer. Pass two revisits the shards and
  // accumulates detail only for phrases that cleared the cut. The df cut is the
  // memory bound, so it is set from measurement rather than guessed: the counts
  // are printed and the script stops if too many phrases survive.
  var df = new Map();
  var totalRows = 0, totalSentences = 0, totalOccurrences = 0;

  bucketFiles.forEach(function (f) {
    var rows = JSON.parse(fs.readFileSync(path.join(BUCKET_DIR, f), 'utf8'));
    totalRows += rows.length;
    rows.forEach(function (row) {
      var sentences = sentencesOf(row);
      totalSentences += sentences.length;
      var seenHere = new Set();
      sentences.forEach(function (s) {
        phrasesIn(s).forEach(function (p) {
          totalOccurrences++;
          var key = p.toLowerCase();
          // A phrase repeated within one sentence counts once, so repetition
          // inside a sentence cannot make a phrase look established.
          if (seenHere.has(key)) return;
          seenHere.add(key);
          df.set(key, (df.get(key) || 0) + 1);
        });
      });
    });
  });

  console.log('rows ' + totalRows.toLocaleString() +
    '   sentences ' + totalSentences.toLocaleString() +
    '   phrase occurrences ' + totalOccurrences.toLocaleString());
  console.log('distinct phrases ' + df.size.toLocaleString());

  var kept = 0, below = 0;
  var keep = new Set();
  df.forEach(function (n, phrase) {
    if (n >= MIN_DF) { kept++; keep.add(phrase); } else { below++; }
  });
  console.log('surviving df>=' + MIN_DF + ': ' + kept.toLocaleString() +
    '   dropped ' + below.toLocaleString());

  if (kept > MAX_KEPT) {
    console.error('');
    console.error('STOP: ' + kept.toLocaleString() + ' phrases would have to be held ' +
      'in memory in pass two, above the ' + MAX_KEPT.toLocaleString() + ' ceiling.');
    console.error('This is the failure mode of the single-pass version, not a tuning');
    console.error('problem. Raise MIN_DF, or shard the accumulation across processes.');
    process.exit(2);
  }

  // Pass two: detail for survivors only. Shards are accumulated per output file,
  // so nothing is written until every bucket has been read, but only survivors are
  // resident.
  var acc = new Array(BUCKET_COUNT);
  for (var b = 0; b < BUCKET_COUNT; b++) acc[b] = new Map();

  bucketFiles.forEach(function (f) {
    var bi = parseInt(/\d+/.exec(f)[0], 10);
    var rows = JSON.parse(fs.readFileSync(path.join(BUCKET_DIR, f), 'utf8'));
    rows.forEach(function (row) {
      var entity = row[0];
      var sentences = sentencesOf(row);
      var hits = new Map();
      var seenHere = new Set();
      sentences.forEach(function (s) {
        phrasesIn(s).forEach(function (p) {
          var key = p.toLowerCase();
          if (seenHere.has(key)) return;
          seenHere.add(key);
          if (!keep.has(key)) return;
          var e = hits.get(key);
          if (!e) { e = { b: [], e: [] }; hits.set(key, e); }
          e.b.push(bi);
          if (e.e.indexOf(entity) === -1) e.e.push(entity);
        });
      });
      hits.forEach(function (e, phrase) {
        var target = acc[H.bucketOf(phrase, BUCKET_COUNT)];
        var cur = target.get(phrase);
        if (!cur) {
          cur = { d: 0, b: [], e: [] };
          target.set(phrase, cur);
        }
        cur.d++;
        if (cur.b.indexOf(bi) === -1) cur.b.push(bi);
        for (var i = 0; i < e.e.length; i++) {
          if (cur.e.indexOf(e.e[i]) === -1) cur.e.push(e.e[i]);
        }
      });
    });
  });

  var totalBytes = 0, nonEmpty = 0, droppedSpread = 0, truncated = 0;
  for (var k = 0; k < BUCKET_COUNT; k++) {
    var payload = {};
    acc[k].forEach(function (entry, phrase) {
      // A phrase spread across too many buckets tells the caller to read most of
      // the corpus, which defeats the point of the index.
      if (entry.b.length > MAX_BUCKETS) { droppedSpread++; return; }
      var names = entry.e.slice(0, MAX_ENTITIES);
      if (entry.e.length > MAX_ENTITIES) truncated++;
      payload[phrase] = { d: entry.d, b: entry.b, e: names };
    });
    var file = path.join(OUT_DIR, 'phrase.' + k + '.json');
    // Empty shards are written as `{}` so the page can fetch unconditionally
    // instead of probing for existence.
    var json = JSON.stringify(payload);
    fs.writeFileSync(file, json);
    totalBytes += Buffer.byteLength(json);
    if (Object.keys(payload).length) nonEmpty++;
  }

  console.log('dropped spread>' + MAX_BUCKETS + ': ' + droppedSpread.toLocaleString() +
    '   entity lists truncated: ' + truncated.toLocaleString());
  console.log('wrote ' + BUCKET_COUNT + ' phrase shards (' + nonEmpty +
    ' non-empty) totalling ' + (totalBytes / 1048576).toFixed(1) + ' MB');
  console.log('mean shard ' + (totalBytes / BUCKET_COUNT / 1024).toFixed(1) + ' KB');
  console.log('largest shard ' + (function () {
    var max = 0;
    for (var i = 0; i < BUCKET_COUNT; i++) {
      var s = fs.statSync(path.join(OUT_DIR, 'phrase.' + i + '.json')).size;
      if (s > max) max = s;
    }
    return (max / 1024).toFixed(1) + ' KB';
  })());
}

if (require.main === module) main();

module.exports = { phrasesIn: phrasesIn, MIN_DF: MIN_DF, MAX_BUCKETS: MAX_BUCKETS };