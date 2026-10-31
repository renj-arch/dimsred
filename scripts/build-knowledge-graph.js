// build-knowledge-graph.js — emit a compact graph for knowledge-graph.html.
//
// The Ask index stores `links` as { "<numeric node index>": [[targetIndex, weight], ...] }.
// Only 2,292 of the 215,945 nodes participate in that relation, and every target
// is itself a link key, so the relation is a closed graph. That is small enough
// to ship as one asset and render in the browser without a graph library.
//
// Output: data/knowledge-graph.json
//   meta  { builtAt, nodes, links, cats }
//   nodes [ { id, name, type, cat, desc } ]
//   links [ { s, t, w } ]   unordered pairs, deduplicated
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var DATA = path.join(ROOT, 'data');

function readIndex() {
  var idx = JSON.parse(fs.readFileSync(path.join(DATA, 'ask-index.json'), 'utf8'));
  var nodes = [];
  var shards = (idx.meta && idx.meta.nodeShards) || 0;
  for (var i = 0; i < shards; i++) {
    nodes = nodes.concat(JSON.parse(fs.readFileSync(
      path.join(DATA, 'ask-index-nodes.' + i + '.json'), 'utf8')));
  }
  if (!shards && Array.isArray(idx.nodes)) nodes = idx.nodes;
  return { idx: idx, nodes: nodes };
}

function main() {
  var loaded = readIndex();
  var idx = loaded.idx;
  var all = loaded.nodes;
  var links = idx.links || {};

  var used = {};
  var pairs = [];
  var seen = {};
  Object.keys(links).forEach(function (from) {
    var fi = +from;
    used[fi] = true;
    (links[from] || []).forEach(function (p) {
      var ti = +p[0];
      var w = +p[1] || 1;
      used[ti] = true;
      var lo = fi < ti ? fi : ti;
      var hi = fi < ti ? ti : fi;
      var key = lo + ':' + hi;
      if (seen[key]) return;
      seen[key] = true;
      pairs.push({ s: lo, t: hi, w: w });
    });
  });

  var ids = Object.keys(used).map(Number).sort(function (a, b) { return a - b; });
  var remap = {};
  var outNodes = [];
  var cats = {};
  // Category names carry a source-shard suffix (world-geography-75,
  // ancient-india-3). That is a build detail, not a subject, and it fragments
  // the graph into 952 pseudo-categories. Fold it back to the base subject.
  function baseCat(c) {
    return String(c || 'general').replace(/-\d+$/, '') || 'general';
  }
  ids.forEach(function (i, n) {
    remap[i] = n;
    var r = all[i];
    if (!r) return;
    var cat = baseCat(r[3]);
    cats[cat] = (cats[cat] || 0) + 1;
    outNodes.push({
      id: n,
      name: r[1],
      type: r[2],
      cat: cat,
      desc: r[4],
      src: i
    });
  });

  var outLinks = pairs.map(function (p) {
    return { s: remap[p.s], t: remap[p.t], w: p.w };
  }).filter(function (p) {
    return p.s !== undefined && p.t !== undefined;
  });

  // Pick a handful of good entry points. Pure degree ranking lands on
  // France/London/Germany, which are hubs but a dull first paint. Prefer
  // recognizable multi-word topics at a mid-range degree so the first view is
  // a readable neighbourhood, not a 986-spoke star. The source `cat` field is
  // too noisy to rank on (it labels French Revolutionary Wars as wildlife), so
  // the filter is name-shape + degree only.
  var deg = {};
  outLinks.forEach(function (l) { deg[l.s] = (deg[l.s] || 0) + 1; deg[l.t] = (deg[l.t] || 0) + 1; });
  var GENERIC = /^(France|London|Germany|Education|United Kingdom|Health|Russia|Empire|Paris|Spain|Friends|Israel|Infrastructure|Jews|Mexico|Soviet Union|Militia|Philippines|San Francisco|Moscow|Greece|Switzerland|Norway|Toronto|Syria|Palestine|Thailand|Montreal|Jerusalem|Milan|Beijing|Geneva|Malaysia|Madrid|Colorado|Peru|Walmart)$/;
  var starters = outNodes.filter(function (n) {
    var d = deg[n.id] || 0;
    return d >= 25 && d <= 90 &&
      !GENERIC.test(n.name) &&
      n.name.split(' ').length >= 2 &&
      n.name.length >= 10 && n.name.length <= 38;
  }).sort(function (a, b) {
    return (deg[b.id] || 0) - (deg[a.id] || 0);
  }).slice(0, 12).map(function (n) { return n.id; });
  // Fallback if the preferred shape is empty in a future build.
  if (!starters.length) {
    starters = outNodes.slice().sort(function (a, b) {
      return (deg[b.id] || 0) - (deg[a.id] || 0);
    }).slice(0, 12).map(function (n) { return n.id; });
  }

  var out = {
    meta: {
      builtAt: new Date().toISOString(),
      nodes: outNodes.length,
      links: outLinks.length,
      cats: Object.keys(cats).length
    },
    cats: Object.keys(cats).sort().reduce(function (acc, c) {
      acc[c] = cats[c];
      return acc;
    }, {}),
    starters: starters,
    nodes: outNodes,
    links: outLinks
  };

  var dest = path.join(DATA, 'knowledge-graph.json');
  fs.writeFileSync(dest, JSON.stringify(out));
  console.log('wrote ' + path.relative(ROOT, dest) + ' — ' +
    outNodes.length + ' nodes, ' + outLinks.length + ' links, ' +
    Math.round(fs.statSync(dest).size / 1024) + ' KB');
}

main();
