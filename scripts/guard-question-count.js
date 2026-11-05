// guard-question-count.js
//
// Prevents corpus regression in data/questions/*.json.
//
// Two layers:
//   1. TOTAL GUARD (hard block) — the raw per-file question sum must not fall
//      by more than a small tolerance. This is the guard that was missing when
//      the archive silently shrank from 16.15M to 16.05M: the old per-subject
//      checks only fired below 100 questions and the old parser returned 0 for
//      every real corpus file (it looked for a top-level `subSubjects` that
//      does not exist in the {Subject:{subSubjects:{...}}} shape), so the
//      baseline was all zeros and no drop could ever be detected.
//   2. PER-FILE WARNINGS — large drops inside one file are reported. They are
//      not fatal because re-filing moves questions between files.
//
// Usage: node scripts/guard-question-count.js
// Env:   GUARD_MAX_DROP   absolute questions allowed to disappear (default:
//                         max(1000, 0.05% of the previous total))

const fs = require('fs');
const path = require('path');

const QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');
const COVERAGE_FILE = path.join(__dirname, '..', 'data', 'wiki-coverage.json');
const STATE_FILE = path.join(__dirname, '..', 'data', 'questions', '_state', 'count-guard.json');
const STATE_VERSION = 2;

function loadCoverage() {
  if (!fs.existsSync(COVERAGE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    // v1 was a flat {file: count} map produced by the broken parser; those
    // numbers are all 0, so they must never be used as a baseline.
    if (s && s.version === STATE_VERSION && s.files && typeof s.total === 'number') return s;
    return null;
  } catch {
    return null;
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

// Mirrors scripts/build-archive-index.mjs: corpus files are
// { "Subject": { subSubjects: { "Sub-subject": [questions...] } } }.
function countQuestionsInFile(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (Array.isArray(data)) return data.length;
    if (!data || typeof data !== 'object') return 0;
    let total = 0;
    for (const key of Object.keys(data)) {
      const ss = data[key];
      if (Array.isArray(ss)) { total += ss.length; continue; }
      if (!ss || typeof ss !== 'object') continue;
      if (ss.subSubjects && typeof ss.subSubjects === 'object' && !Array.isArray(ss.subSubjects)) {
        for (const qs of Object.values(ss.subSubjects)) {
          if (Array.isArray(qs)) total += qs.length;
        }
      }
    }
    return total;
  } catch {
    return 0;
  }
}

function main() {
  if (!fs.existsSync(QUESTIONS_DIR)) {
    console.log('Questions directory not found, skipping guard');
    return 0;
  }

  const coverage = loadCoverage();
  const prev = loadState();

  const files = fs.readdirSync(QUESTIONS_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .filter(f => !['archive-index.json', 'archive-cat-index.json', 'catalog.json', 'manifest.json', 'wiki-coverage.json'].includes(f));

  const currentCounts = {};
  let totalQuestions = 0;

  for (const file of files) {
    const count = countQuestionsInFile(path.join(QUESTIONS_DIR, file));
    currentCounts[file] = count;
    totalQuestions += count;
  }

  console.log(`Question count guard: ${files.length} files, ${totalQuestions.toLocaleString()} total questions`);

  // Baseline: v2 state first; otherwise the coverage report; otherwise none.
  let prevTotal = prev ? prev.total : 0;
  const prevFiles = prev ? prev.files : {};
  if (!prevTotal && coverage && Array.isArray(coverage.subjects)) {
    prevTotal = coverage.subjects.reduce((acc, s) => acc + (Number(s.questions) || 0), 0);
  }

  const current = { version: STATE_VERSION, generatedAt: new Date().toISOString(), total: totalQuestions, files: currentCounts };

  if (!prevTotal) {
    console.log('No trusted baseline yet — recording one and passing');
    saveState(current);
    return 0;
  }

  const configured = parseInt(process.env.GUARD_MAX_DROP || '', 10);
  const tolerance = Number.isFinite(configured) && configured >= 0
    ? configured
    : Math.max(1000, Math.floor(prevTotal * 0.0005));
  const drop = prevTotal - totalQuestions;

  // New files are additive and must not mask a loss elsewhere, so the total
  // comparison above is the hard gate. Per-file detail is only diagnostic.
  const warnings = [];
  for (const [file, count] of Object.entries(currentCounts)) {
    const before = prevFiles[file];
    if (typeof before !== 'number') continue;
    const d = before - count;
    if (d > 0 && d > Math.max(50, before * 0.1)) {
      warnings.push(`${file}: ${before} -> ${count} (-${d})`);
    }
  }

  if (warnings.length) {
    console.log('\nPer-file drops (moved questions are normal; total guard is authoritative):');
    for (const w of warnings.slice(0, 25)) console.log('  ' + w);
    if (warnings.length > 25) console.log(`  ... and ${warnings.length - 25} more`);
  }

  if (drop > tolerance) {
    console.error(`\nBLOCKED: corpus total dropped ${prevTotal.toLocaleString()} -> ${totalQuestions.toLocaleString()} (-${drop.toLocaleString()}); allowed tolerance is ${tolerance.toLocaleString()}.`);
    console.error('If this loss is intentional, re-run with GUARD_MAX_DROP=<questions> after verifying the deletion.');
    return 1;
  }

  saveState(current);
  if (drop > 0) {
    console.log(`OK: ${drop.toLocaleString()} question(s) removed, within tolerance ${tolerance.toLocaleString()}`);
  } else {
    console.log('OK: corpus total did not shrink');
  }
  return 0;
}

try {
  process.exit(main());
} catch (e) {
  console.error('Guard error:', e.message);
  process.exit(1);
}
