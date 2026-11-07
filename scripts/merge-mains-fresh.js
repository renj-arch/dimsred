// Merge two copies of data/mains-fresh.json without losing either side.
//
// The fresh pool is rewritten wholesale by long site-agent runs. When such a
// run publishes after a human (or another lane) edited the same file, the old
// `-X ours` rebase fallback replaced the newer remote paragraph with the
// runner's stale copy: a repaired item silently reverted on 2026-11-07.
// Union by id (remote first), then re-apply the shared quality rubric so an
// item that fails it is dropped loudly instead of failing the deploy gate.
const fs = require('fs');
const path = require('path');
const quality = require('./lib/mains-quality');

const [remoteFile, localFile] = process.argv.slice(2);
if (!remoteFile || !localFile) {
  console.error('usage: merge-mains-fresh.js <remote.json> <local.json>');
  process.exit(2);
}

let remote, local;
try {
  remote = JSON.parse(fs.readFileSync(remoteFile, 'utf-8'));
  local = JSON.parse(fs.readFileSync(localFile, 'utf-8'));
} catch (e) {
  console.error('merge-mains-fresh: unreadable input: ' + e.message);
  process.exit(1);
}

const merged = (remote.items || []).slice();
const seen = new Set(merged.map(function (x) { return x.id; }));
(local.items || []).forEach(function (it) {
  if (!it || !it.id || seen.has(it.id)) return;
  seen.add(it.id);
  merged.push(it);
});

const keep = [];
const dropped = [];
merged.forEach(function (it) {
  const qa = quality.assess(it);
  if (qa.ok) keep.push(it);
  else dropped.push(it.id + ' [' + (qa.score || 0) + '] ' + (qa.failures || []).join('; '));
});

const out = Object.assign({}, remote, {
  items: keep,
  meta: Object.assign({}, remote.meta, local.meta, {
    count: keep.length,
    updated: new Date().toISOString().slice(0, 10)
  })
});
fs.writeFileSync(localFile, JSON.stringify(out, null, 2), 'utf-8');
console.log('merge-mains-fresh: ' + merged.length + ' item(s) -> ' + keep.length +
  ' kept, ' + dropped.length + ' dropped by the quality rubric');
dropped.forEach(function (d) { console.log('  dropped ' + d); });
