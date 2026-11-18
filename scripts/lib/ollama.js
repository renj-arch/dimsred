// Server-side model client shared by the model-only paper lanes.
//
// A lane always has a working local path (Ollama on the runner). Hosted
// backends are optional upgrades: each is opt-in, each is free-tier only, and
// any failure falls through to the next one and finally to the local model.
// The order is strongest-first, because a 9B local model is not good enough for
// authored lesson prose and the owner asked for the hosted models to lead.
const { spawn } = require('child_process');
const opencodeZen = require('./opencode-zen');

const HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:9b';
const FAKE = process.env.OD_FAKE_TEXT || '';

// Transport guards for a single local-model call. These were hard-coded at
// 55/25/12 minutes, which killed the 27B CPU lane two minutes before it would
// have finished: deep-rewrite.yml documents 60-120 min per lesson, but the
// fixed 55-minute cap aborted the call (run 43457466546, "transport: hard cap
// 55min"). The caps exist to catch a genuinely hung stream, so they are now
// per-lane environment values rather than a fixed ceiling; the idle guard is
// what actually detects a stall, and it is unchanged by default.
//   OLLAMA_HARD_CAP_MIN    total wall clock for one call   (default 55)
//   OLLAMA_FIRST_BYTE_MIN  time allowed before first byte  (default 25)
//   OLLAMA_IDLE_MIN        time allowed between bytes      (default 12)
const HARD_CAP_MIN = Math.max(1, parseInt(process.env.OLLAMA_HARD_CAP_MIN || '55', 10) || 55);
const FIRST_BYTE_MIN = Math.max(1, parseInt(process.env.OLLAMA_FIRST_BYTE_MIN || '25', 10) || 25);
const IDLE_MIN = Math.max(1, parseInt(process.env.OLLAMA_IDLE_MIN || '12', 10) || 12);
// curl must not give up before the guard does, or a slow-but-alive stream would
// die with a bare "curl exit 28" instead of a readable reason.
const CURL_MAX_TIME = String(Math.max(5400, (HARD_CAP_MIN + 5) * 60));

function transportGuards() {
  return { hardCapMin: HARD_CAP_MIN, firstByteMin: FIRST_BYTE_MIN, idleMin: IDLE_MIN, curlMaxTime: CURL_MAX_TIME };
}

// Optional GitHub Models backend (free tier, OpenAI-compatible). A lane opts in
// with GH_MODELS=1 and GH_MODELS_TOKEN; every call then tries the hosted model
// first and falls back to the local Ollama model on any error, so an exhausted
// rate limit or outage degrades quality instead of stalling the chain.
const GH_MODELS = process.env.GH_MODELS === '1';
const GH_MODEL = process.env.GH_MODELS_MODEL || 'gpt-4o-mini';
const GH_TOKEN = process.env.GH_MODELS_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const GH_URL = 'https://models.github.ai/inference/chat/completions';

// Optional NVIDIA NIM backend (free prototyping tier, OpenAI-compatible).
// Opt in per lane with NVAPI=1 and NVIDIA_API_KEY; never required, and any
// failure falls through to the local Ollama model exactly like GH Models does.
//
// Model choice lives in ./nvidia-models.js, where every entry was verified with
// a real call. NVIDIA's own docs page was stale on 2026-11-13 (it listed models
// that return 410 end-of-life), so do not add an id from the docs alone.
// moonshotai/kimi-k3.1-pro is playground-only and 404s with any key.
const NVAPI = process.env.NVAPI === '1';
// Short aliases (nemotron-3-ultra, glm-5.3-flash, ...) resolve through the
// curated catalogue in ./nvidia-models.js. A full id passes through untouched,
// so a model NVIDIA adds tomorrow works without a code change. An empty value
// resolves to the catalogue default; every catalogue entry answered a live
// call on 2026-11-13 (see that file - the docs page was stale).
const _nvModel = require('./nvidia-models').resolve(process.env.NVIDIA_MODEL);
const NVIDIA_MODEL = _nvModel.id;
const NVIDIA_MODEL_TIER = _nvModel.tier;
const NVIDIA_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_URL = process.env.NVIDIA_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MAX_TOKENS = 16384;
let warnedUnknownNvidia = false;
// The actual backend/model that answered the most recent call. Provenance
// fields must use this, not OLLAMA_MODEL, or hosted questions are mislabelled
// as qwen3.5:9b.
let LAST_SERVED = '';

