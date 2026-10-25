#!/usr/bin/env node
/**
 * Validate a film storyboard before any expensive render starts.
 *
 * The auto-generated lecture library is allowed to be a study aid. A film is
 * not. This gate refuses generic filler, unsourced narration, missing shots,
 * and a run time that does not match the storyboard.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FILMS = path.join(ROOT, 'data', 'films');
const LECTURES = path.join(ROOT, 'data', 'lectures.json');

const BANNED = [
  /here is the one-line core/i,
  /first the faces, then the events/i,
  /that is all of it/i,
  /the essentials, spoken/i,
  /a lecture in chapters/i,
  /remember these/i
];

function fail(msg) {
  throw new Error(msg);
}

function readJson(file) {
  if (!fs.existsSync(file)) fail(`missing ${path.relative(ROOT, file)}`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`${path.relative(ROOT, file)} is not valid JSON: ${e.message}`);
  }
}

function validate(file) {
  const film = readJson(file);
  const errors = [];
  const warn = (m) => errors.push(m);

  if (film.schema !== 'vlymbooq.film.v1') warn('schema must be vlymbooq.film.v1');
  for (const key of ['id', 'topicId', 'title', 'subtitle', 'logline']) {
    if (!film[key] || typeof film[key] !== 'string') warn(`${key} is required`);
  }
  if (!(film.targetDuration >= 45)) warn('targetDuration must be at least 45 seconds');
  if (film.aspect !== '16:9') warn('aspect must be 16:9');
  if (!(film.fps >= 15 && film.fps <= 60)) warn('fps must be 15..60');
  if (!film.style || !Array.isArray(film.style.rules) || film.style.rules.length < 3) {
    warn('style.rules needs at least three concrete rules');
  }
  if (!film.toolchain || typeof film.toolchain !== 'object') warn('toolchain is required');

  const sources = new Map();
  if (!Array.isArray(film.sources) || !film.sources.length) warn('sources is required');
  for (const s of film.sources || []) {
    if (!s.id || !s.url || !/^https?:\/\//.test(s.url)) warn('every source needs id and http(s) url');
    else sources.set(s.id, s);
  }

  const lectures = fs.existsSync(LECTURES) ? readJson(LECTURES) : null;
  const topic = lectures
    ? (lectures.topics || []).find((t) => String(t.id).toLowerCase() === String(film.topicId).toLowerCase())
    : null;
  if (lectures && !topic) warn(`topicId ${JSON.stringify(film.topicId)} is not in data/lectures.json`);

  if (!Array.isArray(film.scenes) || film.scenes.length < 3) fail('film needs at least three scenes');

  const sceneIds = new Set();
  const shotIds = new Set();
  let cursor = 0;
  let shots = 0;
  let narrationLines = 0;

  film.scenes.forEach((scene, si) => {
    const where = `scene ${si + 1} (${scene.id || 'no id'})`;
    if (!scene.id || sceneIds.has(scene.id)) warn(`${where}: id is missing or duplicated`);
    sceneIds.add(scene.id);
    if (!scene.title || !scene.purpose) warn(`${where}: title and purpose are required`);
    if (!(scene.duration > 0)) warn(`${where}: duration must be positive`);
    if (Math.abs(Number(scene.start) - cursor) > 0.01) {
      warn(`${where}: start ${scene.start} does not follow previous scene (${cursor})`);
    }
    cursor = Number(scene.start) + Number(scene.duration);

    if (scene.narrationStart != null && !(Number(scene.narrationStart) >= 0)) {
      warn(`${where}: narrationStart must be zero or a positive number of seconds`);
    }
    if (scene.hold != null && !(Number(scene.hold) >= 0)) warn(`${where}: hold must be zero or positive`);
    if (!Array.isArray(scene.narration) || !scene.narration.length) warn(`${where}: narration is empty`);
    for (const line of scene.narration || []) {
      narrationLines++;
      const lineLen = String(line.text || '').trim().length;
      if (!line.text || lineLen < 4 || (lineLen < 8 && (scene.narration || []).length === 1)) {
        warn(`${where}: empty or too-short narration`);
      }
      if (!line.source || !sources.has(line.source)) warn(`${where}: narration needs a known source id`);
      for (const re of BANNED) {
        if (re.test(String(line.text))) warn(`${where}: banned filler phrase in narration: ${line.text}`);
      }
      if (String(line.text).length > 260) warn(`${where}: narration line is too long for one breath (${line.text.length} chars)`);
    }

    if (!Array.isArray(scene.shots) || !scene.shots.length) warn(`${where}: needs at least one shot`);
    for (const shot of scene.shots || []) {
      shots++;
      if (!shot.id || shotIds.has(shot.id)) warn(`${where}: shot id is missing or duplicated`);
      shotIds.add(shot.id);
      if (!shot.visual || String(shot.visual).trim().length < 30) warn(`${where}/${shot.id}: visual description is too thin`);
      if (!shot.camera) warn(`${where}/${shot.id}: camera is required`);
      if (!shot.plate) warn(`${where}/${shot.id}: plate is required`);
      if (!shot.render) warn(`${where}/${shot.id}: render is required`);
      if (!Array.isArray(shot.sfx) || !shot.sfx.length) warn(`${where}/${shot.id}: at least one sound cue is required`);
      if (shot.render === 'blender' && !shot.plate) warn(`${where}/${shot.id}: Blender shot needs a plate`);
      if (shot.hold != null && !(Number(shot.hold) > 0)) warn(`${where}/${shot.id}: hold must be a positive number of seconds`);
      if (shot.narrationLine != null) {
        const n = Number(shot.narrationLine);
        if (!Number.isInteger(n) || n < 1 || n > (scene.narration || []).length) {
          warn(`${where}/${shot.id}: narrationLine must point at one of the scene's narration lines`);
        }
      }
      if (shot.framing) {
        if (!Array.isArray(shot.framing.zoom) || shot.framing.zoom.length !== 2) {
          warn(`${where}/${shot.id}: framing.zoom must be [start,end]`);
        }
      }
    }
  });

  if (Math.abs(cursor - Number(film.targetDuration)) > Math.max(6, film.targetDuration * 0.08)) {
    warn(`scene durations total ${cursor}s but targetDuration is ${film.targetDuration}s`);
  }
  if (shots < film.scenes.length) warn('every scene needs at least one shot');
  if (narrationLines < film.scenes.length) warn('every scene needs narration');

  if (errors.length) {
    console.error(`FAIL ${path.relative(ROOT, file)}`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exitCode = 1;
    return;
  }

  console.log(`OK   ${path.relative(ROOT, file)}`);
  console.log(`     ${film.scenes.length} scenes · ${shots} shots · ${narrationLines} narration lines · ${cursor}s`);
  console.log(`     sources: ${[...sources.keys()].join(', ')}`);
}

function main() {
  const arg = process.argv[2];
  const files = arg
    ? [path.resolve(arg)]
    : fs.readdirSync(FILMS)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => path.join(FILMS, f));
  if (!files.length) fail('no film files found');
  for (const file of files) validate(file);
}

try {
  main();
} catch (e) {
  console.error(`FAIL ${e.message}`);
  process.exitCode = 1;
}
