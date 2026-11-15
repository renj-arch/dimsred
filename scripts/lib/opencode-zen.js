'use strict';
// OpenCode Zen route: use the free DeepSeek V4.1 Flash model through the
// OpenCode CLI, because Zen blocks free models on the raw HTTP API.
//
// Verified 2026-11-14 with the owner's key:
//   POST https://opencode.ai/inference/openai/v1/chat/completions
//     model=deepseek-v4.1-flash-free  -> HTTP 429 FreeUsageLimitError
//     ("Free models work in OpenCode")
//     model=nemotron-3-ultra-free     -> HTTP 400 "Model is unavailable"
//   opencode run --format json -m opencode/deepseek-v4.1-flash-free "..." -> works
//
// The `--format json` flag is the one that moved; `--standalone` does not exist
// in the build the installer ships (opencode-ai 1.19.5) at all, and asking for
// it gets the CLI's usage text and a non-zero exit. See forms() below.
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

// The id is `opencode/deepseek-v4.1-flash-free`. A `#suffix` is a reasoning
// variant, NOT part of the id, and it must not travel inside it: the gateway
// resolves the id first, so `...#max` is an unknown model and answers
//     {"name":"UnknownError","data":{"message":"Unexpected server error"}}
// on every call -- the same reply an invented id gets. The bare id against the
// same key answers `APIError 401 Invalid credential`, i.e. it resolved and only
// the credential was wrong, which is how this was told apart from a bad key.
// A variant is opt-in and goes through --variant, the flag the CLI documents;
// the defaults are bare so the live path is one spawn on a known-good shape.
function splitModel(raw) {
  const s = String(raw == null ? '' : raw).trim();
  const at = s.indexOf('#');
  if (at <= 0 || at === s.length - 1) return { model: s, variant: '' };
  return { model: s.slice(0, at).trim(), variant: s.slice(at + 1).trim() };
}
const PARTS = splitModel(process.env.OPENCODE_ZEN_MODEL || 'opencode/deepseek-v4.1-flash-free');
const MODEL = PARTS.model;
const VARIANT = String(process.env.OPENCODE_ZEN_VARIANT || PARTS.variant || '').trim();
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

// A non-zero exit is not always accompanied by stderr: a server-side refusal
// arrives as {"type":"error","error":{"name":...,"data":{...}}} on stdout, and
// reading only stderr turned it into a bare "Command failed" that named nothing.
function errorDetail(stdout, stderr, err) {
  const events = [];
  for (const line of String(stdout || '').split('\n')) {
    const t = line.trim();
    if (t.charAt(0) !== '{') continue;
    let j;
    try { j = JSON.parse(t); } catch (e) { continue; }
    if (!j || j.type !== 'error' || !j.error) continue;
    const d = j.error.data || {};
    events.push([j.error.name, d.message, d.statusCode ? 'HTTP ' + d.statusCode : '', d.ref ? d.ref : '']
      .filter(Boolean).join(': '));
  }
  const parts = [String(stderr || '').replace(/\s+/g, ' ').trim(), events.join(' | ')]
    .filter(function (s) { return s; });
  // A hang leaves neither: execFile kills the child and reports just
  // "Command failed". Name the deadline, because a 15-minute silence reads like
  // a slow model and is usually a CLI waiting on a TTY.
  if (!parts.length && err && (err.killed || err.signal)) {
    parts.push('no answer before the ' + Math.round(TIMEOUT_MS / 1000) + 's deadline, killed (' + (err.signal || 'timeout') + ')');
  }
  return parts.length ? parts.join(' ') : String(err && err.message || '');
}

function execCli(args) {
  return new Promise(function (resolve, reject) {
    const env = Object.assign({}, process.env, { OPENCODE_API_KEY: KEY });
    execFile(BIN, args, { timeout: TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024, env }, function (err, stdout, stderr) {
      if (err) {
        const detail = errorDetail(stdout, stderr, err).replace(/\s+/g, ' ').trim();
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
  return /unknown (argument|option|flag)|(^|\s)usage\b|positionals:|\[array\]|show help \[boolean\]/i.test(String(msg || ''));
}

// The CLI shapes, most-likely-current first. An unknown FLAG costs one spawn
// and the next form still answers; an unknown MODEL ID costs every call,
// which is why the id is bare everywhere and the prompt always comes last.
function forms() {
  const out = [];
  const json = ['run', '--format', 'json', '-m', MODEL];
  const plain = ['run', '-m', MODEL];
  if (VARIANT) {
    out.push(json.concat(['--variant', VARIANT]), plain.concat(['--variant', VARIANT]));
  }
  out.push(json, plain);
  if (VARIANT) {
    // A build that wants --standalone is also old enough not to have --variant.
    out.push(['run', '--standalone', '--format', 'json', '-m', MODEL]);
  }
  return out;
}
const FORMS = forms();

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
  let firstErr = null;
  for (let i = 0; i < FORMS.length; i++) {
    try {
      const stdout = await execCli(FORMS[i].concat([p]));
      const text = parseEvents(stdout) || plainText(stdout);
      if (text) return { text: text, httpCode: '200', doneReason: 'stop' };
      const e = new Error('opencode CLI returned no text');
      if (!firstErr) firstErr = e;
      if (i === FORMS.length - 1) break;
    } catch (e) {
      if (!firstErr) firstErr = e;
      // Only a shape complaint is worth another shape: quota, auth and network
      // mean the shape was fine and the answer is terminal.
      const retryable = isUsageDump(e.message) || /returned no text/.test(e.message) ||
        (VARIANT ? /\bvariant\b/i.test(e.message) : false);
      if (!retryable) throw e;
      if (i === FORMS.length - 1) break;
    }
  }
  // Make the next failure diagnosable: the id asked for, and the CLI version
  // that decides which flag set this build wanted.
  let version = '';
  try { version = String(await execCli(['--version'])).trim().slice(0, 40); } catch (e) { /* best effort */ }
  throw new Error(String(firstErr && firstErr.message || 'opencode CLI failed').slice(0, 200) +
    ' [model ' + MODEL + ']' + (version ? ' [cli ' + version + ']' : ''));
}


module.exports = {
  ENABLED: ENABLED,
  KEY: KEY,
  MODEL: MODEL,
  VARIANT: VARIANT,
  FORMS: FORMS,
  run: run,
  parseEvents: parseEvents,
  plainText: plainText,
  isUsageDump: isUsageDump,
  splitModel: splitModel,
  ensureAuth: ensureAuth,
  authPath: authPath
};