// Optional Groq backend (free tier, OpenAI-compatible, very low latency).
// Verified live on 2026-11-14: the account exposes openai/gpt-oss-120b and
// qwen/qwen3.8-27b; llama-3.3-70b-versatile is gone (404 model_not_found), so
// do not copy an old model name from a blog post.
const GROQ = process.env.GROQ === '1';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = process.env.GROQ_URL || 'https://api.groq.com/openai/v1/chat/completions';

// Optional OpenRouter backend (free models only). The default is the same
// Nemotron 550B that NVIDIA serves directly, reached through a second provider
// so one outage or rate limit does not stop a lane. Free ids carry the ":free"
// suffix; a paid id here would violate the no-paid-keys rule in AGENTS.md.
const OPENROUTER = process.env.OPENROUTER === '1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions';

// Optional Google Gemini backend. GEMINI_API_KEY has been configured since
// 2026-05-29 but only weekly-pdfs.yml ever used it; the shared router never
// asked, so every writer lane ignored a key it already had. The Free Tier is
// a separate daily quota from Groq/OpenRouter, and Gemini's OpenAI-compatible
// endpoint means this is the same call shape as the other hosted routes.
// Opt in per lane with GEMINI=1.
const GEMINI = process.env.GEMINI === '1';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = process.env.GEMINI_URL ||
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
function callGemini(messages, opts) {
  return callOpenAICompatible('Gemini', GEMINI_URL, GEMINI_KEY, GEMINI_MODEL, messages, opts, null, null);
}

// Optional Refuseless backend (credit-based, OpenAI-compatible). Gated behind
// REFUSELESS=1 because it is PAID, unlike the other hosted routes. It sits last
// before the local model so a free route is always tried first. Current live
// state of the owner's key on 2026-11-15: /v1/models works, the free model
// (deepseek-v4.1-flash-abliterated-free) answers 429 "free slots at capacity",
// and paid models answer 402 "insufficient credits". Enable it after a top-up.
const REFUSELESS = process.env.REFUSELESS === '1';
const REFUSELESS_KEY = process.env.REFUSELESS_API_KEY || '';
const REFUSELESS_MODEL = process.env.REFUSELESS_MODEL || 'deepseek-v4.1-flash-fast';
const REFUSELESS_URL = process.env.REFUSELESS_URL || 'https://api.refuseless.com/v1/chat/completions';
function callRefuseless(messages, opts) {
  return callOpenAICompatible('Refuseless', REFUSELESS_URL, REFUSELESS_KEY, REFUSELESS_MODEL, messages, opts, null, {
    reasoning_effort: opts.reasoningEffort || 'low'
  });
}

// Optional Token Harbor backend (OpenAI-compatible). The owner runs the free
// DeepSeek V4.1 Flash through it locally; this makes the same route available to
// the CI lanes. Nothing is hardcoded and nothing is guessed: it is skipped unless
// TOKENHARBOR=1 AND TOKENHARBOR_API_KEY AND TOKENHARBOR_URL are all set. The URL
// must be the full chat-completions endpoint (…/v1/chat/completions).
const TOKENHARBOR = process.env.TOKENHARBOR === '1';
const TOKENHARBOR_KEY = process.env.TOKENHARBOR_API_KEY || '';
const TOKENHARBOR_MODEL = process.env.TOKENHARBOR_MODEL || 'deepseek-v4.1-flash';
const TOKENHARBOR_URL = process.env.TOKENHARBOR_URL || '';
const TOKENHARBOR_MAX_TOKENS = parseInt(process.env.TOKENHARBOR_MAX_TOKENS || '14000', 10);
function callTokenHarbor(messages, opts) {
  // deepseek-v4.1-flash is a reasoning model: a small max_tokens is spent
  // entirely on hidden reasoning and returns no answer, which fails the call
  // (correctly) and pushes the lane onto the next backend. Give it a floor big
  // enough to reason AND answer, so an enabled route actually serves.
  const o = Object.assign({}, opts, { numPredict: Math.max((opts && opts.numPredict) || 0, TOKENHARBOR_MAX_TOKENS) });
  return callOpenAICompatible('TokenHarbor', TOKENHARBOR_URL, TOKENHARBOR_KEY, TOKENHARBOR_MODEL, messages, o, null, null);
}

