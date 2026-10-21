#!/usr/bin/env node
'use strict';
/**
 * Invent Questions — the site's own exam-setter agent.
 *
 * What this is NOT: a template bank. Nothing here is procedurally generated
 * from wired-in formulas. Instead, the CI model (qwen3.5:9b) is briefed like
 * a veteran Indian exam setter — section, difficulty, novelty rules — and
 * asked to INVENT one brand-new question at a time: new context, new twist,
 * new framing, with a worked solution. Output is validated hard (4 distinct
 * options, answer present, solvable-looking, no duplicates) and stored in
 * data/invented/questions.json, which mental.html serves as live practice.
 *
 * Novelty memory: every accepted question records a `style` label and
 * `topic`. Each new brief lists the styles/topics already used, so the agent
 * keeps inventing fresh mechanisms instead of re-asking the same question.
 * A 70% word-overlap filter (same rule as the rest of the site) drops any
 * accidental repeat before it can reach storage.
 *
 * Env:
 *   OLLAMA_MODEL        default qwen3.5:9b
 *   OLLAMA_HOST         default http://127.0.0.1:11434
 *   INVENT_PER_SLOT     questions per section x difficulty (default 2)
 *   INVENT_NUM_CTX      model context window (default 8192; the 27B quality
 *                       lane runs 4096 — the briefs fit and CPU prompt-eval
 *                       halves)
 *   INVENT_NUM_PREDICT  max generated tokens per question (default 1600; the
 *                       27B lane runs 1200 — solutions are briefed to 8 lines)
 *   INVENT_DEADLINE_MIN wall-clock budget for inventing (default 95)
 *   INVENT_FIRST_BYTE_MIN patience waiting for the first streamed byte (default 25)
 *   INVENT_STALL_MIN    mid-stream silence that counts as wedged (default 12)
 *   INVENT_CALL_CAP_MIN absolute per-call cap in minutes (default 95)
 *   INVENT_MAX_STORE    max questions kept (default 1200)
 *   INVENT_OUT          override output path (for tests)
 *   INVENT_FAKE_LLM=1   no model needed — canned responses for local tests
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:9b';
const HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const PER_SLOT = Math.max(1, parseInt(process.env.INVENT_PER_SLOT || '2', 10) || 2);
const NUM_CTX = Math.max(1024, parseInt(process.env.INVENT_NUM_CTX || '8192', 10) || 8192);
const NUM_PREDICT = Math.max(256, parseInt(process.env.INVENT_NUM_PREDICT || '1600', 10) || 1600);
const DEADLINE_MIN = parseFloat(process.env.INVENT_DEADLINE_MIN || '95') || 95;
const MAX_STORE = parseInt(process.env.INVENT_MAX_STORE || '1200', 10) || 1200;
const OUT_FILE = process.env.INVENT_OUT || path.join('data', 'invented', 'questions.json');
const FAKE = process.env.INVENT_FAKE_LLM === '1';
const RUN = process.env.GITHUB_RUN_NUMBER || String(Date.now());
// Run #5 burned its whole slot in a restart loop: the old undici fetch
// transport carries its own ~5-min headers timeout which fired BEFORE our
// 20-min abort on every cold/slow call, surfaced as "fetch failed", and the
// restart that "recovery" triggered killed the model load in progress — so
// the cold load could never finish. Transport is now curl via spawn (no
// hidden headers wall) with watchdogs: silence before the first byte is
// normal on CPU (25 min = cold load + prompt eval), a 12-min mid-stream
// stall means wedged, and 95 min is nobody-legitimate-needs-more.
const RUN_STARTED = Date.now();
const FIRST_BYTE_MIN = parseFloat(process.env.INVENT_FIRST_BYTE_MIN || '25') || 25;
const STALL_MIN = parseFloat(process.env.INVENT_STALL_MIN || '12') || 12;
const CALL_CAP_MIN = parseFloat(process.env.INVENT_CALL_CAP_MIN || '95') || 95;

const SECTIONS = ['quant', 'reasoning', 'english'];
const TIERS = ['easy', 'moderate', 'hard', 'veryhard'];
// Exam-realistic clock per difficulty, served by the mental page as timeLimit.
const TIER_SECONDS = { easy: 40, moderate: 50, hard: 65, veryhard: 90 };

const TIER_BRIEF = {
  easy: 'Single concept, one direct step. A prepared candidate answers in under 35 seconds. Distractors are off-by-one / common-slip answers.',
  moderate: 'Two steps or one concept with a small twist. 40-60 seconds in the exam. Distractors are the two most common partial answers.',
  hard: 'Three or more steps, or two concepts combined, or data that needs a small model. 60-90 seconds. One distractor is the answer a hasty solver computes.',
  veryhard: 'Multi-concept, counter-intuitive, or an extended mini-caselet. 90-150 seconds. Only the careful method reaches the answer; every distractor is a believable trap.'
};

const SECTION_BRIEF = {
  quant: 'QUANTITATIVE APTITUDE (bank/SSC syllabus: arithmetic, percentages, profit-loss, SI/CI, ratio, mixtures, time-work, time-speed-distance, boats, mensuration, number series, DI). Numbers MUST be self-consistent — mentally verify every calculation before writing the options.',
  reasoning: 'REASONING (number/letter series, coding-decoding, syllogism, blood relations, direction sense, ranking/order, seating/puzzles, clock/calendar, analogy). The logical chain must be airtight — exactly one conclusion follows.',
  english: 'ENGLISH (vocabulary in context, synonym/antonym, error spotting, sentence improvement, cloze, idioms, one-word substitution, connectors, fillers). Exactly one option must be defensibly correct for a standard exam key.'
};

function log() { console.log.apply(console, arguments); }
function nowISO() { return new Date().toISOString(); }

// ── store ────────────────────────────────────────────────────────────────
function loadStore() {
  try {
    const j = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    if (j && Array.isArray(j.questions)) return j;
  } catch (e) { /* first run */ }
  return { generatedAt: null, model: MODEL, version: 1, questions: [] };
}
function saveStore(store) {
  store.generatedAt = nowISO();
  store.model = MODEL;
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(store) + '\n');
}

