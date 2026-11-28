'use strict';
// Guards for the cloud ops agent. These are the rules that decide whether the
// agent may touch a file at all; a regression here is a security defect, not a
// style issue.
const assert = require('assert');
const ops = require('./ops-agent');

let passed = 0;
function ok(name, fn) {
  try { fn(); console.log('PASS  ' + name); passed++; }
  catch (e) { console.error('FAIL  ' + name + ': ' + e.message); process.exitCode = 1; }
}

ok('allowlist accepts scripts, workflows, docs and .gitignore', function () {
  assert.strictEqual(ops.pathAllowed('scripts/expand-course.js'), true);
  assert.strictEqual(ops.pathAllowed('.github/workflows/ops-agent.yml'), true);
  assert.strictEqual(ops.pathAllowed('docs/film-runbook.md'), true);
  assert.strictEqual(ops.pathAllowed('.gitignore'), true);
});

ok('allowlist refuses reader-facing content and data', function () {
  assert.strictEqual(ops.pathAllowed('upsc/course/gs/lesson-indian-polity.html'), false);
  assert.strictEqual(ops.pathAllowed('languages/korean.html'), false);
  assert.strictEqual(ops.pathAllowed('data/relations.json'), false);
  assert.strictEqual(ops.pathAllowed('index.html'), false);
  assert.strictEqual(ops.pathAllowed('../outside.js'), false);
});

ok('patch validation rejects a missing or non-unified diff', function () {
  assert.match(ops.validatePatch({}), /no patch/);
  assert.match(ops.validatePatch({ patch: { file: 'upsc/x.html', diff: '--- a/x\n+++ b/x\n' } }), /not allowlisted/);
  assert.match(ops.validatePatch({ patch: { file: 'scripts/x.js', diff: 'not a diff' } }), /not a unified diff/);
});

ok('patch validation accepts a small allowlisted unified diff', function () {
  const diff = '--- a/scripts/x.js\n+++ b/scripts/x.js\n@@ -1 +1 @@\n-a\n+b\n';
  assert.strictEqual(ops.validatePatch({ patch: { file: 'scripts/x.js', diff: diff } }), null);
});

ok('normalizeDiff adds missing a/ b/ headers to a bare hunk', function () {
  const out = ops.normalizeDiff('scripts/x.js', '@@ -1 +1 @@\n-a\n+b');
  assert.match(out, /^--- a\/scripts\/x\.js/);
  assert.match(out, /^\+\+\+ b\/scripts\/x\.js/m);
  assert.match(out, /^@@ -1 \+1 @@/m);
});

ok('normalizeDiff prefixes plain file headers', function () {
  const out = ops.normalizeDiff('scripts/x.js', '--- scripts/x.js\n+++ scripts/x.js\n@@ -1 +1 @@\n-a\n+b');
  assert.match(out, /^--- a\/scripts\/x\.js/m);
  assert.match(out, /^\+\+\+ b\/scripts\/x\.js/m);
});

ok('validatePatch rejects a diff with no hunk header', function () {
  assert.match(ops.validatePatch({ patch: { file: 'scripts/x.js', diff: '--- a/x\n+++ b/x\n' } }), /no hunk header/);
});

ok('stripAnsi removes terminal colour codes', function () {
  assert.strictEqual(ops.stripAnsi('\u001b[31mred\u001b[0m'), 'red');
});

ok('redact removes token shapes before logs leave the runner', function () {
  const dirty = 'Authorization: Bearer ghp_' + 'a'.repeat(36) + '\nAPI_KEY=super-secret-value';
  const clean = ops.redact(dirty);
  assert.ok(clean.indexOf('ghp_') === -1, 'github token not redacted');
  assert.ok(clean.indexOf('super-secret-value') === -1, 'key not redacted');
  assert.ok(clean.indexOf('[REDACTED]') !== -1, 'no marker');
});

ok('diagnosis prompt carries the run URL and the strict-JSON contract', function () {
  const p = ops.diagnosePrompt({
    run: { id: 123, name: 'X', path: '.github/workflows/x.yml', event: 'schedule', run_attempt: 1, head_sha: 'abc', conclusion: 'failure' },
    failedJobs: [], logs: 'boom', workflow: 'on: push', code: ''
  });
  assert.match(p.system, /STRICT JSON/);
  assert.match(p.system, /never push to main/);
  assert.match(p.user, /actions\/runs\/123/);
});

console.log('\n' + passed + ' ops-agent guards passed');