// Repair two classes of internally inconsistent questions that were published
// in several banks and papers:
//   1. "sum amounts to 900 in 3 years and 1000 in 5 years" -> simple interest
//      gives 6.67%, which was not among the four options; the key pointed at 8%.
//   2. "train crosses a pole in 18 seconds at 72 km/h ..." -> 72 km/h is 20 m/s,
//      so the new length crosses in 24 s, not 30 s.
// Every match gets corrected options, a correct key and a self-contained
// solution. Idempotent: rerunning finds nothing left to repair.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BANK_DIR = path.join(ROOT, 'question-bank');
const DATA_DIR = path.join(ROOT, 'papers-data');

const FIXES = [
  {
    match: /sum of money amounts to rs\.? ?900 in 3 years and rs\.? ?1000 in 5 years/i,
    options: ['6.67%', '5%', '8%', '10%'],
    correct: 0,
    solution: 'The amount rises by Rs. 100 over the two years from year 3 to year 5, so simple interest is Rs. 50 per year. In 3 years the interest is Rs. 150, hence principal = 900 - 150 = Rs. 750. Rate = (50 / 750) x 100 = 6.67% per annum. 5%, 8% and 10% are therefore wrong.'
  },
  {
    match: /train crosses a pole in 18 seconds.*72 km\/h.*length is increased by 120 meters/i,
    options: ['24 seconds', '30 seconds', '35 seconds', '40 seconds'],
    correct: 0,
    solution: '72 km/h = 72 x 5/18 = 20 m/s. In 18 s the train covers its own length: 20 x 18 = 360 m. After adding 120 m the length is 480 m, so time = 480 / 20 = 24 seconds. The other options ignore the correct speed conversion or the added length.'
  }
];

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function fixQuestion(q, fix) {
  const opts = fix.options.map(function (text, i) {
    return { label: 'ABCD'[i], text: text, correct: i === fix.correct };
  });
  q.options = opts;
  q.solution = fix.solution;
  q.repairedAt = new Date().toISOString();
  q.repairedReason = 'option set/key did not match the stated arithmetic';
  return q;
}

function walk(file, label, changed, affected) {
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch (e) { return; }
  if (!data || !Array.isArray(data.questions)) return;
  let n = 0;
  data.questions.forEach(function (q) {
    if (!q || !q.text) return;
    for (const fix of FIXES) {
      if (fix.match.test(q.text)) {
        fixQuestion(q, fix);
        n++;
        break;
      }
    }
  });
  if (n) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    changed.push(label + ' (' + n + ')');
    if (data.slug && data.folder) affected[data.slug] = { folder: data.folder, kind: data.kind || 'daily' };
  }
}

const changed = [];
const affected = {};
fs.readdirSync(BANK_DIR).filter(function (f) { return f.endsWith('.json'); }).forEach(function (f) {
  walk(path.join(BANK_DIR, f), 'question-bank/' + f, changed, affected);
});
fs.readdirSync(DATA_DIR).filter(function (f) { return f.endsWith('.json'); }).forEach(function (f) {
  walk(path.join(DATA_DIR, f), 'papers-data/' + f, changed, affected);
});

const targets = Object.keys(affected).map(function (slug) {
  return { slug: slug, folder: affected[slug].folder, kind: affected[slug].kind };
});
fs.writeFileSync(path.join(ROOT, 'data', 'repair-targets.json'), JSON.stringify({ at: new Date().toISOString(), papers: targets }, null, 2), 'utf-8');
console.log(JSON.stringify({ changed: changed, affectedPapers: targets }, null, 2));
