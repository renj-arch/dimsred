'use strict';
// Regression suite for the exam-scope ground check.
//
// The live archive is full of Wikipedia-derived items. A broad subject
// heuristic used to label every one of them "High relevance" (the reported
// case: Addison Brown, a US district judge/botanist filed under Science &
// Technology). This suite pins the deterministic rules and proves the anchor
// vocabulary is grounded in the site's own exam taxonomy, not invented.
//
//   node scripts/lib/exam-scope.test.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = function (rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); };
const json = function (rel) { return JSON.parse(read(rel)); };

const ExamScope = require(path.join(ROOT, 'js', 'exam-scope.js'));

let pass = 0, fail = 0;
function assert(ok, label, detail) {
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok || !detail ? '' : '\n        ' + detail));
}

function hasReason(v, code) {
  return (v.reasons || []).some(function (r) { return r.indexOf(code) === 0; });
}

// The exact shape the archive loader now hands to annotate(). Keep this
// fixture byte-for-byte close to data/questions/science-technology.json.
const ADDISON = {
  type: 'fill_blank',
  category: 'Science & Technology',
  subject: 'Science & Technology',
  subSubject: 'Addison Brown',
  source: 'Wiki',
  question: 'There he met other lawyers, learned about the practice of law, and studied for the New York bar examination, which he passed in February _____',
  answer: '1855'
};

console.log('Exam-scope ground check');

// ---------------------------------------------------------------------------
// 1. The reported regression.
// ---------------------------------------------------------------------------
const addison = ExamScope.classify(ADDISON);
assert(addison.scope === 'out', 'Addison Brown biography is out of exam scope', JSON.stringify(addison));
assert(addison.tier === 'low', 'Addison Brown is tier=low so the old filter cannot call it high', JSON.stringify(addison));
assert(hasReason(addison, 'foreign-legal') || hasReason(addison, 'foreign-context'), 'Addison Brown cites foreign-context evidence', JSON.stringify(addison.reasons));
assert(hasReason(addison, 'biography-cloze'), 'Addison Brown cites biography-cloze evidence', JSON.stringify(addison.reasons));
assert(hasReason(addison, 'named-person'), 'Addison Brown is recognised as a named person', JSON.stringify(addison.reasons));

// The "Key facts:" sibling from the same Wikipedia page is a fact dump, not a
// question, and must not inherit the subject's relevance either.
const keyFacts = ExamScope.classify({
  type: 'qa',
  subject: 'Science & Technology',
  subSubject: 'Addison Brown',
  source: 'Wiki',
  question: 'Key facts: Stricken with paralysis, Addison Brown died at his Manhattan home on April 9, 1913, at age 83.'
});
assert(keyFacts.scope === 'out', 'Wikipedia "Key facts:" item is out', JSON.stringify(keyFacts));
assert(hasReason(keyFacts, 'wiki-fact-dump'), 'Wikipedia fact dump is named as the reason', JSON.stringify(keyFacts.reasons));

// ---------------------------------------------------------------------------
// 2. Known exam-specific items stay in scope.
// ---------------------------------------------------------------------------
const polity = ExamScope.classify({
  type: 'mcq',
  subject: 'Polity',
  subSubject: 'Fundamental Rights',
  question: 'Which Article of the Constitution guarantees the Right to Constitutional Remedies?'
});
assert(polity.scope === 'exam', 'Fundamental Rights item is exam-specific', JSON.stringify(polity));
assert(polity.tier === 'high', 'Polity anchor is high tier', JSON.stringify(polity));
assert(hasReason(polity, 'anchor:polity'), 'Polity anchor is cited', JSON.stringify(polity.reasons));

const isro = ExamScope.classify({
  type: 'mcq',
  subject: 'Science & Technology',
  subSubject: 'Chandrayaan-3',
  question: 'Chandrayaan-3 was launched by which organisation?'
});
assert(isro.scope === 'exam', 'Chandrayaan item is exam-specific', JSON.stringify(isro));
assert(hasReason(isro, 'anchor:science'), 'Science anchor is cited for Chandrayaan', JSON.stringify(isro.reasons));

const cgl = json('papers-data/cgl-13-sep-2025-s1.json');
const constitutionQ = (cgl.questions || []).filter(function (q) {
  return /Which Article of the Constitution/.test(q.text || '');
})[0];
assert(!!constitutionQ, 'Real CGL paper contains the Constitution calibration item');
if (constitutionQ) {
  const real = ExamScope.classify({ question: constitutionQ.text, type: 'mcq', subject: 'General Awareness', options: constitutionQ.options });
  assert(real.scope === 'exam', 'Real CGL Constitution question is exam-specific', JSON.stringify(real));
}

// ---------------------------------------------------------------------------
// 3. Off-syllabus material is not rescued by its broad subject.
// ---------------------------------------------------------------------------
const cricket = ExamScope.classify({
  type: 'mcq',
  subject: 'Sports',
  subSubject: '2023 Cricket World Cup',
  question: 'Who won the 2023 Cricket World Cup?'
});
assert(cricket.scope === 'out', 'Cricket World Cup is out of exam scope', JSON.stringify(cricket));
assert(hasReason(cricket, 'sport'), 'Sport is named as the reason', JSON.stringify(cricket.reasons));

