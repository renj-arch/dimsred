// Remove hand-written lessons from the deep-rewrite queue.
// One-shot maintenance tool; safe to re-run.
const fs = require('fs');
const path = require('path');
const handwritten = require('../scripts/lib/handwritten');

const ROOT = path.resolve(__dirname, '..');
const QUEUE = path.join(ROOT, 'data', 'deep-rewrite-queue.json');

let q;
try { q = JSON.parse(fs.readFileSync(QUEUE, 'utf8')); } catch (e) {
  console.error('cannot read queue: ' + e.message); process.exit(1);
}
if (!Array.isArray(q)) { console.error('queue is not an array'); process.exit(1); }

const before = q.length;
const kept = q.filter(function (item) { return !handwritten.isProtected(item.file); });
fs.writeFileSync(QUEUE, JSON.stringify(kept, null, 2) + '\n');
console.log('deep-rewrite-queue: ' + (before - kept.length) + ' hand-written removed, ' + kept.length + ' left');