// Never let the archive index shrink.
//
// 2026-11-07: a ci-push merge resolved data/questions/archive-cat-index.json
// with "-X ours" and published a 424-byte, one-category file over a 21 MB,
// 145-category index. The archive page then showed only 35 questions.
//
// The archive only grows; a rebuild may rename categories but its declared
// question total must not fall. This compares the local index with the remote
// one and keeps whichever declares more questions (and, on a tie, more
// categories). Invalid JSON never wins.
//
//   node scripts/guard-archive-index.js <local.json> <remote.json>
//
// Exit 0 when a usable index remains (local or remote). Exit 1 only when both
// sides are unusable.
const fs = require('fs');

const localFile = process.argv[2];
const remoteFile = process.argv[3];

function read(p) {
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    if (!Array.isArray(data) || !data.length) return null;
    let total = 0;
    for (const c of data) {
      if (!c || typeof c !== 'object') return null;
      total += Number(c.total) || 0;
    }
    if (!data.some(c => c && c.file)) return null;
    return { data: data, count: data.length, total: total, bytes: fs.statSync(p).size };
  } catch (e) {
    return null;
  }
}

const local = localFile ? read(localFile) : null;
const remote = remoteFile ? read(remoteFile) : null;

function show(label, m) {
  return label + ': ' + (m ? m.count + ' categories, ' + m.total.toLocaleString() + ' questions, ' + m.bytes + ' bytes' : 'unusable');
}
console.log('[archive-index] ' + show('local', local));
console.log('[archive-index] ' + show('remote', remote));

if (!local && !remote) {
  console.error('[archive-index] REFUSING: both copies are unusable');
  process.exit(1);
}
if (!local) {
  fs.copyFileSync(remoteFile, localFile);
  console.log('[archive-index] restored the remote index (local was unusable)');
  process.exit(0);
}
if (!remote) {
  console.log('[archive-index] kept the local index (remote was unusable)');
  process.exit(0);
}

// A category consolidation may reduce the count, but not the question total.
if (local.total < remote.total) {
  fs.copyFileSync(remoteFile, localFile);
  console.log('[archive-index] RESTORED the remote index: local shrank from ' +
    remote.total.toLocaleString() + ' to ' + local.total.toLocaleString() + ' questions');
  process.exit(0);
}
if (local.total === remote.total && local.count < remote.count) {
  fs.copyFileSync(remoteFile, localFile);
  console.log('[archive-index] restored the remote index: same total but fewer categories (' +
    local.count + ' < ' + remote.count + ')');
  process.exit(0);
}
console.log('[archive-index] kept the local index (not smaller than remote)');