function log(msg) { console.log('[model] ' + msg); }

function curlChat(payload) {
  const args = ['-sS', '--max-time', CURL_MAX_TIME, '-w', '\\n%{http_code}',
    HOST + '/api/chat', '-H', 'Content-Type: application/json', '-d', '@-'];
  return new Promise(function (resolve, reject) {
    const child = spawn('curl', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '', settled = false;
    const startedAt = Date.now();
    let firstByteAt = 0, lastByteAt = Date.now();
    const mon = setInterval(function () {
      const now = Date.now();
      if (now - startedAt > HARD_CAP_MIN * 60000) return fail('hard cap ' + HARD_CAP_MIN + 'min');
      if (!firstByteAt) {
        if (now - startedAt > FIRST_BYTE_MIN * 60000) return fail('no first byte in ' + FIRST_BYTE_MIN + 'min');
      } else if (now - lastByteAt > IDLE_MIN * 60000) return fail('no byte for ' + IDLE_MIN + 'min');
    }, 5000);
    function fail(why) {
      if (settled) return;
      settled = true; clearInterval(mon);
      try { child.kill('SIGKILL'); } catch (e) {}
      reject(new Error('transport: ' + why));
    }
    child.stdout.on('data', function (d) {
      if (!firstByteAt) { firstByteAt = Date.now(); log('first byte at ' + Math.round((firstByteAt - startedAt) / 1000) + 's'); }
      lastByteAt = Date.now(); out += d.toString('utf8');
      if (out.length > 32 * 1024 * 1024) fail('buffer cap');
    });
    child.stderr.on('data', function (d) { err += d.toString('utf8'); });
    child.on('error', function (e) { if (!settled) { settled = true; clearInterval(mon); reject(e); } });
    child.on('close', function (code) {
      if (settled) return;
      settled = true; clearInterval(mon);
      if (code === 0) resolve(out);
      else if (code === 7) reject(new Error('local Ollama is not reachable at 127.0.0.1:11434 (this runner has no local model installed)'));
      else reject(new Error('curl exit ' + code + ' ' + err.slice(0, 300)));
    });
    child.stdin.on('error', function () {});
    child.stdin.write(payload); child.stdin.end();
  });
}

function parseChatStream(out) {
  const lines = String(out || '').split('\n');
  let httpCode = '';
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (lines.length && /^\d{3}$/.test(lines[lines.length - 1].trim())) httpCode = lines.pop().trim();
  let text = '', thinking = '', doneReason = '';
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.charAt(0) !== '{') continue;
    try {
      const j = JSON.parse(t);
      if (j.message) {
        if (typeof j.message.content === 'string') text += j.message.content;
        if (typeof j.message.thinking === 'string') thinking += j.message.thinking;
      }
      if (typeof j.response === 'string') text += j.response;
      if (j.done && j.done_reason) doneReason = String(j.done_reason);
    } catch (e) { /* partial line */ }
  }
  return { text: text.trim() || thinking.trim(), httpCode: httpCode, doneReason: doneReason };
}

// Reasoning models (Nemotron, gpt-oss) put chain-of-thought in
// message.reasoning_content or message.reasoning and the actual answer in
// message.content. When max_tokens is too small the whole budget is spent on
// reasoning, content is empty, and finish_reason is "length". Returning the
// reasoning text would splice the model's private deliberation into a lesson,
// so that case must fail loudly and fall through to the next backend instead.
function answerText(j, label) {
  const choice = j && j.choices && j.choices[0];
  const msg = choice && choice.message;
  if (!msg) throw new Error(label + ' returned no message');
  const content = typeof msg.content === 'string' ? msg.content.trim() : '';
  if (content) return content;
  const reasoning = msg.reasoning_content || msg.reasoning;
  if (reasoning) {
    throw new Error(
      label + ' spent its whole token budget on reasoning before answering ' +
      '(finish_reason=' + (choice.finish_reason || 'unknown') + ') - raise the token budget'
    );
  }
  throw new Error(label + ' returned no text');
}

