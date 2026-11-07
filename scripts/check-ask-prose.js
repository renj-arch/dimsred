// Regression tests for the deterministic essay writer.
//
//   node scripts/check-ask-prose.js
//
// These exist because the failure mode is invisible: an essay built without claim
// conditioning reads fluently and is wrong, which is worse than returning nothing.
// Every test below pins one property that would otherwise fail silently.
'use strict';
var path = require('path');
var ROOT = path.join(__dirname, '..');
var P = require(path.join(ROOT, 'scripts/lib/ask-prose.js'));

var pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  -- ' + detail : '')); }
}
function ev(text) { return [{ sentence: text, entity: 'E', trust: 'ok', cats: [] }]; }

console.log('claim conditioning');

// A sentence about the entity that says nothing about the heading must not be
// written up as though it supported the heading. This is the exact Bhagat Singh
// case from the nationalism probe: retrieval supplied a shooting narrative.
var bs = ev('As Saunders exited a police station on a motorcycle, he was felled by a single bullet fired from across the road.');
var bsPara = P.paragraph('Revolutionary stream', 'Bhagat Singh', bs, {});
ok('off-claim entity sentence is refused', bsPara.status !== 'written', 'status=' + bsPara.status);
ok('refusal is reported as thin, not empty', bsPara.status === 'thin', 'status=' + bsPara.status);

// On-claim sentence for the same heading is accepted.
var good = ev('Bhagat Singh was a revolutionary who supported the independence movement and the abolition of colonial rule.');
var goodPara = P.paragraph('Revolutionary stream', 'Bhagat Singh', good, {});
ok('on-claim sentence is written', goodPara.status === 'written');
ok('sentence text is preserved verbatim', goodPara.sentences[0].sentence === good[0].sentence);

console.log('');
console.log('relevance scoring');

// Entity name alone must not carry relevance. This regressed once: folding the
// entity into the claim term set made "Indian National Congress" match any sentence
// naming it, while discarding good sentences that said "the Congress".
var terms = P.claimTerms('Base of the movement');
var eWords = {};
P.contentTokens('Indian National Congress').forEach(function (t) { eWords[t] = 1; });
var namesIt = P.relevance('The Indian National Congress was a political party.', terms, eWords);
var claimsIt = P.relevance('The Congress movement spread across provinces as a nationalist movement.', terms, eWords);
ok('entity-naming scores below claim-bearing', claimsIt > namesIt,
  'names=' + namesIt.toFixed(2) + ' claims=' + claimsIt.toFixed(2));

// The bug this fixed: a founding sentence that never repeats "Indian" must pass.
var founding = P.relevance('Founded in 1885, it was the first modern nationalist movement to emerge in the British Empire.', terms, eWords);
ok('founding sentence clears the default threshold', founding >= 0.34, 'rel=' + founding.toFixed(2));

console.log('');
console.log('rhetorical ordering');

// Every sentence here carries claim vocabulary. An earlier version of this
// fixture included "It was founded on 28 December 1885 in Bombay", which shares no
// words with the heading "Base of the movement" and scores exactly 0.000, so it
// was correctly dropped and the test failed. The fixture was wrong, not the
// filter -- see the sparse-heading case below, which pins that behaviour on purpose.
var mixed = [
  { sentence: 'The outcome of the movement was decisive as it led to independence.', entity: 'E', trust: 'ok', cats: [] },
  { sentence: 'The base of the movement was an organisation formed in 1885 in Bombay.', entity: 'E', trust: 'ok', cats: [] },
  { sentence: 'The Congress Nationalist movement was an organisation of the people.', entity: 'E', trust: 'ok', cats: [] }
];
var ordered = P.paragraph('Base of the movement', 'Indian National Congress', mixed, {});
// This test originally asserted sentences[0].role === 'origin', which conflated
// "origin comes first" with "origin IS first". A definition legitimately leads a
// paragraph, so the real property is that origin precedes outcome. The authored
// shape is checked separately below.
var roles = ordered.sentences.map(function (s) { return s.role; });
ok('founding sentence precedes outcome', roles.indexOf('origin') < roles.indexOf('outcome'),
  'roles=' + roles.join(','));
ok('all three sentences used', ordered.sentences.length === 3, 'used=' + ordered.sentences.length);
ok('paragraph follows the authored shape',
  JSON.stringify(ordered.sentences.map(function (s) { return s.role; })) ===
  JSON.stringify(['definition', 'origin', 'outcome']),
  JSON.stringify(ordered.sentences.map(function (s) { return s.role; })));

console.log('');
console.log('sparse claim vocabulary, pinned as a known limitation');

