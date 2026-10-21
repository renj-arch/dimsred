// On-demand generation (owner runner) — one request, one result file.
//
// The owner clicks generate in the browser; the CF dispatcher verifies him
// and dispatches on-demand.yml; this script is what the runner executes. It
// reads the request from the environment, asks the local Ollama model for the
// content, validates the output with the same rules the rest of the site
// uses, and writes data/on-demand/<request-id>.json — the workflow then
// commits that file and the browser, which is polling it, picks it up.
//
// Kinds:
//   writer          {prompt, temperature?, maxTokens?}
//                   -> {text}   one prose answer (ask pages)
//   tutor-questions {exam, subject, count, seeds?, bias?}
//                   -> {questions:[{q,a,h,s}]}
//   mental-batch    {count, difficulty}
//                   -> {questions:[{stem,options,answer,solution,hint,section,...}]}
//                   also appended to the public invented pool
//                   (data/invented/questions.json): one owner request grows
//                   the page's "agent fetch" pool for every visitor.
//   mains-fresh     {paper?, topic?, seeds?}
//                   -> {item:{paper,topic,marks,difficulty,question,answer[],...}}
//                   one UPSC Mains question + model-answer skeleton, with the
//                   same acceptance rules as the site agent's MainsFresh lane;
//                   also appended to the public frozen batch
//                   (data/mains-fresh.json).
//
// Transport: curl via spawn, streaming, with watchdogs — the exact lessons
// learned in invent-questions.js (node's fetch has a hidden ~5-min headers
// timeout; stream:false sends zero bytes until every token is done, so
// absolute caps murder healthy CPU generations — silence-window watchdogs
// are the only safe shape).
//
// Failure still writes the result file ({status:"failed"}) so the polling
// browser gets a real answer instead of timing out; the script then exits
// non-zero so the Actions run shows red.

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MODEL = process.env.OLLAMA_MODEL || 'batiai/qwen3.8-27b:iq3';
const ID = String(process.env.OD_ID || '').replace(/[^A-Za-z0-9-]/g, '') || ('adhoc-' + Date.now());
const KIND = String(process.env.OD_KIND || '');
const FAKE = process.env.OD_FAKE_TEXT || ''; // test hook: skips Ollama entirely
const OUT_DIR = path.join(__dirname, '..', 'data', 'on-demand');

// Public pools the on-demand lane can also grow (checked out by the workflow
// via sparse-checkout). Missing files are a no-op: the result file still
// lands, the public pool is just left untouched.
const INVENTED_POOL = path.join(__dirname, '..', 'data', 'invented', 'questions.json');
const MAINS_FRESH = path.join(__dirname, '..', 'data', 'mains-fresh.json');
const MAINS_BANK = path.join(__dirname, '..', 'data', 'mains-questions.json');
const PUBLIC_INVENTED_CAP = 1200; // same cap as the invent lane (INVENT_MAX_STORE)
const MAINS_FRESH_CAP = 40;       // same cap as the site agent (MAINS_FRESH_CAP)

// Watchdog constants (same shape as invent-questions.js): 25 min of silence
// before the first byte is patience (cold load + prompt eval), 12 min of
// silence mid-stream is a wedge, 55 min hard cap per call.
const FIRST_BYTE_MIN = 25;
const STALL_MIN = 12;
const CALL_CAP_MIN = 55;
const KEEP_HOURS = 72;
const KEEP_MAX = 100;

function log(msg) { console.log('[on-demand] ' + msg); }

function loadPayload() {
  const raw = process.env.OD_PAYLOAD || '{}';
  try { return JSON.parse(raw); } catch (e) {
    throw new Error('payload is not JSON: ' + e.message);
  }
}

// ---- Ollama over curl, streaming -------------------------------------------

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

    function fail(why) {
      if (settled) return;
      settled = true;
      clearInterval(mon);
      try { child.kill('SIGKILL'); } catch (e) {}
      reject(new Error('transport: ' + why));
    }

    const mon = setInterval(() => {
      const now = Date.now();
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
        log('model first byte at ' + Math.round((firstByteAt - startedAt) / 1000) + 's');
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
      else reject(new Error('curl exit ' + code + ' ' + stderr.slice(0, 300)));
    });
    child.stdin.on('error', () => {});
    child.stdin.write(payload);
    child.stdin.end();
  });
}

// Parse an NDJSON chat stream: accumulate message.content deltas; curl appends
// the HTTP code as a final line via -w. Captures done_reason so the writer can
// continue an answer that hit the token budget.
function parseChatStream(out) {
  const lines = String(out || '').split('\n');
  let httpCode = '';
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  if (lines.length && /^\d{3}$/.test(lines[lines.length - 1].trim())) {
    httpCode = lines.pop().trim();
  }
  let content = '';
  let thinking = '';
  let doneReason = '';
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
      if (j.done && j.done_reason) doneReason = String(j.done_reason);
    } catch (e) { /* partial line; ignore */ }
  }
  return { text: content.trim() || thinking.trim(), httpCode: httpCode, doneReason: doneReason };
}

