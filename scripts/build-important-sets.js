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
    // A passage has to be about something. Topic pools that describe the exam
    // itself ("logical reasoning: statement sufficiency") made the model write
    // passages about how CSAT works, which is not what the paper prints.
    passageTopics: [
      'A policy choice and its measurable consequences',
      'An environmental change and the evidence around it',
      'A technology adoption and who benefited from it',
      'A census or survey finding and what it does and does not show',
      'A public health intervention and its limits',
      'A cultural practice and how it changed over time',
      'An economic indicator and the argument over how to read it'
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

// "1. ... 2. ... 1. ... 2. ..." A model that writes the statements into the
// stem, plus a builder that appends the statements, prints them twice. The
// reader sees a question that repeats itself, so collapse the repeated block.
function collapseRepeats(text) {
  let lines = String(text == null ? '' : text).split('\n');

  // A statement list can be repeated with the question line between the two
  // copies: "1. ... 2. ... Which of the statements is correct? 1. ... 2. ...".
  // Keep the first copy, drop the later one.
  const runs = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\d+\.\s/.test(lines[i])) continue;
    const start = i;
    while (i + 1 < lines.length && /^\s*\d+\.\s/.test(lines[i + 1])) i++;
    runs.push({ start, end: i, body: lines.slice(start, i + 1).join('\n') });
  }
  const drop = new Set();
  for (let a = 0; a < runs.length; a++) {
    if (drop.has(a)) continue;
    for (let b = a + 1; b < runs.length; b++) {
      if (runs[b].body === runs[a].body && runs[a].body.trim().length > 20) drop.add(b);
    }
  }
  if (drop.size) {
    const remove = new Set();
    for (const idx of drop) for (let i = runs[idx].start; i <= runs[idx].end; i++) remove.add(i);
    lines = lines.filter((_, i) => !remove.has(i));
    text = lines.join('\n');
  } else {
    text = lines.join('\n');
  }

  lines = text.split('\n');
  const maxLen = Math.min(6, Math.floor(lines.length / 2));
  for (let len = maxLen; len >= 2; len--) {
    for (let i = 0; i + 2 * len <= lines.length; i++) {
      const first = lines.slice(i, i + len).join('\n');
      const second = lines.slice(i + len, i + 2 * len).join('\n');
      if (first && first === second && first.trim().length > 20) {
        lines.splice(i + len, len);
        return collapseRepeats(lines.join('\n'));
      }
    }
  }
  return lines.join('\n');
}

// The paper prints these four meanings once and reuses them for every item, so
// the keyed letter always means the same thing. A model that shuffles them, or
// writes its own wording, produces an item whose key means something else; the
// builder maps whatever the model wrote back onto this order.
const DS_OPTIONS = [
  'the question can be answered using one of these statements alone, but cannot be answered using the other statement',
  'the question can be answered using either statement alone',
  'the question can be answered using both statements together, but cannot be answered using either statement alone',
  'the question cannot be answered even using both statements together'
];

function dsBucket(text) {
  const t = String(text || '').toLowerCase();
  if (/either statement alone/.test(t)) return 1;
  if (/both (?:the )?statements together|both together/.test(t)) return 2;
  if (/one (?:of these )?statements? alone|one statement alone/.test(t)) return 0;
  if (/not be answered|even (?:using )?(?:any|both)|not sufficient/.test(t)) return 3;
  return -1;
}

// "A. text" is rendered by the page, so a model that prefixes the letter itself
// produced options reading "A. (a) the question can be answered...".
function stripOptionLabel(text) {
  return String(text == null ? '' : text).replace(/^\s*\(?[a-dA-D][).]\s+/, '').trim();
}

function normaliseShape(q) {
  const opts = (q.options || []).map(stripOptionLabel);
  if (q.shape !== 'data-sufficiency') return { options: opts, answer: q.answer };
  const byBucket = new Map();
  opts.forEach((t, i) => {
    const b = dsBucket(t);
    if (b >= 0 && !byBucket.has(b)) byBucket.set(b, i);
  });
  if (byBucket.size !== 4) return { options: opts, answer: q.answer };
  const keyBucket = dsBucket(opts[q.answer]);
  if (keyBucket < 0) return { options: opts, answer: q.answer };
  const ordered = [];
  for (let b = 0; b < 4; b++) ordered.push(DS_OPTIONS[b]);
  return { options: ordered, answer: keyBucket };
}

function toPageQuestion(q, id, topic) {
  const normal = normaliseShape(q);
  const correctAt = normal.answer;
  const options = normal.options.map((t, i) => ({ l: 'ABCD'[i], t: String(t), c: i === correctAt }));
  let text = String(q.question);
  if (q.passage) text = q.passage + '\n\n' + text;
  if (q.statement1) text += '\nI. ' + q.statement1 + '\nII. ' + q.statement2;
  if (Array.isArray(q.statements)) text += '\n' + q.statements.map((s, i) => (i + 1) + '. ' + s).join('\n');
  if (Array.isArray(q.items)) text += '\n' + q.items.map((s, i) => (i + 1) + '. ' + s).join('\n');
  text = collapseRepeats(text);
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
        // Repair what already shipped: a stem that repeats its own statement
        // list is not a filter failure, so collapse it rather than drop it.
        if (q && typeof q.text === 'string') q.text = collapseRepeats(q.text);
        const meta = quality.isMetaQuestion(q.text);
        const leak = quality.hasLeakedReasoning(q.sol);
        // A "comprehension" passage that is really about the exam: the shipped
        // CSAT set gained one beginning "Logical reasoning in the UPSC Civil
        // Services Aptitude Test evaluates a candidate's capacity...". The real
        // paper prints a passage on a subject, so this is not a comprehension
        // item at all.
        const examText = quality.isExamPassage(String(q.text || '').split('\n\n')[0]);
        const lessonText = quality.isLessonMeta(q.text);
        // --retire-legacy: the three sets shipped with a hand-written sampler of
        // 30 items, most of them single-step. "Average of 10, 20, 30, 40, 50"
        // and "Find the next: 2, 6, 18, 54" are not what the paper asks, so the
        // shaped items replace them rather than sit beside them.
        const trivial = has('retire-legacy') && !q.shape ? quality.isTrivial(q.text) : '';
        if (meta || leak || examText || lessonText || trivial) {
          const why = meta ? 'meta' : leak ? 'fabricated' : examText ? 'exam-passage' : lessonText ? 'lesson-meta' : 'trivial';
          console.log('  drop [' + why + '] ' + String(q.text).slice(0, 60).replace(/\n/g, ' '));
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
      // Passages get a substantive subject, because a topic like "statement
      // sufficiency" produced passages about how the exam works.
      const pool = (shape.id === 'passage-inference' && cfg.passageTopics) ? cfg.passageTopics : cfg.topics;
      const topic = pool[n % pool.length];
      // No lesson excerpt: it made the model ask about the page ("The lesson
      // states that...") rather than about the subject. The shape prompt and a
      // subject are enough.
      const excerpt = '';
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
        if (cand.passage) {
          const examPassage = quality.isExamPassage(cand.passage);
          if (examPassage) { why = examPassage; continue; }
        }
        const lessonMeta = quality.isLessonMeta(cand.question);
        if (lessonMeta) { why = lessonMeta; continue; }
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