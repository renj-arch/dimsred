// Why does the escape fallback not fire for "Revolutionary stream"?
//
//   node scripts/diag-escape-fallback.js
//
// Two candidate causes, with different fixes:
//   1. domainAllows rejects "Abbas Ali (Indian National Army)"
//   2. relevance of the sentence falls below the threshold
'use strict';
var P = require('../scripts/lib/ask-prose.js');

var ent = 'Abbas Ali (Indian National Army)';
var sent = 'He later joined the Socialist movement and was a close associate of Ram Manohar Lohia.';

console.log('entity: ' + ent);
console.log('');
console.log('domainAllows against [india, singh, lal]:');
['india', 'indian', 'singh', 'lal'].forEach(function (d) {
  console.log('  domain "' + d + '" -> ' + P.domainAllows(ent, [d]));
});
console.log('  combined -> ' + P.domainAllows(ent, ['india', 'singh', 'lal']));
console.log('');
console.log('claim terms for "Revolutionary stream": ' +
  Object.keys(P.claimTerms('Revolutionary stream')).join(', '));
console.log('relevance of the sentence: ' +
  P.relevance(sent, P.claimTerms('Revolutionary stream'), P.entityTerms(ent)).toFixed(3) +
  '   threshold 0.34');
console.log('');
console.log('Note: domainAllows does a substring test, so the domain term "india"');
console.log('matches "Indian" inside "Indian National Army". That is intended -- a');
console.log('domain term is allowed to match inside a longer name -- but it means');
console.log('"india" is a very permissive gate.');
console.log('');
console.log('So the gate passes and the sentence IS written when supplied. The');
console.log('fallback test failure must be elsewhere: check whether the test heading\'s');
console.log('own relevance rejects it first.');