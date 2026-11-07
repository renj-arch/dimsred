// Verify the answering path end to end: question -> claims -> corpus entities ->
// quoted evidence -> composed answer.
//
//   node scripts/ask-answer-verify.js
//   node scripts/ask-answer-verify.js "a mains question"
//
// WHY A SEPARATE VERIFIER: ask-entity-demo.js reported "supported 0/12" because
// the ~838 MB of evidence shards cannot be built on this machine. That is a
// deployment gap, not a retrieval result, and it means the earlier demo never
// actually displayed an answer. This script closes that gap by choosing claims
// whose entities the local slice really carries, so the quoting and composition
// steps run for real and can be judged by reading the output.
//
// The composed answer is deliberately not prose. Each heading is a supplied
// outline point, filled with sentences quoted verbatim from a record's `fact`
// field. No sentence is generated, paraphrased or reordered into an argument, and
// a heading with no evidence says so rather than borrowing a neighbouring one.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var EE = require('./lib/ask-entity-evidence.js');
var qb = require('./lib/ask-qb.js');

var MAX_SENTENCES_PER_RECORD = 4;
var MAX_SENTENCES_PER_ENTITY = 24;

var SLICE = [
  'defence-security.json', 'defence-security-2.json', 'defence-security-3.json',
  'india-international-relations.json', 'international-relations.json',
  'international-relations-2.json', 'indian-geography.json', 'indian-economy.json',
  'agriculture-food.json', 'agriculture-food-2.json'
];

// The outline of the answer, as [heading, claim term, alternates]. This is the
// authored part: a mains answer's structure is an analyst's argument and cannot
// be derived from a corpus, so it is supplied here and only its contents are
// retrieved.
var OUTLINE = [
  ['1. Economic security', 'sea trade', ['shipping', 'maritime trade', 'sea lanes']],
  ['2. Energy security', 'energy security', ['energy imports', 'oil imports']],
  ['3. Maritime frontier', 'territorial waters', ['coastline', 'EEZ']],
  ['4. Island territories', 'Andaman and Nicobar islands', ['andaman and nicobar']],
  ['5. Geopolitical competition', 'china', ['chinese navy']],
  ['6. Maritime chokepoints', 'Strait of Hormuz', ['bab el mandeb']],
  ['7. Non-traditional threats', 'piracy', ['maritime terrorism', 'illegal fishing']],
  ['8. Regional influence', 'SAGAR', ['sagar amendment']],
  ['Way forward', 'maritime domain awareness', ['coast guard', 'naval capability']]
];

function splitSentences(text) {
  return String(text || '').split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}

function buildRows() {
  var ents = {}, seen = {}, cats = {}, records = 0, kept = 0;
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
          if (!ents[name]) ents[name] = { name: name, sents: [], meta: [], cats: {} };
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
var entityDir = new qb.EntityDir().load(
  fs.readFileSync(path.join(ROOT, 'data/ask-qb/entities.tsv'), 'utf8'));

// Pick, for each outline heading, a term the SLICE actually carries so the
// quoting step can run. This is the verification harness doing its job: it must
// not pretend an answer was produced when nothing was retrieved.
var points = OUTLINE.map(function (o) {
  var alts = o[2] || [];
  var chosen = null;
  [o[1]].concat(alts).forEach(function (t) {
    if (chosen) return;
    var key = qb.norm(t);
    if (built.rows.some(function (r) { return qb.norm(r[0]) === key; })) chosen = t;
  });
  return [o[0], chosen || o[1], alts.filter(function (a) { return a !== chosen; })];
});

console.log('=== slice ===');
console.log('  files=' + SLICE.length + '  records=' + built.records +
  '  sentences=' + built.kept + '  entities=' + built.rows.length);
console.log('  categories: ' + built.cats.join(', '));
console.log('');
console.log('=== question ===');
console.log('  ' + QUESTION);
console.log('');

var res = EE.retrieve(built.rows, QUESTION, points, entityDir, { perPoint: 2 });

// ---- the composed answer ----
console.log('=== COMPOSED ANSWER (verbatim evidence under supplied headings) ===');
console.log('');
console.log('  ' + QUESTION);
console.log('');
res.points.forEach(function (p) {
  console.log('  **' + p.label + '**');
  if (p.supported && p.evidence.length) {
    p.evidence.forEach(function (e) {
      console.log('    - "' + e.sentence + '"');
      console.log('      [entity: ' + e.entity + ' | source: ' +
        (e.trust.source || 'none') + ' | dated: ' +
        String(e.trust.pubDate || 'none').slice(0, 10) + ' | ' + e.trust.state + ']');
    });
  } else if (p.resolved) {
    console.log('    - no quotable sentence on this slice (entity "' + p.resolved +
      '" exists in the corpus, its shard is not loaded here)');
  } else {
    console.log('    - NOT COVERED BY THIS CORPUS. No entity named ' +
      p.terms.map(function (t) { return '"' + t + '"'; }).join(' or ') + '.');
    if (p.near && p.near.length) {
      console.log('      corpus has nearby: ' + p.near.slice(0, 3).join(' | '));
    }
  }
  console.log('');
});

console.log('=== Way forward and conclusion ===');
console.log('  Not retrievable. A mains answer\'s recommendations and conclusion are');
console.log('  judgement, not corpus content, and this system does not generate them.');
console.log('');

console.log('=== verification summary ===');
var present = res.points.filter(function (p) { return p.resolved; }).length;
console.log('  headings answered with quoted evidence : ' + res.covered + '/' + res.total);
console.log('  headings present in corpus, not quoted : ' + res.unquoted.length);
console.log('  headings absent from corpus            : ' + res.absent);
console.log('  sentences quoted (all verbatim)        : ' + res.evidence);
console.log('  provenance ok/flagged/unverified       : ' + res.provenance.ok + '/' +
  res.provenance.flagged + '/' + res.provenance.unverified);
console.log('');
console.log('  ' + res.note);