async function callLLM(messages, opts) {
  opts = opts || {};
  if (FAKE) return { text: FAKE, doneReason: 'stop' };
  const payload = JSON.stringify({
    model: MODEL,
    stream: true,
    think: false,
    options: {
      temperature: opts.temperature == null ? 0.5 : opts.temperature,
      top_p: 0.92,
      num_ctx: opts.numCtx || 8192,
      num_predict: opts.numPredict || 2000
    },
    messages: messages
  });
  let out = await curlChat(payload);
  let parsed = parseChatStream(out);
  if (!parsed.text && parsed.httpCode === '400') {
    // Older daemons reject think:false with HTTP 400 — retry without it
    // (same hatch as invent-questions.js and site-agent.js).
    log('Ollama rejected think:false (HTTP 400) — retrying without the parameter');
    out = await curlChat(JSON.stringify(Object.assign(JSON.parse(payload), { think: undefined })));
    parsed = parseChatStream(out);
  }
  if (parsed.httpCode && parsed.httpCode !== '200') throw new Error('Ollama HTTP ' + parsed.httpCode);
  if (!parsed.text) throw new Error('model returned no text');
  return parsed;
}

// ---- tolerant JSON extraction ----------------------------------------------
// Models wrap arrays in prose or fences often enough that strict parsing
// would fail whole requests. Take the widest [...] and parse it; every item
// is then validated field-by-field anyway, so tolerance here is safe.
function extractArray(text) {
  const s = String(text || '');
  const a = s.indexOf('[');
  const b = s.lastIndexOf(']');
  if (a === -1 || b <= a) throw new Error('no JSON array in the model output');
  return JSON.parse(s.slice(a, b + 1));
}

// A reply cut off by the output cap has no closing bracket, so extractArray
// throws and every finished question dies with it (observed 2026-10-19: the
// 9b DI reply arrived as a truncated array and the whole pass was rejected).
// Walk the text and keep each complete {...} object instead; the caller still
// field-validates every item, so salvaging can only add usable questions.
function extractLooseItems(text) {
  const s = String(text || '');
  const items = [];
  let depth = 0, start = -1, inStr = false, escNext = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (escNext) escNext = false;
      else if (c === '\\') escNext = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') { if (depth === 0) start = i; depth++; continue; }
    if (c === '}' && depth > 0) {
      depth--;
      if (depth === 0 && start !== -1) {
        try { items.push(JSON.parse(s.slice(start, i + 1))); } catch (e) { /* half-written object */ }
        start = -1;
      }
    }
  }
  return items;
}

// One stricter retry when the model forgets the JSON array. Log the raw head
// first — without it a parse failure leaves no diagnostic in the step log.
async function callArray(messages, opts, tag) {
  const first = await callLLM(messages, opts);
  try { return extractArray(first.text); }
  catch (e) {
    log(tag + ' output was not a JSON array (' + e.message + ') · head: '
      + String(first.text).replace(/\s+/g, ' ').slice(0, 220));
    const salvaged = extractLooseItems(first.text);
    if (salvaged.length) {
      log(tag + ': salvaged ' + salvaged.length + ' complete item(s) from the cut-off reply');
      return salvaged;
    }
    const retry = await callLLM(messages.concat([
      { role: 'assistant', content: String(first.text).slice(0, 600) },
      { role: 'user', content: 'That reply was not a valid JSON array. Return ONLY the JSON array — start with [ and end with ]. No explanation, no markdown, nothing before or after the brackets.' }
    ]), { temperature: 0.4, numPredict: opts.numPredict });
    try { return extractArray(retry.text); }
    catch (e2) {
      const salvaged2 = extractLooseItems(retry.text);
      if (salvaged2.length) {
        log(tag + ': salvaged ' + salvaged2.length + ' complete item(s) from the cut-off retry reply');
        return salvaged2;
      }
      throw e2;
    }
  }
}

