// Audit: does archive-cat-index.json's `total` per category match the number
// of question objects actually present in the files it points at?
//
// The freshness gate compares the sum of these totals against
// manifest.stats.records. Run #6 failed with the builder reporting 16 MORE
// records than the index claims, and build-ask-qb.js is itself driven by this
// file -- so the totals must be undercounting somewhere.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const QD = path.join(ROOT, 'data', 'questions');
const ci = JSON.parse(fs.readFileSync(path.join(QD, 'archive-cat-index.json'), 'utf8'));

function countIn(file) {
  // Shape: { Subject: { subSubjects: { SubSub: [ ...questions ] } } }
  // Note the literal "subSubjects" layer -- a two-level walk finds no arrays at
  // all and silently counts every category as zero.
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  let n = 0;
  for (const subj of Object.keys(j)) {
    const holder = j[subj];
    if (!holder || typeof holder !== 'object') continue;
    const groups = holder.subSubjects && typeof holder.subSubjects === 'object'
      ? holder.subSubjects : holder;
    for (const k of Object.keys(groups)) {
      const arr = groups[k];
      if (Array.isArray(arr)) n += arr.length;
    }
  }
  return n;
}

let declared = 0, actual = 0;
const rows = [];
for (const c of ci) {
  const files = Array.isArray(c.file) ? c.file : [c.file];
  let real = 0;
  const missing = [];
  for (const f of files) {
    if (!fs.existsSync(path.join(ROOT, f))) { missing.push(f); continue; }
    real += countIn(f);
  }
  declared += c.total || 0;
  actual += real;
  rows.push({ name: c.name, declared: c.total || 0, real: real, delta: real - (c.total || 0), files: files.length, missing });
}

console.log('categories declared : ' + ci.length);
console.log('sum of totals       : ' + declared.toLocaleString());
console.log('actual in files     : ' + actual.toLocaleString());
console.log('difference          : ' + (actual - declared).toLocaleString());
console.log('');
const bad = rows.filter(r => r.delta !== 0 || r.missing.length);
if (!bad.length) console.log('every category total matches its files exactly');
for (const r of bad) {
  console.log('  ' + r.name.padEnd(34) + ' declared=' + String(r.declared).padStart(8) +
    ' actual=' + String(r.real).padStart(8) + ' delta=' + String(r.delta).padStart(6) +
    (r.missing.length ? '  MISSING FILES: ' + r.missing.join(',') : ''));
}
