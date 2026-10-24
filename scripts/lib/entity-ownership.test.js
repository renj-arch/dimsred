'use strict';
// Regression suite for the entity-ownership gate.
//
// Every case here is a bug that actually shipped. They are kept as executable
// assertions because each heuristic that fixed one of them broke another:
// deriving surname aliases turned the year "1919" into an entity, and deriving
// acronyms invented colliding aliases that hijacked unrelated subjects.
//
//   node scripts/lib/entity-ownership.test.js
const path = require('path');
const EO = require('./entity-ownership.js');

const NAMES = [
  'World War I', 'First World War', 'WWI', 'Middle Eastern theatre',
  'Otto von Bismarck', 'Royal African Company', 'Holy Roman Emperor',
  'Wilhelm II', 'Herbert Hoover', 'Treaty of Versailles',
  'Henry Ford', 'Ford Motor Company', 'Model T', 'Nikola Tesla', 'Thomas Edison',
  'Detroit', 'Michigan', 'Lincoln Motor Company', 'World War II',
  'Rabindranath Tagore', 'Tagore', 'Jagadish Chandra Bose', 'Vikram Sarabhai',
  'Jallianwala Bagh massacre', 'Muhammad Ali Jinnah', 'Jinnah', 'George VI',
  'Anno Lucis', 'Isaac Newton', 'Masoretic chronology', 'Skandagupta', 'Kalidasa',
  'German Revolution of 1918-1919', 'Cyrus the Great', 'Quasi judicial body',
  'Indian independence movement', 'Mahatma Gandhi', 'Gopal Krishna Gokhale',
  'Goods and Services Tax (India)', 'GST', 'ISRO', 'Chandrayaan-1',
  'Ashoka', 'Barren Island', 'Second Battle of Panipat',
  'Akbar', 'Hemu', 'Sten Konow'
];
const aliasIndex = EO.buildAliasIndex(NAMES);
const idSet = EO.buildIdSet(NAMES, aliasIndex);

function evaluate(selected, sentence, claimant, opts) {
  opts = opts || {};
  const sel = EO.resolveEntity(selected, aliasIndex).id;
  const ctx = {
    selectedId: sel,
    idSet,
    aliasIndex,
    claimantId: claimant ? EO.canonicalId(claimant) : null,
    claimantName: claimant || null,
    provenanceAuthoritative: !!opts.provenanceAuthoritative
  };
  const subj = EO.detectSubject(sentence, ctx);
  const factType = EO.classifyFactType(sentence);
  const verdict = EO.ownsFact({
    subjectId: subj.subjectId,
    subjectName: subj.subjectName,
    uncertain: subj.uncertain,
    factType,
    eventId: subj.selectedIsExplicitAgent ? sel : null,
    participationExplicit: !!subj.selectedIsExplicitAgent,
    confidence: subj.confidence
  }, sel);
  return {
    verdict,
    subj,
    factType,
    mentions: EO.mentionsEntity(sentence, sel, idSet, aliasIndex),
    kept: verdict.ok && EO.isPrimaryType(factType)
  };
}

// ---------------------------------------------------------------------------
// 1. a neighbour's biography is never the selected entity's fact
// ---------------------------------------------------------------------------
const OWNERSHIP_CASES = [
  ['World War I', 'Otto von Bismarck served as the first and longest-tenured chancellor of the German Empire from 1871 to 1890', 'German Empire', false],
  ['World War I', 'The Royal African Company was an English trading company set up in 1660 by the House of Stuart', 'Royal African Company', false],
  ['World War I', 'Their status was officially recognised by the Holy Roman Emperor in 1514', 'German Empire', false],
  ['Henry Ford', 'Nikola Tesla was an American inventor and electrical engineer', 'Nikola Tesla', false],
  ['Rabindranath Tagore', 'Jagadish Chandra Bose was a plant physiologist and physicist', 'Jagadish Chandra Bose', false],
  ['Rabindranath Tagore', 'Vikram Sarabhai was the father of the Indian space programme', 'Vikram Sarabhai', false],
  ['Muhammad Ali Jinnah', 'George VI was King of the United Kingdom from 1936 to 1952', 'George VI', false],
  ['Anno Lucis', 'Notably, Isaac Newton\u2019s calculation pointed at the year 4000 BC', 'Isaac Newton', false],
  ['Kalidasa', 'Skandagupta was a Gupta emperor who defeated the Huns', 'Skandagupta', false],
  // a year must never be readable as a name
  ['Jallianwala Bagh massacre', '1919 British massacre of civilians at Amritsar', null, true],
  // a possessive is a modifier, not the subject
  ['Chandrayaan-1', 'ISRO\u2019s first lunar orbiter (2008)', null, true]
];

