// Probe: what does the corpus hold for the nationalist-movement question?
//
//   node scripts/diag-nationalism.js
//
// Establishes the ceiling before any prose work starts: if half the headings
// have no evidence, a deterministic composer has nothing to connect, and the
// answer is "the corpus cannot answer this", not "the writer is weak".
//
// Now also renders the deterministic essay, so the claim-conditioning filter can
// be judged against real sentences rather than in the abstract. The Bhagat Singh
// and Subhas Chandra Bose headings are the interesting cases: retrieval supplies
// a shooting narrative and an honorific respectively, and the composer is
// expected to refuse both rather than dress them up as a revolutionary stream.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var QB = path.join(ROOT, 'data', 'ask-qb');
var qb = require(path.join(ROOT, 'scripts/lib/ask-qb.js'));
var EE = require(path.join(ROOT, 'scripts/lib/ask-entity-evidence.js'));
var PROSE = require(path.join(ROOT, 'scripts/lib/ask-prose.js'));
var H = require(path.join(ROOT, 'scripts/lib/build-ask-qb-buckets-hash.js'));
var ed = new qb.EntityDir().load(fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8'));

var QUESTION = 'Many voices had strengthened and enriched the nationalist movement during the Gandhian Phase. Elaborate.';

var OUTLINE = [
  ['Base of the movement', 'Indian National Congress', []],
  ['Gandhi and mass politics', 'Mahatma Gandhi', []],
  ['Revolutionary stream', 'Bhagat Singh', []],
  ['Socialist stream', 'Subhas Chandra Bose', []],
  ['Dalit and anti-caste current', 'B. R. Ambedkar', []],
  ['Quit India', 'Quit India Movement', []],
  ['Nationalist idea', 'nationalism', []],
  ['Moderates', 'Moderates', ['Moderate nationalist']],
  ['Peasant movement', 'peasant movement', ['Kisan movement']],
  ['Muslim League', 'Muslim League', ['All-India Muslim League']]
];

var rows = [], want = {}, bytes = 0;
OUTLINE.forEach(function (p) {
  [p[1]].concat(p[2]).forEach(function (t) {
    var bi = H.bucketOf(t, 512);
    if (want[bi]) return;
    want[bi] = 1;
    var fp = path.join(QB, 'bucket', 'bucket.' + bi + '.json');
    if (!fs.existsSync(fp)) return;
    bytes += fs.statSync(fp).size;
    rows = rows.concat(JSON.parse(fs.readFileSync(fp, 'utf8')));
  });
});

var res = EE.retrieve(rows, 'q',
  OUTLINE.map(function (p) { return [p[0], p[1], p[2]]; }), ed, {});

console.log('buckets fetched     ' + Object.keys(want).length);
console.log('bytes fetched       ' + (bytes / 1048576).toFixed(1) + ' MB');
console.log('rows available      ' + rows.length.toLocaleString());
console.log('evidence headings   ' + res.points.filter(function (p) { return p.supported; }).length +
  '/' + OUTLINE.length + '   unquoted ' + res.unquoted.length + '   absent ' + res.absent);

var doc = PROSE.write(QUESTION, OUTLINE, res, { perHeading: 4 });

console.log('');
console.log('='.repeat(78));
console.log(PROSE.toText(doc));
console.log('='.repeat(78));
console.log('');
console.log('written ' + doc.counts.written +
  '   thin ' + doc.counts.thin +
  '   empty ' + doc.counts.empty);
console.log('');
console.log('sentences offered but not written, for relevance:');
doc.paragraphs.forEach(function (p) {
  if (p.rejectedCount) {
    console.log('  ' + p.heading + ': ' + p.rejectedCount +
      ' of ' + (p.rejectedCount + p.sentences.length) + ' dropped, top ' +
      p.topRelevance.toFixed(2));
  }
});