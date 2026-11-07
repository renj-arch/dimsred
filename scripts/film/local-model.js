#!/usr/bin/env node
/*
 * Local model runner.
 *
 * The writer tier of the film pipeline runs from open weights that are pinned
 * by commit and checked by sha256. There is no hosted endpoint, no API key and
 * no provider that can retire the model: the same bytes produce the same
 * storyboard next year, and the year after that.
 *
 * The job here is deliberately narrow. The model does not research and it does
 * not touch narration: the fact ledger is fixed upstream and every line already
 * carries a source id. The model designs shots for that ledger, which is the
 * part where a good model earns its place.
 *
 * Usage:
 *   node scripts/film/local-model.js --film bhopal-gas-tragedy --scene S02
 *   node scripts/film/local-model.js --film salt-march --scene S04 --tokens 1200
 *   LM_BIN=/opt/llama/bin/llama-cli LM_MODEL=/mnt/lm/model.gguf node ...
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'out', 'local-model');

const TRANSITIONS = [
  'hard-cut', 'match-cut', 'iris', 'paper-wipe',
  'dissolve', 'whip-right', 'flash-frame', 'dip',
];

const RENDERERS = ['blender', 'title', 'archive'];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const value = process.argv[i + 1];
  return value === undefined || value.startsWith('--') ? true : value;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function platesOf(film) {
  const seen = new Set();
  for (const scene of film.scenes || []) {
    for (const shot of scene.shots || []) {
      if (shot.plate) seen.add(shot.plate);
    }
  }
  return [...seen].sort();
}

function sceneIndex(film, id) {
  const i = (film.scenes || []).findIndex((s) => s.id === id);
  if (i === -1) throw new Error(`Unknown scene ${id}`);
  return i;
}

function ledgerLines(scene) {
  return (scene.narration || []).map((n) => `- [${n.source}] ${n.text}`);
}

function buildPrompt(film, scene, previousShot, plates) {
  const rules = (film.style && film.style.rules) || [];
  const edit = film.edit || {};
  const lines = [
    `FILM: ${film.title}`,
    `LOGLINE: ${film.logline || ''}`,
    `LOOK: ${(film.style && film.style.look) || ''}`,
    ...rules.map((r) => `RULE: ${r}`),
    `EDIT GRAMMAR: ${edit.grammar || 'hard cuts only'}`,
    ...(edit.signature || []).map((s) => `SIGNATURE MOVE: ${s}`),
    `FORBIDDEN: ${(edit.forbidden || []).join('; ')}`,
    '',
    'SOURCES:',
    ...(film.sources || []).map((s) => `- ${s.id}: ${s.title} (${s.publisher})`),
    '',
    `SCENE ${scene.id} — ${scene.title}`,
    `PURPOSE: ${scene.purpose || ''}`,
    `LENGTH: ${scene.duration} seconds at ${film.fps || 24} fps`,
    previousShot
      ? `PREVIOUS SHOT: ${previousShot.id} closed with a ${previousShot.transition.type}. Do not repeat it here.`
      : 'This is the opening scene. The first shot may be the title card.',
    '',
    'FACT LEDGER (fixed; one idea per line; every narration line keeps its source id):',
    ...ledgerLines(scene),
    '',
    `ALLOWED PLATES: ${plates.join(', ')}`,
    '',
    'Design the shots for this scene as a single JSON object.',
    'A shot is one idea the camera can hold. Show the object before the explanation.',
    'Hold each shot no longer than the line it carries. Cut on the voice.',
    'Never cut from a title straight into a dissolve. Never use dip inside the film.',
  ];
  return lines.join('\n');
}

function buildSchema(plates) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['scene', 'shots'],
    properties: {
      scene: { type: 'string' },
      shots: {
        type: 'array',
        minItems: 2,
        maxItems: 7,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'plate', 'render', 'hold', 'camera', 'visual', 'sfx', 'transition', 'weight'],
          properties: {
            id: { type: 'string' },
            plate: { type: 'string', enum: [...plates, 'title'] },
            render: { type: 'string', enum: RENDERERS },
            hold: { type: 'number', minimum: 1, maximum: 12 },
            camera: { type: 'string' },
            visual: { type: 'string' },
            sfx: {
              type: 'array',
              minItems: 1,
              maxItems: 4,
              items: { type: 'string' },
            },
            transition: {
              type: 'object',
              additionalProperties: false,
              required: ['type', 'frames', 'reason'],
              properties: {
                type: { type: 'string', enum: TRANSITIONS },
                frames: { type: 'number', minimum: 0, maximum: 24 },
                reason: { type: 'string' },
              },
            },
            weight: { type: 'number', minimum: 1, maximum: 4 },
          },
        },
      },
    },
  };
}

function extractJson(text) {
  const first = text.indexOf('{');
  if (first === -1) throw new Error('No JSON object in model output');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = first; i < text.length; i += 1) {
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

function perf(stderr) {
  const out = {};
  const evalMatch = stderr.match(/eval time\s*=\s*([\d.]+)\s*ms\s*\/\s*(\d+)\s*runs\s*\([^)]*?([\d.]+)\s*tokens per second\)/);
  const promptMatch = stderr.match(/prompt eval time\s*=\s*([\d.]+)\s*ms\s*\/\s*(\d+)\s*tokens\s*\([^)]*?([\d.]+)\s*tokens per second\)/);
  if (evalMatch) {
    out.evalMs = Number(evalMatch[1]);
    out.genTokens = Number(evalMatch[2]);
    out.genTokensPerSecond = Number(evalMatch[3]);
  }
  if (promptMatch) {
    out.promptMs = Number(promptMatch[1]);
    out.promptTokens = Number(promptMatch[2]);
    out.promptTokensPerSecond = Number(promptMatch[3]);
  }
  return out;
}

/*
 * The only mechanical checks worth trusting. A shot list fails if it invents a
 * plate, cites a source that is not in the film, or repeats the previous
 * transition on the first cut of the scene.
 */
