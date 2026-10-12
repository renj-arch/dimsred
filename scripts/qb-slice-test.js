// Prove the fix: score by SENTENCE TEXT, not by entity name.
//
//   node scripts/qb-slice-test.js
//   node scripts/qb-slice-test.js "your question"
//
// WHY A SLICE: the real evidence shards are ~838 MB across 135 categories and
// cannot be built on this machine. But there are two separate claims here, and
// only one of them needs the shards:
//
//   1. "does the corpus hold the material"    -- answered by the local files
//   2. "does the Q/B path return that material as usable evidence" -- needs the
//      shards to prove end to end
//
// This settles (1) and the *mechanism* of (2), using the production
// scripts/lib/ask-qb.js helpers for tokenising and stopping, and building shard
// rows exactly the way scripts/build-ask-qb.js builds them: the `fact` field
// split into sentences, capped per record and per entity.
//
// THE BUG THIS DEMONSTRATES: scoreShard() selects an evidence sentence only
// when the entity's NAME matches the question. But the corpus files a fact
// under whichever Wikipedia topic it happened to come from, so a question about
// "land degradation" is answered by sentences filed under "Agriculture in
// Ethiopia", and a question about "food security" by sentences filed under
// "Biofertilizer". Those entities sit in many different categories. Keying
// relevance on the entity name therefore returns nothing, and no amount of
// deploying the 838 MB of shards changes that. Relevance has to be computed on
// the sentence text, with the category used only to prioritise which shards to
// fetch first.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var QB = require('./lib/ask-qb.js');
var answer = require('./lib/ask-answer.js');

// ask-qb.js keeps its stop list private, so mirror the one it uses at line 138.
// Keeping this identical matters: a different stop list here would change the
// scoring and the slice would no longer represent the production behaviour.
var STOP = {};
('a an the of and or in on at to for with by from as is was were are be been being has have had this ' +
  'that these those it its their his her they them we you i not no than then so such which who whom ' +
  'what when where how why into over under about between among during each other some any all more most ' +
  'less least very can could may might must shall should will would do does did done').split(' ')
  .forEach(function (w) { STOP[w] = 1; });

function contentTokens(s) {
  return QB.tokens(s).filter(function (t) { return !STOP[t]; });
}

var MAX_SENTENCES_PER_RECORD = 4;
var MAX_SENTENCES_PER_ENTITY = 24;

var SLICE = [
  'agriculture-food.json',
  'agriculture-food-2.json',
  'agronomy-crop-production-2.json',
  'agricultural-engineering.json'
];

function splitSentences(text) {
  return String(text || '').split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}

