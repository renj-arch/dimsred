// Isolate the three defects seen in the demo output.
'use strict';
var fs = require('fs');
var EV = require('./lib/ask-evidence.js');
var ROOT = require('path').join(__dirname, '..');

console.log('--- 1. decompose on the IOR question ---');
var q = "Discuss the significance of the Indian Ocean Region for India's national security";
console.log('  ' + JSON.stringify(EV.decompose(q)));
console.log('  -> a mains question with one subject should stay ONE concept;');
console.log('     splitting on "of"/"and" is only right for "relationship between A, B and C".');
console.log('');

console.log('--- 2. does documents() carry provenance through? ---');
var parsed = JSON.parse(fs.readFileSync(ROOT + '/data/questions/defence-security.json', 'utf8'));
var subs = parsed[Object.keys(parsed)[0]].subSubjects;
var ss = Object.keys(subs)[0];
var rec = subs[ss][0];
console.log('  record.source  = ' + JSON.stringify(rec.source));
console.log('  record.pubDate = ' + JSON.stringify(rec.pubDate));
var rows = [[ss, ['alpha beta', 'sagar dam bhakra'], ['Defence and Security'],
  [{ source: rec.source, pubDate: rec.pubDate }, { source: rec.source, pubDate: rec.pubDate }]]];
var docs = EV.documents(rows);
console.log('  documents() -> ' + docs.length + ' docs');
console.log('  doc.source  = ' + JSON.stringify(docs[0].source));
console.log('  doc.pubDate = ' + JSON.stringify(docs[0].pubDate));
console.log('  trust()     = ' + JSON.stringify(EV.trust(docs[0], {})));
console.log('  -> if source is null here, the "unverified" flood is a plumbing bug,');
console.log('     not a property of the corpus.');
console.log('');

console.log('--- 3. why does an Indus-basin dam satisfy "sagar"? ---');
var st = EV.stats([{ sentence: 'Many of the rivers of the Indus River system are dammed to create large reservoirs of water: in India the Satluj river is dammed at Bhakra creating the Gobind Sagar reservoir' }]);
var t = EV.contentTokens('sagar');
console.log('  tokens("sagar") = ' + JSON.stringify(t));
console.log('  hasStem(sentence tokens, "sagar") = ' +
  require('./lib/ask-qb.js').hasStem(EV.contentTokens(
    'Many of the rivers of the Indus River system are dammed at Bhakra creating the Gobind Sagar reservoir'), 'sagar'));
console.log('  -> "Gobind Sagar" is a proper noun containing the query token.');
console.log('     hasStem is doing its job (token identity, not substring), but a');
console.log('     single rare token is NOT enough to claim a point is supported.');
console.log('     The real fix is requiring the concept phrase or a term-role match,');
console.log('     and refusing to mark a point supported on one token alone.');
console.log('');

console.log('--- 4. hasStem on a genuinely absent term ---');
console.log('  hasStem(tokens("Bhakra creating the Gobind Sagar reservoir"), "bab") = ' +
  require('./lib/ask-qb.js').hasStem(EV.contentTokens(
    'Bhakra creating the Gobind Sagar reservoir'), 'bab'));
console.log('  -> correct. So the Bab-el-Mandeb GAP is a genuine absence, not a bug.');
