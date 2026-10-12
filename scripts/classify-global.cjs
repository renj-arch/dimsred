// CI-safe global sub-topic classification pass (streaming).
//
// Sweeps every bare (non-✓) sub-topic across data/questions/*.json and, when the
// classifier routes it to a category different from its current home, moves ALL
// copies of that sub-topic into the destination as a ✓-ticked sub-topic.
//
// Memory model (the fix for the silent skip): one file is parsed at a time and
// dropped before the next is opened, so peak heap tracks the LARGEST single
// file (~22 MB), never the corpus total. The previous version parsed every file
// up front and therefore had to bail out whenever data/questions exceeded a
// 1.5 GB guard — which it has since the corpus crossed 17 GB, meaning the
// classifier had been quietly skipping every run (masked by continue-on-error).
//
// Semantics are unchanged from the all-copies, single-write version:
//   - sub-topics already ✓-ticked are never touched;
//   - a copy whose home already IS the destination is left as-is (no dupe);
//   - a move rewrites ALL its copies (no first-match-only leftovers);
//   - the destination's ✓ bucket is appended to, never overwritten;
//   - if the dataset is clean it reports "0 moves" and changes nothing;
//   - any fatal error logs and exits 0 — classification must never block the
//     wiki-fill commit (the data is already merged; only the routing pass
//     would be skipped).
//
// Phase 1 (scan): parse each file, record every bare name's routing decision
//   and which files hold it. Phase 2 (apply): process one home file at a time,
//   moving each planned name into its destination file (parsed once per
//   home+destination group), then write both.
//
// Usage: node scripts/classify-global.cjs   (heap via NODE_OPTIONS in workflows)
//        CLASSIFY_DIR=path/to/questions  for fixture tests

const fs = require('fs');
const path = require('path');
const lib = require('./classify_lib.js');
const { classify, TICK, slugFor } = lib;
const DIR = process.env.CLASSIFY_DIR || lib.DIR;

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json') && f !== 'catalog.json' && f !== 'manifest.json' && f !== 'archive-cat-index.json');

function parse(file) {
  // Strip a UTF-8 BOM if present: JSON.parse rejects it, and one stray BOM
  // would silently drop a whole file from classification.
  const text = fs.readFileSync(path.join(DIR, file), 'utf8').replace(/^﻿/, '');
  const raw = JSON.parse(text);
  const k = Object.keys(raw)[0];
  return { file, raw, k, ss: (raw[k] && raw[k].subSubjects) || {} };
}

// Phase 1: scan every file sequentially; the parse is dropped each iteration.
// name -> { dest, homes: [file], n }  (dest = classify() routing, bare names only)
const plan = new Map();
for (const file of files) {
  let p;
  try {
    p = parse(file);
  } catch (err) {
    console.log('classify-global: skipping unreadable ' + file + ' (' + (err && err.message || err) + ')');
    continue;
  }
  for (const [name, arr] of Object.entries(p.ss)) {
    if (name.startsWith(TICK)) continue; // already moved in — never re-move
    const n = Array.isArray(arr) ? arr.length : 0;
    if (n === 0) continue;
    const r = classify(name);
    if (!r || !r.dest) continue;
    if (r.dest === p.k) continue; // already at home
    if (!plan.has(name)) plan.set(name, { dest: r.dest, homes: [], n: 0 });
    const m = plan.get(name);
    m.homes.push(file);
    m.n += n;
  }
}

if (plan.size === 0) {
  summary('classify-global: 0 moves — every bare sub-topic is already correctly placed.', 0, 0, {}, new Set());
  process.exit(0);
}

try {
  classifyMain();
} catch (err) {
  console.error('classify-global: FATAL — ' + (err && err.message || err));
  // Exit 0 so the merge job continues; a classification failure must not
  // block the wiki-fill commit. The data is already merged — only the
  // tick-routing pass is skipped.
  process.exit(0);
}

function classifyMain() {
  // Group every (name, home) pair by home file so each home is parsed once.
  const byHome = new Map();
  for (const [name, m] of plan) {
    for (const home of m.homes) {
      if (!byHome.has(home)) byHome.set(home, []);
      byHome.get(home).push({ name, dest: m.dest });
    }
  }

  const touched = new Set();
  let movedQ = 0;
  const byDest = {};

  for (const [home, moves] of byHome) {
    const hp = parse(home);
    let homeDirty = false;

    // Group this home's moves by destination; each destination file is
    // parsed once for this home, appended to, and written back immediately
    // so the next home sees the updated file.
    const byDestFile = new Map();
    for (const mv of moves) {
      const destFile = slugFor(mv.dest) + '.json';
      if (destFile === home) continue; // already correctly placed — leave bare
      if (!byDestFile.has(destFile)) byDestFile.set(destFile, []);
      byDestFile.get(destFile).push(mv);
    }

    for (const [destFile, mvs] of byDestFile) {
      let dp;
      if (fs.existsSync(path.join(DIR, destFile))) {
        dp = parse(destFile);
      } else {
        const data = {};
        data[mvs[0].dest] = { subSubjects: {} };
        dp = { file: destFile, raw: data, k: mvs[0].dest, ss: data[mvs[0].dest].subSubjects };
      }
      let destDirty = false;

      for (const mv of mvs) {
        const tick = TICK + mv.name;
        if (!Array.isArray(dp.ss[tick])) dp.ss[tick] = [];
        const arr = hp.ss[mv.name];
        if (!Array.isArray(arr)) continue;
        for (const q of arr) {
          if (!q) continue;
          q.category = mv.dest;
          q.subject = mv.dest;
          q.subSubject = tick;
        }
        dp.ss[tick] = dp.ss[tick].concat(arr);
        movedQ += arr.length;
        byDest[mv.dest] = (byDest[mv.dest] || 0) + 1;
        delete hp.ss[mv.name];
        homeDirty = true;
        destDirty = true;
      }

      if (destDirty) {
        fs.writeFileSync(path.join(DIR, destFile), JSON.stringify(dp.raw));
        touched.add(destFile);
      }
    }

    if (homeDirty) {
      fs.writeFileSync(path.join(DIR, home), JSON.stringify(hp.raw));
      touched.add(home);
    }
  }

  // Summary by destination.
  summary('classify-global: moved ' + plan.size + ' sub-topics / ' + movedQ + ' questions across ' +
    destCount + ' destinations, ' + touched.size + ' files rewritten.', plan.size, movedQ, byDest, touched);
}

function summary(line, subtopics, movedQ, byDest, touched) {
  console.log(line);
  const destCount = Object.keys(byDest).length;
  for (const [d, c] of Object.entries(byDest).sort((a, b) => a[1] === b[1] ? a[0].localeCompare(b[0]) : b[1] - a[1]))
    console.log('  ' + d + ': +' + c + ' sub-topics');

  // Surface the moves in the workflow's step summary so a run page shows what
  // was re-filed without digging through the raw log.
  try {
    if (process.env.GITHUB_STEP_SUMMARY) {
      const lines = ['## Sub-topic moves (classify-global)', '',
        subtopics ? ('**' + subtopics + '** sub-topics / **' + movedQ + '** questions re-filed into **' +
          destCount + '** categories. Ticked (✓) names are moved-in copies.') : 'Everything already correctly placed — 0 moves.', ''];
      if (destCount) {
        lines.push('| Destination | Sub-topics moved |', '|---|---:|');
        for (const [d, c] of Object.entries(byDest).sort((a, b) => b[1] - a[1])) lines.push('| ' + d + ' | +' + c + ' |');
        lines.push('');
      }
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
    }
  } catch (e) { /* summary is best-effort */ }
}