async function callGHModels(messages, opts) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, opts.timeoutMs || 240000);
  try {
    const res = await fetch(GH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GH_TOKEN,
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        model: GH_MODEL,
        messages: messages,
        temperature: opts.temperature == null ? 0.4 : opts.temperature,
        max_tokens: opts.numPredict || 2400
      }),
      signal: ctrl.signal
    });
    if (!res.ok) {
      const detail = await res.text().catch(function () { return ''; });
      throw new Error('GitHub Models HTTP ' + res.status + ' ' + detail.slice(0, 200));
    }
    const j = await res.json();
    return { text: answerText(j, 'GitHub Models'), httpCode: '200', doneReason: 'stop' };
  } finally {
    clearTimeout(timer);
  }
}

async function callNvidia(messages, opts) {
  if (!_nvModel.known && !warnedUnknownNvidia) {
    warnedUnknownNvidia = true;
    log('NVIDIA_MODEL "' + NVIDIA_MODEL + '" is not in the curated catalogue (docs/model-backends.md) - sending it anyway');
  }
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, opts.timeoutMs || 240000);
  try {
    const res = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + NVIDIA_KEY
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: messages,
        temperature: opts.temperature == null ? 0.4 : opts.temperature,
        max_tokens: Math.min(opts.numPredict || 2400, NVIDIA_MAX_TOKENS),
        // Nemotron is a reasoning model. Without this, a question batch spends
        // its whole max_tokens on private reasoning and returns empty content
        // with finish_reason=length.
        reasoning_effort: opts.reasoningEffort || 'low',
        stream: false
      }),
      signal: ctrl.signal
    });
    if (!res.ok) {
      const detail = await res.text().catch(function () { return ''; });
      // A 404 here almost always means NVIDIA has the model in playground but
      // not behind the API. Say so instead of letting it look like a bad key.
      const hint = res.status === 404 || res.status === 403
        ? ' (model may be playground-only on build.nvidia.com - check NVIDIA_MODEL)'
        : '';
      throw new Error('NVIDIA NIM HTTP ' + res.status + hint + ' ' + detail.slice(0, 200));
    }
    const j = await res.json();
    return { text: answerText(j, 'NVIDIA NIM'), httpCode: '200', doneReason: 'stop' };
  } finally {
    clearTimeout(timer);
  }
}

// One OpenAI-compatible chat call, used by the Groq and OpenRouter backends.
// Their payloads are identical to NVIDIA's; only the URL, key and headers
// differ, so a single function keeps the three routes honest about limits.
async function callOpenAICompatible(label, url, key, model, messages, opts, extraHeaders, extraBody) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, opts.timeoutMs || 240000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + key,
        ...(extraHeaders || {})
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: opts.temperature == null ? 0.4 : opts.temperature,
        max_tokens: opts.numPredict || 2400,
        stream: false,
        ...(extraBody || {})
      }),
      signal: ctrl.signal
    });
    if (!res.ok) {
      const detail = await res.text().catch(function () { return ''; });
      throw new Error(label + ' HTTP ' + res.status + ' ' + detail.slice(0, 200));
    }
    const j = await res.json();
    return { text: answerText(j, label), httpCode: '200', doneReason: 'stop' };
  } finally {
    clearTimeout(timer);
  }
}

function callGroq(messages, opts) {
  return callOpenAICompatible('Groq', GROQ_URL, GROQ_KEY, GROQ_MODEL, messages, opts, null, {
    reasoning_effort: opts.reasoningEffort || 'low'
  });
}

function callOpenRouter(messages, opts) {
  // OpenRouter asks for an identifying referer/title; they are attribution, not
  // authentication, and are safe to send from CI.
  return callOpenAICompatible('OpenRouter', OPENROUTER_URL, OPENROUTER_KEY, OPENROUTER_MODEL, messages, opts, {
    'HTTP-Referer': 'https://vlymbooq.qzz.io',
    'X-Title': 'vlymbooq study course'
  }, {
    reasoning: { effort: opts.reasoningEffort || 'low' }
  });
}

