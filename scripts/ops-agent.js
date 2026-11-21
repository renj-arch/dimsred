'use strict';
// GitHub-native operations agent.
//
// Runs on a schedule (and on /ops issue comments) with no laptop involved:
//   1. finds recent failed Actions runs,
//   2. reads the failed logs + the workflow/script that failed,
//   3. asks a hosted free-tier model for a diagnosis,
//   4. reruns a transient failure once, or
//   5. opens a PR with a patch for an allowlisted code path, or
//   6. opens an issue with the diagnosis and a proposed diff.
//
// Safety rails:
//   - never pushes to main; patches go to ops/fix-* branches and a PR.
//   - only scripts/, .github/workflows/, docs/ and .gitignore may be patched.
//   - content (upsc/, languages/, data/, *.html) is never auto-edited.
//   - one rerun per run attempt; no auto-merge.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const router = require('./lib/ollama');

const ROOT = path.resolve(__dirname, '..');
const REPO = process.env.GITHUB_REPOSITORY || 'renj-arch/dimsred';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const MODE = (process.env.OPS_MODE || 'poll').toLowerCase();
const RUN_ID = String(process.env.OPS_RUN_ID || '').trim();
const INSTRUCTION = String(process.env.OPS_INSTRUCTION || '').trim();
const ISSUE = String(process.env.OPS_ISSUE || '').trim();
const AUTHOR_ASSOC = String(process.env.OPS_AUTHOR_ASSOCIATION || '').toUpperCase();
const LABEL = 'ops-agent';
const MAX_DIAGNOSES = 2;

function log(msg) { console.log('[ops] ' + msg); }
function die(msg) { console.error('[ops] FATAL: ' + msg); process.exit(1); }

function sh(cmd, opts) {
  return execSync(cmd, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    cwd: ROOT,
    env: Object.assign({}, process.env, { GH_TOKEN: TOKEN, GITHUB_TOKEN: TOKEN }),
    ...(opts || {})
  }).trim();
}

