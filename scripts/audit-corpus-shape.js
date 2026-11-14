// Audit: what is actually in data/questions/?
// The claim under test is "1.5M questions it can go through and answer my
// questions". This measures the corpus on its own terms so the answer is
// evidence-based rather than an impression from a couple of files.
'use strict';
var fs = require('fs');
var path = require('path');
var DIR = path.resolve(__dirname, '..', 'data', 'questions');

var files = fs.readdirSync(DIR).filter(function (f) { return /\.json$/.test(f) && f !== 'manifest.json'; });
// Spread the sample across the alphabetical range instead of taking a prefix,
// which would over-represent one subject.
var step = Math.max(1, Math.floor(files.length / 40));
var sample = [];
for (var i = 0; i < files.length; i += step) sample.push(files[i]);

var types = {}, sources = {};
var n = 0, ansLenSum = 0, ansLenMax = 0, factLenSum = 0;
var hist = { 'ans<=2': 0, 'ans 3-10': 0, 'ans 11-40': 0, 'ans 41-120': 0, 'ans>120': 0 };
var mainsLike = 0, selfAnswer = 0;
var examples = [];

sample.forEach(function (f) {
  var doc;
  try { doc = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); }
  catch (e) { return; }
  Object.keys(doc).forEach(function (cat) {
    var subs = doc[cat] && doc[cat].subSubjects;
    if (!subs) return;
    Object.keys(subs).forEach(function (sub) {
      (subs[sub] || []).forEach(function (q) {
        n++;
        types[q.type] = (types[q.type] || 0) + 1;
        sources[q.source] = (sources[q.source] || 0) + 1;
        var a = String(q.answer == null ? '' : q.answer);
        var al = a.split(/\s+/).filter(Boolean).length;
        ansLenSum += al; if (al > ansLenMax) ansLenMax = al;
        if (a) factLenSum += String(q.fact || '').split(/\s+/).filter(Boolean).length;
        if (al <= 2) hist['ans<=2']++;
        else if (al <= 10) hist['ans 3-10']++;
        else if (al <= 40) hist['ans 11-40']++;
        else if (al <= 120) hist['ans 41-120']++;
        else hist['ans>120']++;

        // A mains stem is a long imperative sentence, not "What is X?".
        var qt = String(q.question || '');
        if (qt.split(/\s+/).length > 25 && /discuss|explain|critically|analyse|analyze|examine|elaborate|what do you think|\.\.\./i.test(qt)) mainsLike++;
        // Cloze generator answering with the entity name it just blanked out.
        if (a && a.length > 2 && qt.indexOf(a) === -1 && new RegExp('\\b' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(qt)) selfAnswer++;
        if (examples.length < 4 && qt.split(/\s+/).length > 25) examples.push({ f: f, q: qt, a: a });
      });
    });
  });
});

function pct(x) { return (100 * x / n).toFixed(1) + '%'; }
console.log('=== CORPUS AUDIT (sampled ' + sample.length + ' of ' + files.length + ' shards) ===');
console.log('questions examined: ' + n);
console.log('');
console.log('--- question types ---');
Object.keys(types).sort(function (a, b) { return types[b] - types[a]; }).forEach(function (k) {
  console.log('  ' + (k || '(none)').padEnd(22) + String(types[k]).padStart(8) + '  ' + pct(types[k]));
});
console.log('');
console.log('--- sources ---');
Object.keys(sources).sort(function (a, b) { return sources[b] - sources[a]; }).forEach(function (k) {
  console.log('  ' + (k || '(none)').padEnd(22) + String(sources[k]).padStart(8) + '  ' + pct(sources[k]));
});
console.log('');
console.log('--- answer length (words) ---');
console.log('  mean answer length: ' + (ansLenSum / n).toFixed(1) + ' words');
console.log('  max answer length:  ' + ansLenMax + ' words');
Object.keys(hist).forEach(function (k) { console.log('  ' + k.padEnd(10) + String(hist[k]).padStart(8) + '  ' + pct(hist[k])); });
console.log('');
console.log('--- mains suitability ---');
console.log('  long imperative stems (25+ words): ' + mainsLike + '  (' + pct(mainsLike) + ')');
console.log('');
console.log('--- longest stems seen ---');
examples.forEach(function (e) { console.log('  [' + e.f + '] ' + e.q.slice(0, 150)); });
