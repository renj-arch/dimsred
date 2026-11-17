'use strict';
// GitHub-native repo agent. Unlike ops-agent (which diagnoses failed runs),
// this agent takes a task and edits the repository:
//
//   schedule        -> run the site audit, pick a real defect, fix it
//   issue label     -> body of an issue labelled `agent-task`
//   /agent <task>   -> issue comment command
//   workflow_dispatch -> free-form task
//
// It runs a small tool loop (read_file / write_file / run / finish) against a
// hosted model, verifies the change, and opens a PR. It never pushes to main
// and never merges. Content edits are allowed, but a reader-facing change must
// keep the site audit from getting worse and must keep the protection tests
// green.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const router = require('./lib/ollama');

const ROOT = path.resolve(__dirname, '..');
const REPO = process.env.GITHUB_REPOSITORY || 'renj-arch/dimsred';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const MODE = String(process.env.REPO_MODE || 'audit').toLowerCase();
const TASK = String(process.env.REPO_TASK || '').trim();
const ISSUE = String(process.env.REPO_ISSUE || '').trim();
const AUTHOR_ASSOC = String(process.env.REPO_AUTHOR_ASSOCIATION || '').toUpperCase();
const MAX_STEPS = 12;

function log(msg) { console.log('[agent] ' + msg); }
function die(msg) { console.error('[agent] FATAL: ' + msg); process.exit(1); }

function sh(cmd, opts) {
  return execSync(cmd, {
    encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, cwd: ROOT,
    env: Object.assign({}, process.env, { GH_TOKEN: TOKEN, GITHUB_TOKEN: TOKEN }),
    timeout: 180000,
    ...(opts || {})
  }).trim();
}

