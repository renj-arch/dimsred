// Regression guard for the 2026-11-10 drill outage.
//
// daily-papers.yml runs scripts/build-topic-index.js on every paper generation.
// That script rebuilt data/topic-index.json from a hardcoded 14-exam map, so the
// six combined drills added by hand the day before — general-knowledge,
// general-studies, mathematics, english, reasoning, science — were silently
// dropped from the index and vanished from the drill page. Their
// data/topics/<key>.json payloads were never touched: ~6,600 questions sat in
// the repo, unreachable.
//
// build-topic-index.js now preserves any entry it does not own, but the guard
// belongs here too: the invariant is that every exam with a question payload
// must be reachable from the index, and the combined drills must never go
// missing again.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const INDEX = path.join(ROOT, 'data', 'topic-index.json');
const INDEX_JS = path.join(ROOT, 'data', 'topic-index.js');
const TOPIC_DIR = path.join(ROOT, 'data', 'topics');

// The combined, cross-exam drills. Each pools sections from every exam, so it
// is not one question-bank file and the builder cannot derive it.
const COMBINED = ['general-knowledge', 'general-studies', 'mathematics', 'english', 'reasoning', 'science'];

assert(fs.existsSync(INDEX), 'data/topic-index.json is missing — the drill page has no exam list at all');
const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
const exams = index.exams || {};
const keys = Object.keys(exams);
assert(keys.length > 0, 'data/topic-index.json declares zero exams');

// 1. Every combined drill is present, named, and non-empty.
const gone = COMBINED.filter(function (k) { return !exams[k]; });
assert.deepStrictEqual(
  gone, [],
  'combined drills dropped from data/topic-index.json: ' + gone.join(', ') +
  ' — build-topic-index.js or a hand edit removed curated exams'
);
for (const k of COMBINED) {
  const e = exams[k];
  assert(e.name && String(e.name).trim(), k + ' has no display name');
  assert(Number(e.total) > 0, k + ' has total=' + e.total + ' (an empty exam card)');
  assert(Array.isArray(e.sections) && e.sections.length > 0, k + ' declares no sections');
}

// 2. Every exam with a payload must be in the index, and every index entry must
//    have a payload. Either half missing is a broken card on the drill page:
//    the first hides questions, the second 404s when the student taps it.
if (!fs.existsSync(TOPIC_DIR)) {
  console.error('FAIL  data/topics/ is missing entirely — cannot verify the drill page');
  process.exit(1);
}
const payloads = fs.readdirSync(TOPIC_DIR)
  .filter(function (f) { return f.endsWith('.json'); })
  .map(function (f) { return f.replace(/\.json$/, ''); });

const unreachable = payloads.filter(function (k) { return !exams[k]; });
assert.deepStrictEqual(
  unreachable, [],
  'question payloads exist but the index dropped them: ' + unreachable.join(', ')
);
const dangling = keys.filter(function (k) { return payloads.indexOf(k) === -1; });
assert.deepStrictEqual(
  dangling, [],
  'index lists exams with no data/topics/<key>.json: ' + dangling.join(', ')
);

// 3. The file:// loader copy must agree with the JSON, or the page works on the
//    server and breaks when opened locally.
if (fs.existsSync(INDEX_JS)) {
  const sandbox = {};
  new Function('window', fs.readFileSync(INDEX_JS, 'utf8'))(sandbox);
  const jsIndex = sandbox.__topicIndex;
  assert(jsIndex && jsIndex.exams, 'data/topic-index.js does not define window.__topicIndex.exams');
  const jsKeys = Object.keys(jsIndex.exams).sort();
  assert.deepStrictEqual(
    jsKeys, keys.slice().sort(),
    'data/topic-index.js is out of step with data/topic-index.json (run `npm run build-topic-index`)'
  );
}

console.log('PASS  topic index: ' + keys.length + ' exams, all ' + COMBINED.length +
  ' combined drills present, every payload reachable');
