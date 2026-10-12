// Aggregate every nightly check into data/faults.json — the live board on
// improve.html. The philosophy: anything a script can fix safely is already
// fixed automatically (sub-topic re-filing, dedup, cleanup); everything that
// still needs a human decision is written here with a prefilled correction
// action, so the faults find the reader instead of the reader hunting through
// workflow logs.
//
// The report also carries:
//   changes — diffed against the previous data/faults.json, so improve.html
//             can say what appeared and what got resolved since last check
//             (first run reports everything as new).
//   runs    — the latest run of every workflow (via gh, when a token is
//             available), so the page shows pipeline health without anyone
//             opening GitHub.
//
// Sources (each optional — a missing source is itself reported as info):
//   data/wiki-coverage.json  — low/critical category counts (written by
//                              wiki-coverage-report.js, tracked on main).
//   data/train-audit.json    — contamination audit (published to main by
//                              train-writer.yml whenever a dataset exists).
//
// Output: data/faults.json { generatedAt, counts, changes, runs, faults }.
// Always exits 0: this is reporting, never a gate.
//
// Usage: node scripts/fault-report.js
// CI:    GITHUB_TOKEN=<token> node scripts/fault-report.js   (enables runs)

const fs = require('fs');

const OUT = 'data/faults.json';
const faults = [];

function add(severity, kind, title, detail, action) {
  faults.push({ severity: severity, kind: kind, title: title, detail: detail || '', action: action || null });
}

// Latest run per workflow. gh is preinstalled on GitHub runners; without a
// token (locally, or a workflow that did not pass one) this silently yields
// an empty list and the panel hides the section.
function collectRuns() {
  if (!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) return [];
  try {
    const execFileSync = require('child_process').execFileSync;
    const out = execFileSync('gh', ['run', 'list', '--limit', '30',
      '--json', 'workflowName,status,conclusion,url,updatedAt'],
      { encoding: 'utf8', timeout: 30000 });
    const seen = {};
    const runs = [];
    JSON.parse(out).forEach(function (r) {
      if (!r.workflowName || seen[r.workflowName]) return;
      seen[r.workflowName] = 1;
      runs.push({
        workflow: r.workflowName,
        status: r.status,
        conclusion: r.conclusion || '',
        url: r.url || '',
        at: r.updatedAt || ''
      });
    });
    return runs;
  } catch (e) {
    console.error('fault-report: pipeline status unavailable — ' + (e.message || e));
    return [];
  }
}

// Diff the assembled faults against the previous report so improve.html can
// lead with "what changed" instead of repeating the same list forever.
function diffAgainstPrevious(current) {
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }
  if (!prev) {
    return { firstReport: true, new: current.slice(), resolved: [], unchanged: 0 };
  }
  const prevTitles = {};
  (prev.faults || []).forEach(function (f) { prevTitles[f.title] = 1; });
  const curTitles = {};
  current.forEach(function (f) { curTitles[f.title] = 1; });
  const added = current.filter(function (f) { return !prevTitles[f.title]; });
  const resolved = (prev.faults || [])
    .filter(function (f) { return !curTitles[f.title]; })
    .map(function (f) { return { severity: f.severity, kind: f.kind, title: f.title }; });
  return {
    firstReport: false,
    previousGeneratedAt: prev.generatedAt || '',
    new: added,
    resolved: resolved,
    unchanged: current.length - added.length
  };
}

try {
  // ── category coverage ──
  try {
    const cov = JSON.parse(fs.readFileSync('data/wiki-coverage.json', 'utf8'));
    const thr = cov.thresholds || {};
    add('info', 'coverage',
      (cov.totals ? cov.totals.categories : '?') + ' categories · ' +
      (cov.totals ? cov.totals.questions.toLocaleString('en-US') : '?') + ' questions',
      'Low: ' + (cov.totals ? cov.totals.low : '?') + ' · critical: ' + (cov.totals ? cov.totals.critical : '?') +
      ' (thresholds: critical < ' + (thr.critical || '?') + ', low < ' + (thr.low || '?') + ') · checked ' +
      String(cov.generatedAt || '').slice(0, 16) + 'Z');
    (cov.subjects || []).forEach(function (s) {
      if (!s.low) return;
      const top = (s.top || []).slice(0, 4).map(function (t) { return t[0]; }).join(', ');
      const detail = s.subtopics.distinct + ' distinct sub-topics' +
        (s.subtopics.ticked ? ' · ' + s.subtopics.ticked + ' moved in ✓' : '') +
        (top ? ' · largest: ' + top : '');
      if (s.low === 'critical') {
        add('critical', 'coverage', 'Category "' + s.name + '" has only ' + s.questions + ' questions', detail, {
          target: 'data/questions/' + s.file,
          current: s.name + ': ' + s.questions + ' questions / ' + s.subtopics.distinct + ' sub-topics',
          issue: 'This category is below the critical threshold — quizzes and coverage drawn from it are thin.',
          fix: 'Mine more material for this category, or merge/split it if its scope is wrong. Topics: ' + top
        });
      } else {
        add('warn', 'coverage', 'Category "' + s.name + '" is low at ' + s.questions + ' questions', detail, null);
      }
    });
  } catch (e) {
    add('info', 'coverage', 'Coverage report not available yet', e.code === 'ENOENT'
      ? 'data/wiki-coverage.json is written by the nightly wiki-fill coverage step.'
      : String(e.message || e));
  }

  // ── training-data audit ──
  try {
    const a = JSON.parse(fs.readFileSync('data/train-audit.json', 'utf8'));
    (a.failures || []).forEach(function (f) {
      add('critical', 'training', 'Training data audit FAILED', f, {
        target: 'training-data branch — ask-training.jsonl',
        current: 'audit ' + String(a.generatedAt || '').slice(0, 10) + ': ' + a.answers + ' answer records',
        issue: f,
        fix: 'Remove or fix the flagged records on the training-data branch so the next train is clean.'
      });
    });
    (a.warnings || []).forEach(function (w) {
      add('warn', 'training', 'Training data audit warning', w, null);
    });
    if (a.ok && !(a.warnings || []).length) {
      add('info', 'training', 'Training data audit clean',
        a.answers + ' answers · ' + a.improve + ' corrections · audit ' + String(a.generatedAt || '').slice(0, 16) + 'Z');
    }
  } catch (e) {
    add('info', 'training', 'Training audit not run yet',
      'train-writer.yml writes data/train-audit.json once answers start syncing from the Ask page.');
  }

  const changes = diffAgainstPrevious(faults);
  const runs = collectRuns();

  const counts = { critical: 0, warn: 0, info: 0 };
  faults.forEach(function (f) { counts[f.severity] = (counts[f.severity] || 0) + 1; });
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    counts: counts,
    changes: changes,
    runs: runs,
    faults: faults
  }, null, 1) + '\n');
  console.log('fault-report: ' + faults.length + ' fault(s) (' +
    counts.critical + ' critical, ' + counts.warn + ' warn, ' + counts.info + ' info) · ' +
    changes.new.length + ' new · ' + changes.resolved.length + ' resolved · ' +
    runs.length + ' workflow(s) -> ' + OUT);
  faults.forEach(function (f) {
    if (f.severity !== 'info') console.log('  [' + f.severity.toUpperCase() + '] ' + f.title);
  });
} catch (e) {
  console.error('fault-report: FAILED — ' + (e && e.message || e));
}
process.exit(0);