function audit(result, film, scene, previousShot, plates) {
  const problems = [];
  const warnings = [];
  if (result.scene !== scene.id) problems.push(`scene id ${result.scene} != ${scene.id}`);
  const shots = result.shots || [];
  if (shots.length < 2) problems.push('fewer than two shots');
  if (shots.length > 7) problems.push('more than seven shots');
  let total = 0;
  shots.forEach((shot, i) => {
    if (!/^S\d{2}-[A-Z]$/.test(shot.id || '')) problems.push(`shot ${i} id ${shot.id} is not Sxx-A`);
    if (!plates.includes(shot.plate) && shot.plate !== 'title') problems.push(`shot ${shot.id} plate ${shot.plate} is not a film plate`);
    if (!RENDERERS.includes(shot.render)) problems.push(`shot ${shot.id} render ${shot.render} is unknown`);
    if (!TRANSITIONS.includes(shot.transition.type)) problems.push(`shot ${shot.id} transition ${shot.transition.type} is unknown`);
    if (shot.transition.type === 'dip') problems.push(`shot ${shot.id} uses dip inside the film`);
    if (!shot.transition.reason || shot.transition.reason.length < 12) {
      warnings.push(`shot ${shot.id} has a thin transition reason`);
    }
    total += Number(shot.hold) || 0;
  });
  if (previousShot && shots[0] && shots[0].transition.type === previousShot.transition.type) {
    problems.push(`scene opens by repeating the previous ${previousShot.transition.type}`);
  }
  const drift = Math.abs(total - Number(scene.duration));
  if (drift > 1.5) warnings.push(`holds total ${total}s against a ${scene.duration}s scene`);
  return { problems, warnings, holdTotal: total };
}

