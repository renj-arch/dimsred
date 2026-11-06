#!/usr/bin/env node
/*
 * Mains coverage: what the pack actually contains, by paper.
 *
 * The Mains hub should not claim completeness it cannot show. This reads the
 * reviewed bank and the fresh AI batch, counts them per paper, and writes
 * data/mains-coverage.json for the hub to display. It also names the gaps so
 * the MainsFresh agent can aim at the emptiest paper instead of picking freely.
 *
 * Usage:
 *   node scripts/mains-coverage.js
 *   node scripts/mains-coverage.js --json
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BANK = path.join(ROOT, 'data', 'mains-questions.json');
const FRESH = path.join(ROOT, 'data', 'mains-fresh.json');
const OUT = path.join(ROOT, 'data', 'mains-coverage.json');

const PAPERS = ['gs1', 'gs2', 'gs3', 'gs4', 'essay'];
const OPTIONAL_SUBJECTS = 25; /* subjects, before the literature languages */

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw new Error(`cannot read ${path.relative(ROOT, file)}: ${err.message}`);
  }
}

function main() {
  const bank = readJson(BANK, { questions: [] });
  const fresh = readJson(FRESH, { items: [] });
  const reviewed = Array.isArray(bank.questions) ? bank.questions : [];
  const generated = Array.isArray(fresh.items) ? fresh.items : [];

  const papers = {};
  for (const id of PAPERS) papers[id] = { reviewed: 0, fresh: 0, marks: id === 'essay' ? 250 : 250 };

  const unknown = [];
  for (const q of reviewed) {
    if (!papers[q.paper]) { unknown.push({ id: q.id, paper: q.paper }); continue; }
    papers[q.paper].reviewed += 1;
  }
  for (const q of generated) {
    if (!papers[q.paper]) continue;
    papers[q.paper].fresh += 1;
  }

  /* The emptiest paper first; the fresh pool covers what the reviewed bank does not. */
  const gaps = PAPERS
    .map((id) => ({ id, reviewed: papers[id].reviewed, fresh: papers[id].fresh }))
    .sort((a, b) => (a.reviewed + a.fresh) - (b.reviewed + b.fresh) || a.reviewed - b.reviewed);

  const report = {
    generatedAt: new Date().toISOString().slice(0, 10),
    about: 'Read-only coverage of the UPSC Mains pack. Reviewed items come from data/mains-questions.json; fresh items are the unreviewed AI batch in data/mains-fresh.json.',
    papers,
    gaps: gaps.map((g) => g.id),
    weakest: gaps[0] ? gaps[0].id : null,
    totals: {
      reviewed: reviewed.length,
      fresh: generated.length
    },
    optional: {
      subjects: OPTIONAL_SUBJECTS,
      papers: 2,
      note: 'Optional questions are generated on demand for the subject the candidate chooses; they are not stored in the reviewed bank until a human promotes one.'
    },
    language: {
      papers: 2,
      marksEach: 300,
      qualifying: '25% in each paper; marks do not count for merit'
    },
    unknownPapers: unknown
  };

  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(`mains-coverage: ${report.totals.reviewed} reviewed, ${report.totals.fresh} fresh`);
    for (const id of PAPERS) {
      console.log(`  ${id}: ${papers[id].reviewed} reviewed, ${papers[id].fresh} fresh`);
    }
    console.log(`  weakest: ${report.weakest}`);
  }
  return report;
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`mains-coverage: ${err.message}`);
    process.exitCode = 1;
  }
}

module.exports = { main, PAPERS };