// A heading whose claim words are abstract leaves little for a sentence to match,
// and corpus sentences often open with a pronoun and omit the subject entirely.
// The filter then discards usable material. This is recorded as a test so the
// behaviour cannot be mistaken for a working essay, and so it is fixed rather than
// rediscovered.
var pronoun = { sentence: 'It was founded on 28 December 1885 in Bombay.', entity: 'E', trust: 'ok', cats: [] };
var sparseTerms = P.claimTerms('Base of the movement');
var sparseE = {};
P.contentTokens('Indian National Congress').forEach(function (t) { sparseE[t] = 1; });
ok('pronoun-only sentence scores zero against a sparse claim',
  P.relevance(pronoun.sentence, sparseTerms, sparseE) < 0.34,
  'rel=' + P.relevance(pronoun.sentence, sparseTerms, sparseE).toFixed(3));
var sparsePara = P.paragraph('Base of the movement', 'Indian National Congress', [pronoun], {});
ok('sparse heading reports thin and names the score', sparsePara.status === 'thin' &&
  sparsePara.topRelevance < 0.34, 'status=' + sparsePara.status);
// Morphology fixes inflection but not synonymy. A heading saying "began" still
// will not match a corpus sentence saying "founded", because those are different
// words. That is pinned here so the limitation is not mistaken for coverage: it
// needs an alias table, which does not exist yet.
var beganTerms = P.claimTerms('How the movement began and where');
var beganSent = P.stems(pronoun.sentence);
ok('began and founded remain distinct after stemming',
  beganTerms.begin && !beganTerms.found && beganSent.indexOf('find') === -1,
  'heading=' + Object.keys(beganTerms).join(',') + ' sent=' + beganSent.join(','));

// Inflection IS handled, which is the case that occurs constantly: corpus sentences
// record events in the past tense while outlines are written in the present.
var inflected = P.relevance('The Congress was organised by leaders across provinces.',
  P.claimTerms('How the movement was organised'), {});
ok('inflected forms match the present tense of the heading',
  inflected > 0, 'rel=' + inflected.toFixed(3));

// The documented mitigation is to write the heading in the corpus's own vocabulary.
var aligned = P.paragraph('The movement founded in 1885 and its base', 'Indian National Congress', [pronoun], {});
ok('a heading using corpus vocabulary recovers the sentence',
  aligned.status === 'written', 'status=' + aligned.status);

console.log('');
console.log('domain gating');

// Sentence relevance is not enough. Phrase-index escape surfaced these under
// "Socialist stream" and "Dalit and anti-caste current", all of which score well on
// vocabulary and none of which is evidence about India's nationalist movement.
var foreign = [
  { sentence: 'The Albanian People\'s Army was the national army of Albania.', entity: 'Albanian People\'s Army', trust: 'ok', cats: [] },
  { sentence: 'The Socialists responsible for bad policy so his coalition would not join.', entity: '2014 Serbian parliamentary election', trust: 'ok', cats: [] },
  { sentence: 'Navy current Harpoon anti-ship missile in service since 1977.', entity: 'AGM-158C LRASM', trust: 'ok', cats: [] }
];
var socialDomains = ['india', 'indian', 'bengal', 'bengali', 'congress', 'gandhi', 'bharat'];
foreign.forEach(function (f) {
  ok('off-domain entity "' + f.entity + '" is refused',
    !P.domainAllows(f.entity, socialDomains));
});
// Gating applies only to escape evidence. A sentence that arrived through entity
// lookup resolved to this heading on purpose, so gating it would suppress
// evidence the caller asked for; a sentence found by scanning unrelated buckets
// for a matching word was never chosen, so its entity has to earn its place.
//
// These three are marked escape, which is how the composer tags rescued evidence.
// Ungated entity evidence is checked separately below.
foreign.forEach(function (f) { f.escape = true; });
var socialPara = P.paragraph('Socialist stream', 'Subhas Chandra Bose', foreign,
  { domains: socialDomains });
ok('heading with domains refuses off-domain escape evidence', socialPara.status !== 'written',
  'status=' + socialPara.status);
ok('domain rejections are counted', socialPara.rejectedDomain === 3,
  'rejectedDomain=' + socialPara.rejectedDomain);

// The same sentences, ungated, must be accepted. If they are refused either way,
// the gate is not discriminating between the two routes and it is doing nothing.
var socialUngated = P.paragraph('Socialist stream', 'Subhas Chandra Bose',
  foreign.map(function (f) { return { sentence: f.sentence, entity: f.entity, trust: 'ok', cats: [] }; }),
  { domains: socialDomains });
