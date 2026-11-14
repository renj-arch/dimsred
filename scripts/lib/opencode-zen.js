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

function run(prompt) {
  return new Promise(function (resolve, reject) {
    if (!ENABLED) return reject(new Error('OpenCode Zen route is disabled (OPENCODE_ZEN!=1)'));
    if (!KEY) return reject(new Error('OPENCODE_API_KEY is not set'));
    ensureAuth();
    const args = ['run', '--standalone', '--format', 'json', '-m', MODEL, String(prompt || '')];
    const env = Object.assign({}, process.env, { OPENCODE_API_KEY: KEY });
    execFile(BIN, args, { timeout: TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024, env }, function (err, stdout, stderr) {
      if (err) {
        const detail = String(stderr || err.message || '').replace(/\s+/g, ' ').trim();
        return reject(new Error('opencode CLI: ' + detail.slice(0, 300)));
      }
      const text = parseEvents(stdout);
      if (!text) return reject(new Error('opencode CLI returned no text'));
      resolve({ text: text, httpCode: '200', doneReason: 'stop' });
    });
  });
}

module.exports = {
  ENABLED: ENABLED,
  KEY: KEY,
  MODEL: MODEL,
  run: run,
  parseEvents: parseEvents,
  ensureAuth: ensureAuth,
  authPath: authPath
};
