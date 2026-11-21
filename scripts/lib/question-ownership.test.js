'use strict';
var QO = require('./question-ownership.js');

var pass = 0, fail = 0;
function t(name, got, want) {
  var g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; return; }
  fail++;
  console.log('  FAIL ' + name + '\n       got  ' + g + '\n       want ' + w);
}
function bucket(question, answer, subject) {
  return QO.classifyBlank(question, answer, subject).bucket;
}
function dateType(question, answer, subject) {
  return QO.classifyBlank(question, answer, subject).dateType;
}

console.log('MATCH: the answer really is the subject');
t('full name', bucket('_____ was an American industrialist.', 'Henry Ford', 'Henry Ford'), 'MATCH');
t('possessive answer', bucket('_____ rose to prominence in 1947.', 'Gandhi’s', 'Gandhi'), 'MATCH');
t('first name blanked', bucket('_____ founded the Ford Motor Company.', 'Ford', 'Henry Ford'), 'MATCH');
t('plural', bucket('The _____ released four albums.', 'Beatles', 'The Beatles'), 'MATCH');
t('leading article', bucket('_____ is a religious text.', 'The Bhagavad Gita', 'Bhagavad Gita'), 'MATCH');
t('empty subject is re-derived from the answer', bucket('_____ is a city.', 'Paris', ''), 'MISMATCH');
t('empty subject gets the answer as subject', QO.classifyBlank('_____ is a city.', 'Paris', '').newSubject, 'Paris');

console.log('DATE: subject is right, the date was just untyped');
t('month', bucket('The German White Book appeared on 4 _____ 1914', 'August', 'Propaganda in World War I'), 'DATE');
t('month before year', bucket('In his famous _____ 1918 declaration, he outlined the Fourteen Points.', 'January', 'Propaganda in World War I'), 'DATE');
t('bare year', bucket('Henry Ford (July 30, _____ - April 7, 1947) was an American industrialist.', '1863', 'Henry Ford'), 'DATE');
t('day before month', bucket('The season began on _____ August 2011 and ended on 13 May 2012.', '13', '2011-12 Premier League'), 'DATE');
t('day before month name', bucket('On 10 _____, Ardern announced Labour would aim to make electricity in New Zealand 100% renewable.', 'September', '2020 New Zealand general election'), 'DATE');
t('day after month', bucket('The conference was originally scheduled to end on 12 _____, but had to be extended.', 'December', '2023 United Nations Climate Change Conference'), 'DATE');
t('full date', bucket('The _____ Treaty was signed at Versailles.', '28 June 1919', 'Treaty of Versailles'), 'DATE');
t('month + year', bucket('The event began in _____ and continued.', 'August 1914', 'World War I'), 'DATE');
t('year-like gets its own type', dateType('It was founded in the _____-19 pandemic era.', 'COVID', 'x'), null);
t('century context', bucket('The dynasty was founded in the _____ century BC.', '14', 'Han dynasty'), 'DATE');
t('century type', dateType('The dynasty was founded in the _____ century BC.', '14', 'Han dynasty'), 'YEAR_LIKE');

console.log('QUANTITY: a number, but not a date and not the subject');
t('percent', bucket('The Labour Party\'s _____% vote share in this election is the third highest.', '50.0', '2020 New Zealand general election'), 'QUANTITY');
t('percent type', QO.classifyBlank('The party won _____% of the vote.', '50.0', 'x').quantityType, 'PERCENT');
t('measure', bucket('The river is _____ km long.', '2520', 'Ganges'), 'QUANTITY');
t('measure type', QO.classifyBlank('The river is _____ km long.', '2520', 'x').quantityType, 'MEASURE');
t('bare number', bucket('The _____ Brigade was raised in 1805.', '15', '1st The Queen\'s Dragoon Guards'), 'QUANTITY');