function normText(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

// Meta-text guard ("thinking leak"). Observed 2026-10-19: the owner's DI paper
// shipped a question whose solution read "The question has been updated.
// Let's provide a valid question. Let's use: 2 dots at 5..." — the model's
// self-repair commentary leaked into the text a student reads. Any item whose
// visible fields match is dropped before it can reach the page or the pools.
const META_LEAK = [
  [/the question has been updated/i, 'question-updated note'],
  [/provide a valid question/i, 'valid-question note'],
  [/let'?s use\s*:/i, 'rewrite marker'],
  [/as an ai (?:language )?model/i, 'AI identity text'],
  [/i (?:cannot|can'?t|can not) (?:provide|answer|solve) (?:a|the|this)/i, 'refusal text'],
  [/the (?:given|provided|original) question (?:is|seems|appears) (?:invalid|incomplete|incorrect|unclear)/i, 'invalid-question note']
];
function metaLeak(text) {
  const s = String(text == null ? '' : text);
  for (const p of META_LEAK) { if (p[0].test(s)) return p[1]; }
  return '';
}

// Thinking-leak gate (2026-10-21). Same failure class the owner hit on
// mental.html: the 9b solver's repair loop ("Wait, let's re-calculate...",
// "Option not available. Let's change numbers.") leaked into the visible
// solution, and the key often belonged to a rewritten version of the stem.
// 8 of the owner's 11-question "Mental fresh paper" were broken this way.
// Runs on the solution/hint text only: a stem may legitimately say "wait".
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
function thinkLeak(text) {
  const s = String(text == null ? '' : text);
  for (const p of THINK_LEAK) { if (p[0].test(s)) return p[1]; }
  return '';
}
function numbersIn(text) {
  return (String(text == null ? '' : text).match(/\d[\d,]*(?:\.\d+)?/g) || [])
    .map(x => Number(x.replace(/,/g, '')))
    .filter(n => isFinite(n));
}
function meaningfulNumbers(nums) {
  return nums.filter(n => Math.abs(n) >= 10 || !Number.isInteger(n));
}
// A working that never repeats a given number answers a different question
// (observed: a 200 km / 80-60 kmph stem solved with 36 km and 9 kmph).
function solutionUsesStemNumbers(stem, solution) {
  const given = meaningfulNumbers(numbersIn(stem));
  if (new Set(given).size < 2) return true;
  const sol = numbersIn(solution);
  return given.some(g => sol.some(n => Math.abs(n - g) < 1e-9));
}
// The key's number must appear in the working (observed: a 3.45-year
// computation shipped with "C) 20 months").
function answerEchoed(answer, solution) {
  const a = numbersIn(answer);
  if (!a.length) return true;
  const key = a[a.length - 1];
  return numbersIn(solution).some(n => Math.abs(n - key) < 1e-9);
}
function optionsAreBareLetters(options) {
  return options.every(o => /^[A-D]\.?$/i.test(String(o).trim()));
}

// The closing line of a solution ("Final answer: X") is what the student
// reads as the conclusion; when the "a" field disagrees with it the shown
// answer contradicts the shown working (observed 2026-10-19: a shaft
// question shipped a="1/4" while its own solution corrected to 1/8). The
// solution's line wins and the correction is logged.
function finalAnswerOf(s) {
  const m = /final answer\s*:\s*(.+)$/i.exec(String(s || ''));
  return m ? clean(m[1]).replace(/[.\s]+$/, '') : '';
}

function readJsonFile(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
}

// The owner's mental batch also grows the PUBLIC invented pool
// (data/invented/questions.json — the page's "agent fetch" side), so one
// on-demand request leaves the whole site better, not just this session.
// The workflow commits the file; ci-push's union_invented() keeps a racing
// invent-lane run from dropping either side's questions.
function appendToInventedPool(questions) {
  const pool = readJsonFile(INVENTED_POOL);
  if (!pool || !Array.isArray(pool.questions)) {
    log('invented pool not checked out — public pool left untouched');
    return 0;
  }
  const have = {};
  pool.questions.forEach(function (q) { const n = normText(q && q.stem); if (n) have[n] = 1; });
  let added = 0;
  questions.forEach(function (q) {
    const n = normText(q && q.stem);
    if (!n || have[n]) return;
    have[n] = 1;
    pool.questions.push(Object.assign({}, q, { id: 'inv-od-' + ID + '-' + (added + 1), run: 'on-demand' }));
    added++;
  });
  if (!added) return 0;
  if (pool.questions.length > PUBLIC_INVENTED_CAP) {
    pool.questions = pool.questions.slice(pool.questions.length - PUBLIC_INVENTED_CAP);
  }
  pool.generatedAt = new Date().toISOString();
  pool.model = MODEL;
  pool.version = pool.version || 1;
  fs.writeFileSync(INVENTED_POOL, JSON.stringify(pool));
  log('public invented pool += ' + added + ' (now ' + pool.questions.length + ')');
  return added;
}

// ---- kinds ------------------------------------------------------------------

async function runWriter(p) {
  const prompt = String((p && p.prompt) || '');
  if (!prompt) throw new Error('writer: empty prompt');
  const maxTokens = Math.max(200, Math.min(4000, parseInt(p.maxTokens, 10) || 2200));
  const first = await callLLM([{ role: 'user', content: prompt }], {
    temperature: p.temperature == null ? 0.3 : p.temperature,
    numPredict: maxTokens
  });
  let text = first.text;
  if (first.doneReason === 'length') {
    log('answer hit the token budget — asking for the continuation');
    const cont = await callLLM([
      { role: 'user', content: prompt },
      { role: 'assistant', content: text },
      { role: 'user', content: 'Continue the answer exactly from where it stopped. Do not repeat anything already written, do not restart sections, no preamble.' }
    ], { temperature: p.temperature == null ? 0.3 : p.temperature, numPredict: 1200 });
    if (cont.text) text = text + (/\s$/.test(text) ? '' : ' ') + cont.text;
  }
  const leak = metaLeak(text);
  if (leak) throw new Error('the answer contained meta text (' + leak + ') - dropped instead of shipped');
  return { text: text };
}

function tutorPrompt(exam, subject, count, seeds, bias) {
  const lines = [
    'You are a ' + exam + ' exam question setter.',
    'Generate ' + count + ' NEW practice questions on: ' + subject + '.',
    '',
    'STYLE: exam-pattern mix of definition, numerical, and',
    '"which of the following" conceptual questions. Do NOT copy the',
    'seed questions below — use them only to gauge depth and avoid duplicates.',
    ''
  ];
  if (bias && bias.length) {
    lines.push('', 'MOST-ASKED TOPICS in real ' + exam + ' past papers',
      '(bias your questions toward these; mix them with ' + subject + ' itself):');
    bias.forEach(function (t) { lines.push('- ' + t); });
  }
  lines.push(
    '',
    'Existing questions on this topic (DO NOT DUPLICATE):',
    (seeds && seeds.length) ? seeds.map(function (s) { return '- ' + s; }).join('\n') : '(none provided)',
    '',
    'Output STRICT JSON array, no markdown, no explanation. Each element:',
    '{"q":"question text","a":"answer text","h":"one-line hint","s":"2-3 sentence solution/explanation ending with a final line"}',
    '',
    'Rules:',
    '- q must be a real exam-style question, not a topic label.',
    '- a must be the direct correct answer (formula value, term, or short sentence).',
    '- h gives the student a nudge without giving it away.',
    '- s explains WHY, with the formula or reasoning chain, and MUST end with a final line exactly like: Final answer: <X> — where <X> is the exact same text as "a".',
    '- Before returning, re-check every item: if your working changed the answer while writing "s", update "a" to match the final line so the two can never disagree.',
    '- Questions must be on DIFFERENT sub-topics within ' + subject + '.',
    '- Use only standard syllabus content; no made-up facts.',
    '',
    'Return ONLY the JSON array.'
  );
  return lines.join('\n');
}

async function runTutorQuestions(p) {
  const exam = clean(p.exam) || 'Exam';
  const subject = clean(p.subject) || 'General';
  const count = Math.max(3, Math.min(15, parseInt(p.count, 10) || 5));
  const seeds = (Array.isArray(p.seeds) ? p.seeds : []).slice(0, 8).map(clean).filter(Boolean);
  const bias = (Array.isArray(p.bias) ? p.bias : []).slice(0, 6).map(clean).filter(Boolean);

  const arr = await callArray(
    [{ role: 'user', content: tutorPrompt(exam, subject, count, seeds, bias) }],
    { temperature: 0.75, numPredict: Math.min(7000, 700 * count + 1200) },
    'tutor'
  );
  if (!Array.isArray(arr)) throw new Error('model did not return an array');
  const seen = {};
  const questions = [];
  const rejected = [];
  const seedNorm = {};
  seeds.forEach(function (s) { seedNorm[normText(s)] = 1; });
  function addItems(list) {
  (Array.isArray(list) ? list : []).forEach(function (x) {
    if (!x || !x.q || !x.a) return;
    const n = normText(x.q);
    if (!n || n.length < 12 || seen[n] || seedNorm[n]) return;
    const leak = metaLeak([x.q, x.a, x.h, x.s].join('\n'));
    if (leak) {
      rejected.push({ why: leak, head: clean(x.q).slice(0, 90) });
      log('tutor: dropped 1 item - ' + leak + ' - ' + clean(x.q).slice(0, 90));
      return;
    }
    const tleak = thinkLeak([x.s, x.h].join('\n'));
    if (tleak) {
      rejected.push({ why: tleak, head: clean(x.q).slice(0, 90) });
      log('tutor: dropped 1 item - ' + tleak + ' - ' + clean(x.q).slice(0, 90));
      return;
    }
    seen[n] = 1;
    let a = clean(x.a);
    const fa = finalAnswerOf(clean(x.s));
    if (fa && normText(fa) !== normText(a)) {
      log('tutor: "a" (' + a.slice(0, 70) + ') disagreed with the solution\'s final line (' + fa.slice(0, 70) + ') — using the solution\'s line');
      a = fa;
    }
    questions.push({ q: clean(x.q), a: a, h: clean(x.h), s: clean(x.s) });
  });
  }

  addItems(arr);
  // A thin reply (truncated or lazy JSON) is the most common tutor-lane
  // failure (the output budget must fit full DI tables + worked solutions —
  // 450n+600 cut a 5-question DI reply mid-array on 2026-10-19). callArray
  // salvages every finished item from a cut-off reply; one retry then tops the
  // set up. Still short => fail loudly so a half-empty "success" never
  // reaches the page (see od 44161b74, 1 of 5).
  const need = Math.min(count, 3);
  if (questions.length < need) {
    log('tutor: only ' + questions.length + ' of ' + count + ' valid - retrying once');
    let arr2 = null;
    try {
      arr2 = await callArray(
        [{ role: 'user', content: tutorPrompt(exam, subject, count - questions.length, seeds, bias) }],
        { temperature: 0.85, numPredict: Math.min(7000, 700 * count + 1200) },
        'tutor'
      );
    } catch (e) { arr2 = null; log('tutor: retry pass failed: ' + (e && e.message)); }
    addItems(arr2);
  }
  if (questions.length < need) {
    throw new Error('only ' + questions.length + ' of ' + count + ' valid questions generated (needed at least ' + need + ')' +
      (rejected.length ? ' - ' + rejected.length + ' dropped by the meta-text guard' : ''));
  }
  const out = { questions: questions.slice(0, count) };
  if (rejected.length) {
    out.rejected = rejected.slice(0, 8);
    log('tutor: ' + rejected.length + ' item(s) dropped by the meta-text guard');
  }
  return out;
}

function mentalPrompt(count, difficulty) {
  return [
    'You are a quantitative aptitude, reasoning and English question setter',
    'for Indian government exams (SSC, Bank, Railways) at ' + difficulty + ' difficulty.',
    '',
    'Invent ' + count + ' fresh multiple-choice questions. Mix the sections:',
    'quant (arithmetic, algebra, DI), reasoning (series, coding, logic, seating,',
    'directions, blood relations), verbal (grammar, vocabulary, comprehension one-liners).',
    '',
    'Output STRICT JSON array, no markdown, no explanation. Each element:',
    '{"stem":"the full question text","options":["opt1","opt2","opt3","opt4"],',
    '"answer":"exactly one of the options, copied verbatim","solution":"2-4 sentence worked solution",',
    '"hint":"one-line nudge","section":"quant|reasoning|verbal"}',
    '',
    'Rules:',
    '- Exactly 4 options per question; exactly one is correct.',
    '- answer must be a verbatim copy of one option.',
    '- solutions must show the actual steps/values, not restate the answer.',
    '- NEW twists and fresh numbers — never a standard textbook question as-is.',
    '- No made-up facts; only standard syllabus mathematics/reasoning/grammar.',
    '',
    'Return ONLY the JSON array.'
  ].join('\n');
}

const MENTAL_SECONDS = { easy: 35, moderate: 40, hard: 50, veryhard: 60 };
const MENTAL_LEVELS = { easy: 1, moderate: 1, hard: 1, veryhard: 1 };
const SECTIONS = { quant: 1, reasoning: 1, verbal: 1 };

async function runMentalBatch(p) {
  const difficulty = MENTAL_LEVELS[clean(p.difficulty)] ? clean(p.difficulty) : 'moderate';
  const count = Math.max(3, Math.min(20, parseInt(p.count, 10) || 12));

  const arr = await callArray(
    [{ role: 'user', content: mentalPrompt(count, difficulty) }],
    { temperature: 0.8, numPredict: Math.min(7000, 550 * count + 600) },
    'mental'
  );
  const seen = {};
  const questions = [];
  const rejected = [];
  const now = new Date().toISOString();
  (Array.isArray(arr) ? arr : []).forEach(function (x) {
    if (!x || !x.stem || !Array.isArray(x.options)) return;
    const options = x.options.map(clean).filter(Boolean);
    if (options.length !== 4) return;
    let answer = clean(x.answer);
    // Accept "B" / "2" style answers by mapping to the option, and the exact
    // string; anything else is dropped rather than shipped wrong.
    if (options.indexOf(answer) === -1) {
      const letter = answer.replace(/[^A-Da-d1-4]/, '');
      const idx = 'ABCD'.indexOf(letter.toUpperCase()) >= 0 ? 'ABCD'.indexOf(letter.toUpperCase())
        : (parseInt(letter, 10) - 1);
      if (idx >= 0 && idx < 4) answer = options[idx];
      else {
        const ci = options.findIndex(function (o) { return o.toLowerCase() === answer.toLowerCase(); });
        if (ci === -1) return;
        answer = options[ci];
      }
    }
    const stem = clean(x.stem);
    const n = normText(stem);
    if (!n || n.length < 15 || seen[n]) return;
    const leak = metaLeak([stem, options.join(' | '), x.solution, x.hint].join('\n'));
    if (leak) {
      rejected.push({ why: leak, head: stem.slice(0, 90) });
      log('mental: dropped 1 item - ' + leak);
      return;
    }
    const section = SECTIONS[clean(x.section)] ? clean(x.section) : 'reasoning';
    const sol = clean(x.solution);
    const tleak = thinkLeak(sol + '\n' + clean(x.hint));
    if (tleak) {
      rejected.push({ why: tleak, head: stem.slice(0, 90) });
      log('mental: dropped 1 item - ' + tleak);
      return;
    }
    if (section === 'quant') {
      if (!solutionUsesStemNumbers(stem, sol)) {
        rejected.push({ why: 'numbers not from the stem', head: stem.slice(0, 90) });
        return;
      }
      if (!answerEchoed(answer, sol)) {
        rejected.push({ why: 'answer absent from the solution', head: stem.slice(0, 90) });
        return;
      }
      if (optionsAreBareLetters(options)) {
        rejected.push({ why: 'letter-only options', head: stem.slice(0, 90) });
        return;
      }
    }
    if (/matrix/i.test(stem) && !/\d/.test(stem)) {
      rejected.push({ why: 'matrix without data', head: stem.slice(0, 90) });
      return;
    }
    seen[n] = 1;
    questions.push({
      stem: stem,
      options: options,
      answer: answer,
      solution: sol,
      hint: clean(x.hint),
      section: section,
      difficulty: difficulty,
      style: 'runner',
      topic: 'mixed',
      seconds: MENTAL_SECONDS[difficulty],
      inventedAt: now,
      model: MODEL
    });
  });
  if (!questions.length) throw new Error('no valid questions generated' + (rejected.length ? ' (' + rejected.length + ' dropped by the meta-text guard)' : ''));
  const picked = questions.slice(0, count);
  appendToInventedPool(picked);
  const out = { questions: picked };
  if (rejected.length) {
    out.rejected = rejected.slice(0, 8);
    log('mental: ' + rejected.length + ' item(s) dropped by the meta-text guard');
  }
  return out;
}

// ---- mains-fresh: one UPSC Mains question + model-answer skeleton ----------
// Same acceptance rules and item shape as the build-runner agent
// (scripts/site-agent.js, agent MainsFresh) so on-demand items and frozen
// batch items stay interchangeable on the mains page.

const MAINS_PAPERS = ['gs1', 'gs2', 'gs3', 'gs4', 'essay'];
const MAINS_MARKS = [10, 15, 20, 125, 250];

function mainsNorm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function mainsItemOk(o) {
  if (!o || typeof o !== 'object') return 'not an object';
  const q = String(o.question || '').trim();
  if (q.length < 40 || q.length > 700) return 'question length';
  if (/[<>]/.test(q)) return 'question markup';
  const leak = metaLeak(q + '\n' + (Array.isArray(o.answer) ? o.answer.map(function (s) { return String((s && s.h) || '') + ' ' + String((s && s.p) || ''); }).join('\n') : ''));
  if (leak) return 'meta-text leak (' + leak + ')';
  const paper = String(o.paper);
  if (MAINS_PAPERS.indexOf(paper) === -1) return 'paper';
  const marks = Number(o.marks);
  if (MAINS_MARKS.indexOf(marks) === -1) return 'marks';
  if (paper === 'essay' && marks !== 125 && marks !== 250) return 'essay marks';
  if (paper !== 'essay' && marks > 20) return 'gs marks';
  if (['easy', 'medium', 'high'].indexOf(String(o.difficulty)) === -1) return 'difficulty';
  const ans = Array.isArray(o.answer) ? o.answer.filter(s => s && (s.h || s.p)) : [];
  if (ans.length < 4 || ans.length > 6) return 'answer sections';
  for (const s of ans) {
    if (String(s.h || '').length < 2 || String(s.h || '').length > 90) return 'section heading';
    if (String(s.p || '').length < 120 || String(s.p || '').length > 1500) return 'section paragraph';
  }
  if (!Array.isArray(o.marksGuide) || o.marksGuide.length < 3 || o.marksGuide.length > 6) return 'marksGuide';
  if (!Array.isArray(o.pitfalls) || o.pitfalls.length < 3 || o.pitfalls.length > 6) return 'pitfalls';
  if (!Array.isArray(o.keywords) || o.keywords.length < 5 || o.keywords.length > 8) return 'keywords';
  if (!Array.isArray(o.laws) || o.laws.length > 8) return 'laws';
  return null;
}

// Models wrap the object in fences or a thinking block often enough that a
// strict parse would fail whole requests; slice from the first { to the last }.
function extractOneObject(text) {
  const t = String(text)
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, ' ')
    .replace(/```[a-z]*|```/gi, '').trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a === -1 || b <= a) throw new Error('no JSON object in the model output');
  return JSON.parse(t.slice(a, b + 1));
}

function mainsPrompt(paper, topic, seeds, stricter) {
  const sys = 'You write UPSC Civil Services Mains practice questions with model-answer skeletons for Indian aspirants. ' +
    'Reply with ONE valid JSON object and nothing else: no markdown fences, no commentary before or after. ' +
    'Shape: {"paper":"gs3","topic":"short topic label","marks":15,"difficulty":"medium",' +
    '"question":"full question text including the marking note, e.g. (15 marks, 250 words)",' +
    '"answer":[{"h":"short heading","p":"2-4 sentence paragraph"}],' +
    '"marksGuide":["what the examiner rewards"],"pitfalls":["how this is answered badly"],' +
    '"keywords":["term"],"laws":["law, case or scheme, only if certain"]}. ' +
    'Constraints: "paper" is one of gs1,gs2,gs3,gs4,essay; marks 10, 15 or 20 for GS papers, 125 or 250 only for the essay; ' +
    '4 to 6 objects in "answer"; 3 to 5 strings each in marksGuide and pitfalls; 5 to 8 keywords; "laws" may be []. ' +
    'Keep every "p" paragraph to 2-3 sentences and under 600 characters (the reply has a strict token budget — longer text gets cut off and the item is rejected). ' +
    'Never invent a scheme, case, article or statistic: name a reform only when certain of it, with its year; a verified older example beats an uncertain new one. Prefer safe, verifiable general knowledge. Stay exam-safe and neutral. ' +
    'Structure the skeleton like a strong answer: the FIRST object in "answer" opens with context — define the term or topic and say where or when it took shape (an agreement, body or year, and only when certain) — never start mid-argument; ' +
    'the LAST object is a way forward or conclusion (heading like "Way forward"), 2-3 sentences on what should change or what to watch; the middle objects carry the analysis. ' +
    'Across the answer, place 2 to 3 specific anchors — a court, committee, agreement, scheme, fund, index or landmark event — each one only when you are certain of it; a paragraph that names no real thing is a weak paragraph. ' +
    'For a topic with a governing law, agreement or scheme you are certain of, name at least one in "laws"; keep [] only when nothing is certain. ' +
    'Do not reason step by step; reply with ONLY the JSON object.';
  const lines = [];
  lines.push('Create ONE practice question' +
    (paper ? ' for the paper "' + paper + '"' : ', choosing the paper and a topic where aspirants are weakest') +
    (topic ? ' on the topic: ' + topic : '') +
    ', avoiding the most over-used questions and never repeating any question below (already covered).');
  lines.push('');
  lines.push('ALREADY COVERED (do not repeat, do not reword):');
  lines.push(seeds.length
    ? seeds.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n')
    : '(none provided — prefer a fresh, less over-used angle)');
  if (stricter) {
    lines.push('', 'IMPORTANT: the previous reply was cut off, invalid, or repeated a covered question. ' +
      'Reply with ONLY the JSON object; keep each "p" paragraph to 2-3 sentences and under 600 characters.');
  }
  return { sys: sys, user: lines.join('\n') };
}

function shipMainsItem(obj) {
  return {
    id: 'od-' + Date.now().toString(36),
    at: new Date().toISOString().slice(0, 10),
    paper: String(obj.paper),
    topic: String(obj.topic || 'AI practice').slice(0, 160),
    marks: Number(obj.marks),
    difficulty: String(obj.difficulty),
    years: [],
    question: String(obj.question).trim(),
    answer: obj.answer.filter(s => s && (s.h || s.p)).slice(0, 6)
      .map(s => ({ h: String(s.h || 'Section').slice(0, 120), p: String(s.p || '').slice(0, 1400) })),
    marksGuide: obj.marksGuide.filter(Boolean).map(String).slice(0, 6),
    pitfalls: obj.pitfalls.filter(Boolean).map(String).slice(0, 6),
    laws: (obj.laws || []).filter(Boolean).map(String).slice(0, 8),
    keywords: obj.keywords.filter(Boolean).map(String).slice(0, 8),
    origin: 'od',
    ai: 1,
    model: MODEL
  };
}

// Appending keeps the on-demand item for every visitor instead of only the
// owner's session; the page's frozen batch is the "agent fetch" side and the
// heavy MainsFresh lane rewrites the same file — a rare collision keeps this
// run's side (ci-push -X ours), which is exactly what was just written.
function appendToMainsFresh(item) {
  const pool = readJsonFile(MAINS_FRESH);
  if (!pool || !Array.isArray(pool.items)) {
    log('mains-fresh pool not checked out — public pool left untouched');
    return false;
  }
  pool.items.push(item);
  if (pool.items.length > MAINS_FRESH_CAP) pool.items = pool.items.slice(-MAINS_FRESH_CAP);
  if (!pool.meta || typeof pool.meta !== 'object') pool.meta = {};
  pool.meta.updated = new Date().toISOString().slice(0, 10);
  pool.meta.count = pool.items.length;
  pool.meta.lastAttempt = { at: new Date().toISOString(), reason: 'shipped ' + item.id + ' (on demand)' };
  fs.writeFileSync(MAINS_FRESH, JSON.stringify(pool, null, 1) + '\n');
  log('public mains pool += ' + item.id + ' (now ' + pool.items.length + ')');
  return true;
}

async function runMainsFresh(p) {
  const paper = MAINS_PAPERS.indexOf(clean(p.paper)) !== -1 ? clean(p.paper) : '';
  const topic = clean(p.topic).slice(0, 160);
  const seeds = (Array.isArray(p.seeds) ? p.seeds : []).slice(0, 80).map(clean).filter(Boolean);

  // Hard-drop repeats, by opening signature, against the hand-written bank,
  // the frozen pool and whatever the page sent as seeds.
  const knownSigs = {};
  function addKnown(text) { const n = mainsNorm(text); if (n) knownSigs[n.slice(0, 80)] = 1; }
  seeds.forEach(addKnown);
  const bank = readJsonFile(MAINS_BANK);
  if (bank && Array.isArray(bank.questions)) bank.questions.forEach(function (q) { addKnown(q && q.question); });
  const pool = readJsonFile(MAINS_FRESH);
  if (pool && Array.isArray(pool.items)) pool.items.forEach(function (q) { addKnown(q && q.question); });

  let reason = 'no attempts';
  for (let attempt = 0; attempt < 2; attempt++) {
    const pr = mainsPrompt(paper, topic, seeds, attempt === 1);
    const r = await callLLM([
      { role: 'system', content: pr.sys },
      { role: 'user', content: pr.user }
    ], { temperature: attempt === 1 ? 0.55 : 0.7, numPredict: 3400 });
    let obj = null;
    try { obj = extractOneObject(r.text); }
    catch (e) {
      reason = 'unparseable output';
      log('mains: output was not a JSON object (' + e.message + ') · head: '
        + String(r.text).replace(/\s+/g, ' ').slice(0, 220));
      continue;
    }
    const bad = mainsItemOk(obj);
    if (bad) { reason = 'validation: ' + bad; log('mains: rejected (' + reason + ')'); continue; }
    const nq = mainsNorm(obj.question);
    if (knownSigs[nq.slice(0, 80)]) { reason = 'duplicate question'; log('mains: repeated a covered question — retrying'); continue; }
    const item = shipMainsItem(obj);
    appendToMainsFresh(item);
    return { item: item };
  }
  throw new Error('could not write an acceptable question (' + reason + ')');
}

// ---- result file ------------------------------------------------------------

// Keep the directory small: drop files older than KEEP_HOURS, then the
// oldest beyond KEEP_MAX (a chatty day must not grow the repo forever).
function pruneOld() {
  try {
    const files = fs.readdirSync(OUT_DIR).filter(function (f) { return f.endsWith('.json') && f !== 'index.json'; });
    const cutoff = Date.now() - KEEP_HOURS * 3600 * 1000;
    const rows = [];
    files.forEach(function (f) {
      const fp = path.join(OUT_DIR, f);
      try {
        const st = fs.statSync(fp);
        if (st.mtimeMs < cutoff) fs.unlinkSync(fp);
        else rows.push({ fp: fp, m: st.mtimeMs });
      } catch (e) {}
    });
    rows.sort(function (a, b) { return a.m - b.m; });
    while (rows.length > KEEP_MAX) {
      const row = rows.shift();
      try { fs.unlinkSync(row.fp); } catch (e) {}
    }
  } catch (e) { /* pruning is best-effort */ }
}

function writeResult(obj, payload) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  pruneOld();
  // id + label in the result file let a later index merge recover this paper
  // even if another run overwrote the shared index (see updateIndex).
  obj.id = ID;
  try { obj.label = paperLabel(KIND, payload || {}, obj); } catch (e) {}
  const file = path.join(OUT_DIR, ID + '.json');
  fs.writeFileSync(file, JSON.stringify(obj, null, 1));
  log('wrote ' + file);
}

// data/on-demand/index.json - the newest-first list of owner-lane results
// that improve.html renders ("Recent papers"). Written beside every result
// file so the list survives file pruning and the owner can find the last
// run's paper without reading GitHub. The workflow publishes it with it.
const OD_INDEX = path.join(OUT_DIR, 'index.json');
const OD_INDEX_CAP = 25;

function paperLabel(kind, payload, obj) {
  payload = payload || {};
  if (kind === 'tutor-questions') {
    const n = obj && Array.isArray(obj.questions) ? obj.questions.length : 0;
    return (clean(payload.exam) || 'Exam') + ' - ' + (clean(payload.subject) || 'practice') + ' - ' + n + ' q';
  }
  if (kind === 'mental-batch') return 'Mental fresh paper - ' + (obj && Array.isArray(obj.questions) ? obj.questions.length : 0) + ' q';
  if (kind === 'mains-fresh') return 'Mains - ' + (obj && obj.item ? (String(obj.item.paper) + ' - ' + String(obj.item.topic || '')) : 'question');
  if (kind === 'writer') return 'Ask answer - ' + String(payload.prompt || '').replace(/\s+/g, ' ').slice(0, 70);
  return kind;
}

function updateIndex(kind, payload, obj) {
  try {
    const idx = readJsonFile(OD_INDEX) || {};
    const byId = {};
    (Array.isArray(idx.papers) ? idx.papers : []).forEach(function (e) {
      if (e && e.id) byId[e.id] = e;
    });
    // Heal a lost entry. Two runs can publish close together and each prepend
    // to its own checkout of this file, so one overwrites the other's entry
    // (observed 2026-10-19: od-agent-1019f never reached Recent papers). The
    // result files on disk are the source of truth; merge any missing id back.
    try {
      fs.readdirSync(OUT_DIR).forEach(function (f) {
        if (!f.endsWith('.json') || f === 'index.json') return;
        const id = f.replace(/\.json$/, '');
        if (byId[id]) return;
        const j = readJsonFile(path.join(OUT_DIR, f));
        if (!j || !j.finishedAt) return;
        const n = Array.isArray(j.questions) ? j.questions.length : (j.item ? 1 : 0);
        const healed = {
          id: id,
          kind: String(j.kind || ''),
          label: String(j.label || (String(j.kind || 'paper') + ' - ' + n + ' q')),
          model: String(j.model || ''),
          status: String(j.status || ''),
          finishedAt: String(j.finishedAt || '')
        };
        if (n) healed.n = n;
        if (j.error) healed.error = String(j.error).slice(0, 140);
        byId[id] = healed;
      });
    } catch (e) { /* directory scan is best-effort */ }
    const entry = {
      id: ID,
      kind: kind,
      label: paperLabel(kind, payload, obj),
      model: MODEL,
      status: String(obj.status || ''),
      finishedAt: String(obj.finishedAt || '')
    };
    if (obj.questions && Array.isArray(obj.questions)) entry.n = obj.questions.length;
    if (obj.item) entry.n = 1;
    if (obj.error) entry.error = String(obj.error).slice(0, 140);
    byId[ID] = entry;
    const next = Object.keys(byId).map(function (k) { return byId[k]; })
      .sort(function (a, b) { return String(b.finishedAt).localeCompare(String(a.finishedAt)); })
      .slice(0, OD_INDEX_CAP);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OD_INDEX, JSON.stringify({ generatedAt: new Date().toISOString(), papers: next }, null, 1) + '\n');
  } catch (e) {
    log('index update skipped: ' + (e && e.message));
  }
}

