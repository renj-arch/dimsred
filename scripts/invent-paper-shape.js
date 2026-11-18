#!/usr/bin/env node
/**
 * invent-paper-shape.js — grow a question bank that looks like the paper.
 *
 * The audit found the existing bank is fill-in-the-blank recall (0 multi-
 * statement, 0 match-the-following, 0 chronology out of 12,000 sampled). This
 * writes questions in the shapes a modern prelims paper actually uses, one
 * shape at a time, and refuses anything that fails validation.
 *
 *   node scripts/invent-paper-shape.js --count 6
 *   node scripts/invent-paper-shape.js --shape multi-statement --topic "Fiscal policy"
 *   node scripts/invent-paper-shape.js --count 3 --dry-run
 *
 * Output: data/upsc-format-questions.json  { generatedAt, questions: [...] }
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { SHAPES, shapeById, validateCommon, prompt } = require('./lib/paper-shapes');
// scripts/lib/hosted.js reads its route flags when it is required, so the lane
// opts in from the key BEFORE the require, not inside main().
const ROUTES = {
  NVAPI: 'NVIDIA_API_KEY',
  GROQ: 'GROQ_API_KEY',
  OPENROUTER: 'OPENROUTER_API_KEY',
  GH_MODELS: 'GH_MODELS_TOKEN'
};
for (const flag of Object.keys(ROUTES)) {
  if (process.env[ROUTES[flag]] && process.env[flag] !== '0') process.env[flag] = '1';
}
const hosted = require('./lib/hosted');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'upsc-format-questions.json');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}
const has = (n) => process.argv.indexOf('--' + n) !== -1;

/* ---------------------------------------------------------------------------
 * Where to ask. The syllabus audit ranks topics by how thin they are, so the
 * generator works from the weakest material upward instead of re-covering the
 * topics that are already solid.
 * ------------------------------------------------------------------------ */
function loadAudit() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'upsc-syllabus-coverage.json'), 'utf8')); }
  catch (e) { return null; }
}

function subjectFallback(subject) {
  const map = {
    'Art and Culture': 'upsc/course/gs/lesson-art-culture-prelims.html',
    'History of India': 'upsc/course/gs/lesson-indian-history.html',
    'Geography': 'upsc/course/gs/lesson-indian-geography.html',
    'Polity and Governance': 'upsc/course/gs/lesson-indian-polity.html',
    'Economy and Social Development': 'upsc/course/gs/lesson-indian-economy.html',
    'Environment and Ecology': 'upsc/course/gs/lesson-environment-ecology.html',
    'General Science': 'upsc/course/gs/lesson-general-science.html',
    'Current Affairs': 'upsc/course/gs/lesson-current-affairs.html'
  };
  const rel = map[subject];
  return rel && fs.existsSync(path.join(ROOT, rel)) ? path.join(ROOT, rel) : null;
}

// A topic name rarely appears in a filename ("Theatre, puppetry and martial
// arts"), so the match also reads each lesson's own heading. Only the first
// few KB are read, because that is where the h1 is.
let _index = null;
function lessonIndex() {
  if (_index) return _index;
  const out = [];
  for (const exam of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!exam.isDirectory()) continue;
    const gs = path.join(ROOT, exam.name, 'course');
    if (!fs.existsSync(gs)) continue;
    const stack = [gs];
    while (stack.length) {
      const dir = stack.pop();
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) stack.push(full);
        else if (/^lesson-.*\.html$/.test(e.name)) {
          let head = '';
          try {
            const fd = fs.openSync(full, 'r');
            const buf = Buffer.alloc(8192);
            const n = fs.readSync(fd, buf, 0, 8192, 0);
            fs.closeSync(fd);
            head = buf.slice(0, n).toString('utf8');
          } catch (err) { head = ''; }
          const t = (head.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
          out.push({ rel: path.relative(ROOT, full).replace(/\\/g, '/'), title: t.replace(/<[^>]+>/g, ' ').toLowerCase() });
        }
      }
    }
  }
  _index = out;
  return out;
}

function lessonFor(topic, subject) {
  const words = String(topic).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  let best = null;
  let bestScore = 0;
  for (const L of lessonIndex()) {
    let score = 0;
    const rel = L.rel.toLowerCase();
    for (const w of words) {
      if (rel.indexOf(w) !== -1) score += 2;
      if (L.title.indexOf(w) !== -1) score += 3;
    }
    if (score > bestScore) { bestScore = score; best = L.rel; }
  }
  // Nothing matched by name: use the subject's flagship lesson rather than
  // skipping the topic, which is how a thin topic never gets any questions.
  let rel = bestScore > 0 ? best : null;
  if (!rel && subject) {
    const f = subjectFallback(subject);
    if (f) rel = path.relative(ROOT, f).replace(/\\/g, '/');
  }
  if (!rel) return null;

  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const i = html.indexOf('<div class="lesson-body"');
  const body = i === -1 ? html : html.slice(i);
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#183;|&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ');
  return { rel: rel, text: text.trim() };
}

