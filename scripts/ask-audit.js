// Ask retrieval audit: the questions that must answer, and the ones that must
// refuse. Run this after any change to ask-core.js.
//
//   node scripts/ask-audit.js            summary
//   node scripts/ask-audit.js -v         every case, with evidence
//   node scripts/ask-audit.js -q <text>  one ad-hoc question
//
// A case FAILS if the engine does the wrong kind of thing: answering a question
// it has no material for, or refusing one it does. That direction is
// deliberate. A retrieval engine that answers from fragments looks
// authoritative, and the reader cannot tell it was assembled from noise -- a
// refusal that is merely over-cautious is a much cheaper failure.
'use strict';
var fs = require('fs');
var path = require('path');
var ask = require('./lib/ask-core.js');

var payload = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'ask-index.json'), 'utf8'));
// ask.html decodes the compact array rows before building the index; the raw
// rows are not the node shape buildIndex expects. Mirroring the page here is
// the point -- testing a different index shape than the browser uses has
// already produced one false "the index is corrupt" diagnosis.
var nodes = payload.nodes.map(function (r) {
  return { id: r[0], name: r[1], type: r[2], cat: r[3], desc: r[4] };
});
var idx = ask.buildIndex({ nodes: nodes, links: payload.links });

// expect: 'answer' must answer, 'refuse' must refuse, 'either' accepts both.
// mustInclude: when the engine did answer, at least one of these words must
// appear in the evidence or its node titles. That is how "answered, but about
// the wrong thing" gets caught, which a plain expect flag cannot see.
// known: a real defect that is NOT yet fixed. Counted and reported, never
// silently passed, so it stays visible until it is either fixed or retired.
var CASES = [
  { q: 'bhopal gas tragedy', expect: 'answer', mustInclude: ['bhopal'],
    why: 'subject is a 3-word phrase no node titles, but `Bhopal` is a node (df=14, 26 quoteable words). subjectVariants floors title windows at 3 words, so the head fallback must reach it instead of discarding all 12 candidates.' },
  { q: 'what is the anti-defection law in India?', expect: 'refuse', gap: 'defection',
    why: '`defection` has df=0 in the index, so bm25 scored it on `anti`+`law` alone and answered with the definition of a coalition and a 1955 Australian Labor Party split at full coverage.' },
  { q: 'anti-defection law', expect: 'refuse', gap: 'defection',
    why: 'Same defect, bare form. A missing subject term is a fact about the corpus, not a weak signal.' },
  { q: 'indian federal framework', expect: 'answer', mustInclude: ['reorganis', 'article 370', 'autonomous', 'scheduled'],
    why: 'The concept tier was designed for this question and `Federalism in India` is a node. `framework` (df=59) passing the head-rarity bar made `.NET Framework` a title match, and the subject tier answered a federalism question with .NET and Griffon at full coverage.' },
  { q: 'examine the constitutional morality and its significance in indian democracy', expect: 'either', mustInclude: ['moral'],
    why: 'The demand-noun cut deleted the whole span because the lead held `significance`, taking the subject `constitutional morality` with it. An empty subject skips the title gate entirely.' },
  { q: '1 world trade center', expect: 'answer', mustInclude: ['world trade center'],
    why: 'Guard against the head fallback reopening the bug it was written for: "world trade" must not match 1 World Trade Center, but "1 world trade center" itself must.' },
  { q: 'world trade organisation', expect: 'refuse',
    why: 'Same guard, other direction. No node titles it and the concept tier has nothing, so refusing is correct.' },
  { q: 'sixth schedule of the constitution', expect: 'answer', mustInclude: ['sixth schedule'],
    why: 'The demand-noun cut must not destroy this one: it lost everything after `Schedule` when the lead held a demand noun.' },
  { q: 'basic structure doctrine', expect: 'refuse',
    why: 'Titles, but two sentences is below the evidence floor. Low coverage is not an answer.' },
  { q: 'disaster management', expect: 'refuse',
    why: 'Only one quotable sentence; a single departmental sentence is not a mains answer.' },
  { q: 'who was dadabhai naoroji', expect: 'refuse',
    why: 'No term resolves anywhere in the index.' },
  { q: 'nakshi lake', expect: 'refuse', gap: 'nakshi',
    why: 'Absent subject term.' },
  { q: 'far cry 3', expect: 'refuse',
    why: 'Titles exactly, but one quotable sentence is below the evidence floor. Refusing is correct; this is not a mains topic.' },
  { q: '.net framework', expect: 'refuse',
    why: 'Titles exactly, one sentence, refuses. The old bug answered a federalism question with this node.' },
  { q: 'what were the aims and outcomes of the Indian National Congress at its founding in 1885?', expect: 'either', known: true,
    why: 'Answers with `The 1885 Open Championship` (golf). The subject variants title-match but point at an unrelated 1885 node. Closing this needs the title gate to require that a matched title be about the question non-subject terms.' },
  { q: 'monsoon in india', expect: 'either', known: true,
    why: 'Answers with `Monsoon Raaga`, a Kannada film. Same class: a common head word means no head is chosen, so a wrong title variant matches instead.' }
];