// ── model call ───────────────────────────────────────────────────────────
let fakeN = 0;
async function callFake() {
  fakeN++;
  if (fakeN % 7 === 0) {
    // deliberately broken shape — must be rejected and retried
    return JSON.stringify({ stem: 'bad shape', options: ['x', 'y'], answer: 'z', solution: '' });
  }
  const n = fakeN;
  const variant = n % 4;
  const u = 'zq' + n.toString(36) + 'k'; // unique marker token: keeps fake stems distinct
  if (variant === 0) {
    const speed = 30 + (n % 40), hours = 2 + (n % 4), dist = speed * hours;
    return JSON.stringify({
      topic: 'train travel ' + u, style: 'staggered train mechanism ' + u,
      stem: 'Train marker ' + u + ': a wagon rolls at ' + speed + ' km/h for ' + hours + ' hours. How far?',
      options: [String(dist), String(dist + 15), String(dist - 15), String(dist + 30)],
      answer: String(dist), solution: 'Distance = ' + speed + ' x ' + hours + ' = ' + dist + ' km.', hint: 'distance = speed x time',
      importance: n % 8 === 0 ? 'high' : 'medium', importantFor: ['IBPS PO', 'SBI PO']
    });
  }
  if (variant === 1) {
    const men = 4 + (n % 6), days = 6 + (n % 7), total = men * days;
    return JSON.stringify({
      topic: 'work crew ' + u, style: 'inverse work mechanism ' + u,
      stem: 'Crew marker ' + u + ': ' + men + ' masons finish a wall in ' + days + ' days. How many man-days is the job?',
      options: [String(total), String(total + men), String(total - days), String(total + men + days)],
      answer: String(total), solution: 'Man-days = ' + men + ' x ' + days + ' = ' + total + '.', hint: 'men x days'
    });
  }
  if (variant === 2) {
    const price = 200 + (n % 13) * 50, disc = 10 + (n % 4) * 5, pay = price - Math.round(price * disc / 100);
    return JSON.stringify({
      topic: 'discount shelf ' + u, style: 'single discount mechanism ' + u,
      stem: 'Shop marker ' + u + ': a lamp marked Rs ' + price + ' sells at ' + disc + '% off. What is the selling price?',
      options: ['Rs ' + pay, 'Rs ' + (pay + 25), 'Rs ' + (pay - 25), 'Rs ' + (pay + 50)],
      answer: 'Rs ' + pay, solution: 'SP = ' + price + ' - ' + disc + '% = Rs ' + pay + '.', hint: 'SP = MP - discount'
    });
  }
  const r1 = 2 + (n % 5), r2 = r1 + 1 + (n % 4), mult = 3 + (n % 6), red = r1 * mult, blue = r2 * mult;
  return JSON.stringify({
    topic: 'colour ratio ' + u, style: 'part-part ratio mechanism ' + u,
    stem: 'Bag marker ' + u + ': red and blue beads sit in ratio ' + r1 + ':' + r2 + ' with ' + red + ' red beads. How many blue beads?',
    options: [String(blue), String(blue + r1), String(blue - r1), String(blue + r2)],
    answer: String(blue), solution: 'Blue = ' + red + ' x ' + r2 + '/' + r1 + ' = ' + blue + '.', hint: 'scale the ratio'
  });
}

