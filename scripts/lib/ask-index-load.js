// ask-index-load.js -- read the built retrieval index, shards included.
//
// The index ships as `data/ask-index.json` (thin-title table, category
// histogram, links) plus `data/ask-index-nodes.<i>.json` shards holding the
// quotable sentence rows. The split exists because Cloudflare Pages rejects any
// single asset over 25 MiB and the 214k rows are ~46 MB. See
// scripts/build-ask-index.js. This loader hides the split from every Node
// consumer so none of them has to know how many shards there are.
//
//   var index = require('./lib/ask-index-load.js').read(ROOT);
//   index.nodes   // the decoded-shape rows, concatenated across shards
//   index.meta    // nodeShards, nodesKept, builtAt, ...
'use strict';
var fs = require('fs');
var path = require('path');

function read(root) {
  var data = path.join(root, 'data');
  var index = JSON.parse(fs.readFileSync(path.join(data, 'ask-index.json'), 'utf8'));
  var nodes = [];
  var shards = (index.meta && index.meta.nodeShards) || 0;
  for (var i = 0; i < shards; i++) {
    var f = path.join(data, 'ask-index-nodes.' + i + '.json');
    if (!fs.existsSync(f)) {
      throw new Error('ask-index-load: meta.nodeShards is ' + shards + ' but ' +
        path.basename(f) + ' is missing; rebuild with scripts/build-ask-index.js');
    }
    nodes = nodes.concat(JSON.parse(fs.readFileSync(f, 'utf8')));
  }
  // Backward compatibility with the pre-split single-file layout, so a checkout
  // that has not rebuilt yet still loads.
  if (!shards && Array.isArray(index.nodes)) nodes = index.nodes;
  index.nodes = nodes;
  return index;
}

module.exports = { read: read };
