// What is actually inside concepts.json, and can it carry aliases?
//
//   node scripts/diag-concepts.js
//
// The alias fix depends on this file's shape, so it is read rather than assumed.
'use strict';
var c = require('../data/ask-qb/concepts.json');
var keys = Object.keys(c.concepts);
console.log('builtAt        : ' + c.builtAt);
console.log('totalSentences : ' + c.totalSentences);
console.log('maxPhraseDf    : ' + c.maxPhraseDf);
console.log('minSentences   : ' + c.minSentences);
console.log('concepts       : ' + keys.length + ' entries');
console.log('');
console.log('value type of concepts[name]: ' + typeof c.concepts[keys[0]]);
console.log('');
console.log('first 8 entries:');
keys.slice(0, 8).forEach(function (k) {
  console.log('  ' + JSON.stringify(k) + ' -> ' + JSON.stringify(c.concepts[k]));
});

console.log('');
var probe = ['water stress', 'water scarcity', 'ocean current', 'monsoon',
  'groundwater depletion', 'food security', 'sea trade', 'energy security'];
probe.forEach(function (p) {
  var hit = keys.indexOf(p);
  console.log('  ' + (p + '                          ').slice(0, 30) +
    (hit === -1 ? 'not a concept' : 'concepts[' + p + '] = ' + JSON.stringify(c.concepts[p])));
});

console.log('');
console.log('Longest keys, to see the phrasing style:');
keys.slice().sort(function (a, b) { return b.length - a.length; }).slice(0, 12)
  .forEach(function (k) { console.log('  ' + k + '  (' + k.split(' ').length + ' words)'); });