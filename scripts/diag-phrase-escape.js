// Probe: can the composing phrase filter rescue the headings the entity path
// refused?
//
//   node scripts/diag-phrase-escape.js
//
// The essay writer refused "Revolutionary stream" (Bhagat Singh, relevance 0.06)
// and "Socialist stream" (Subhas Chandra Bose, 0.04) because entity retrieval
// supplied a shooting narrative and an honorific. If the phrase index can surface
// on-claim sentences owned by other entities, the claim-conditioning filter has
// something to work with. If it cannot, then the limit is corpus coverage and no
// amount of retrieval will fix it, and that needs saying plainly.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var QB = path.join(ROOT, 'data', 'ask-qb');
var H = require(path.join(ROOT, 'scripts/lib/build-ask-qb-buckets-hash.js'));
var PROSE = require(path.join(ROOT, 'scripts/lib/ask-prose.js'));

// Each case carries a domain. Without one, the composer accepts any entity whose
// vocabulary overlaps the heading, which put "2014 Serbian parliamentary election"
// under "Socialist stream" and a Harpoon missile under "Dalit and anti-caste".
var INDIA = ['india', 'indian', 'bengal', 'bengali', 'bihar', 'bombay', 'punjab',
  'congress', 'gandhi', 'bharat', 'hind', 'muslim', 'sindh', 'maratha', 'tamil',
  'bose', 'singh', 'ambedkar', 'nehru', 'gokhale', 'tilak', 'jinnah', 'lal'];

// A shared INDIA list was too blunt for the Dalit case: it refused 67,012 of
// 67,900 sentences and rejected the real evidence, because "Scheduled Castes and
// Scheduled Tribes" and "Christianity in Pakistan" both carry on-claim sentences
// while neither containing "india". Each heading therefore declares its own
// admissible subjects, which is authored judgement and is stated as such.
var CASES = [
  ['Revolutionary stream', 'Bhagat Singh',
    INDIA.concat(['revolutionary', 'hindustan republican', 'naujawan', 'soch',
      'ina', 'indian national army', 'lal', 'azad'])],
  // "socialist" as a bare domain term admits any socialist party on earth, and the
  // gate then approved "International Working Union of Socialist Parties". A domain
  // term must narrow a subject area, not name an ideology that is globally shared.
  ['Socialist stream', 'Subhas Chandra Bose',
    INDIA.concat(['lohia', 'forward bloc', 'economy of south india',
      'socialist party of india', 'andhra pradesh', 'bengal congress socialist'])],
  ['Dalit and anti-caste current', 'B. R. Ambedkar',
    ['dalit', 'ambedkar', 'caste', 'scheduled castes', 'scheduled tribes',
      'untouchab', 'christianity in pakistan', 'hinduism', 'buddhis', 'maharasht',
      'bhim', 'constitution of india', 'social justice', 'poverty', 'hindu',
      'india', 'indian']],
  ['Peasant movement', 'peasant movement',
    ['kisan', 'peasant', 'agrarian', 'farmer', 'rural', 'land', 'agricultur', 'india', 'indian']],
  ['Moderates', 'Moderates',
    INDIA.concat(['moderate', 'extremist', 'swadeshi', 'gokhale', 'tilak',
      'lal bal pal', 'session', 'lal'])]
];

// Claims phrased for the corpus's own vocabulary. Each is what an author would
// write if they wanted the sentences that actually exist.
var RESCUE_TERMS = {
  'Revolutionary stream': ['bhagat singh', 'revolutionary', 'hindustan republican', 'soch', 'inquilab'],
  'Socialist stream': ['subhas chandra bose', 'socialist', 'forward bloc', 'azad hind', 'ina'],
  'Dalit and anti-caste current': ['ambedkar', 'dalit', 'untouchability', 'anti caste', 'depressed classes'],
  'Peasant movement': ['kisan', 'peasant', 'agrarian'],
  'Moderates': ['moderate', 'extremist', 'gopal krishna gokhale']
};

function loadPhraseIndex(term) {
  var bi = H.bucketOf(term, 512);
  var fp = path.join(QB, 'phrase', 'phrase.' + bi + '.json');
  if (!fs.existsSync(fp)) return null;
  var idx = JSON.parse(fs.readFileSync(fp, 'utf8'));
  return idx[term.toLowerCase()] || null;
}

function loadBuckets(list) {
  var rows = [], bytes = 0;
  list.forEach(function (b) {
    var fp = path.join(QB, 'bucket', 'bucket.' + b + '.json');
    if (!fs.existsSync(fp)) return;
    bytes += fs.statSync(fp).size;
    rows = rows.concat(JSON.parse(fs.readFileSync(fp, 'utf8')));
  });
  return { rows: rows, bytes: bytes };
}

CASES.forEach(function (c) {
  var heading = c[0], entity = c[1], domains = c[2];
  var terms = RESCUE_TERMS[heading] || [];

  // Union of every bucket any rescue term lives in, capped.
  var buckets = {}, resolved = [];
  terms.forEach(function (t) {
    var e = loadPhraseIndex(t);
    if (!e) return;
    resolved.push(t);
    e.b.forEach(function (b) { buckets[b] = 1; });
  });
  var list = Object.keys(buckets).map(Number);
  if (!list.length) {
    console.log('');
    console.log('## ' + heading);
    console.log('   no rescue term is in the phrase index; nothing to search');
    return;
  }
  if (list.length > 24) list = list.slice(0, 24);

  var got = loadBuckets(list);
  var evidence = [];
  got.rows.forEach(function (row) {
    var name = row[0] || '';
    var sents = row[1] || [];
    sents.forEach(function (s) {
      evidence.push({ sentence: s, entity: name, trust: 'ok', cats: row[2] || [] });
    });
  });

  var para = PROSE.paragraph(heading, entity, evidence, { perHeading: 6, domains: domains });

  console.log('');
  console.log('## ' + heading + '   (' + entity + ')');
  console.log('   rescue terms found in phrase index: ' + (resolved.join(', ') || 'none'));
  console.log('   buckets ' + list.length + '  ' + (got.bytes / 1048576).toFixed(1) +
    ' MB  rows ' + got.rows.length.toLocaleString() +
    '  sentences offered ' + evidence.length.toLocaleString());
  console.log('   RESULT: ' + para.status.toUpperCase() +
    '   topRelevance ' + para.topRelevance.toFixed(2) +
    '   kept ' + para.sentences.length + ' of ' + evidence.length +
    '   off-domain refused ' + para.rejectedDomain);

  (para.sentences || []).slice(0, 3).forEach(function (s) {
    console.log('     [' + s.entity + '] ' + s.sentence.slice(0, 96));
  });
});