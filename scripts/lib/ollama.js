// Server-side Ollama client shared by the model-only paper lanes.
// The model runs on the GitHub runner; no API key is involved.
const { spawn } = require('child_process');

const HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:9b';
const FAKE = process.env.OD_FAKE_TEXT || '';

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
// Model ids, as published by NVIDIA on 2026-11-13:
//   moonshotai/kimi-k3          callable
//   moonshotai/kimi-k3.1-pro    403/404 - build.nvidia.com states "API access
//                               for this model is not available yet ... no API
//                               key will authorize it". Playground only, so it
//                               is deliberately NOT the default here.
const NVAPI = process.env.NVAPI === '1';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'moonshotai/kimi-k3';
const NVIDIA_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_URL = process.env.NVIDIA_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MAX_TOKENS = 16384;

function log(msg) { console.log('[model] ' + msg); }

function curlChat(payload) {
  const args = ['-sS', '--max-time', '5400', '-w', '\\n%{http_code}',
    HOST + '/api/chat', '-H', 'Content-Type: application/json', '-d', '@-'];
  return new Promise(function (resolve, reject) {
    const child = spawn('curl', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '', settled = false;
    const startedAt = Date.now();
    let firstByteAt = 0, lastByteAt = Date.now();
    const mon = setInterval(function () {
      const now = Date.now();
      if (now - startedAt > 55 * 60000) return fail('hard cap 55min');
      if (!firstByteAt) {
        if (now - startedAt > 25 * 60000) return fail('no first byte in 25min');
      } else if (now - lastByteAt > 12 * 60000) return fail('no byte for 12min');
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
      if (code === 0) resolve(out); else reject(new Error('curl exit ' + code + ' ' + err.slice(0, 300)));
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
    const text = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!text) throw new Error('GitHub Models returned no text');
    return { text: String(text).trim(), httpCode: '200', doneReason: 'stop' };
  } finally {
    clearTimeout(timer);
  }
}

async function callNvidia(messages, opts) {
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
    const text = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!text) throw new Error('NVIDIA NIM returned no text');
    return { text: String(text).trim(), httpCode: '200', doneReason: 'stop' };
  } finally {
    clearTimeout(timer);
  }
}

async function callLLM(messages, opts) {
  opts = opts || {};
  if (FAKE) return { text: FAKE, doneReason: 'stop' };
  if (GH_MODELS && GH_TOKEN) {
    try {
      const gh = await callGHModels(messages, opts);
      log('served by GitHub Models ' + GH_MODEL);
      return gh;
    } catch (e) {
      log('GitHub Models failed (' + e.message + ') - falling back to Ollama ' + MODEL);
    }
  }
  if (NVAPI && NVIDIA_KEY) {
    try {
      const nv = await callNvidia(messages, opts);
      log('served by NVIDIA NIM ' + NVIDIA_MODEL);
      return nv;
    } catch (e) {
      log('NVIDIA NIM failed (' + e.message + ') - falling back to Ollama ' + MODEL);
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
  try { return extractArray(first.text); }
  catch (e) {
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

module.exports = { HOST: HOST, MODEL: MODEL, NVIDIA_MODEL: NVIDIA_MODEL, log: log, callLLM: callLLM, callArray: callArray, extractArray: extractArray, extractLooseItems: extractLooseItems, parseJsonLoose: parseJsonLoose, repairJsonText: repairJsonText, leak: leak, clean: clean, norm: norm };
