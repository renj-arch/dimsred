#!/usr/bin/env node
/**
 * audit-questions.js — fact-check the question bank itself.
 *
 * The lesson prose audit never read practice questions, so a wrong option like
 * "the 44th Amendment limited an ordinance to six weeks" survived. This lane
 * reads question + options + key + explanation, asks a model what (if anything)
 * is factually wrong, and requires an independent verifier to confirm the
 * correction before it is stored.
 *
 * Stores verified fixes in data/question-fixes.json. scripts/apply-question-
 * fixes.js applies the safe ones to the served bank at deploy time.
 *
 *   node scripts/audit-questions.js --limit 20
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

const ROOT = path.resolve(__dirname, '..');
const BANK = path.join(ROOT, 'data', 'course-questions.json');
const OUT = path.join(ROOT, 'data', 'question-fixes.json');
const STATE = path.join(ROOT, 'data', 'question-audit-state.json');
const LIMIT = parseInt(process.env.Q_AUDIT_LIMIT || '20', 10) || 20;

const hash = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 16);
const key = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 160);

function read(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }
function save(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 1) + '\n', 'utf8'); }

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
  const bank = read(BANK, { questions: [] });
  const state = read(STATE, { checked: {} });
  const fixes = read(OUT, { updatedAt: null, fixes: [] });
  if (!state.checked) state.checked = {};
  if (!Array.isArray(fixes.fixes)) fixes.fixes = [];

  // Oldest-checked first, so the sweep rotates through the bank.
  const qs = (bank.questions || []).filter((q) => q && q.q && q.solution && q.opts && q.opts.length >= 2);
  qs.sort((a, b) => String(state.checked[hash(a.q)] || '').localeCompare(String(state.checked[hash(b.q)] || '')));

  let done = 0;
  for (const q of qs) {
    if (done >= LIMIT) break;
    const h = hash(q.q);
    if (state.checked[h] && Date.now() - Date.parse(state.checked[h]) < 30 * 86400000) continue;
    const opts = q.opts.map((o, i) => (i + 1) + '. ' + o).join('\n');
    const user = 'QUESTION: ' + q.q + '\n\nOPTIONS:\n' + opts + '\n\nKEY: ' + q.a + '\n\nEXPLANATION: ' + q.solution;
    let finding;
    try {
      finding = extractJson(await hosted.chat(
        'You are a fact-checker for an Indian civil-services exam bank. Check this MCQ. ' +
        'Is the keyed answer correct? Is any factual claim in the stem, options or explanation WRONG (a wrong date, amendment, article, attribution, mechanism)? ' +
        'Do not report style, simplification or debatable wording. ' +
        'Reply JSON only: {"ok":true} if it is sound, else {"ok":false,"field":"option|solution|stem","quote":"exact text to replace, <=120 chars","correction":"replacement text","reason":"<=160 chars"}.',
        user, { numPredict: 6000, temperature: 0.1 }));
    } catch (e) { console.log('  model failed: ' + e.message); continue; }
    if (!finding) continue;
    state.checked[h] = new Date().toISOString();
    if (finding.ok === true) { save(STATE, state); continue; }
    if (!finding.quote || !finding.correction) { save(STATE, state); continue; }
    let ok = false;
    try {
      const v = extractJson(await hosted.chat(
        'You are an independent verifier. Is the quoted text in this MCQ actually wrong, and is the proposed correction accurate? ' +
        'Reject anything you cannot confirm. Reply JSON only: {"ok":true|false,"reason":"<=160 chars"}',
        user + '\n\nPROPOSED FIX: "' + finding.quote + '" -> "' + finding.correction + '" (' + (finding.reason || '') + ')',
        { numPredict: 4000, temperature: 0 }));
      ok = !!(v && v.ok === true);
    } catch (e) { console.log('  verify failed: ' + e.message); }
    if (ok) {
      fixes.fixes = fixes.fixes.filter((f) => !(f.qHash === h && f.quote === finding.quote));
      fixes.fixes.push({
        qHash: h,
        q: q.q,
        field: ['option', 'solution', 'stem'].indexOf(finding.field) !== -1 ? finding.field : 'solution',
        quote: String(finding.quote).slice(0, 200),
        correction: String(finding.correction).slice(0, 200),
        reason: String(finding.reason || '').slice(0, 200),
        verified: true,
        at: new Date().toISOString()
      });
      done++;
      console.log('  FIX [' + finding.field + '] ' + q.q.slice(0, 55) + ' :: ' + finding.quote.slice(0, 40) + ' -> ' + finding.correction.slice(0, 40));
    }
    save(STATE, state);
    save(OUT, fixes);
    fixes.updatedAt = new Date().toISOString();
  }
  save(STATE, state);
  fixes.updatedAt = new Date().toISOString();
  save(OUT, fixes);
  console.log('audited ' + done + ' new fix(es); store ' + fixes.fixes.length);
})().catch((e) => { console.error('FAIL ' + e.message); process.exitCode = 1; });