function run(q) {
  var res = ask.retrieve(idx, q, 12);
  var out = ask.compose(q, res);
  return {
    q: q,
    answered: !out.refused,
    reason: res.reason || '',
    gap: (res.corpusGap || []).join(' '),
    coverage: res.coverage,
    evidence: (res.evidence || []).map(function (e) { return e.sentence; }),
    nodes: (res.evidence || []).map(function (e) { return e.node.name; })
  };
}

// 'either' accepts both outcomes but still checks relevance when the engine did
// answer -- that is the whole point of the mustInclude column.
function judge(c, r) {
  if (c.gap && r.gap.indexOf(c.gap) === -1) {
    return 'expected the refusal to name the gap "' + c.gap + '", got "' + r.gap + '"';
  }
  if (c.expect === 'refuse' && r.answered) {
    return 'answered with "' + (r.evidence[0] || '').slice(0, 60) + '" -- should have refused';
  }
  if (c.expect === 'answer' && !r.answered) {
    return 'refused (' + r.reason.slice(0, 60) + ') -- should have answered';
  }
  if (r.answered && c.mustInclude) {
    var hay = (r.evidence.join(' ') + ' ' + r.nodes.join(' ')).toLowerCase();
    if (!c.mustInclude.some(function (w) { return hay.indexOf(w.toLowerCase()) !== -1; })) {
      return 'answered, but about something else -- "' + (r.evidence[0] || '').slice(0, 60) + '"';
    }
  }
  return null;
}

var argv = process.argv.slice(2);

if (argv[0] === '-q') {
  var one = run(argv[1] || '');
  console.log('Q        : ' + one.q);
  console.log('verdict  : ' + (one.answered ? 'ANSWERED' : 'REFUSED'));
  if (one.reason) console.log('reason   : ' + one.reason);
  if (one.gap) console.log('gap      : ' + one.gap);
  console.log('coverage : ' + (one.coverage * 100).toFixed(0) + '%');
  one.evidence.forEach(function (s, i) { console.log('  [' + (i + 1) + '] ' + String(s).slice(0, 130)); });
  process.exit(0);
}

var verbose = argv.indexOf('-v') !== -1;
var fails = 0, knownBad = 0, knownOk = 0;

CASES.forEach(function (c) {
  var r = run(c.q);
  var problem = judge(c, r);
  if (problem && c.known) knownBad++;
  else if (problem) fails++;
  else if (c.known) knownOk++;
  var label = problem ? (c.known ? 'BAD  ' : 'FAIL ') : (r.answered ? 'ok   ' : 'ok   ');
  console.log(label + c.q.slice(0, 56).padEnd(56) + ' ' +
    (r.answered ? 'ANSWER(' + r.evidence.length + ')' : 'REFUSE') + (r.gap ? ' gap=' + r.gap : ''));
  if (verbose) {
    console.log('       why: ' + c.why);
    if (problem) console.log('       ' + problem);
    (r.evidence || []).slice(0, 2).forEach(function (s, i) {
      console.log('       [' + (i + 1) + '] ' + String(s).slice(0, 100));
    });
    if (!r.answered && r.reason) console.log('       reason: ' + r.reason.slice(0, 100));
  }
});

console.log('');
console.log(CASES.length + ' cases: ' + fails + ' unexpected failure(s), ' +
  knownBad + ' known-bad still failing');
if (knownOk) {
  console.log('note: ' + knownOk + ' known-bad case(s) now behave -- drop the `known` flag to enforce them');
}
console.log(fails ? 'AUDIT FAILED' : 'AUDIT PASSED (' + knownBad + ' known-bad outstanding)');
process.exit(fails ? 1 : 0);
