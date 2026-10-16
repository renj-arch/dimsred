// Architect — the self-extension agent.
//
// The site's power to build what it wishes: reads the proposal backlog
// (data/ideas.json, written by the Proposals agent) and implements the
// single highest-value pending proposal as REAL code — a new agent plugin
// in scripts/agents/. The registry picks the file up next run, so the
// system grows a new capability without any core edits.
//
// Rails (survival first — a wild idea must never brick the system):
//   - generated code is scanned for secret access, protected-path writes
//     and required shape BEFORE it is installed
//   - node --check + a child-process load test must pass
//   - one capability per run, everything auditable in data/architect-log.json
//   - a failed implementation is a logged lesson, not damage
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { isProtected, scanForSecrets, PROTECTED } = require('../lib/agent-registry');

const LOG_FILE = 'data/architect-log.json';
const MAX_CODE_BYTES = 80000;

function loadArchLog(ctx) {
  const j = ctx.loadJson(LOG_FILE, null);
  if (j && Array.isArray(j.installed)) return j;
  return { installed: [], rejected: [] };
}

function saveArchLog(ctx, log) {
  log.installed = log.installed.slice(-100);
  log.rejected = log.rejected.slice(-50);
  ctx.saveJson(LOG_FILE, log);
}

function ideaTitle(idea) {
  return String((idea && idea.title) || '').trim();
}

function pickIdea(ctx, archLog) {
  const ideasJ = ctx.loadJson('data/ideas.json', { ideas: [] });
  const ideas = Array.isArray(ideasJ.ideas) ? ideasJ.ideas : [];
  const done = {};
  archLog.installed.forEach(i => { done[i.title] = true; });
  archLog.rejected.forEach(i => { done[i.title] = true; });
  for (const idea of ideas) {
    const t = ideaTitle(idea);
    if (!t || done[t]) continue;
    return idea;
  }
  return null;
}

function buildPrompt(idea) {
  const ideaJson = JSON.stringify(idea, null, 1).slice(0, 4000);
  return [
    'You are the Architect of a self-maintaining study site. You implement ONE capability by writing ONE CommonJS plugin file that becomes a new agent.',
    '',
    'The plugin runs inside the site agent (Node 20, repo root cwd) with this toolbox bound into run(ctx):',
    '  ctx.root      — absolute repo path',
    '  ctx.callLLM(system, user, maxTokens) → Promise<string> — local 27B model, minutes per call, use sparingly',
    '  ctx.loadJson(relPath, fallback) / ctx.saveJson(relPath, data) — repo-root-relative data files',
    '  ctx.listPages() → array of site page filenames',
    'You may also require("fs"), require("path"), require("child_process").',
    '',
    'Hard rules for the code you write:',
    '  1. Shape: module.exports = { name: "PascalCaseName", kind: "rotate"|"always", run: async function (ctx) { ... return { agent: "lowercasename", fixes: [...] }; } }',
    '     kind "always" = cheap filesystem check/fix, no LLM. kind "rotate" = LLM-heavy work.',
    '  2. fixes items: { kind: "feature"|"fix"|"info", page: "...", fix: "one line description" }',
    '  3. Idempotent: check state before writing, never redo finished work.',
    '  4. NEVER touch these protected files: ' + PROTECTED.join(', '),
    '  5. NEVER read or transmit secrets, environment tokens, or credentials. No network calls that carry env data.',
    '  6. No new npm dependencies. No infinite loops. Keep the whole file under 350 lines.',
    '  7. Write data only under data/ and content only under the site page files (html/js/data).',
    '',
    'The pending proposal to implement:',
    ideaJson,
    '',
    'Respond with ONLY a JSON object, no markdown fences:',
    '{"slug": "kebab-case-3-40-chars", "name": "PascalCaseName", "rationale": "one sentence", "code": "the complete plugin file content"}'
  ].join('\n');
}

