// Per-category coverage report for data/questions — the low-count monitor.
//
// Walks every subject file once (one file in memory at a time, so a 17 GB
// corpus fits any runner heap), then reports:
//   - questions per category, lowest first;
//   - sub-topic tallies: distinct / bare / moved-in (✓ ticked);
//   - the ✓ ticked sub-topics themselves — what was re-filed INTO this
//     category by classify-global, so it is obvious which category a
//     moved sub-topic ended up in;
//   - top sub-topics by size — what the category is actually about;
//   - LOW / CRITICAL flags below thresholds (env: COVERAGE_LOW_MIN,
//     COVERAGE_CRITICAL_MIN; defaults 1000 / 100).
//
// Outputs:
//   1. console table (low counts first);
//   2. $GITHUB_STEP_SUMMARY markdown when running in Actions;
//   3. data/wiki-coverage.json — committed by the wiki-fill finalize step
//      (git add -A), so the report is browsable on GitHub after every run.
//
// Always exits 0: a reporting failure must never block the data commit.
//
// Usage: node scripts/wiki-coverage-report.js
//        COVERAGE_DIR=path/to/questions  for fixture tests

const fs = require('fs');
const path = require('path');

const DIR = process.env.COVERAGE_DIR || path.join(__dirname, '..', 'data', 'questions');
const OUT = process.env.COVERAGE_OUT || path.join(__dirname, '..', 'data', 'wiki-coverage.json');
const LOW_MIN = parseInt(process.env.COVERAGE_LOW_MIN || '1000', 10);
const CRIT_MIN = parseInt(process.env.COVERAGE_CRITICAL_MIN || '100', 10);
const TOP_N = 20;
const TICK = '\u2713 '; // must match classify_lib.TICK

try {
  main();
} catch (err) {
  console.error('wiki-coverage-report: FAILED — ' + (err && err.message || err));
  process.exit(0); // never block the commit
}

function main() {
  const files = fs.readdirSync(DIR).filter(f =>
    f.endsWith('.json') && f !== 'catalog.json' && f !== 'manifest.json' &&
    f !== 'archive-cat-index.json' && f !== 'wiki-coverage.json');

  const subjects = [];
  let totalQuestions = 0;

  for (const file of files) {
    let raw;
    try {
      const text = fs.readFileSync(path.join(DIR, file), 'utf8').replace(/^\uFEFF/, '');
      raw = JSON.parse(text);
    } catch (err) {
      console.log('wiki-coverage-report: skipping unreadable ' + file + ' (' + (err && err.message || err) + ')');
      continue;
    }
    for (const key of Object.keys(raw)) {
      const ss = (raw[key] && raw[key].subSubjects) || {};
      let questions = 0, bare = 0, ticked = 0;
      const names = [];
      const movedIn = [];
      for (const [name, arr] of Object.entries(ss)) {
        const n = Array.isArray(arr) ? arr.length : 0;
        questions += n;
        if (name.startsWith(TICK)) {
          ticked++;
          movedIn.push([name.slice(TICK.length), n]);
        } else {
          bare++;
        }
        names.push([name, n]);
      }
      names.sort((a, b) => b[1] - a[1]);
      movedIn.sort((a, b) => b[1] - a[1]);
      totalQuestions += questions;
      const flag = questions < CRIT_MIN ? 'critical' : questions < LOW_MIN ? 'low' : null;
      subjects.push({
        name: key,
        file,
        questions,
        subtopics: { distinct: names.length, bare, ticked },
        low: flag,
        top: names.slice(0, TOP_N),
        movedIn: movedIn.slice(0, 100)
      });
    }
  }

  subjects.sort((a, b) => a.questions - b.questions || a.name.localeCompare(b.name));
  const critical = subjects.filter(s => s.low === 'critical');
  const low = subjects.filter(s => s.low === 'low');

  // ── console ──
  console.log('wiki-coverage: ' + subjects.length + ' categories, ' + totalQuestions +
    ' questions (sum across files; cross-file duplicates not removed here).');
  console.log('flags: ' + critical.length + ' critical (<' + CRIT_MIN + '), ' +
    low.length + ' low (<' + LOW_MIN + ')');
  for (const s of subjects.filter(x => x.low)) {
    console.log('  [' + s.low.toUpperCase() + '] ' + s.name + ': ' + s.questions +
      ' questions / ' + s.subtopics.distinct + ' sub-topics (' +
      s.subtopics.ticked + ' moved-in)');
  }

  // ── committed report ──
  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      categories: subjects.length,
      questions: totalQuestions,
      low: low.length,
      critical: critical.length
    },
    thresholds: { low: LOW_MIN, critical: CRIT_MIN },
    subjects
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
  console.log('wiki-coverage-report: wrote ' + path.relative(process.cwd(), OUT));

  // ── Actions step summary ──
  if (process.env.GITHUB_STEP_SUMMARY) {
    const L = ['## Category coverage', '',
      subjects.length + ' categories · ' + totalQuestions.toLocaleString('en-US') + ' questions · ' +
      '**' + critical.length + ' critical** · **' + low.length + ' low** ' +
      '(thresholds: critical < ' + CRIT_MIN + ', low < ' + LOW_MIN + ')', ''];
    if (critical.length || low.length) {
      L.push('| Flag | Category | Questions | Sub-topics | Moved-in |', '|---|---|---:|---:|---:|');
      for (const s of subjects.filter(x => x.low)) {
        L.push('| ' + (s.low === 'critical' ? '**CRITICAL**' : 'low') + ' | ' + s.name + ' | ' +
          s.questions.toLocaleString('en-US') + ' | ' + s.subtopics.distinct + ' | ' +
          s.subtopics.ticked + ' |');
      }
      L.push('');
    } else {
      L.push('Every category is above threshold.', '');
    }
    L.push('<details><summary>All categories (lowest first)</summary>', '',
      '| Category | Questions | Sub-topics | Moved-in |', '|---|---:|---:|---:|');
    for (const s of subjects) {
      L.push('| ' + s.name + ' | ' + s.questions.toLocaleString('en-US') + ' | ' +
        s.subtopics.distinct + ' | ' + s.subtopics.ticked + ' |');
    }
    L.push('', '</details>', '');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, L.join('\n') + '\n');
  }

  // GitHub annotations so low counts light up on the run page.
  if (process.env.GITHUB_ACTIONS) {
    for (const s of critical) {
      console.log('::warning title=Category coverage critical::' + s.name + ' has only ' +
        s.questions + ' questions (<' + CRIT_MIN + ')');
    }
  }
}
