'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var qb = require('./lib/ask-qb.js');
var d = new qb.EntityDir().load(fs.readFileSync(path.join(ROOT, 'data/ask-qb/entities.tsv'), 'utf8'));

var TERMS = ['Bab-el-Mandeb', 'bab el mandeb', 'supply chain', 'SLOC', 'SAGAR', 'Sagar taluk',
  'Andaman and Nicobar', 'Lakshadweep', 'piracy', 'coastline', 'Strait of Hormuz', 'energy security'];

console.log('=== EntityDir.lookup (exact) ===');
TERMS.forEach(function (t) {
  var ids = d.lookup(t);
  console.log('  ' + t.padEnd(22) + ' -> ' + (ids ? JSON.stringify(ids) : 'null'));
});

console.log('');
console.log('=== prefixLookup ===');
['sagar', 'bab el', 'supply chain', 'lakshadweep', 'coastline', 'piracy'].forEach(function (p) {
  var r = d.prefixLookup(p, 6);
  console.log('  ' + p.padEnd(16) + ' -> ' + JSON.stringify(r).slice(0, 190));
});

console.log('');
console.log('=== candidates() ===');
['SAGAR', 'maritime domain awareness', 'Indian Ocean Region'].forEach(function (t) {
  var r = d.candidates(t);
  console.log('  ' + t);
  console.log('     ' + JSON.stringify(r).slice(0, 240));
});

console.log('');
console.log('=== what norm() does to the spelling ===');
['Bab-el-Mandeb', 'bab el mandeb', 'SAGAR', 'supply chain', 'Andaman and Nicobar']
  .forEach(function (t) { console.log('  ' + JSON.stringify(t) + ' -> ' + JSON.stringify(qb.norm(t))); });
