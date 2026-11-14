'use strict';
// Regression test for the chunk collector. Run from the repo root:
//   node scripts/lib/merge-chunks.test.js
// Builds a throwaway fixture, then exercises both the normal merge and the
// recovery "delta against old baseline, output onto current main" path.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-test-'));
const SCRIPT = path.join(ROOT, 'scripts', 'merge-chunks.js');
const LIB = path.join(ROOT, 'scripts', 'lib');
fs.mkdirSync(LIB, { recursive: true });
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.copyFileSync(path.join(REPO, 'scripts', 'merge-chunks.js'), SCRIPT);
fs.copyFileSync(path.join(REPO, 'scripts', 'lib', 'quiz-store.js'), path.join(LIB, 'quiz-store.js'));

function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value)); }
function readQuestions(file) {
  const primary = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!primary.shardCount) return primary.questions || [];
  const out = [];
  for (let i = 0; i < primary.shardCount; i++) {
    const part = JSON.parse(fs.readFileSync(file + '.part.' + i, 'utf8'));
    for (const q of part.questions || []) out.push(q);
  }
  return out;
}
function run(args, env) {
  const res = spawnSync(process.execPath, [SCRIPT].concat(args), {
    cwd: ROOT,
    env: Object.assign({}, process.env, env || {}),
    encoding: 'utf8'
  });
  const out = (res.stdout || '') + (res.stderr || '');
  if (res.status !== 0) throw new Error(args.join(' ') + ' failed (' + res.status + '):\n' + out);
  return out;
}
function reset() {
  fs.rmSync(path.join(ROOT, 'chunks'), { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, 'data', 'quiz.json'), { force: true });
  for (const f of fs.readdirSync(path.join(ROOT, 'data'))) {
    if (f.startsWith('quiz.json.part.')) fs.rmSync(path.join(ROOT, 'data', f));
  }
  fs.mkdirSync(path.join(ROOT, 'chunks'), { recursive: true });
}
function questionsByName(list) {
  const map = {};
  for (const q of list) map[q.question] = q;
  return map;
}
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok || !detail ? '' : ' â€” ' + detail));
  if (!ok) failures++;
}

// â”€â”€ Normal merge: two chunks, overlapping questions, across processes â”€â”€
reset();
writeJson(path.join(ROOT, 'data', 'quiz.json'), { questions: [
  { question: 'Q1', answer: 'A1' },
  { question: 'Q2', answer: 'A2', wikiDone: false }
] });
writeJson(path.join(ROOT, 'chunks', 'quiz-chunk-1.json'), { questions: [
  { question: 'Q1', answer: 'A1' },
  { question: 'Q2', answer: 'A2', wikiDone: true },
  { question: 'Q3', answer: 'A3' }
] });
run(['collect']);
check('first collect survives a fresh workspace', fs.existsSync(path.join(ROOT, 'chunks', '.merge-state', 'seen.txt.bloom')));

writeJson(path.join(ROOT, 'chunks', 'quiz-chunk-2.json'), { questions: [
  { question: 'Q3', answer: 'A3', wikiDone: true },
  { question: 'Q4', answer: 'A4' }
] });
run(['collect']);
run(['finalize']);
let merged = questionsByName(readQuestions(path.join(ROOT, 'data', 'quiz.json')));
check('normal merge keeps every question exactly once', Object.keys(merged).length === 4,
  Object.keys(merged).join(','));
check('second chunk did not duplicate the first chunk\'s new question', !!merged.Q3 && !!merged.Q4);
check('carry applies wikiDone to an existing question', merged.Q2 && merged.Q2.wikiDone === true);
check('carry applies wikiDone to a collected question', merged.Q3 && merged.Q3.wikiDone === true);
check('finalize drains the state directory', !fs.existsSync(path.join(ROOT, 'chunks', '.merge-state')));

// â”€â”€ Recovery: baseline only decides what is new, current stays the base â”€â”€
reset();
writeJson(path.join(ROOT, 'data', 'quiz.json'), { questions: [
  { question: 'R1', answer: 'A1' },
  { question: 'R4', answer: 'A4' } // landed on main after the failed run started
] });
const BASE = path.join(ROOT, 'baseline-quiz.json');
writeJson(BASE, { questions: [
  { question: 'R1', answer: 'A1' },
  { question: 'R2', answer: 'A2' } // removed from main on purpose
] });
writeJson(path.join(ROOT, 'chunks', 'quiz-chunk-1.json'), { questions: [
  { question: 'R1', answer: 'A1' },
  { question: 'R2', answer: 'A2' },
  { question: 'R3', answer: 'A3' }, // genuinely new
  { question: 'R4', answer: 'A4' }  // already on main
] });
run(['collect'], { MERGE_BASE_QUIZ: BASE });
run(['finalize']);
merged = questionsByName(readQuestions(path.join(ROOT, 'data', 'quiz.json')));
check('recovery adds the genuine delta', !!merged.R3);
check('recovery does not duplicate a question already on main', !!merged.R4 &&
  readQuestions(path.join(ROOT, 'data', 'quiz.json')).filter(q => q.question === 'R4').length === 1);
check('recovery does not resurrect a question removed from main', !merged.R2,
  Object.keys(merged).join(','));
check('recovery keeps current questions', !!merged.R1);

// â”€â”€ Finalize without collect must fail loudly â”€â”€
reset();
writeJson(path.join(ROOT, 'data', 'quiz.json'), { questions: [{ question: 'S1', answer: 'A1' }] });
const res = spawnSync(process.execPath, [SCRIPT, 'finalize'], { cwd: ROOT, encoding: 'utf8' });
check('finalize refuses to run with no collected state', res.status !== 0,
  'exit ' + res.status);

fs.rmSync(ROOT, { recursive: true, force: true });
console.log('\n' + (failures === 0 ? 'all merge tests passed' : failures + ' failed'));
process.exit(failures ? 1 : 0);