async function api(method, endpoint, body) {
  const res = await fetch('https://api.github.com' + endpoint, {
    method: method,
    headers: {
      Authorization: 'Bearer ' + TOKEN,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'vlymbooq-repo-agent',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw new Error(method + ' ' + endpoint + ' -> ' + res.status + ' ' + text.slice(0, 300));
  return text ? JSON.parse(text) : null;
}

// ---------------------------------------------------------------- safety --
const FORBIDDEN = [
  /^\.git\//,
  /^node_modules\//,
  /^data\/questions\//,
  /^data\/quiz\.json$/,
  /^data\/timeline/,
  /^data\/wiki-/,
  /^data\/pib-feed\.json$/,
  /^data\/news\.json$/,
  /^data\/magazine\.json$/,
  /^data\/course-coverage\.json$/,
  /^\.env/,
  /\.min\.(js|css)$/
];

function pathAllowed(p) {
  const rel = String(p || '').replace(/\\/g, '/').replace(/^\.\//, '');
  if (!rel || rel.indexOf('..') !== -1) return false;
  if (FORBIDDEN.some(function (re) { return re.test(rel); })) return false;
  if (rel.startsWith('data/') && !/^data\/relations\.json$/.test(rel)) return false;
  return true;
}

const COMMAND_ALLOW = [
  /^node --check [\w./-]+\.js$/,
  /^node scripts\/[\w./-]+\.js(?: .*)?$/,
  /^node scripts\/lib\/[\w./-]+\.test\.js$/,
  /^python3? -m py_compile [\w./-]+\.py$/,
  /^python3? -c "import yaml,sys; yaml\.safe_load\(open\(sys\.argv\[1\]\)\)" [\w./-]+\.ya?ml$/,
  /^git (?:diff|status)(?: .*)?$/,
  /^ls(?: [\w./-]+)?$/,
  /^wc -l [\w./-]+$/
];

function commandAllowed(cmd) {
  const c = String(cmd || '').trim();
  return COMMAND_ALLOW.some(function (re) { return re.test(c); });
}

// ---------------------------------------------------------------- auditing --
function auditFindings() {
  try {
    sh('node scripts/audit-site.js');
  } catch (e) {
    log('audit-site.js exited non-zero (findings still written): ' + String(e.message).slice(0, 200));
  }
  const p = path.join(ROOT, 'data', 'audit-findings.json');
  if (!fs.existsSync(p)) return null;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  return j.findings || j;
}

function pickAuditTask(findings) {
  if (!findings) return '';
  const groups = ['fabrication', 'placeholder', 'dupSections'];
  for (const g of groups) {
    const list = findings[g] || [];
    if (list.length) {
      const first = String(list[0]);
      const cut = first.indexOf(' :: ');
      const file = cut === -1 ? first : first.slice(0, cut);
      const why = cut === -1 ? '' : first.slice(cut + 4);
      return 'Fix this site audit finding in ' + file + ': ' + why + '\n' +
        'Read the file, correct the defect without inventing facts, and run `node scripts/audit-site.js` to confirm this finding is gone.';
    }
  }
  return '';
}

// ---------------------------------------------------------------- model ----
function systemPrompt(task) {
  return [
    'You are the repository maintenance agent for ' + REPO + '.',
    'You work inside a git checkout. Complete ONE task, make the smallest correct change, and stop.',
    '',
    'Repository rules:',
    '- Never invent a fact, quotation, date, statistic, case or source.',
    '- Never push to main and never merge. The harness opens a PR after you finish.',
    '- Do not edit data/questions/, data/quiz.json, timeline/wiki data, or secrets.',
    '- Reader-facing content is allowed only when the task is a concrete defect and the fix is verifiable.',
    '',
    'Task:',
    task,
    '',
    'Tools (return STRICT JSON only, one tool per reply):',
    '{"thought":"...","tool":"read_file","path":"relative/path"}',
    '{"thought":"...","tool":"write_file","path":"relative/path","content":"FULL new file content"}',
    '{"thought":"...","tool":"append_file","path":"relative/path","content":"text to append"}',
    '{"thought":"...","tool":"run","command":"node scripts/audit-site.js"}',
    '{"thought":"...","tool":"finish","summary":"what changed and why"}',
    '',
    'Rules of the loop:',
    '- Read a file ONCE before writing it. Never read the same file twice; use write_file or append_file.',
    '- Use append_file for a small addition; use write_file for a rewrite.',
    '- Prefer a targeted repair over a rewrite.',
    '- Run the smallest relevant test before finishing.',
    '- If the task cannot be completed without inventing facts, use finish with a clear explanation and make no edit.',
    '- Allowed commands: node --check, node scripts/*, python -m py_compile, git diff/status, ls, wc.'
  ].join('\n');
}

function parseStep(text) {
  const s = String(text || '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(s.slice(start, end + 1)); } catch (e) { return null; }
}

async function runLoop(task) {
  const messages = [
    { role: 'system', content: systemPrompt(task) },
    { role: 'user', content: 'Begin. Return one JSON tool call.' }
  ];
  const readFiles = new Set();
  const readCount = {};
  const changed = new Set();
  let summary = '';

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await router.callLLM(messages, { numPredict: 3500, temperature: 0.2 });
    const raw = String(res && res.text || '');
    const plan = parseStep(raw);
    if (!plan || !plan.tool) {
      messages.push({ role: 'assistant', content: raw });
      messages.push({ role: 'user', content: 'That was not a JSON tool call. Return one JSON object with a "tool" field.' });
      continue;
    }
    log('step ' + (step + 1) + ': ' + plan.tool + ' ' + (plan.path || plan.command || ''));

    if (plan.tool === 'finish') {
      summary = String(plan.summary || 'No summary supplied.');
      break;
    }

    if (plan.tool === 'read_file') {
      const p = String(plan.path || '');
      if (!pathAllowed(p)) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: 'Path is not allowed: ' + p });
        continue;
      }
      const abs = path.join(ROOT, p);
      if (!fs.existsSync(abs)) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: 'File does not exist: ' + p });
        continue;
      }
      readFiles.add(p);
      readCount[p] = (readCount[p] || 0) + 1;
      messages.push({ role: 'assistant', content: raw });
      if (readCount[p] > 1) {
        messages.push({ role: 'user', content: 'You have already read ' + p + '. Do not read it again. Use write_file or append_file, or finish.' });
        continue;
      }
      const text = fs.readFileSync(abs, 'utf8').slice(0, 80000);
      messages.push({ role: 'user', content: 'Contents of ' + p + ':\n```\n' + text + '\n```' });
      continue;
    }

    if (plan.tool === 'write_file') {
      const p = String(plan.path || '');
      if (!pathAllowed(p)) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: 'Path is not allowed: ' + p });
        continue;
      }
      if (!readFiles.has(p)) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: 'Read the file before writing it: ' + p });
        continue;
      }
      const content = String(plan.content == null ? '' : plan.content);
      if (content.length > 200000) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: 'File content is too large (max 200 KB).' });
        continue;
      }
      const abs = path.join(ROOT, p);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content, 'utf8');
      changed.add(p);
      messages.push({ role: 'assistant', content: raw });
      messages.push({ role: 'user', content: 'Wrote ' + p + '. Continue with tests or finish.' });
      continue;
    }

    if (plan.tool === 'append_file') {
      const p = String(plan.path || '');
      if (!pathAllowed(p)) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: 'Path is not allowed: ' + p });
        continue;
      }
      if (!readFiles.has(p)) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: 'Read the file before appending to it: ' + p });
        continue;
      }
      const content = String(plan.content == null ? '' : plan.content);
      if (!content || content.length > 20000) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: 'Append content must be between 1 and 20,000 chars.' });
        continue;
      }
      const abs = path.join(ROOT, p);
      if (!fs.existsSync(abs)) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: 'File does not exist: ' + p });
        continue;
      }
      fs.appendFileSync(abs, content, 'utf8');
      changed.add(p);
      messages.push({ role: 'assistant', content: raw });
      messages.push({ role: 'user', content: 'Appended to ' + p + '. Continue with tests or finish.' });
      continue;
    }

    if (plan.tool === 'run') {
      const cmd = String(plan.command || '').trim();
      if (!commandAllowed(cmd)) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: 'Command is not allowed: ' + cmd });
        continue;
      }
      let out = '';
      let code = 0;
      try { out = sh(cmd); } catch (e) { code = 1; out = String(e.stdout || '') + '\n' + String(e.stderr || e.message); }
      messages.push({ role: 'assistant', content: raw });
      messages.push({ role: 'user', content: 'Command exited ' + code + ':\n```\n' + out.slice(-12000) + '\n```' });
      continue;
    }

    messages.push({ role: 'assistant', content: raw });
    messages.push({ role: 'user', content: 'Unknown tool. Use read_file, write_file, run or finish.' });
  }

  return { summary: summary, changed: Array.from(changed) };
}

