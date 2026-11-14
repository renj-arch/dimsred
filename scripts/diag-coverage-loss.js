// Is the build actually searching all the data?
//
//   node scripts/diag-coverage-loss.js <repo-root>
//
// The pipeline has several filters between the 15.38M records and a quotable
// sentence. Each one discards material, and a discarded sentence cannot be
// retrieved no matter how good the routing is. This measures the loss at each
// stage on a sample of real category files, so the answer is a number rather than
// an assumption.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = process.argv[2] || path.join(__dirname, '..');
var ask = require(path.join(ROOT, 'scripts/lib/ask-core.js'));

var MAX_SENTENCES_PER_RECORD = 4;
var MAX_SENTENCES_PER_ENTITY = 24;
var MIN_SENTENCE_WORDS = 8;

var QDIR = path.join(ROOT, 'data', 'questions');
var idx = JSON.parse(fs.readFileSync(path.join(QDIR, 'archive-cat-index.json'), 'utf8'));

// Sample spread across the size range rather than the smallest files. The first
// attempt took the six smallest and got 115 records -- too small to generalise
// from, since a 5 KB category cannot be assumed to fail the same filters a
// 200 MB one does. Sampling at the low, middle and high ends of the size
// distribution is what makes the percentages mean something.
var ALL = idx.map(function (c) {
  var files = Array.isArray(c.file) ? c.file : [c.file];
  var p = path.join(ROOT, files[0]);
  return { name: c.name, path: p, size: fs.existsSync(p) ? fs.statSync(p).size : Infinity };
}).filter(function (s) { return isFinite(s.size); })
  .sort(function (a, b) { return a.size - b.size; });

var PER_BAND = Number(process.argv[3] || 4);
var sample = [];
[0.02, 0.25, 0.5, 0.75, 0.98].forEach(function (q) {
  var at = Math.min(ALL.length - 1, Math.floor(ALL.length * q));
  for (var k = 0; k < PER_BAND && at + k < ALL.length; k++) sample.push(ALL[at + k]);
});
sample.forEach(function (s) { if (sample.indexOf(s) < 0) return; });

function splitSentences(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
    .split(/(?<=[.!?])\s+(?=[A-Z"'(])/);
}

function walk(node, ctx, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(function (x) { walk(x, ctx, out); }); return; }
  if (node.subSubjects && typeof node.subSubjects === 'object' && !Array.isArray(node.subSubjects)) {
    var subs = node.subSubjects;
    Object.keys(subs).forEach(function (sk) {
      var sv = subs[sk];
      if (Array.isArray(sv)) sv.forEach(function (r) { out.push({ ctx: ctx, r: r }); });
      else walk(sv, { cat: ctx.cat, sub: sk }, out);
    });
    return;
  }
  if (node.question !== undefined || node.fact !== undefined) { out.push({ ctx: ctx, r: node }); return; }
  Object.keys(node).forEach(function (k) { walk(node[k], ctx, out); });
}

function entityOf(ctx, rec) {
  return String(rec.subSubject || ctx.sub || rec.subject || rec.category || ctx.cat || '').trim();
}

var T = {
  records: 0, noEntity: 0, noFact: 0,
  sentsRaw: 0, tooShort: 0, notQuoteable: 0,
  sentsKeptRecord: 0, cappedRecord: 0,
  sentsKeptEntity: 0, cappedEntity: 0, entities: 0
};

console.log('=== sample ===');
sample.forEach(function (s) {
  console.log('  ' + (s.name + '                                        ').slice(0, 42) +
    (s.size / 1024).toFixed(0).padStart(7) + ' KB');
});

sample.forEach(function (s) {
  var data;
  try { data = JSON.parse(fs.readFileSync(s.path, 'utf8')); } catch (e) { return; }
  var recs = [];
  walk(data, { cat: s.name }, recs);
  var ents = {};

  recs.forEach(function (x) {
    T.records++;
    var name = entityOf(x.ctx, x.r);
    if (!name) { T.noEntity++; return; }
    var fact = String(x.r.fact || '').trim();
    if (!fact) { T.noFact++; return; }

    var sents = splitSentences(fact);
    T.sentsRaw += sents.length;
    var kept = 0;
    for (var i = 0; i < sents.length; i++) {
      var sent = sents[i].trim();
      if (ask.wordCount(sent) < MIN_SENTENCE_WORDS) { T.tooShort++; continue; }
      if (!ask.isQuoteable(sent)) { T.notQuoteable++; continue; }
      if (kept >= MAX_SENTENCES_PER_RECORD) { T.cappedRecord++; break; }
      kept++;
      T.sentsKeptRecord++;
      var ek = name.toLowerCase();
      if (!ents[ek]) ents[ek] = [];
      if (ents[ek].length >= MAX_SENTENCES_PER_ENTITY) { T.cappedEntity++; continue; }
      ents[ek].push(sent);
      T.sentsKeptEntity++;
    }
    if (kept) T.entities++;
  });
  T.entities += 0;
});

console.log('');
console.log('=== record-level funnel ===');
console.log('  records walked                     ' + T.records.toLocaleString());
console.log('  dropped: no entity name            ' + T.noEntity.toLocaleString() +
  '  (' + (T.noEntity / T.records * 100).toFixed(1) + '%)');
console.log('  dropped: fact field empty          ' + T.noFact.toLocaleString() +
  '  (' + (T.noFact / T.records * 100).toFixed(1) + '%)');
var usable = T.records - T.noEntity - T.noFact;
console.log('  records with a usable fact         ' + usable.toLocaleString());
console.log('');
console.log('=== sentence-level funnel ===');
console.log('  sentences split from fact          ' + T.sentsRaw.toLocaleString());
console.log('  dropped: under 8 words             ' + T.tooShort.toLocaleString() +
  '  (' + (T.tooShort / T.sentsRaw * 100).toFixed(1) + '%)');
console.log('  dropped: failed isQuoteable        ' + T.notQuoteable.toLocaleString() +
  '  (' + (T.notQuoteable / T.sentsRaw * 100).toFixed(1) + '%)');
console.log('  dropped by 4-per-record cap        ' + T.cappedRecord.toLocaleString());
var passed = T.sentsRaw - T.tooShort - T.notQuoteable - T.cappedRecord;
console.log('  sentences passing both filters     ' + passed.toLocaleString() +
  '  (' + (passed / T.sentsRaw * 100).toFixed(1) + '% of raw)');
console.log('');
console.log('=== storage-level funnel ===');
console.log('  kept before 24-per-entity cap      ' + T.sentsKeptRecord.toLocaleString());
console.log('  dropped by 24-per-entity cap       ' + T.cappedEntity.toLocaleString() +
  '  (' + (T.cappedEntity / T.sentsKeptRecord * 100).toFixed(1) + '%)');
console.log('  retrievable sentences              ' + T.sentsKeptEntity.toLocaleString());
console.log('');
console.log('=== headline ===');
console.log('  ' + (T.sentsKeptEntity / T.sentsRaw * 100).toFixed(1) + '% of raw sentences are retrievable.');
console.log('  ' + (T.sentsRaw - T.sentsKeptEntity).toLocaleString() +
  ' sentences in this sample are unreachable.');