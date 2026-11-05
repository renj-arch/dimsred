'use strict';
// Build data/course-questions.json from the question banks embedded in the
// course lesson pages.
//
// The lesson pages do not render their practice questions as static HTML: each
// one carries a `var practiceQs = [...]` array and draws the cards in the
// browser. current-affairs.html only knew how to scrape `.q-card` markup, so
// "Course Lessons" loaded zero questions even though 269 lesson pages contain
// 10,000+ authored questions. Extracting them at build time gives the quiz one
// small manifest instead of 269 page fetches.
//
//   node scripts/build-course-questions.js
//
// Question quality gates:
//   - exactly one option is marked correct;
//   - question, solution and every option have text;
//   - no duplicate options;
//   - solutions that admit they are guessing ("not in options", "closest",
//     "most likely", "I'll go with", ...) are dropped rather than shipped;
//   - duplicate question text across exams is kept once (the first exam path
//     wins; the same bank is copied across several exam folders).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'course-questions.json');

const AMBIGUOUS = /not in options|not matching|closest|most likely|likely intended|expected answer|i'?ll go with|let me (just )?(take|use|recompute|recalculate)|hmm|not consistent|pattern may be/i;

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'question-bank') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/[\\/]course[\\/].*[\\/]lesson-.*\.html$/i.test(p)) out.push(p);
  }
  return out;
}

// Return the source text of the practiceQs array, using bracket matching so a
// `]` inside a solution string cannot end the array early.
function extractArray(html) {
  const m = /var\s+practiceQs\s*=\s*/.exec(html);
  if (!m) return null;
  let i = m.index + m[0].length;
  if (html[i] !== '[') return null;
  const start = i;
  let depth = 0, inStr = false, quote = '', esc = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; quote = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (!depth) { i++; break; } }
  }
  return html.slice(start, i);
}

function parseArray(src) {
  try { return JSON.parse(src); } catch (e) { /* JEE lesson files use JS object literals */ }
  // Build-time only, and the input is a tracked repository file. This is not
  // shipped to the browser and no user input reaches it.
  return new Function('return (' + src + ')')();
}

function clean(text) {
  return String(text == null ? '' : text)
    .replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, function (_, inner) {
      var t = String(inner).replace(/<[^>]+>/g, '').trim();
      return t ? '^' + (t.length > 1 ? '(' + t + ')' : t) : '';
    })
    .replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, function (_, inner) {
      var t = String(inner).replace(/<[^>]+>/g, '').trim();
      return t ? (t.length > 1 ? '(' + t + ')' : t) : '';
    })
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&minus;/g, '−')
    .replace(/&rarr;/g, '→')
    .replace(/&larr;/g, '←')
    .replace(/&infin;/g, '∞')
    .replace(/&times;/g, '×')
    .replace(/&divide;/g, '÷')
    .replace(/&pi;/g, 'π')
    .replace(/&theta;/g, 'θ')
    .replace(/&deg;/g, '°')
    .replace(/&radic;/g, '√')
    .replace(/&le;/g, '≤')
    .replace(/&ge;/g, '≥')
    .replace(/&ne;/g, '≠')
    .replace(/&middot;/g, '·')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function subjectFor(rel) {
  if (/[\\/]reasoning[\\/]/i.test(rel)) return 'Reasoning';
  if (/[\\/](quant|maths)[\\/]/i.test(rel)) return 'Quantitative Aptitude';
  if (/[\\/]english[\\/]/i.test(rel)) return 'English';
  if (/[\\/](gk|gs|legal)[\\/]/i.test(rel)) return 'General Awareness';
  return 'General Knowledge';
}

function main() {
  const files = walk(ROOT, []);
  const reasons = {};
  const byExam = {};
  const seen = new Set();
  const questions = [];
  let total = 0;

  function drop(reason) {
    reasons[reason] = (reasons[reason] || 0) + 1;
  }

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const src = extractArray(html);
    if (!src) continue;
    let arr;
    try { arr = parseArray(src); } catch (e) { drop('parse'); continue; }
    if (!Array.isArray(arr)) { drop('shape'); continue; }

    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const exam = rel.split('/')[0];
    const subject = subjectFor(rel);

    for (const q of arr) {
      total++;
      if (!q || typeof q !== 'object') { drop('shape'); continue; }
      const text = clean(q.text);
      const sol = clean(q.sol);
      if (text.length < 8) { drop('question text'); continue; }
      if (sol.length < 5) { drop('solution'); continue; }
      if (AMBIGUOUS.test(text) || AMBIGUOUS.test(sol)) { drop('ambiguous solution'); continue; }
      if (!Array.isArray(q.options) || q.options.length < 2) { drop('options'); continue; }
      const correct = q.options.filter(function (o) { return o && o.c === true; });
      if (correct.length !== 1) { drop('correct option count'); continue; }
      const opts = q.options.map(function (o) { return clean(o && o.t); });
      const answer = clean(correct[0].t);
      if (!answer || opts.some(function (o) { return !o; })) { drop('option text'); continue; }
      if (new Set(opts).size !== opts.length) { drop('duplicate options'); continue; }

      const key = text.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(key)) { drop('duplicate question'); continue; }
      seen.add(key);

      questions.push({
        q: text,
        a: answer,
        opts: opts,
        source: 'course',
        subject: subject,
        type: 'mcq',
        _exam: exam,
        _lesson: rel
      });
      byExam[exam] = (byExam[exam] || 0) + 1;
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'course lesson practiceQs banks',
    lessonFiles: files.length,
    total: questions.length,
    byExam: byExam,
    questions: questions
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload) + '\n');

  console.log('Course question bank');
  console.log('  lesson files scanned     ' + files.length);
  console.log('  questions read           ' + total);
  console.log('  unique questions kept    ' + questions.length);
  console.log('  written                  ' + path.relative(ROOT, OUT) + ' (' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB)');
  console.log('  by exam                  ' + JSON.stringify(byExam));
  console.log('  dropped                  ' + JSON.stringify(reasons));
}

main();