// ---------------------------------------------------------------- verify ----
function verify(changed) {
  const problems = [];
  for (const p of changed) {
    if (/\.js$/.test(p)) {
      try { sh('node --check ' + JSON.stringify(p)); } catch (e) { problems.push('node --check failed: ' + p); }
    }
    if (/\.ya?ml$/.test(p)) {
      try {
        sh('python -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" ' + JSON.stringify(p));
      } catch (e) {
        problems.push('YAML parse failed: ' + p);
      }
    }
  }
  return problems;
}

function baselineFindings() {
  if (!fs.existsSync(path.join(ROOT, 'data', 'audit-findings.json'))) return null;
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'audit-findings.json'), 'utf8'));
    return j.findings || j;
  } catch (e) { return null; }
}

function auditWorse(before, after) {
  if (!before || !after) return null;
  for (const g of ['fabrication', 'placeholder', 'dupSections']) {
    const b = (before[g] || []).length;
    const a = (after[g] || []).length;
    if (a > b) return g + ' grew from ' + b + ' to ' + a;
  }
  return null;
}

async function openPR(task, result, testNote, branch) {
  sh('git config user.name "dimsred-bot"');
  sh('git config user.email "bot@vlymbooq.qzz.io"');
  sh('git add -A');
  try { sh('git diff --cached --quiet'); return null; } catch (e) { /* staged changes exist */ }
  const diff = sh('git diff --cached --stat');
  sh('git commit -m ' + JSON.stringify('agent: ' + task.split('\n')[0].slice(0, 70)));
  sh('git push -u origin ' + branch);
  const body = [
    'Task:',
    '',
    task,
    '',
    '## Agent summary',
    result.summary || '(none)',
    '',
    '## Files',
    '```',
    diff,
    '```',
    '',
    testNote,
    '',
    '_Generated by `scripts/repo-agent.js`. Review before merging; this PR was not auto-merged._'
  ].join('\n');
  const pr = await api('POST', '/repos/' + REPO + '/pulls', {
    title: '[agent] ' + task.split('\n')[0].slice(0, 90),
    head: branch,
    base: 'main',
    body: body
  });
  return pr;
}

