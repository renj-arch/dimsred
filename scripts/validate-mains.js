// validate-mains.js -- gate on data/mains-questions.json before it is published.
//
// WHY A GATE AT ALL
// -----------------
// This bank is hand-authored, which is exactly why it needs checking: nothing
// regenerates it, so a truncated edit, a deleted section, or a question that
// silently lost its pitfalls list would ship unnoticed. The other data files in
// this repo are validated by scripts/validate-graph.js on the same principle --
// a wrong figure or a wrong type is worse than a missing one, so the question
// asked of every artefact is "would a reader be misled by this?".
//
// The provenance rule this enforces is the important one: these are MODEL
// answers, not official UPSC keys. The disclaimer must be present and must say
// so, because a reader who believes an answer is official will reproduce it in
// the examination hall as though it were.
'use strict';
var fs = require('fs');
var path = require('path');

var FILE = path.resolve(__dirname, '..', 'data', 'mains-questions.json');
var data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
var errors = [];
var warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

// --- meta / provenance ---
if (!data.meta) err('meta block is missing');
if (!data.meta || !data.meta.disclaimer) err('meta.disclaimer is missing: provenance would be ambiguous');
else {
  var d = data.meta.disclaimer.toLowerCase();
  if (d.indexOf('not official') === -1 && d.indexOf('not the official') === -1) {
    err('meta.disclaimer must state that these are NOT official UPSC answer keys');
  }
  if (d.indexOf('legal advice') === -1) warn('disclaimer does not defer legal/verification advice');
}
if (!data.papers || !data.papers.length) err('papers list is empty');

// --- paper ids referenced by questions must exist ---
var paperIds = {};
(data.papers || []).forEach(function (p) {
  if (!p.id) return err('a paper entry has no id');
  paperIds[p.id] = p;
  if (!p.name) warn('paper ' + p.id + ' has no display name');
});

var MIN_SECTIONS = 3;      // an answer with fewer is a stub, not a model answer
var MIN_MARKS_GUIDE = 4;   // what the examiner rewards is the point of the bank
var seen = {};

(data.questions || []).forEach(function (q, i) {
  var at = 'questions[' + i + '] (' + (q.id || 'no id') + ')';
  if (!q.id) err(at + ': missing id');
  else if (seen[q.id]) err(at + ': duplicate id "' + q.id + '"');
  else seen[q.id] = true;

  if (!q.paper || !paperIds[q.paper]) err(at + ': paper "' + q.paper + '" is not in the papers list');
  if (!q.question || q.question.length < 40) err(at + ': question text missing or too short to be a mains question');
  if (!(q.marks > 0)) err(at + ': marks must be a positive number');

  if (!q.answer || !q.answer.length) err(at + ': no answer sections');
  else if (q.answer.length < MIN_SECTIONS) warn(at + ': only ' + q.answer.length + ' answer sections; a model answer needs at least ' + MIN_SECTIONS);
  (q.answer || []).forEach(function (sec, k) {
    var sat = at + ' answer[' + k + ']';
    if (!sec.h) err(sat + ': section has no heading');
    if (!sec.p || sec.p.length < 80) err(sat + ': section body is missing or too short to carry an argument');
  });

  if (!q.marksGuide || q.marksGuide.length < MIN_MARKS_GUIDE) {
    warn(at + ': marksGuide has ' + ((q.marksGuide || []).length) + ' items; expected at least ' + MIN_MARKS_GUIDE);
  }
  if (!q.pitfalls || !q.pitfalls.length) warn(at + ': no pitfalls listed');
  (q.laws || []).forEach(function (law) {
    if (/art\.\s*$/i.test(law)) warn(at + ': law "' + law + '" looks truncated');
  });
});

if (!(data.questions || []).length) err('no questions in the bank');

// --- coverage: the bank is small on purpose, but an empty paper is a gap worth seeing ---
(data.papers || []).forEach(function (p) {
  var n = (data.questions || []).filter(function (q) { return q.paper === p.id; }).length;
  if (!n) warn('paper "' + p.name + '" has no questions yet');
});

console.log('=== MAINS BANK ===');
console.log('questions: ' + (data.questions || []).length + '   papers: ' + Object.keys(paperIds).length);
(data.questions || []).forEach(function (q) {
  var secs = (q.answer || []).length;
  console.log('  [' + q.paper + '] ' + q.marks + 'm  ' + secs + ' sections  ' + q.id);
});
if (warnings.length) {
  console.log('\n--- warnings (' + warnings.length + ') ---');
  warnings.forEach(function (w) { console.log('  warn   ' + w); });
}
console.log('\n=== SUMMARY ===');
console.log('errors: ' + errors.length + ' | warnings: ' + warnings.length);
errors.forEach(function (e) { console.log('  ERROR  ' + e); });
process.exit(errors.length ? 1 : 0);
