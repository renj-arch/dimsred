// Contamination audit for ask-training.jsonl — runs before any training step.
//
// The dataset is what the Ask page itself recorded, appended over time, so the
// file order IS chronological: line 0 is the oldest answer, the last line the
// newest. The audit uses that to build a honest time-split (oldest 90% train,
// newest 10% eval) and then checks the three ways a dataset like this goes bad:
//
//   FAIL  malformed line            — a truncated JSON record would crash the
//                                     trainer halfway through a 3-hour run.
//   FAIL  identical record repeated — the same question AND answer twice:
//                                     inflates the +15 delta gate and gives one
//                                     answer double weight.
//   FAIL  eval leakage              — the same normalized question appears in
//                                     both the train and the eval slice, so the
//                                     "held-out" answers were memorised during
//                                     training and the eval score means nothing.
//   WARN  same question, different answers (asked twice, two different replies —
//         legitimate but worth seeing; conflicting style targets).
//   WARN  thin answer — fails the capture-side quality gate (sections < 3,
//         < 500 chars, or no [n] citation). Pre-gate records may exist.
//   WARN  non-answer kinds (improve etc.) counted separately; they are excluded
//         from the answer-thinness checks.
//
// Exit 1 on any FAIL (blocks training), 0 on warnings/healthy, 0 when the file
// is absent (nothing to train yet). Always prints a summary; appends markdown
// to $GITHUB_STEP_SUMMARY when set.
//
// Usage: node train/audit.js [ask-training.jsonl]

const fs = require('fs');

const FILE = process.argv[2] || 'ask-training.jsonl';
const CIT = /\[\d+\]/;

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

if (!fs.existsSync(FILE)) {
  console.log('train-audit: no dataset (' + FILE + ') — nothing to audit.');
  process.exit(0);
}

const raw = fs.readFileSync(FILE, 'utf8');
const lines = raw.split('\n').filter(function (l) { return l.trim(); });

const fails = [];
const warns = [];
const records = [];
let improveCount = 0;
let otherKind = 0;

// 1. Parse — every line must be a complete JSON object.
lines.forEach(function (line, i) {
  let rec;
  try {
    rec = JSON.parse(line);
  } catch (e) {
    fails.push('malformed line ' + (i + 1) + ': ' + e.message);
    return;
  }
  if (!rec || typeof rec.q !== 'string' || !rec.q.trim()) {
    fails.push('line ' + (i + 1) + ' has no question (q)');
    return;
  }
  const kind = rec.kind || 'answer';
  if (kind === 'answer') records.push({ line: i + 1, rec: rec, nq: norm(rec.q) });
  else if (kind === 'improve') improveCount++;
  else otherKind++;
});

const n = records.length;

// 2. Identical records (same question AND same answer).
const seen = new Map();
records.forEach(function (r) {
  const key = r.nq + '||' + norm(r.rec.answer || '');
  seen.set(key, (seen.get(key) || 0) + 1);
});
let identical = 0;
let identicalExample = '';
seen.forEach(function (count, key) {
  if (count > 1) {
    identical += count - 1;
    if (!identicalExample) identicalExample = key.split('||')[0].slice(0, 80);
  }
});
if (identical) {
  fails.push(identical + ' identical record(s) repeated (e.g. "' + identicalExample +
    '") — dedupe the branch before training');
}

// 3. Time-split leakage: newest 10% (at least 1 when >= 20 records) is eval.
const evalN = n >= 20 ? Math.max(1, Math.ceil(n * 0.10)) : 0;
const trainSlice = evalN ? records.slice(0, n - evalN) : [];
const evalSlice = evalN ? records.slice(n - evalN) : [];
const evalQ = new Set(evalSlice.map(function (r) { return r.nq; }));
const leaked = [];
trainSlice.forEach(function (r) {
  if (evalQ.has(r.nq) && leaked.indexOf(r.nq) === -1) leaked.push(r.nq);
});
if (leaked.length) {
  fails.push('eval leakage: ' + leaked.length + ' question(s) appear in both train ' +
    'and eval slices (e.g. "' + leaked[0].slice(0, 80) + '")');
}

// 4. Same question, different answers — style conflict warning.
const byQ = new Map();
records.forEach(function (r) {
  if (!byQ.has(r.nq)) byQ.set(r.nq, { answers: new Set(), lines: [] });
  const g = byQ.get(r.nq);
  g.answers.add(norm(r.rec.answer || ''));
  g.lines.push(r.line);
});
let conflicts = 0;
let conflictExample = '';
byQ.forEach(function (g, q) {
  if (g.answers.size > 1) {
    conflicts++;
    if (!conflictExample) conflictExample = q.slice(0, 80);
  }
});
if (conflicts) {
  warns.push(conflicts + ' question(s) asked more than once with different answers (e.g. "' +
    conflictExample + '") — two style targets for one input');
}

// 5. Thin answers (mirrors the capture-side gate).
let thin = 0;
records.forEach(function (r) {
  const a = r.rec;
  const answer = String(a.answer || '');
  const sections = Array.isArray(a.sections) ? a.sections.length : 0;
  if (answer.length < 500 || sections < 3 || !CIT.test(answer)) thin++;
});
if (thin) {
  warns.push(thin + ' thin answer(s) (sections < 3, < 500 chars, or missing [n] citation) — ' +
    'these predate the capture quality gate or slipped through it');
}

// 6. Split sanity.
if (n >= 20 && evalN === 0) fails.push('could not build an eval slice from ' + n + ' records');

// ── report ──
console.log('train-audit: ' + lines.length + ' lines · ' + n + ' answer records · ' +
  improveCount + ' improve · ' + otherKind + ' other-kind');
if (evalN) console.log('  split: train ' + trainSlice.length + ' / eval ' + evalN +
  ' (newest 10%)');
else console.log('  split: none (need >= 20 records for a time-split)');
warns.forEach(function (w) { console.log('  WARN  ' + w); });
fails.forEach(function (f) { console.log('  FAIL  ' + f); });
console.log(fails.length ? 'train-audit: ' + fails.length + ' check(s) FAILED — blocking training'
  : 'train-audit: passed' + (warns.length ? ' with ' + warns.length + ' warning(s)' : ''));

if (process.env.GITHUB_STEP_SUMMARY) {
  const L = ['## Training data audit', '',
    '- lines: ' + lines.length + ' · answers: ' + n + ' · improve: ' + improveCount,
    '- split: ' + (evalN ? 'train ' + trainSlice.length + ' / eval ' + evalN : 'n/a (<20 records)'), ''];
  warns.forEach(function (w) { L.push('- ⚠️ ' + w); });
  fails.forEach(function (f) { L.push('- ❌ **' + f + '**'); });
  if (!fails.length && !warns.length) L.push('- ✅ clean');
  L.push('');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, L.join('\n') + '\n');
}

// Machine-readable summary for the improve.html fault panel: written to
// data/train-audit.json (cwd-relative) so the train workflow can commit it to
// main and the fault aggregator can pick it up.
try {
  const outPath = process.env.AUDIT_OUT || 'data/train-audit.json';
  fs.mkdirSync(require('path').dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    file: require('path').basename(FILE),
    lines: lines.length,
    answers: n,
    improve: improveCount,
    otherKind: otherKind,
    split: evalN ? { train: trainSlice.length, eval: evalN } : null,
    warnings: warns,
    failures: fails,
    ok: !fails.length
  }, null, 1) + '\n');
  console.log('train-audit: wrote ' + outPath);
} catch (e) {
  console.log('train-audit: summary not written (' + e.message + ')');
}

process.exit(fails.length ? 1 : 0);
