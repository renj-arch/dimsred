// Focused check on the question-grammar layer, isolated from retrieval so a
// regression in "what is this question about?" is diagnosable on its own.
'use strict';
var ask = require('../scripts/lib/ask-core.js');

var CASES = [
  ['Examine whether the constitutional office of the Lok Sabha Speaker has become vulnerable to partisan politics under the current anti-defection regime. What institutional changes are required to ensure the neutrality of the Lok Sabha Speaker in managing a polarised House?', 'Lok Sabha Speaker'],
  ['What were the aims and outcomes of the Indian National Congress at its founding in 1885?', 'Indian National Congress'],
  ['Discuss the environmental impact of the Bhopal gas tragedy.', 'Bhopal'],
  ['What is the anti-defection law in India?', 'India'],
  ['Critically examine the role of the NGT in environmental protection in India.', 'NGT']
];

var fails = 0;
CASES.forEach(function (c) {
  var prop = ask.properNounRun(c[0]);
  var subj = ask.subjectOf(c[0]) || prop;
  if (prop.split(' ').length > subj.split(' ').length) subj = prop;
  var ok = subj.toLowerCase().indexOf(c[1].toLowerCase()) !== -1;
  if (!ok) fails++;
  console.log((ok ? '  pass  ' : '  FAIL  ') + 'expected subject ~ "' + c[1] + '"');
  console.log('         properNounRun: "' + prop + '"');
  console.log('         subjectOf    : "' + subj + '"');
  console.log('         type         : ' + ask.analyse(c[0]).type);
});
console.log('\n' + (fails ? 'FAILED: ' + fails : 'subject detection ok'));
process.exit(fails ? 1 : 0);
