// What do the two biggest filters throw away?
//
//   node scripts/diag-filter-cases.js <repo-root>
//
// diag-coverage-loss.js says 47% of sentences die on the 24-per-entity cap and
// 21% on isQuoteable(). A percentage says how much; this says what, by printing
// actual rejected and truncated text. A filter that is dropping real sentences is
// a bug, and one that is dropping fragments is correct -- and only the text tells
// them apart.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = process.argv[2] || path.join(__dirname, '..');
var ask = require(path.join(ROOT, 'scripts/lib/ask-core.js'));
var MIN_SENTENCE_WORDS = 8;
var MAX_PER_ENTITY = 24;
var MAX_PER_RECORD = 4;

var QDIR = path.join(ROOT, 'data', 'questions');
var idx = JSON.parse(fs.readFileSync(path.join(QDIR, 'archive-cat-index.json'), 'utf8'));
var files = idx.map(function (c) {
  var f = Array.isArray(c.file) ? c.file : [c.file];
  var p = path.join(ROOT, f[0]);
  return { name: c.name, path: p, size: fs.existsSync(p) ? fs.statSync(p).size : Infinity };
}).filter(function (s) { return isFinite(s.size); })
  .sort(function (a, b) { return a.size - b.size; });
var sample = [files[Math.floor(files.length * 0.5)], files[Math.floor(files.length * 0.75)]];

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

var rejected = [], truncated = [], capped = [], entityDepth = {};
sample.forEach(function (s) {
  var data;
  try { data = JSON.parse(fs.readFileSync(s.path, 'utf8')); } catch (e) { return; }
  var recs = [];
  walk(data, { cat: s.name }, recs);
  recs.forEach(function (x) {
    var name = entityOf(x.ctx, x.r);
    if (!name) return;
    var fact = String(x.r.fact || '').trim();
    if (!fact) return;
    var sents = splitSentences(fact);
    var kept = 0;
    for (var i = 0; i < sents.length; i++) {
      var sent = sents[i].trim();
      if (ask.wordCount(sent) < MIN_SENTENCE_WORDS) {
        if (rejected.length < 14) rejected.push({ why: 'under 8 words', s: sent });
        continue;
      }
      if (!ask.isQuoteable(sent)) {
        if (rejected.length < 28) {
          // Attribute the rejection to the specific rule so it is clear which
          // filter is responsible; isQuoteable returns a boolean, so the reason
          // has to be recovered by re-testing the individual conditions.
          var why = 'isQuoteable';
          if (/_{3,}/.test(sent)) why = 'cloze blank (___)';
          else if (/\|/.test(sent)) why = 'pipe/table artifact';
          else if (/^(thus|hence|therefore|also|however|which|who|that|this|these|those|it|he|she|they)\b/i.test(sent)) why = 'starts with a dangling pronoun/conjunction';
          else if (ask.wordCount(sent) < 8) why = 'too short';
          rejected.push({ why: why, s: sent });
        }
        continue;
      }
      if (kept >= MAX_PER_RECORD) {
        if (truncated.length < 10) truncated.push({ name: name, s: sent });
        continue;
      }
      kept++;
      var ek = name.toLowerCase();
      if (!entityDepth[ek]) entityDepth[ek] = { name: name, n: 0 };
      entityDepth[ek].n++;
      if (entityDepth[ek].n > MAX_PER_ENTITY) {
        if (capped.length < 10) capped.push({ name: name, s: sent });
        continue;
      }
    }
  });
});

console.log('=== rejected by isQuoteable / length ===');
var byWhy = {};
rejected.forEach(function (r) { byWhy[r.why] = (byWhy[r.why] || 0) + 1; });
Object.keys(byWhy).forEach(function (w) { console.log('  ' + (w + '                                   ').slice(0, 40) + byWhy[w]); });
console.log('');
rejected.forEach(function (r) {
  console.log('  [' + r.why + ']');
  console.log('    "' + r.s.slice(0, 120) + (r.s.length > 120 ? '...' : '') + '"');
});

console.log('');
console.log('=== dropped by the 4-per-record cap (sentence 5+ of one fact) ===');
truncated.forEach(function (r) {
  console.log('  ' + r.name + ':');
  console.log('    "' + r.s.slice(0, 120) + (r.s.length > 120 ? '...' : '') + '"');
});

console.log('');
console.log('=== dropped by the 24-per-entity cap (sentence 25+ for one entity) ===');
capped.forEach(function (r) {
  console.log('  ' + r.name + ':');
  console.log('    "' + r.s.slice(0, 120) + (r.s.length > 120 ? '...' : '') + '"');
});

var depths = Object.keys(entityDepth).map(function (k) { return entityDepth[k].n; })
  .sort(function (a, b) { return b - a; });
console.log('');
console.log('=== entity sentence depth ===');
console.log('  entities seen          ' + depths.length);
console.log('  hit the 24 cap         ' + depths.filter(function (d) { return d > MAX_PER_ENTITY; }).length);
console.log('  deepest                ' + depths[0] + ' sentences');
console.log('  median                 ' + depths[Math.floor(depths.length / 2)]);
console.log('  with 1 sentence only   ' + depths.filter(function (d) { return d === 1; }).length +
  ' (' + (depths.filter(function (d) { return d === 1; }).length / depths.length * 100).toFixed(1) + '%)');