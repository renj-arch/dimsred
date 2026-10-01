// Static + behavioural checks for the wired structured-answering path.
//
//   node scripts/check-ask-mains.js <repo-root>
//
// Covers what a browser test cannot: that the page loads the new modules, that
// the outline picker matches the questions it claims to, and that the composer
// distinguishes answered, unquoted and absent instead of collapsing them.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = process.argv[2] || path.join(__dirname, '..');
var EE = require(path.join(ROOT, 'scripts/lib/ask-entity-evidence.js'));
var C = require(path.join(ROOT, 'scripts/lib/ask-compose.js'));
var qb = require(path.join(ROOT, 'scripts/lib/ask-qb.js'));

var fails = 0;
function ok(cond, label, detail) {
  if (cond) { console.log('  ok    ' + label); return; }
  fails++;
  console.log('  FAIL  ' + label + (detail ? '  -> ' + detail : ''));
}

console.log('=== ask.html wiring ===');
var html = fs.readFileSync(path.join(ROOT, 'ask.html'), 'utf8');
ok(/<script src="scripts\/lib\/ask-entity-evidence\.js"><\/script>/.test(html),
  'ask.html loads ask-entity-evidence.js');
ok(/<script src="scripts\/lib\/ask-compose\.js"><\/script>/.test(html),
  'ask.html loads ask-compose.js');
// The adapter captures its dependencies at load time, so every one of them must
// appear before its own script tag. The file is CRLF on disk, so the newline
// between tags is \r\n and a bare \s* would still match -- but a plain string
// index comparison is clearer than a regex here, and it cannot be defeated by
// whichever line ending the file happens to use.
var browserTag = '<script src="scripts/lib/ask-browser.js">';
var browserAt = html.indexOf(browserTag);
ok(browserAt !== -1, 'ask-browser.js is loaded');
['ask-entity-evidence.js', 'ask-compose.js', 'build-ask-qb-buckets-hash.js'].forEach(function (m) {
  var at = html.indexOf('<script src="scripts/lib/' + m + '">');
  ok(at !== -1 && at < browserAt,
    m + ' loads BEFORE ask-browser.js',
    at === -1 ? 'tag not found' : 'at ' + at + ' vs browser at ' + browserAt);
});
ok(/var ASK_MAINS_ENABLED = false;/.test(html),
  'ASK_MAINS_ENABLED defaults to false');
