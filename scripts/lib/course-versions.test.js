// Unit checks for the course version tracker. The deploy gate must not depend
// on dates we cannot observe: a first sighting seeds a baseline with no date,
// a real content change stamps today and lists the added headings, and an
// unchanged rebuild keeps both.
const assert = require('assert');
const versions = require('./course-versions');

const state = { meta: {}, lessons: {} };
const first = versions.record(state, 'gs/demo', '<h2>Intro</h2><p>a</p><h3>Body</h3><p>b</p>', false, '2026-01-01');
assert.strictEqual(first.updated, '', 'first sighting must not invent an update date');
assert.deepStrictEqual(first.headings, ['Intro', 'Body']);

const same = versions.record(state, 'gs/demo', '<h2>Intro</h2><p>a</p><h3>Body</h3><p>b</p>', false, '2026-01-02');
assert.strictEqual(same.updated, '', 'unchanged content is not an update');
assert.strictEqual(same.version, first.version, 'same content has the same version');

const changed = versions.record(state, 'gs/demo',
  '<h2>Intro</h2><p>a</p><h2>New case law</h2><p>c</p><h3>Body</h3><p>b</p>', false, '2026-01-03');
assert.strictEqual(changed.updated, '2026-01-03', 'a real change is dated');
assert.deepStrictEqual(changed.added, ['New case law'], 'the new section is named');
assert.notStrictEqual(changed.version, first.version, 'changed content gets a new version');

const hinted = versions.record(state, 'gs/expanded', '<h2>Only</h2><p>x</p>', true, '2026-01-04');
assert.strictEqual(hinted.updated, '2026-01-04', 'the expander writing a lesson is a dated change');

assert.throws(function () { assert.strictEqual(versions.hash('a'), versions.hash('b')); });
console.log('PASS  course versions: baseline, change, headings, expander hint');
