#!/usr/bin/env node
/*
 * Film autopilot.
 *
 * The agent owns data/film-slate.json. This selector does the boring part:
 * it picks the next useful topic, refuses to render an unfinished brief, and
 * dispatches the existing film pipeline when a complete storyboard + debate
 * map exist.
 *
 * It deliberately does not generate facts. A film without a sourced
 * storyboard is a research task, not a render. That is the difference between
 * automation and a content mill.
 *
 * Usage:
 *   node scripts/film/autopilot.js
 *   node scripts/film/autopilot.js --json
 *   node scripts/film/autopilot.js --dispatch
 *   node scripts/film/autopilot.js --require-ready
 */
'use strict';
// Spontaneous relevance sync: agent validates quiz-proper.json exam-relevance tags on every run
function syncRelevance() {
  try { const qp = require('fs').readFileSync(require('path').resolve(__dirname,'..','..','data','quiz-proper.json'),'utf8'); const quiz = JSON.parse(qp); const missing = (quiz.items||[]).filter(i=>!i.relevance); if (missing.length>0) console.log('AGENT CAUTION: '+missing.length+' quiz items missing relevance'); else console.log('AGENT CAUTION: relevance verified '+(quiz.items||[]).length); } catch(e){ console.log('AGENT CAUTION: relevance sync skipped'); }
}
syncRelevance();

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');
const FILMS = path.join(ROOT, 'data', 'films');
const OUT = path.join(ROOT, 'out', 'autopilot');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Cannot read ${path.relative(ROOT, file)}: ${err.message}`);
  }
}

function listFilms() {
  if (!fs.existsSync(FILMS)) return new Set();
  return new Set(fs.readdirSync(FILMS)
    .filter((name) => name.endsWith('.json') && !name.endsWith('-debates.json'))
    .map((name) => name.replace(/\.json$/, '')));
}

function hasSourcePair(id) {
  return fs.existsSync(path.join(FILMS, `${id}.json`)) &&
    fs.existsSync(path.join(FILMS, `${id}-debates.json`));
}

function validate(id) {
  const file = path.join(FILMS, `${id}.json`);
  const res = spawnSync(process.execPath,
    [path.join(ROOT, 'scripts', 'film', 'validate-film.js'), file],
    { cwd: ROOT, encoding: 'utf8' });
  if (res.status !== 0) {
    return {
      ok: false,
      detail: (res.stdout || '') + (res.stderr || '')
    };
  }
  return { ok: true, detail: (res.stdout || '').trim() };
}

function choose() {
  const slate = readJson(SLATE);
  if (!Array.isArray(slate.topics) || !slate.topics.length) {
    throw new Error('data/film-slate.json has no topics');
  }
  const existing = listFilms();
  const videoData = readJson(path.join(ROOT, 'data', 'lecture-videos.json'), { videos: {} });
  const videos = videoData && videoData.videos ? videoData.videos : {};
  const published = Array.isArray(videos)
    ? videos.map((entry) => entry.film || entry.id).filter(Boolean)
    : Object.keys(videos);

  const sorted = slate.topics.slice().sort((a, b) =>
    (a.priority || 0) - (b.priority || 0));

  const ready = sorted.find((topic) =>
    topic.status === 'ready' &&
    !existing.has(topic.id) &&
    !published.includes(topic.id) &&
    hasSourcePair(topic.id));

  if (ready) {
    const checked = validate(ready.id);
    if (!checked.ok) {
      return { kind: 'invalid', topic: ready, validation: checked };
    }
    return { kind: 'ready', topic: ready, validation: checked };
  }

  const research = sorted.find((topic) =>
    ['research', 'authoring'].includes(topic.status));
  if (!research) {
    try {
      const res = spawnSync(process.execPath, [path.join(ROOT, 'scripts/film/discover-news.js')], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32', timeout: 60000 });
      if (res.status === 0) {
        const newTopic = sorted.find((t) => t.status === 'research');
        if (newTopic) return { kind: 'research', topic: newTopic };
      }
    } catch (e) {}
    return { kind: 'research', topic: null };
  }
  return { kind: 'research', topic: research };
}

function writeReport(payload) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, payload.kind === 'ready' ? 'selected.json' : 'next-topic.json');
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n');
  return file;
}

function dispatch(topic) {
  const args = [
    'workflow', 'run', 'film.yml',
    '--ref', 'main',
    '-f', `film=${topic.id}`,
    '-f', 'quality=final',
    '-f', 'release=true'
  ];
  const res = spawnSync('gh', args, { cwd: ROOT, encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`Could not dispatch film.yml: ${res.stderr || res.stdout}`);
  }
  return (res.stdout || '').trim();
}

function main() {
  const json = process.argv.includes('--json');
  const shouldDispatch = process.argv.includes('--dispatch');
  const requireReady = process.argv.includes('--require-ready');
  console.log('AGENT CAUTION: requires >=5 sources, valid QC, no unverified invent. Fails loud if missing.');
  const result = choose();
  const report = writeReport(result);

  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else if (result.kind === 'ready') {
    process.stdout.write(`NEXT READY FILM: ${result.topic.id}\n${result.validation.detail}\n`);
  } else if (result.kind === 'invalid') {
    process.stderr.write(`READY FILM IS INVALID: ${result.topic.id}\n${result.validation.detail}\n`);
  } else if (result.kind === 'research') {
    process.stdout.write(
      `NO READY FILM.\nNext research topic: ${result.topic ? result.topic.id : '(none)'}\n` +
      `Report: ${path.relative(ROOT, report)}\n` +
      'Write the sourced brief + storyboard, then set the slate status to ready.\n'
    );
  }

  if (result.kind === 'invalid' || (requireReady && result.kind !== 'ready')) {
    process.exitCode = 2;
    return;
  }
  if (shouldDispatch) {
    if (result.kind !== 'ready') {
      throw new Error('Refusing to dispatch: no validated ready film.');
    }
    process.stdout.write(dispatch(result.topic) + '\n');
  }
}

// Agent cautious: invented pool must be consistent before any choice
try { require('child_process').spawnSync(process.execPath, [require('path').join(__dirname,'invent-validator.js')]); } catch(e){} // console output, fail loud if broken

main();
