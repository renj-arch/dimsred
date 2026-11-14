#!/usr/bin/env node
'use strict';
/**
 * build-flowchart-index.js -- emit data/flowchart-index.json, a slim node set
 * for flowchart.html.
 *
 * The page used to download all ten timeline.nodes.*.json shards (~206 MB of
 * JSON, ~60 s on localhost, minutes over the network) to build a name index
 * over 558,615 nodes. Almost all of those nodes can never appear: the graph
 * only grows through verified relations (timeline.json edges ->
 * data/relations.json) and authored mind-trees (data/topic-layers.json). A
 * node that neither references nor ranks highly is dead weight -- it can be
 * searched for, but it has no neighbours to draw.
 *
 * This builder keeps exactly the nodes that can matter:
 *   1. every node referenced by a typed edge in timeline.json,
 *   2. every node whose name appears in topic-layers.json (branches/items),
 *   3. the TOP_N highest-count nodes, so search and random seeds still cover
 *      the popular corpus.
 *
 * Output is the same node objects the shards carry (desc included -- only
 * ~30k nodes, so the desc budget is ~10 MB, not 200 MB).
 *
 * Usage: node scripts/build-flowchart-index.js [--top 25000]
 */

var fs = require('fs');
var path = require('path');
var GC = require('./lib/graph-core.js');

var ROOT = path.join(__dirname, '..');
var DATA = path.join(ROOT, 'data');
var OUT = path.join(DATA, 'flowchart-index.json');

var TOP_N = 25000;
var argv = process.argv.slice(2);
for (var i = 0; i < argv.length; i++) {
  if (argv[i] === '--top' && argv[i + 1]) TOP_N = parseInt(argv[i + 1], 10) || TOP_N;
}

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

// ---- relevance sets -------------------------------------------------------
// 1) typed edges: node ids are "category|Name"
var edgeIds = {};
var timeline = readJson(path.join(DATA, 'timeline.json'));
(timeline.edges || []).forEach(function (e) {
  if (e && e.a) edgeIds[e.a] = 1;
  if (e && e.b) edgeIds[e.b] = 1;
});

// 2) topic-layers names (branch titles + item names/titles)
var layerNames = {};
var layers = {};
try { layers = readJson(path.join(DATA, 'topic-layers.json')); } catch (e) { layers = {}; }
Object.keys(layers).forEach(function (k) {
  var t = layers[k] || {};
  if (t.name) layerNames[GC.canon(t.name)] = 1;
  (t.branches || []).forEach(function (b) {
    if (b && b.title) layerNames[GC.canon(b.title)] = 1;
    (b.items || []).forEach(function (it) {
      var nm = it && (it.name || it.title);
      if (nm) layerNames[GC.canon(nm)] = 1;
    });
  });
});

console.log('edge ids: ' + Object.keys(edgeIds).length +
            ' | layer names: ' + Object.keys(layerNames).length);

// ---- scan shards ----------------------------------------------------------
var all = [];
for (var s = 0; s < 10; s++) {
  var f = path.join(DATA, 'timeline.nodes.' + s + '.json');
  if (!fs.existsSync(f)) break;
  var part = readJson(f);
  for (var i = 0; i < part.length; i++) all.push(part[i]);
}
console.log('scanned nodes: ' + all.length);

// top-N by count (ties broken by id for determinism)
var byCount = all.slice().sort(function (a, b) {
  return (b.count || 0) - (a.count || 0) || String(a.id).localeCompare(String(b.id));
});
var topIds = {};
for (var i = 0; i < Math.min(TOP_N, byCount.length); i++) topIds[byCount[i].id] = 1;

var kept = [];
all.forEach(function (n) {
  if (edgeIds[n.id] || topIds[n.id] || layerNames[GC.canon(n.name || '')]) kept.push(n);
});

var out = {
  builtAt: new Date().toISOString(),
  generator: 'scripts/build-flowchart-index.js',
  totalNodes: all.length,
  included: kept.length,
  eras: timeline.eras || [],
  nodes: kept
};
fs.writeFileSync(OUT, JSON.stringify(out));
var mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
console.log('wrote ' + OUT + ' (' + mb + ' MB, ' + kept.length + ' of ' + all.length + ' nodes)');
