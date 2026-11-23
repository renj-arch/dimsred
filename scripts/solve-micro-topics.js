#!/usr/bin/env node
/**
 * solve-micro-topics.js — worked solutions + Research Team methods for the
 * micro-test topic banks.
 *
 * The topic banks ship a placeholder ("Correct answer: X."). This lane writes a
 * real worked solution and an alternative method for each question, and an
 * independent verifier must confirm the method reaches the key. stored in
 * data/micro-solutions.json keyed by question text, which micro-test.js attaches
 * at answer time.
 *
 *   node scripts/solve-micro-topics.js --count 8
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
const OUT = path.join(ROOT, 'data', 'micro-solutions.json');
const COUNT = parseInt(process.env.MICRO_SOLVE_COUNT || '8', 10) || 8;
const DEADLINE = parseInt(process.env.MICRO_SOLVE_DEADLINE_MIN || '25', 10) || 25;

const key = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 160);
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

let store = { generatedAt: null, note: 'Worked solutions + Research Team methods for topic-bank questions, keyed by question text.', entries: {} };
try { const j = JSON.parse(fs.readFileSync(OUT, 'utf8')); if (j && j.entries) store = j; } catch (e) {}
function save() { store.generatedAt = new Date().toISOString(); fs.writeFileSync(OUT, JSON.stringify(store, null, 1) + '\n', 'utf8'); }

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

(async function main() {
  if (!hosted.enabled()) { console.error('no model route configured'); process.exitCode = 1; return; }
  const topicsDir = path.join(ROOT, 'data', 'topics');
  const candidates = [];
  for (const f of fs.readdirSync(topicsDir).filter((x) => x.endsWith('.json'))) {
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(topicsDir, f), 'utf8')); } catch (e) { continue; }
    (d.sections || []).forEach((s) => (s.questions || []).forEach((q) => {
      if (!q || !q.text || !Array.isArray(q.options) || q.options.length < 4) return;
      if (!/^Correct answer:/i.test(String(q.solution || '')) && q.solution) return; // already has a real solution
      if (store.entries[key(q.text)]) return;
      candidates.push({ q, bank: f.replace('.json', ''), section: s.name || '' });
    }));
  }
  console.log('candidates without a real solution: ' + candidates.length);
  const startedAt = Date.now();
  let done = 0;
  for (const c of candidates) {
    if (done >= COUNT) break;
    if ((Date.now() - startedAt) / 60000 > DEADLINE) { console.log('deadline reached'); break; }
    const q = c.q;
    const opts = q.options.map((o, i) => (i + 1) + '. ' + o.text).join('\n');
    const ans = q.options[Math.max(0, Math.min(3, Number(q.answer) || 0))];
    const user = 'QUESTION: ' + q.text + '\n\nOPTIONS:\n' + opts + '\n\nCORRECT ANSWER: ' + ans.label + '. ' + ans.text;
    let mine;
    try {
      mine = extractJson(await hosted.chat(
        'You are an exam tutor. Given an MCQ, write (a) a worked solution of 2-4 short steps that reaches the correct answer, and (b) an ORIGINAL alternative method (a different route) that also reaches it. ' +
        'Reply JSON only: {"solution":"...","research":{"name":"3-5 words","seconds":10,"steps":["...","..."]}}',
        user, { numPredict: 6000, temperature: 0.2 }));
    } catch (e) { console.log('  propose failed: ' + e.message); continue; }
    if (!mine || !mine.solution) continue;
    const steps = (mine.research && Array.isArray(mine.research.steps)) ? mine.research.steps.map(clean).filter(Boolean).slice(0, 6) : [];
    if (steps.length < 2) continue;
    let ok = false;
    try {
      const v = extractJson(await hosted.chat(
        'You are an independent verifier. Given the question, options, correct answer and a proposed alternative method, does the method reach the correct answer with no wrong step? Reply JSON only: {"ok":true|false,"reason":"<=160 chars"}',
        user + '\n\nPROPOSED METHOD (' + (mine.research.name || '') + '):\n' + steps.map((s, i) => (i + 1) + '. ' + s).join('\n'),
        { numPredict: 4000, temperature: 0 }));
      ok = !!(v && v.ok === true);
    } catch (e) { console.log('  verify failed: ' + e.message); continue; }
    if (!ok) { console.log('  rejected: ' + q.text.slice(0, 60)); continue; }
    store.entries[key(q.text)] = {
      solution: clean(mine.solution),
      research: { name: clean((mine.research && mine.research.name) || 'Alternative method').slice(0, 80), seconds: parseInt(mine.research && mine.research.seconds, 10) || 10, steps },
      verified: true,
      bank: c.bank,
      generatedAt: new Date().toISOString()
    };
    done++;
    save();
    console.log('  + ' + c.bank + ' :: ' + q.text.slice(0, 60));
  }
  save();
  console.log('solved ' + done + '; store now ' + Object.keys(store.entries).length);
})().catch((e) => { console.error('FAIL ' + e.message); process.exitCode = 1; });