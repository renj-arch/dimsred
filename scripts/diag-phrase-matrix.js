'use strict';
var H = require('./lib/build-ask-qb-buckets-hash.js');
var fs = require('fs');
var path = require('path');
var qb = require('./lib/ask-qb.js');
var QB = path.join(__dirname, '..', 'data', 'ask-qb');
var tsv = fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8');
var ed = new qb.EntityDir().load(tsv);

var terms = ['quit india', 'bhagat singh', 'rift valley', 'el nino',
  'green revolution', 'indian independence', 'non-cooperation', 'rowlatt',
  'salt march', 'hindutva', 'swadeshi', 'peasant movement',
  'hindustan republican', 'quit india movement'];

terms.forEach(function (t) {
  var bi = H.bucketOf(t, 512);
  var f = path.join(QB, 'phrase', 'phrase.' + bi + '.json');
  var hit = null;
  if (fs.existsSync(f)) hit = JSON.parse(fs.readFileSync(f, 'utf8'))[t];
  console.log(t.padEnd(24) +
    'entity=' + (ed.lookup(t) ? 'Y' : 'n') + '  ' +
    (hit ? ('df=' + String(hit.d).padStart(4) + ' buckets=' + String(hit.b.length).padStart(3) +
      '  e=' + JSON.stringify(hit.e.slice(0, 2))) : 'ABSENT'));
});