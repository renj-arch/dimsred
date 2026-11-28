// Remove duplicate questions from a bank.
//
// Usage:
//   node scripts/dedupe-bank.js question-bank/ctet.json
//   node scripts/dedupe-bank.js question-bank/jee.json --dry-run
//   node scripts/dedupe-bank.js question-bank/cgl.json --all
//
// By default only model-generated questions (source === "model") are removed.
// Reviewed, imported and untagged questions are kept, and a model question is
// removed when it duplicates any earlier question. With --all every question is
// deduped, keeping the first (lowest id) of each cluster.
const fs = require('fs');
const path = require('path');
const qd = require('./lib/question-dedupe');

function args(argv) {
  const out = { _: [] };
  argv.forEach(function (a) {
    if (a === '--all') out.all = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a.indexOf('--') === 0) out[a.slice(2)] = true;
    else out._.push(a);
  });
  return out;
}

function main() {
  const opts = args(process.argv.slice(2));
  const file = opts._[0];
  if (!file) {
    console.error('usage: node scripts/dedupe-bank.js <bank.json> [--all] [--dry-run]');
    process.exit(2);
  }
  const bankPath = path.resolve(file);
  const bank = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
  const questions = (bank.questions || []).slice().sort(function (a, b) { return (a.id || 0) - (b.id || 0); });
  const kept = [];
  const removed = [];
  for (const q of questions) {
    const isModel = q.source === 'model';
    if (!opts.all && !isModel) {
      kept.push(q);
      continue;
    }
    let reason = '';
    let withQ = null;
    for (const k of kept) {
      reason = qd.duplicateReason(k, q);
      if (reason) { withQ = k; break; }
    }
    if (reason) removed.push({ question: q, duplicateOf: withQ, reason: reason });
    else kept.push(q);
  }
  console.log(path.basename(bankPath) + ': ' + questions.length + ' questions, keep ' + kept.length + ', remove ' + removed.length + (opts.all ? ' (all)' : ' (model only)'));
  for (const r of removed) {
    console.log('  - id ' + r.question.id + ' [' + (r.question.section || '?') + '] ' + r.reason + ' of id ' + (r.duplicateOf && r.duplicateOf.id));
    console.log('    ' + String(r.question.text || '').slice(0, 120));
  }
  if (opts.dryRun) {
    console.log('dry run: no file written');
    return;
  }
  // Scheduled runs call this on every bank. When there is nothing to remove,
  // leave the file byte-for-byte untouched so the job does not create a noisy
  // reformat-only commit every week.
  if (removed.length === 0 && !opts.force) {
    console.log('no duplicates; no file written');
    return;
  }
  const drop = new Set(removed.map(function (r) { return r.question.id; }));
  bank.questions = (bank.questions || []).filter(function (q) { return !drop.has(q.id); });
  bank.dedupe = {
    lastRun: new Date().toISOString(),
    mode: opts.all ? 'all' : 'model',
    removed: removed.length
  };
  fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2) + '\n', 'utf-8');
  console.log('wrote ' + bankPath + ' (' + bank.questions.length + ' questions)');
}

main();
