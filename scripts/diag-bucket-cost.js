'use strict';
// What does the bucket format actually cost, per sentence?
//
//   node scripts/diag-bucket-cost.js
//
// 968 MB of buckets to deploy decides whether entity resolution can be shipped
// at all, so the question is not "how big is it" but "how much of that is
// overhead". Counts, for the real shards:
//   - bytes per sentence
//   - how much is the entity name, the category list, the provenance objects
//   - what a leaner shape would cost
//
// The provenance objects are the suspect: {source, pubDate} per sentence is a
// repeated key for values that are constant per entity in most cases.
var fs = require('fs');
var path = require('path');
var QB = path.join(__dirname, '..', 'data', 'ask-qb', 'bucket');

var files = fs.readdirSync(QB).filter(function (f) { return /^bucket\.\d+\.json$/.test(f); })
  .sort(function (a, b) { return (+a.match(/(\d+)/)[1]) - (+b.match(/(\d+)/)[1]); });

var sample = files.filter(function (_, i) { return i % 8 === 0; });
if (sample.length > 48) sample = sample.slice(0, 48);

var tot = {
  bytes: 0, entities: 0, sentences: 0,
  nameBytes: 0, catBytes: 0, sentBytes: 0, metaBytes: 0,
  keys: 0, pairs: 0, distinctPairs: 0,
  metaMissing: 0
};
var seenPair = {};
var entitiesBySents = {};

sample.forEach(function (f) {
  var p = path.join(QB, f);
  var raw = fs.readFileSync(p, 'utf8');
  tot.bytes += Buffer.byteLength(raw);
  var rows = JSON.parse(raw);
  rows.forEach(function (r) {
    var name = r[0] || '', sents = r[1] || [], cats = r[2] || [], meta = r[3] || [];
    tot.entities++;
    tot.sentences += sents.length;
    tot.nameBytes += Buffer.byteLength(JSON.stringify(name));
    tot.catBytes += Buffer.byteLength(JSON.stringify(cats));
    sents.forEach(function (s) {
      tot.sentBytes += Buffer.byteLength(JSON.stringify(s));
    });
    entitiesBySents[sents.length] = (entitiesBySents[sents.length] || 0) + 1;
    meta.forEach(function (m) {
      if (!m) { tot.metaMissing++; return; }
      var j = JSON.stringify(m);
      tot.metaBytes += Buffer.byteLength(j);
      var ks = Object.keys(m);
      tot.keys += ks.length;
      ks.forEach(function (k) {
        var pair = k + '=' + (m[k] == null ? '' : m[k]);
        tot.pairs++;
        if (!seenPair[pair]) { seenPair[pair] = 1; tot.distinctPairs++; }
      });
    });
  });
});

function pct(n) { return (100 * n / tot.bytes).toFixed(1) + '%'; }

console.log('sampled ' + sample.length + ' of ' + files.length + ' shards');
console.log('');
console.log('measured');
console.log('  entities        ' + tot.entities.toLocaleString());
console.log('  sentences       ' + tot.sentences.toLocaleString());
console.log('  bytes           ' + (tot.bytes / 1048576).toFixed(1) + ' MB');
console.log('  bytes/sentence  ' + (tot.bytes / tot.sentences).toFixed(1));
console.log('');
console.log('where the bytes go');
console.log('  sentences       ' + (tot.sentBytes / 1048576).toFixed(1) + ' MB  ' + pct(tot.sentBytes));
console.log('  entity names    ' + (tot.nameBytes / 1048576).toFixed(1) + ' MB  ' + pct(tot.nameBytes));
console.log('  category lists  ' + (tot.catBytes / 1048576).toFixed(1) + ' MB  ' + pct(tot.catBytes));
console.log('  provenance      ' + (tot.metaBytes / 1048576).toFixed(1) + ' MB  ' + pct(tot.metaBytes));
console.log('  unaccounted     ' + ((tot.bytes - tot.sentBytes - tot.nameBytes - tot.catBytes - tot.metaBytes) / 1048576).toFixed(1) + ' MB');
console.log('');
console.log('provenance shape');
console.log('  key/value pairs ' + tot.pairs.toLocaleString() +
  '  distinct ' + tot.distinctPairs.toLocaleString() +
  '  (' + (100 * tot.distinctPairs / Math.max(1, tot.pairs)).toFixed(2) + '% distinct)');
console.log('  meta entries    ' + tot.metaMissing + ' missing');
console.log('');
console.log('candidate leaner shapes (same information, smaller encoding)');
// 1. Provenance interned: replace repeated {source, pubDate} with indices.
var perSent = tot.metaBytes / Math.max(1, tot.sentences);
console.log('  provenance interned to indices   save ~' +
  (perSent * 0.75).toFixed(1) + ' B/sentence = ' +
  ((perSent * 0.75 * tot.sentences) / 1048576 / sample.length * (files.length / sample.length)).toFixed(0) +
  ' MB across all shards');
console.log('  drop provenance entirely        save ~' +
  (perSent * tot.sentences / 1048576 / sample.length * (files.length / sample.length)).toFixed(0) +
  ' MB across all shards');
console.log('');
console.log('sentences per entity (distribution)');
Object.keys(entitiesBySents).map(Number).sort(function (a, b) { return a - b; })
  .forEach(function (k) {
    if (k > 24) return;
    var n = entitiesBySents[k];
    if (n < 50) return;
    console.log('  ' + String(k).padStart(2) + ' sentences  ' +
      String(n).padStart(7) + '  ' + '#'.repeat(Math.max(1, Math.round(n / 200))));
  });