ok('the same off-domain sentences are accepted without the escape flag',
  socialUngated.status === 'written' && socialUngated.rejectedDomain === 0,
  'status=' + socialUngated.status + ' rejected=' + socialUngated.rejectedDomain);

// An on-domain entity must still be allowed, or the gate suppresses real evidence.
ok('on-domain entity is allowed', P.domainAllows('Indian National Congress', socialDomains));
ok('on-domain entity survives the gate',
  P.paragraph('Socialist stream', 'Subhas Chandra Bose',
    [{ sentence: 'The Socialist Party of India contested the election under this banner.',
       entity: 'Socialist Party of India', trust: 'ok', cats: [] }],
    { domains: socialDomains }).status === 'written');

// Without declared domains nothing is gated, even for escape evidence: an invented
// domain would silently suppress genuine evidence, so the check is skipped.
var ungated = P.paragraph('Socialist stream', 'Subhas Chandra Bose', foreign, {});
ok('without declared domains nothing is gated', ungated.status === 'written',
  'status=' + ungated.status);

// A sentence with no entity of its own inherits the heading's entity and is not
// gated even when marked escape. Gating it would punish missing metadata rather
// than wrong content.
var inherited = P.paragraph('Socialist stream', 'Socialist Party of India',
  [{ sentence: 'The socialist current organised workers across the Indian provinces.',
     trust: 'ok', cats: [], escape: true }], { domains: socialDomains });
ok('escape sentence without its own entity is not gated', inherited.status === 'written',
  'status=' + inherited.status + ' rejectedDomain=' + inherited.rejectedDomain);

console.log('');
console.log('escape evidence handling');

// Escape evidence is only used when the heading is otherwise unwritten, so a
// well-covered heading cannot have its own on-claim sentences displaced.
var anchored = [{
  sentence: 'The Socialist Party of India contested the election under this banner.',
  entity: 'Socialist Party of India', trust: 'ok', cats: []
}];
var rescueEvidence = [{
  sentence: 'He later joined the Socialist movement and was a close associate of Ram Manohar Lohia.',
  entity: 'Abbas Ali (Indian National Army)', trust: 'ok', cats: []
}];
var bothRoutes = P.write('Q',
  [['Socialist stream', 'Socialist Party of India', [], { domains: socialDomains }]],
  { byLabel: { 'Socialist stream': {
      evidence: anchored, escape: rescueEvidence,
      resolved: 'Socialist Party of India' } } }, {});
ok('well-covered heading uses its own evidence and skips escape',
  bothRoutes.paragraphs[0].sentences.length === 1 &&
  bothRoutes.paragraphs[0].sentences[0].entity === 'Socialist Party of India',
  'used=' + bothRoutes.paragraphs[0].sentences.length);

// Relevance, not the domain gate, is what refuses an escape sentence about the
// wrong current. Pinned so the gate is not mistaken for the whole filter.
var wrongCurrent = P.paragraph('Revolutionary stream', 'Bhagat Singh',
  [rescueEvidence[0]], { domains: ['india', 'singh', 'lal'] });
ok('an on-domain sentence about the wrong current is still refused',
  wrongCurrent.status !== 'written', 'status=' + wrongCurrent.status);
ok('escape is not reported as used when it was not needed',
  !bothRoutes.paragraphs[0].usedEscape);
ok('escape sentences are counted as offered', bothRoutes.escapeSentences === 1,
  'count=' + bothRoutes.escapeSentences);

// When the heading has nothing, escape evidence is written and flagged, so the
// renderer can say where the sentence came from.
//
// This initially used the Socialist sentence under "Revolutionary stream" and
// failed. The composer was right to refuse it: the sentence never says
// "revolutionary" or "stream", so its relevance is 0.000. An earlier version of
// this test would have passed only by asserting that a sentence about the wrong
// current could be written under a revolutionary heading.
var revolutionaryEscape = [{
  sentence: 'He was inspired by the revolutionary ideas of Bhagat Singh and joined the Naujawan.',
  entity: 'Abbas Ali (Indian National Army)', trust: 'ok', cats: []
}];
var escapeOnly = P.write('Q',
  [['Revolutionary stream', 'Bhagat Singh', [], { domains: ['india', 'singh', 'lal'] }]],
  { byLabel: { 'Revolutionary stream': {
      evidence: [], escape: revolutionaryEscape, resolved: 'Bhagat Singh' } } }, {});
ok('heading with no own evidence falls back to escape',
  escapeOnly.paragraphs[0].status === 'written');
