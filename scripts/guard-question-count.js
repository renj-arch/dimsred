// guard-question-count.js
//
// Prevents question count regression in data/questions/*.json files.
// Reads wiki-coverage.json thresholds and blocks push if any subject drops
// below critical (<100) or low (<1000) thresholds compared to the last
// successful coverage report.
//
// Usage: node scripts/guard-question-count.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');
const COVERAGE_FILE = path.join(__dirname, '..', 'data', 'wiki-coverage.json');
const STATE_FILE = path.join(__dirname, '..', 'data', 'questions', '_state', 'count-guard.json');

function loadCoverage() {
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.log('No wiki-coverage.json found, skipping guard');
    return null;
  }
  return JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
}

function loadPreviousCounts() {
  if (!fs.existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveCounts(counts) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(counts, null, 2) + '\n');
}

function countQuestionsInFile(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (Array.isArray(data)) return data.length;
    if (data && typeof data === 'object' && data.subSubjects) {
      let total = 0;
      for (const qs of Object.values(data.subSubjects)) {
        if (Array.isArray(qs)) total += qs.length;
      }
      return total;
    }
    return 0;
  } catch {
    return 0;
  }
}

function main() {
  const coverage = loadCoverage();
  const prevCounts = loadPreviousCounts();

  if (!fs.existsSync(QUESTIONS_DIR)) {
    console.log('Questions directory not found, skipping guard');
    return 0;
  }

  const files = fs.readdirSync(QUESTIONS_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'));

  const currentCounts = {};
  let totalQuestions = 0;
  let subjectCount = 0;

  for (const file of files) {
    const filePath = path.join(QUESTIONS_DIR, file);
    const count = countQuestionsInFile(filePath);
    currentCounts[file] = count;
    totalQuestions += count;
    subjectCount++;
  }

  console.log(`Question count guard: ${subjectCount} subjects, ${totalQuestions} total questions`);

  // Initialize baseline from previous state if we have it, otherwise from coverage
  const baseline = Object.keys(prevCounts).length > 0 ? prevCounts : (coverage?.subjects?.reduce((acc, s) => {
    acc[s.file] = s.questions;
    return acc;
  }, {}) || {});

  // Check for regressions
  let criticalDrop = false;
  let lowDrop = false;
  const regressions = [];

  for (const [file, count] of Object.entries(currentCounts)) {
    const prev = baseline[file];
    if (prev === undefined) continue; // new subject, no baseline

    const drop = prev - count;
    if (drop > 0) {
      const subj = coverage?.subjects?.find(s => s.file === file);
      const threshold = subj?.low === 'critical' ? 100 : (subj?.low === 'low' ? 1000 : 100);
      const isCritical = subj?.low === 'critical' || count < 100;
      const isLow = subj?.low === 'low' || count < 1000;

      console.log(`  DROP: ${file} ${prev} -> ${count} (-${drop}) [critical: ${isCritical}, low: ${isLow}]`);

      if (isCritical && count < 100) {
        criticalDrop = true;
        regressions.push({ file, prev, count, drop, level: 'CRITICAL' });
      } else if (isLow && count < 1000) {
        lowDrop = true;
        regressions.push({ file, prev, count, drop, level: 'LOW' });
      } else if (drop > prev * 0.1) { // >10% drop for other subjects
        regressions.push({ file, prev, count, drop, level: 'WARNING' });
      }
    }
  }

  if (regressions.length > 0) {
    console.log('\n⚠️  Question count regressions detected:');
    for (const r of regressions) {
      console.log(`  ${r.level}: ${r.file} ${r.prev} -> ${r.count} (-${r.drop})`);
    }
  }

  // Block on critical regressions
  if (criticalDrop) {
    console.error('\n❌ BLOCKED: Critical subject dropped below 100 questions');
    return 1;
  }

  // Warn on low regressions but don't block
  if (lowDrop) {
    console.warn('\n⚠️  WARNING: Low subject dropped below 1000 questions');
  }

  // Update baseline with current counts (only if no critical drop)
  if (!criticalDrop) {
    saveCounts(currentCounts);
    console.log('✅ Guard passed, baseline updated');
  }

  return criticalDrop ? 1 : 0;
}

try {
  process.exit(main());
} catch (e) {
  console.error('Guard error:', e.message);
  process.exit(1);
}