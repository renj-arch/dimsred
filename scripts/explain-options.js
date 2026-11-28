#!/usr/bin/env node
'use strict';
/**
 * explain-options.js — why the correct option is right AND why each distractor
 * is wrong, for the questions the mock tests and papers use.
 *
 * The paper solution often says only "Correct answer: so." A student learns
 * nothing from that. This lane writes, per question:
 *   whyCorrect: one line of rule/reasoning
 *   wrong: { "B": "...", "C": "...", "D": "..." } one line each
 * stores it in data/question-explain.json (keyed by normalised text), verifies
 * with an independent model, and mock-test.js renders it on reveal/review.
 *
 *   node scripts/explain-options.js --limit 10 --dry
 *   node scripts/explain-options.js --limit 10
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'question-explain.json');
const ROUTES = { NVAPI: 'NVIDIA_API_KEY', GROQ: 'GROQ_API_KEY', OPENROUTER: 'OPENROUTER_API_KEY', GH_MODELS: 'GH_MODELS_TOKEN', GEMINI: 'GEMINI_API_KEY' };
for (const f of Object.keys(ROUTES)) if (process.env[ROUTES[f]] && process.env[f] !== '0') process.env[f] = '1';

const DRY = process.argv.includes('--dry');
const LIMIT = Math.max(1, parseInt((process.argv[process.argv.indexOf('--limit') + 1] || '10'), 10) || 10);
const keyOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 160);

function extractJson(text) {
  const i = String(text || '').indexOf('{');
  if (i < 0) return null;
  let d = 0, str = false, esc = false;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (str) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') str = false; continue; }
    if (c === '"') str = true;
    else if (c === '{') d++;
    else if (c === '}') { d--; if (!d) { try { return JSON.parse(text.slice(i, j + 1)); } catch (e) { return null; } } }
  }
  return null;
}

function pool() {
  const out = [];
  const seen = new Set();
  const add = (text, options, answer) => {
    if (!text || !options || options.length < 2 || !answer) return;
    const k = keyOf(text);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ text, options, answer, key: k });
  };
  try {
    const dir = path.join(ROOT, 'question-bank');
    for (const f of fs.readdirSync(dir)) {
      if (!/\.json$/.test(f) || /-meta\.json$/.test(f)) continue;
      let b;
      try { b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { continue; }
      for (const q of (b.questions || [])) {
        const opts = q.options || [];
        const ci = opts.findIndex((o) => o && o.correct === true);
        if (ci < 0) continue;
        add(q.text, opts.map((o) => ({ l: o.label, t: o.text })), ci);
      }
    }
  } catch (e) { /* no bank checkout */ }
  try {
    const cq = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course-questions.json'), 'utf8'));
    for (const q of (cq.questions || [])) {
      const opts = q.opts || [];
      const ci = opts.findIndex((o) => o && o.c === true);
      if (ci < 0) continue;
      add(q.q, opts.map((o, i) => ({ l: String.fromCharCode(65 + i), t: o.t })), ci);
    }
  } catch (e) {}
  return out;
}

async function main() {
  if (process.argv.includes('--remaining')) {
    let s = { items: {} };
    try { s = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
    s.items = s.items || {};
    console.log('LANE_REMAINING=' + pool().filter((q) => !s.items[q.key]).length);
    return;
  }
  if (!DRY && !require('./lib/hosted').enabled()) { console.error('no model route'); process.exitCode = 1; return; }
  const hosted = DRY ? null : require('./lib/hosted');
  let store = { items: {} };
  try { store = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
  store.items = store.items || {};

  const all = pool();
  const todo = all.filter((q) => !store.items[q.key]).slice(0, LIMIT);
  console.log('pool ' + all.length + ', explained ' + Object.keys(store.items).length + ', to do ' + todo.length);

  let done = 0;
  for (const q of todo) {
    const letters = q.options.map((o, i) => ({ L: String.fromCharCode(65 + i), t: o.t }));
    const user = 'QUESTION: ' + q.text + '\n\nOPTIONS:\n' + letters.map((o) => o.L + ') ' + o.t).join('\n') + '\n\nCORRECT: ' + letters[q.answer].L + ') ' + letters[q.answer].t;
    if (DRY) { console.log('  would explain: ' + q.text.slice(0, 70)); continue; }
    let ex;
    try {
      ex = extractJson(await hosted.chat(
        'You are an exam tutor. Explain why the correct option is right and why EACH incorrect option is wrong — the exact rule, fact or trap (grammar, maths step, or knowledge). One short sentence each, no repetition. Reply JSON only: {"whyCorrect":"<=160 chars","wrong":{"B":"<=140 chars"}} with a key for every incorrect option letter.',
        user, { numPredict: 3000, temperature: 0.2 }));
    } catch (e) { console.log('  propose failed: ' + e.message); continue; }
    if (!ex || !ex.whyCorrect) continue;
    let ok = false;
    try {
      const v = extractJson(await hosted.chat(
        'You are an independent checker. Are these explanations factually correct and do they explain why each option is right/wrong? Reject if any is wrong or misleading. Reply JSON only: {"ok":true|false}.',
        user + '\n\nEXPLANATION: ' + JSON.stringify(ex), { numPredict: 1200, temperature: 0 }));
      ok = !!(v && v.ok === true);
    } catch (e) { console.log('  verify failed: ' + e.message); continue; }
    if (!ok) { console.log('  rejected: ' + q.text.slice(0, 60)); continue; }
    store.items[q.key] = { correct: letters[q.answer].t, whyCorrect: String(ex.whyCorrect).slice(0, 200), wrong: ex.wrong || {}, verified: true, at: new Date().toISOString() };
    done++;
    fs.writeFileSync(OUT, JSON.stringify(store, null, 1) + '\n', 'utf8');
    console.log('  + ' + q.text.slice(0, 60));
  }
  if (!DRY) console.log('added ' + done + '; store now ' + Object.keys(store.items).length);
  if (!DRY) console.log('LANE_DONE=' + done + ' LANE_REMAINING=' + all.filter((q) => !store.items[q.key]).length);
}
main().catch((e) => { console.error(e && e.stack || e); process.exitCode = 1; });