#!/usr/bin/env node
'use strict';
/**
 * audit-cartoons.js — fact-check the labels inside passage cartoons.
 *
 * The lesson fact audit reads prose, not the SVG labels a cartoon invents. A
 * cartoon can put a wrong date, name or number on the page in large type.
 * This lane reads each cartoon's labels against the passage it summarises, has
 * a model flag wrong/unsupported labels, asks an independent verifier to
 * confirm, and removes only the labels both agree are wrong.
 *
 *   node scripts/audit-cartoons.js --limit 10 --dry
 *   node scripts/audit-cartoons.js --limit 10 --apply
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const STATE = path.join(ROOT, 'data', 'cartoon-audit.json');
const ROUTES = { NVAPI: 'NVIDIA_API_KEY', GROQ: 'GROQ_API_KEY', OPENROUTER: 'OPENROUTER_API_KEY', GH_MODELS: 'GH_MODELS_TOKEN', GEMINI: 'GEMINI_API_KEY' };
for (const f of Object.keys(ROUTES)) if (process.env[ROUTES[f]] && process.env[f] !== '0') process.env[f] = '1';

const DRY = process.argv.includes('--dry');
const APPLY = process.argv.includes('--apply');
const LIMIT = Math.max(1, parseInt((process.argv[process.argv.indexOf('--limit') + 1] || '10'), 10) || 10);
const hash = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 12);
const strip = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

function walk(dir, out) {
  let es = [];
  try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of es) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/^lesson-.*\.html$/.test(e.name)) out.push(p);
  }
  return out;
}

function figurePassage(html, at) {
  // nearest preceding heading, and the body until the next heading of the same level
  const before = html.slice(0, at);
  const hs = [...before.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/g)];
  const h = hs[hs.length - 1];
  if (!h) return { title: '', text: '' };
  const start = h.index + h[0].length;
  const after = html.slice(start);
  const next = after.search(/<h[23]\b/);
  const body = next > 0 ? after.slice(0, next) : after;
  return { title: strip(h[2]), text: strip(body).slice(0, 2200) };
}

function labelsOf(block) {
  return [...block.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((m) => strip(m[1])).filter(Boolean);
}

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

async function main() {
  if (process.argv.includes('--remaining')) {
    let st = { figures: {} };
    try { st = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) {}
    st.figures = st.figures || {};
    let remaining = 0;
    for (const f of walk(path.join(ROOT, 'upsc', 'course'), [])) {
      const html = fs.readFileSync(f, 'utf8');
      const re = /<figure class="passage-cartoon"[^>]*data-cartoon="([a-z0-9]+)"[\s\S]*?<\/figure>/g;
      let m;
      while ((m = re.exec(html))) { if (!st.figures[f + '#' + m[1]] && labelsOf(m[0]).length) remaining++; }
    }
    console.log('LANE_REMAINING=' + remaining);
    return;
  }
  if (!DRY && !require('./lib/hosted').enabled()) { console.error('no model route'); process.exitCode = 1; return; }
  const hosted = DRY ? null : require('./lib/hosted');
  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { state = { figures: {} }; }
  state.figures = state.figures || {};

  const figures = [];
  for (const f of walk(path.join(ROOT, 'upsc', 'course'), [])) {
    const html = fs.readFileSync(f, 'utf8');
    const re = /<figure class="passage-cartoon"[^>]*data-cartoon="([a-z0-9]+)"[\s\S]*?<\/figure>/g;
    let m;
    while ((m = re.exec(html))) {
      const key = f + '#' + m[1];
      if (state.figures[key]) continue;
      const p = figurePassage(html, m.index);
      const labels = labelsOf(m[0]);
      if (!labels.length) continue;
      figures.push({ file: f, html, id: m[1], key, title: p.title, text: p.text, labels, block: m[0] });
      if (figures.length >= LIMIT) break;
    }
    if (figures.length >= LIMIT) break;
  }

  let checked = 0, flagged = 0, removed = 0;
  for (const fig of figures) {
    if (DRY) { console.log(fig.id + ' :: ' + fig.title.slice(0, 50) + ' :: ' + fig.labels.slice(0, 6).join(', ')); continue; }
    checked++;
    const prompt = 'Cartoon section: ' + fig.title + '\n\nPassage it summarises:\n' + fig.text + '\n\nLabels printed on the cartoon:\n' + fig.labels.map((l, i) => (i + 1) + '. ' + l).join('\n');
    let found = null;
    try {
      const t = await hosted.chat(
        'You fact-check labels on a revision cartoon. A label is wrong if it states a date, name, number or relation that the passage does not support or that is factually false. Do not flag a label merely because it is short or simplified. Reply JSON only: {"problems":[{"label":"<exact label>","problem":"<=120 chars","correction":"<=60 chars or empty","confidence":"high|medium"}]}',
        prompt, { numPredict: 3000, temperature: 0.1 });
      found = extractJson(t);
    } catch (e) { console.error('  model failed: ' + e.message); }
    const probs = (found && Array.isArray(found.problems)) ? found.problems.filter((p) => p && p.label && p.confidence === 'high') : [];
    if (!probs.length) { state.figures[fig.key] = { at: new Date().toISOString(), labels: fig.labels.length, flagged: 0 }; continue; }
    flagged += probs.length;
    // independent verifier
    let verdicts = [];
    try {
      const t = await hosted.chat(
        'You are an independent fact-checker. For each claim that a cartoon label is wrong, decide if the label is definitely wrong. Reject anything uncertain. Reply JSON only: {"verdicts":[{"n":<number>,"agree":true|false}]}',
        probs.map((p, i) => '(' + (i + 1) + ') LABEL: ' + p.label + '\nPROBLEM: ' + p.problem).join('\n\n'),
        { numPredict: 2000, temperature: 0 });
      const v = extractJson(t);
      verdicts = (v && v.verdicts) || [];
    } catch (e) { console.error('  verifier failed: ' + e.message); }
    const ok = new Set(verdicts.filter((v) => v && v.agree === true).map((v) => String(v.n)));
    let block = fig.block;
    let removedHere = 0;
    probs.forEach((p, i) => {
      if (!ok.has(String(i + 1))) return;
      const esc = p.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp('<text\\b[^>]*>(?:(?!</text>)[\\s\\S])*?' + esc + '(?:(?!</text>)[\\s\\S])*?</text>', 'i');
      if (re.test(block)) { block = block.replace(re, ''); removedHere++; }
    });
    if (APPLY && removedHere) {
      const page = fs.readFileSync(fig.file, 'utf8');
      const out = page.replace(fig.block, block);
      if (out !== page) { fs.writeFileSync(fig.file, out, 'utf8'); removed += removedHere; }
    }
    state.figures[fig.key] = { at: new Date().toISOString(), labels: fig.labels.length, flagged: probs.length, removed: removedHere, problems: probs.slice(0, 6) };
    fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n', 'utf8');
    console.log('  ' + fig.id + ' :: ' + probs.length + ' flagged, ' + removedHere + ' label(s) removed');
  }
  if (!DRY) {
    fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n', 'utf8');
    console.log('cartoon audit: ' + checked + ' checked, ' + flagged + ' flags, ' + removed + ' labels removed' + (APPLY ? '' : ' (dry apply)'));
    console.log('LANE_DONE=' + checked);
  }
}
main().catch((e) => { console.error(e && e.stack || e); process.exitCode = 1; });