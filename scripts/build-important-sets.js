#!/usr/bin/env node
/**
 * build-important-sets.js — grow the three "important questions" sets in the
 * shape the papers actually use.
 *
 * The CSAT set shipped with "average of 10, 20, 30, 40, 50" and a fabricated
 * coding question whose explanation read "Not a match. Let me just go with
 * given pattern". The real CSAT is so different that practising on those items
 * teaches nothing, so this writes new items in the paper's own forms -
 * data sufficiency, passage inference, multi-statement, matched pairs,
 * chronology - and refuses the defects listed in scripts/lib/question-quality.js.
 *
 * It appends rather than replaces, so the sets grow every run like the course
 * lanes. Run with --clean to first drop existing meta/fabricated items.
 *
 *   node scripts/build-important-sets.js --set csat --count 6
 *   node scripts/build-important-sets.js --all --count 4
 *   node scripts/build-important-sets.js --clean
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { shapeById, validateCommon, prompt } = require('./lib/paper-shapes');
const quality = require('./lib/question-quality');

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

const SETS = {
  csat: {
    page: 'upsc/chapters/csat-important-questions.html',
    label: 'CSAT',
    shapes: ['data-sufficiency', 'passage-inference', 'multi-statement', 'assertion-reason', 'match-the-following'],
    topics: [
      'Logical reasoning: statement sufficiency',
      'Comprehension: drawing conclusions from a passage',
      'Quantitative aptitude: ratio and proportion in a real situation',
      'Quantitative aptitude: data interpretation from a table',
      'Decision making: an administrative dilemma',
      'Basic numeracy: percentages applied to a scenario',
      'Data interpretation: growth rates across years',
      'Comprehension: the authors main argument'
    ],
    lesson: 'upsc/course/csat/lesson-logical-reasoning.html'
  },
  'general-studies': {
    page: 'upsc/chapters/general-studies-important-questions.html',
    label: 'General Studies',
    shapes: ['multi-statement', 'match-the-following', 'chronology', 'assertion-reason', 'map-place'],
    topics: [
      'Constitutional provisions and fundamental rights',
      'Indian geography: rivers and drainage',
      'Modern Indian history: the national movement',
      'Environment and ecology: protected areas',
      'Indian economy: monetary policy',
      'Science and technology in daily life',
      'Art and culture: temple architecture',
      'International relations: India and its neighbours'
    ],
    lesson: 'upsc/course/gs/lesson-indian-polity.html'
  },
  'current-affairs': {
    page: 'upsc/chapters/current-affairs-important-questions.html',
    label: 'Current Affairs',
    shapes: ['multi-statement', 'match-the-following', 'application', 'assertion-reason'],
    topics: [
      'Government schemes and their implementing ministry',
      'International indices and India\u2019s rank',
      'Recent institutional appointments',
      'Global groupings India belongs to',
      'Recent legislation and what it changes',
      'Reports by constitutional and statutory bodies'
    ],
    lesson: 'upsc/course/gs/lesson-current-affairs.html'
  }
};

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}
const has = (n) => process.argv.indexOf('--' + n) !== -1;

function readSet(key) {
  const cfg = SETS[key];
  const file = path.join(ROOT, cfg.page);
  const html = fs.readFileSync(file, 'utf8');
  const m = /var questions = (\[[\s\S]*?\]);\r?\n/.exec(html);
  if (!m) throw new Error('no questions array in ' + cfg.page);
  const questions = JSON.parse(m[1]);
  return { cfg, file, html, questions, block: m[0], at: m.index };
}

function writeSet(set) {
  const out = JSON.stringify(set.questions);
  const next = set.html.slice(0, set.at) + 'var questions = ' + out + ';\n' +
    set.html.slice(set.at + set.block.length);
  fs.writeFileSync(set.file, next, 'utf8');
}

function stemKey(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);
}

function lessonExcerpt(rel) {
  try {
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const i = html.indexOf('<div class="lesson-body"');
    const body = i === -1 ? html : html.slice(i);
    return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3500);
  } catch (e) { return ''; }
}

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

function toPageQuestion(q, id, topic) {
  const correctAt = Number.isInteger(q.answer) ? q.answer : 0;
  const options = q.options.map((t, i) => ({ l: 'ABCD'[i], t: String(t), c: i === correctAt }));
  let text = String(q.question);
  if (q.passage) text = q.passage + '\n\n' + text;
  if (q.statement1) text += '\nI. ' + q.statement1 + '\nII. ' + q.statement2;
  if (Array.isArray(q.statements)) text += '\n' + q.statements.map((s, i) => (i + 1) + '. ' + s).join('\n');
  if (Array.isArray(q.items)) text += '\n' + q.items.map((s, i) => (i + 1) + '. ' + s).join('\n');
  if (Array.isArray(q.list1)) {
    text += '\nList I: ' + q.list1.join(', ');
    text += '\nList II: ' + q.list2.join(', ');
  }
  if (q.assertion) text += '\nAssertion (A): ' + q.assertion + '\nReason (R): ' + q.reason;
  return {
    id: id,
    topic: topic,
    shape: q.shape,
    text: text,
    options: options,
    sol: String(q.explanation),
    source: 'model',
    generatedAt: new Date().toISOString().slice(0, 10)
  };
}

async function main() {
  const clean = has('clean');
  const count = Number(arg('count', '4'));
  const keys = has('all') ? Object.keys(SETS) : [arg('set', 'csat')];
  let cleaned = 0;

  for (const key of keys) {
    const cfg = SETS[key];
    if (!cfg) { console.error('unknown set: ' + key); continue; }
    const set = readSet(key);

    // 1. drop what should never have shipped
    if (clean || has('all')) {
      const before = set.questions.length;
      set.questions = set.questions.filter((q) => {
        const meta = quality.isMetaQuestion(q.text);
        const leak = quality.hasLeakedReasoning(q.sol);
        if (meta || leak) {
          console.log('  drop [' + (meta ? 'meta' : 'fabricated') + '] ' + String(q.text).slice(0, 60).replace(/\n/g, ' '));
          return false;
        }
        return true;
      });
      cleaned += before - set.questions.length;
      if (before !== set.questions.length && !hosted.enabled()) { writeSet(set); }
    }

    if (!hosted.enabled()) {
      if (clean || has('all')) writeSet(set);
      console.log(cfg.label + ': ' + set.questions.length + ' questions after cleaning (no model route, nothing added)');
      continue;
    }

    const seen = new Set(set.questions.map((q) => stemKey(q.text)));
    let nextId = set.questions.reduce((n, q) => Math.max(n, Number(q.id) || 0), 0) + 1;
    let added = 0;

    for (let n = 0; n < count; n++) {
      const shape = shapeById(cfg.shapes[n % cfg.shapes.length]);
      const topic = cfg.topics[n % cfg.topics.length];
      const excerpt = lessonExcerpt(cfg.lesson);
      let q = null;
      let why = '';

      for (let attempt = 1; attempt <= 3 && !q; attempt++) {
        let text = '';
        try {
          text = await hosted.chat(
            'You write UPSC Prelims questions. Answer with one JSON object and nothing else.',
            prompt(shape, topic, excerpt) + (attempt > 1 ? '\n\nThe last answer was rejected: ' + why + ' Return a correct JSON object.' : ''),
            { numPredict: 6000, temperature: 0.6 }
          );
        } catch (e) { console.error('  model call failed: ' + e.message); break; }

        const cand = extractJson(text);
        if (!cand) { why = 'no JSON'; continue; }
        cand.shape = shape.id;
        cand.topic = topic;
        const errs = validateCommon(cand, shape);
        if (errs.length) { why = errs.join('; '); console.error('  ' + shape.id + ' rejected: ' + why); continue; }
        if (quality.isMetaQuestion(cand.question)) { why = 'that is a meta question about exam technique'; continue; }
        if (quality.hasLeakedReasoning(cand.explanation)) { why = 'the explanation contains your own deliberation'; continue; }
        if (seen.has(stemKey(cand.question))) { why = 'duplicate stem'; continue; }

        seen.add(stemKey(cand.question));
        q = cand;
      }

      if (!q) continue;
      const page = toPageQuestion(q, nextId++, topic);
      set.questions.push(page);
      added++;
      console.log('  + [' + page.shape + '] ' + String(page.text).split('\n').slice(-1)[0].slice(0, 70));
    }

    writeSet(set);
    console.log(cfg.label + ': +' + added + ' -> ' + set.questions.length + ' questions');
  }
  if (cleaned) console.log('removed ' + cleaned + ' unshipable question(s) overall');
}

main().catch((e) => { console.error('FAIL ' + e.message); process.exitCode = 1; });