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
//
// The cap is applied while accumulating, not only at write time. Holding every
// owning entity until the end is what made pass two's memory scale with the
// corpus rather than with the survivors, and retrieval never reads this list: the
// page uses the bucket list, and only the diagnostics print entity names. Eight is
// enough to name the owners in a report.
var MAX_ENTITIES = 8;

// Pass two holds every surviving phrase in memory, so the number of survivors is a
// hard budget rather than a preference. Measured, not guessed: pass one prints the
// survivor count and the script exits rather than dying at the heap ceiling the way
// the single-pass version did.
var MAX_KEPT = 4000000;

var MAX_WORDS = 4;

// ── content n-grams ──────────────────────────────────────────────────────────
//
// The capitalised-run rule above has a blind spot that matters more than it looks.
// "Water mass accounts for 68% of body mass" starts one capitalised run, "Water
// mass accounts for", and the run is only ever written as the whole thing plus its
// last-capitalised-word head. That head is "Water", so `lastCap` is 0, the 2-word
// key is skipped, and the phrase everyone would actually search for -- "water mass"
// -- is not in the index. A term that exists in thousands of sentences was
// unreachable because of capitalisation, not because the corpus lacked it.
//
// So every content n-gram is indexed too: the longest 2- and 3-word runs that
// begin with a word carrying meaning. That is what makes a lowercase or mid-
// sentence term like "water mass" or "body mass" resolvable, and it is the
// difference between an index of proper nouns and an index of the corpus.
var NGRAM_MIN = 2;
var NGRAM_MAX = 3;

// A term that starts with one of these is a function word followed by whatever
// comes next, so its n-grams are noise: "of the", "in a", "that the". Dropping
// them at the head is what keeps the n-gram count from exploding without
// discarding anything anyone would search for.
var NGRAM_STOP = /^(the|a|an|of|in|on|at|by|for|from|with|as|but|and|or|to|is|was|were|are|be|been|being|has|have|had|do|does|did|will|would|can|could|may|might|shall|should|must|not|no|nor|so|if|when|while|after|before|during|since|under|over|between|however|therefore|although|though|because|such|there|who|whom|what|which|where|how|why|than|then|thus|also|into|upon|about|against|through|above|below|up|down|out|off|again|further|once|more|most|other|some|only|own|same|too|very|just|now|here|all|any|both|each|few|many|much|one|two|it|he|she|they|we|you|i|his|her|its|their|our|my|your|our)$/i;

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

// The capitalised-run rule has a blind spot worth fixing on its own. "Water mass
// accounts for 68% of body mass" starts one capitalised run, "Water mass accounts
// for", and the run is only written as the whole thing plus its last-capitalised-
// word head. That head is "Water", so lastCap is 0, the 2-word key is skipped, and
// the phrase anyone would actually search for -- "water mass" -- never reaches the
// index. A term present in thousands of sentences was unreachable because of
// capitalisation, not because the corpus lacked it.
//
// Emitting the 2-word head when no word after the first is capitalised costs one
// extra entry per run. Indexing EVERY content n-gram was tried and is not
// affordable: it produces over 16.7M distinct keys and V8's Map refuses to hold
// them ("Map maximum size exceeded"), and it is the wrong shape anyway -- see the
// note on MAX_BUCKETS below.
var HEAD_MIN = 2;

// Which once-seen (df=1) phrases earn an index entry.
//
// Indexing all of them costs 2.1 GB of shards on top of the 2.0 GB of bucket
// shards. Measured on the 2026-10-02 corpus: 25,800,810 df=1 phrases take the phrase
// index from 395 MB to 2,173 MB. A word-count filter does NOT reduce this -- every
// df=1 phrase is already 2+ words, because phrasesIn() drops single capitalised
// words before they reach here, so a ">=2 words" cut discarded 0 of 25.8M.
//
// Off by default: it is a size-versus-reach tradeoff, not a correctness fix. With it
// off, a term that occurs in exactly one sentence is not findable, which is how
// "water mass" (one sentence in the corpus, the ostrich water-balance figure) came
// back as a miss while the record sat in the archive. Turn it on once the shards can
// be hosted somewhere with room for them.
var INDEX_ONCE_SEEN = false;