function topicsToCover(count) {
  const audit = loadAudit();
  const list = [];
  if (audit && audit.subjects) {
    for (const subject of Object.keys(audit.subjects)) {
      for (const t of audit.subjects[subject]) {
        list.push({ topic: t.topic, subject: subject, hits: t.hits });
      }
    }
    list.sort((a, b) => a.hits - b.hits);
  }
  const seen = new Set();
  const out = [];
  let i = 0;
  while (out.length < count && i < Math.max(count * 3, list.length)) {
    const cand = list[i] || { topic: 'Indian Polity and Governance' };
    i++;
    if (seen.has(cand.topic)) continue;
    seen.add(cand.topic);
    out.push(cand);
  }
  return out.length ? out : [{ topic: 'Indian Polity and Constitution' }];
}

/* ------------------------------------------------------------------------ */

function extractJson(text) {
  const first = String(text || '').indexOf('{');
  if (first < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = first; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(first, i + 1)); } catch (e) { return null; }
      }
    }
  }
  return null;
}

function loadBank() {
  try {
    const doc = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    if (Array.isArray(doc.questions)) return doc;
  } catch (e) { /* first run */ }
  return { generatedAt: null, questions: [] };
}

function stemKey(q) {
  return String(q).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 90);
}

async function main() {
  const count = Number(arg('count', '6'));
  const onlyShape = arg('shape', '');
  const onlyTopic = arg('topic', '');
  const dry = has('dry-run');

  // scripts/lib/hosted.js is opt-in per lane. This lane can safely opt in from
  // the key itself: if a key is configured, use it.
  const ROUTES = {
    NVAPI: 'NVIDIA_API_KEY',
    GROQ: 'GROQ_API_KEY',
    OPENROUTER: 'OPENROUTER_API_KEY',
    GH_MODELS: 'GH_MODELS_TOKEN'
  };
  for (const flag of Object.keys(ROUTES)) {
    if (process.env[ROUTES[flag]] && process.env[flag] !== '0') process.env[flag] = '1';
  }

  if (!hosted.enabled() && !dry) {
    console.error('FAIL no hosted model route is configured (set NVIDIA_API_KEY / GROQ_API_KEY / OPENROUTER_API_KEY)');
    process.exitCode = 1;
    return;
  }

  const bank = loadBank();
  const seen = new Set(bank.questions.map((q) => stemKey(q.question)));
  const shapes = onlyShape ? [shapeById(onlyShape)].filter(Boolean) : SHAPES;
  if (!shapes.length) { console.error('FAIL unknown shape: ' + onlyShape); process.exitCode = 1; return; }

  const topics = onlyTopic ? [{ topic: onlyTopic }] : topicsToCover(count);
  let added = 0;
  let rejected = 0;

  for (let n = 0; n < count; n++) {
    const shape = shapes[n % shapes.length];
    const t = topics[n % topics.length];
    const lesson = lessonFor(t.topic, t.subject);
    if (!lesson) { console.error('  no lesson found for ' + t.topic); continue; }

    let q = null;
    for (let attempt = 1; attempt <= 3 && !q; attempt++) {
      let text = '';
      try {
        text = await hosted.chat(
          'You write UPSC Prelims questions. You answer with one JSON object and nothing else.',
          prompt(shape, t.topic, lesson.text) + (attempt > 1 ? '\n\nThe last answer was rejected: ' + (q && q.__why ? q.__why : 'it did not follow the rules above') + '. Return a correct JSON object.' : ''),
          { numPredict: 6000, temperature: onlyShape ? 0.5 : 0.6 }
        );
      } catch (e) {
        console.error('  model call failed: ' + e.message);
        break;
      }
      const cand = extractJson(text);
      if (!cand) { console.error('  no JSON in the answer'); continue; }
      cand.shape = shape.id;
      cand.topic = cand.topic || t.topic;
      cand.lesson = lesson.rel;
      const errs = validateCommon(cand, shape);
      if (errs.length) {
        console.error('  ' + shape.id + ' rejected: ' + errs.join('; '));
        rejected++;
        cand.__why = errs.join('; ');
        continue;
      }
      if (seen.has(stemKey(cand.question))) { console.error('  duplicate stem, dropped'); rejected++; continue; }
      seen.add(stemKey(cand.question));
      q = cand;
    }

    if (!q) continue;
    delete q.__why;
    q.generatedAt = new Date().toISOString();
    bank.questions.push(q);
    added++;
    console.log('  + ' + shape.id + ': ' + String(q.question).slice(0, 80));
  }

  bank.generatedAt = new Date().toISOString();
  if (dry) {
    process.stdout.write(JSON.stringify(bank.questions.slice(-added), null, 2) + '\n');
    return;
  }
  fs.writeFileSync(OUT, JSON.stringify(bank, null, 1) + '\n', 'utf8');
  console.log('paper-shape bank: +' + added + ' (' + rejected + ' rejected), ' + bank.questions.length + ' total');
}

main().catch((e) => { console.error('FAIL ' + e.message); process.exitCode = 1; });