'use strict';
// Union-merge the generated course state before a push. Multiple expand lanes
// write these files concurrently, and `-X ours` the whole file loses another
// lane's lessons. Keys are disjoint per lesson, so a map merge is safe.
//
//   node scripts/merge-course-state.js <remote.json> <ours.json> <out.json>
const fs = require('fs');

const [remotePath, oursPath, outPath] = process.argv.slice(2);
if (!remotePath || !oursPath || !outPath) {
  console.error('usage: node scripts/merge-course-state.js <remote> <ours> <out>');
  process.exit(2);
}

function read(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

const remote = read(remotePath);
const ours = read(oursPath);

function maxIso(a, b) {
  if (!a) return b || '';
  if (!b) return a;
  return String(a) > String(b) ? a : b;
}

let out;
if (remote && remote.lessons || ours && ours.lessons) {
  const rl = (remote && remote.lessons) || {};
  const ol = (ours && ours.lessons) || {};
  out = {
    meta: Object.assign({}, (remote && remote.meta) || {}, (ours && ours.meta) || {}),
    lessons: Object.assign({}, rl, ol)
  };
  out.meta.seeded = (remote && remote.meta && remote.meta.seeded) || (ours && ours.meta && ours.meta.seeded) || '';
  out.meta.updated = maxIso(remote && remote.meta && remote.meta.updated, ours && ours.meta && ours.meta.updated);
} else if (remote && remote.keys || ours && ours.keys) {
  const rk = (remote && remote.keys) || {};
  const ok = (ours && ours.keys) || {};
  const keys = Object.assign({}, rk);
  Object.keys(ok).forEach(function (k) {
    const a = keys[k], b = ok[k];
    if (!a) { keys[k] = b; return; }
    const ap = parseInt(a.passes, 10) || 0;
    const bp = parseInt(b.passes, 10) || 0;
    keys[k] = bp >= ap ? b : a;
  });
  out = { keys: keys };
} else {
  // Plain key -> value maps (scripts/course-data.json, course-practice.json):
  // one entry per lesson, so a union by key keeps both lanes' work.
  const r = remote && typeof remote === 'object' && !Array.isArray(remote) ? remote : {};
  const o = ours && typeof ours === 'object' && !Array.isArray(ours) ? ours : {};
  out = Object.assign({}, r, o);
}

if (!out) {
  console.error('merge-course-state: neither side is valid JSON');
  process.exit(1);
}
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('merge-course-state: wrote ' + outPath);