// Minimum words in a once-seen phrase, used only when INDEX_ONCE_SEEN is on.
var ONCE_MIN_WORDS = 2;

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
      else if (run.length >= HEAD_MIN) out.push(run.slice(0, HEAD_MIN).join(' '));
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
  // Pass one cannot hold every phrase in a Map, and raising MIN_DF does not help
  // it: the phrases are all resident before any cut applies. With the per-entity
  // cap removed the corpus reached 16.3M distinct phrases, and V8 refuses a Map
  // past 2^24 entries -- "Map maximum size exceeded" -- so the counting step is the
  // hard ceiling on the whole build, not a tuning problem.
  //
  // So pass one spills instead. Every phrase is appended to one of 512 spill files
  // chosen by the same hash(phrase) that names its output shard, which means each
  // spill file holds a disjoint slice of the phrase space and one slice's distinct
  // count fits in memory many times over. The df pass then reads one spill at a
  // time, decides what clears MIN_DF, and only the survivors (a small fraction) are
  // ever resident together. Peak memory is one slice plus the keep set, instead of
  // every distinct phrase in the corpus.
  var SPILL_DIR = path.join(OUT_DIR, '.spill');
  if (!fs.existsSync(SPILL_DIR)) fs.mkdirSync(SPILL_DIR, { recursive: true });
  else fs.readdirSync(SPILL_DIR).forEach(function (f) {
    fs.unlinkSync(path.join(SPILL_DIR, f));
  });

  var SPILL_FLUSH = 20000;
  var spillBuf = new Array(BUCKET_COUNT);
  for (var sb = 0; sb < BUCKET_COUNT; sb++) spillBuf[sb] = [];

  function flushSpill(k) {
    if (!spillBuf[k].length) return;
    fs.appendFileSync(path.join(SPILL_DIR, 'spill.' + k + '.txt'),
      spillBuf[k].join('\n') + '\n');
    spillBuf[k] = [];
  }

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
          var k = H.bucketOf(key, BUCKET_COUNT);
          spillBuf[k].push(key);
          if (spillBuf[k].length >= SPILL_FLUSH) flushSpill(k);
        });
      });
    });
  });
  for (var sf = 0; sf < BUCKET_COUNT; sf++) flushSpill(sf);

  console.log('rows ' + totalRows.toLocaleString() +
    '   sentences ' + totalSentences.toLocaleString() +
    '   phrase occurrences ' + totalOccurrences.toLocaleString());

  // Reduce each slice to its survivors, then release the slice's file. The keep set
  // is the only structure that grows across the whole corpus, and it holds phrases
  // that cleared MIN_DF rather than every phrase that exists.
  var kept = 0, below = 0, distinct = 0;
  var keep = new Set();
  for (var k2 = 0; k2 < BUCKET_COUNT; k2++) {
    var spillFile = path.join(SPILL_DIR, 'spill.' + k2 + '.txt');
    if (!fs.existsSync(spillFile)) continue;
    var text = fs.readFileSync(spillFile, 'utf8');
    var local = new Map();
    text.split('\n').forEach(function (line) {
      if (!line) return;
      local.set(line, (local.get(line) || 0) + 1);
    });
    distinct += local.size;
    local.forEach(function (n, phrase) {
      if (n >= MIN_DF) { kept++; keep.add(phrase); } else { below++; }
    });
    fs.unlinkSync(spillFile);
  }
  fs.rmdirSync(SPILL_DIR);

  console.log('distinct phrases ' + distinct.toLocaleString());
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
  //
  // Phrases that failed MIN_DF are not discarded, they are streamed. Anything not in
  // `keep` occurs in exactly one row, so its whole index entry is known on sight --
  // one bucket, one owner -- and it can be written straight out instead of held.
  //
  // This is the difference between a term that exists being findable and being
  // invisible. "water mass" occurs in exactly one sentence of the corpus (the
  // ostrich water-balance figure), so MIN_DF=2 threw it away and a search for it
  // returned nothing while the record sat in the archive. A once-seen term is the
  // cheapest possible lookup -- one bucket, one fetch -- and it is exactly the term
  // most likely to be someone asking a specific question. Holding these in memory is
  // what does not fit: 25.8M of them is past the Map ceiling again, so they go to
  // per-shard temp files and are merged in as each output shard is written.
  var acc = new Array(BUCKET_COUNT);
  for (var b = 0; b < BUCKET_COUNT; b++) acc[b] = new Map();

  var ONCE_DIR = path.join(OUT_DIR, '.once');
  if (!fs.existsSync(ONCE_DIR)) fs.mkdirSync(ONCE_DIR, { recursive: true });
  else fs.readdirSync(ONCE_DIR).forEach(function (f) {
    fs.unlinkSync(path.join(ONCE_DIR, f));
  });
  var onceBuf = new Array(BUCKET_COUNT);
  for (var ob = 0; ob < BUCKET_COUNT; ob++) onceBuf[ob] = [];
  var onceCount = 0;
  var onceSeen = 0;
  var onceKept = 0;

  function flushOnce(k) {
    if (!onceBuf[k].length) return;
    fs.appendFileSync(path.join(ONCE_DIR, 'once.' + k + '.tsv'),
      onceBuf[k].join('\n') + '\n');
    onceBuf[k] = [];
  }

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
          if (!keep.has(key)) {
            onceSeen++;
            if (INDEX_ONCE_SEEN) {
              // Once-seen: record it now, while the owning row is in hand.
              onceKept++;
              var ok2 = H.bucketOf(key, BUCKET_COUNT);
              onceBuf[ok2].push(key + '\t' + bi + '\t' + entity);
              onceCount++;
              if (onceBuf[ok2].length >= SPILL_FLUSH) flushOnce(ok2);
            }
            return;
          }
          var e = hits.get(key);
          if (!e) { e = { b: [], e: [] }; hits.set(key, e); }
          e.b.push(bi);
          if (e.e.length < MAX_ENTITIES && e.e.indexOf(entity) === -1) e.e.push(entity);
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
          if (cur.e.length >= MAX_ENTITIES) break;
          if (cur.e.indexOf(e.e[i]) === -1) cur.e.push(e.e[i]);
        }
      });
    });
  });

  for (var o2 = 0; o2 < BUCKET_COUNT; o2++) flushOnce(o2);
  console.log('once-seen phrases seen    : ' + onceSeen.toLocaleString());
  console.log('once-seen phrases kept    : ' + onceKept.toLocaleString() +
    '  (dropped ' + (onceSeen - onceKept).toLocaleString() + ' under ' +
    ONCE_MIN_WORDS + ' words)');

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
    // Merge this shard's once-seen phrases in, then release the temp file. A
    // once-seen phrase has one bucket by construction, so it never trips the
    // spread cut and needs no further checking.
    var onceFile = path.join(ONCE_DIR, 'once.' + k + '.tsv');
    if (fs.existsSync(onceFile)) {
      fs.readFileSync(onceFile, 'utf8').split('\n').forEach(function (line) {
        if (!line) return;
        var parts = line.split('\t');
        if (parts.length < 3) return;
        payload[parts[0]] = { d: 1, b: [+parts[1]], e: [parts[2]] };
      });
      fs.unlinkSync(onceFile);
    }
    var file = path.join(OUT_DIR, 'phrase.' + k + '.json');
    // Empty shards are written as `{}` so the page can fetch unconditionally
    // instead of probing for existence.
    var json = JSON.stringify(payload);
    fs.writeFileSync(file, json);
    totalBytes += Buffer.byteLength(json);
    if (Object.keys(payload).length) nonEmpty++;
  }
  fs.rmdirSync(ONCE_DIR);

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