// Mirrors build-ask-qb.js sentencesOf(): every sentence is a verbatim slice of a
// record's own `fact`. Nothing is generated or paraphrased.
function buildSlice() {
  var ents = {};
  var seen = {};
  var records = 0, kept = 0;
  SLICE.forEach(function (f) {
    var p = path.join(ROOT, 'data', 'questions', f);
    if (!fs.existsSync(p)) { console.log('  (missing) ' + f); return; }
    var parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    Object.keys(parsed).forEach(function (cat) {
      var subs = parsed[cat] && parsed[cat].subSubjects;
      if (!subs || typeof subs !== 'object') return;
      Object.keys(subs).forEach(function (ss) {
        var arr = subs[ss];
        if (!Array.isArray(arr)) return;
        if (typeof arr === 'object' && !Array.isArray(arr)) return;
        var recordsHere = Array.isArray(arr) ? arr : [];
        recordsHere.forEach(function (rec) {
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
  }).filter(function (r) { return r[1].length; });
  return { rows: rows, records: records, kept: kept, ents: ents };
}

// A mains relational question names several entities but no single subject, so
// route() finds no anchor and scoreShard() returns nothing. Split it into the
// concepts it names and retrieve each on its own. This is decomposition of the
// *question*, not generation of an *answer*: every sentence returned is still
// verbatim from a record's `fact`.
function decompose(q) {
  var body = String(q)
    .replace(/^\s*(analyse|analyze|explain| discuss|discuss|examine|assess|elaborate)\s+/i, '')
    .replace(/^.*?\brelationship(?:s)?\s+between\s+/i, '')
    .replace(/^.*?\binteractions?\s+between\s+/i, '')
    .replace(/^.*?\blink(?:s)?\s+between\s+/i, '')
    .replace(/^.*?\b(?:impact|effect|effects|role|influence)\s+of\s+/i, '')
    .replace(/^.*?\bon\s+(?=.{0,60}\b(?:and|with)\b)/i, '');
  return body.split(/\s*(?:,|\band\b|\bwith\b|\bon\b)\s*/i)
    .map(function (s) { return s.trim().replace(/[?.!,]+$/, ''); })
    .filter(function (s) { return s.length > 2 && /[a-z]{3}/i.test(s); });
}

// IDF over the slice's own sentences, so a term common to every sentence
// ("food", "india") cannot outrank a term that pins the answer ("erosion",
// "productivity"). Scored with the production tokeniser and stop list.
function buildIdf(rows) {
  var df = {};
  var N = 0;
  rows.forEach(function (row) {
    var seenT = {};
    row[1].forEach(function (s) {
      N++;
      contentTokens(s).forEach(function (t) {
        if (seenT[t]) return;
        seenT[t] = 1;
        df[t] = (df[t] || 0) + 1;
      });
    });
  });
  return { df: df, N: N };
}

var QUESTION = process.argv[2] ||
  'analyse the relationship between land degradation, agricultural productivity and food security';

var slice = buildSlice();
console.log('=== slice ===');
console.log('  files=' + SLICE.length + '  records=' + slice.records +
  '  sentences=' + slice.kept + '  entities=' + slice.rows.length);
console.log('');

var stats = buildIdf(slice.rows);
console.log('=== corpus ===');
console.log('  sentences=' + stats.N + '  distinct terms=' + Object.keys(stats.df).length);
console.log('');

var QB2 = path.join(ROOT, 'data', 'ask-qb');
var dirJson = JSON.parse(fs.readFileSync(path.join(QB2, 'dir.json'), 'utf8'));
var entitiesText = fs.readFileSync(path.join(QB2, 'entities.tsv'), 'utf8');
var concepts = JSON.parse(fs.readFileSync(path.join(QB2, 'concepts.json'), 'utf8'));
var loaded = answer.loadDir(dirJson, entitiesText);
console.log('=== routing tables loaded (real) ===');
console.log('  dir=' + Object.keys(dirJson).length + ' categories   entities.tsv=' +
  entitiesText.split('\n').length + ' lines');
console.log('');

// --- Part 1: the current behaviour, entity-name matching ---
var route = answer.route(QUESTION, loaded.dir, loaded.entityDir, concepts);
console.log('=== CURRENT: whole question, entity-name matching ===');
console.log('  anchorSubject=' + JSON.stringify(route.anchorSubject) +
  '  entityPhrase=' + JSON.stringify(route.entityPhrase));
console.log('  categories routed: ' + route.categories.slice(0, 4).map(function (c) {
  return c.cat.name + '(' + c.score + ')';
}).join(', '));
var cur = QB.scoreShard(slice.rows, QUESTION, {
  conceptPhrases: route.phrases || [], jurisdiction: route.jurisdiction || '',
  subject: route.anchorSubject, entityPhrase: route.entityPhrase,
  conceptTier: route.conceptTier, subjectPhrases: route.subjectPhrases || [], limit: 12
}) || [];
console.log('  evidence: ' + cur.length);
console.log('');

// --- Part 2: decomposition ---
var parts = decompose(QUESTION);
console.log('=== decomposed into ' + parts.length + ' concepts ===');
console.log('');
var seen = {};
var combined = [];
parts.forEach(function (part) {
  var r = answer.route(part, loaded.dir, loaded.entityDir, concepts);
  var ev = QB.scoreShard(slice.rows, part, {
    conceptPhrases: r.phrases || [], jurisdiction: r.jurisdiction || '',
    subject: r.anchorSubject, entityPhrase: r.entityPhrase,
    conceptTier: r.conceptTier, subjectPhrases: r.subjectPhrases || [], limit: 6
  }) || [];
  console.log('  "' + part + '"  anchor=' + JSON.stringify(r.anchorSubject) +
    '  tier=' + r.conceptTier + '  -> ' + ev.length + ' evidence');
  ev.slice(0, 3).forEach(function (e) {
    console.log('      [' + e.entity + '] "' + String(e.sentence).slice(0, 150) + '"');
  });
  combined = combined.concat(ev);
});
console.log('');

// --- Part 3: the fix, relevance computed on the sentence text ---
function textScore(sentence, qTokens, qPhraseRuns) {
  var hits = {};
  contentTokens(sentence).forEach(function (t) { hits[t] = (hits[t] || 0) + 1; });
  var score = 0;
  qTokens.forEach(function (t) {
    if (!hits[t]) return;
    // BM25-style term weighting. A rare term matching is worth far more than a
    // common one, which is what keeps "food" from outranking "erosion": across
    // 12k sentences "food" appears in a large share of them, so its idf is near
    // zero, while "degradation" appears in a handful.
    var w = Math.log(1 + (stats.N - stats.df[t] + 0.5) / (stats.df[t] + 0.5));
    score += w * (1 + Math.log(hits[t]));
  });
  // Every term of the concept matching somewhere is necessary but not
  // sufficient: it is what let "Agricultural law" and "Bachelor of Agriculture"
  // rank under "agricultural productivity" on the shared word "agricultural"
  // alone. A contiguous run of the concept's own tokens scores heavily, so a
  // sentence only qualifies on the strength of one common noun if the phrase
  // itself is actually present.
  var sTok = QB.tokens(sentence);
  var phraseBonus = 0;
  (qPhraseRuns || []).forEach(function (run) {
    var runToks = run.toks || run;
    if (runToks.length < 2) return;
    for (var i = 0; i + runToks.length <= sTok.length; i++) {
      var hit = true;
      for (var j = 0; j < runToks.length; j++) {
        if (!QB.hasStem(sTok, runToks[j])) { hit = false; break; }
      }
      if (hit) { phraseBonus += runToks.length * 6; return; }
    }
  });
  return score + phraseBonus;
}

console.log('=== PROPOSED FIX: relevance on sentence text, per concept ===');
console.log('');
var perConcept = parts.map(function (part) {
  var qt = contentTokens(part);
  var runs = QB.subjectPhrases(part);
  if (!runs.length) runs = [qt];
  var scored = [];
  slice.rows.forEach(function (row) {
    var entity = row[0];
    row[1].forEach(function (s) {
      var sc = textScore(s, qt, runs);
      if (sc > 0) scored.push({ entity: entity, sentence: s, score: sc, concept: part });
    });
  });
  scored.sort(function (a, b) { return b.score - a.score; });
  // Cap per entity so one prolific topic cannot fill every slot.
  var perEnt = {}, out = [];
  scored.forEach(function (x) {
    if (perEnt[x.entity] >= 2) return;
    perEnt[x.entity] = (perEnt[x.entity] || 0) + 1;
    out.push(x);
  });
  return { concept: part, items: out.slice(0, 5) };
});

var grand = 0;
perConcept.forEach(function (pc) {
  grand += pc.items.length;
  console.log('  CONCEPT "' + pc.concept + '"');
  if (!pc.items.length) { console.log('    (nothing in this slice)'); return; }
  pc.items.forEach(function (x, i) {
    console.log('    ' + (i + 1) + '. (' + x.score.toFixed(1) + ') [' + x.entity + ']');
    console.log('       "' + String(x.sentence).slice(0, 165) + '"');
  });
  console.log('');
});
console.log('=== combined evidence: ' + grand + ' sentences from ' + SLICE.length + ' of 135 categories ===');