// ── server liveness ──────────────────────────────────────────────────────
// With the curl transport in place, a transport failure genuinely means the
// server is unreachable (exit 7/52/56) or a call was wedge-killed by a
// watchdog (status 28): one in-place restart is attempted, and if the
// server stays down the run fails fast instead of burning the deadline.
// (Invent #3 retried into a dead socket for 70+ minutes because "fetch
// failed" could not tell a dead server from undici's own timeout.)
let transportFails = 0;
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function probeServer() {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(HOST + '/api/tags', { signal: ctl.signal });
    return res.ok;
  } catch (e) { return false; }
  finally { clearTimeout(timer); }
}
async function reviveServer() {
  // Hard restart, always. A wedged server can still answer /api/tags while
  // the model runner behind it is dead, and curl abandoning a call does NOT
  // stop the server-side generation (it keeps holding the model lock). One
  // pkill + fresh serve clears the zombie work; the first call after this
  // pays a cold model load — the 25-min first-byte allowance is sized for it.
  log('[invent] Ollama transport failures — hard restarting ollama serve');
  try {
    execSync('pkill -f "ollama serve" 2>/dev/null; sleep 2; OLLAMA_KEEP_ALIVE=60m nohup ollama serve >> /tmp/ollama.log 2>&1 &', { stdio: 'ignore', timeout: 20000 });
  } catch (e) { /* the wait below decides */ }
  for (let i = 0; i < 90; i++) {
    await sleep(1000);
    if (await probeServer()) { log('[invent] Ollama back up after ' + (i + 1) + 's — cold load expected on the next call'); return true; }
  }
  return false;
}

