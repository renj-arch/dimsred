// Can the corpus produce a mains-style structured answer? A per-heading audit.
//
//   node scripts/qb-coverage-test.js
//   node scripts/qb-coverage-test.js "a mains question"
//
// WHY THIS SCRIPT: the point of question is not "is there any sentence about the
// topic" -- the corpus obviously has thousands. It is whether the specific
// ARGUMENTS a mains answer makes are individually recoverable, because an answer
// is only as good as its weakest required point. A retrieval engine that answers
// 6 of 8 headings confidently is worse than one that answers 3 and admits 5 are
// missing, because the gap is invisible to the reader.
//
// So this scores the required points, not the topic, and prints a coverage table
// with the missing ones named. Sentences are still verbatim slices of a record's
// `fact`, and scoring is the BM25-style text relevance from qb-slice-test.js.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var QB = require('./lib/ask-qb.js');

var MAX_SENTENCES_PER_RECORD = 4;
var MAX_SENTENCES_PER_ENTITY = 24;

var STOP = {};
('a an the of and or in on at to for with by from as is were are be been being has have had this ' +
  'that these those it its their his her they them we you i not no than then so such which who whom ' +
  'what when where how why into over under about between among during each other some any all more most ' +
  'less least very can could may might must shall should will would do does did done').split(' ')
  .forEach(function (w) { STOP[w] = 1; });

function contentTokens(s) {
  return QB.tokens(s).filter(function (t) { return !STOP[t]; });
}

function splitSentences(text) {
  return String(text || '').split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}

// The headings a mains answer on this question has to make, each with the terms
// that evidence it would have to contain. These are the ANSWER'S claims, not the
// question's wording -- which is the whole point: the question says "national
// security" and the corpus may well never use that phrase at all.
var REQUIRED = [
  ['1. Economic security', 'sea trade carries exports imports', ['sea', 'trade', 'export']],
  ['   - SLOC disruption / supply chain', 'disrupted shipping affects supply chains', ['shipping', 'supply']],
  ['2. Energy security', 'imported oil and gas dependence', ['import', 'oil']],
  ['   - Strait of Hormuz', 'Hormuz carries energy imports', ['hormuz']],
  ['3. Maritime frontier', 'coastline territorial waters EEZ protection', ['coastline', 'territorial']],
  ['4. Island territories', 'Andaman Nicobar near Malacca', ['andaman']],
  ['   - Lakshadweep', 'Lakshadweep western Indian Ocean', ['lakshadweep']],
  ['5. Geopolitical competition', 'China Indian Ocean naval basing', ['china']],
  ['6. Chokepoints', 'Bab-el-Mandeb chokepoint shipping', ['bab']],
  ['7. Non-traditional threats', 'piracy and maritime terrorism', ['piracy']],
  ['8. Regional influence', 'SAGAR regional cooperation diplomacy', ['sagar']],
  ['Way forward', 'maritime domain awareness Coast Guard', ['domain', 'awareness']]
];

var files = process.argv.slice(3);
if (!files.length) {
  files = ['defence-security.json', 'defence-security-2.json', 'india-international-relations.json',
    'international-relations.json', 'international-relations-2.json', 'indian-geography.json',
    'indian-economy.json', 'business-economy.json', 'geography.json'];
}

var ents = {};
var seen = {};
var records = 0, kept = 0, cats = {};
files.forEach(function (f) {
  var p = path.join(ROOT, 'data', 'questions', f);
  if (!fs.existsSync(p)) { console.log('  (missing) ' + f); return; }
  var parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
  Object.keys(parsed).forEach(function (cat) {
    var subs = parsed[cat] && parsed[cat].subSubjects;
    if (!subs || typeof subs !== 'object') return;
    Object.keys(subs).forEach(function (ss) {
      var arr = subs[ss];
      if (!Array.isArray(arr)) return;
      cats[cat] = 1;
      arr.forEach(function (rec) {
        if (!rec || typeof rec.fact !== 'string' || !rec.fact.trim()) return;
        records++;
        var name = (rec.subSubject || ss || '').trim();
        if (!name) return;
        var sents = splitSentences(rec.fact).slice(0, MAX_SENTENCES_PER_RECORD);
        if (!sents.length) return;
        if (!ents[name]) ents[name] = { name: name, sents: [], cats: {} };
        ents[name].cats[cat] = 1;
        sents.forEach(function (s) {
          var k = s.slice(0, 160);
          if (seen[name + '\u0000' + k]) return;
          seen[name + '\u0000' + k] = 1;
          if (ents[name].sents.length >= MAX_SENTENCES_PER_ENTITY) return;
          ents[name].sents.push(s);
          kept++;
        });
      });
    });
  });
});
var rows = Object.keys(ents).map(function (k) {
  return [ents[k].name, ents[k].sents, Object.keys(ents[k].cats)];
});

var df = {}, N = 0;
rows.forEach(function (row) {
  var s = {};
  row[1].forEach(function (x) {
    N++;
    contentTokens(x).forEach(function (t) {
      if (s[t]) return;
      s[t] = 1;
      df[t] = (df[t] || 0) + 1;
    });
  });
});

function score(sentence, qToks) {
  var hits = {};
  contentTokens(sentence).forEach(function (t) { hits[t] = (hits[t] || 0) + 1; });
  var sc = 0;
  qToks.forEach(function (t) {
    if (!hits[t]) return;
    sc += Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5)) * (1 + Math.log(hits[t]));
  });
  return sc;
}

console.log('=== corpus slice ===');
console.log('  files=' + files.length + '  categories=' + Object.keys(cats).join(', '));
console.log('  records=' + records + '  sentences=' + N + '  entities=' + rows.length);
console.log('');
console.log('=== per-heading coverage (the answer claims, not the question words) ===');
console.log('');

var covered = 0;
REQUIRED.forEach(function (req) {
  var label = req[0];
  var terms = req[2];
  var qToks = terms.filter(function (t) { return !STOP[t]; });
  var best = [];
  rows.forEach(function (row) {
    row[1].forEach(function (s) {
      var sc = score(s, qToks);
      if (sc > 0) best.push({ e: row[0], s: s, sc: sc });
    });
  });
  best.sort(function (a, b) { return b.sc - a.sc; });
  var ok = best.length > 0;
  if (ok) covered++;
  console.log((ok ? '  COVERED ' : '  MISSING ') + label);
  console.log('           needs: ' + terms.join(' + '));
  if (ok) {
    console.log('           best : ' + best[0].s.slice(0, 150));
    console.log('           from : ' + best[0].e);
  } else {
    console.log('           (no sentence in this slice contains those terms)');
  }
  console.log('');
});
console.log('=== coverage: ' + covered + '/' + REQUIRED.length + ' headings ===');
