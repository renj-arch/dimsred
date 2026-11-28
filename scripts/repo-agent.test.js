'use strict';
const assert = require('assert');
const agent = require('./repo-agent');

let passed = 0;
function ok(name, fn) {
  try { fn(); console.log('PASS  ' + name); passed++; }
  catch (e) { console.error('FAIL  ' + name + ': ' + e.message); process.exitCode = 1; }
}

ok('path allowlist accepts code, docs and reader-facing content', function () {
  assert.strictEqual(agent.pathAllowed('scripts/repo-agent.js'), true);
  assert.strictEqual(agent.pathAllowed('.github/workflows/repo-agent.yml'), true);
  assert.strictEqual(agent.pathAllowed('docs/ops-agent.md'), true);
  assert.strictEqual(agent.pathAllowed('upsc/course/opt-history/lesson-overview.html'), true);
  assert.strictEqual(agent.pathAllowed('data/relations.json'), true);
});

ok('path allowlist refuses data banks, history and secrets', function () {
  assert.strictEqual(agent.pathAllowed('data/questions/upsc.json'), false);
  assert.strictEqual(agent.pathAllowed('data/quiz.json'), false);
  assert.strictEqual(agent.pathAllowed('data/timeline.json'), false);
  assert.strictEqual(agent.pathAllowed('data/wiki-country.json'), false);
  assert.strictEqual(agent.pathAllowed('node_modules/x.js'), false);
  assert.strictEqual(agent.pathAllowed('.git/config'), false);
  assert.strictEqual(agent.pathAllowed('../outside.js'), false);
});

ok('command allowlist accepts the test and inspect commands', function () {
  assert.strictEqual(agent.commandAllowed('node scripts/audit-site.js'), true);
  assert.strictEqual(agent.commandAllowed('node --check scripts/repo-agent.js'), true);
  assert.strictEqual(agent.commandAllowed('git diff --name-only'), true);
  assert.strictEqual(agent.commandAllowed('python -m py_compile scripts/solve-paper-agent.py'), true);
});

ok('command allowlist refuses shell, network and push', function () {
  assert.strictEqual(agent.commandAllowed('rm -rf /'), false);
  assert.strictEqual(agent.commandAllowed('curl https://example.com'), false);
  assert.strictEqual(agent.commandAllowed('git push origin main'), false);
  assert.strictEqual(agent.commandAllowed('node -e "process.exit(0)"'), false);
});

ok('pickAuditTask selects the first fabrication with its file and reason', function () {
  const task = agent.pickAuditTask({
    fabrication: ['upsc/x.html :: false claim'],
    placeholder: ['upsc/y.html :: coming soon'],
    dupSections: []
  });
  assert.match(task, /upsc\/x\.html/);
  assert.match(task, /false claim/);
});

ok('pickAuditTask returns empty when there is nothing to fix', function () {
  assert.strictEqual(agent.pickAuditTask({ fabrication: [], placeholder: [], dupSections: [], thinPages: ['x'] }), '');
});

ok('auditWorse detects a fabrication regression', function () {
  assert.strictEqual(agent.auditWorse({ fabrication: [] }, { fabrication: ['x'] }), 'fabrication grew from 0 to 1');
  assert.strictEqual(agent.auditWorse({ fabrication: ['x'] }, { fabrication: ['x'] }), null);
});

console.log('\n' + passed + ' repo-agent guards passed');