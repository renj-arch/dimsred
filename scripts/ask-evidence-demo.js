// Build shard rows for a category slice, with provenance attached.
//
//   node scripts/ask-evidence-demo.js
//   node scripts/ask-evidence-demo.js "a mains question"
//
// WHY: this exists to exercise scripts/lib/ask-evidence.js, the retrieval path
// that scores SENTENCE TEXT rather than the entity name. The evidence shards
// cannot be built on this machine (~838 MB over 135 categories), but that is
// irrelevant to what is being tested here: scoreShard() selects an entity only
// when its NAME matches the question, which returned 0 evidence for all three
// concepts of the land-degradation question because the sentences are filed
// under unrelated topics ("Agriculture in Ethiopia", "Biofertilizer"). Ranking
// on text works on a slice and will work on the shards, since the rows have the
// same shape. What the slice cannot prove is that the shards are DEPLOYED, and
// that is still an outstanding blocker.
//
// Rows are built exactly as scripts/build-ask-qb.js builds them: the `fact`
// field split into sentences, capped per record and per entity. Provenance is
// carried in a 4th element so every sentence can be attributed when displayed.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var EV = require('./lib/ask-evidence.js');

var MAX_SENTENCES_PER_RECORD = 4;
var MAX_SENTENCES_PER_ENTITY = 24;

// IOR material is spread across Defence & Security, International Relations,
// Indian Geography and the economy, which is the concrete demonstration that a
// category must not be used as a relevance filter.
var SLICE = [
  'defence-security.json', 'defence-security-2.json', 'defence-security-3.json',
  'india-international-relations.json', 'international-relations.json',
  'international-relations-2.json', 'indian-geography.json', 'indian-economy.json',
  'agriculture-food.json', 'agriculture-food-2.json'
];

// The claims a mains answer on this question must establish. Scoring the ANSWER
// rather than the QUESTION is the fix for false confidence: bag-of-words
// reported "11/12 covered" by matching SAGAR to an Indus-basin place name and
// "maritime domain awareness" to a domain squatter in the .ly zone.
var POINTS = [
  ['1. Economic security: sea-borne trade', ['sea', 'trade', 'export']],
  ['   - SLOC disruption affects supply chains', ['shipping', 'supply']],
  ['2. Energy security: imported hydrocarbons', ['import', 'oil']],
  ['   - Strait of Hormuz carries energy', ['hormuz']],
  ['3. Maritime frontier: coastline and territorial waters', ['coastline', 'territorial']],
  ['4. Island territories: Andaman and Nicobar', ['andaman']],
  ['   - Lakshadweep, western Indian Ocean', ['lakshadweep']],
  ['5. Geopolitical competition: extra-regional powers', ['china']],
  ['6. Chokepoints: Bab-el-Mandeb', ['bab']],
  ['7. Non-traditional threats: piracy', ['piracy']],
  ['8. Regional influence: SAGAR', ['sagar']],
  ['Way forward: maritime domain awareness', ['maritime', 'awareness']]
];

function splitSentences(text) {
  return String(text || '').split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}

