// CI-safe global sub-topic classification pass.
//
// Sweeps every bare (non-✓) sub-topic across data/questions/*.json and, when the
// classifier routes it to a category different from its current home, moves ALL
// copies of that sub-topic into the destination as a ✓-ticked sub-topic.
//
// Uses the all-copies, single-write approach (load every file once, mutate in
// memory, write each touched file once) so it is immune to the two apply()
// defects seen in the one-time global run:
//   1. first-match-only moves (a name spanning several part files left copies
//      behind), and
//   2. source==destination write-back (a category both source and destination
//      resurrected the original, duplicating questions).
//
// Safe by construction: sub-topics already ✓-ticked are never touched, and a
// copy whose home already IS the destination is left untouched (no dupe). If the
// dataset is clean it reports "0 moves" and changes nothing.
//
// Usage: node scripts/classify-global.cjs   (heap via NODE_OPTIONS in workflows)

const fs = require('fs');
const path = require('path');
const lib = require('./classify_lib.js');
const { classify, TICK, DIR, slugFor } = lib;

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json') && f !== 'catalog.json' && f !== 'manifest.json' && f !== 'archive-cat-index.json');

// ── OOM guard ── Load only enough files to fit within the available heap.
// GitHub-hosted runners have ~7 GB RAM; V8 heap is capped by NODE_OPTIONS.
// With 400+ JSON files averaging ~7 MB each, parsing everything at once can
// exceed the heap.  Scan total byte-size first and bail early if unsafe.
const MAX_TOTAL_BYTES = parseInt(process.env.CLASSIFY_MAX_BYTES || String(1.5 * 1024 * 1024 * 1024), 10); // 1.5 GB default
let totalBytes = 0;
for (const f of files) {
  totalBytes += fs.statSync(path.join(DIR, f)).size;
}
if (totalBytes > MAX_TOTAL_BYTES) {
  console.log('classify-global: SKIPPED — data/questions totals ' +
    (totalBytes / 1024 / 1024).toFixed(0) + ' MB (limit ' +
    (MAX_TOTAL_BYTES / 1024 / 1024).toFixed(0) + ' MB). Re-run with CLASSIFY_MAX_BYTES or split files.');
  process.exit(0);
}

// Parse every file once.
const parsed = files.map(file => {
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  const k = Object.keys(raw)[0];
  return { file, raw, k, ss: (raw[k] && raw[k].subSubjects) || {} };
});

try {
classifyMain();
} catch (err) {
  console.error('classify-global: FATAL — ' + (err && err.message || err));
  // Exit 0 so the merge job continues; a classification failure must not
  // block the wiki-fill commit.  The data is already merged — only the
  // tick-routing pass is skipped.
  process.exit(0);
}

function classifyMain() {
// name -> { dest, homes: [file], n }  (dest = classify() routing, only for bare names)
const plan = new Map();
for (const p of parsed) {
  for (const [name, arr] of Object.entries(p.ss)) {
    if (name.startsWith(TICK)) continue; // already moved in — never re-move
    const n = Array.isArray(arr) ? arr.length : 0;
    if (n === 0) continue;
    const r = classify(name);
    if (!r || !r.dest) continue;
    if (r.dest === p.k) continue; // already at home
    if (!plan.has(name)) plan.set(name, { dest: r.dest, homes: [], n });
    plan.get(name).homes.push(p.file);
  }
}

if (plan.size === 0) {
  console.log('classify-global: 0 moves — every bare sub-topic is already correctly placed.');
  process.exit(0);
}

// Move each planned sub-topic: append question objects to dest ✓ name (creating a
// placeholder file if the category has no file yet), drop the bare copy everywhere
// except homes that already ARE the destination.
const touched = new Set();
let movedQ = 0;
const destFiles = new Map(); // destFile name -> parsed index
for (const [name, m] of plan) {
  const destFile = slugFor(m.dest) + '.json';
  let dp = parsed.find(x => x.file === destFile);
  if (!dp) {
    const data = {}; data[m.dest] = { subSubjects: {} };
    dp = { file: destFile, raw: data, k: m.dest, ss: data[m.dest].subSubjects };
    parsed.push(dp);
  }
  const tick = TICK + name;
  if (!Array.isArray(dp.ss[tick])) dp.ss[tick] = [];
  for (const home of m.homes) {
    if (home === destFile) continue; // already correctly placed here — leave as bare
    const hp = parsed.find(x => x.file === home);
    if (!hp) continue;
    const arr = hp.ss[name];
    if (!Array.isArray(arr)) continue;
    for (const q of arr) {
      if (!q) continue;
      q.category = m.dest;
      q.subject = m.dest;
      q.subSubject = tick;
    }
    dp.ss[tick] = dp.ss[tick].concat(arr);
    movedQ += arr.length;
    delete hp.ss[name];
    touched.add(home);
    touched.add(destFile);
  }
}

// Write once each.
for (const file of touched) {
  const p = parsed.find(x => x.file === file);
  fs.writeFileSync(path.join(DIR, file), JSON.stringify(p.raw));
}

// Summary by destination.
const byDest = {};
for (const m of plan.values()) byDest[m.dest] = (byDest[m.dest] || 0) + 1;
console.log('classify-global: moved ' + plan.size + ' sub-topics / ' + movedQ + ' questions across ' +
  Object.keys(byDest).length + ' destinations, ' + touched.size + ' files rewritten.');
for (const [d, c] of Object.entries(byDest).sort((a, b) => a[1] === b[1] ? a[0].localeCompare(b[0]) : b[1] - a[1]))
  console.log('  ' + d + ': +' + c + ' sub-topics');

} // end classifyMain