// Recompute one category's entry in archive-cat-index.json from the records
// actually present in its files.
//
// The cat-index `total` is written only by build-archive-single.js from its
// in-memory tree. Wiki Fill appends into data/questions/*.json directly, so a
// category can hold more records than the index claims. That is exactly what
// broke "Ask question-bank rebuild" run #6: archive-cat-index.json said
// 15,901,975 records while the builder scanned 15,901,991, and the freshness
// gate failed. All 16 records were Indian Tribes (declared 1,788, actual 1,804).
//
// Only the named category is touched; everything else in the file is preserved
// byte-for-byte in structure. Per-subject and per-subSubject counts are
// recomputed too, so the entry is internally consistent rather than only its
// top-level total being corrected.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const QD = path.join(ROOT, 'data', 'questions');
const INDEX = path.join(QD, 'archive-cat-index.json');
const TARGET = process.argv[2];

if (!TARGET) {
  console.error('usage: node scripts/fix-cat-index-total.js "<Category Name>"');
  process.exit(2);
}

const ci = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
const entry = ci.find(c => c.name === TARGET);
if (!entry) {
  console.error('no such category in archive-cat-index.json: ' + TARGET);
  process.exit(2);
}

const files = Array.isArray(entry.file) ? entry.file : [entry.file];

// Merge every part file into one { subject: { subSubject: [records] } } tree,
// because a category split across parts has its sub-topics interleaved.
const merged = {};
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  for (const subj of Object.keys(j)) {
    const holder = j[subj];
    if (!holder || typeof holder !== 'object') continue;
    const groups = holder.subSubjects && typeof holder.subSubjects === 'object'
      ? holder.subSubjects : holder;
    if (!merged[subj]) merged[subj] = {};
    for (const ss of Object.keys(groups)) {
      if (!Array.isArray(groups[ss])) continue;
      if (!merged[subj][ss]) merged[subj][ss] = [];
      merged[subj][ss].push.apply(merged[subj][ss], groups[ss]);
    }
  }
}

const subjects = Object.keys(merged).sort();
let total = 0;
const newSubjects = subjects.map(s => {
  const ssNames = Object.keys(merged[s]).sort();
  let sTotal = 0;
  const subSubjects = ssNames.map(ss => {
    sTotal += merged[s][ss].length;
    return { name: ss, count: merged[s][ss].length };
  });
  total += sTotal;
  return { name: s, total: sTotal, subSubjects: subSubjects };
});

const before = entry.total;
entry.total = total;
entry.subjects = newSubjects;

// The file is minified and has no trailing newline (21,802,464 bytes on one
// line). Writing it pretty-printed turns a one-category correction into a
// two-million-line diff, so the exact original shape is reproduced here.
fs.writeFileSync(INDEX, JSON.stringify(ci));
console.log(TARGET + ': total ' + before + ' -> ' + total +
  ' (delta ' + (total - before > 0 ? '+' : '') + (total - before) + ')');
console.log('subjects recomputed: ' + newSubjects.length);