// ---------------------------------------------------------------------------
// 2. an owned, unambiguous statement is kept
// ---------------------------------------------------------------------------
const KEEP_CASES = [
  ['World War I', 'World War I lasted from 1914 to 1918', null, false],
  ['Henry Ford', 'Henry Ford was an American industrialist and businessman', null, false],
  ['Henry Ford', 'Ford Motor Company was established by Henry Ford in 1903', 'Ford Motor Company', false],
  ['Rabindranath Tagore', 'Rabindranath Tagore was a poet and Nobel laureate', null, false],
  ['Muhammad Ali Jinnah', 'Muhammad Ali Jinnah became the first Governor-General of Pakistan', null, false],
  ['Anno Lucis', 'Anno Lucis is a system for dating events', null, false],
  ['Mahatma Gandhi', 'Indian independence leader', 'Mahatma Gandhi', true],
  ['Ashoka', 'Mauryan emperor', 'Ashoka', true],
  ['Barren Island', 'Barren Island is a small island', 'Barren Island', true],
  ['Second Battle of Panipat', '1556 battle where Akbar\u2019s army defeated Hemu', 'Second Battle of Panipat', true]
];

// ---------------------------------------------------------------------------
// 3. alias hygiene - the specific ways automatic derivation went wrong
// ---------------------------------------------------------------------------
// Expectations are canonical ids, which are lower-cased and stripped of
// punctuation and parentheticals.
const ALIAS_CASES = [
  // a bare year must not resolve to the revolution whose name ends with it
  ['1919', '1919', 'muhammad/german revolution hijack'],
  ['1848', '1848', 'revolution hijack'],
  // bare surnames must not fold into a same-named person
  ['Ford', 'ford', 'Ford Motor Company'],
  ['Jinnah', 'jinnah', 'Muhammad Ali Jinnah'],
  // but declared equivalences still fold
  ['World War I', 'world war i', null],
  ['WWI', 'world war i', null],
  ['First World War', 'world war i', null],
  ['Jallianwala Bagh', 'jallianwala bagh massacre', null],
  // "Indian independence" is an ordinary noun phrase, not an entity
  ['Indian independence movement', 'indian independence movement', null],
  // the (India) qualifier is dropped in normalisation, so GST unifies
  ['Goods and Services Tax (India)', 'goods and services tax', null],
  ['GST', 'goods and services tax', null]
];

let pass = 0, fail = 0;
function assert(ok, label, detail) {
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok || !detail ? '' : '\n        ' + detail));
}

console.log('--- neighbour biographies must not become owned facts ---');
OWNERSHIP_CASES.forEach(function (c) {
  const r = evaluate(c[0], c[1], c[2], { provenanceAuthoritative: c[3] });
  assert(!r.kept, '[' + c[0] + '] rejected: "' + c[1].slice(0, 52) + '..."',
    'subj=' + r.subj.subjectId + ' via=' + r.subj.method);
});

console.log('\n--- owned statements must be kept ---');
KEEP_CASES.forEach(function (c) {
  const r = evaluate(c[0], c[1], c[2], { provenanceAuthoritative: c[3] });
  assert(r.kept, '[' + c[0] + '] kept: "' + c[1].slice(0, 52) + '"',
    'subj=' + r.subj.subjectId + ' via=' + r.subj.method + ' type=' + r.factType +
    ' reason=' + (r.verdict.reason || 'n/a'));
});

console.log('\n--- alias hygiene ---');
ALIAS_CASES.forEach(function (c) {
  const got = aliasIndex[EO.canonicalId(c[0])] || EO.canonicalId(c[0]);
  assert(got === c[1], '"' + c[0] + '" -> ' + JSON.stringify(c[1]) + (c[2] ? '  (must not fold into ' + c[2] + ')' : ''),
    'got ' + JSON.stringify(got));
});

console.log('\n--- type consistency: a person is not a film ---');
const deng = EO.typeConsistent('person', 'Deng Xiaoping is a 2003 Chinese film directed by a Hong Kong filmmaker');
assert(deng === false, 'person node rejects a creative-work description', 'got ' + deng);
const conf = EO.typeConsistent('person', 'Mauryan emperor');
assert(conf === true, 'person node accepts a role description', 'got ' + conf);

console.log('\n--- secondary types are not primary facts ---');
assert(EO.isPrimaryType('CORE_FACT') && EO.isPrimaryType('DIRECT_EVENT') && EO.isPrimaryType('DATE'),
  'CORE_FACT / DIRECT_EVENT / DATE are primary');
assert(!EO.isPrimaryType('CONTEXT') && !EO.isPrimaryType('IMPORTANT_PERSON'),
  'CONTEXT / IMPORTANT_PERSON are secondary');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