// The OpenCode CLI takes one prompt, not a message array. Keep the role labels
// so a system instruction is not silently merged into the user turn.
function flattenPrompt(messages) {
  return (messages || []).map(function (m) {
    const role = m && m.role === 'system' ? 'SYSTEM' : 'USER';
    return role + ':\n' + String((m && m.content) || '');
  }).join('\n\n');
}

async function callLLM(messages, opts) {
  opts = opts || {};
  if (FAKE) return { text: FAKE, doneReason: 'stop' };

  // When every free backend is rate-limited (HTTP 429), retry the whole
  // chain after a backoff instead of failing immediately. Quotas can reset
  // between retries (daily token limits roll at midnight, per-minute limits
  // roll in seconds). Keep the total wall-clock bounded so a lane never
  // hangs waiting for a quota that will not reset in this run.
  const MAX_RETRIES = 3;
  const BACKOFF_BASE_MS = 15000; // 15s, 30s, 45s
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const waitMs = BACKOFF_BASE_MS * attempt;
      log('all backends failed on attempt ' + attempt + ' (' + String(lastError && lastError.message || '').slice(0, 120) + '); retrying in ' + (waitMs / 1000) + 's...');
      await new Promise(function (resolve) { setTimeout(resolve, waitMs); });
    }
    try {
      return await callLLMOnce(messages, opts);
    } catch (e) {
      lastError = e;
      // Only retry on 429 (rate limit) or 5xx (server error). A 400/401/403
      // means the backend is configured wrong and will not recover.
      const msg = String(e.message || '');
      const isRetryable = /429|5\d\d/.test(msg);
      if (!isRetryable || attempt === MAX_RETRIES) throw e;
    }
  }
  throw new Error('MODEL_UNAVAILABLE: all backends exhausted after ' + (MAX_RETRIES + 1) + ' attempts; last error: ' + String(lastError && lastError.message || '').slice(0, 120));
}

