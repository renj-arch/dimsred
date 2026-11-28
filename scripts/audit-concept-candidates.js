// Scoped candidate audit: which entities in the corpus have a fact field long
// and clean enough to serve as a quoted definition in a mains answer?
//
// The full-corpus audit (scripts/audit-corpus-shape.js) established that the
// 1.5M questions are 100% Wikipedia fill-in-the-blank with a 1.5-word mean
// answer, so the questions themselves are useless as an answer source. The
// `fact` field is a different matter: it holds the Wikipedia lead sentence.
// This script measures whether that is a viable quoted-definition source for
// the ethics/biomedical concepts a GS-4 answer actually needs.
'use strict';
var fs = require('fs');
var path = require('path');
var DIR = path.resolve(__dirname, '..', 'data', 'questions');

var CATS = ['ethics-integrity', 'health-medicine', 'constitution', 'indian-judiciary', 'polity-governance', 'bioethics-missing'];

// Concepts a GS-4 / bioethics model answer must define correctly.
var TARGETS = [
  'paternalism', 'beneficence', 'autonomy', 'non-maleficence', 'nonmaleficence',
  'informed consent', 'medical negligence', 'medical ethics', 'bioethics',
  'euthanasia', 'advance directive', 'living will', 'assisted suicide',
  'organ donation', 'organ transplantation', 'brain death', 'abortion',
  'surrogate decision-making', 'patient rights', 'professional ethics',
  'deontological ethics', 'consequentialism', 'utilitarianism',
  'justice in healthcare', 'double effect', 'slippery slope argument',
  'transplantation', 'triple-blind', 'placebo', 'adverse drug reaction',
  'medical negligence and malpractice', 'duty of care', 'confidentiality',
  'physician-assisted suicide', 'capacity', 'therapeutic privilege'
];

function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

var files = fs.readdirSync(DIR).filter(function (f) { return /\.json$/.test(f); });
var picked = files.filter(function (f) {
  var base = f.replace(/-\d+\.json$/, '.json').replace(/\.json$/, '');
  return CATS.indexOf(base) !== -1;
});

var found = {}, scanned = 0, subjects = 0;
picked.forEach(function (f) {
  var doc;
  try { doc = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); }
  catch (e) { return; }
  Object.keys(doc).forEach(function (cat) {
    var subs = doc[cat] && doc[cat].subSubjects;
    if (!subs) return;
    Object.keys(subs).forEach(function (sub) {
      subjects++;
      var key = norm(sub);
      var isTarget = TARGETS.indexOf(key) !== -1;
      (subs[sub] || []).forEach(function (q) {
        scanned++;
        if (!isTarget) return;
        if (found[sub]) return;                       // first shard wins, they are duplicates
        found[sub] = { subject: sub, fact: q.fact, answer: q.answer, type: q.type, shard: f };
      });
    });
  });
});

console.log('=== TARGET CONCEPT COVERAGE ===');
console.log('shards scanned: ' + picked.length + '   entities: ' + subjects + '   questions: ' + scanned);
console.log('');
var have = [], missing = [];
TARGETS.forEach(function (t) {
  var hit = null;
  Object.keys(found).forEach(function (k) { if (norm(k) === t) hit = found[k]; });
  (hit ? have : missing).push(t);
});
console.log('FOUND (' + have.length + '/' + TARGETS.length + '):');
have.forEach(function (t) {
  var h = null; Object.keys(found).forEach(function (k) { if (norm(k) === t) h = found[k]; });
  var words = String(h.fact || '').split(/\s+/).filter(Boolean).length;
  console.log('  ' + t.padEnd(38) + ' fact=' + words + 'w  answer="' + String(h.answer).slice(0, 20) + '"');
});
console.log('');
console.log('MISSING (' + missing.length + '): ' + missing.join(', '));
console.log('');

// How many of the found facts are actually usable as a quoted definition?
var usable = 0, thin = 0, truncated = 0;
Object.keys(found).forEach(function (k) {
  var fact = String(found[k].fact || '');
  var w = fact.split(/\s+/).filter(Boolean).length;
  if (w >= 12) usable++;
  else thin++;
  // A cloze generator sometimes leaves the blanked token as "_____".
  if (/_{3,}/.test(fact)) truncated++;
});
console.log('=== FACT QUALITY (' + Object.keys(found).length + ' target facts found) ===');
console.log('  >=12 words (usable as a definition): ' + usable);
console.log('  <12 words (too thin to quote):        ' + thin);
console.log('  contains blanked token "_____":        ' + truncated);