// One HTTP attempt at the chat endpoint, STREAMING via spawn + watchdogs
// (mirrors site-agent.js — its failure history shaped these exact rules).
// stream:false returns zero bytes until every token finishes (5-15+ min on
// CPU), so absolute time caps murdered healthy generations; instead allow
// 25 min of silence BEFORE the first byte (that is just cold load + prompt
// eval), then only treat real stalls (12 min with no byte mid-stream) as
// wedged. Killing curl does NOT stop the server-side generation, which is
// why a wedge-kill carries restart:true so the caller restarts serve first.
function curlChat(payload) {
  const args = [
    '-sS', '--max-time', '5400', '-w', '\\n%{http_code}',
    HOST + '/api/chat',
    '-H', 'Content-Type: application/json',
    '-d', '@-'
  ];
  return new Promise((resolve, reject) => {
    const child = spawn('curl', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let stderr = '';
    const startedAt = Date.now();
    let firstByteAt = 0;
    let lastByteAt = Date.now();
    let settled = false;

    function fail(why, status) {
      if (settled) return;
      settled = true;
      clearInterval(mon);
      try { child.kill('SIGKILL'); } catch (e) { /* ignore */ }
      const err = new Error('stream monitor: ' + why);
      err.status = status === undefined ? 28 : status;
      if (err.status !== 'DEADLINE') { err.restart = true; err.transport = true; }
      err.stdout = out.slice(0, 2000);
      err.stderr = stderr.slice(0, 400);
      reject(err);
    }

    const mon = setInterval(() => {
      const now = Date.now();
      if (now - RUN_STARTED > DEADLINE_MIN * 60000) return fail('invent deadline reached mid-call', 'DEADLINE');
      if (now - startedAt > CALL_CAP_MIN * 60000) return fail('hard cap ' + CALL_CAP_MIN + 'min');
      if (!firstByteAt) {
        if (now - startedAt > FIRST_BYTE_MIN * 60000) return fail('no first byte in ' + FIRST_BYTE_MIN + 'min (cold load/prompt eval over budget)');
      } else if (now - lastByteAt > STALL_MIN * 60000) {
        return fail('no byte for ' + STALL_MIN + 'min mid-stream (wedged)');
      }
    }, 5000);

    child.stdout.on('data', d => {
      if (!firstByteAt) {
        firstByteAt = Date.now();
        log('[invent] LLM first byte at ' + Math.round((firstByteAt - startedAt) / 1000) + 's');
      }
      lastByteAt = Date.now();
      out += d.toString('utf8');
      if (out.length > 32 * 1024 * 1024) fail('buffer cap 32MB');
    });
    child.stderr.on('data', d => { stderr += d.toString('utf8'); });
    child.on('error', err => { if (!settled) { settled = true; clearInterval(mon); reject(err); } });
    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearInterval(mon);
      if (code === 0) resolve(out);
      else {
        const err = new Error('curl exit ' + code);
        err.status = code;
        if (code === 28) { err.restart = true; err.transport = true; }
        else if (code === 7 || code === 52 || code === 56) err.transport = true;
        err.stdout = out.slice(0, 2000);
        err.stderr = stderr.slice(0, 400);
        reject(err);
      }
    });
    child.stdin.on('error', () => { /* curl died before reading stdin */ });
    child.stdin.write(payload);
    child.stdin.end();
  });
}

// Parse an NDJSON chat stream: accumulate message.content deltas (thinking
// may arrive per-chunk or at the end), plus the legacy response field; curl
// appends the HTTP code as a final line via -w. Returns {text, httpCode}.
function parseChatStream(out) {
  const lines = String(out || '').split('\n');
  let httpCode = '';
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  if (lines.length && /^\d{3}$/.test(lines[lines.length - 1].trim())) {
    httpCode = lines.pop().trim();
  }
  let content = '', thinking = '';
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.charAt(0) !== '{') continue;
    try {
      const j = JSON.parse(t);
      if (j.message) {
        if (typeof j.message.content === 'string') content += j.message.content;
        if (typeof j.message.thinking === 'string') thinking += j.message.thinking;
      }
      if (typeof j.response === 'string') content += j.response;
    } catch (e) { /* partial line; ignore */ }
  }
  return { text: content.trim() || thinking.trim(), httpCode: httpCode };
}

async function callLLM(system, user) {
  if (FAKE) return callFake();
  const payload = JSON.stringify({
    model: MODEL,
    stream: true,
    think: false,
    options: { temperature: 0.95, top_p: 0.92, num_ctx: NUM_CTX, num_predict: NUM_PREDICT },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });
  let out = await curlChat(payload);
  let parsed = parseChatStream(out);
  if (!parsed.text && parsed.httpCode === '400') {
    // Older daemons reject think:false with HTTP 400 — one clean retry
    // without the parameter (same hatch as site-agent.js).
    log('[invent] Ollama rejected think:false (HTTP 400) — retrying without the parameter');
    out = await curlChat(JSON.stringify(Object.assign(JSON.parse(payload), { think: undefined })));
    parsed = parseChatStream(out);
  }
  if (parsed.httpCode && parsed.httpCode !== '200') throw new Error('HTTP ' + parsed.httpCode);
  return parsed.text || '';
}

