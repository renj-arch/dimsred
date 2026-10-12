// Entity-anchored evidence for a mains answer.
//
//   node scripts/ask-entity-demo.js
//   node scripts/ask-entity-demo.js "a mains question"
//
// WHY THIS EXISTS: ranking sentences by shared tokens reported these as
// SUPPORTED when the evidence was plainly about something else --
//
//   8. Regional influence: SAGAR
//      "The waterfalls are in the Sagar taluk of the Shivamogga district."
//   Way forward: maritime domain awareness
//      "Mission DefSpace ... space-based collaboration"
//
// "Sagar taluk" is a district in Karnataka, not India's maritime vision. The
// difference is not visible in the tokens, but it IS visible in the entity table:
// data/ask-qb/entities.tsv holds "sagar island", "sagar khera" and "sagara
// yoshihi" as separate entities and holds nothing at all for "bab-el-mandeb".
// So this resolves each claim to a corpus entity first, then quotes that
// entity's own sentences. A claim that resolves to nothing is reported as a gap,
// which is a true and useful statement rather than a wrong answer.
//
// The shards cannot be built here (~838 MB over 135 categories), but rows have the
// same shape on a slice and the entity table is real, so the resolution logic is
// exercised for real. What this does NOT prove is that the shards are deployed.
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

// The claims a mains answer must establish, each as [label, term, alternates].
// Alternates let a claim name the corpus's own spelling without the caller
// having to know it in advance.
var POINTS = [
  ['1. Economic security: sea-borne trade', 'sea trade', ['shipping', 'maritime trade']],
  ['   - SLOC disruption affects supply chains', 'supply chain', ['SLOC']],
  ['2. Energy security: imported hydrocarbons', 'energy security', ['energy imports']],
  ['   - Strait of Hormuz carries energy', 'Strait of Hormuz', ['Hormuz']],
  ['3. Maritime frontier: coastline and territorial waters', 'coastline', ['territorial waters']],
  ['4. Island territories: Andaman and Nicobar', 'Andaman and Nicobar', ['Andaman']],
  ['   - Lakshadweep, western Indian Ocean', 'Lakshadweep', []],
  ['5. Geopolitical competition: extra-regional powers', 'China', ['Chinese']],
  ['6. Chokepoints: Bab-el-Mandeb', 'Bab-el-Mandeb', ['Bab el Mandeb', 'Bab-el-Mandeb strait']],
  ['7. Non-traditional threats: piracy', 'piracy', ['pirates']],
  ['8. Regional influence: SAGAR', 'SAGAR', ['Sagar Amendment']],
  ['Way forward: maritime domain awareness', 'maritime domain awareness', ['MDA']]
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
var dirJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ask-qb/dir.json'), 'utf8'));
var entitiesText = fs.readFileSync(path.join(ROOT, 'data/ask-qb/entities.tsv'), 'utf8');
var entityDir = new qb.EntityDir().load(entitiesText);

console.log('=== slice ===');
console.log('  files=' + SLICE.length + '  records=' + built.records +
  '  sentences=' + built.kept + '  entities=' + built.rows.length);
console.log('  categories: ' + built.cats.join(', '));
console.log('  entity table: ' + entitiesText.split('\n').length + ' names (real, not sliced)');
console.log('');
console.log('=== question ===');
console.log('  ' + QUESTION);
console.log('');

var res = EE.retrieve(built.rows, QUESTION, POINTS, entityDir);

console.log('=== claims, resolved entity-first ===');
console.log('');
res.points.forEach(function (p) {
  if (p.supported) {
    console.log('  SUPPORTED  ' + p.label);
    console.log('             -> entity: "' + p.resolved + '"  (' + p.how + ')');
    p.evidence.forEach(function (e) {
      console.log('             [' + e.trust.state + '] "' + e.sentence.slice(0, 150) + '"');
    });
  } else if (p.resolved) {
    console.log('  PRESENT, NOT QUOTABLE HERE  ' + p.label);
    console.log('             -> in the corpus as "' + p.resolved + '" (' + p.how + ')');
    console.log('             -> no sentence quoted: this slice does not carry it and');
    console.log('                the evidence shards for its categories are not built');
    console.log('                on this machine.');
    (p.evidence || []).slice(0, 2).forEach(function (e) {
      console.log('             "' + e.sentence.slice(0, 140) + '"');
    });
  } else {
    console.log('  GAP        ' + p.label);
    console.log('             -> no corpus entity for: ' + p.terms.join(', '));
    if (p.near && p.near.length) {
      console.log('             -> nearest entities: ' + p.near.slice(0, 4).join(' | '));
    }
  }
  console.log('');
});

console.log('=== summary ===');
var present = res.points.filter(function (p) { return p.resolved; }).length;
console.log('  claims present in corpus : ' + present + '/' + res.total +
  '   (entity name resolves exactly)');
console.log('  claims supported         : ' + res.covered + '/' + res.total +
  '   (resolved AND enough distinct sentences)');
console.log('  absent from corpus       : ' + res.absent +
  '   (no entity of any spelling: a real hole)');
console.log('  present, not quotable    : ' + res.unquoted.length +
  '   (entity exists, its shard was not loaded: NOT a hole)');
console.log('  evidence                 : ' + res.evidence + ' sentences, verbatim from `fact`');
console.log('  provenance               : ok=' + res.provenance.ok + ' flagged=' + res.provenance.flagged +
  ' unverified=' + res.provenance.unverified);
console.log('');
console.log('  Read this as two different numbers, not one. A claim can be present in');
console.log('  the corpus and still not quotable here, because the evidence shards for');
console.log('  its categories are not built on this machine. Only the gap count says');
console.log('  anything about the corpus itself.');
console.log('');
console.log('  ' + res.note);