const film = ExamScope.classify({
  type: 'mcq',
  subject: 'Art & Culture',
  subSubject: 'Oppenheimer (film)',
  question: 'Who directed the film Oppenheimer?'
});
assert(film.scope === 'out', 'Film trivia is out of exam scope', JSON.stringify(film));

const olympics = ExamScope.classify({
  type: 'mcq',
  subject: 'General Knowledge',
  question: 'In the Indian Olympic Games 2024, which sport did India win its first gold medal in?'
});
assert(olympics.scope === 'out', 'Olympic medal trivia is out of exam scope', JSON.stringify(olympics));

// ---------------------------------------------------------------------------
// 4. Explicit metadata wins, but `importance` alone is not scope.
// ---------------------------------------------------------------------------
const explicitOut = ExamScope.classify({
  type: 'mcq',
  subject: 'Polity',
  question: 'Which Article of the Constitution guarantees equality?',
  examScope: 'out'
});
assert(explicitOut.scope === 'out', 'Explicit examScope=out overrides a syllabus anchor', JSON.stringify(explicitOut));

const explicitHigh = ExamScope.classify({
  type: 'mcq',
  subject: 'Misc',
  question: 'An obscure item',
  relevance: 'high'
});
assert(explicitHigh.scope === 'exam' && explicitHigh.tier === 'high', 'Explicit relevance=high is honoured', JSON.stringify(explicitHigh));

const importanceOnly = ExamScope.classify({
  type: 'qa',
  subject: 'Science & Technology',
  subSubject: 'Addison Brown',
  source: 'Wiki',
  question: 'There he met other lawyers, learned about the practice of law, and studied for the New York bar examination, which he passed in February _____',
  importance: 'medium',
  importantFor: ['UPSC']
});
assert(importanceOnly.scope === 'out', 'importance/importantFor alone cannot make a fact dump exam-specific', JSON.stringify(importanceOnly));

// ---------------------------------------------------------------------------
// 5. The anchor vocabulary is specific and grounded.
// ---------------------------------------------------------------------------
const BARE_SUBJECT_WORDS = [
  'science', 'technology', 'history', 'geography', 'polity', 'economy',
  'environment', 'current affairs', 'general awareness', 'general knowledge',
  'general studies', 'static gk'
];
let bare = [];
ExamScope.ANCHORS.forEach(function (a) {
  (a.terms || []).forEach(function (term) {
    if (BARE_SUBJECT_WORDS.indexOf(String(term).toLowerCase()) !== -1) bare.push(a.id + ':' + term);
  });
});
assert(bare.length === 0, 'No anchor is a bare subject word', bare.join(', '));

const upscTopics = json('data/upsc-topics.json');
let missingUpsc = [];
ExamScope.ANCHORS.forEach(function (a) {
  (a.sources || []).forEach(function (src) {
    if (src.indexOf('upsc:') === 0 && !Object.prototype.hasOwnProperty.call(upscTopics, src.slice(5))) {
      missingUpsc.push(a.id + ' -> ' + src);
    }
  });
});
assert(missingUpsc.length === 0, 'Every upsc: anchor source exists in data/upsc-topics.json', missingUpsc.join(', '));

const pyq = json('data/pyq-patterns.json');
const pyqTopics = {};
Object.keys(pyq.exams || {}).forEach(function (k) {
  ((pyq.exams[k] || {}).topTopics || []).forEach(function (t) { pyqTopics[t.topic] = 1; });
});
let missingPyq = [];
ExamScope.ANCHORS.forEach(function (a) {
  (a.sources || []).forEach(function (src) {
    if (src.indexOf('pyq:') === 0 && !pyqTopics[src.slice(4)]) missingPyq.push(a.id + ' -> ' + src);
  });
});
assert(missingPyq.length === 0, 'Every pyq: anchor source exists in data/pyq-patterns.json', missingPyq.join(', '));

let missingSubject = ExamScope.SYLLABUS_SUBJECTS.filter(function (s) {
  return !Object.prototype.hasOwnProperty.call(upscTopics, s);
});
assert(missingSubject.length === 0, 'Syllabus whitelist is a subset of data/upsc-topics.json', missingSubject.join(', '));

assert(ExamScope.looksLikePerson('Addison Brown') === true, 'Person detector accepts Addison Brown');
assert(ExamScope.looksLikePerson('Adder (electronics)') === false, 'Person detector rejects Adder (electronics)');

// ---------------------------------------------------------------------------
// 6. annotate() is the one mapping the archive loaders call.
// ---------------------------------------------------------------------------
const annotated = ExamScope.annotate(ADDISON);
assert(annotated.examScope === 'out', 'annotate() sets examScope=out', JSON.stringify(annotated));
assert(annotated.relevance === 'low', 'annotate() sets relevance=low for the existing filter', JSON.stringify(annotated));
assert(Array.isArray(annotated.scopeReasons) && annotated.scopeReasons.length > 0, 'annotate() keeps human-readable reasons');
assert(annotated.scopeVersion === ExamScope.VERSION, 'annotate() records the rule version');
assert(ADDISON.examScope === undefined, 'annotate() does not mutate the source object');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
