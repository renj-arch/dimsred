'use strict';
// OpenCode Zen route: use the free DeepSeek V4.1 Flash model through the
// OpenCode CLI, because Zen blocks free models on the raw HTTP API.
//
// Verified 2026-11-14 with the owner's key:
//   POST https://opencode.ai/inference/openai/v1/chat/completions
//     model=deepseek-v4.1-flash-free  -> HTTP 429 FreeUsageLimitError
//     ("Free models work in OpenCode")
//     model=nemotron-3-ultra-free     -> HTTP 400 "Model is unavailable"
//   opencode run -m opencode/deepseek-v4.1-flash-free#max "..." -> works
//
// The CLI is the client the free tier requires, so this module shells out to
// it, parses its JSON event stream, and returns the text. Any failure is
// thrown so ollama.js can fall through to NVIDIA/Groq/OpenRouter/GitHub Models.
//
// This is opt-in per lane (OPENCODE_ZEN=1) because it needs the CLI installed
// and a personal Zen key. It is not a hard dependency of any other lane.
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ENABLED = process.env.OPENCODE_ZEN === '1';
const KEY = process.env.OPENCODE_API_KEY || '';
const MODEL = process.env.OPENCODE_ZEN_MODEL || 'opencode/deepseek-v4.1-flash-free#max';
const BIN = process.env.OPENCODE_BIN || 'opencode';
const TIMEOUT_MS = Math.max(30000, parseInt(process.env.OPENCODE_ZEN_TIMEOUT_MS || '900000', 10) || 900000);

// The CLI stores credentials in <data>/auth.json. `opencode debug paths`
// prints this as `data` on every platform: ~/.local/share/opencode on Linux
// and Windows alike. OPENCODE_DATA_DIR overrides it for tests.
function authPath() {
  const dataDir = process.env.OPENCODE_DATA_DIR ||
    path.join(os.homedir(), '.local', 'share', 'opencode');
  return path.join(dataDir, 'auth.json');
}

function ensureAuth() {
  const file = authPath();
  if (!KEY) return file;
  let auth = {};
  try { auth = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { auth = {}; }
  if (auth && auth.opencode && auth.opencode.key === KEY) return file;
  auth = auth && typeof auth === 'object' ? auth : {};
  auth.opencode = { type: 'api', key: KEY };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(auth, null, 2) + '\n', { mode: 0o600 });
  return file;
}

// The CLI emits one JSON object per line. Only `type:"text"` parts are the
// answer; reasoning and step events are deliberately ignored. The agent may
// add a short preamble before the HTML, so start at the first heading.
function parseEvents(stdout) {
  let text = '';
  for (const line of String(stdout || '').split('\n')) {
    const t = line.trim();
    if (!t || t.charAt(0) !== '{') continue;
    let j;
    try { j = JSON.parse(t); } catch (e) { continue; }
    if (j.type === 'text' && j.part && typeof j.part.text === 'string') {
      text += j.part.text;
    }
  }
  text = text.trim();
  const at = text.search(/<h[23][^>]*>/i);
  if (at > 0) text = text.slice(at);
  return text;
}

function execCli(args) {
  return new Promise(function (resolve, reject) {
    const env = Object.assign({}, process.env, { OPENCODE_API_KEY: KEY });
    execFile(BIN, args, { timeout: TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024, env }, function (err, stdout, stderr) {
      if (err) {
        const detail = String(stderr || err.message || '').replace(/\s+/g, ' ').trim();
        const e = new Error('opencode CLI: ' + detail.slice(0, 300));
        e.stdout = String(stdout || '');
        return reject(e);
      }
      resolve(String(stdout || ''));
    });
  });
}

// A build that does not know a flag answers with its usage text and a non-zero
// exit. That is the signature this route must survive rather than treat as a
// real failure.
function isUsageDump(msg) {
  return /unknown option|(^|\s)usage\b|positionals:|\[array\]|show help \[boolean\]/i.test(String(msg || ''));
}

// Strip ANSI and return the answer when the CLI printed prose instead of the
// JSON event stream (older builds have no --format json).
function plainText(stdout) {
  const s = String(stdout || '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/^\s*[\u2800-\u28FF]\s*/gm, '')
    .trim();
  if (!s) return '';
  const at = s.search(/<h[23][^>]*>/i);
  return at > 0 ? s.slice(at) : s;
}

async function run(prompt) {
  if (!ENABLED) throw new Error('OpenCode Zen route is disabled (OPENCODE_ZEN!=1)');
  if (!KEY) throw new Error('OPENCODE_API_KEY is not set');
  ensureAuth();
  const p = String(prompt || '');
  // The runner installs whatever https://opencode.ai/install serves, and the
  // flags moved between releases: the yargs-era build rejects --standalone and
  // --format, prints its usage to stderr and exits non-zero. Because the first
  // form was the only one tried, EVERY Zen call failed and fell through to the
  // next backend -- one wasted CLI spawn per model call, on every lane. Try the
  // full form, then drop the two flags that moved, then drop --format.
  const forms = [
    ['run', '--standalone', '--format', 'json', '-m', MODEL, p],
    ['run', '--format', 'json', '-m', MODEL, p],
    ['run', '-m', MODEL, p]
  ];
  let firstErr = null;
  for (let i = 0; i < forms.length; i++) {
    try {
      const stdout = await execCli(forms[i]);
      const text = parseEvents(stdout) || plainText(stdout);
      if (text) return { text: text, httpCode: '200', doneReason: 'stop' };
      const e = new Error('opencode CLI returned no text');
      if (!firstErr) firstErr = e;
      if (i === forms.length - 1) break;
    } catch (e) {
      if (!firstErr) firstErr = e;
      const retryable = isUsageDump(e.message) || /returned no text/.test(e.message);
      if (!retryable) throw e;            // quota, network, auth: terminal
      if (i === forms.length - 1) break;
    }
  }
  // Make the next failure diagnosable: the version says which flag set this
  // build wanted.
  let version = '';
  try { version = String(await execCli(['--version'])).trim().slice(0, 40); } catch (e) { /* best effort */ }
  throw new Error(String(firstErr && firstErr.message || 'opencode CLI failed').slice(0, 220) +
    (version ? ' [cli ' + version + ']' : ''));
}

module.exports = {
  ENABLED: ENABLED,
  KEY: KEY,
  MODEL: MODEL,
  run: run,
  parseEvents: parseEvents,
  plainText: plainText,
  isUsageDump: isUsageDump,
  ensureAuth: ensureAuth,
  authPath: authPath
};
