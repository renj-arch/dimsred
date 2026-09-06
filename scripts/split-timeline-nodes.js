// One-off migration helper: repackage an existing bundled data/timeline.json
// ({ builtAt, eras, nodes, links }) into a small manifest plus per-part node files
// (data/timeline.nodes.{N}.json), each well under Cloudflare Pages' 25 MiB cap.
// This saves re-deriving node spans (slow) when a commit already shipped the data.
// Idempotent: skips when data/timeline.json already carries nodesParts.
// Usage: node scripts/split-timeline-nodes.js
var fs = require('fs');
var path = require('path');

var TIMELINE_DIR = path.join(__dirname, '..', 'data');
var OUT = path.join(TIMELINE_DIR, 'timeline.json');
var NODES_PART_BYTES = 20 * 1024 * 1024;

var raw = fs.readFileSync(OUT, 'utf8');
var out = JSON.parse(raw);
if (out.nodesParts) {
  console.log('data/timeline.json already sharded (' + out.nodesParts + ' parts) — nothing to do');
  process.exit(0);
}
var nodes = out.nodes;
delete out.nodes;

var staleParts = [];
try { staleParts = fs.readdirSync(TIMELINE_DIR).filter(function (f) { return /^timeline\.nodes\.\d+\.json$/.test(f); }); } catch (e) { staleParts = []; }
for (var staleFile of staleParts) { try { fs.unlinkSync(path.join(TIMELINE_DIR, staleFile)); } catch (e) { } }

var nodeParts = [], curPart = [], curBytes = 0, nodeJson = '';
for (var nd of nodes) {
  nodeJson = JSON.stringify(nd);
  curBytes += nodeJson.length;
  if (curBytes > NODES_PART_BYTES && curPart.length) {
    nodeParts.push(curPart);
    curPart = [];
    curBytes = nodeJson.length;
  }
  curPart.push(nd);
}
if (curPart.length) nodeParts.push(curPart);

out.nodesParts = nodeParts.length;
var partSizes = [];
for (var pi = 0; pi < nodeParts.length; pi++) {
  var partFile = path.join(TIMELINE_DIR, 'timeline.nodes.' + pi + '.json');
  fs.writeFileSync(partFile, JSON.stringify(nodeParts[pi]));
  partSizes.push(fs.statSync(partFile).size);
}
fs.writeFileSync(OUT, JSON.stringify(out));

console.log('Split ' + nodes.length + ' nodes into ' + nodeParts.length + ' parts: ' + partSizes.map(function (s) { return (s / 1048576).toFixed(2) + ' MiB'; }).join(', '));
console.log('Manifest data/timeline.json now ' + (fs.statSync(OUT).size / 1048576).toFixed(2) + ' MiB');