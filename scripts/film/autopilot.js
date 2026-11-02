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

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');
const FILMS = path.join(ROOT, 'data', 'films');
const OUT = path.join(ROOT, 'out', 'autopilot');
const CAP = Number(process.env.FILM_DAILY_CAP || 2);

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Cannot read ${path.relative(ROOT, file)}: ${err.message}`);
  }
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
  const videoData = readJson(path.join(ROOT, 'data', 'lecture-videos.json'), { videos: {} });
  const videos = videoData && videoData.videos ? videoData.videos : {};
  const published = Array.isArray(videos)
    ? videos.map((entry) => entry.film || entry.id).filter(Boolean)
    : Object.keys(videos);

  const sorted = slate.topics.slice().sort((a, b) =>
    (a.priority || 0) - (b.priority || 0));

  const ready = sorted.find((topic) =>
    ['ready', 'storyboard'].includes(topic.status) &&
    !published.includes(topic.id) &&
    hasSourcePair(topic.id));

  if (ready) {
    const checked = validate(ready.id);
    if (!checked.ok) {
      return { kind: 'invalid', topic: ready, validation: checked };
    }
    return { kind: 'ready', topic: ready, validation: checked };
  }

  /*
   * A blocked topic is not retried. The strike counter in author.yml moved it
   * there after three failed authoring passes; the chain must spend the next
   * slot on a different brief instead of looping on the same corpus.
   */
  const research = sorted.find((topic) =>
    ['research', 'authoring'].includes(topic.status));
  if (research) return { kind: 'research', topic: research };

  /*
   * Nothing researched is waiting. Either start a new brief from the news
   * feeds (the authoring workflow does the sourcing) or stop for the day once
   * the cap is reached. A blocked topic never reaches this branch: it has
   * already spent its three attempts.
   */
  const today = new Date().toISOString().slice(0, 10);
  const producedToday = slate.topics.filter((topic) =>
    topic.status === 'published' && topic.publishedAt === today).length;
  if (producedToday >= CAP) return { kind: 'cap', topic: null };
  return { kind: 'invent', topic: null };
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
    '--ref', 'film-ci',
    '-f', `film=${topic.id}`,
    '-f', 'quality=final',
    '-f', 'release=true',
    '-f', 'publish=true'
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
      `NO READY FILM.\nNext research topic: ${result.topic.id}\n` +
      `Report: ${path.relative(ROOT, report)}\n` +
      'The authoring workflow will write the sourced brief and storyboard.\n'
    );
  } else if (result.kind === 'invent') {
    process.stdout.write(
      'SLATE EMPTY.\nThe authoring workflow will invent and source-lock the next brief.\n'
    );
  } else if (result.kind === 'cap') {
    process.stdout.write(`DAILY CAP REACHED (${CAP}).\nThe queue resumes at 00:00 UTC.\n`);
  } else {
    process.stdout.write('NO ACTION.\n');
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

main();
