// Aggregate every nightly check into data/faults.json — the list improve.html
// shows under "Detected faults". The philosophy: anything a script can fix
// safely is already fixed automatically (sub-topic re-filing, dedup, cleanup);
// everything that still needs a human decision is written here with a prefilled
// correction action, so the faults find the reader instead of the reader
// hunting through workflow logs.
//
// Sources (each optional — a missing source is itself reported as info):
//   data/wiki-coverage.json  — low/critical category counts (written minutes
//                              earlier by wiki-coverage-report.js in the same
//                              finalize job).
//   data/train-audit.js      — contamination audit results (committed to main
//                              by train-writer.yml whenever a dataset exists).
//
// Output: data/faults.json { generatedAt, counts:{critical,warn,info}, faults:[{severity,
//   kind, title, detail, action:{target,current,issue}}] } — action is what the
//   improve.html "Prefill correction" button drops into the form.
//
// Always exits 0: this is reporting, never a gate.
//
// Usage: node scripts/fault-report.js

const fs = require('fs');

const OUT = 'data/faults.json';
const faults = [];

function add(severity, kind, title, detail, action) {
  faults.push({ severity: severity, kind: kind, title: title, detail: detail || '', action: action || null });
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

  const counts = { critical: 0, warn: 0, info: 0 };
  faults.forEach(function (f) { counts[f.severity] = (counts[f.severity] || 0) + 1; });
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    counts: counts,
    faults: faults
  }, null, 1) + '\n');
  console.log('fault-report: ' + faults.length + ' fault(s) (' +
    counts.critical + ' critical, ' + counts.warn + ' warn, ' + counts.info + ' info) -> ' + OUT);
  faults.forEach(function (f) {
    if (f.severity !== 'info') console.log('  [' + f.severity.toUpperCase() + '] ' + f.title);
  });
} catch (e) {
  console.error('fault-report: FAILED — ' + (e && e.message || e));
}
process.exit(0);
