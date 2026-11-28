// Why did the subject gate fail? Look at what the corpus actually holds for a
// handful of subjects, so the gate's verdict can be checked against reality
// rather than assumed.
'use strict';
var fs = require('fs');
var path = require('path');
var ask = require('../scripts/lib/ask-core.js');

var ROOT = path.join(__dirname, '..');
var dataDir = path.join(ROOT, 'data');
var meta = JSON.parse(fs.readFileSync(path.join(dataDir, 'timeline.json'), 'utf8'));
var parts = [];
for (var p = 0; p < (meta.nodesParts || 0); p++) parts.push('timeline.nodes.' + p + '.json');
var probe = process.argv[2] || 'Indian National Congress';
var terms = ask.tokens(probe);

var hits = [];
parts.forEach(function (p) {
  var f = path.join(dataDir, p);
  var data = JSON.parse(fs.readFileSync(f, 'utf8'));
  var nodes = data.nodes || data;
  nodes.forEach(function (n) {
    var nameN = ask.norm(n.name);
    if (nameN.indexOf(ask.norm(probe)) === -1) return;
    hits.push({
      id: n.id,
      name: n.name,
      words: ask.wordCount(n.desc || ''),
      quoteable: ask.isQuoteable(n.desc || ''),
      desc: (n.desc || '').slice(0, 220)
    });
  });
});

console.log('probe: "' + probe + '"   name-contains matches: ' + hits.length + '\n');
hits.sort(function (a, b) { return b.words - a.words; });
hits.slice(0, 14).forEach(function (h) {
  console.log((h.quoteable ? 'OK   ' : 'thin ') + '[' + String(h.words).padStart(3) + 'w] ' + h.name);
  console.log('       ' + h.desc);
});
if (!hits.length) console.log('(no node title contains that string)');
console.log('\ntokens of probe: ' + terms.join(' '));