ok('fallback is reported as used escape', escapeOnly.paragraphs[0].usedEscape === true);
ok('written escape sentences carry the escape flag',
  escapeOnly.paragraphs[0].sentences.every(function (s) { return s.escape === true }));

// write() marks escape evidence itself, so a caller that forgets the flag cannot
// bypass the domain gate by omission.
var unmarked = { sentence: rescueEvidence[0].sentence,
  entity: 'AGM-158C LRASM', trust: 'ok', cats: [] };
var gateCheck = P.write('Q',
  [['Dalit current', 'B. R. Ambedkar', [], { domains: ['dalit', 'ambedkar', 'caste'] }]],
  { byLabel: { 'Dalit current': { evidence: [], escape: [unmarked] } } }, {});
ok('write marks escape evidence even when the caller omits the flag',
  gateCheck.paragraphs[0].status !== 'written',
  'status=' + gateCheck.paragraphs[0].status);

// A heading with neither route stays empty rather than inventing one.
var nothing = P.write('Q',
  [['Peasant movement', 'peasant movement', []]],
  { byLabel: { 'Peasant movement': { evidence: [] } } }, {});
ok('heading with neither route stays empty', nothing.paragraphs[0].status === 'empty');
ok('empty heading counts as empty', nothing.counts.empty === 1);

// Per-heading options override document defaults.
var perHeadingOverride = P.write('Q',
  [['Base of the movement', 'Indian National Congress', [], { perHeading: 1 }]],
  { byLabel: { 'Base of the movement': { evidence: [
    { sentence: 'The Congress movement spread across provinces as a nationalist movement.',
      entity: 'Indian National Congress', trust: 'ok', cats: [] },
    { sentence: 'The Congress movement also organised provincial conferences.',
      entity: 'Indian National Congress', trust: 'ok', cats: [] }] } } },
  { perHeading: 4 });
ok('per-heading perHeading is honoured', perHeadingOverride.paragraphs[0].sentences.length === 1,
  'used=' + perHeadingOverride.paragraphs[0].sentences.length);

console.log('');
console.log('verbatim and citation integrity');

var cited = P.paragraph('Base of the movement', 'Indian National Congress',
  ev('The Congress movement spread across provinces as a nationalist movement.'), {});
ok('each prose sentence carries its evidence entity', cited.sentences.every(function (s) { return s.entity === 'E'; }));
ok('each prose sentence carries a trust state', cited.sentences.every(function (s) { return s.trust === 'ok'; }));
ok('prose text contains the verbatim sentence',
  cited.text.indexOf('The Congress movement spread across provinces as a nationalist movement.') !== -1);

console.log('');
console.log('transitions');
ok('no doubled spaces in prose', !/\s{2}/.test(cited.text), JSON.stringify(cited.text));
ok('first sentence has no transition prefix', cited.sentences[0].text.charAt(0) !== ' ');

console.log('');
console.log('document assembly');

var outline = [
  ['Base of the movement', 'Indian National Congress', []],
  ['Revolutionary stream', 'Bhagat Singh', []]
];
var result = { byLabel: {
  'Base of the movement': { evidence: [mixed[2]], resolved: 'Indian National Congress', supported: true },
  'Revolutionary stream': { evidence: bs, resolved: 'Bhagat Singh', supported: true }
} };
var doc = P.write('Q', outline, result, {});
ok('two paragraphs returned', doc.paragraphs.length === 2);
ok('counts report one written one thin', doc.counts.written === 1 && doc.counts.thin === 1,
  JSON.stringify(doc.counts));
ok('document states no model was used', /No model was used/.test(doc.method));
ok('document denies generation', doc.isGenerated === false);
ok('document denies being an argument', doc.isArgument === false);
ok('toText marks the refused heading', /Not written/.test(P.toText(doc)));

var text = P.toText(doc);
ok('toText includes the question', /Q/.test(text));

console.log('');
console.log('toText threshold reporting');
ok('toText names the threshold it used', /threshold/.test(text));
ok('toText names a relevance score', /relevance was/.test(text));

console.log('');
console.log('degenerate input');
var emptyPara = P.paragraph('Anything', 'Nothing', [], {});
ok('no evidence yields empty, not written', emptyPara.status === 'empty');
var nullPara = P.paragraph('Anything', 'Nothing', null, {});
ok('null evidence yields empty', nullPara.status === 'empty');
var emptyDoc = P.write('Q', [], { byLabel: {} }, {});
ok('empty outline yields zero paragraphs', emptyDoc.total === 0);
ok('empty outline does not throw in toText', typeof P.toText(emptyDoc) === 'string');

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);