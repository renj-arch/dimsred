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
const MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:9b';
const ID = String(process.env.OD_ID || '').replace(/[^A-Za-z0-9-]/g, '') || ('adhoc-' + Date.now());
const KIND = String(process.env.OD_KIND || '');
const FAKE = process.env.OD_FAKE_TEXT || ''; // test hook: skips Ollama entirely
const OUT_DIR = path.join(__dirname, '..', 'data', 'on-demand');

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

// One stricter retry when the model forgets the JSON array. Log the raw head
// first — without it a parse failure leaves no diagnostic in the step log.
async function callArray(messages, opts, tag) {
  const first = await callLLM(messages, opts);
  try { return extractArray(first.text); }
  catch (e) {
    log(tag + ' output was not a JSON array (' + e.message + ') · head: '
      + String(first.text).replace(/\s+/g, ' ').slice(0, 220));
    const retry = await callLLM(messages.concat([
      { role: 'assistant', content: String(first.text).slice(0, 600) },
      { role: 'user', content: 'That reply was not a valid JSON array. Return ONLY the JSON array — start with [ and end with ]. No explanation, no markdown, nothing before or after the brackets.' }
    ]), { temperature: 0.4, numPredict: opts.numPredict });
    return extractArray(retry.text);
  }
}

function normText(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

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
    '{"q":"question text","a":"answer text","h":"one-line hint","s":"2-3 sentence solution/explanation"}',
    '',
    'Rules:',
    '- q must be a real exam-style question, not a topic label.',
    '- a must be the direct correct answer (formula value, term, or short sentence).',
    '- h gives the student a nudge without giving it away.',
    '- s explains WHY, with the formula or reasoning chain.',
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
    { temperature: 0.75, numPredict: Math.min(6000, 450 * count + 600) },
    'tutor'
  );
  if (!Array.isArray(arr)) throw new Error('model did not return an array');
  const seen = {};
  const questions = [];
  const seedNorm = {};
  seeds.forEach(function (s) { seedNorm[normText(s)] = 1; });
  arr.forEach(function (x) {
    if (!x || !x.q || !x.a) return;
    const n = normText(x.q);
    if (!n || n.length < 12 || seen[n] || seedNorm[n]) return;
    seen[n] = 1;
    questions.push({ q: clean(x.q), a: clean(x.a), h: clean(x.h), s: clean(x.s) });
  });
  if (!questions.length) throw new Error('no valid questions generated');
  return { questions: questions.slice(0, count) };
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
    seen[n] = 1;
    const section = SECTIONS[clean(x.section)] ? clean(x.section) : 'reasoning';
    questions.push({
      stem: stem,
      options: options,
      answer: answer,
      solution: clean(x.solution),
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
  if (!questions.length) throw new Error('no valid questions generated');
  return { questions: questions.slice(0, count) };
}

// ---- result file ------------------------------------------------------------

// Keep the directory small: drop files older than KEEP_HOURS, then the
// oldest beyond KEEP_MAX (a chatty day must not grow the repo forever).
function pruneOld() {
  try {
    const files = fs.readdirSync(OUT_DIR).filter(function (f) { return f.endsWith('.json'); });
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

function writeResult(obj) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  pruneOld();
  const file = path.join(OUT_DIR, ID + '.json');
  fs.writeFileSync(file, JSON.stringify(obj, null, 1));
  log('wrote ' + file);
}

// ---- main -------------------------------------------------------------------

async function main() {
  log('kind=' + KIND + ' id=' + ID + ' model=' + MODEL);
  const payload = loadPayload();
  let out;
  if (KIND === 'writer') out = await runWriter(payload);
  else if (KIND === 'tutor-questions') out = await runTutorQuestions(payload);
  else if (KIND === 'mental-batch') out = await runMentalBatch(payload);
  else throw new Error('unknown kind: ' + KIND);
  writeResult(Object.assign({
    status: 'done',
    kind: KIND,
    model: MODEL,
    finishedAt: new Date().toISOString()
  }, out));
}

// Test hooks: require() this file to exercise the parsers without a runner.
module.exports = { extractArray, tutorPrompt, mentalPrompt };

if (require.main === module) {
  main().catch(function (err) {
    console.error('[on-demand] FAILED:', (err && err.stack) || err);
    try {
      writeResult({
        status: 'failed',
        kind: KIND,
        model: MODEL,
        error: String((err && err.message) || err).slice(0, 500),
        finishedAt: new Date().toISOString()
      });
    } catch (e) {}
    process.exitCode = 1;
  });
}
