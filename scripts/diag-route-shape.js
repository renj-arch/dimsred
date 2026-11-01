'use strict';
// Inspect how the router resolves a phrase, and what it would need to route
// "scientific temper".
var ask = require('./lib/ask-core.js');

var routes = ask.conceptRoutes;
console.log('=== shape of an existing route ===');
console.log('science and technology: ' + JSON.stringify(routes['science and technology']));
console.log('');
console.log('education: ' + JSON.stringify(routes['education']));
console.log('');
console.log('social justice: ' + JSON.stringify(routes['social justice']));
console.log('');

console.log('=== route lookup on the question ===');
var q = 'examine the role of scientific temper in addressing contemporary social ' +
  'and developmental challenges in india';
console.log('question: ' + q);
console.log('subjectOf: ' + JSON.stringify(ask.subjectOf(q)));
if (typeof ask.routeFor === 'function') {
  console.log('routeFor: ' + JSON.stringify(ask.routeFor(q)));
}
console.log('conceptPhrasesFor("scientific temper"): ' +
  JSON.stringify(ask.conceptPhrasesFor('scientific temper')));
console.log('conceptPhrasesFor("science"): ' +
  JSON.stringify(ask.conceptPhrasesFor('science')));
console.log('');

console.log('=== every route key, for gap comparison ===');
var keys = Object.keys(routes).sort();
for (var i = 0; i < keys.length; i += 3) {
  console.log('  ' + keys.slice(i, i + 3).map(function (k) { return k.padEnd(30); }).join(''));
}