function extractJson(text) {
  let t = String(text || '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch (e) { return null; }
}

function validateGenerated(code) {
  if (typeof code !== 'string') return 'code missing';
  if (code.length < 200) return 'code too short (' + code.length + ' chars)';
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) return 'code too large';
  if (!/module\.exports\s*=/.test(code)) return 'no module.exports';
  if (!/run\s*[:(]/.test(code)) return 'no run function';
  const secret = scanForSecrets(code);
  if (secret) return 'secret scan tripped: ' + secret;
  for (const p of PROTECTED) {
    if (code.indexOf(p) !== -1) return 'references protected file ' + p;
  }
  return null;
}

function checkAndInstall(ctx, slug, code) {
  const finalPath = path.join(ctx.root, 'scripts', 'agents', slug + '.js');
  if (fs.existsSync(finalPath)) return { ok: false, reason: 'file already exists' };
  const tmpPath = path.join(ctx.root, 'scripts', 'agents', '.tmp-' + slug + '.js');
  fs.writeFileSync(tmpPath, code, 'utf8');
  try {
    execSync('node --check ' + JSON.stringify(tmpPath), { cwd: ctx.root, timeout: 20000, stdio: 'pipe' });
  } catch (e) {
    fs.unlinkSync(tmpPath);
    return { ok: false, reason: 'node --check failed: ' + String(e.stdout || e.message).slice(0, 200) };
  }
  const probe = 'try{var m=require(' + JSON.stringify(tmpPath) + ');' +
    'if(!m||typeof m.name!=="string"||typeof m.run!=="function"){process.exit(3);}process.exit(0);}' +
    'catch(e){console.error(String(e&&e.message).slice(0,200));process.exit(4);}';
  try {
    execSync('node -e ' + JSON.stringify(probe), { cwd: ctx.root, timeout: 25000, stdio: 'pipe' });
  } catch (e) {
    fs.unlinkSync(tmpPath);
    return { ok: false, reason: 'load test failed: ' + String(e.stdout || e.stderr || e.message).slice(0, 200) };
  }
  fs.renameSync(tmpPath, finalPath);
  return { ok: true, file: 'scripts/agents/' + slug + '.js', bytes: Buffer.byteLength(code, 'utf8') };
}

module.exports = {
  name: 'Architect',
  kind: 'rotate',
  run: async function (ctx) {
    const fixes = [];
    const archLog = loadArchLog(ctx);
    const idea = pickIdea(ctx, archLog);
    if (!idea) {
      console.log('architect: no pending proposals in data/ideas.json — nothing to build');
      return { agent: 'architect', fixes };
    }
    const title = ideaTitle(idea);
    console.log('architect: implementing proposal — ' + title);

    let raw = '';
    try {
      raw = await ctx.callLLM(
        'You are the Architect. Write production-quality self-contained Node.js agent plugins. Respond with only the requested JSON.',
        buildPrompt(idea),
        6000
      );
    } catch (e) {
      console.log('architect: LLM call failed: ' + e.message);
      return { agent: 'architect', fixes };
    }

    const out = extractJson(raw);
    if (!out) {
      archLog.rejected.push({ at: new Date().toISOString(), title: title, reason: 'model output was not parseable JSON' });
      saveArchLog(ctx, archLog);
      fixes.push({ kind: 'info', page: 'ideas', fix: 'Architect: proposal "' + title + '" — model output unparseable, retry next run' });
      return { agent: 'architect', fixes };
    }

    const slug = String(out.slug || '').toLowerCase();
    const name = String(out.name || '');
    if (!/^[a-z][a-z0-9-]{2,40}$/.test(slug)) {
      archLog.rejected.push({ at: new Date().toISOString(), title: title, reason: 'bad slug "' + slug + '"' });
      saveArchLog(ctx, archLog);
      return { agent: 'architect', fixes };
    }
    if (!/^[A-Z][A-Za-z0-9]{1,30}$/.test(name)) {
      archLog.rejected.push({ at: new Date().toISOString(), title: title, reason: 'bad plugin name "' + name + '"' });
      saveArchLog(ctx, archLog);
      return { agent: 'architect', fixes };
    }
    if (isProtected('scripts/agents/' + slug + '.js')) {
      archLog.rejected.push({ at: new Date().toISOString(), title: title, reason: 'targets protected path' });
      saveArchLog(ctx, archLog);
      return { agent: 'architect', fixes };
    }

    const invalid = validateGenerated(out.code);
    if (invalid) {
      archLog.rejected.push({ at: new Date().toISOString(), title: title, reason: invalid });
      saveArchLog(ctx, archLog);
      fixes.push({ kind: 'info', page: slug, fix: 'Architect: "' + title + '" rejected — ' + invalid });
      console.log('architect: rejected — ' + invalid);
      return { agent: 'architect', fixes };
    }

    const res = checkAndInstall(ctx, slug, out.code);
    if (!res.ok) {
      archLog.rejected.push({ at: new Date().toISOString(), title: title, reason: res.reason });
      saveArchLog(ctx, archLog);
      fixes.push({ kind: 'info', page: slug, fix: 'Architect: "' + title + '" did not install — ' + res.reason });
      console.log('architect: install failed — ' + res.reason);
      return { agent: 'architect', fixes };
    }

    archLog.installed.push({
      at: new Date().toISOString(),
      title: title,
      slug: slug,
      name: name,
      file: res.file,
      bytes: res.bytes,
      rationale: String(out.rationale || '').slice(0, 300)
    });
    saveArchLog(ctx, archLog);
    console.log('architect: INSTALLED ' + res.file + ' (' + res.bytes + ' bytes) — loads next run');
    fixes.push({ kind: 'feature', page: slug, fix: 'Architect built new agent ' + name + ': ' + title + ' → ' + res.file });
    return { agent: 'architect', fixes };
  }
};
