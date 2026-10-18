#!/usr/bin/env node
'use strict';
/**
 * Invent Questions — the site's own exam-setter agent.
 *
 * What this is NOT: a template bank. Nothing here is procedurally generated
 * from wired-in formulas. Instead, qwen3.8:27b (the CI model) is briefed like
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
 *   OLLAMA_MODEL        default qwen3.8:27b
 *   OLLAMA_HOST         default http://127.0.0.1:11434
 *   INVENT_PER_SLOT     questions per section x difficulty (default 2)
 *   INVENT_DEADLINE_MIN wall-clock budget for inventing (default 95)
 *   INVENT_CALL_MS      per-call client timeout in ms (default 1200000 = 20 min)
 *   INVENT_MAX_STORE    max questions kept (default 1200)
 *   INVENT_OUT          override output path (for tests)
 *   INVENT_FAKE_LLM=1   no model needed — canned responses for local tests
 */

const fs = require('fs');
const path = require('path');

const MODEL = process.env.OLLAMA_MODEL || 'qwen3.8:27b';
const HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const PER_SLOT = Math.max(1, parseInt(process.env.INVENT_PER_SLOT || '2', 10) || 2);
const DEADLINE_MIN = parseFloat(process.env.INVENT_DEADLINE_MIN || '95') || 95;
const MAX_STORE = parseInt(process.env.INVENT_MAX_STORE || '1200', 10) || 1200;
const OUT_FILE = process.env.INVENT_OUT || path.join('data', 'invented', 'questions.json');
const FAKE = process.env.INVENT_FAKE_LLM === '1';
const RUN = process.env.GITHUB_RUN_NUMBER || String(Date.now());
// 4 min aborted EVERY call on the 4 vCPU runner (24/24 in run #2): a
// 1600-token reasoned answer needs ~5-15 min there. 20 min lets slow calls
// finish; the deadline budget still guards the total run.
const CALL_MAX_MS = parseInt(process.env.INVENT_CALL_MS || '1200000', 10);

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
      answer: String(dist), solution: 'Distance = ' + speed + ' x ' + hours + ' = ' + dist + ' km.', hint: 'distance = speed x time'
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
// A dead Ollama process surfaces as undici's "fetch failed" (ECONNREFUSED)
// on every call — invent #3 retried into a dead socket for 70+ minutes and
// invented nothing. Transport death is now distinguishable from slow
// generation (AbortError): one in-place restart is attempted, and if the
// server stays down the run fails fast instead of burning the deadline.
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
  if (await probeServer()) return true;
  log('[invent] Ollama unreachable — restarting it in-place');
  try {
    const { spawn } = require('child_process');
    const child = spawn('bash', ['-c', 'nohup ollama serve >> /tmp/ollama.log 2>&1 &'], { detached: true, stdio: 'ignore' });
    child.unref();
  } catch (e) { /* the probe below decides */ }
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    if (await probeServer()) { log('[invent] Ollama back up after ' + (i + 1) + 's'); return true; }
  }
  return false;
}

async function callLLM(system, user) {
  if (FAKE) return callFake();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), CALL_MAX_MS);
  try {
    const res = await fetch(HOST + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctl.signal,
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        think: false,
        options: { temperature: 0.95, top_p: 0.92, num_ctx: 8192, num_predict: 1600 },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    return (j && j.message && j.message.content) || '';
  } catch (e) {
    const msg = String((e && e.message) || e);
    if (/fetch failed|ECONNREFUSED|ECONNRESET|socket hang up|other side closed|connect timeout|UND_ERR/i.test(msg)) {
      transportFails++;
      e.transport = true;
    }
    throw e;
  } finally { clearTimeout(timer); }
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
  try { return JSON.parse(t.slice(s, end + 1)); } catch (e) { return null; }
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

function validate(raw, section, tier, recentTokenSets) {
  const t = extractJson(raw);
  if (!t) return { ok: false, why: 'unparseable JSON' };
  const stem = String(t.stem || t.question || '').trim();
  const solution = String(t.solution || t.explanation || '').trim();
  const style = String(t.style || '').trim();
  const topic = String(t.topic || '').trim();
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
    'Reply with ONLY this JSON (no markdown, no commentary):',
    '{"topic":"3-5 words","style":"name of the mechanism you invented","stem":"the question text","options":["A","B","C","D"],"answer":"exact text of the correct option","solution":"step-by-step working","hint":"one-line nudge"}'
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
            rejects['call-error'] = (rejects['call-error'] || 0) + 1;
            if (e.transport) {
              log('[invent] ' + section + '/' + tier + ' attempt ' + attempt + ' TRANSPORT failure (server down?): ' + e.message);
              if (transportFails >= 2) {
                const alive = await reviveServer();
                if (!alive) {
                  console.error('[invent] ABORT: Ollama unreachable after ' + transportFails +
                    ' transport failures and a restart attempt — failing fast instead of burning the deadline');
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
