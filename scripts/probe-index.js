// What quotable index entries exist for the WTO-agriculture question? Shows
// whether a refusal means "corpus has nothing" or "our subject matcher missed".
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var data = require('./lib/ask-index-load.js').read(ROOT);
var pats = process.argv.slice(2);
if (!pats.length) pats = ['subsid', 'world trade', 'agreement on agriculture', 'agriculture'];
pats.forEach(function (p) {
  console.log('--- ' + p);
  var hits = data.nodes.filter(function (a) {
    return String(a[1]).toLowerCase().indexOf(p) !== -1;
  });
  console.log('    (' + hits.length + ' title matches)');
  hits.slice(0, 8).forEach(function (a) {
    console.log('  [' + a[1] + '] ' + String(a[4]).slice(0, 150));
  });
});