async function comment(body) {
  if (!ISSUE) return;
  await api('POST', '/repos/' + REPO + '/issues/' + ISSUE + '/comments', { body: body });
}

// ---------------------------------------------------------------- main -----
if (require.main === module) {
  (async function main() {
    if (!TOKEN) die('GH_TOKEN/GITHUB_TOKEN is required');
    if (MODE === 'task' && ISSUE && ['OWNER', 'MEMBER', 'COLLABORATOR'].indexOf(AUTHOR_ASSOC) === -1) {
      await comment('Only a repository owner, member or collaborator can task the agent.');
      return;
    }

    let task = TASK.replace(/^\/agent\s*/i, '').trim();
    if (MODE === 'audit') {
      log('running site audit to pick a task');
      const findings = auditFindings();
      task = pickAuditTask(findings);
      if (!task) {
        log('no audit findings to fix');
        return;
      }
    }
    if (!task) die('no task supplied');

    const before = auditFindings();
    log('task: ' + task.replace(/\n/g, ' ').slice(0, 180));

    const branch = 'agent/task-' + Date.now();
    sh('git checkout -B ' + branch);
    let result;
    try {
      result = await runLoop(task);
    } catch (e) {
      // All model backends are rate-limited or otherwise unavailable. Do not
      // fail the workflow — the next scheduled run will retry when a quota
      // resets. Revert the branch checkout so nothing is left dangling.
      log('model unavailable (' + String(e.message || '').slice(0, 200) + '); agent run skipped, will retry on next schedule');
      try { sh('git checkout -q main 2>/dev/null || true'); } catch (_) {}
      try { sh('git branch -D ' + branch + ' 2>/dev/null || true'); } catch (_) {}
      return;
    }
    const changed = sh('git status --porcelain').split('\n').filter(Boolean).map(function (l) { return l.slice(3).trim(); });
    if (!changed.length) {
      log('agent made no change');
      await comment('The agent finished without changing a file.\n\n' + result.summary);
      return;
    }
    const forbidden = changed.filter(function (p) { return !pathAllowed(p); });
    if (forbidden.length) {
      log('forbidden path changed: ' + forbidden.join(', '));
      sh('git checkout -- .');
      await comment('The agent changed a forbidden path and was reverted: ' + forbidden.join(', '));
      return;
    }

    const problems = verify(changed);
    if (problems.length) {
      log('verification failed: ' + problems.join('; '));
      sh('git checkout -- .');
      await comment('The agent produced a change that failed verification:\n\n- ' + problems.join('\n- '));
      return;
    }

    const after = auditFindings();
    const worse = auditWorse(before, after);
    if (worse) {
      log('audit regressed: ' + worse);
      sh('git checkout -- .');
      await comment('The agent change was reverted because the site audit got worse: ' + worse);
      return;
    }

    const pr = await openPR(task, result, 'Verification: changed JavaScript passes `node --check`; changed YAML parses; site audit did not regress.', branch);
    if (!pr) { log('nothing staged after verification'); return; }
    log('opened PR #' + pr.number + ' ' + pr.html_url);
    await comment('Opened a PR for this task: ' + pr.html_url + '\n\n' + (result.summary || ''));
  })().catch(function (e) {
    die(e && e.stack ? e.stack : String(e));
  });
}

module.exports = { pathAllowed: pathAllowed, commandAllowed: commandAllowed, pickAuditTask: pickAuditTask, auditWorse: auditWorse };