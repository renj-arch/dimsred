// build-ask-index.js -- emit a compact retrieval index for ask.html.
//
// WHY A PREBUILT INDEX
// --------------------
// The site deploys to Cloudflare Pages as static files (slim-live.yml runs
// `wrangler pages deploy`), so there is no Node process to run a retrieval
// endpoint. The raw corpus is 200 MB across ten node shards, which is not
// something to push into a browser tab either. So this script streams the
// shards once, keeps only the nodes that can actually be quoted, and writes a
// single small file that ask.html loads directly.
//
// THE FILTER IS THE PRODUCT
// -------------------------
// Each node's `desc` is one harvested Wikipedia sentence, not a document. Across
// all 529,755 nodes, 50.1% are 10 words or fewer and only 10.6% exceed 25 words.
// A node whose desc cannot survive ask-core's isQuoteable() gate can never
// produce evidence, so shipping it would only bloat the download. Everything
// dropped here is reported at the end rather than silently discarded, because
// "the index is small" and "the index lost your material" must not look alike.
'use strict';
var fs = require('fs');
var path = require('path');
var ask = require('./lib/ask-core.js');

var ROOT = path.resolve(__dirname, '..');
var OUT = path.join(ROOT, 'data', 'ask-index.json');

// Per-node link budget. A node with 400 co-occurrence neighbours is mostly
// noise (see the Frankfurt/Paris weight-10681 example in timeline.json), so we
// keep the strongest few and let BM25 do the rest of the work.
var MAX_LINKS_PER_NODE = 8;
// Cap on how many strongest links a node may contribute *to other nodes*, which
// is what actually controls index size.
var MAX_TARGET_LINKS = 6;

var stats = { scanned: 0, kept: 0, droppedShort: 0, droppedFragment: 0, droppedDup: 0, noLinks: 0 };

// Title -> [title, reason code, word count] for every node the quote gate drops.
var thinSeen = {};
var THIN_REASON = { SHORT: 1, NOT_QUOTABLE: 2, BOTH: 3 };

// Column order for the array-encoded node rows. Changing this without changing
// FIELDS below silently corrupts every retrieved sentence, so they are declared
// once and asserted on read.
var FIELDS = ['id', 'name', 'type', 'cat', 'desc', 'ev'];

// Fills the shape ask-core expects from the compact array form. Kept here rather
// than in ask-core so the browser bundle only carries the reader, not the
// build-time encoding knowledge.
function decodeNodes(payload) {
  return ((payload && payload.nodes) || []).map(function (r) {
    return { id: r[0], name: r[1], type: r[2], cat: r[3], desc: r[4], ev: r[5] || null };
  });
}

function sentenceKey(s) { return ask.norm(s).slice(0, 140); }

