'use strict';
// Bridge from the legacy per-script Ollama clients to the shared hosted router
// in ./ollama.js.
//
// Why this exists: every writer script grew its own curl/fetch call to
// http://127.0.0.1:11434/api/chat, with its own transport guards. That was
// correct when a 9B model ran on the runner, but it means a hosted key alone
// changes nothing — the script never asks the router. This module lets a lane
// opt in with one branch, while a developer's laptop keeps the local path.
//
// A lane is "hosted" when it sets any of the route flags the router reads:
//   NVAPI=1  GROQ=1  OPENROUTER=1  GH_MODELS=1  OPENCODE_ZEN=1  GEMINI=1
// The router itself decides which of those actually has a key and falls
// through on failure, so this module never needs the keys.
const router = require('./ollama');

const FLAGS = ['NVAPI', 'GROQ', 'OPENROUTER', 'GH_MODELS', 'OPENCODE_ZEN', 'GEMINI'];

function enabled() {
  for (const k of FLAGS) {
    if (process.env[k] === '1') return true;
  }
  return false;
}

function optsFrom(o) {
  const src = o || {};
  const out = {};
  if (src.numPredict != null) out.numPredict = src.numPredict;
  if (src.maxTokens != null) out.numPredict = src.maxTokens;
  if (src.temperature != null) out.temperature = src.temperature;
  if (src.timeoutMs != null) out.timeoutMs = src.timeoutMs;
  return out;
}

// Legacy shape: callLLM(system, user, opts) -> text
async function chat(system, user, opts) {
  const res = await router.callLLM([
    { role: 'system', content: String(system == null ? '' : system) },
    { role: 'user', content: String(user == null ? '' : user) }
  ], optsFrom(opts));
  return res.text || '';
}

// Legacy shape: callLLM(messages, opts) -> { text, ... }
async function messages(list, opts) {
  return router.callLLM(list, optsFrom(opts));
}

module.exports = {
  enabled: enabled,
  chat: chat,
  messages: messages
};
