#!/usr/bin/env node
/**
 * research-invented.js — an original method for each freshly invented question.
 *
 * The papers show a "Research Team" method under the solution. Invented
 * questions served by mental.html (Grand Slam, topic drills) had only the
 * standard solution. This lane writes a second, independent route to the same
 * answer and an independent verifier must confirm it reaches the key.
 *
 * Output: data/research-invented.json, keyed by the normalised question text so
 * the browser can attach it without a paper slug.
 *
 *   node scripts/research-invented.js
 *   RESEARCH_INVENT_COUNT=20 node scripts/research-invented.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES = { NVAPI: 'NVIDIA_API_KEY', GROQ: 'GROQ_API_KEY', OPENROUTER: 'OPENROUTER_API_KEY', GH_MODELS: 'GH_MODELS_TOKEN' };
for (const flag of Object.keys(ROUTES)) {
  if (process.env[ROUTES[flag]] && process.env[flag] !== '0') process.env[flag] = '1';
}
const hosted = require('./lib/hosted');

const ROOT = path.resolve(__dirname, '..');
const POOL = path.join(ROOT, 'data', 'invented', 'questions.json');
const OUT = path.join(ROOT, 'data', 'research-invented.json');
const COUNT = parseInt(process.env.RESEARCH_INVENT_COUNT || '12', 10) || 12;
const DEADLINE_MIN = parseInt(process.env.RESEARCH_INVENT_DEADLINE_MIN || '25', 10) || 25;
const MAX = parseInt(process.env.RESEARCH_INVENT_MAX || '3000', 10) || 3000;

const keyOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 160);
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function load(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }
function save() {
  store.updatedAt = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(store, null, 1) + '\n', 'utf8');
}

const store = load(OUT, { updatedAt: null, note: 'Original alternative methods for invented questions. Each is checked against the key by an independent call.', methods: {} });
if (!store.methods || typeof store.methods !== 'object') store.methods = {};

function extractJson(text) {
  const i = String(text || '').indexOf('{');
  if (i < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { try { return JSON.parse(text.slice(i, j + 1)); } catch (e) { return null; } } }
  }
  return null;
}

const SYSTEM = 'You are a methods researcher for an Indian exam site. Given an MCQ, its options and the correct answer, ' +
  'write an ORIGINAL alternative method that reaches the correct answer by a different route from the standard solution. ' +
  'Also give a "shortcut": one line (<=120 chars) of the fastest estimation or elimination a topper uses to predict the answer. ' +
  'It must be verifiable in 2-4 short steps. Reply JSON only: ' +
  '{"name":"3-5 words naming the method","seconds":10,"shortcut":"<=120 chars","steps":["step 1","step 2","step 3"]}.';
const VERIFY = 'You are an independent verifier. Given the question, the options, the correct answer and a proposed method, ' +
  'does the method actually reach the correct answer, with no wrong step? Reply JSON only: {"ok":true|false,"reason":"<=160 chars"}';

(async function main() {
  if (!hosted.enabled()) { console.error('no model route configured'); process.exitCode = 1; return; }
  const pool = (function () {
  const inv = load(POOL, { questions: [] }).questions || [];
  // Course-lesson questions are served in current-affairs too; they had only
  // the standard working, so the Research Team method was missing exactly where
  // a student answers most questions. Include them in the same store.
  const course = load(path.join(ROOT, 'data', 'course-questions.json'), { questions: [] }).questions || [];
  const all = inv.concat(course.map((q) => ({
    stem: q.q,
    answer: q.a,
    options: q.opts,
    section: q._exam || 'course',
    topic: q.subject || '',
    difficulty: ''
  }))).concat((function () {
    // The exam question banks back the mock tests and papers; include them so
    // the Research Team and the quick trick appear where students sit papers.
    const out = [];
    try {
      const dir = path.join(ROOT, 'question-bank');
      for (const f of fs.readdirSync(dir)) {
        if (!/\.json$/.test(f) || /-meta\.json$/.test(f)) continue;
        const b = load(path.join(dir, f), { questions: [] });
        for (const q of (b.questions || [])) {
          const correct = (q.options || []).filter((o) => o && o.correct === true)[0];
          if (!correct || !q.text) continue;
          out.push({ stem: q.text, answer: correct.text, options: (q.options || []).map((o) => o.text), section: f.replace(/\.json$/, ''), topic: q.section || '', difficulty: '' });
        }
      }
    } catch (e) { /* no bank checkout */ }
    return out;
  })());
  const seen = new Set();
  return all.filter((q) => {
    if (!q || !q.stem || !q.answer) return false;
    const k = keyOf(q.stem);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
})();
  const todo = pool.filter((q) => q && q.stem && q.answer && q.options && q.options.length >= 4 && !store.methods[keyOf(q.stem)]);
  console.log('pool ' + pool.length + ', already researched ' + Object.keys(store.methods).length + ', to do ' + todo.length);
  const startedAt = Date.now();
  let done = 0;
  for (const q of todo) {
    if (done >= COUNT) break;
    if ((Date.now() - startedAt) / 60000 > DEADLINE_MIN) { console.log('deadline reached'); break; }
    const opts = q.options.map((o, i) => (i + 1) + '. ' + (typeof o === 'string' ? o : o.text));
    const user = 'QUESTION: ' + q.stem + '\n\nOPTIONS:\n' + opts.join('\n') + '\n\nCORRECT ANSWER: ' + q.answer;
    let m;
    try {
      m = extractJson(await hosted.chat(SYSTEM, user, { numPredict: 5000, temperature: 0.3 }));
    } catch (e) { console.log('  propose failed: ' + e.message); continue; }
    if (!m || !m.name || !Array.isArray(m.steps) || m.steps.length < 2) continue;
    const steps = m.steps.map(clean).filter(Boolean).slice(0, 6);
    if (steps.length < 2) continue;
    let ok = false;
    try {
      const v = extractJson(await hosted.chat(VERIFY, user + '\n\nPROPOSED METHOD (' + m.name + '):\n' + steps.map((s, i) => (i + 1) + '. ' + s).join('\n'), { numPredict: 4000, temperature: 0 }));
      ok = !!(v && v.ok === true);
    } catch (e) { console.log('  verify failed: ' + e.message); continue; }
    if (!ok) { console.log('  method rejected for: ' + q.stem.slice(0, 60)); continue; }
    store.methods[keyOf(q.stem)] = {
      name: clean(m.name).slice(0, 80),
      seconds: parseInt(m.seconds, 10) || 10,
      shortcut: clean(m.shortcut || '').slice(0, 140),
      steps,
      answer: String(q.answer),
      verified: true,
      generatedAt: new Date().toISOString(),
      model: 'hosted'
    };
    done++;
    save();
    console.log('  + ' + clean(m.name) + ' :: ' + q.stem.slice(0, 60));
  }
  // Keep the store bounded.
  const keys = Object.keys(store.methods);
  if (keys.length > MAX) {
    for (const k of keys.slice(0, keys.length - MAX)) delete store.methods[k];
  }
  save();
  console.log('added ' + done + '; store now ' + Object.keys(store.methods).length);
})().catch((e) => { console.error('FAIL ' + e.message); process.exitCode = 1; });