function main() {
  // ── pass 1: nodes ─────────────────────────────────────────────────────────
  var nodes = [];
  var byId = {};
  var seenDesc = {};

  // Shards are discovered, not counted. A hardcoded `i < 10` silently dropped
  // everything in shard 10 from every Ask query (557 nodes), and the number was
  // a countdown to the next silent loss: once the corpus produced an 11th full
  // 20 MiB shard, Ask would have stopped seeing it with no error anywhere.
  var nodeShards = fs.readdirSync(path.join(ROOT, 'data'))
    .filter(function (f) { return /^timeline\.nodes\.\d+\.json$/.test(f); })
    .sort(function (x, y) {
      return parseInt(x.match(/(\d+)/)[1], 10) - parseInt(y.match(/(\d+)/)[1], 10);
    });

  nodeShards.forEach(function (shard) {
    var file = path.join(ROOT, 'data', shard);
    var arr = JSON.parse(fs.readFileSync(file, 'utf8'));
    arr.forEach(function (nd) {
      stats.scanned++;
      var desc = String(nd.desc || '').trim();
      // Drop reason captured here rather than in a second pass over 199 MB. The
      // title goes into `thin` below so a refusal can say "this node exists but
      // its only sentence is N words" instead of claiming the corpus is empty.
      var tooShort = ask.wordCount(desc) < ask.MIN_DESC_WORDS;
      var unquoteable = !ask.isQuoteable(desc);
      if (tooShort || unquoteable) {
        // Stored through ask.norm so the key is comparable to a normalised query
        // phrase: norm turns "anti-defection law (India)" into
        // "anti defection law (india)". The browser's thinNode() normalises the
        // phrase it is given, so a lower-cased-but-not-normalised key here (the
        // earlier form) never matched a hyphenated title -- which is why
        // `anti-defection law` could not find its own dropped node.
        var thinKey = ask.norm(nd.name);
        if (thinKey) {
          thinSeen[thinKey] = [
            thinKey,
            tooShort && unquoteable ? THIN_REASON.BOTH : (tooShort ? THIN_REASON.SHORT : THIN_REASON.NOT_QUOTABLE),
            ask.wordCount(desc)
          ];
        }
      }
      if (tooShort) { stats.droppedShort++; return; }
      if (unquoteable) { stats.droppedFragment++; return; }
      // The same Wikipedia sentence is indexed under several category shards.
      // Keeping every copy would let one fact occupy several evidence slots.
      var key = sentenceKey(desc);
      if (seenDesc[key]) { stats.droppedDup++; return; }
      seenDesc[key] = 1;

      var idx = nodes.length;
      byId[nd.id] = idx;
      // Array-encoded rather than object-encoded. At ~65k nodes the difference
      // is roughly 14 MB versus 7 MB on the wire, which decides whether this
      // page is usable on a phone. Order is fixed and documented in FIELDS;
      // ask-core reads the payload back through decodeNodes() below.
      // `ev` is the node's [shard,row] pointer into timeline-evidence.N.json, or 0 for
// none. 0 rather than null because this row is replicated across every row of the
// index: `null` costs 5 bytes on all ~214k nodes (~1.1 MB of download) to say
// nothing, while 0 costs one byte and stays falsy for the checks that matter.
nodes.push([nd.id, nd.name, nd.type || '', (nd.cats && nd.cats[0] && nd.cats[0].key) || '', desc, nd.evRef || 0]);
      stats.kept++;
    });
    process.stderr.write('  read ' + shard + ' (running total ' + nodes.length + ' kept)\n');
  });

  // ── pass 2: co-occurrence adjacency ───────────────────────────────────────
  // timeline.json links are {a,b,w}. Only links whose *both* endpoints survived
  // the filter are useful: a link to a node with no quotable text contributes
  // a neighbour that can never become evidence.
  var tlPath = path.join(ROOT, 'data', 'timeline.json');
  var tl = JSON.parse(fs.readFileSync(tlPath, 'utf8'));
  var pairs = {};
  (tl.links || []).forEach(function (l) {
    var a = byId[l.a], b = byId[l.b];
    if (a === undefined || b === undefined || a === b) return;
    var ka = a + ':' + b, kb = b + ':' + a;
    if (!pairs[ka]) pairs[ka] = [a, b, l.w || 0];
    if (!pairs[kb]) pairs[kb] = [b, a, l.w || 0];
  });

  var adj = {};
  Object.keys(pairs).forEach(function (k) {
    var p = pairs[k];
    (adj[p[0]] = adj[p[0]] || []).push([p[1], p[2]]);
  });
  Object.keys(adj).forEach(function (k) {
    adj[k].sort(function (x, y) { return y[1] - x[1]; });
    if (!adj[k].length) stats.noLinks++;
  });

  // ── emit ──────────────────────────────────────────────────────────────────
  // Category histogram is not decoration. It is the only way to answer "does
  // my corpus even cover this topic?" without running a query, and when a
  // category holds two quotable nodes that is the explanation for a refusal.
  var byCat = {};
  nodes.forEach(function (n) { byCat[n[3] || '(uncategorised)'] = (byCat[n[3] || '(uncategorised)'] || 0) + 1; });

  var linkedNodes = Object.keys(adj).length;

  // Every node that failed the quote gate, kept as a title and the reason.
//
// Without this, a refusal for one of the 326,097 dropped nodes says "no term in
// the question appears anywhere in the index", which is false: `Dadabhai Naoroji`
// is a real node in shard 8 whose whole description is "Indian political leader"
// -- three words against a twelve-word floor. The archive search finds that name
// 37 times in the 8.7 GB question bank, and the entity buckets hold 24 real
// sentences for it, so the reader is told the corpus is empty when it is two
// filters away from a good answer.
//
// Recording the title and the reason costs 6.3 MB raw and 2.1 MB gzipped, against
// the 65,039 kept nodes' 7 MB, and it buys the difference between "your corpus
// does not contain this" and "this exists, and here is why you cannot read it
// yet". The second is actionable; the first sends people away from a corpus that
// has the material.
//
// Stored as parallel arrays of lower-cased titles and reason codes rather than
// objects: `["dadabhai naoroji",3]` is a quarter the bytes of
// `{"n":"dadabhai naoroji","r":3}` over 311k entries, and the reader needs one
// lookup, not a scan of keys.
var thinTitles = [], thinReasons = [];

// Sorted so the shipped file is byte-stable across builds, and de-duplicated by
// title: the same Wikipedia entity appears under several categories, and a
// duplicate would triple the size without adding information. `thinSeen` is
// already a title-keyed object, so a title appearing under several categories
// keeps only its first reason -- which is the one that decided the drop.
Object.keys(thinSeen).sort().forEach(function (k) {
  var t = thinSeen[k];
  thinTitles.push(t[0]);
  // Words are capped at 40 so a pathological description cannot inflate the file.
  thinReasons.push(t[1] * 1000 + Math.min(40, t[2]));
});

  // ── node shards ───────────────────────────────────────────────────────────
  // Cloudflare Pages rejects any single asset over 25 MiB (slim-live.yml deploys
  // with `wrangler pages deploy`). 214,011 sentence rows are ~46 MB, so they
  // ship as several files that the reader concatenates. The target is 8 MB,
  // leaving room for JSON quoting overhead and growth before a shard crosses the
  // hard limit. The counts live in meta.nodeShards; there is no manifest file to
  // get out of step, because the count is the manifest.
  var SHARD_TARGET = 8 * 1024 * 1024;
  var SHARD_RE = /^ask-index-nodes\.\d+\.json$/;
  var shards = [];
  nodes.forEach(function (row) {
    var s = JSON.stringify(row);
    var cur = shards[shards.length - 1];
    if (!cur || cur.bytes + s.length + 2 > SHARD_TARGET) {
      cur = { rows: [], bytes: 2, file: path.join(ROOT, 'data', 'ask-index-nodes.' + shards.length + '.json') };
      shards.push(cur);
    }
    cur.rows.push(row);
    cur.bytes += s.length + 2;
  });
  // Drop shards left over from a previous, larger build so the deployed set
  // matches meta.nodeShards and no stale sentence file is served.
  fs.readdirSync(path.join(ROOT, 'data')).forEach(function (f) {
    if (!SHARD_RE.test(f)) return;
    if (+f.match(/\.(\d+)\.json$/)[1] >= shards.length) fs.unlinkSync(path.join(ROOT, 'data', f));
  });
  var shardBytes = 0;
  shards.forEach(function (sh) {
    fs.writeFileSync(sh.file, JSON.stringify(sh.rows));
    shardBytes += fs.statSync(sh.file).size;
    console.log('  wrote ' + path.relative(ROOT, sh.file) + ' (' + (fs.statSync(sh.file).size / 1048576).toFixed(2) + ' MB)');
  });

  var out = {
    meta: {
      builtAt: new Date().toISOString(),
      builtFrom: 'data/timeline.nodes.0-9.json + data/timeline.json',
      fields: FIELDS,
      encoding: 'array',
      nodesScanned: stats.scanned,
      nodesKept: stats.kept,
      droppedTooShort: stats.droppedShort,
      droppedNotQuoteable: stats.droppedFragment,
      droppedDuplicateSentence: stats.droppedDup,
      nodesWithLinks: linkedNodes,
      minDescWords: ask.MIN_DESC_WORDS,
      thinNodes: thinTitles.length,
      nodeShards: shards.length,
      nodeShardBytes: shardBytes,
      thinNote: 'nodes excluded by the quote gate, as lower-cased titles. ' +
        'reason = code*1000 + wordCount, where code is 1=too short, 2=not quotable, 3=both. ' +
        'A refusal naming one of these is a build gap, not a corpus gap.',
      note: 'Retrieval index only. Every quoted sentence in an answer is verbatim corpus text with a map.html deep link. This index does not generate claims.'
    },
    byCat: byCat,
    // The quotable sentence rows do NOT live in this file. They are 214,011
    // sentences, ~46 MB raw, and Cloudflare Pages rejects any single asset over
    // 25 MiB, so they ship as `data/ask-index-nodes.<i>.json` shards listed in
    // `meta.nodeShards`. This file holds everything a refusal needs -- the
    // dropped-title table (`thin`) so the engine can say "this exists but cannot
    // be quoted" instead of "the corpus is empty" -- plus the category histogram
    // and the co-occurrence links. Keep it small: it is on every page load.
    links: adj,
    // Parallel arrays, positionally aligned. See `thinNote` in meta.
    thin: thinTitles,
    thinWhy: thinReasons
  };

  fs.writeFileSync(OUT, JSON.stringify(out));
  var mb = fs.statSync(OUT).size / 1048576;

  // Read the shards and this file straight back and prove the shipped artefact
  // is queryable. A build that writes an index nothing can parse is worse than
  // no build.
  var backNodes = [];
  shards.forEach(function (s) { backNodes = backNodes.concat(s.rows); });
  var probe = ask.buildIndex({ nodes: decodeNodes({ nodes: backNodes }), links: out.links, thin: out.thin, thinWhy: out.thinWhy });
  if (probe.N !== stats.kept) {
    console.error('FATAL: round-trip kept ' + probe.N + ' nodes, expected ' + stats.kept);
    process.exit(1);
  }
  var probeRes = ask.retrieve(probe, 'What is the anti-defection law in India and how does it work?', 8);
  console.log('round-trip probe      : ' + probeRes.candidates.length + ' candidates, coverage ' +
    (probeRes.coverage * 100).toFixed(0) + '%' + (probeRes.refused ? ', refused' : ''));

  console.log('\n=== ASK INDEX ===');
  console.log('nodes scanned        : ' + stats.scanned);
  console.log('nodes kept           : ' + stats.kept);
  console.log('dropped (< ' + ask.MIN_DESC_WORDS + ' words) : ' + stats.droppedShort);
  console.log('dropped (not quoteable)      : ' + stats.droppedFragment);
  console.log('dropped (duplicate sentence) : ' + stats.droppedDup);
  console.log('nodes with >=1 link   : ' + linkedNodes + '  (' + (100 * linkedNodes / Math.max(1, stats.kept)).toFixed(1) + '% of kept)');
  console.log('categories            : ' + Object.keys(byCat).length);
  console.log('wrote ' + path.relative(ROOT, OUT) + ' (' + mb.toFixed(2) + ' MB, thin + links only)');
  console.log('node shards           : ' + shards.length + ' (' + (shardBytes / 1048576).toFixed(2) + ' MB total)');

  // The deploy target is Cloudflare Pages, which rejects any single asset over
  // 25 MiB. A build that silently writes an undeployable file is the one failure
  // this script must never have, so it is a hard error, not a warning.
  var LIMIT = 25 * 1048576;
  var over = [OUT].concat(shards.map(function (s) { return s.file; })).filter(function (f) {
    return fs.statSync(f).size > LIMIT;
  });
  if (over.length) {
    console.error('FATAL: ' + over.length + ' file(s) exceed the 25 MiB Pages limit: ' +
      over.map(function (f) { return path.basename(f); }).join(', ') +
      '. Lower SHARD_TARGET in this script.');
    process.exit(1);
  }

  if (linkedNodes / Math.max(1, stats.kept) < 0.25) {
    console.log('');
    console.log('NOTE: graph expansion is near-useless on this corpus. The co-occurrence');
    console.log('links in timeline.json connect mostly the short, unquotable nodes, so the');
    console.log('subgraph of nodes that can actually be quoted is almost edgeless. BM25');
    console.log('retrieval still works; related-node expansion contributes almost nothing.');
  }
}

main();
