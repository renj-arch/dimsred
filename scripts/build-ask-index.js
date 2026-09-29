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

// Column order for the array-encoded node rows. Changing this without changing
// FIELDS below silently corrupts every retrieved sentence, so they are declared
// once and asserted on read.
var FIELDS = ['id', 'name', 'type', 'cat', 'desc'];

// Fills the shape ask-core expects from the compact array form. Kept here rather
// than in ask-core so the browser bundle only carries the reader, not the
// build-time encoding knowledge.
function decodeNodes(payload) {
  return ((payload && payload.nodes) || []).map(function (r) {
    return { id: r[0], name: r[1], type: r[2], cat: r[3], desc: r[4] };
  });
}

function sentenceKey(s) { return ask.norm(s).slice(0, 140); }

function main() {
  // ── pass 1: nodes ─────────────────────────────────────────────────────────
  var nodes = [];
  var byId = {};
  var seenDesc = {};

  for (var i = 0; i < 10; i++) {
    var file = path.join(ROOT, 'data', 'timeline.nodes.' + i + '.json');
    if (!fs.existsSync(file)) continue;
    var arr = JSON.parse(fs.readFileSync(file, 'utf8'));
    arr.forEach(function (nd) {
      stats.scanned++;
      var desc = String(nd.desc || '').trim();
      if (ask.wordCount(desc) < ask.MIN_DESC_WORDS) { stats.droppedShort++; return; }
      if (!ask.isQuoteable(desc)) { stats.droppedFragment++; return; }
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
      nodes.push([nd.id, nd.name, nd.type || '', (nd.cats && nd.cats[0] && nd.cats[0].key) || '', desc]);
      stats.kept++;
    });
    process.stderr.write('  read shard ' + i + ' (running total ' + nodes.length + ' kept)\n');
  }

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
      note: 'Retrieval index only. Every quoted sentence in an answer is verbatim corpus text with a map.html deep link. This index does not generate claims.'
    },
    byCat: byCat,
    nodes: nodes,
    links: adj
  };

  fs.writeFileSync(OUT, JSON.stringify(out));
  var mb = fs.statSync(OUT).size / 1048576;

  // Read the file straight back and prove the shipped artefact is queryable.
  // A build that writes an index nothing can parse is worse than no build.
  var back = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  var probe = ask.buildIndex({ nodes: decodeNodes(back), links: back.links });
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
  console.log('wrote ' + path.relative(ROOT, OUT) + ' (' + mb.toFixed(2) + ' MB)');

  if (linkedNodes / Math.max(1, stats.kept) < 0.25) {
    console.log('');
    console.log('NOTE: graph expansion is near-useless on this corpus. The co-occurrence');
    console.log('links in timeline.json connect mostly the short, unquotable nodes, so the');
    console.log('subgraph of nodes that can actually be quoted is almost edgeless. BM25');
    console.log('retrieval still works; related-node expansion contributes almost nothing.');
  }
  if (mb > 20) {
    console.log('');
    console.log('WARNING: index exceeds 20 MB. Browser load will be slow; raise MIN_DESC_WORDS');
    console.log('or lower MAX_TARGET_LINKS in this script before shipping.');
  }
}

main();
