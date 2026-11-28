'use strict';
// Self-test for the lesson-video planner. Pure functions only: no browser, no
// ffmpeg, no model calls, so it runs in a second on any machine.
const assert = require('assert');
const { parseLesson } = require('../lib/lesson-doc');
const { planLesson, sentences } = require('./plan');

const html = `<!DOCTYPE html><html><body>
<h1>Test Lesson</h1>
<h2>1. First Section</h2>
<figure class="passage-cartoon" data-cartoon="abc123"><div class="pc-frame"><svg viewBox="0 0 560 320"><rect width="560" height="320" fill="#fbf7ec"/><path d="M0 0 L10 10"/><text x="20" y="20">A label</text></svg></div><figcaption>Diagram one</figcaption></figure>
<p>Alpha sentence one. Beta sentence two, with a clause. Gamma sentence three.</p>
<ul><li>First item</li><li>Second item</li><li>Third item</li></ul>
<h3>1.1 Sub Section</h3>
<p>Delta sentence. Epsilon sentence.</p>
<table><tr><th>Head A</th><th>Head B</th></tr><tr><td>a1</td><td>b1</td></tr><tr><td>a2</td><td>b2</td></tr></table>
</body></html>`;

const doc = parseLesson(html, { rel: 'upsc/course/gs/lesson-test.html' });
assert(doc.blocks.length >= 8, 'should parse all blocks');
assert(doc.title === 'Test Lesson', 'title parsed');

// Prose hash must ignore cartoon geometry, so redrawing a diagram does not
// invalidate a fact audit; video hash must include it.
const redrawn = html.replace('M0 0 L10 10', 'M0 0 L40 40');
const doc2 = parseLesson(redrawn, { rel: 'upsc/course/gs/lesson-test.html' });
assert.strictEqual(doc2.proseHash, doc.proseHash, 'prose hash ignores SVG geometry');
assert.notStrictEqual(doc2.videoHash, doc.videoHash, 'video hash sees SVG geometry');

// A prose change must move the prose hash.
const edited = html.replace('Alpha sentence one.', 'Alpha sentence one changed.');
const doc3 = parseLesson(edited, { rel: 'upsc/course/gs/lesson-test.html' });
assert.notStrictEqual(doc3.proseHash, doc.proseHash, 'prose hash sees prose edits');

const plan = planLesson(doc, {});
assert.strictEqual(plan.coverage.pct, 100, 'every block is covered');
assert(plan.coverage.missing.length === 0, 'no missing blocks');
assert(plan.slides.length >= 5, 'produces a deck');
const kinds = new Set(plan.slides.map((s) => s.kind));
assert(kinds.has('title') && kinds.has('section') && kinds.has('content') && kinds.has('cartoon') && kinds.has('table'),
  'covers title/section/content/cartoon/table');
assert(plan.slides.some((s) => s.kind === 'takeaways'), 'has a recap slide');

// Sentence splitter should not break "e.g." or initials.
const s = sentences('Use e.g. this example. Then stop.');
assert.strictEqual(s.length, 2, 'abbreviation-aware sentence split');

console.log('lesson-video tests: all assertions passed');
console.log('  blocks=' + doc.blocks.length + ' slides=' + plan.slides.length +
  ' coverage=' + plan.coverage.pct + '% proseHash=' + doc.proseHash);