// Single attempt through the full backend chain. Extracted from the old
// callLLM body so the retry wrapper above can call it repeatedly.
async function callLLMOnce(messages, opts) {
  // The owner asked for the free DeepSeek route first. It runs through the
  // OpenCode CLI because Zen's raw API rejects free models with HTTP 429.
  // A missing CLI, exhausted free quota or any other failure falls through.
  if (opencodeZen.ENABLED && opencodeZen.KEY) {
    try {
      const zen = await opencodeZen.run(flattenPrompt(messages));
      LAST_SERVED = 'OpenCode Zen ' + opencodeZen.MODEL;
      log('served by OpenCode Zen ' + opencodeZen.MODEL);
      return zen;
    } catch (e) {
      log('OpenCode Zen failed (' + e.message + ') - trying the next backend');
    }
  }
  // Token Harbor (free DeepSeek V4.1 Flash), when the URL and key are provided.
  if (TOKENHARBOR && TOKENHARBOR_KEY && TOKENHARBOR_URL) {
    try {
      const th = await callTokenHarbor(messages, opts);
      LAST_SERVED = 'TokenHarbor ' + TOKENHARBOR_MODEL;
      log('served by TokenHarbor ' + TOKENHARBOR_MODEL);
      return th;
    } catch (e) {
      log('TokenHarbor failed (' + e.message + ') - trying the next backend');
    }
  }
  // Strongest free HTTP route next. The owner explicitly rejected letting the
  // 9B local model lead when a hosted key is available; GitHub Models stays
  // last because gpt-4o-mini is the weakest of the hosted options.
  if (NVAPI && NVIDIA_KEY) {
    try {
      const nv = await callNvidia(messages, opts);
      LAST_SERVED = 'NVIDIA NIM ' + NVIDIA_MODEL;
      log('served by NVIDIA NIM ' + NVIDIA_MODEL);
      return nv;
    } catch (e) {
      log('NVIDIA NIM failed (' + e.message + ') - trying the next backend');
    }
  }
  if (GEMINI && GEMINI_KEY) {
    try {
      const gm = await callGemini(messages, opts);
      LAST_SERVED = 'Gemini ' + GEMINI_MODEL;
      log('served by Gemini ' + GEMINI_MODEL);
      return gm;
    } catch (e) {
      log('Gemini failed (' + e.message + ') - trying the next backend');
    }
  }
  if (GROQ && GROQ_KEY) {
    try {
      const gq = await callGroq(messages, opts);
      LAST_SERVED = 'Groq ' + GROQ_MODEL;
      log('served by Groq ' + GROQ_MODEL);
      return gq;
    } catch (e) {
      log('Groq failed (' + e.message + ') - trying the next backend');
    }
  }
  if (OPENROUTER && OPENROUTER_KEY) {
    try {
      const or = await callOpenRouter(messages, opts);
      LAST_SERVED = 'OpenRouter ' + OPENROUTER_MODEL;
      log('served by OpenRouter ' + OPENROUTER_MODEL);
      return or;
    } catch (e) {
      log('OpenRouter failed (' + e.message + ') - trying the next backend');
    }
  }
  if (GH_MODELS && GH_TOKEN) {
    try {
      const gh = await callGHModels(messages, opts);
      LAST_SERVED = 'GitHub Models ' + GH_MODEL;
      log('served by GitHub Models ' + GH_MODEL);
      return gh;
    } catch (e) {
      log('GitHub Models failed (' + e.message + ') - falling back to Ollama ' + MODEL);
    }
  }
  if (REFUSELESS && REFUSELESS_KEY) {
    try {
      const rf = await callRefuseless(messages, opts);
      LAST_SERVED = 'Refuseless ' + REFUSELESS_MODEL;
      log('served by Refuseless ' + REFUSELESS_MODEL);
      return rf;
    } catch (e) {
      log('Refuseless failed (' + e.message + ') - falling back to Ollama ' + MODEL);
    }
  }
  const body = {
    model: MODEL, stream: true, think: false,
    options: {
      temperature: opts.temperature == null ? 0.4 : opts.temperature,
      top_p: 0.92,
      num_ctx: opts.numCtx || 8192,
      num_predict: opts.numPredict || 2400
    },
    messages: messages
  };
  let out = await curlChat(JSON.stringify(body));
  let parsed = parseChatStream(out);
  if (!parsed.text && parsed.httpCode === '400') {
    delete body.think;
    out = await curlChat(JSON.stringify(body));
    parsed = parseChatStream(out);
  }
  if (parsed.httpCode && parsed.httpCode !== '200') throw new Error('Ollama HTTP ' + parsed.httpCode);
  if (!parsed.text) throw new Error('model returned no text');
  LAST_SERVED = 'Ollama ' + MODEL;
  return parsed;
}

// Local models occasionally emit JSON with a raw newline inside a string, a
// trailing comma, or a truncated final object. JSON.parse rejects the whole
// batch for one of those defects. Repair the text rather than discard every
// otherwise usable question: escape control characters inside strings, drop
// trailing commas, and close an unterminated string/object/array.
function repairJsonText(text) {
  const s = String(text || '');
  let out = '';
  let inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) { out += c; esc = false; continue; }
      if (c === '\\') { out += c; esc = true; continue; }
      if (c === '"') { out += c; inStr = false; continue; }
      if (c === '\n') { out += '\\n'; continue; }
      if (c === '\r') { out += '\\r'; continue; }
      if (c === '\t') { out += '\\t'; continue; }
      if (c < ' ') { out += ' '; continue; }
      out += c;
      continue;
    }
    if (c === '"') { inStr = true; out += c; continue; }
    out += c;
  }
  out = out.replace(/,\s*([}\]])/g, '$1');
  if (inStr) out += '"';
  // Close whatever nesting the model left open (truncated output).
  const stack = [];
  inStr = false; esc = false;
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') stack.pop();
  }
  while (stack.length) {
    const open = stack.pop();
    out = out.replace(/,\s*$/, '');
    out += open === '{' ? '}' : ']';
  }
  return out;
}

function parseJsonLoose(text) {
  const s = String(text || '').trim();
  try { return JSON.parse(s); } catch (e) {}
  try { return JSON.parse(repairJsonText(s)); } catch (e) {}
  return null;
}

