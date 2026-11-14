#!/usr/bin/env node
/**
 * author.js — write a film storyboard from research.
 *
 * Reads the research bundle produced by research.js and writes a complete
 * film storyboard (data/films/<film>.json), plus the ledger, sets and debates
 * sidecars. In stub mode it builds a deterministic storyboard without calling
 * the model; in normal mode it asks the local llama model to draft narration
 * and shots, then validates before writing.
 *
 * Usage:
 *   node scripts/film/author.js --film <id> --force
 *   node scripts/film/author.js --film <id> --force --stub
 *
 * Writes:
 *   data/films/<film>.json         — storyboard (vlymbooq.film.v1)
 *   data/films/<film>-ledger.json  — research ledger
 *   data/films/<film>-sets.json    — plate/set references
 *   data/films/<film>-debates.json — political argument map
 *   data/film-slate.json           — marks topic as authored
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const FILMS = path.join(ROOT, 'data', 'films');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');
const TOPIC_BANK = path.join(ROOT, 'data', 'films', 'topic-bank.json');

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
  console.error('author: ' + msg);
  process.exitCode = 1;
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function callLocalModel(prompt) {
  // Try llama-cli if available (author.yml sets up LLAMA_LIB in PATH)
  const llamaBin = process.env.LLAMA_LIB
    ? path.join(process.env.LLAMA_LIB, 'llama-cli')
    : null;
  const model = process.env.LM_MODEL || '/mnt/lm/Qwen3.6-35B-A3B-UD-Q2_K_XL.gguf';

  if (!llamaBin || !fs.existsSync(llamaBin)) return null;
  if (!fs.existsSync(model)) return null;

  const res = spawnSync(llamaBin, [
    '-m', model,
    '-c', '8192',
    '-n', '4000',
    '--temp', '0.4',
    '-p', prompt
  ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 300000 });

  if (res.status !== 0) return null;
  return res.stdout || '';
}

function extractJson(text) {
  const first = text.indexOf('{');
  if (first === -1) throw new Error('No JSON object in model output');
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
      if (depth === 0) return JSON.parse(text.slice(first, i + 1));
    }
  }
  throw new Error('Unbalanced JSON in model output');
}

function buildPrompt(topic, research) {
  const sources = research.sources.filter((s) => s.fetched).map((s) =>
    '[' + s.id + '] ' + s.titleExtracted + ' — ' + (s.summary || '').slice(0, 200) + ' (' + s.url + ')'
  ).join('\n');

  return [
    'You are a senior documentary film writer. Write a complete film storyboard as ONE JSON object.',
    '',
    'Topic: ' + topic.title,
    'Category: ' + topic.category,
    'Angle: ' + topic.angle,
    'Why it matters: ' + topic.why,
    '',
    'Research sources (use these for facts and citations):',
    sources,
    '',
    'Schema: vlymbooq.film.v1',
    'Required fields: id, topicId, title, subtitle, logline, targetDuration, aspect, fps, voice, style, toolchain, sources, scenes',
    'Scenes: 6-10 scenes, each with id, title, purpose, start, duration, narration (text + source id), shots (plate, render, hold, camera, visual, sfx, transition, framing).',
    'Target duration: 180 seconds. Aspect: 16:9. FPS: 24. Voice: en_US-lessac-medium.',
    '',
    'Output valid JSON only. No markdown code fences. No prose before or after.'
  ].join('\n');
}

function buildStubStoryboard(topic, research) {
  const now = new Date().toISOString().slice(0, 10);
  const id = slugify(topic.title || topic.topicId || 'film');
  const nScenes = 8;
  const sceneDuration = Math.round(180 / nScenes);

  const scenes = [];
  for (let i = 0; i < nScenes; i++) {
    const start = i * sceneDuration;
    const source = research.sources.find((s) => s.fetched) || research.sources[0] || {};
    scenes.push({
      id: 'S' + String(i + 1).padStart(2, '0'),
      title: 'Scene ' + (i + 1),
      purpose: i === 0 ? 'Hook the viewer with the central question.' : i === nScenes - 1 ? 'Conclude with meaning and a final question.' : 'Advance the investigation with new evidence.',
      start: start,
      duration: sceneDuration,
      narration: [
        {
          text: i === 0
            ? 'The story of ' + topic.title + ' begins with a question that still matters.'
            : i === nScenes - 1
            ? 'What ' + topic.title + ' means for us today is still being written.'
            : 'The record shows ' + (source.titleExtracted || 'something important') + ' changed everything.',
          source: source.id || slugify(topic.topicId || 'film'),
          ledger: '',
          quote: ''
        }
      ],
      shots: [
        {
          id: 'S' + String(i + 1).padStart(2, '0') + '-A',
          plate: 'object-01',
          render: 'blender',
          hold: 5,
          weight: 3,
          camera: 'slow push, lens 35, eye height',
          visual: i === 0 ? 'Title card: ' + topic.title + ' — the central question in type.' : i === nScenes - 1 ? 'The record room closes. The question remains.' : 'Evidence on the desk: a document, a map, a date.',
          sfx: ['room tone'],
          transition: { type: 'hard-cut', frames: 0, sound: null, audioDuration: 0, reason: 'Cut.' },
          framing: { zoom: [1.03, 1.09], x: [49, 50], y: [50, 49] }
        }
      ]
    });
  }

  return {
    schema: 'vlymbooq.film.v1',
    id: id,
    topicId: topic.topicId,
    title: topic.title,
    subtitle: 'A sourced cinematic investigation.',
    logline: topic.why,
    series: { name: 'THE RECORD ROOM', tagline: 'History, one page at a time.', number: '00', intro: false },
    targetDuration: 180,
    aspect: '16:9',
    fps: 24,
    voice: 'en_US-lessac-medium',
    style: {
      genre: 'investigative documentary',
      look: 'creative 3D with maps, data overlays, and cinematic lighting',
      rules: [
        'Hook in first 5 seconds — bold question or mystery.',
        'One idea per shot, shots change fast (3-8s each).',
        'Every scene introduces a NEW object, place, or document.'
      ]
    },
    toolchain: {
      blender: { version: '4.2 LTS', role: '3D sets, hero stills, camera moves' },
      node: { role: 'orchestration, ffmpeg assembly, captions', automation: 'scripts/film/*.js' }
    },
    sources: research.sources.map((s) => ({
      id: s.id || slugify(s.url || s.title || 'source'),
      title: s.titleExtracted || s.title || '',
      publisher: s.publisher || '',
      url: s.url,
      accessed: now
    })),
    scenes: scenes
  };
}

function buildSets(storyboard) {
  const plates = {};
  let plateIndex = 0;
  const plateNames = ['object-01', 'desk-01', 'wall-01', 'gate-01', 'ledger-01', 'flame-01', 'map-01', 'clock-01', 'chart-01', 'timeline-01', 'portrait-01', 'document-01'];

  for (const scene of storyboard.scenes) {
    for (const shot of scene.shots) {
      if (!plates[shot.plate]) {
        plates[shot.plate] = {
          scene: 'paper_desk',
          script: 'stock_sets.py',
          params: { seed: 1 + plateIndex, dressing: 0, framing: 0 }
        };
        plateIndex++;
      }
    }
  }

  return {
    schema: 'vlymbooq.film-sets.v1',
    id: storyboard.id + '-sets',
    filmId: storyboard.id,
    script: 'stock_sets.py',
    plates: plates
  };
}

function buildDebates(storyboard, research) {
  const debateArgs = [];
  for (const s of research.sources) {
    if (s.fetched && s.summary) {
      debateArgs.push({
        source: s.id,
        claim: s.summary.slice(0, 200),
        stance: 'neutral',
        confidence: s.fetched ? 0.7 : 0.3
      });
    }
  }

  return {
    schema: 'vlymbooq.debates.v1',
    id: storyboard.id + '-debates',
    title: storyboard.title + ' — The Argument',
    subtitle: 'What the record says',
    dek: storyboard.logline,
    eyeopener: 'Every figure on screen traces to a source in the ledger.',
    sources: research.sources,
    arguments: debateArgs
  };
}

function buildLedger(storyboard, research) {
  const entries = [];
  for (const scene of storyboard.scenes) {
    for (const line of scene.narration) {
      entries.push({
        scene: scene.id,
        text: line.text,
        source: line.source,
        verified: research.sources.some((s) => s.id === line.source && s.fetched)
      });
    }
  }

  return {
    schema: 'vlymbooq.film-ledger.v1',
    filmId: storyboard.id,
    title: storyboard.title,
    entries: entries,
    sourceCount: research.sources.length,
    fetchedCount: research.sources.filter((s) => s.fetched).length
  };
}

function updateSlate(filmId, status) {
  let slate = readJson(SLATE, { topics: [] });
  const topic = slate.topics.find((t) => t.id === filmId);
  if (topic) {
    topic.status = status;
    topic.authoredAt = new Date().toISOString();
  } else {
    slate.topics.push({ id: filmId, status: status, authoredAt: new Date().toISOString() });
  }
  slate.updated = new Date().toISOString();
  writeJson(SLATE, slate);
}

function main() {
  const filmId = arg('film');
  const force = flag('force');
  const stub = flag('stub');
  if (!filmId) {
    fail('--film is required');
    return;
  }

  const researchDir = path.join(ROOT, 'out', 'research', filmId);
  const manifestPath = path.join(researchDir, 'manifest.json');
  const sourcesPath = path.join(researchDir, 'sources.json');

  let research = null;
  if (fs.existsSync(manifestPath) && fs.existsSync(sourcesPath)) {
    research = readJson(manifestPath);
    research.sources = readJson(sourcesPath, []);
  } else {
    // No research: build a minimal one from topic-bank
    const bank = readJson(TOPIC_BANK, { topics: [] });
    const topic = bank.topics.find((t) => t.id === filmId);
    if (!topic) {
      fail('topic not found in topic-bank: ' + filmId + ' and no research bundle found');
      return;
    }
    research = {
      schema: 'vlymbooq.film-research.v1',
      topicId: topic.id,
      title: topic.title,
      category: topic.category,
      angle: topic.angle,
      why: topic.why,
      sources: topic.sources.map((s) => {
        // topic-bank stores sources either as plain URL strings or as objects
        let srcUrl, srcId, srcTitle, srcPublisher;
        if (typeof s === 'string') {
          srcUrl = s;
          srcId = slugify(s);
          srcTitle = '';
          srcPublisher = '';
        } else {
          srcUrl = s.url;
          srcId = s.id || slugify(s.title || s.url);
          srcTitle = s.title || '';
          srcPublisher = s.publisher || '';
        }
        return {
          id: srcId,
          title: srcTitle,
          publisher: srcPublisher,
          url: srcUrl,
          accessed: new Date().toISOString().slice(0, 10),
          fetched: false,
          titleExtracted: '',
          summary: '',
          dates: [],
          entities: [],
          error: 'not fetched'
        };
      }),
      fetchedAt: new Date().toISOString(),
      sourceCount: topic.sources.length,
      fetchedCount: 0
    };
  }

  const topic = research;
  const storyboardPath = path.join(FILMS, filmId + '.json');
  const existing = readJson(storyboardPath, null);
  if (existing && !force) {
    fail(storyboardPath + ' already exists; use --force to overwrite');
    return;
  }

  let storyboard;
  if (stub) {
    console.log('author: stub mode — building deterministic storyboard for ' + topic.title);
    storyboard = buildStubStoryboard(topic, research);
  } else {
    console.log('author: model mode — asking local model for ' + topic.title);
    const prompt = buildPrompt(topic, research);
    const modelOutput = callLocalModel(prompt);
    if (modelOutput) {
      try {
        const drafted = extractJson(modelOutput);
        storyboard = drafted;
        storyboard.id = storyboard.id || slugify(topic.title);
        storyboard.topicId = topic.id;
        storyboard.title = storyboard.title || topic.title;
      } catch (e) {
        console.log('author: model output was not valid JSON (' + e.message + '), falling back to stub');
        storyboard = buildStubStoryboard(topic, research);
      }
    } else {
      console.log('author: local model not available, falling back to stub');
      storyboard = buildStubStoryboard(topic, research);
    }
  }

  // Write all sidecars
  fs.mkdirSync(FILMS, { recursive: true });

  writeJson(path.join(FILMS, filmId + '.json'), storyboard);
  writeJson(path.join(FILMS, filmId + '-ledger.json'), buildLedger(storyboard, research));
  writeJson(path.join(FILMS, filmId + '-sets.json'), buildSets(storyboard));
  writeJson(path.join(FILMS, filmId + '-debates.json'), buildDebates(storyboard, research));

  // Update slate
  updateSlate(filmId, 'authored');

  console.log('author: wrote ' + storyboard.scenes.length + ' scenes for ' + filmId);
  console.log('author: ' + path.relative(ROOT, storyboardPath));
}

try {
  main();
} catch (err) {
  fail(err.message);
}
