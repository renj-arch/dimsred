// Agent plugin registry — the site's power to extend itself.
//
// Every file in scripts/agents/*.js that exports { name, run } is an agent.
// The Architect agent writes new plugin files; they are picked up
// automatically on the NEXT run. Adding a capability = adding a file.
//
// Survival rails (a broken plugin must never cost a run):
//   - each plugin loads inside try/catch; a syntax error, a bad shape or a
//     throwing top-level just logs SKIP and the run continues
//   - plugins are zero-arg at call time: the registry binds the shared
//     toolbox (callLLM, loadJson, saveJson, listPages, root) into run(ctx)
//   - name collisions with built-ins are skipped, never replaced
'use strict';

const fs = require('fs');
const path = require('path');

function loadPlugins(ctx) {
  const dir = path.join(ctx.root, 'scripts', 'agents');
  const out = [];
  let files = [];
  try {
    files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('.')).sort();
  } catch (e) {
    return out;
  }
  for (const f of files) {
    const full = path.join(dir, f);
    try {
      delete require.cache[require.resolve(full)];
      const mod = require(full);
      if (!mod || typeof mod.name !== 'string' || typeof mod.run !== 'function') {
        console.log('registry: SKIP ' + f + ' — must export { name, run }');
        continue;
      }
      if (!/^[A-Z][A-Za-z0-9]{1,30}$/.test(mod.name)) {
        console.log('registry: SKIP ' + f + ' — invalid plugin name "' + mod.name + '"');
        continue;
      }
      const kind = mod.kind === 'always' ? 'always' : 'rotate';
      const bound = (function (fn) { return function () { return fn(ctx); }; })(mod.run);
      out.push({ name: mod.name, kind: kind, run: bound, file: f });
      console.log('registry: loaded plugin ' + mod.name + ' [' + kind + '] from ' + f);
    } catch (e) {
      console.log('registry: SKIP ' + f + ' — load failed: ' + e.message);
    }
  }
  return out;
}

// Files the Architect may NEVER rewrite — the nervous system. Losing any of
// these bricks the whole system (auth, publish path, core agent, registry).
const PROTECTED = [
  'scripts/site-agent.js',
  'scripts/llm-autofix.js',
  'scripts/ci-push.sh',
  'scripts/lib/agent-registry.js',
  '.github/workflows/auth-sentinel.yml',
  '.gitignore',
  '.gitattributes'
];

function isProtected(rel) {
  const norm = String(rel || '').replace(/\\/g, '/').replace(/^\.\//, '');
  return PROTECTED.indexOf(norm) !== -1;
}

// Best-effort scan of generated code for secret exfiltration. Not perfect —
// it is a tripwire, not a sandbox: the agent writes its own code, so the
// contract is "no secrets, no outbound calls that carry env data".
const SECRET_PATTERNS = [
  /process\.env\.[A-Za-z_]{0,40}(TOKEN|SECRET|PAT|KEY|PASSWORD|PWD)/i,
  /JSON\.stringify\(\s*process\.env\s*\)/,
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /CI_PUSH_TOKEN/,
  /GITHUB_TOKEN/i
];

function scanForSecrets(code) {
  for (const re of SECRET_PATTERNS) {
    if (re.test(code)) return 'matches ' + re;
  }
  return null;
}

module.exports = { loadPlugins, isProtected, scanForSecrets, PROTECTED };
