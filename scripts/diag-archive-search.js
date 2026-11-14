// Locate the archive search implementation so its data files can be reused as a
// fallback for unresolved Ask headings.
//
//   node scripts/diag-archive-search.js
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');

var html = fs.readFileSync(path.join(ROOT, 'archive.html'), 'utf8');
console.log('archive.html bytes: ' + html.length);

console.log('');
console.log('--- external scripts referenced');
var scripts = html.match(/<script[^>]*src=['"][^'"]+['"]/g) || [];
scripts.forEach(function (x) { console.log('  ' + x); });

console.log('');
console.log('--- data files referenced');
var seen = {};
(html.match(/[A-Za-z0-9_\/\.\-]+\.(json|tsv)/g) || []).forEach(function (x) {
  if (seen[x]) return;
  seen[x] = 1;
  var p = path.join(ROOT, x);
  var ok = fs.existsSync(p);
  var mb = ok ? (fs.statSync(p).size / 1048576).toFixed(2) : '-';
  console.log('  ' + (ok ? 'ok ' : 'MISSING') + '  ' + (mb + ' MB').padEnd(10) + x);
});

console.log('');
console.log('--- candidate search modules under js/ and scripts/');
['js', 'scripts'].forEach(function (d) {
  var dir = path.join(ROOT, d);
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(function (f) {
    if (!/\.js$/.test(f)) return;
    if (/search|index|archive|lookup/i.test(f)) console.log('  ' + d + '/' + f);
  });
});

console.log('');
console.log('--- what the questions tree looks like');
var qdir = path.join(ROOT, 'data', 'questions');
if (fs.existsSync(qdir)) {
  var files = fs.readdirSync(qdir).filter(function (f) { return /\.json$/.test(f); });
  console.log('  files: ' + files.length);
  console.log('  total: ' + (fs.readdirSync(qdir).reduce(function (n, f) {
    return n + fs.statSync(path.join(qdir, f)).size;
  }, 0) / 1048576).toFixed(1) + ' MB');
  var one = JSON.parse(fs.readFileSync(path.join(qdir, files[0]), 'utf8'));
  var rec = Array.isArray(one) ? one[0] : (one.questions || one.records || [])[0];
  console.log('  record keys: ' + (rec ? Object.keys(rec).join(', ') : '(unknown shape)'));
} else {
  console.log('  data/questions not present');
}