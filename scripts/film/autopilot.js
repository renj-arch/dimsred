#!/usr/bin/env node
/**
 * autopilot.js — fully autonomous film topic selection.
 *
 * Uses the local model (qwen3.5:9b via Ollama) to decide what to film next.
 * No pre-kept topic-bank, no manual topic input — the model picks from its
 * own knowledge of UPSC syllabus gaps, exam-relevant stories, and visual
 * documentary potential.
 *
 * Output JSON consumed by film-autopilot.yml:
 *   { "kind": "ready",   "topic": { "id": "...", "title": "...", "angle": "...", "why": "...", "category": "...", "sources": [...] } }
 *   { "kind": "cap" }                                                  → daily cap reached
 *
 * Usage:
 *   node scripts/film/autopilot.js --json > out/autopilot/pick.json
 *   node scripts/film/autopilot.js --text
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

function flag(name) {
  return process.argv.includes('--' + name);
}

function fail(msg) {
  console.error('autopilot: ' + msg);
  process.exitCode = 1;
}

function readSlate() {
  if (!fs.existsSync(SLATE)) return { topics: [] };
  try { return JSON.parse(fs.readFileSync(SLATE, 'utf8')); } catch (e) { return { topics: [] }; }
}

function writeSlate(slate) {
  slate.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(SLATE, JSON.stringify(slate, null, 2) + '\n');
}

function callModel(prompt) {
  const payload = JSON.stringify({
    model: 'qwen3.5:9b',
    stream: false,
    think: false,
    options: { temperature: 0.7, top_p: 0.9, num_predict: 2000 },
    messages: [{ role: 'user', content: prompt }]
  });

  const res = spawnSync('curl', [
    '-sS', '--max-time', '300',
    'http://127.0.0.1:11434/api/chat',
    '-H', 'Content-Type: application/json',
    '-d', '@-'
  ], { input: payload, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 310000 });

  if (res.error) return null;
  if (res.status !== 0) return null;
  return res.stdout || '';
}

function extractJson(text) {
  const first = text.indexOf('{');
  if (first === -1) return null;
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
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(text.slice(first, i + 1)); } catch (e) { return null; }
      }
    }
  }
  return null;
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureOllama() {
  const ping = spawnSync('curl', ['-sf', '--max-time', '5', 'http://127.0.0.1:11434/api/tags'], { encoding: 'utf8' });
  if (ping.status === 0) return true;
  console.log('autopilot: starting Ollama...');
  spawnSync('nohup ollama serve >> /tmp/ollama.log 2>&1 &', { shell: true });
  for (let i = 0; i < 30; i++) {
    const p2 = spawnSync('curl', ['-sf', '--max-time', '5', 'http://127.0.0.1:11434/api/tags'], { encoding: 'utf8' });
    if (p2.status === 0) return true;
    spawnSync('sleep', ['1']);
  }
  return false;
}

function pickFromSlate(slate) {
  const topics = Array.isArray(slate.topics) ? slate.topics : [];
  const ready = topics.find((t) => t.status === 'ready');
  if (ready) return { kind: 'ready', topic: ready };
  const authored = topics.find((t) => t.status === 'authored');
  if (authored) return { kind: 'ready', topic: authored };
  const needsResearch = topics.find((t) => t.status === 'research' || t.status === 'new' || !t.status);
  if (needsResearch) return { kind: 'research', topic: needsResearch };
  return null;
}

function generateTopicFromModel() {
  const prompt = [
    'You are a documentary film producer for UPSC competitive exam preparation.',
    '',
    'Pick ONE film topic that is:',
    '  - Relevant to UPSC GS syllabus (Polity, Economy, Geography, History, Environment, Science & Tech, Society, International Relations)',
    '  - Visually filmable (has objects, places, documents, maps, processes to show)',
    '  - Has enough publicly available sources (Wikipedia, PIB, government reports)',
    '  - Would make a compelling 3-8 minute documentary',
    '',
    'Output ONE JSON object only, no markdown, no prose:',
    JSON.stringify({
      id: 'slug-like-identifier',
      title: 'Compelling title',
      category: 'polity|economy|geography|history|environment|science|society|international-relations',
      angle: 'Specific angle or approach',
      why: 'Why this matters for UPSC aspirants',
      sources: [
        { id: 'source-1', title: 'Source title', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/...' },
        { id: 'source-2', title: 'Source title 2', publisher: 'PIB', url: 'https://pib.gov.in/...' }
      ]
    }, null, 2),
    '',
    'Do not repeat topics already filmed: Salt March, Jallianwala Bagh, Emergency 1975, Bhopal Gas Tragedy, Vatican Archives.'
  ].join('\n');

  const raw = callModel(prompt);
  if (!raw) return null;

  const picked = extractJson(raw);
  if (!picked || !picked.id || !picked.title) return null;

  // Ensure sources is an array
  if (!Array.isArray(picked.sources) || picked.sources.length === 0) {
    picked.sources = [
      { id: 'wiki-' + slugify(picked.title), title: picked.title, publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(picked.title) }
    ];
  }

  return { kind: 'ready', topic: picked };
}

function main() {
  const json = flag('json');

  // 1. Try the slate first (if it exists and has pending topics)
  const slate = readSlate();
  const slatePick = pickFromSlate(slate);
  if (slatePick) {
    const topic = slatePick.topic;
    // Mark as claimed so it's not picked twice
    if (slate.topics) {
      const t = slate.topics.find((x) => x.id === topic.id);
      if (t) t.status = 'rendering';
      writeSlate(slate);
    }
    if (json) console.log(JSON.stringify(slatePick));
    else console.log('kind=' + slatePick.kind + ' film=' + topic.id + ' title=' + topic.title);
    return;
  }

  // 2. Slate empty — use the model's brain to pick a topic autonomously
  console.log('autopilot: slate empty — asking model to pick a film topic...');
  if (!ensureOllama()) {
    fail('Ollama not available — cannot autonomously pick a topic');
    return;
  }

  const pick = generateTopicFromModel();
  if (!pick) {
    fail('model did not return a valid topic');
    return;
  }

  const topic = pick.topic;

  // Persist to slate so future runs know it's in flight
  if (!slate.topics) slate.topics = [];
  slate.topics.push({ id: topic.id, status: 'rendering', renderStartedAt: new Date().toISOString(), source: 'autopilot-model' });
  writeSlate(slate);

  // Model-generated topics need storyboarding first → dispatch author.yml
  // which writes the storyboard then dispatches film.yml to render.
  const autonomousPick = { kind: 'research', topic: pick.topic };

  if (json) console.log(JSON.stringify(autonomousPick));
  else console.log('kind=' + autonomousPick.kind + ' film=' + topic.id + ' title=' + topic.title);
}

try {
  main();
} catch (err) {
  fail(err.message);
}
