/*
 * ask-prose-strip-name.test.js -- claim coverage is judged on the body.
 *
 * Run: node scripts/lib/ask-prose-strip-name.test.js
 *
 * Corpus sentences open with their own entity name by construction:
 * "Jawaharlal Nehru Technological University, Hyderabad ... is a collegiate
 * public state university". A question word that occurs only inside that name
 * is the entity's name, not the sentence's claim, and counting it as coverage
 * admitted universities and institutes whose TEXT says nothing about the
 * question -- ranked above "Digital India is an initiative ... digital
 * government services", where the same kind of word appears in the body.
 *
 * prose.stripName removes a leading mention of the entity, and relevance()
 * judges claim coverage on what remains. Two failure modes are pinned here:
 * the name-only word must stop counting, and the 0.12 entity-name bonus must
 * survive the split (an earlier version of relevance() passed an array where
 * hasStem expects an object map, so the bonus silently went to zero and every
 * score collapsed).
 */
'use strict';
var prose = require('./ask-prose.js');

var pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  -> ' + detail : '')); }
}

var jntu = 'Jawaharlal Nehru Technological University, Hyderabad';
var jntuSentence = jntu + ' (JNTU Hyderabad) is a collegiate public state university ' +
  'in Kukatpally, Hyderabad, Telangana, India.';
check('leading entity name is stripped',
  prose.stripName(jntuSentence, jntu).indexOf('Technological') === -1);

check('leading article is stripped with the name',
  prose.stripName(
    'The Central Food Technological Research Institute (CFTRI) is an Indian food research institute.',
    'Central Food Technological Research Institute').indexOf('Technological') === -1);

var di = 'Digital India is an initiative by the government of India to provide digital government services.';
var diBody = prose.stripName(di, 'Digital India');
check('Digital India body keeps its claim words', diBody.indexOf('initiative') !== -1);

check('a non-matching entity leaves the sentence alone',
  prose.stripName('A mid-sentence Digital India mention stays whole.', 'Other Entity') ===
    'A mid-sentence Digital India mention stays whole.');

var terms = prose.claimTerms(
  'analyse the risks posed by technological concentration to India digital sovereignty');
var w = { map: {}, total: 3.8, fallback: 0.05 };
Object.keys(terms).forEach(function (k) { w.map[k] = 0.7; });

var entT = prose.entityTerms(jntu);
var rName = prose.relevance(jntuSentence, terms, entT, w);
var rBody = prose.relevance(jntuSentence, terms, entT, w, prose.stripName(jntuSentence, jntu));
check('name-only coverage falls on the body',
  rBody < rName - 0.1, rName.toFixed(3) + ' -> ' + rBody.toFixed(3));

var e2 = prose.entityTerms('Digital India');
var rDiBody = prose.relevance(di, terms, e2, w, diBody);
check('Digital India keeps body coverage', rDiBody > 0.1, rDiBody.toFixed(3));

var rNoName = prose.relevance(di, terms, {}, w, diBody);
check('name bonus intact after the body split',
  Math.abs((rDiBody - rNoName) - 0.12) < 0.001, (rDiBody - rNoName).toFixed(3));

check('full sentence scores at least the body for a body-dense sentence',
  prose.relevance(di, terms, e2, w) >= rDiBody - 0.001);

console.log('\n' + (fail ? fail + ' FAILURE(S)' : 'all ' + pass + ' passed'));
process.exit(fail ? 1 : 0);
