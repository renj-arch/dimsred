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

// "What the system did recently": the last bot/data commits, so improve.html
// can list its own automatic work (dedup, classification, recoveries, rebuilds)
// without anyone reading workflow logs. Needs git history (fetch-depth >= 50);
// with a depth-1 checkout this yields [] and the panel hides the section.
function collectActions() {
  try {
    const execFileSync = require('child_process').execFileSync;
    const out = execFileSync('git', ['log', '--pretty=format:%h|%ad|%an|%s',
      '--date=short', '-n', '40'], { encoding: 'utf8', timeout: 15000 });
    const bot = /dimsred-bot|github-actions|\[bot\]/i;
    const work = /dedup|classif|recover|coverage|cleanup|rebuild|inject|merge|fault|audit|wiki fill|pib|figures|timeline|question-bank|corpus|improve board|feed update/i;
    return out.split('\n').map(function (l) {
      const p = l.split('|');
      return { sha: p[0], at: p[1], who: p[2], subject: p.slice(3).join('|') };
    }).filter(function (c) {
      return c.subject && (bot.test(c.who || '') || work.test(c.subject));
    }).slice(0, 12);
  } catch (e) {
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

  // ── figures: published coverage + syllabus gaps (the weekly link check and
  // the 6 h harvester own repair; this only reports what still looks wrong) ──
  try {
    const fcov = JSON.parse(fs.readFileSync('data/figure-coverage.json', 'utf8'));
    const t = fcov.totals || {};
    const st = fcov.states || {};
    add('info', 'figures',
      (t.totalFigures || 0).toLocaleString('en-US') + ' figures across ' + (t.publishedTopics || 0) + ' published topics',
      'Corpus coverage ' + (t.coveragePctOfCorpus != null ? Number(t.coveragePctOfCorpus).toFixed(3) : '?') + '% of ' +
      (t.corpusTopics || 0).toLocaleString('en-US') + ' topics · untouched: ' + (t.untouchedCorpusTopics || 0).toLocaleString('en-US') +
      ' · pending refresh: ' + (st['pending-refresh'] || 0));
    if (st['all-rejected']) {
      add('warn', 'figures', st['all-rejected'] + ' topic(s) with ALL candidates rejected',
        'Every harvested figure failed review for these topics — seeds or resolver likely wrong.', null);
    }
    if (st['no-seeds']) {
      add('warn', 'figures', st['no-seeds'] + ' topic(s) have no seeds to harvest from',
        'Add canonical names/aliases as seeds so the harvester can find figures for them.', null);
    }
  } catch (e) {
    add('info', 'figures', 'Figure coverage report not available',
      e.code === 'ENOENT' ? 'data/figure-coverage.json is written by build-figures.yml.' : String(e.message || e));
  }
  var gapWorst = [];
  var gapBySubject = {};
  try {
    const gaps = JSON.parse(fs.readFileSync('data/figure-gaps.json', 'utf8'));
    gapBySubject = gaps.bySubject || {};
    gapWorst = Object.keys(gapBySubject).map(function (s) { return [s, (gapBySubject[s] || []).length]; })
      .filter(function (p) { return p[1] > 0; })
      .sort(function (a, b) { return b[1] - a[1]; });
    const totalGaps = gaps.totalGaps != null ? gaps.totalGaps : gapWorst.reduce(function (a, p) { return a + p[1]; }, 0);
    if (totalGaps > 0) {
      add('warn', 'figures', totalGaps + ' syllabus topic(s) still missing a figure',
        gapWorst.slice(0, 6).map(function (p) { return p[0] + ' (' + p[1] + ')'; }).join(', ') +
        ' · report ' + String(gaps.generated || '').slice(0, 10),
        gapWorst.length ? {
          target: 'figures/',
          current: gapWorst.slice(0, 4).map(function (p) {
            return p[0] + ': ' + (gapBySubject[p[0]] || []).slice(0, 3).join('; ');
          }).join(' | '),
          issue: 'These UPSC syllabus topics have no figure, so figure-based study skips them.',
          fix: 'Harvest or draw a figure for the first topic here, or confirm the topic name matches the corpus.'
        } : null);
    }
  } catch (e) { /* gaps optional */ }

  // ── map lineage (audit-map-lineage.js, run in wiki-fill finalize) ──
  try {
    const lin = JSON.parse(fs.readFileSync('data/map-lineage-audit.json', 'utf8'));
    const miss = lin.missing || [];
    const bad = lin.incorrect || [];
    if (bad.length) {
      add('critical', 'map', bad.length + ' lineage relation(s) on the map CONTRADICT the corpus',
        bad.slice(0, 4).map(function (x) { return x.a + ' —' + x.rel + '→ ' + x.b; }).join(' · '),
        {
          target: 'map.html / timeline lineage',
          current: bad.slice(0, 4).map(function (x) {
            return x.a + ' —' + x.rel + '→ ' + x.b + ' (corpus says: ' + (x.corpusRel || 'conflict') + ')';
          }).join(' | '),
          issue: 'The map shows a family relation the corpus contradicts — wrong lineage on a study page.',
          fix: 'Keep the corpus-backed relation and drop the conflicting edge; verify the sentence evidence first.'
        });
    }
    if (miss.length) {
      add('warn', 'map', miss.length + ' lineage relation(s) in the corpus are missing from the map',
        miss.slice(0, 5).map(function (x) { return x.a + ' —' + x.rel + '→ ' + x.b; }).join(' · ') +
        (lin.totalCorpusEdges ? ' · corpus edges: ' + lin.totalCorpusEdges : ''), null);
    }
    if (!bad.length && !miss.length && (lin.totalCorpusEdges || 0) > 0) {
      const extra = (lin.familyEdges != null ? lin.familyEdges + ' family' : '') +
        (lin.coveragePctOfKinNodes != null ? ' · coverage ' + lin.coveragePctOfKinNodes + '% of kin nodes' : '') +
        (lin.resolutionPct != null ? ' · endpoints resolve ' + lin.resolutionPct + '%' : '');
      add('info', 'map', 'Map lineage wired and mined',
        lin.totalCorpusEdges + ' typed edge(s)' + (extra ? ' · ' + extra : '') +
        ' · ' + String(lin.generated || '').slice(0, 10));
    }
  } catch (e) { /* audit runs with wiki-fill; absent until its first run */ }

  // ── improvement ideas: curated proposals (data/ideas.json) ──
  const ideas = [];
  try {
    const ideaFile = JSON.parse(fs.readFileSync('data/ideas.json', 'utf8'));
    (ideaFile.ideas || []).forEach(function (idea) {
      if (!idea || !idea.title) return;
      ideas.push({
        severity: 'idea',
        kind: 'idea',
        title: idea.title,
        detail: idea.detail || '',
        action: idea.action || null
      });
    });
  } catch (e) { /* ideas optional */ }
  // Auto-ideas from the worst figure gaps: each missing syllabus topic is a
  // concrete, corpus-backed proposal the reader can adopt into the form.
  gapWorst.slice(0, 4).forEach(function (p) {
    (gapBySubject[p[0]] || []).slice(0, 2).forEach(function (topic) {
      ideas.push({
        severity: 'idea', kind: 'idea',
        title: 'Figure idea: ' + topic,
        detail: 'Subject "' + p[0] + '" has no figure for this syllabus topic — harvest or draw one.',
        action: null
      });
    });
  });

  const changes = diffAgainstPrevious(faults);
  const runs = collectRuns();
  const actions = collectActions();

  const counts = { critical: 0, warn: 0, info: 0 };
  faults.forEach(function (f) { counts[f.severity] = (counts[f.severity] || 0) + 1; });
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    counts: counts,
    changes: changes,
    runs: runs,
    actions: actions,
    ideas: ideas,
    faults: faults
  }, null, 1) + '\n');
  console.log('fault-report: ' + faults.length + ' fault(s) (' +
    counts.critical + ' critical, ' + counts.warn + ' warn, ' + counts.info + ' info) · ' +
    changes.new.length + ' new · ' + changes.resolved.length + ' resolved · ' +
    runs.length + ' workflow(s) · ' + actions.length + ' recent action(s) · ' +
    ideas.length + ' idea(s) -> ' + OUT);
  faults.forEach(function (f) {
    if (f.severity !== 'info') console.log('  [' + f.severity.toUpperCase() + '] ' + f.title);
  });
} catch (e) {
  console.error('fault-report: FAILED — ' + (e && e.message || e));
}
process.exit(0);