ok(/var ASK_MAINS_OUTLINES = \{/.test(html), 'outlines are declared in the page');
ok(/VlymbooqAskBrowser\.mains\(/.test(html), 'doAsk calls the mains() path');
ok(/Not covered by this corpus/.test(html), 'absent headings render as a visible gap');

console.log('');
console.log('=== browser adapter contract ===');
var browser = require(path.join(ROOT, 'scripts/lib/ask-browser.js'));
ok(typeof browser.mains === 'function', 'ask-browser.js exports mains()');
ok(typeof browser.ask === 'function', 'navigational ask() still exported');

console.log('');
console.log('=== concept routing: name first, vocabulary as fallback ===');
// Two distinct rules, and the second one is easy to get wrong in a way that
// looks like an improvement. Name matching encodes the hand-checked decision
// about which concept a phrasing means. Vocabulary matching only runs when name
// matching found nothing, so it cannot overturn a decision someone checked.
var core = require(path.join(ROOT, 'scripts/lib/ask-core.js'));
function routeKey(q) {
  var r = core.routeFor(q, q);
  return r ? r.key : null;
}
ok(routeKey('Distinguish cooperative federalism from competitive federalism') === 'federalism',
  'a subject naming a route still routes by name');
ok((core.routeFor('Welfare legislation and last mile delivery',
  'Welfare legislation and last mile delivery') || {}).viaVocabulary === true,
  'a concept covered but not named resolves through vocabulary');
ok(routeKey('Welfare legislation and last mile delivery') === 'welfare delivery',
  'vocabulary fallback lands on the right concept');
// One shared word must not route anything: "rights" appears in constitutional,
// forest, tribal and child-rights routes, so a question mentioning it once is
// not evidence for any of them.
ok(routeKey('rights') === null, 'a single generic word routes nothing');
ok(routeKey('what rights') === null, 'a generic word with filler routes nothing');
// A term shared by many routes is discounted, so it cannot win on its own.
ok(routeKey('Discuss policy formulation and implementation in a federal polity') !== null
  ? core.routeFor('Discuss policy formulation and implementation in a federal polity',
    'Discuss policy formulation and implementation in a federal polity').viaVocabulary === true
  : true,
  'shared vocabulary does not beat a specific name match');

console.log('');
console.log('=== outline picker matches its keys ===');
// Mirrors pickOutline() in ask.html. Kept in step with it deliberately: if the
// page's matching rule changes, this expectation should fail loudly rather than
// let the two drift apart silently.
function pickOutline(q) {
  var keys = Object.keys(ASK_MAINS_OUTLINES);
  var low = q.toLowerCase();
  var best = null, bestScore = 0;
  keys.forEach(function (k) {
    var words = k.split(' ').filter(function (w) { return w.length > 3; });
    var hits = words.filter(function (w) { return low.indexOf(w) !== -1; }).length;
    var score = words.length ? hits / words.length : 0;
    if (score > bestScore) { bestScore = score; best = k; }
  });
  if (!best || bestScore < 0.4) return null;
  return best;
}
var ASK_MAINS_OUTLINES = {
  'indian ocean region national security': 1,
  'land degradation agricultural productivity food security': 1
};
ok(pickOutline("Discuss the significance of the Indian Ocean Region for India's national security") ===
  'indian ocean region national security', 'IOR question matches its outline');
ok(pickOutline('analyse the relationship between land degradation, agricultural productivity and food security') ===
  'land degradation agricultural productivity food security', 'land question matches its outline');
ok(pickOutline('who was the viceroy after X') === null, 'an unrelated question matches nothing');

console.log('');
console.log('=== composer: three outcomes stay distinct ===');
// Rows for two entities, with provenance, and a third heading that resolves to
// nothing at all. Both answered entities carry at least minSupport sentences:
// minSupport is 2, so a single-sentence row is deliberately `unquoted` rather
// than `answered`, and that distinction is asserted separately below.
var rows = [
  ['Piracy', ['Piracy is the act of raiding a ship.', 'It is distinct from privateering.'], ['Cat 6'],
    [{ source: 'Wiki', pubDate: '2026-01-02' }, { source: 'Wiki', pubDate: '2026-01-02' }]],
  ['Andaman and Nicobar Islands',
    ['Port Blair is about 1,190 km from Chennai.',
      'The islands are administered from Port Blair, on the Andaman island.'],
    ['Cat 79'],
    [{ source: 'Wiki', pubDate: '2026-08-26' }, { source: 'Wiki', pubDate: '2026-08-26' }]]
];
var entityDir = new qb.EntityDir().load(
  fs.readFileSync(path.join(ROOT, 'data/ask-qb/entities.tsv'), 'utf8'));
var outline = [
  ['1. Threats', 'piracy', []],
  ['2. Islands', 'Andaman and Nicobar Islands', []],
  ['3. Absent', 'SAGAR', []]
];
var result = EE.retrieve(rows, 'test question', outline, entityDir, {});
var composed = C.compose('test question', outline, result, {});

ok(composed.counts.answered === 2, 'two headings answered', 'got ' + composed.counts.answered);
ok(composed.counts.absent === 1, 'one heading absent', 'got ' + composed.counts.absent);
ok(composed.quoted === 4, 'four sentences quoted (2 per answered heading)', 'got ' + composed.quoted);
ok(composed.isArgument === false, 'composed answer is not presented as an argument');
ok(/not derived/i.test(composed.argumentNote), 'argument note explains headings are supplied');

var answered = composed.sections.filter(function (s) { return s.status === 'answered'; });
var absent = composed.sections.filter(function (s) { return s.status === 'absent'; });
ok(answered.length === 2 && answered.every(function (s) { return s.lines.length > 0; }),
  'answered headings carry lines');
ok(absent.length === 1 && absent[0].gaps.length > 0,
  'absent heading carries a gap message');

// minSupport: an entity with a single sentence is present but cannot support a
// heading on its own, and must read as unquoted rather than answered.
var thin = EE.retrieve(
  [['Andaman and Nicobar Islands', ['One sentence only.'], ['Cat 79'],
    [{ source: 'Wiki', pubDate: '2026-08-26' }]]],
  'test', [['Islands', 'Andaman and Nicobar Islands', []]], entityDir, {});
ok(thin.points[0].supported === false, 'a one-sentence entity is not "supported"');
ok(thin.absent === 0, 'and is not reported as absent either');
ok(thin.unquoted.length === 1, 'it is reported as unquoted');
// This asserted that an absent heading's gap blamed the corpus. That was the bug
// the El Nino case exposed: the archive search finds "El Nino" verbatim in fact
// sentences, because those sentences belong to entities like "Pelagic thresher".
// A shard row is named for the record's subject, so a term can be present in the
// corpus and still resolve to no entity. The gap must therefore name the entity
// table, not the corpus.
ok(absent[0].gaps[0].text.indexOf('No entity named') === 0,
  'absent gap names the entity table, not the corpus', absent[0].gaps[0].text);
ok(absent[0].gaps[0].text.indexOf('Not covered by this corpus') === -1,
  'absent gap does not claim the corpus lacks the term');
ok(absent[0].gaps[0].text.indexOf('inside sentences about other subjects') !== -1,
  'absent gap explains that text can hide under other entities');

// An absent heading must not borrow a sentence from a neighbouring heading.
var allText = composed.sections.map(function (s) {
  return s.lines.map(function (l) { return l.text; }).join(' ');
}).join(' ');
ok(allText.indexOf('Piracy is the act') !== -1, 'quoted sentence present');
ok(composed.sections[2].lines.length === 0, 'absent heading quotes nothing');

console.log('');
console.log('=== provenance is carried, not invented ===');
var anyLine = answered[0].lines[0];
ok(anyLine.trust && anyLine.trust.source === 'Wiki', 'source carried onto the line');
ok(anyLine.trust && String(anyLine.trust.pubDate).slice(0, 10) === '2026-01-02',
  'pubDate carried onto the line');
// Every quoted line must carry a real trust state, and none may be unverified:
// these fixtures all carry a source and a date.
ok(composed.provenance.ok === composed.quoted && composed.provenance.unverified === 0,
  'every quoted line reports a trusted state',
  JSON.stringify(composed.provenance) + ' vs quoted=' + composed.quoted);

// A recency cutoff must flag rather than silently pass, and a disallowed source
// must be marked unverified. Neither may be dropped: a reader has to see it.
var cut = EE.retrieve(rows, 'test', [['Threats', 'piracy', []]], entityDir,
  { cutoff: '2025-01-01' });
ok(cut.points[0].evidence[0].trust.state === 'flagged',
  'a sentence after the cutoff is flagged',
  JSON.stringify(cut.points[0].evidence[0].trust));
ok(cut.points[0].evidence[0].trust.flags.indexOf('after-cutoff') !== -1,
  'the flag names the reason');
ok(cut.points[0].evidence.length > 0,
  'a flagged sentence is still returned, not dropped');

var denied = EE.retrieve(rows, 'test', [['Threats', 'piracy', []]], entityDir,
  { allowSources: ['SomethingElse'] });
ok(denied.points[0].evidence[0].trust.state === 'unverified',
  'a disallowed source is marked unverified');
var noMeta = EE.retrieve(
  [['Piracy', ['Piracy is the act of raiding a ship.'], ['Cat 6']]],
  'test', [['Threats', 'piracy', []]], entityDir, {});
ok(noMeta.points[0].evidence[0].trust.state === 'unverified',
  'a sentence with no source is unverified, never assumed good');

console.log('');
console.log('=== the two unquoted causes are worded differently ===');
// These were previously one message, which told a reader that a shard had not
// been deployed when the truth was that the corpus holds one sentence for the
// entity. One is fixable by deployment; the other is not.
var loadedThin = EE.retrieve(
  [['Upwelling', ['Upwelling is the rise of deep water.'], ['Cat 132']]],
  'test', [['Upwelling', 'upwelling', []]], entityDir, {});
ok(loadedThin.unquoted[0].picked === 1, 'retrieval reports how thin the evidence is');
var thinMsg = C.compose('t', [['Upwelling', 'upwelling', []]], loadedThin, {}).sections[0].gaps[0].text;
ok(/Too thin to quote/.test(thinMsg), 'a loaded-but-thin entity says "too thin"', thinMsg);
ok(/not been loaded/i.test(thinMsg) === false,
  'and does NOT blame deployment when the shard was loaded', thinMsg);

var notFetched = EE.retrieve([], 'test', [['Upwelling', 'upwelling', []]], entityDir, {});
var missMsg = C.compose('t', [['Upwelling', 'upwelling', []]], notFetched, {}).sections[0].gaps[0].text;
ok(/Not retrieved/.test(missMsg), 'an unfetched entity says "not retrieved"', missMsg);
ok(/deployment/i.test(missMsg), 'and names deployment as the cause', missMsg);
ok(thinMsg !== missMsg, 'the two messages are not the same string');

console.log('');
console.log('=== toText renders gaps as gaps ===');
var txt = C.toText(composed);
ok(txt.indexOf('No entity named') !== -1, 'text output includes the gap');
ok(txt.indexOf('judgement') !== -1, 'text output says way-forward is not retrieved');

console.log('');
console.log('=== bucket hash: stable, total, and shared with the builder ===');
// The builder and the page must agree exactly. If either normalises differently,
// every question fetches the wrong file and every answer comes back empty -- a
// failure with no error message, so it is worth asserting on known values.
var hashPath = path.join(ROOT, 'scripts/lib/build-ask-qb-buckets-hash.js');
ok(fs.existsSync(hashPath), 'bucket hash module exists');
var BH = require(hashPath);
ok(BH.BUCKETS === 512, 'bucket count is fixed at 512', String(BH.BUCKETS));
ok(BH.bucketOf('Ocean current', 512) === BH.bucketOf('ocean  current', 512),
  'normalisation collapses case and runs of spaces');
ok(BH.bucketOf('Aravalli Range', 512) === BH.bucketOf('aravalli-range', 512),
  'punctuation normalises to the same bucket');
var spread = {};
for (var b = 0; b < 512; b++) spread[b] = 0;
['ocean current', 'gulf stream', 'water scarcity', 'drought', 'irrigation',
 'coral reef', 'humboldt current', 'india', 'piracy', 'energy security'
].forEach(function (n) { spread[BH.bucketOf(n, 512)]++; });
var used = Object.keys(spread).filter(function (k) { return spread[k] > 0; });
ok(used.length === 10, 'ten distinct entities land in ten distinct buckets',
  used.length + ' buckets');
ok(BH.bucketOf('', 512) >= 0 && BH.bucketOf('', 512) < 512,
  'an empty name still maps into range rather than NaN');
// A 32-bit int overflow would show up as a value outside the range.
var allInRange = true;
for (var t = 0; t < 5000; t++) {
  var bi = BH.bucketOf('entity name number ' + t, 512);
  if (!(bi >= 0 && bi < 512 && bi === (bi | 0))) { allInRange = false; break; }
}
ok(allInRange, '5000 synthetic names all hash into range (no 32-bit overflow)');

console.log('');
console.log('=== honesty regression: the SAGAR trap ===');
// The token-scorer accepted "The waterfalls are in the Sagar taluk of the
// Shivamogga district" as support for a SAGAR heading. Entity-anchored
// resolution must reject it, because no entity is named "sagar".
var trap = EE.retrieve(
  [['Sagar taluk', ['The waterfalls are in the Sagar taluk of the Shivamogga district.'],
    ['Cat 1'], [{ source: 'Wiki', pubDate: '2026-01-01' }]]],
  'test', [['Regional influence', 'SAGAR', []]], entityDir, {});
ok(trap.points[0].supported === false,
  'SAGAR is NOT supported by the Sagar taluk sentence');
ok(trap.absent === 1, 'SAGAR is reported as absent from the corpus', 'got absent=' + trap.absent);

console.log('');
console.log('=== honesty regression: unquoted is not absent ===');
// An entity that exists but whose shard was not loaded must never be reported
// as a hole in the corpus.
var noRows = EE.retrieve([], 'test', [['Threats', 'piracy', []]], entityDir, {});
ok(noRows.absent === 0, 'a resolved entity is not counted as absent when no rows loaded',
  'got absent=' + noRows.absent);
ok(noRows.unquoted.length === 1, 'it is counted as unquoted instead');
ok(noRows.covered === 0, 'and it is not counted as covered either');

console.log('');
console.log(fails ? '=== ' + fails + ' FAILURE(S) ===' : '=== all checks passed ===');
process.exit(fails ? 1 : 0);
