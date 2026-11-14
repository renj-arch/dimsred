'use strict';
// Shared reader for the timeline's co-occurrence links.
//
// The links array is ~25 MiB, so build-timeline.js writes it as
// data/timeline-links.<i>.json and keeps only `linksParts` in the manifest.
// Older manifests embedded `links` directly. Every build script that needs
// the links goes through this helper so both shapes keep working.

var fs = require('fs');
var path = require('path');

function loadLinks(meta, dataDir) {
  if (Array.isArray(meta && meta.links)) return meta.links;
  var dir = dataDir || path.join(__dirname, '..', '..', 'data');
  var count = (meta && meta.linksParts) || 0;
  var out = [];
  for (var i = 0; i < count; i++) {
    var file = path.join(dir, 'timeline-links.' + i + '.json');
    out = out.concat(JSON.parse(fs.readFileSync(file, 'utf8')));
  }
  return out;
}

module.exports = { loadLinks: loadLinks };