function main() {
  const filmId = arg('film', 'bhopal-gas-tragedy');
  const sceneId = arg('scene', 'S02');
  const tokens = Number(arg('tokens', 900));
  const ctx = Number(arg('ctx', process.env.LM_CTX || 8192));
  const threads = Number(arg('threads', process.env.LM_THREADS || 4));
  const bin = arg('bin', process.env.LM_BIN || 'llama-cli');
  const model = arg('model', process.env.LM_MODEL || '');

  if (!model) throw new Error('Set LM_MODEL to a GGUF path');

  const film = readJson(path.join(ROOT, 'data', 'films', `${filmId}.json`));
  const i = sceneIndex(film, sceneId);
  const scene = film.scenes[i];
  const previous = film.scenes[i - 1];
  const previousShot = previous && previous.shots && previous.shots.length
    ? previous.shots[previous.shots.length - 1]
    : null;
  const plates = platesOf(film);

  fs.mkdirSync(OUT, { recursive: true });
  const prompt = buildPrompt(film, scene, previousShot, plates);
  const schema = buildSchema(plates);
  const promptFile = path.join(OUT, `prompt-${sceneId}.txt`);
  const schemaFile = path.join(OUT, `schema-${sceneId}.json`);
  fs.writeFileSync(promptFile, prompt);
  fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));

  const system = [
    'You are the shot designer for a documentary film.',
    'You may only use the fact ledger. You never add a number, date, name or quote.',
    'Answer with one JSON object that matches the schema. No prose.',
    '/no_think',
  ].join(' ');

  /*
   * The core flags have been stable for years; the quality flags have not.
   * Ask the binary what it understands instead of guessing, so a pinned build
   * that renames one argument still runs instead of failing at minute forty.
   */
  const help = (() => {
    const res = spawnSync(bin, ['--help'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    return `${res.stdout || ''}${res.stderr || ''}`;
  })();
  const has = (flag) => !help || help.includes(flag);
  const pick = (names) => names.find(has) || null;

  const args = [
    '-m', model,
    '-sys', system,
    '-f', promptFile,
    '-n', String(tokens),
    '-c', String(ctx),
    '-t', String(threads),
  ];
  if (has('--temp')) args.push('--temp', '0.35');
  if (has('--top-p')) args.push('--top-p', '0.9');
  if (has('--top-k')) args.push('--top-k', '40');
  if (has('--repeat-penalty')) args.push('--repeat-penalty', '1.05');
  if (has('--seed')) args.push('--seed', '424242');
  if (has('--jinja')) args.push('--jinja');
  if (has('--no-warmup')) args.push('--no-warmup');
  const noConversation = pick(['-no-cnv', '--no-conversation']);
  if (noConversation) args.push(noConversation);
  if (has('--json-schema')) args.push('--json-schema', schemaFile);

  const started = Date.now();
  const run = spawnSync(bin, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env },
  });
  const wallMs = Date.now() - started;

  fs.writeFileSync(path.join(OUT, `stderr-${sceneId}.log`), run.stderr || '');
  fs.writeFileSync(path.join(OUT, `raw-${sceneId}.txt`), run.stdout || '');

  if (run.error) throw run.error;
  if (run.status !== 0) {
    throw new Error(`${bin} exited ${run.status}. See out/local-model/stderr-${sceneId}.log`);
  }

  const text = run.stdout || '';
  const result = extractJson(text);
  const measured = perf(run.stderr || '');
  const auditResult = audit(result, film, scene, previousShot, plates);

  const report = {
    film: filmId,
    scene: sceneId,
    model: {
      path: path.basename(model),
      bytes: fs.existsSync(model) ? fs.statSync(model).size : null,
      sha256: process.env.LM_SHA256 || null,
      source: process.env.LM_SOURCE || null,
      build: process.env.LM_BUILD || null,
    },
    runtime: { threads, context: ctx, tokensRequested: tokens, wallMs },
    measured,
    audit: auditResult,
    ok: auditResult.problems.length === 0,
    generated: result,
  };

  const reportFile = path.join(OUT, `report-${sceneId}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  console.log(`film      ${filmId} / ${sceneId}`);
  console.log(`model     ${report.model.path} (${(report.model.bytes / 1e9).toFixed(2)} GB)`);
  console.log(`threads   ${threads}    context ${ctx}`);
  console.log(`prompt    ${measured.promptTokens || '?'} tokens at ${measured.promptTokensPerSecond || '?'} t/s`);
  console.log(`decode    ${measured.genTokens || '?'} tokens at ${measured.genTokensPerSecond || '?'} t/s`);
  console.log(`wall      ${(wallMs / 1000).toFixed(1)} s`);
  console.log(`shots     ${result.shots.length} total holds ${auditResult.holdTotal}s of ${scene.duration}s`);
  for (const p of auditResult.problems) console.log(`FAIL      ${p}`);
  for (const w of auditResult.warnings) console.log(`warn      ${w}`);
  console.log(`verdict   ${report.ok ? 'ok' : 'rejected'}`);
  console.log(`report    ${path.relative(ROOT, reportFile)}`);

  if (!report.ok) process.exitCode = 1;
}

try {
  main();
} catch (err) {
  console.error(`local-model: ${err.message}`);
  process.exitCode = 1;
}
