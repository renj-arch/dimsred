// Merge copies of data/mains-fresh.json without losing either side and
// without ever writing invalid JSON.
//
// The fresh pool is rewritten wholesale by long site-agent runs. Two failures
// were observed on 2026-11-07:
//   1. a stale run replaced a repaired paragraph (fixed by unioning by id);
//   2. a textual `-X ours` merge produced a file that did not parse, and the
//      next run published a pool containing bare id strings.
// So: parse each side independently, union objects by id (remote first), drop
// anything that fails the shared quality rubric or is not an object, drop
// duplicates of the reviewed bank or of an item kept before it (a run that
// started from a corrupted, partial pool once regenerated "Net Zero funding"
// and the union then published two versions of it), and write JSON with a
// fixed 2-space layout.
const fs = require('fs');
const path = require('path');
const quality = require('./lib/mains-quality');
const plan = require('./lib/mains-plan');

let BANK = [];
try {
  const bank = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mains-questions.json'), 'utf-8'));
  if (bank && Array.isArray(bank.questions)) BANK = bank.questions.filter(Boolean);
} catch (e) {
  // A missing bank is not a reason to refuse the merge; it only weakens the
  // duplicate check to the pool itself.
  console.error('merge-mains-fresh: bank unavailable for duplicate check: ' + e.message);
}

const [remoteFile, oursFile, outFileArg] = process.argv.slice(2);
if (!remoteFile) {
  console.error('usage: merge-mains-fresh.js <remote.json> <ours.json> [out.json]');
  process.exit(2);
}
const outFile = outFileArg || oursFile || remoteFile;

function read(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return data && Array.isArray(data.items) ? data : null;
  } catch (e) {
    console.error('merge-mains-fresh: ignoring unreadable ' + file + ': ' + e.message);
    return null;
  }
}

const remote = read(remoteFile);
const ours = read(oursFile || '');
if (!remote && !ours) {
  console.error('merge-mains-fresh: neither side is usable; leaving the pool untouched');
  process.exit(1);
}

const isItem = function (x) { return x && typeof x === 'object' && x.id && x.question; };
const merged = [];
const seen = new Set();
[remote, ours].forEach(function (side) {
  if (!side) return;
  side.items.forEach(function (it) {
    if (!isItem(it)) {
      console.error('merge-mains-fresh: dropping malformed entry ' + JSON.stringify(it).slice(0, 60));
      return;
    }
    if (seen.has(it.id)) return;
    seen.add(it.id);
    merged.push(it);
  });
});

const keep = [];
const dropped = [];
const known = BANK.slice();
merged.forEach(function (it) {
  const qa = quality.assess(it);
  if (!qa.ok) {
    dropped.push(it.id + ' [rubric ' + (qa.score || 0) + '] ' + (qa.failures || []).join('; '));
    return;
  }
  const dup = plan.isDuplicate(it, known);
  if (dup) {
    dropped.push(it.id + ' [duplicate of ' + (dup.id || 'a covered question') + ']');
    return;
  }
  known.push(it);
  keep.push(it);
});

const base = remote || ours;
const out = {
  meta: Object.assign({}, base.meta, {
    count: keep.length,
    updated: new Date().toISOString().slice(0, 10)
  }),
  items: keep
};
fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n', 'utf-8');
console.log('merge-mains-fresh: ' + merged.length + ' item(s) -> ' + keep.length +
  ' kept, ' + dropped.length + ' dropped');
dropped.forEach(function (d) { console.log('  dropped ' + d); });