async function api(method, endpoint, body) {
  const res = await fetch('https://api.github.com' + endpoint, {
    method: method,
    headers: {
      Authorization: 'Bearer ' + TOKEN,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'vlymbooq-ops-agent',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw new Error(method + ' ' + endpoint + ' -> ' + res.status + ' ' + text.slice(0, 300));
  return text ? JSON.parse(text) : null;
}

function stripAnsi(s) {
  return String(s || '').replace(/\u001b\[[0-9;]*m/g, '');
}

// Logs are sent to a third-party model. GitHub masks secrets in logs, but a
// token can still appear in a URL, a curl header or an uncaught error string.
// Redact the common shapes before the text leaves the runner.
function redact(s) {
  return String(s || '')
    .replace(/\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|nvapi-[A-Za-z0-9_-]{20,}|gsk_[A-Za-z0-9]{20,}|sk-or-[A-Za-z0-9-]{20,}|sk-[A-Za-z0-9]{32,})\b/g, '[REDACTED]')
    .replace(/(Authorization:\s*Bearer\s+)[^\s]+/gi, '$1[REDACTED]')
    .replace(/((?:TOKEN|KEY|SECRET|PASSWORD|API_KEY)\s*[=:]\s*)[^\s'"]+/gi, '$1[REDACTED]');
}

function runUrl(id) {
  return 'https://github.com/' + REPO + '/actions/runs/' + id;
}

function excerpt(logText, maxLines) {
  const lines = redact(stripAnsi(logText)).split('\n');
  return lines.slice(-(maxLines || 220)).join('\n').slice(-30000);
}

const ALLOWED = [
  /^scripts\//,
  /^\.github\/workflows\//,
  /^docs\//,
  /^\.gitignore$/
];
function pathAllowed(file) {
  return ALLOWED.some(function (re) { return re.test(file); });
}

function ensureLabel() {
  return api('POST', '/repos/' + REPO + '/labels', {
    name: LABEL,
    color: 'd73a4a',
    description: 'Opened by the cloud ops agent'
  }).catch(function (e) {
    if (String(e.message).indexOf('422') === -1) throw e;
  });
}

async function findIssueForRun(id) {
  const marker = '<!-- ops-run:' + id + ' -->';
  const issues = await api('GET', '/repos/' + REPO + '/issues?labels=' + LABEL + '&state=all&per_page=100');
  return issues.find(function (i) {
    return (i.body || '').indexOf(marker) !== -1 || (i.title || '').indexOf('run ' + id) !== -1;
  }) || null;
}

async function collect(id) {
  const run = await api('GET', '/repos/' + REPO + '/actions/runs/' + id);
  const jobsData = await api('GET', '/repos/' + REPO + '/actions/runs/' + id + '/jobs?per_page=100');
  const failedJobs = (jobsData.jobs || []).filter(function (j) {
    return j.conclusion === 'failure' || j.conclusion === 'timed_out';
  });
  let logs = '';
  try {
    logs = sh('gh run view ' + id + ' --repo ' + REPO + ' --log-failed');
  } catch (e) {
    try { logs = sh('gh run view ' + id + ' --repo ' + REPO + ' --log'); } catch (e2) { logs = ''; }
  }
  let wfText = '';
  try { wfText = fs.readFileSync(path.join(ROOT, run.path), 'utf8'); } catch (e) { /* not in sparse tree */ }
  const scriptHits = Array.from(new Set((stripAnsi(logs).match(/node\s+(scripts\/[\w./-]+\.js)/g) || [])
    .map(function (s) { return s.replace(/^node\s+/, ''); })));
  let code = '';
  for (const rel of scriptHits.slice(0, 2)) {
    try {
      code += '\n--- ' + rel + ' ---\n' + fs.readFileSync(path.join(ROOT, rel), 'utf8').slice(0, 14000);
    } catch (e) { /* ignore */ }
  }
  return { run: run, failedJobs: failedJobs, logs: excerpt(logs, 220), workflow: wfText, code: code };
}

function diagnosePrompt(ctx) {
  const failed = ctx.failedJobs.map(function (j) {
    const steps = (j.steps || []).filter(function (s) { return s.conclusion === 'failure' || s.conclusion === 'timed_out'; })
      .map(function (s) { return s.number + '. ' + s.name; }).join(', ');
    return '- ' + j.name + ' (' + j.conclusion + ')' + (steps ? ' failed steps: ' + steps : '');
  }).join('\n') || '- (no failed job detail)';

  const system = [
    'You are the cloud operations agent for the GitHub repository ' + REPO + '.',
    'Diagnose one failed GitHub Actions run from its logs and code. Be concrete and conservative.',
    'Repository rules: no paid API keys; hosted free-tier models only; no invented facts;',
    'never push to main; every code change goes through a pull request; never auto-edit',
    'reader-facing content (upsc/, languages/, data/, *.html).',
    'Return STRICT JSON only, no markdown fences, with this shape:',
    '{',
    '  "diagnosis": "2-4 sentences naming the failing step and the mechanism",',
    '  "root_cause": "one sentence",',
    '  "confidence": "high" | "medium" | "low",',
    '  "transient": true | false,',
    '  "action": "rerun" | "patch" | "issue",',
    '  "patch": { "file": "repo/path", "diff": "unified diff" } | null,',
    '  "issue_body": "markdown for a human, including the exact next action"',
    '}',
    'Use "rerun" only for clearly transient failures (network, runner, rate limit, stale ref).',
    'Use "patch" only when the fix is small, code-only, and in scripts/, .github/workflows/,',
    'docs/ or .gitignore. The diff must apply with `git apply` against the current main.',
    'Otherwise use "issue". Never guess a fact or a secret.'
  ].join('\n');

  const user = [
    'Run: ' + runUrl(ctx.run.id),
    'Workflow: ' + ctx.run.name + ' (' + ctx.run.path + ')',
    'Event: ' + ctx.run.event + ' | attempt: ' + ctx.run.run_attempt + ' | head: ' + String(ctx.run.head_sha).slice(0, 12),
    'Conclusion: ' + ctx.run.conclusion,
    'Failed jobs:',
    failed,
    '',
    'Failed log tail (ANSI stripped):',
    '```',
    ctx.logs || '(no log available)',
    '```',
    '',
    'Workflow file (truncated):',
    '```yaml',
    (ctx.workflow || '(not available in sparse checkout)').slice(0, 18000),
    '```',
    '',
    'Related script(s) named in the log (truncated):',
    '```js',
    ctx.code || '(none identified)',
    '```'
  ].join('\n');

  return { system: system, user: user };
}

async function diagnose(ctx) {
  const p = diagnosePrompt(ctx);
  const res = await router.callLLM([
    { role: 'system', content: p.system },
    { role: 'user', content: p.user }
  ], { numPredict: 6000, temperature: 0.2 });
  const raw = String(res && res.text || '').trim();
  let plan;
  try {
    plan = router.parseJsonLoose(raw);
  } catch (e) {
    plan = null;
  }
  if (!plan || typeof plan !== 'object') {
    plan = {
      diagnosis: 'The model did not return a usable JSON plan. Raw reply: ' + raw.slice(0, 800),
      root_cause: 'Model output was not parseable.',
      confidence: 'low',
      transient: false,
      action: 'issue',
      patch: null,
      issue_body: ''
    };
  }
  plan.confidence = String(plan.confidence || 'low').toLowerCase();
  plan.action = String(plan.action || (plan.transient ? 'rerun' : 'issue')).toLowerCase();
  if (['rerun', 'patch', 'issue'].indexOf(plan.action) === -1) plan.action = 'issue';
  return plan;
}

function issueBody(ctx, plan, extra) {
  const failed = ctx.failedJobs.map(function (j) { return '- **' + j.name + '** (' + j.conclusion + ')'; }).join('\n') || '- (no failed job detail)';
  return [
    '<!-- ops-run:' + ctx.run.id + ' -->',
    '## Run',
    '- Workflow: `' + ctx.run.name + '` (`' + ctx.run.path + '`)',
    '- Event: `' + ctx.run.event + '` | attempt ' + ctx.run.run_attempt,
    '- Commit: `' + String(ctx.run.head_sha).slice(0, 12) + '`',
    '- Link: ' + runUrl(ctx.run.id),
    '',
    '## Failed jobs',
    failed,
    '',
    '## Diagnosis',
    plan.diagnosis || '(none)',
    '',
    '## Root cause',
    plan.root_cause || '(not stated)',
    '',
    '## Confidence',
    plan.confidence || 'low',
    '',
    '## Next action',
    extra || ('Model suggested: `' + plan.action + '`.'),
    '',
    plan.issue_body || '',
    '',
    '## Log tail',
    '```',
    ctx.logs ? ctx.logs.split('\n').slice(-40).join('\n') : '(no log)',
    '```',
    '',
    '_Generated by `scripts/ops-agent.js`. A human still decides whether to merge a fix._'
  ].join('\n');
}

async function openIssue(ctx, plan, extra) {
  const existing = await findIssueForRun(ctx.run.id);
  if (existing) {
    log('issue already exists: #' + existing.number);
    return existing;
  }
  await ensureLabel();
  const issue = await api('POST', '/repos/' + REPO + '/issues', {
    title: '[ops] ' + ctx.run.name + ' run ' + ctx.run.id + ' failed',
    body: issueBody(ctx, plan, extra),
    labels: [LABEL]
  });
  log('opened issue #' + issue.number);
  return issue;
}

async function comment(body) {
  if (!ISSUE) return;
  await api('POST', '/repos/' + REPO + '/issues/' + ISSUE + '/comments', { body: body });
  log('commented on #' + ISSUE);
}

async function rerun(ctx) {
  if (ctx.run.run_attempt >= 2) return false;
  await api('POST', '/repos/' + REPO + '/actions/runs/' + ctx.run.id + '/rerun-failed-jobs');
  log('rerun dispatched for ' + ctx.run.id);
  return true;
}

function normalizeDiff(file, diff) {
  let d = String(diff || '').trim()
    .replace(/^```(?:diff)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  if (d.indexOf('@@') === -1) return d;
  if (!/^---\s/m.test(d)) {
    d = '--- a/' + file + '\n+++ b/' + file + '\n' + d;
  } else {
    d = d
      .replace(/^---\s+(?!a\/|\/dev\/null)(.+)$/m, '--- a/$1')
      .replace(/^\+\+\+\s+(?!b\/|\/dev\/null)(.+)$/m, '+++ b/$1');
  }
  return d.replace(/\s+$/, '') + '\n';
}

function validatePatch(plan) {
  if (!plan.patch || !plan.patch.file || !plan.patch.diff) return 'no patch';
  if (!pathAllowed(plan.patch.file)) return 'path not allowlisted: ' + plan.patch.file;
  const diff = normalizeDiff(plan.patch.file, plan.patch.diff);
  if (diff.length > 60000) return 'patch too large';
  if (!/^---\s/m.test(diff) || !/^\+\+\+\s/m.test(diff)) return 'not a unified diff';
  if (!/^@@\s/m.test(diff)) return 'diff has no hunk header';
  return null;
}

async function applyPatchAndOpenPR(ctx, plan) {
  const err = validatePatch(plan);
  if (err) return { ok: false, reason: err };
  const file = plan.patch.file;
  const diff = normalizeDiff(file, plan.patch.diff);
  const tmp = path.join(ROOT, '.ops-patch.diff');
  fs.writeFileSync(tmp, diff);
  try {
    sh('git apply --check ' + JSON.stringify(tmp));
  } catch (e) {
    fs.unlinkSync(tmp);
    return { ok: false, reason: 'git apply --check failed: ' + String(e.message).slice(0, 300) };
  }
  const branch = 'ops/fix-' + ctx.run.id + '-' + Date.now();
  try {
    sh('git config user.name "dimsred-bot"');
    sh('git config user.email "bot@vlymbooq.qzz.io"');
    sh('git checkout -B ' + branch + ' main');
    sh('git apply ' + JSON.stringify(tmp));
    if (/\.js$/.test(file)) sh('node --check ' + JSON.stringify(file));
    if (/\.ya?ml$/.test(file)) sh('python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" ' + JSON.stringify(file));
    sh('git add ' + JSON.stringify(file));
    sh('git commit -m ' + JSON.stringify('ops: fix ' + ctx.run.name + ' run ' + ctx.run.id));
    sh('git push -u origin ' + branch);
    const pr = await api('POST', '/repos/' + REPO + '/pulls', {
      title: '[ops] fix ' + ctx.run.name + ' run ' + ctx.run.id,
      head: branch,
      base: 'main',
      body: [
        'Automated fix for ' + runUrl(ctx.run.id) + '.',
        '',
        '## Diagnosis',
        plan.diagnosis || '',
        '',
        '## Root cause',
        plan.root_cause || '',
        '',
        '```diff',
        diff.slice(0, 12000),
        '```',
        '',
        '_Generated by `scripts/ops-agent.js`. Review before merging; this PR was not auto-merged._'
      ].join('\n')
    });
    log('opened PR #' + pr.number + ' ' + pr.html_url);
    return { ok: true, pr: pr };
  } catch (e) {
    try { sh('git checkout -- .'); } catch (e2) { /* ignore */ }
    return { ok: false, reason: String(e.message).slice(0, 500) };
  } finally {
    try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ }
  }
}

async function processRun(id) {
  const existing = await findIssueForRun(id);
  if (existing) { log('run ' + id + ' already reported in #' + existing.number); return; }
  const ctx = await collect(id);
  log('diagnosing ' + ctx.run.name + ' run ' + id + ' (' + ctx.run.conclusion + ')');
  let plan;
  try {
    plan = await diagnose(ctx);
  } catch (e) {
    plan = {
      diagnosis: 'Diagnosis failed: ' + String(e.message).slice(0, 400),
      root_cause: 'Model call failed.',
      confidence: 'low',
      transient: false,
      action: 'issue',
      patch: null,
      issue_body: ''
    };
  }
  log('plan: ' + plan.action + ' (' + plan.confidence + ') - ' + (plan.root_cause || plan.diagnosis || '').slice(0, 160));

  if (plan.action === 'rerun') {
    try {
      const ok = await rerun(ctx);
      await openIssue(ctx, plan, ok
        ? 'Rerun of the failed jobs was dispatched automatically (attempt 1 -> 2). If it fails again, the agent will stop rerunning and leave the diagnosis here.'
        : 'The run already had more than one attempt; automatic rerun was skipped.');
    } catch (e) {
      await openIssue(ctx, plan, 'Rerun attempt failed: ' + String(e.message).slice(0, 300));
    }
    return;
  }

  if (plan.action === 'patch') {
    const result = await applyPatchAndOpenPR(ctx, plan);
    const diffBlock = plan.patch && plan.patch.diff
      ? '\n\n```diff\n' + normalizeDiff(plan.patch.file, plan.patch.diff).slice(0, 12000) + '\n```'
      : '';
    await openIssue(ctx, plan, result.ok
      ? 'A pull request with the proposed patch is open: ' + result.pr.html_url + '. It is **not** merged.'
      : 'The model proposed a patch, but it could not be applied safely: ' + result.reason + '. The diff is below for a human to review.' + diffBlock);
    return;
  }

  await openIssue(ctx, plan);
}

async function poll() {
  const data = await api('GET', '/repos/' + REPO + '/actions/runs?per_page=100');
  const cutoff = Date.now() - 45 * 60 * 1000;
  const failed = (data.workflow_runs || []).filter(function (r) {
    if (r.conclusion !== 'failure') return false;
    if (r.path === '.github/workflows/ops-agent.yml') return false;
    return new Date(r.created_at).getTime() >= cutoff;
  });
  log('recent failed runs: ' + failed.length);
  let done = 0;
  for (const r of failed) {
    if (done >= MAX_DIAGNOSES) break;
    const existing = await findIssueForRun(r.id);
    if (existing) continue;
    await processRun(r.id);
    done++;
  }
  log('processed ' + done + ' run(s)');
}

async function command() {
  if (['OWNER', 'MEMBER', 'COLLABORATOR'].indexOf(AUTHOR_ASSOC) === -1) {
    await comment('Only a repository owner, member or collaborator can use `/ops`.');
    return;
  }
  const text = INSTRUCTION.replace(/^\/ops\s*/i, '').trim();
  const parts = text.split(/\s+/);
  const verb = (parts[0] || 'status').toLowerCase();
  const id = parts[1] || RUN_ID;

  if (verb === 'status') {
    const data = await api('GET', '/repos/' + REPO + '/actions/runs?per_page=30');
    const failed = (data.workflow_runs || []).filter(function (r) { return r.conclusion === 'failure'; }).slice(0, 6);
    await comment([
      '### Recent failed runs',
      failed.length ? failed.map(function (r) {
        return '- `' + r.name + '` — ' + runUrl(r.id) + ' (' + r.created_at + ')';
      }).join('\n') : 'No recent failures.',
      '',
      'Commands: `/ops diagnose <run-id>`, `/ops rerun <run-id>`, `/ops fix <run-id>`.'
    ].join('\n'));
    return;
  }

  if (!id) { await comment('Usage: `/ops diagnose <run-id>`, `/ops rerun <run-id>`, `/ops fix <run-id>`, `/ops status`.'); return; }

  if (verb === 'rerun') {
    const ctx = await collect(id);
    const ok = await rerun(ctx);
    await comment(ok ? 'Rerun dispatched: ' + runUrl(id) : 'Run already has more than one attempt; not rerunning.');
    return;
  }

  if (verb === 'diagnose' || verb === 'fix') {
    const ctx = await collect(id);
    const plan = await diagnose(ctx);
    if (verb === 'fix' && plan.action === 'patch') {
      const result = await applyPatchAndOpenPR(ctx, plan);
      await comment([
        '### Diagnosis',
        plan.diagnosis || '',
        '',
        '### Root cause',
        plan.root_cause || '',
        '',
        result.ok ? 'Opened PR: ' + result.pr.html_url : 'Patch could not be applied: ' + result.reason
      ].join('\n'));
      return;
    }
    await comment([
      '### Diagnosis',
      plan.diagnosis || '',
      '',
      '### Root cause',
      plan.root_cause || '',
      '',
      '### Suggested action',
      '`' + plan.action + '` (confidence: ' + plan.confidence + ')',
      '',
      plan.issue_body || ''
    ].join('\n'));
    return;
  }

  await comment('Unknown command. Use `/ops status`, `/ops diagnose <run-id>`, `/ops rerun <run-id>` or `/ops fix <run-id>`.');
}

if (require.main === module) {
  (async function main() {
    if (!TOKEN) die('GH_TOKEN/GITHUB_TOKEN is required');
    log('mode=' + MODE + ' repo=' + REPO);
    if (MODE === 'command') return command();
    if (MODE === 'diagnose') {
      if (!RUN_ID) die('OPS_RUN_ID is required for diagnose mode');
      return processRun(RUN_ID);
    }
    return poll();
  })().catch(function (e) {
    die(e && e.stack ? e.stack : String(e));
  });
}

module.exports = {
  pathAllowed: pathAllowed,
  stripAnsi: stripAnsi,
  redact: redact,
  normalizeDiff: normalizeDiff,
  validatePatch: validatePatch,
  diagnosePrompt: diagnosePrompt,
  issueBody: issueBody
};