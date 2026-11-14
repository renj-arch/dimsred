// Guards for the hand-written lesson protection (scripts/lib/handwritten.js).
//
// The failure this pins: deep-rewrite.yml runs nightly and its queue held the
// exact Mains lessons that were hand-written, so every night it would splice a
// 27B model section into authored prose and commit it to main. gen-course.js
// would likewise regenerate a hand-written page from the thin course-data stub.
// Plain node, exits non-zero on failure so it can gate CI.
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const handwritten = require('./handwritten');

// The manifest exists and names the Mains lessons.
const set = handwritten.protectedSet();
assert.ok(handwritten.protectedCount() >= 25, 'manifest should list the hand-written lessons');
assert.ok(set['upsc/course/mains-gs1/lesson-heritage-culture.html'], 'heritage-culture must be protected');
assert.ok(set['upsc/course/mains-gs4/lesson-ethics-theory.html'], 'ethics-theory must be protected');

// Path normalisation: absolute, backslash and ./-prefixed forms all match.
const rel = 'upsc/course/mains-gs2/lesson-constitution.html';
assert.strictEqual(handwritten.isProtected(rel), true, 'relative forward-slash');
assert.strictEqual(handwritten.isProtected(rel.replace(/\//g, '\\')), true, 'backslash');
assert.strictEqual(handwritten.isProtected('/home/runner/work/repo/upsc/course/mains-gs2/lesson-constitution.html'), true, 'absolute');
assert.strictEqual(handwritten.isProtected('./' + rel), true, 'dot-prefixed');

// A non-listed lesson is not protected.
assert.strictEqual(handwritten.isProtected('upsc/course/opt-konkani/lesson-paper2.html'), false, 'unlisted lesson');

// The deep-rewrite queue must contain no protected lesson.
const QUEUE = path.join(__dirname, '..', '..', 'data', 'deep-rewrite-queue.json');
if (fs.existsSync(QUEUE)) {
  const q = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
  const bad = (Array.isArray(q) ? q : []).filter(function (it) { return handwritten.isProtected(it.file); });
  assert.strictEqual(bad.length, 0, 'queue still holds protected lessons: ' + bad.map(function (b) { return b.file; }).join(', '));
}

console.log('PASS  handwritten guard: manifest loads, paths normalise, queue is clean');