// ── parsing + validation ─────────────────────────────────────────────────
function extractJson(text) {
  if (!text) return null;
  let t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const s = t.indexOf('{');
  if (s < 0) return null;
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = s; i < t.length; i++) {
    const ch = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
  }
  if (end < 0) return null;
  const slice = t.slice(s, end + 1);
  try { return JSON.parse(slice); } catch (e) { /* fall through to the repair pass */ }
  // Repair pass: at temperature 0.95 the model regularly emits JSON that is
  // one hair off — most often a literal newline/tab inside the long
  // "solution" string (raw control characters are invalid JSON), sometimes a
  // trailing comma. That single flaw rejected roughly half of the invent
  // calls with 'unparseable JSON' (run #10, 2026-10-18) while the content
  // itself was complete and good. Escape control characters inside strings,
  // drop trailing commas, parse again.
  let rout = '', rinStr = false, resc = false;
  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    if (rinStr) {
      if (resc) { rout += ch; resc = false; continue; }
      if (ch === '\\') { rout += ch; resc = true; continue; }
      if (ch === '"') { rout += ch; rinStr = false; continue; }
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        rout += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t' : ' ';
        continue;
      }
      rout += ch; continue;
    }
    if (ch === '"') { rinStr = true; rout += ch; continue; }
    rout += ch;
  }
  try { return JSON.parse(rout.replace(/,\s*([}\]])/g, '$1')); } catch (e2) { return null; }
}

const STOP = new Set(('the a an and or of in on at to for from with is are was were be been being ' +
  'this that these those it its his her their our your my me him us them we you they he she i ' +
  'as by not no so than too very can will would shall should may might must do does did ' +
  'what how which who when where why much many far each per if then also').split(' '));
function tokens(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9%\s.]/g, ' ').split(/\s+/)
    .filter(w => (w.length > 2 && !STOP.has(w)) || /^[0-9]+$/.test(w));
}
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach(x => { if (B.has(x)) inter++; });
  return inter / (A.size + B.size - inter);
}