// ---- main -------------------------------------------------------------------

async function main() {
  log('kind=' + KIND + ' id=' + ID + ' model=' + MODEL);
  const payload = loadPayload();
  let out;
  if (KIND === 'writer') out = await runWriter(payload);
  else if (KIND === 'tutor-questions') out = await runTutorQuestions(payload);
  else if (KIND === 'mental-batch') out = await runMentalBatch(payload);
  else if (KIND === 'mains-fresh') out = await runMainsFresh(payload);
  else throw new Error('unknown kind: ' + KIND);
  const result = Object.assign({
    status: 'done',
    kind: KIND,
    model: MODEL,
    finishedAt: new Date().toISOString()
  }, out);
  writeResult(result, payload);
  updateIndex(KIND, payload, result);
}

// Test hooks: require() this file to exercise the parsers without a runner.
module.exports = { extractArray, tutorPrompt, mentalPrompt, mainsPrompt, mainsItemOk, extractOneObject, metaLeak, thinkLeak, solutionUsesStemNumbers, answerEchoed, optionsAreBareLetters };

if (require.main === module) {
  main().catch(function (err) {
    console.error('[on-demand] FAILED:', (err && err.stack) || err);
    try {
      const failed = {
        status: 'failed',
        kind: KIND,
        model: MODEL,
        error: String((err && err.message) || err).slice(0, 500),
        finishedAt: new Date().toISOString()
      };
      let payload = {};
      try { payload = loadPayload(); } catch (e2) {}
      writeResult(failed, payload);
      updateIndex(KIND, payload, failed);
    } catch (e) {}
    process.exitCode = 1;
  });
}