console.log('MISMATCH: the answer is the real subject');
t('different entity', bucket('After the _____ text was published, dating creation around 4000 BC became common.', 'Masoretic', 'Anno Lucis'), 'MISMATCH');
t('re-derived subject', QO.classifyBlank('After the _____ text was published, dating creation around 4000 BC became common.', 'Masoretic', 'Anno Lucis').newSubject, 'Masoretic');
t('military unit', bucket('The _____ were the first to deploy to Helmand.', 'Sikh Light Infantry', 'Agricultural Engineering'), 'MISMATCH');
t('regiment', bucket('_____ were the first Formation Reconnaissance Regiment to deploy to Helmand.', '1st The Queen\'s Dragoon Guards', 'Agricultural Engineering'), 'MISMATCH');
t('acronym-ish name', bucket('It was caused by the _____ pandemic.', 'COVID', 'COP conference'), 'MISMATCH');

console.log('UNRESOLVABLE: never guess a subject');
t('no answer', bucket('The _____ was founded later.', '', 'Some Topic'), 'UNRESOLVABLE');
t('null answer', bucket('The _____ was founded later.', null, 'Some Topic'), 'UNRESOLVABLE');
t('pronoun', bucket('The treaty was signed when _____ agreed.', 'they', 'Treaty of Versailles'), 'UNRESOLVABLE');
t('stopword', bucket('It is _____ of the largest cities.', 'one', 'Delhi'), 'UNRESOLVABLE');
t('symbol', bucket('The symbol is _____.', '%', 'Something'), 'UNRESOLVABLE');

console.log('repairQuestion rewrites the subject and keeps provenance');
(function () {
  var r = QO.repairQuestion({
    id: 'q1', subSubject: 'Anno Lucis', category: 'Computer & IT',
    question: 'After the _____ text was published, dating creation around 4000 BC became common.',
    answer: 'Masoretic'
  });
  t('subject re-derived', r.q.subSubject, 'Masoretic');
  t('original preserved', r.q.sourceSubject, 'Anno Lucis');
  t('original category preserved', r.q.sourceCategory, 'Computer & IT');
  t('flagged repaired', r.q.subjectRepaired, true);
  t('bucket recorded', r.q.subjectOwnership, 'MISMATCH');
  t('not marked verified', r.q.subSubjectVerified, false);
})();
(function () {
  var r = QO.repairQuestion({
    id: 'q2', subSubject: 'Henry Ford', category: 'History',
    question: 'Henry Ford (July 30, _____ - April 7, 1947) was an American industrialist.',
    answer: '1863'
  });
  t('date subject kept', r.q.subSubject, 'Henry Ford');
  t('date typed', r.q.dateType, 'YEAR');
  t('date subject verified', r.q.subSubjectVerified, true);
  t('not marked repaired', r.q.subjectRepaired, undefined);
})();
(function () {
  var r = QO.repairQuestion({ id: 'q3', subSubject: 'Y', question: '_____ was a leader.', answer: 'Y' });
  t('match not repaired', r.q.subjectRepaired, undefined);
  t('match verified', r.q.subSubjectVerified, true);
  t('match bucket', r.q.subjectOwnership, 'MATCH');
})();
(function () {
  var r = QO.repairQuestion({ id: 'q4', subSubject: 'X', question: 'no blank here', answer: 'X' });
  t('no blank, matching answer', r.q.subjectOwnership, 'MATCH');
})();
(function () {
  var r = QO.repairQuestion({ id: 'q5', subSubject: 'X', question: 'no blank here', answer: 'Z' });
  t('no blank, different answer still re-derived', r.q.subjectOwnership, 'MISMATCH');
  t('re-derived to answer', r.q.subSubject, 'Z');
})();

console.log('normalisation helpers');
t('possessive stripped', QO.norm('Gandhi’s'), 'gandhi');
t('punctuation stripped', QO.norm('St. Petersburg'), 'st petersburg');
t('article dropped', QO.key('The Beatles'), 'beatle');
t('plural dropped', QO.key('Beatles'), 'beatle');
t('article then plural', QO.key('The Beatles'), 'beatle');
t('article and plural agree', QO.key('The Beatles') === QO.key('Beatles'), true);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
