// Are we SEARCHING all the data we fetch?
//
//   node scripts/diag-search-depth.js <repo-root>
//
// Two questions the earlier diagnostics do not answer:
//   1. What share of sentences isQuoteable() rejects for starting with a
//      pronoun, and are those sentences actually usable?
//   2. When a bucket is fetched, how much of it does the mains path actually
//      consult? The entity-anchored design reads only the rows it names, so the
//      rest of the fetched payload may be sitting unused.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = process.argv[2] || path.join(__dirname, '..');
var ask = require(path.join(ROOT, 'scripts/lib/ask-core.js'));
var qb = require(path.join(ROOT, 'scripts/lib/ask-qb.js'));
var EE = require(path.join(ROOT, 'scripts/lib/ask-entity-evidence.js'));
var H = require(path.join(ROOT, 'scripts/lib/build-ask-qb-buckets-hash.js'));
var QB = path.join(ROOT, 'data', 'ask-qb');

console.log('=== 1. pronoun-initial sentences rejected by isQuoteable ===');
// These are complete, information-dense sentences whose subject is supplied by
// the citation rather than by the sentence itself. Whether that is quotable is a
// judgement call, so the count is reported rather than assumed.
var QDIR = path.join(ROOT, 'data', 'questions');
var idx = JSON.parse(fs.readFileSync(path.join(QDIR, 'archive-cat-index.json'), 'utf8'));
var f2 = idx.map(function (c) {
  var f = Array.isArray(c.file) ? c.file : [c.file];
  var p = path.join(ROOT, f[0]);
  return fs.existsSync(p) ? p : null;
}).filter(Boolean).sort(function (a, b) { return fs.statSync(a).size - fs.statSync(b).size; });
var target = f2[Math.floor(f2.length * 0.5)];

function splitSentences(t) {
  return String(t || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z"'(])/);
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

var data = JSON.parse(fs.readFileSync(target, 'utf8'));
var recs = [];
walk(data, { cat: 'x' }, recs);
var PRON = /^(thus|hence|therefore|also|however|which|who|that|this|these|those|it|he|she|they)\b/i;
var PRON_ONLY = /^(it|he|she|they)\b/i;
var t = { total: 0, quoteable: 0, pronoun: 0, pronounOnly: 0, conj: 0 };
var pronSamples = [];
recs.forEach(function (x) {
  splitSentences(String(x.r.fact || '')).forEach(function (s) {
    s = s.trim();
    if (!s) return;
    t.total++;
    if (ask.isQuoteable(s)) { t.quoteable++; return; }
    if (PRON.test(s)) {
      t.pronoun++;
      if (PRON_ONLY.test(s)) {
        t.pronounOnly++;
        if (pronSamples.length < 6) pronSamples.push({ ent: String(x.ctx.sub || ''), s: s });
      } else t.conj++;
    }
  });
});
console.log('  sample file                 ' + path.basename(target));
console.log('  sentences                   ' + t.total.toLocaleString());
console.log('  isQuoteable() accepts       ' + t.quoteable.toLocaleString() +
  '  (' + (t.quoteable / t.total * 100).toFixed(1) + '%)');
console.log('  rejected for a leading word ' + t.pronoun.toLocaleString() +
  '  (' + (t.pronoun / t.total * 100).toFixed(1) + '%)');
console.log('    of which bare pronoun     ' + t.pronounOnly.toLocaleString() +
  '  (' + (t.pronounOnly / t.total * 100).toFixed(1) + '% of all sentences)');
console.log('    of which conjunction      ' + t.conj.toLocaleString());
console.log('');
console.log('  sample rejected sentences (subject comes from the citation):');
pronSamples.forEach(function (p) {
  console.log('    ' + (p.ent + ' ').slice(0, 26) + '"' + p.s.slice(0, 96) + '"');
});

console.log('');
console.log('=== 2. how much of a fetched bucket does the answer read? ===');
var ed = new qb.EntityDir().load(fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8'));
var OUTLINE = [
  ['1. Current', 'ocean current', []],
  ['2. Gulf Stream', 'gulf stream', []],
  ['3. Canary', 'canary current', []],
  ['4. Upwelling', 'upwelling', []],
  ['5. AABW', 'antarctic bottom water', []],
  ['6. Reefs', 'coral reef', []],
  ['7. ACC', 'antarctic circumpolar current', []],
  ['8. Humboldt', 'humboldt current', []]
];
var terms = OUTLINE.map(function (p) { return p[1]; });
var wanted = {}, fetchedEnts = 0, fetchedSents = 0, fetchedBytes = 0;
terms.forEach(function (n) {
  var bi = H.bucketOf(n, 512);
  if (wanted[bi]) return;
  wanted[bi] = 1;
  var p = path.join(QB, 'bucket', 'bucket.' + bi + '.json');
  if (!fs.existsSync(p)) return;
  var rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  fetchedBytes += fs.statSync(p).size;
  rows.forEach(function (r) { fetchedEnts++; fetchedSents += r[1].length; });
});
var res = EE.retrieve(
  terms.reduce(function (acc, n) {
    var bi = H.bucketOf(n, 512);
    var p = path.join(QB, 'bucket', 'bucket.' + bi + '.json');
    return fs.existsSync(p) ? acc.concat(JSON.parse(fs.readFileSync(p, 'utf8'))) : acc;
  }, []), 'q', OUTLINE.map(function (p) { return [p[0], p[1], []]; }), ed, {});
// The resolved name lives on `resolved`, not `entity` -- an earlier version of
// this probe read the wrong property and reported zero entities consulted while
// simultaneously reporting 18 sentences quoted, which is self-evidently wrong.
var usedEnts = {};
res.points.forEach(function (p) { if (p.resolved) usedEnts[p.resolved] = 1; });
var usedSents = res.points.reduce(function (a, p) { return a + p.evidence.length; }, 0);
console.log('  buckets fetched           ' + Object.keys(wanted).length);
console.log('  bytes fetched             ' + (fetchedBytes / 1048576).toFixed(1) + ' MB');
console.log('  entities in those buckets ' + fetchedEnts.toLocaleString());
console.log('  sentences in those buckets' + '  ' + fetchedSents.toLocaleString());
console.log('  entities actually read    ' + Object.keys(usedEnts).length);
console.log('  sentences actually quoted ' + usedSents);
console.log('');
console.log('  -> ' + (fetchedSents ? (usedSents / fetchedSents * 100).toFixed(2) : 0) +
  '% of the fetched sentences are consulted.');
console.log('  -> ' + (fetchedEnts ? (Object.keys(usedEnts).length / fetchedEnts * 100).toFixed(2) : 0) +
  '% of the fetched entities are consulted.');
console.log('');
console.log('The payload is available. The retrieval strategy only reads the rows');
console.log('it was told to look for, so related entities in the same bucket are');
console.log('never considered even though they are already downloaded.');