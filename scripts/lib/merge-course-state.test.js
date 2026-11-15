'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const script = path.join(__dirname, '..', 'merge-course-state.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-course-'));

function write(name, obj) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(obj));
  return p;
}
function run(remote, ours) {
  const out = path.join(dir, 'out-' + Math.random().toString(36).slice(2) + '.json');
  cp.execFileSync(process.execPath, [script, remote, ours, out], { stdio: 'pipe' });
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}

const versions = run(
  write('rv.json', { meta: { seeded: '2026-01-01', updated: '2026-01-01' }, lessons: { a: { v: 1 }, b: { v: 2 } } }),
  write('ov.json', { meta: { seeded: '2026-01-02', updated: '2026-02-01' }, lessons: { b: { v: 3 }, c: { v: 4 } } })
);
assert.deepStrictEqual(Object.keys(versions.lessons).sort(), ['a', 'b', 'c']);
assert.strictEqual(versions.lessons.b.v, 3);
assert.strictEqual(versions.meta.updated, '2026-02-01');

const depth = run(
  write('rd.json', { keys: { a: { passes: 2, at: '2026-01-01' }, b: { passes: 5, at: '2026-01-05' } } }),
  write('od.json', { keys: { b: { passes: 3, at: '2026-02-01' }, c: { passes: 1, at: '2026-02-02' } } })
);
assert.deepStrictEqual(Object.keys(depth.keys).sort(), ['a', 'b', 'c']);
assert.strictEqual(depth.keys.b.passes, 5, 'higher pass count wins');
assert.strictEqual(depth.keys.c.passes, 1);

const plain = run(
  write('rc.json', { 'a/key': 'remote', 'b/key': 'remote-b' }),
  write('oc.json', { 'b/key': 'ours-b', 'c/key': 'ours-c' })
);
assert.deepStrictEqual(Object.keys(plain).sort(), ['a/key', 'b/key', 'c/key']);
assert.strictEqual(plain['b/key'], 'ours-b');

fs.rmSync(dir, { recursive: true, force: true });
console.log('PASS  merge-course-state: versions and depth union by key');