function buildRows() {
  var ents = {};
  var seen = {};
  var cats = {};
  var records = 0, kept = 0;
  SLICE.forEach(function (f) {
    var p = path.join(ROOT, 'data', 'questions', f);
    if (!fs.existsSync(p)) { console.log('  (missing) ' + f); return; }
    var parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    Object.keys(parsed).forEach(function (cat) {
      var subs = parsed[cat] && parsed[cat].subSubjects;
      if (!subs || typeof subs !== 'object') return;
      cats[cat] = 1;
      Object.keys(subs).forEach(function (ss) {
        var arr = subs[ss];
        if (!Array.isArray(arr)) return;
        arr.forEach(function (rec) {
          if (!rec || typeof rec.fact !== 'string' || !rec.fact.trim()) return;
          records++;
          var name = (rec.subSubject || ss || '').trim();
          if (!name) return;
          var sents = splitSentences(rec.fact).slice(0, MAX_SENTENCES_PER_RECORD);
          if (!sents.length) return;
          if (!ents[name]) {
            ents[name] = { name: name, sents: [], meta: [], cats: {} };
          }
          ents[name].cats[cat] = 1;
          sents.forEach(function (s) {
            var k = s.slice(0, 160);
            if (seen[name + '\u0000' + k]) return;
            seen[name + '\u0000' + k] = 1;
            if (ents[name].sents.length >= MAX_SENTENCES_PER_ENTITY) return;
            ents[name].sents.push(s);
            ents[name].meta.push({ source: rec.source || null, pubDate: rec.pubDate || null });
            kept++;
          });
        });
      });
    });
  });
  var rows = Object.keys(ents).map(function (k) {
    return [ents[k].name, ents[k].sents, Object.keys(ents[k].cats), ents[k].meta];
  }).filter(function (r) { return r[1].length; });
  return { rows: rows, records: records, kept: kept, cats: Object.keys(cats) };
}

var QUESTION = process.argv[2] ||
  "Discuss the significance of the Indian Ocean Region for India's national security";

var built = buildRows();
console.log('=== slice ===');
console.log('  files=' + SLICE.length + '  records=' + built.records +
  '  sentences=' + built.kept + '  entities=' + built.rows.length);
console.log('  categories touched: ' + built.cats.join(', '));
console.log('');
console.log('=== question ===');
console.log('  ' + QUESTION);
console.log('');

var res = EV.retrieve(built.rows, QUESTION, { points: POINTS, perConcept: 4 });

console.log('=== decomposed concepts: ' + res.concepts.join(' | ') + ' ===');
console.log('');
res.byConcept.forEach(function (b) {
  console.log('  "' + b.concept + '"  -> ' + b.evidence.length + ' sentences');
  b.evidence.forEach(function (e) {
    console.log('     (' + e.score.toFixed(1) + ') [' + e.trust.state + '] ' + e.entity);
    console.log('        "' + e.sentence.slice(0, 165) + '"');
  });
  console.log('');
});

console.log('=== required points (the answer\'s claims) ===');
console.log('');
res.points.forEach(function (p) {
  if (p.supported) {
    console.log('  SUPPORTED  ' + p.label);
    console.log('             (' + p.best.score.toFixed(1) + ') ' + p.best.trust.state +
      '  ' + p.best.entity);
    console.log('             "' + p.best.sentence.slice(0, 155) + '"');
  } else {
    console.log('  GAP        ' + p.label + '   (needs: ' + p.terms.join(' + ') + ')');
    // A weak lead is a token match that is not real support. Showing it keeps
    // the gap honest and gives a reader something to check, without letting it
    // count as coverage.
    if (p.weak) {
      console.log('             weak lead only (' + (p.weak.coverage * 100).toFixed(0) +
        '% of terms, ' + p.weak.entity + '):');
      console.log('               "' + p.weak.sentence.slice(0, 140) + '"');
    }
  }
});
console.log('');
console.log('=== summary ===');
console.log('  concepts covered : ' + (res.total - res.gaps.filter(function (g) {
  return g.kind === 'concept';
}).length) + '/' + res.total);
console.log('  points covered   : ' + res.covered + '/' + res.pointTotal);
console.log('  evidence         : ' + res.evidence + ' sentences, all verbatim from `fact`');
console.log('  provenance       : ok=' + res.provenance.ok + ' flagged=' + res.provenance.flagged +
  ' unverified=' + res.provenance.unverified);
console.log('  relationship     : NOT established by this module');
console.log('');
if (res.gaps.length) {
  console.log('  gaps that must be shown to the reader, not hidden:');
  res.gaps.forEach(function (g) {
    console.log('    - ' + (g.kind === 'point' ? 'point' : 'concept') + ': ' + g.label);
  });
  console.log('');
}
console.log('  NOTE: ' + res.note);