function extractArray(text) {
  const s = String(text || '');
  const a = s.indexOf('[');
  if (a === -1) throw new Error('no JSON array in model output');
  const b = s.lastIndexOf(']');
  const slice = b > a ? s.slice(a, b + 1) : s.slice(a);
  const parsed = parseJsonLoose(slice);
  if (Array.isArray(parsed)) return parsed;
  // A repaired truncated array may still contain usable complete objects.
  const items = extractLooseItems(slice);
  if (items.length) return items;
  throw new Error('no parseable JSON array in model output');
}

function extractLooseItems(text) {
  const s = String(text || ''), items = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') { if (depth === 0) start = i; depth++; continue; }
    if (c === '}' && depth > 0) {
      depth--;
      if (depth === 0 && start !== -1) {
        const obj = parseJsonLoose(s.slice(start, i + 1));
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) items.push(obj);
        start = -1;
      }
    }
  }
  // Salvage a final object the model never closed.
  if (depth > 0 && start !== -1) {
    const obj = parseJsonLoose(s.slice(start));
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) items.push(obj);
  }
  return items;
}

async function callArray(messages, opts, tag) {
  const first = await callLLM(messages, opts);
  try {
    const arr = extractArray(first.text);
    if (arr.length) return arr;
    // A reasoning model can obey the JSON instruction yet return []. Treat that
    // as a failed generation, not a valid empty batch: the caller would silently
    // produce a paper with zero model questions.
    log(tag + ': model returned an empty array - retrying. raw=' + String(first.text || '').slice(0, 500));
    const retryEmpty = await callLLM(messages.concat([
      { role: 'assistant', content: String(first.text).slice(0, 500) },
      { role: 'user', content: 'Your previous reply was an empty array. Return a NON-EMPTY JSON array of the requested NEW questions. Never return [].' }
    ]), { temperature: 0.3, numPredict: opts && opts.numPredict });
    const arr2 = extractArray(retryEmpty.text);
    if (arr2.length) return arr2;
    throw new Error('model returned an empty array twice');
  } catch (e) {
    const salvaged = extractLooseItems(first.text);
    if (salvaged.length) { log(tag + ': salvaged ' + salvaged.length + ' item(s)'); return salvaged; }
    const retry = await callLLM(messages.concat([
      { role: 'assistant', content: String(first.text).slice(0, 500) },
      { role: 'user', content: 'Return ONLY a valid JSON array. Start with [ and end with ]. No prose, no markdown.' }
    ]), { temperature: 0.3, numPredict: opts && opts.numPredict });
    try { return extractArray(retry.text); }
    catch (e2) {
      const s2 = extractLooseItems(retry.text);
      if (s2.length) return s2;
      throw e2;
    }
  }
}

const LEAK = [
  [/the question has been updated/i, 'repair note'],
  [/provide a valid question/i, 'repair note'],
  [/let'?s use\s*:/i, 'rewrite marker'],
  [/as an ai (?:language )?model/i, 'AI identity'],
  [/i (?:cannot|can'?t|can not) (?:provide|answer|solve)/i, 'refusal'],
  [/\bwait\s*[,!.…]/i, 'self-correction'],
  [/\blet'?s\s+(?:change|adjust|fix|try|assume|construct|revise)/i, 'rewrite marker'],
  [/\b(?:hmm|okay)\b[,.]/i, 'filler'],
  [/\bon second thought\b/i, 'self-correction'],
  [/\bnot in (?:the )?options\b/i, 'option fitting'],
  [/\bto match (?:the )?options?\b/i, 'option fitting']
];

function leak(text) {
  const s = String(text == null ? '' : text);
  for (const p of LEAK) if (p[0].test(s)) return p[1];
  return '';
}

function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

module.exports = { HOST: HOST, MODEL: MODEL, NVIDIA_MODEL: NVIDIA_MODEL, GROQ_MODEL: GROQ_MODEL, OPENROUTER_MODEL: OPENROUTER_MODEL, transportGuards: transportGuards, log: log, callLLM: callLLM, callArray: callArray, extractArray: extractArray, extractLooseItems: extractLooseItems, parseJsonLoose: parseJsonLoose, repairJsonText: repairJsonText, leak: leak, clean: clean, norm: norm, lastServed: function () { return LAST_SERVED; } };
