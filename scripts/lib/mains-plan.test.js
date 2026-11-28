'use strict';
// Regression suite for the shared UPSC Mains planner and the mains page.
//
// Why this exists
// ---------------
// The first 36 fresh mains items were all GS3 because the old prompt let the
// model choose the paper and showed it only a GS3 example. These tests pin the
// fix: the planner chooses the least-covered paper before the model is called,
// the shape gate rejects a reply that drifts, and the page refuses to relabel
// a generated reply as another paper. They also keep the authored bank honest:
// every paper must have at least one question, and every question must pass
// the same quality rubric the promotion gate uses.
//
//   node scripts/lib/mains-plan.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const plan = require('./mains-plan');
const quality = require('./mains-quality');

const ROOT = path.join(__dirname, '..', '..');
const read = function (rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); };
const bank = JSON.parse(read('data/mains-questions.json'));
const fresh = JSON.parse(read('data/mains-fresh.json'));

let pass = 0, fail = 0;
function assert(ok, label, detail) {
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok || !detail ? '' : '\n        ' + detail));
}
function assertEqual(actual, expected, label) {
  assert(actual === expected, label, 'got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected));
}

// ---- 1. catalogue ---------------------------------------------------------
assertEqual(plan.PAPER_IDS.length, 9, 'nine papers in the catalogue');
plan.PAPERS.forEach(function (p) {
  assert(!!p.kind, p.id + ' has a kind');
  assert(String(p.guide || '').length > 80, p.id + ' has a real guide');
});
assertEqual(quality.targetWords(25), 375, '25-mark optional target is 375 words');
assertEqual(quality.targetWords(30), 450, '30-mark optional target is 450 words');
assert(plan.OPTIONAL_SUBJECTS.length >= 8, 'optional subject catalogue has at least eight subjects');
plan.OPTIONAL_SUBJECTS.forEach(function (s) {
  assert(!!s.p1 && !!s.p2, s.id + ' has Paper I and Paper II focus');
});

// ---- 2. deterministic paper rotation -------------------------------------
const items = [];
const seenPapers = {};
for (let i = 0; i < 9; i++) {
  const t = plan.nextTarget(items);
  assert(!!t, 'rotation step ' + i + ' produced a target');
  seenPapers[t.paper] = true;
  items.push({ paper: t.paper, subject: t.subject || '', lang: t.lang || '' });
}
assertEqual(Object.keys(seenPapers).length, 9, 'nine rotation steps cover all nine papers');
assertEqual(items[5].paper, 'optional1', 'optional Paper I appears in the first cycle');
assertEqual(items[6].paper, 'optional2', 'optional Paper II appears in the first cycle');
assertEqual(items[7].lang, 'hi', 'Indian Language target is Hindi');
assertEqual(items[8].lang, 'en', 'English Language target is English');

// Least-covered subject, not a fixed favourite.
const optItems = [
  { paper: 'optional1', subject: 'psir' },
  { paper: 'optional1', subject: 'psir' }
];
assertEqual(plan.nextTarget(optItems, { paper: 'optional1' }).subject, 'sociology',
  'optional target moves to the least-covered subject');

// Target facts are concrete.
const gs1 = plan.nextTarget([], { paper: 'gs1' });
assertEqual(gs1.marks, 15, 'GS1 target starts at 15 marks');
assert(plan.allowedMarks('gs1').indexOf(gs1.marks) !== -1, 'GS marks are allowed for GS1');
const essay = plan.nextTarget([], { paper: 'essay' });
assertEqual(essay.marks, 125, 'essay target is 125 marks');
assert(plan.allowedMarks('essay').indexOf(essay.marks) !== -1, '125 marks is allowed for the essay');
const lang = plan.nextTarget([], { paper: 'lang-indian' });
assertEqual(lang.lang, 'hi', 'Indian Language target carries lang=hi');
assertEqual(lang.task, 'essay', 'Indian Language target carries task=essay');

// ---- 3. prompt states the target and never offers a choice --------------
const prompt = plan.buildPrompt(gs1, ['an older question']);
assert(prompt.sys.indexOf('TARGET: GS Paper 1 (gs1), 15 marks') !== -1, 'prompt states the target paper and marks');
assert(prompt.sys.indexOf('"paper" field MUST be exactly "gs1"') !== -1, 'prompt fixes the paper field');
assert(prompt.user.indexOf('Do not change the paper') !== -1, 'prompt forbids paper drift');
assert(prompt.user.indexOf('Pick the paper') === -1, 'prompt does not tell the model to pick the paper');
const optPrompt = plan.buildPrompt(plan.nextTarget([], { paper: 'optional1' }), []);
assert(optPrompt.sys.indexOf('optional subject "psir"') !== -1, 'optional prompt names the subject');
const hiPrompt = plan.buildPrompt(lang, []);
assert(hiPrompt.sys.indexOf('Devanagari') !== -1, 'Hindi prompt asks for Devanagari');

// ---- 4. shape gate rejects drift ----------------------------------------
const gs1Item = bank.questions.find(function (q) { return q.id === 'gs1-revolt-1857'; });
const gs3Item = bank.questions.find(function (q) { return q.id === 'gs3-disaster-management'; });
const psirItem = bank.questions.find(function (q) { return q.id === 'optional1-psir-basic-structure'; });
const hindiItem = bank.questions.find(function (q) { return q.id === 'lang-indian-hindi-social-media'; });

assertEqual(plan.shapeReason(gs1Item, { paper: 'gs2', marks: 15, kind: 'gs' }),
  'wrong paper (expected gs2)', 'shape gate rejects a reply for another paper');
assertEqual(plan.shapeReason(gs1Item, { paper: 'gs1', marks: 20, kind: 'gs' }),
  'wrong marks (expected 20)', 'shape gate rejects wrong marks');
assertEqual(plan.shapeReason(psirItem, { paper: 'optional1', marks: 15, kind: 'optional', subject: 'sociology' }),
  'wrong subject (expected sociology)', 'shape gate rejects the wrong optional subject');
const hindiTarget = { paper: 'lang-indian', marks: 15, kind: 'language', lang: 'hi', task: 'essay' };
assertEqual(plan.shapeReason(hindiItem, hindiTarget), null, 'shape gate accepts the Hindi item for its target');
const asciiHindi = JSON.parse(JSON.stringify(hindiItem));
asciiHindi.question = 'Write a short essay in English about public discourse and its many uses today. (15 marks, 250 words)';
asciiHindi.answer = asciiHindi.answer.map(function (s, i) {
  return {
    h: 'Section ' + (i + 1),
    p: 'This paragraph is written only in English so that the Devanagari script check has nothing to accept, and it is long enough to pass the shape gate before the script test runs. It repeats itself only to satisfy the minimum paragraph length required by the gate, not because the argument needs it.'
  };
});
assertEqual(plan.shapeReason(asciiHindi, hindiTarget), 'Hindi (Devanagari) expected',
  'shape gate rejects an English reply for the Hindi paper');

// ---- 5. duplicate and quality gates -------------------------------------
const a = { paper: 'gs3', topic: 'Geopolitics of Critical Minerals', question: 'Discuss the geopolitics of critical minerals in the Indo-Pacific.' };
const b = { paper: 'gs3', topic: 'Critical Minerals Supply Chain', question: 'Examine India\'s critical minerals supply chain and its strategic implications.' };
assert(!!plan.isDuplicate(b, [a]), 'topic-token duplicate detects a reworded critical-minerals question');
assert(!plan.isDuplicate({ paper: 'gs1', topic: 'Monsoon', question: 'Discuss the monsoon.' }, [a]),
  'different paper and topic is not a duplicate');

assertEqual(plan.qualityReason(gs1Item), null, 'quality gate accepts the authored GS1 item');
const weak = {
  paper: 'gs1', marks: 15,
  question: 'Discuss a topic (15 marks, 250 words)',
  answer: [{ h: 'Introduction', p: 'Too short.' }],
  marksGuide: [], pitfalls: [], keywords: []
};
assert(/^quality: /.test(plan.qualityReason(weak) || ''), 'quality gate rejects a weak item');

assertEqual(plan.validate(gs1Item, plan.nextTarget([], { paper: 'gs1' }), []), null,
  'validate accepts a matching, unique, quality item');
const dupCandidate = JSON.parse(JSON.stringify(gs1Item));
dupCandidate.question = 'A different wording of the same 1857 question, long enough to pass the shape gate and reach the duplicate check. (15 marks, 250 words)';
assert(/^duplicate of gs1-revolt-1857/.test(plan.validate(dupCandidate, plan.nextTarget([], { paper: 'gs1' }), [gs1Item]) || ''),
  'validate rejects a duplicate topic');

// ---- 6. promotion shape ---------------------------------------------------
const made = plan.toItem(gs1Item, plan.nextTarget([], { paper: 'gs1' }), { prefix: 'ci-', origin: 'ci', model: 'test' });
assert(/^ci-/.test(made.id), 'toItem keeps the requested id prefix');
assertEqual(made.origin, 'ci', 'toItem keeps origin');
assertEqual(made.ai, 1, 'toItem marks the item AI-generated');
assert(made.quality && made.quality.score >= 80, 'toItem records a passing quality score');
assert(!made.subject && !made.lang, 'GS1 item carries no optional subject or language');
const madeOpt = plan.toItem(psirItem, plan.nextTarget([], { paper: 'optional1' }), { prefix: 'ci-' });
assertEqual(madeOpt.subject, 'psir', 'optional promotion preserves the subject');
const madeLang = plan.toItem(hindiItem, plan.nextTarget([], { paper: 'lang-indian' }), { prefix: 'ci-' });
assertEqual(madeLang.lang, 'hi', 'language promotion preserves lang');
assertEqual(madeLang.task, 'essay', 'language promotion preserves task');

// ---- 7. coverage ---------------------------------------------------------
const cov = plan.coverage([{ paper: 'gs1' }, { paper: 'optional1', subject: 'psir' }]);
assertEqual(cov.total, 2, 'coverage total');
assertEqual(cov.byPaper.gs1, 1, 'coverage counts GS1');
assertEqual(cov.bySubject['optional1:psir'], 1, 'coverage counts optional subject');

// ---- 8. authored bank integrity -----------------------------------------
assertEqual(bank.papers.length, 9, 'the bank has nine papers');
assert(Array.isArray(bank.optionalSubjects) && bank.optionalSubjects.length >= 8, 'the bank publishes the optional subject catalogue');
const counts = {};
bank.questions.forEach(function (q) {
  counts[q.paper] = (counts[q.paper] || 0) + 1;
  const qa = quality.assess(q);
  assert(qa.ok, q.id + ' passes the shared quality rubric',
    qa.failures.join('; ') + ' score=' + qa.score + ' words=' + qa.words);
  if (q.paper === 'optional1' || q.paper === 'optional2') {
    assert(!!plan.optionalSubject(q.subject), q.id + ' has a known optional subject');
  }
  if (q.paper === 'lang-indian' || q.paper === 'lang-english') {
    assert(!!q.lang && !!q.task, q.id + ' carries lang and task');
  }
});
bank.papers.forEach(function (p) {
  assert((counts[p.id] || 0) > 0, p.id + ' has at least one reviewed question');
});

// ---- 9. fresh pool integrity -------------------------------------------
assert(Array.isArray(fresh.items), 'fresh pool has an items array');
const known = bank.questions.slice();
fresh.items.forEach(function (q) {
  const qa = quality.assess(q);
  assert(qa.ok, 'fresh ' + q.id + ' passes the quality rubric', qa.failures.join('; '));
  assert(!plan.isDuplicate(q, known), 'fresh ' + q.id + ' is not a duplicate');
  known.push(q);
});

// ---- 10. page behaviour (a tiny DOM, no browser install) ----------------
const html = read('mains.html');
assert(html.indexOf('id="subjectbar"') !== -1, 'page has an optional-subject selector host');
assert(html.indexOf('id="paperGuide"') !== -1, 'page has a paper guide host');
assert(html.indexOf('id="freshStat"') !== -1, 'page has a fresh-batch coverage line');

function makeEl(id) {
  return {
    id: id,
    innerHTML: '',
    textContent: '',
    hidden: false,
    disabled: false,
    style: {},
    addEventListener: function () {},
    querySelectorAll: function () { return []; }
  };
}
const els = {};
const fakeDocument = {
  getElementById: function (id) { return els[id] || (els[id] = makeEl(id)); },
  querySelectorAll: function () { return []; },
  addEventListener: function () {}
};
const fakeStorage = {
  getItem: function () { return '[]'; },
  setItem: function () {},
  removeItem: function () {}
};
const context = {
  console: console,
  document: fakeDocument,
  localStorage: fakeStorage,
  navigator: { gpu: null },
  window: { addEventListener: function () {} },
  Date: Date,
  JSON: JSON,
  Math: Math,
  String: String,
  Number: Number,
  Array: Array,
  Object: Object,
  RegExp: RegExp,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN
};
vm.createContext(context);
const scriptMatch = /<script>\s*'use strict';([\s\S]*?)Promise\.all\(\[/.exec(html);
assert(!!scriptMatch, 'mains inline script can be isolated for the DOM test');
vm.runInContext('"use strict";\nvar STATE = { data: null, paper: "all", subject: "all", term: "" };' + scriptMatch[1], context);

context.boot(bank);
assert((els.paperChips.innerHTML.match(/data-paper=/g) || []).length === 9, 'boot renders one chip per paper');
assert(/GS Paper 1 \([1-9]\d*\)/.test(els.paperChips.innerHTML), 'GS1 chip reports a non-zero reviewed count');
assert(/Optional Paper 1 \([1-9]\d*\)/.test(els.paperChips.innerHTML), 'Optional Paper 1 chip is non-zero');
assert(/Indian Language \([1-9]\d*\)/.test(els.paperChips.innerHTML), 'Indian Language chip is non-zero');

context.STATE.paper = 'optional1';
context.STATE.subject = 'all';
context.renderSubjectBar();
context.renderGuide();
context.render();
assert(!els.subjectbar.hidden, 'optional paper reveals the subject selector');
assert(/Political Science &amp; International Relations \([1-9]\d*\)/.test(els.subjectbar.innerHTML),
  'subject selector shows the PSIR count');
assert(els.paperGuide.innerHTML.indexOf('Paper I focus') !== -1, 'optional guide shows the Paper I/II map');
assert(els.list.innerHTML.indexOf('q-optional1-psir-basic-structure') !== -1,
  'optional paper lists the PSIR question');

context.STATE.subject = 'sociology';
context.render();
assert(els.list.innerHTML.indexOf('No reviewed question matches that filter') !== -1,
  'an empty optional subject gets an honest empty state');
context.STATE.subject = 'psir';
context.render();
assert(els.list.innerHTML.indexOf('q-optional1-psir-basic-structure') !== -1,
  'selecting PSIR restores its question');

context.STATE.paper = 'lang-indian';
context.STATE.subject = 'all';
context.renderSubjectBar();
context.renderGuide();
context.render();
assert(els.subjectbar.hidden, 'language paper hides the optional-subject selector');
assert(els.paperGuide.innerHTML.indexOf('qualifying papers') !== -1, 'language guide explains the qualifying paper');
assert(els.list.innerHTML.indexOf('q-lang-indian-hindi-social-media') !== -1,
  'language paper lists the Hindi practice item');

// Generated replies must match the selected target; a valid reply for another
// paper is not relabelled.
context.STATE.paper = 'gs1';
context.STATE.subject = 'all';
assertEqual(context.cleanAI(gs3Item, true), null, 'generated GS3 reply is rejected while GS1 is selected');
assert(!!context.cleanAI(gs1Item, true), 'generated GS1 reply is accepted while GS1 is selected');
assertEqual(context.cleanAI({ paper: 'gs9', question: gs1Item.question, answer: gs1Item.answer }, true), null,
  'an unknown paper is rejected instead of falling back to gs1');

context.STATE.paper = 'optional1';
context.STATE.subject = 'psir';
assert(!!context.cleanAI(psirItem, true), 'generated PSIR reply is accepted for the PSIR target');
context.STATE.subject = 'sociology';
assertEqual(context.cleanAI(psirItem, true), null, 'generated PSIR reply is rejected for a Sociology target');

context.STATE.paper = 'lang-indian';
context.STATE.subject = 'all';
assert(!!context.cleanAI(hindiItem, true), 'generated Hindi reply is accepted for the Indian Language paper');
const wrongLang = JSON.parse(JSON.stringify(hindiItem));
wrongLang.lang = 'en';
assertEqual(context.cleanAI(wrongLang, true), null, 'generated reply with the wrong language is rejected');

// Target-aware prompt.
context.STATE.paper = 'optional1';
context.STATE.subject = 'psir';
const pOpt = context.aiPrompt();
assert(pOpt.user.indexOf('Optional subject: Political Science & International Relations') !== -1,
  'in-browser prompt names the optional subject');
assert(pOpt.user.indexOf('"paper":"optional1"') !== -1, 'in-browser prompt fixes the paper');
assert(pOpt.user.indexOf('"subject":"psir"') !== -1, 'in-browser prompt puts the subject in the example shape');
assert(pOpt.user.indexOf('Pick the least-covered paper') === -1, 'in-browser prompt does not offer a free choice');
context.STATE.paper = 'essay';
const pEssay = context.aiPrompt();
assert(pEssay.user.indexOf('"paper":"essay"') !== -1, 'essay prompt fixes the paper');
assert(pEssay.user.indexOf('"marks":125') !== -1, 'essay prompt uses a 125-mark example');
context.STATE.paper = 'lang-indian';
const pHi = context.aiPrompt();
assert(pHi.user.indexOf('Hindi (Devanagari)') !== -1, 'in-browser prompt asks for Hindi');
assert(pHi.user.indexOf('"lang":"hi"') !== -1, 'Hindi prompt puts lang=hi in the example shape');
assert(pHi.user.indexOf('"task":"essay"') !== -1, 'Hindi prompt puts task=essay in the example shape');

// Fresh coverage line.
context.FRESH.items = [
  { id: 'ci-test-gs3', paper: 'gs3', marks: 15, question: 'Discuss a test question for the fresh coverage line. (15 marks, 250 words)', answer: [
    { h: 'Introduction', p: 'A first paragraph that is long enough for the page card and for the local cleaner.' },
    { h: 'Conclusion', p: 'A closing paragraph that is long enough for the page card and for the local cleaner.' }
  ] },
  { id: 'ci-test-gs1', paper: 'gs1', marks: 15, question: 'Discuss another test question for the fresh coverage line. (15 marks, 250 words)', answer: [
    { h: 'Introduction', p: 'A first paragraph that is long enough for the page card and for the local cleaner.' },
    { h: 'Conclusion', p: 'A closing paragraph that is long enough for the page card and for the local cleaner.' }
  ] }
];
context.renderFresh();
assert(!els.freshWrap.hidden, 'fresh batch reveals its section');
assert(els.freshStat.textContent.indexOf('2 unreviewed items') !== -1, 'fresh coverage reports the pool size');
assert(els.freshStat.textContent.indexOf('GS 3 1') !== -1, 'fresh coverage reports per-paper counts');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
