// Probe: does the phrase index resolve the terms entity lookup cannot?
//
//   node scripts/diag-phrase-lookup.js
//
// The motivating cases are "el nino" and "water mass", both of which exist verbatim
// in the corpus while resolving to no entity. Also checks that a nonsense term does
// not resolve, because an index that invents hits is worse than no index.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var QB = path.join(ROOT, 'data', 'ask-qb');
var H = require(path.join(ROOT, 'scripts/lib/build-ask-qb-buckets-hash.js'));
var qb = require(path.join(ROOT, 'scripts/lib/ask-qb.js'));

var ed = new qb.EntityDir().load(fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8'));

var TERMS = [
  ['el nino', false],
  ['water mass', false],
  ['rift valley', false],
  ['north pacific', false],
  ['quit india', true],
  ['pelagic thresher', true],
  ['indian national congress', true],
  ['antiobiotic', true],
  ['antarctic bottom water', true],
  ['zzzqqx nonexistent gibberish', false]
];

console.log('term                                  entity  phrase  df   buckets');
console.log('');
var agree = 0, disagree = 0, misses = 0, falsePositives = 0;

TERMS.forEach(function (t) {
  var term = t[0], expectEntity = t[1];
  var ent = ed.lookup(term);
  var bi = H.bucketOf(term, 512);
  var idx = JSON.parse(fs.readFileSync(path.join(QB, 'phrase', 'phrase.' + bi + '.json'), 'utf8'));
  var ph = idx[term.toLowerCase()];

  var eS = ent ? 'yes' : 'no ';
  var pS = ph ? 'yes' : 'no ';
  if (!!ent === !!ph) agree++; else disagree++;
  if (expectEntity && !ent) { falsePositives++; }
  if (!expectEntity && !ent && !ph) misses++;

  console.log(('  ' + term).slice(0, 38) +
    ('   ' + eS).slice(-4) + ('   ' + pS).slice(-7) +
    (ph ? ('  ' + String(ph.d).padStart(5) + '  ' + ph.b.length) : '     -       -'));
  if (ph) {
    console.log('        via: ' + ph.e.slice(0, 3).join(' | ') +
      (ph.e.length > 3 ? '  (+' + (ph.e.length - 3) + ' more)' : ''));
  }
});

console.log('');
console.log('entity and phrase index agree on: ' + agree + '/' + TERMS.length);
console.log('disagreements: ' + disagree);
console.log('terms with neither route: ' + misses);
console.log('');
console.log('The disagreements are the point. Entity lookup alone reports "absent"');
console.log('for a term the corpus contains; the phrase index names the buckets and');
console.log('the owning entities, so the sentence becomes reachable.');