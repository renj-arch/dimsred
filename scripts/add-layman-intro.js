#!/usr/bin/env node
'use strict';
/**
 * add-layman-intro.js — a plain-language "Start here" block for hard lessons.
 *
 * A beginner opening lesson-condensed-matter.html meets "collective behaviour
 * of interacting particles" and stops. This lane writes a 4-part intro at the
 * top of the lesson body — what it is, an everyday picture, why it matters,
 * the one thing to remember — and an independent model checks it is accurate
 * and genuinely beginner-level before it is inserted.
 *
 *   node scripts/add-layman-intro.js --limit 5 --dry
 *   node scripts/add-layman-intro.js --limit 5
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STATE = path.join(ROOT, 'data', 'layman-intro-state.json');
const ROUTES = { NVAPI: 'NVIDIA_API_KEY', GROQ: 'GROQ_API_KEY', OPENROUTER: 'OPENROUTER_API_KEY', GH_MODELS: 'GH_MODELS_TOKEN', GEMINI: 'GEMINI_API_KEY' };
for (const f of Object.keys(ROUTES)) if (process.env[ROUTES[f]] && process.env[f] !== '0') process.env[f] = '1';

const DRY = process.argv.includes('--dry');
const LIMIT = Math.max(1, parseInt((process.argv[process.argv.indexOf('--limit') + 1] || '8'), 10) || 8);
const _fileIdx = process.argv.indexOf('--file');
const ONLY = _fileIdx >= 0 ? (process.argv[_fileIdx + 1] || '') : '';
const HARD = /quantum|relativ|topolog|algebra|geometry|analysis|thermo|electromagnet|fluid|control|signal|crypto|condensed|particle|string|gauge|tensor|manifold|cohomology|dynamics|statistical|plasma|nuclear|astro|spectral|stochastic|operator|hilbert|differential/i;

const strip = (s) => String(s).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

function files() {
  const out = [];
  (function walk(dir) {
    let es = [];
    try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of es) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'data' && e.name !== 'node_modules' && e.name !== '.git') walk(p); }
      else if (/^lesson-.*\.html$/.test(e.name)) out.push(p);
    }
  })(ROOT);
  return out;
}

function extractJson(t) {
  const i = String(t || '').indexOf('{');
  if (i < 0) return null;
  let d = 0, str = false, es = false;
  for (let j = i; j < t.length; j++) {
    const c = t[j];
    if (str) { if (es) es = false; else if (c === '\\') es = true; else if (c === '"') str = false; continue; }
    if (c === '"') str = true;
    else if (c === '{') d++;
    else if (c === '}') { d--; if (!d) { try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { return null; } } }
  }
  return null;
}

async function main() {
  if (!DRY && !require('./lib/hosted').enabled()) { console.error('no model route'); process.exitCode = 1; return; }
  const hosted = DRY ? null : require('./lib/hosted');
  let state = { done: [] };
  try { state = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) {}
  state.done = state.done || [];

  const all = files()
    .filter((f) => { try { return fs.readFileSync(f, 'utf8').includes('<div class="lesson-body"'); } catch (e) { return false; } })
    .filter((f) => { try { return !fs.readFileSync(f, 'utf8').includes('<!-- layman-intro -->'); } catch (e) { return false; } });
  // hard topics first
  all.sort((a, b) => (HARD.test(b) ? 1 : 0) - (HARD.test(a) ? 1 : 0));
  const todo = (ONLY && !ONLY.startsWith('--') ? [path.resolve(ROOT, ONLY)] : all).slice(0, LIMIT);
  console.log('lessons without a plain intro: ' + all.length + ' | this run: ' + todo.length);

  let added = 0;
  for (const f of todo) {
    const html = fs.readFileSync(f, 'utf8');
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    if (state.done.indexOf(rel) !== -1) continue;
    const bodyAt = html.indexOf('<div class="lesson-body"');
    const title = ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || [, path.basename(f)])[1] || '').replace(/<[^>]+>/g, '').trim();
    const opening = strip(html.slice(bodyAt, bodyAt + 4000)).slice(0, 1200);
    if (DRY) { console.log('  would add: ' + rel + ' :: ' + title.slice(0, 60)); continue; }
    let block = null, why = '';
    for (let attempt = 1; attempt <= 2 && !block; attempt++) {
      let text;
      try {
        text = await hosted.chat(
          'You write the first 30 seconds of a lesson for a COMPLETE beginner. Plain words. If a technical term is unavoidable, define it in the same sentence.',
          'Lesson title: ' + title + '\nOpening of the lesson:\n' + opening + '\n\nWrite a "Start here" intro with exactly four parts:\n1. In one sentence: what this subject is.\n2. A picture from everyday life: one concrete analogy.\n3. Why it matters: one or two lines.\n4. The one thing to remember: one line.\nKeep it under 130 words. Return only HTML using <p> and <ol><li>; no headings, no markdown, no bold labels.',
          { numPredict: 1200, temperature: 0.4 });
      } catch (e) { why = e.message; continue; }
      const clean = String(text || '').replace(/```html?/gi, '').replace(/```/g, '').trim();
      if (!/^<(p|ol)/i.test(clean) || clean.length < 120 || clean.length > 1600) { why = 'bad shape'; continue; }
      let v = null;
      try {
        v = extractJson(await hosted.chat(
          'You are an independent checker. Is this intro accurate, genuinely beginner-level (plain words, a correct everyday analogy), and free of false claims? Reject if it is vague, wrong, or still jargon-heavy. Reply JSON only: {"ok":true|false,"reason":"<=120 chars"}.',
          'TOPIC: ' + title + '\n\nINTRO:\n' + clean, { numPredict: 1000, temperature: 0 }));
      } catch (e) { why = e.message; continue; }
      if (v && v.ok === true) block = clean; else why = (v && v.reason) || 'not verified';
    }
    if (!block) { console.log('  rejected ' + rel + ': ' + why); continue; }
    const section = '<!-- layman-intro -->\n<section class="layman-intro" style="background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.22);border-left:4px solid #34d399;border-radius:10px;padding:14px 16px;margin:14px 0">\n<div style="font-size:.76em;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#34d399;margin-bottom:6px">Start here — in plain words</div>\n' + block + '\n</section>\n';
    fs.writeFileSync(f, html.slice(0, bodyAt + '<div class="lesson-body">'.length) + '\n' + section + html.slice(bodyAt + '<div class="lesson-body">'.length), 'utf8');
    state.done.push(rel);
    fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n', 'utf8');
    added++;
    console.log('  + ' + rel);
  }
  if (!DRY) console.log('plain intros added: ' + added);
}
main().catch((e) => { console.error(e && e.stack || e); process.exitCode = 1; });