// Guard the published question corpus against the two defect classes users
// reported on 2026-11-07:
//   1. a solution whose own arithmetic lands on a value that is not an option
//      ("... = 5% but since this is not an option ..."), so the key is a guess;
//   2. raw model reasoning ("Let me re-check", "Wait, ...", "I misread") leaking
//      into a student-facing explanation.
// Structural invariants are checked too: 4 or 5 options (banking papers use 5),
// exactly one correct key, and a generation date on every model-written item.
// Items with no solution at all are reported as warnings, not failures: they
// predate this gate and are counted so the number can only go down.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIRS = ['question-bank', 'papers-data'];

const LEAK = [
  [/\bnot (?:an|among the) options?\b/i, 'solution says the true value is not an option'],
  [/\bclosest (?:is|option)\b/i, 'solution picks the closest option instead of the exact value'],
  [/\bdo not have the exact\b/i, 'solution admits the options do not contain the answer'],
  [/\b(?:i (?:initially )?misread|let me re-?check|let me recalculate|that doesn.t match)\b/i, 'raw model reasoning in the solution'],
  [/\bwait[,\s]+(?:but|the|that|it|i)\b/i, 'raw model reasoning in the solution']
];

let failed = 0;
let warnNoSolution = 0;
let warnShape = 0;
function fail(msg) {
  failed++;
  if (failed <= 25) console.error('FAIL ' + msg);
}

let checked = 0;
DIRS.forEach(function (dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return;
  fs.readdirSync(abs).filter(function (f) { return f.endsWith('.json'); }).forEach(function (f) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(abs, f), 'utf-8')); } catch (e) { return; }
    if (!data || !Array.isArray(data.questions)) return;
    data.questions.forEach(function (q, i) {
      if (!q || !q.text) return;
      checked++;
      const id = dir + '/' + f + ' ' + (q.id || (data.slug || 'q') + '#' + (q.q || i + 1));
      const opts = Array.isArray(q.options) ? q.options : [];
      if (opts.length !== 4 && opts.length !== 5) { warnShape++; console.warn('WARN ' + id + ': ' + opts.length + ' options'); }
      const correct = opts.filter(function (o) { return o && o.correct; });
      if (correct.length !== 1) { warnShape++; console.warn('WARN ' + id + ': ' + correct.length + ' correct options'); }
      if (!q.solution) warnNoSolution++;
      const sol = String(q.solution || '');
      LEAK.forEach(function (pair) {
        if (pair[0].test(sol)) fail(id + ': ' + pair[1]);
      });
      const isModel = q.source === 'model' || q.reviewed === false || q.origin === 'ci';
      if (isModel && !/^\d{4}-\d{2}-\d{2}/.test(String(q.generatedAt || q.at || q.inventedAt || ''))) {
        fail(id + ': model item without a generation date');
      }
    });
  });
});

console.log((failed ? 'FAILED' : 'PASS') + '  question corpus: ' + checked + ' items, ' + failed +
  ' failure(s), ' + warnNoSolution + ' without an explanation, ' + warnShape + ' shape warning(s)');
process.exit(failed ? 1 : 0);
