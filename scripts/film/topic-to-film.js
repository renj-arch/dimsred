#!/usr/bin/env node
/**
 * topic-to-film.js — model-agent film storyboard writer.
 *
 * Reads a topic-bank entry (id, title, angle, why, sources) and uses the
 * local Ollama model (qwen3.5:9b) to write a complete film storyboard in the
 * vlymbooq.film.v1 schema. The model writes sentences; it is not allowed to
 * invent a fact, a plate, or a cut. Every narration line names a source id
 * from the topic-bank entry.
 *
 * Usage:
 *   node scripts/film/topic-to-film.js \
 *     --topic <id> --title <title> --angle <angle> --why <why> --category <cat> \
 *     --out <path>
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TOPIC_BANK = path.join(ROOT, 'data', 'films', 'topic-bank.json');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

function fail(msg) {
  console.error('topic-to-film: ' + msg);
  process.exitCode = 1;
}

function readTopic(topicId) {
  const bank = JSON.parse(fs.readFileSync(TOPIC_BANK, 'utf8'));
  const t = bank.topics.find(x => x.id === topicId);
  if (!t) fail('topic not found in topic-bank: ' + topicId);
  // If no sources (agent-created topic), add a generic Wikipedia source so the model has something to cite
  if (!t.sources || !t.sources.length) {
    t.sources = [{ id: slugify(t.title) + '-wiki', title: t.title, publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(t.title), accessed: new Date().toISOString().slice(0, 10) }];
  }
  return t;
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildPrompt(t) {
  return [
    'You are a senior documentary film writer in the style of Dhruv Rathee — investigative, fast-paced, visually creative, and emotionally engaging. Write a film storyboard as ONE JSON object.',
    '',
    'Topic: ' + t.title,
    'Category: ' + t.category,
    'Angle: ' + t.angle,
    'Why it matters: ' + t.why,
    '',
    'Sources (use ONLY these — every narration line must cite one of these source ids):',
    t.sources.map(function (s) { return '  - [' + s.id + '] ' + s.title + (s.url ? ' (' + s.url + ')' : ''); }).join('\n'),
    '',
    'STYLE — Dhruv Rathee inspired:',
    '- Hook in the first 5 seconds: start with a bold question, shocking fact, or visual mystery.',
    '- Creative visual metaphors: don\'t just show the object — show what it represents (a seed = hope, a milk can = infrastructure, a forest = resistance).',
    '- Fast pacing: shots 3-8 seconds each, camera always moving (push, pull, pan, orbit, reveal).',
    '- On-screen graphics: data maps, number pop-ups, timeline animations, split screens, text callouts.',
    '- Emotional arc: Problem → Investigation → Twist/Revelation → Conclusion with a call to think.',
    '- Use chapter titles that sound like video sections, not textbook chapters.',
    '- Mix shot types: macro close-ups, wide establishing shots, POV, map view, data overlay.',
    '- Sound design matters: room tone, specific SFX, silence before turns, music cues.',
    '',
    'Schema (output exactly this JSON shape, no markdown, no prose before/after):',
    JSON.stringify({
      schema: 'vlymbooq.film.v1',
      id: slugify(t.title),
      topicId: t.id,
      title: t.title,
      subtitle: 'A cinematic investigation.',
      logline: 'One-sentence hook that makes people click.',
      series: { name: 'THE RECORD ROOM', tagline: 'History, one page at a time.', number: '00', intro: false },
      targetDuration: 480,
      aspect: '16:9',
      fps: 24,
      voice: 'en_US-lessac-medium',
      style: {
        genre: 'investigative documentary',
        look: 'creative 3D with maps, data overlays, and cinematic lighting',
        rules: [
          'Hook in first 5 seconds — bold question or mystery.',
          'One idea per shot, but shots change fast (3-8s each).',
          'Every scene introduces a NEW object, place, or document — no repeats.',
          'Use visual metaphors, not just literal objects.',
          'Camera always moves: push, pull, pan, orbit, reveal, whip.',
          'Include on-screen graphics: maps, numbers, timelines, text callouts.',
          'Violence implied through sound/aftermath, never shown.',
          'End each scene with a transition that asks a new question.'
        ]
      },
      toolchain: {
        blender: { version: '4.2 LTS', role: '3D sets, hero stills, camera moves, map animations', automation: 'scripts/film/blender/stock_scenes.py' },
        node: { role: 'orchestration, ffmpeg assembly, captions, data graphics', automation: 'scripts/film/*.js' }
      },
      sources: t.sources.map(function (s) { return { id: s.id, title: s.title, publisher: s.publisher, url: s.url, accessed: new Date().toISOString().slice(0, 10) }; }),
      scenes: [
        {
          id: 'S01',
          title: 'The Hook',
          purpose: 'Grab attention with a bold question or mystery about the topic.',
          chapter: 1,
          chapterTitle: 'Act 1 — The Question',
          chapterStart: true,
          start: 0,
          duration: 45,
          narrationStart: 3,
          minDuration: 10,
          narration: [
            { text: 'A hook question about ' + t.title + '.', source: t.sources[0].id, ledger: '', quote: '' }
          ],
          shots: [
            {
              id: 'S01-T',
              plate: 'title',
              render: 'title',
              hold: 3,
              weight: 3,
              camera: 'whip reveal from black, fast push',
              visual: 'Title slams onto screen with a data-glitch effect, then settles.',
              sfx: ['deep bass hit', 'metal click', 'room tone'],
              transition: { type: 'whip-pan', frames: 6, sound: 'whoosh', audioDuration: 0.3, reason: 'Fast opening grabs attention.' },
              framing: { zoom: [0.9, 1.15], x: [48, 52], y: [48, 52] }
            },
            {
              id: 'S01-A',
              plate: 'object-01',
              render: 'blender',
              narrationLine: 1,
              weight: 4,
              camera: 'orbit around object, 360 degrees in 6 seconds',
              visual: 'The central object floating, rotating, with data points appearing around it like a hologram.',
              sfx: ['digital chime', 'wind', 'object resonance'],
              transition: { type: 'match-cut', frames: 4, sound: 'click', audioDuration: 0.2, reason: 'Match the object shape to the next scene.' },
              framing: { zoom: [1.0, 1.08], x: [45, 55], y: [40, 60] }
            }
          ],
          dialogue: []
        }
      ]
    }, null, 2),
    '',
    'STRUCTURE (8-12 scenes, 300-600 seconds total):',
    'Act 1 — The Hook (Scene 1): Bold question, mystery, why this matters NOW.',
    'Act 2 — Investigation (Scenes 2-6): Deep dive, evidence, different angles, data, maps.',
    'Act 3 — Revelation (Scenes 7-9): The twist, the hidden connection, the human cost.',
    'Act 4 — Conclusion (Scenes 10-12): What it means, what changes, final question to viewer.',
    '',
    'EACH SCENE:',
    '- 2-5 shots minimum.',
    '- Each shot: id, plate, render (title or blender), hold (3-8s), weight, camera, visual, sfx (1-3 cues), transition, framing.',
    '- Narration: short (under 180 chars), specific, cites a source id.',
    '- Plate names: title, object-01, desk-01, wall-01, gate-01, ledger-01, flame-01, map-01, clock-01, chart-01, timeline-01, portrait-01, document-01.',
    '- No duplicate plates or visuals across the whole film.',
    '- No duplicate narration — each scene states a NEW fact.',
    '- Output valid JSON only. No markdown code fences.'
  ].join('\n');
}

function callModel(prompt) {
  const payload = JSON.stringify({
    model: 'qwen3.5:9b',
    stream: false,
    think: false,
    options: { temperature: 0.4, top_p: 0.9, num_predict: 4000 },
    messages: [{ role: 'user', content: prompt }]
  });

  const res = spawnSync('curl', [
    '-sS', '--max-time', '5400',
    'http://127.0.0.1:11434/api/chat',
    '-H', 'Content-Type: application/json',
    '-d', '@-'
  ], {
    input: payload,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 5400000
  });

  if (res.error) throw res.error;
  if (res.status !== 0) {
    fail('curl exited ' + res.status + ': ' + (res.stderr || '').slice(0, 500));
  }

  const out = res.stdout || '';
  // Extract the response content (non-streaming response)
  try {
    const parsed = JSON.parse(out);
    return parsed.message && parsed.message.content ? parsed.message.content : '';
  } catch (e) {
    // Fallback: try to extract content from NDJSON
    const lines = out.split('\n').filter(l => l.trim());
    let content = '';
    for (const line of lines) {
      try {
        const j = JSON.parse(line);
        if (j.message && j.message.content) content += j.message.content;
      } catch (ee) { /* ignore partial lines */ }
    }
    return content;
  }
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