// ── quality gates (2026-10-21) ───────────────────────────────────────────
// Owner report: invented "fresh paper" questions on mental.html had a stem
// and an answer that did not belong together. Root cause: the 9b solver's
// self-repair loop ("Wait, let's re-calculate...", "Option not available.
// Let's change numbers.") leaked into the shipped solution, and the key was
// often copied from a rewritten version of the question. 50 of the 94 pool
// items were defective. A polished solution never negotiates with itself, so
// any self-repair marker rejects the item before it can be stored.
const THINK_LEAK = [
  [/\bwait\s*[,!.…]/i, 'self-correction pause'],
  [/\blet'?s\s+(?:change|adjust|fix|try|assume|construct|revise|re-?do|make)\b/i, 'rewrite marker'],
  [/\blet me\s+(?:re|adjust|fix|change|try)/i, 'rewrite marker'],
  [/\b(?:my|the) (?:calculation|answer|previous (?:answer|step|attempt)) (?:is|was) wrong\b/i, 'wrong-answer note'],
  [/\boptions?\s+(?:is|are)?\s*not available\b/i, 'missing-option note'],
  [/\bdoes(?:n't| not) match (?:the )?(?:options|choices)\b/i, 'missing-option note'],
  [/\bi (?:made|make) an? (?:error|mistake)\b/i, 'error note'],
  [/\bre-?(?:calculat|evaluat|read|check|compute)/i, 'recheck marker'],
  [/\brevised (?:question|stem|scenario|calculation)\b/i, 'rewrite marker'],
  [/\bfor (?:self-)?consistency with (?:the )?options\b/i, 'option fitting'],
  [/\bto match (?:the )?options?\b/i, 'option fitting'],
  [/\b(?:correction|correct logic)\s*:/i, 'correction note'],
  [/\bthought (?:process|trace)\b/i, 'thinking trace'],
  [/\bfinal consistent scenario\b/i, 'rewrite marker'],
  [/\bthe (?:question|stem) (?:needs|should) (?:to be|be)\b/i, 'rewrite marker'],
  [/\b(?:hmm|okay)\b[,.]/i, 'filler marker'],
  [/\bactually\s*,/i, 'self-correction'],
  [/\bon second thought\b/i, 'self-correction'],
  [/\bno clear pattern\b/i, 'dead-end note'],
  [/\bthis is (?:hard|tricky)\b/i, 'dead-end note'],
  [/\bmental arithmetic\b/i, 'trace marker'],
  [/\brestart(?:ing)? (?:the )?(?:calculation|logic)\b/i, 'restart marker'],
  [/\badjust(?:ing)? (?:the )?(?:numbers|stem|question)/i, 'rewrite marker'],
  [/\bnot in (?:the )?options\b/i, 'option fitting'],
  [/\bmy setup was wrong\b/i, 'self-correction']
];
function solutionLeak(text) {
  const s = String(text == null ? '' : text);
  for (const p of THINK_LEAK) { if (p[0].test(s)) return p[1]; }
  return '';
}
// Numbers in text, commas removed ("₹10,000" -> 10000).
function numbersIn(text) {
  return (String(text == null ? '' : text).match(/\d[\d,]*(?:\.\d+)?/g) || [])
    .map(x => Number(x.replace(/,/g, '')))
    .filter(n => isFinite(n));
}
function meaningfulNumbers(nums) {
  return nums.filter(n => Math.abs(n) >= 10 || !Number.isInteger(n));
}
// A solution that never repeats a single given number is a solution to a
// different question (observed: a 200 km / 80-60 kmph stem solved with 36 km
// and 9 kmph; a ₹10,000 / 12% loan solved with ₹5,000 / 10%). If the stem
// supplies at least two distinct numbers, the working must use one of them.
function solutionUsesStemNumbers(stem, solution) {
  const given = meaningfulNumbers(numbersIn(stem));
  if (new Set(given).size < 2) return true;
  const sol = numbersIn(solution);
  return given.some(g => sol.some(n => Math.abs(n - g) < 1e-9));
}
// The answer's number must appear in the working ("C) 20 months" -> 20);
// otherwise the key and the shown steps describe different results
// (observed: a 3.45-year computation shipped with key "20 months").
function answerEchoed(answer, solution) {
  const a = numbersIn(answer);
  if (!a.length) return true;
  const key = a[a.length - 1];
  return numbersIn(solution).some(n => Math.abs(n - key) < 1e-9);
}
function optionsAreBareLetters(options) {
  return options.every(o => /^[A-D]\.?$/i.test(String(o).trim()));
}

function validate(raw, section, tier, recentTokenSets) {
  const t = extractJson(raw);
  if (!t) return { ok: false, why: 'unparseable JSON' };
  const stem = String(t.stem || t.question || '').trim();
  const solution = String(t.solution || t.explanation || '').trim();
  const style = String(t.style || '').trim();
  const topic = String(t.topic || '').trim();
  // Exam-relevance tags (optional but asked for; never a rejection reason —
  // a valid question is never thrown away over a label).
  const impRaw = String(t.importance || '').trim().toLowerCase();
  const importance = (impRaw === 'high' || impRaw === 'medium' || impRaw === 'low') ? impRaw : '';
  const importantFor = Array.isArray(t.importantFor)
    ? t.importantFor.map(x => String(x == null ? '' : x).trim()).filter(Boolean).slice(0, 3)
    : [];
  if (stem.length < 15 || stem.length > 900) return { ok: false, why: 'stem length ' + stem.length };
  if (/^bad shape/i.test(stem)) return { ok: false, why: 'malformed fields' };
  if (section === 'quant' && !/\d/.test(stem)) return { ok: false, why: 'quant stem has no numbers' };
  if (!Array.isArray(t.options)) return { ok: false, why: 'options missing' };
  let options = t.options.map(o => String(o == null ? '' : o).trim()).filter(o => o.length > 0);
  if (options.length !== 4) return { ok: false, why: 'options count ' + options.length };
  if (new Set(options.map(o => o.toLowerCase())).size !== 4) return { ok: false, why: 'duplicate options' };
  let answer = String(t.answer == null ? '' : t.answer).trim();
  if (!answer) return { ok: false, why: 'answer missing' };
  let idx = options.findIndex(o => o === answer);
  if (idx < 0) idx = options.findIndex(o => o.toLowerCase() === answer.toLowerCase());
  if (idx < 0) return { ok: false, why: 'answer not among options' };
  answer = options[idx];
  if (solution.length < 8) return { ok: false, why: 'solution too short' };
  // Thinking-leak gate: a solution that argues with itself is a trace, not
  // an answer a student should read.
  const leak = solutionLeak(solution + '\n' + String(t.hint || ''));
  if (leak) return { ok: false, why: 'solution leak: ' + leak };
  // Numeric consistency gates (quant only - the rules are meaningless for
  // word-based English items).
  if (section === 'quant') {
    if (!solutionUsesStemNumbers(stem, solution)) return { ok: false, why: 'solution uses none of the stem numbers' };
    if (!answerEchoed(answer, solution)) return { ok: false, why: 'answer value absent from the solution' };
    if (optionsAreBareLetters(options)) return { ok: false, why: 'quant options are only letters' };
  }
  if (/matrix/i.test(stem) && !/\d/.test(stem)) return { ok: false, why: 'matrix stem without data' };
  if (!style) return { ok: false, why: 'style label missing' };
  // 70% word-overlap dedupe against the store (standing site rule)
  const tk = tokens(stem);
  const key = tk.slice(0, 6).join(' ');
  for (let i = 0; i < recentTokenSets.length; i++) {
    if (recentTokenSets[i].key === key || jaccard(tk, recentTokenSets[i].tokens) >= 0.7) {
      return { ok: false, why: 'duplicate (70% overlap rule)' };
    }
  }
  return {
    ok: true,
    q: {
      stem: stem,
      options: options,
      answer: answer,
      solution: solution,
      hint: String(t.hint || '').trim().slice(0, 160),
      section: section,
      difficulty: tier,
      style: style.slice(0, 90),
      topic: topic.slice(0, 70),
      importance: importance,
      importantFor: importantFor,
      seconds: TIER_SECONDS[tier],
      inventedAt: nowISO(),
      model: FAKE ? 'fake-llm' : MODEL,
      run: RUN
    },
    tokenSet: { key: key, tokens: tk }
  };
}

function buildPrompt(store, section, tier, attempt, priorFailures) {
  const recentStyles = store.questions.slice(-50).map(q => q.style).filter(Boolean).slice(-14);
  const recentTopics = store.questions.slice(-30).map(q => q.topic).filter(Boolean).slice(-10);
  const lastStems = store.questions.slice(-4).map(q => String(q.stem).slice(0, 110));
  return [
    'You are a veteran Indian exam question setter (IBPS PO/Clerk, SBI, SSC CGL, RRB NTPC, State PSC).',
    'INVENT one completely ORIGINAL multiple-choice question. Do not recall or copy any known exam question — create a new context, new numbers, a new twist.',
    '',
    'SECTION: ' + SECTION_BRIEF[section],
    'DIFFICULTY (' + tier + '): ' + TIER_BRIEF[tier],
    '',
    'NOVELTY RULES:',
    '- The "style" is the question MECHANISM (framing + twist). Invent a NEW mechanism or a genuinely fresh combination.',
    recentStyles.length ? ('- Styles already used recently (do NOT reuse or lightly reword): ' + recentStyles.join(' | ')) : '- This is one of the first questions — pick a strong mechanism.',
    recentTopics.length ? ('- Topics already covered recently (avoid repeats): ' + recentTopics.join(' | ')) : '',
    lastStems.length ? ('- Do not resemble these recent questions: ' + lastStems.join(' // ')) : '',
    attempt > 1 ? ('- Your previous attempt was rejected (' + priorFailures + '). Fix it and invent differently.') : '',
    '',
    'HARD RULES:',
    '- Exactly 4 options; exactly ONE is unambiguously correct.',
    '- Numbers must be self-consistent (verify mentally). English items must have one defensible exam key.',
    '- Indian exam context (trains, markets, railways, schemes, festivals, cricket...). No controversial or copyrighted content.',
    '- The solution must show the working in 8 lines or fewer.',
    '',
    'EXAM RELEVANCE (be honest, not generous):',
    '- "importance": "high" = a core pattern Indian govt exams repeat; "medium" = plausible exam material; "low" = peripheral trivia.',
    '- "importantFor": 1-3 exam names, ONLY from: IBPS PO, IBPS Clerk, SBI PO, SSC CGL, SSC CHSL, RRB NTPC, State PSC.',
    '',
    'Reply with ONLY this JSON (no markdown, no commentary):',
    '{"topic":"3-5 words","style":"name of the mechanism you invented","stem":"the question text","options":["A","B","C","D"],"answer":"exact text of the correct option","solution":"step-by-step working","hint":"one-line nudge","importance":"high|medium|low","importantFor":["exam name"]}'
  ].filter(Boolean).join('\n');
}

// ── main ─────────────────────────────────────────────────────────────────
(async function main() {
  const started = Date.now();
  const store = loadStore();
  const recentTokenSets = store.questions.slice(-250).map(q => ({ key: tokens(q.stem).slice(0, 6).join(' '), tokens: tokens(q.stem) }));
  const accepted = [];
  const rejects = {};
  let slots = 0, ok = 0;

  log('[invent] model=' + (FAKE ? 'FAKE' : MODEL) + ' per-slot=' + PER_SLOT + ' deadline=' + DEADLINE_MIN + 'min store=' + store.questions.length);

  outer:
  for (const section of SECTIONS) {
    for (const tier of TIERS) {
      for (let k = 0; k < PER_SLOT; k++) {
        if ((Date.now() - started) / 60000 > DEADLINE_MIN) { log('[invent] deadline reached — stopping early'); break outer; }
        slots++;
        let made = null;
        for (let attempt = 1; attempt <= 2 && !made; attempt++) {
          const prompt = buildPrompt(store, section, tier, attempt, rejects['last-' + section + tier] || '');
          let raw = '';
          try {
            raw = await callLLM(
              'You are an exam setter. You reply with a single strict JSON object and nothing else.',
              prompt
            );
            transportFails = 0;
          } catch (e) {
            if (e.status === 'DEADLINE') {
              log('[invent] deadline reached mid-call — stopping early');
              break outer;
            }
            rejects['call-error'] = (rejects['call-error'] || 0) + 1;
            if (e.transport) {
              transportFails++;
              log('[invent] ' + section + '/' + tier + ' attempt ' + attempt + ' TRANSPORT failure: ' + e.message +
                (e.restart ? ' — wedged call, restarting serve now' : ''));
              if (e.restart || transportFails >= 2) {
                const alive = await reviveServer();
                if (!alive) {
                  console.error('[invent] ABORT: Ollama unreachable after transport failures and a restart attempt — failing fast instead of burning the deadline');
                  process.exit(1);
                }
                transportFails = 0;
              } else {
                await sleep(15000);
              }
            } else {
              log('[invent] ' + section + '/' + tier + ' attempt ' + attempt + ' call failed: ' + e.message);
            }
            continue;
          }
          const v = validate(raw, section, tier, recentTokenSets.concat(accepted.map(a => a.tokenSet)));
          if (v.ok) {
            made = v;
          } else {
            rejects[v.why] = (rejects[v.why] || 0) + 1;
            rejects['last-' + section + tier] = v.why;
            log('[invent] ' + section + '/' + tier + ' rejected: ' + v.why);
          }
        }
        if (made) {
          ok++;
          made.q.id = 'inv-' + Date.now().toString(36) + '-' + ok;
          accepted.push(made);
          // incremental save: a hard timeout must never lose invented work
          store.questions.push(made.q);
          if (store.questions.length > MAX_STORE) store.questions = store.questions.slice(store.questions.length - MAX_STORE);
          saveStore(store);
          log('[invent] +' + section + '/' + tier + ' [' + made.q.style + '] ' + made.q.stem.slice(0, 90));
        }
      }
    }
  }

  const mins = ((Date.now() - started) / 60000).toFixed(1);
  log('[invent] done in ' + mins + 'min — slots=' + slots + ' accepted=' + accepted.length + ' rejects=' + JSON.stringify(rejects));
  if (!accepted.length) { console.error('[invent] ZERO questions invented — refusing to claim success'); process.exit(1); }
})().catch(e => { console.error('[invent] fatal: ' + e.stack); process.exit(1); });
