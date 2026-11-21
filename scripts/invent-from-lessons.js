#!/usr/bin/env node
/**
 * invent-from-lessons.js — write fresh MCQs from lesson paragraphs.
 *
 * The lesson pages already carry authored practiceQs. This lane is different:
 * it takes a paragraph the reader is studying and invents a NEW question whose
 * answer is stated in that paragraph, then an independent verifier must confirm
 * that exactly one option follows from the passage. Nothing outside the passage
 * is required, so the item is answerable by a student who read it.
 *
 * Output: data/lesson-invented.json (served by current-affairs.html behind the
 * "From lesson text" toggle).
 *
 *   node scripts/invent-from-lessons.js
 *   LESSON_INVENT_COUNT=10 node scripts/invent-from-lessons.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROUTES = { NVAPI: 'NVIDIA_API_KEY', GROQ: 'GROQ_API_KEY', OPENROUTER: 'OPENROUTER_API_KEY', GH_MODELS: 'GH_MODELS_TOKEN' };
for (const flag of Object.keys(ROUTES)) {
  if (process.env[ROUTES[flag]] && process.env[flag] !== '0') process.env[flag] = '1';
}
const hosted = require('./lib/hosted');
const { isMetaQuestion, hasLeakedReasoning } = require('./lib/question-quality');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'lesson-invented.json');
const COUNT = parseInt(process.env.LESSON_INVENT_COUNT || '6', 10) || 6;
const MAX_STORE = parseInt(process.env.LESSON_INVENT_MAX || '4000', 10) || 4000;
const DEADLINE_MIN = parseInt(process.env.LESSON_INVENT_DEADLINE_MIN || '25', 10) || 25;

function hash(s) { return crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 16); }
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 180);
const clean = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

function loadStore() {
  try {
    const d = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    if (d && Array.isArray(d.questions)) return d;
  } catch (e) {}
  return { generatedAt: null, note: 'MCQs invented from lesson paragraphs; each verified against its own passage.', questions: [] };
}
function saveStore(store) {
  store.generatedAt = new Date().toISOString();
  if (store.questions.length > MAX_STORE) store.questions = store.questions.slice(-MAX_STORE);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(store, null, 1) + '\n', 'utf8');
}

function walk(dir, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'data' || e.name === 'scripts') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\/course\/.*\/lesson-.*\.html$/.test(full.replace(/\\/g, '/'))) out.push(full);
  }
  return out;
}

function paragraphs(html) {
  const start = html.indexOf('<div class="lesson-body"');
  if (start === -1) return [];
  let body = html.slice(start);
  for (const m of ['id="practice-qs"', '<!-- lesson-nav -->', 'class="lesson-nav"']) {
    const i = body.indexOf(m);
    if (i > 0) body = body.slice(0, i);
  }
  body = body.replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<figcaption[\s\S]*?<\/figcaption>/gi, ' ');
  const out = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(body))) {
    const t = clean(m[1]);
    const words = t.split(/\s+/).filter(Boolean).length;
    if (words >= 35 && words <= 130) out.push(t);
  }
  return out;
}

function extractJson(text) {
  const first = String(text || '').indexOf('{');
  if (first < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = first; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { try { return JSON.parse(text.slice(first, i + 1)); } catch (e) { return null; } } }
  }
  return null;
}

const SYSTEM = 'You are a question setter for an Indian civil-services / government-exam study site. ' +
  'Given ONE paragraph from a lesson, write a NEW multiple-choice question whose correct answer is stated in that paragraph. ' +
  'The student must be able to answer from the passage alone. Test understanding (why, which, what follows, correct pairing), ' +
  'not a verbatim word-match. Four options, exactly one correct, the other three plausible but wrong according to the passage. ' +
  'Do not ask about the exam, the lesson, or how to study. ' +
  'Reply with JSON only: {"question":"...","options":["A","B","C","D"],"answer":0,"solution":"2-4 sentences citing the passage"}.';

const VERIFY = 'You are an independent verifier. You get a passage, a question, four options and the proposed correct index. ' +
  'Decide ONLY from the passage: is exactly one option supported, and is it the proposed index? ' +
  'If the answer needs outside knowledge, or more than one option is supported, or the proposed key is not supported, reject it. ' +
  'Reply JSON only: {"ok":true|false,"reason":"<=160 chars"}';

async function propose(passage, section) {
  const text = await hosted.chat(SYSTEM, 'SECTION: ' + section + '\n\nPASSAGE:\n' + passage, { numPredict: 6000, temperature: 0.3 });
  const j = extractJson(text);
  if (!j || !j.question || !Array.isArray(j.options) || j.options.length !== 4) return null;
  const opts = j.options.map((o) => clean(o));
  if (new Set(opts.map(norm)).size !== 4) return null;
  const ans = Number(j.answer);
  if (!(ans >= 0 && ans <= 3)) return null;
  if (isMetaQuestion(j.question) || hasLeakedReasoning(j.solution)) return null;
  return { question: clean(j.question), options: opts, answer: ans, solution: clean(j.solution) };
}

async function verify(passage, cand) {
  const user = 'PASSAGE:\n' + passage + '\n\nQUESTION: ' + cand.question +
    '\n\nOPTIONS:\n' + cand.options.map((o, i) => (i + 1) + '. ' + o).join('\n') +
    '\n\nPROPOSED KEY: ' + (cand.answer + 1);
  const text = await hosted.chat(VERIFY, user, { numPredict: 4000, temperature: 0 });
  const j = extractJson(text);
  return !!(j && j.ok === true);
}

async function main() {
  if (!hosted.enabled()) { console.error('no model route configured'); process.exitCode = 1; return; }
  const store = loadStore();
  const mined = new Set(store.questions.map((q) => q.paragraphHash));
  const seenQ = new Set(store.questions.map((q) => norm(q.q)));

  const files = walk(ROOT, []);
  // Newest lessons first: freshly expanded sections are what the reader sees.
  files.sort((a, b) => {
    let ma = 0, mb = 0;
    try { ma = fs.statSync(a).mtimeMs; } catch (e) {}
    try { mb = fs.statSync(b).mtimeMs; } catch (e) {}
    return mb - ma;
  });

  const candidates = [];
  for (const f of files) {
    let html;
    try { html = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    const section = rel.split('/')[0].toUpperCase();
    for (const p of paragraphs(html)) {
      const h = hash(p);
      if (mined.has(h)) continue;
      // Prefer paragraphs with concrete facts (numbers, names) over general prose.
      const score = (p.match(/\b\d{3,4}\b|\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || []).length;
      candidates.push({ p, h, rel, section, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const startedAt = Date.now();
  let accepted = 0;
  for (const c of candidates) {
    if (accepted >= COUNT) break;
    if ((Date.now() - startedAt) / 60000 > DEADLINE_MIN) { console.log('deadline reached'); break; }
    let cand = null;
    try { cand = await propose(c.p, c.section); } catch (e) { console.log('  proposal failed: ' + e.message); continue; }
    if (!cand) continue;
    const qn = norm(cand.question);
    if (seenQ.has(qn)) continue;
    let ok = false;
    try { ok = await verify(c.p, cand); } catch (e) { console.log('  verify failed: ' + e.message); continue; }
    if (!ok) { console.log('  rejected by verifier: ' + cand.question.slice(0, 70)); continue; }
    store.questions.push({
      id: hash(c.rel + '|' + c.h + '|' + cand.question),
      lesson: c.rel,
      paragraphHash: c.h,
      q: cand.question,
      a: cand.options[cand.answer],
      opts: cand.options,
      solution: cand.solution,
      passage: c.p,
      section: c.section,
      verified: true,
      generatedAt: new Date().toISOString(),
      model: process.env.LESSON_INVENT_MODEL || 'hosted'
    });
    mined.add(c.h);
    seenQ.add(qn);
    accepted++;
    saveStore(store);
    console.log('  + ' + c.rel + ' :: ' + cand.question.slice(0, 80));
  }
  saveStore(store);
  console.log('invented ' + accepted + ' verified question(s); store now ' + store.questions.length);
}

main().catch((e) => { console.error('FAIL ' + e.message); process.exitCode = 1; });