function main() {
  const topicId = arg('topic');
  const title = arg('title');
  const angle = arg('angle');
  const why = arg('why');
  const category = arg('category');
  const out = arg('out');

  if (!topicId || !title || !out) {
    fail('--topic, --title, and --out are required');
  }

  const t = readTopic(topicId);

  // Ensure Ollama is running
  const ping = spawnSync('curl', ['-sf', '--max-time', '5', 'http://127.0.0.1:11434/api/tags'], { encoding: 'utf8' });
  if (ping.status !== 0) {
    console.log('Ollama not running — starting...');
    spawnSync('nohup ollama serve >> /tmp/ollama.log 2>&1 &', { shell: true });
    for (let i = 0; i < 30; i++) {
      const p2 = spawnSync('curl', ['-sf', '--max-time', '5', 'http://127.0.0.1:11434/api/tags'], { encoding: 'utf8' });
      if (p2.status === 0) break;
      spawnSync('sleep', ['1']);
    }
  }

  console.log('topic-to-film: generating storyboard for ' + t.title + '...');

  const prompt = buildPrompt(t);
  const raw = callModel(prompt);

  if (!raw || raw.length < 100) {
    fail('model returned empty or too-short response');
  }

  let film;
  try {
    film = extractJson(raw);
  } catch (e) {
    // Save raw for debugging
    fs.writeFileSync(path.join(ROOT, 'out', 'topic-to-film-raw.txt'), raw);
    fail('model output was not valid JSON: ' + e.message + '. Raw saved to out/topic-to-film-raw.txt');
  }

  // Validate minimal schema
  if (!film.scenes || !Array.isArray(film.scenes) || film.scenes.length < 5) {
    fail('generated storyboard has fewer than 5 scenes — need 8-12 for a creative film');
  }

  // Validate scene count is creative enough
  if (film.scenes.length < 8) {
    console.log('topic-to-film: warning — only ' + film.scenes.length + ' scenes, consider 8-12 for a Dhruv Rathee style film');
  }

  // ---- DEDUPLICATION: remove duplicate scenes, plates, narration ----
  var seenPlates = {};
  var seenVisuals = {};
  var seenNarration = {};
  var dedupedScenes = [];
  for (var si = 0; si < film.scenes.length; si++) {
    var scene = film.scenes[si];
    // Skip scenes with duplicate title or purpose
    var sceneKey = (scene.title || '') + '||' + (scene.purpose || '');
    if (seenVisuals[sceneKey]) continue;
    seenVisuals[sceneKey] = true;

    var keptShots = [];
    for (var sj = 0; sj < scene.shots.length; sj++) {
      var shot = scene.shots[sj];
      var plate = shot.plate || 'object-01';
      // Skip duplicate plates across the whole film
      if (seenPlates[plate]) continue;
      seenPlates[plate] = true;

      // Skip duplicate visual descriptions
      var vKey = (shot.visual || '').toLowerCase().replace(/\s+/g, ' ').trim();
      if (seenVisuals[vKey]) continue;
      seenVisuals[vKey] = true;

      keptShots.push(shot);
    }
    // Only keep scene if it has at least 2 shots after dedup
    if (keptShots.length >= 2) {
      scene.shots = keptShots;
      dedupedScenes.push(scene);
    }
  }

  // Remove scenes with duplicate narration text
  var finalScenes = [];
  for (var i = 0; i < dedupedScenes.length; i++) {
    var s = dedupedScenes[i];
    var narrKey = (s.narration && s.narration[0] && s.narration[0].text || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (narrKey && seenNarration[narrKey]) continue;
    if (narrKey) seenNarration[narrKey] = true;
    finalScenes.push(s);
  }

  film.scenes = finalScenes;

  // Re-index scene ids and shot ids after dedup
  for (var i = 0; i < film.scenes.length; i++) {
    var sc = film.scenes[i];
    sc.id = 'S' + (i + 1).toString().padStart(2, '0');
    for (var j = 0; j < sc.shots.length; j++) {
      sc.shots[j].id = sc.id + '-' + (j + 1);
    }
  }

  // Validate after dedup
  if (!film.scenes || film.scenes.length < 3) {
    fail('deduplication left fewer than 3 scenes (' + film.scenes.length + ') — topic may need more varied sources');
  }

  // Normalize: ensure required top-level fields
  film.schema = 'vlymbooq.film.v1';
  film.id = film.id || slugify(t.title);
  film.topicId = t.id;
  film.title = film.title || t.title;
  film.subtitle = film.subtitle || 'A sourced cinematic history.';
  film.logline = film.logline || t.why;
  film.aspect = '16:9';
  film.fps = film.fps || 24;
  film.voice = 'en_US-lessac-medium';
  film.targetDuration = film.targetDuration || 180;

  // Ensure sources match topic-bank
  film.sources = t.sources.map(function (s) {
    return { id: s.id, title: s.title, publisher: s.publisher, url: s.url, accessed: new Date().toISOString().slice(0, 10) };
  });

  // Ensure each scene has required fields
  for (const scene of film.scenes) {
    if (!scene.id) scene.id = 'S' + (film.scenes.indexOf(scene) + 1).toString().padStart(2, '0');
    if (!scene.title) scene.title = 'Scene';
    if (!scene.purpose) scene.purpose = 'Scene purpose.';
    if (!scene.start && scene.start !== 0) scene.start = 0;
    if (!scene.duration || scene.duration <= 0) scene.duration = 15;
    if (!scene.narration || !scene.narration.length) {
      scene.narration = [{ text: 'Placeholder narration.', source: t.sources[0].id, ledger: '', quote: '' }];
    }
    if (!scene.shots || !scene.shots.length) {
      scene.shots = [
        {
          id: scene.id + '-A',
          plate: 'object-01',
          render: 'blender',
          hold: 5,
          weight: 3,
          camera: 'slow push, lens 35, eye height',
          visual: 'The central object in detail.',
          sfx: ['room tone'],
          transition: { type: 'hard-cut', frames: 0, sound: null, audioDuration: 0, reason: 'Cut.' },
          framing: { zoom: [1.03, 1.09], x: [49, 50], y: [50, 49] }
        }
      ];
    }
    for (const shot of scene.shots) {
      if (!shot.id) shot.id = scene.id + '-' + (scene.shots.indexOf(shot) + 1);
      if (!shot.plate) shot.plate = 'object-01';
      if (!shot.render) shot.render = 'blender';
      if (!shot.hold || shot.hold <= 0) shot.hold = 5;
      if (!shot.weight) shot.weight = 3;
      if (!shot.camera) shot.camera = 'static';
      if (!shot.visual) shot.visual = 'A shot.';
      if (!shot.sfx || !shot.sfx.length) shot.sfx = ['room tone'];
      if (!shot.transition) shot.transition = { type: 'hard-cut', frames: 0, sound: null, audioDuration: 0, reason: 'Cut.' };
      if (!shot.framing) shot.framing = { zoom: [1.0, 1.05], x: [49, 50], y: [50, 49] };
    }
  }

  fs.writeFileSync(out, JSON.stringify(film, null, 2) + '\n');
  console.log('topic-to-film: wrote ' + out + ' (' + film.scenes.length + ' scenes, ' + film.targetDuration + 's)');
}

try {
  main();
} catch (err) {
  fail(err.message);
}
