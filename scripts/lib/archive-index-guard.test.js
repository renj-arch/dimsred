// Regression guard for the 2026-11-07 archive outage: a merge published a
// 424-byte, one-category archive-cat-index.json over the 21 MB, 145-category
// file, so the archive page showed 35 questions instead of ~16 million.
// scripts/guard-archive-index.js must always keep the copy that declares more
// questions, no matter which side of a merge it came from.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-guard-'));
const local = path.join(dir, 'local.json');
const remote = path.join(dir, 'remote.json');
const GOOD = [
  { name: 'History', total: 900, file: 'data/questions/history.json' },
  { name: 'Geography', total: 800, file: 'data/questions/geography.json' },
  { name: 'Polity', total: 700, file: 'data/questions/polity.json' }
];
const BAD = [{ name: 'Accounting & Auditing', total: 35, file: 'data/questions/accounting-auditing.json' }];

function run() {
  return execFileSync(process.execPath, ['scripts/guard-archive-index.js', local, remote], { encoding: 'utf8' });
}
function total(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8')).reduce((s, c) => s + (c.total || 0), 0);
}

// A full local index must never be replaced by a broken remote copy.
fs.writeFileSync(local, JSON.stringify(GOOD));
fs.writeFileSync(remote, JSON.stringify(BAD));
run();
assert.strictEqual(total(local), 2400, 'a full local index must survive a broken remote');

// A broken local index is restored from a full remote copy.
fs.writeFileSync(local, JSON.stringify(BAD));
fs.writeFileSync(remote, JSON.stringify(GOOD));
run();
assert.strictEqual(total(local), 2400, 'a broken local index must be restored from remote');
assert.strictEqual(JSON.parse(fs.readFileSync(local, 'utf8')).length, 3);

// Both sides unreadable: fail loudly instead of publishing nothing quietly.
fs.writeFileSync(local, 'not json');
fs.writeFileSync(remote, 'also not json');
let failed = false;
try { run(); } catch (e) { failed = true; }
assert(failed, 'two unusable copies must fail the publish');

console.log('PASS  archive index guard: full copy kept, broken copy restored, invalid pair refused');
