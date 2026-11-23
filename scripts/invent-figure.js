#!/usr/bin/env node
/**
 * invent-figure.js — write a hand-drawn (inked) figure for a topic.
 *
 * The figure library is item-based: boxes, arrows, circles, paths and labels
 * that scripts/lib/upsc-svg-figures.js renders as a pen sketch on paper. The
 * model is allowed to propose those items for a lesson; it is not allowed to
 * emit arbitrary SVG, an item outside the 760x420 sheet, or a label-free
 * diagram. scripts/lib/figure-store.js validates and clamps every item, and
 * this script refuses to store anything that fails.
 *
 * Stored figures are appended to FIGURES at load, so they reach
 * figures/index.html and figures/svg-<id>.html with no further wiring.
 *
 *   node scripts/invent-figure.js --lesson path/to/lesson.html
 *   node scripts/invent-figure.js --topic "Monsoon onset over Kerala" --paper GS1 --tag Geography
 *   node scripts/invent-figure.js --topic "..." --dry-run
 *   node scripts/invent-figure.js --topic "..." --no-model   # deterministic fallback
 *
 * Output: data/figures/invented.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const store = require('./lib/figure-store');

const ROOT = path.resolve(__dirname, '..');
const TAGS = ['Geography', 'Polity', 'Economy', 'History', 'Art & Culture', 'Environment',
  'Ethics', 'Governance', 'International Relations', 'Agriculture', 'Disaster Management',
  'Science & Technology', 'Society', 'Probity'];

// A lesson's paper is implied by its subject, and the tag is implied by the
// words in its title and path. Getting this wrong makes the gallery card lie,
// so it is a keyword table rather than a model answer.
const PAPER_OF = {
  'Geography': 'GS1', 'History': 'GS1', 'Art & Culture': 'GS1', 'Society': 'GS1',
  'Polity': 'GS2', 'Governance': 'GS2', 'International Relations': 'GS2',
  'Economy': 'GS3', 'Environment': 'GS3', 'Agriculture': 'GS3',
  'Disaster Management': 'GS3', 'Science & Technology': 'GS3',
  'Ethics': 'GS4', 'Probity': 'GS4'
};

const TAG_RULES = [
  ['History', /ancient|medieval|mughal|maurya|gupta|harappa|indus valley|vedic|colonial|freedom|revolt|gandhi|nehru|empire|dynast|sultanate|historical|history/i],
  ['Art & Culture', /\bart\b|temple|architecture|dance|music|painting|sculpture|cave|stupa|\bcraft\b|heritage|\bculture\b/i],
  ['Polity', /constitution|polity|article|parliament|supreme court|high court|president|federal|panchayat|election|amendment|writ|judicial|governor|legislature/i],
  ['Governance', /governance|civil service|administrat|bureaucra|scheme|policy implementation|e-governance|rti|transparency/i],
  ['International Relations', /\bun\b|united nations|brics|g20|treaty|foreign policy|diplomat|quad|wto|saarc|asean|indian ocean|geopolit/i],
  ['Economy', /econom|gdp|inflation|budget|tax|gst|bank|monetary|fiscal|trade|investment|subsid|poverty|unemploy|market|finance/i],
  ['Agriculture', /crop|farm|irrigation|livestock|dairy|milk|horticulture|sericulture|fisher|fertilis|fertiliz|agri/i],
  ['Environment', /environment|climate|pollution|biodiversity|forest|wetland|ozone|carbon|ecolog|conservation|wildlife|species/i],
  ['Disaster Management', /disaster|flood|earthquake|cyclone|drought|pandemic|landslide|tsunami|relief|hazard/i],
  ['Science & Technology', /science|technolog|computer|network|internet|semiconductor|satellite|nuclear|space|artificial intelligence|\bai\b|quantum|biotech|nanotech/i],
  ['Society', /society|social|caste|gender|urban|migration|population|family|education|health|women|child|tribal|minorit/i],
  ['Ethics', /ethic|moral|value|attitude|integrity|empathy|conscience|virtue|kohlberg/i],
  ['Probity', /probity|corruption|accountab|vigilance|conduct rules/i],
  ['Geography', /geograph|monsoon|climate|river|soil|ocean|atmosphere|cyclone|latitude|longitude|mountain|plateau|current|rainfall|map/i]
];

function guessTag(text) {
  for (const [tag, re] of TAG_RULES) {
    if (re.test(text)) return tag;
  }
  return null;
}

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

function has(name) {
  return process.argv.indexOf('--' + name) !== -1;
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

function lessonContext(file) {
  const html = fs.readFileSync(file, 'utf8');
  const title = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
  const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => m[1]).slice(0, 10);
  const text = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  return {
    path: file,
    title: text(title),
    sections: h2.map(text).filter(Boolean)
  };
}

function prompt(ctx, id, paper, tag) {
  return [
    'You are drawing a revision diagram for an Indian competitive-exam lesson. It renders as a pen sketch on paper, so it must be label-first and readable at a glance.',
    '',
    'Subject: ' + ctx.title,
    ctx.sections.length ? 'Sections in this lesson:\n' + ctx.sections.map((s) => '  - ' + s).join('\n') : '',
    'Paper: ' + paper + '  Tag: ' + tag,
    '',
    'FIRST decide what kind of drawing the content actually needs. Do not default to boxes and arrows: a page of flowcharts teaches nothing that the prose did not. Pick one archetype:',
    '  chain      a real process or causal sequence, where order matters (box -> box -> box)',
    '  layers     stacked bands, where the point is what sits above what (atmosphere, OSI, social strata, soil horizons)',
    '  timeline   chronology on a line, where the point is when (use line items, ticks as short lines, labels above and below)',
    '  compare    two or three columns, where the point is the difference (schools, systems, before/after)',
    '  map        places and routes, where the point is where (circles for places, arrows for movement, line for a border or river)',
    '  section    a cutaway or labelled outline, where the point is internal structure (temple elevation, stupa, dam, cell, machine)',
    '  chart      numbers, where the point is the shape of the data (line for a series, boxes as bars for totals)',
    '',
    'Choose the archetype that the section list demands. If the lesson is about architecture, drawing a chain of boxes is a failure; draw a section. If it is about a chronology, draw a timeline.',
    '',
    'DEPTH RULE (this is what makes the drawing worth a page): before drawing, list the concrete NAMED parts, terms or stages the lesson uses (e.g. shikhara, amalaka, kalasha, garbhagriha, jangha, vimana, tala, gopuram, adhisthana, dikpala, stupi) and put each one on the drawing as its own label. A diagram of two or three generic words ("Structure", "Process", "Types") is a failure even if the layout is correct.',
    '',
    'Return ONE JSON object, no prose, no code fences:',
    '{"id":"' + id + '","title":"<8+ words>","paper":"' + paper + '","tag":"' + tag + '","intro":"<one sentence on what the drawing teaches>","archetype":"<one of the seven above>","items":[...]}',
    '',
    'The items array draws the diagram. Sheet is 760 wide x 420 high. Allowed item types and fields:',
    '  {"type":"box","x":N,"y":N,"w":N,"h":N,"text":"label","size":13}',
    '  {"type":"pill","x":N,"y":N,"w":N,"h":N,"text":"label"}',
    '  {"type":"circle","cx":N,"cy":N,"r":N,"text":"label"}',
    '  {"type":"arrow","x1":N,"y1":N,"x2":N,"y2":N,"label":"short","lx":N,"ly":N}',
    '  {"type":"line","x1":N,"y1":N,"x2":N,"y2":N}',
    '  {"type":"text","x":N,"y":N,"text":"caption","size":11}',
    '',
    'Hard rules:',
    '- 10 to 20 items. Every shape wholly inside 0..760 x 0..420. No overlap between boxes.',
    '- At least 6 labels must be the lesson\'s OWN named parts/terms, not categories. Short phrases, 2-4 words.',
    '- Every label must come from the lesson, not "Box 1" or "Part A".',
    '- Only use arrows where something actually moves or causes something. A layer diagram has no arrows. A timeline has no boxes unless they mark events.',
    '- A section or map drawing is built from lines and circles, not from a grid of boxes; label the parts with text or short pill labels and leader lines.',
    '- Name one or two real examples the lesson gives (a temple, a river, a scheme, a year) in a caption or pill.',
    '- Add 1-2 text captions carrying the exam hook (an article number, a definition, a mechanism).',
    '- Do not invent statistics. If a number is not in the lesson, leave it out.',
    '',
    'Return JSON only.'
  ].join('\n');
}

function fallback(ctx, id, paper, tag) {
  // A deterministic three-stage chain, so a lesson still gets an honest
  // diagram when no model key is configured. Labels come from the lesson's own
  // section headings where possible.
  const stages = ctx.sections.slice(0, 3);
  const labels = [
    stages[0] || 'Cause',
    stages[1] || 'Mechanism',
    stages[2] || 'Consequence'
  ].map((s) => s.split(/\s+/).slice(0, 4).join(' '));
  const items = [
    { type: 'text', x: 380, y: 34, text: ctx.title.slice(0, 70), size: 16 },
    { type: 'box', x: 60, y: 170, w: 190, h: 70, text: labels[0], size: 13 },
    { type: 'box', x: 285, y: 170, w: 190, h: 70, text: labels[1], size: 13 },
    { type: 'box', x: 510, y: 170, w: 190, h: 70, text: labels[2], size: 13 },
    { type: 'arrow', x1: 250, y1: 205, x2: 285, y2: 205, label: 'leads to' },
    { type: 'arrow', x1: 475, y1: 205, x2: 510, y2: 205, label: 'produces' },
    { type: 'text', x: 380, y: 300, text: 'Read it left to right; write the labels, then the links.', size: 12 },
    { type: 'text', x: 380, y: 330, text: 'Redraw from memory in three boxes and two arrows.', size: 12 }
  ];
  return { id, title: ctx.title + ' — chain', paper, tag, intro: 'A three-stage chain drawn from the lesson headings.', items };
}

async function fromModel(ctx, id, paper, tag) {
  // scripts/lib/hosted.js is opt-in per lane (NVAPI=1, GROQ=1, ...), which
  // keeps every other writer exactly as it was. A dedicated figure lane can
  // safely opt in from the key itself: if a key is configured, use it.
  const ROUTES = {
    NVAPI: 'NVIDIA_API_KEY',
    GROQ: 'GROQ_API_KEY',
    OPENROUTER: 'OPENROUTER_API_KEY',
    GH_MODELS: 'GH_MODELS_TOKEN',
    GEMINI: 'GEMINI_API_KEY'
  };
  for (const flag of Object.keys(ROUTES)) {
    if (process.env[ROUTES[flag]] && process.env[flag] !== '0') process.env[flag] = '1';
  }

  let hosted;
  try { hosted = require('./lib/hosted'); } catch (e) { return null; }
  if (!hosted.enabled()) {
    console.error('[invent] no hosted route configured; using the deterministic chain');
    return null;
  }
  const ask = prompt(ctx, id, paper, tag);
  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = await hosted.chat(
      'You design exam revision diagrams and answer with JSON only.',
      attempt === 1 ? ask : ask + '\n\nYour last answer was rejected. Return valid JSON with every item inside 0..760 x 0..420.',
      { numPredict: 6000, temperature: 0.4 }
    );
    const raw = extractJson(text);
    if (!raw) continue;
    try {
      return store.normalise(Object.assign({}, raw, { id, paper, tag }), id);
    } catch (e) {
      console.error('[invent] attempt ' + attempt + ' rejected: ' + e.message);
    }
  }
  return null;
}

function slugFor(text) {
  return store.kebab(text);
}

async function main() {
  const lesson = arg('lesson');
  const topic = arg('topic');
  if (!lesson && !topic) {
    console.error('usage: node scripts/invent-figure.js --topic "..." [--paper GS1] [--tag Geography] [--lesson path] [--dry-run] [--no-model]');
    process.exitCode = 2;
    return;
  }

  const ctx = lesson
    ? lessonContext(path.resolve(ROOT, lesson))
    : { path: null, title: String(topic), sections: [] };

  // Title and path identify the subject; the section list is noisy (a Polity
// lesson has a "historical background" section, which used to file the whole
// figure under History). Ask the narrow text first, then widen.
  const narrow = ctx.title + ' ' + (ctx.path || '');
  const tag = arg('tag') ||
    guessTag(narrow) ||
    guessTag(narrow + ' ' + ctx.sections.join(' ')) ||
    'Geography';
  const paper = String(arg('paper') || PAPER_OF[tag] || 'GS1').toUpperCase();
  const id = store.kebab(arg('id') || ctx.title);

  if (!store.kebab(id)) {
    console.error('FAIL could not derive an id from the topic');
    process.exitCode = 1;
    return;
  }
  if (store.ids().indexOf(id) !== -1) {
    console.log('[invent] figure already exists: ' + id);
    console.log(id);
    return;
  }
  // A hand-written figure may already cover this exact slug.
  const existing = require('./lib/upsc-svg-figures').FIGURES.some((f) => f.id === id);
  if (existing) {
    console.log('[invent] a library figure already uses this id: ' + id);
    console.log(id);
    return;
  }

  let fig = null;
  if (!has('no-model')) fig = await fromModel(ctx, id, paper, tag);
  if (!fig) {
    console.error('[invent] no usable model answer; writing the deterministic chain instead');
    fig = store.normalise(fallback(ctx, id, paper, tag), id);
  }

  if (has('dry-run')) {
    process.stdout.write(JSON.stringify(fig, null, 2) + '\n');
    return;
  }

  const saved = store.add(fig, { by: 'scripts/invent-figure.js', lesson: ctx.path || null });
  console.log('[invent] ' + saved.id + ' — ' + saved.title);
  console.log('[invent] ' + saved.items.length + ' items · ' + saved.paper + ' · ' + saved.tag);
  console.log(saved.id);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('FAIL ' + e.message);
    process.exitCode = 1;
  });
}

module.exports = { prompt, fallback, extractJson, lessonContext, TAGS };