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

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000
};

function canonical(text) {
  return String(text)
    .toLowerCase()
    .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/g,
      (word) => String(NUMBER_WORDS[word]))
    .replace(/,/g, '');
}

function numericTokens(text) {
  return (canonical(text).match(/\d+(?:\.\d+)?/g) || []);
}

const GRAPHIC_TYPES = new Set(['map', 'timeline', 'stats', 'compare', 'board', 'document', 'split']);
const RENDERS = new Set(['blender', 'html', 'map', 'title', 'graphic']);


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
  if (!film.edit || typeof film.edit !== 'object') {
    warn('edit grammar is required (docs/film-editing.md)');
  } else {
    if (!film.edit.grammar) warn('edit.grammar is required');
    if (!Array.isArray(film.edit.signature) || film.edit.signature.length < 3) {
      warn('edit.signature needs at least three moves');
    }
    if (film.edit.captureFps != null && Number(film.edit.captureFps) < 24) {
      warn('edit.captureFps must be at least 24 for transition timing');
    }
  }

  const TRANSITIONS = new Set([
    'hard-cut', 'smash-cut', 'match-cut', 'whip-left', 'whip-right', 'iris',
    'paper-wipe', 'mask-wipe', 'dissolve', 'flash-frame', 'shutter',
    'speed-ramp', 'l-cut', 'j-cut', 'frame-burn', 'light-leak', 'object-wipe',
    'dust-wipe', 'page-turn', 'scanline', 'dip'
  ]);

  const sources = new Map();
  if (!Array.isArray(film.sources) || !film.sources.length) warn('sources is required');
  for (const s of film.sources || []) {
    if (!s.id || !s.url || !/^https?:\/\//.test(s.url)) warn('every source needs id and http(s) url');
    else sources.set(s.id, s);
  }

  const ledgerFile = file.replace(/\.json$/i, '-ledger.json');
  const ledgerRaw = fs.existsSync(ledgerFile) ? readJson(ledgerFile) : null;
  const ledgerById = new Map(((ledgerRaw && ledgerRaw.rows) || []).map((row) => [row.id, row]));
  const checkLedgerNumbers = (where, ref, display) => {
    if (!ref) {
      warn(`${where}: ledger row is required`);
      return;
    }
    const row = ledgerById.get(ref);
    if (!row) {
      warn(`${where}: ledger row ${ref} does not exist`);
      return;
    }
    const available = new Set(numericTokens(row.text));
    for (const token of numericTokens(display)) {
      if (!available.has(token)) {
        warn(`${where}: ${token} is not in ${ref}`);
      }
    }
  };

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
    if (!Array.isArray(scene.narration) || !scene.narration.length) {
      // A silent coda is allowed only when it is exactly a closing title card:
      // no voice, no caption, no new claim.
      const silentCoda = Array.isArray(scene.shots) && scene.shots.length > 0 &&
        scene.shots.every((shot) => shot.render === 'title' && shot.closing === true);
      if (!silentCoda) warn(`${where}: narration is empty`);
    }
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
      if (!shot.plate && shot.render !== 'graphic') warn(`${where}/${shot.id}: plate is required`);
      if (!shot.render) warn(`${where}/${shot.id}: render is required`);
      else if (!RENDERS.has(shot.render)) warn(`${where}/${shot.id}: unknown render ${shot.render}`);
      if (!Array.isArray(shot.sfx) || !shot.sfx.length) warn(`${where}/${shot.id}: at least one sound cue is required`);
      if (shot.render === 'blender' && !shot.plate) warn(`${where}/${shot.id}: Blender shot needs a plate`);
      if (shot.render === 'graphic') {
        const g = shot.graphic;
        const gwhere = `${where}/${shot.id}`;
        if (!g || typeof g !== 'object' || Array.isArray(g)) {
          warn(`${gwhere}: graphic data is required`);
        } else {
          if (!GRAPHIC_TYPES.has(g.type)) warn(`${gwhere}: unknown graphic type ${g.type}`);
          if (!g.title || String(g.title).trim().length < 3) warn(`${gwhere}: graphic title is required`);
          if (!g.source || String(g.source).trim().length < 4) warn(`${gwhere}: graphic source tag is required`);
          if (g.type === 'map') {
            const points = Array.isArray(g.points) ? g.points : [];
            if (!points.length) warn(`${gwhere}: map needs at least one point`);
            points.forEach((point, pi) => {
              if (point.lon == null || point.lat == null) warn(`${gwhere}: map point ${pi + 1} needs lon and lat`);
              const rows = Array.isArray(point.rows) ? point.rows : [];
              if (!rows.length) warn(`${gwhere}: map point ${pi + 1} needs rows`);
              rows.forEach((row, ri) => {
                const value = Array.isArray(row) ? row[0] : row && row.value;
                const ref = Array.isArray(row) ? row[2] : row && row.ledger;
                checkLedgerNumbers(`${gwhere} map row ${ri + 1}`, ref, value);
              });
            });
          } else if (g.type === 'timeline') {
            const events = Array.isArray(g.events) ? g.events : [];
            if (events.length < 2) warn(`${gwhere}: timeline needs at least two events`);
            events.forEach((ev, i) => {
              checkLedgerNumbers(`${gwhere} event ${i + 1}`, ev.ledger, `${ev.date || ''} ${ev.label || ''}`);
            });
          } else if (g.type === 'stats') {
            const items = Array.isArray(g.items) ? g.items : [];
            if (!items.length) warn(`${gwhere}: stats needs at least one item`);
            items.forEach((item, i) => {
              checkLedgerNumbers(`${gwhere} stat ${i + 1}`, item.ledger, item.value);
            });
          } else if (g.type === 'compare') {
            if (!g.left || !g.right) warn(`${gwhere}: compare needs left and right sides`);
            [g.left, g.right].forEach((side, i) => {
              if (!side) return;
              checkLedgerNumbers(`${gwhere} compare ${i === 0 ? 'left' : 'right'}`,
                side.ledger, `${side.value == null ? '' : side.value} ${side.title || ''} ${side.body || ''}`);
            });
          } else if (g.type === 'board') {
            const cards = Array.isArray(g.cards) ? g.cards : [];
            if (cards.length < 2) warn(`${gwhere}: board needs at least two cards`);
            cards.forEach((card, i) => {
              checkLedgerNumbers(`${gwhere} card ${i + 1}`, card.ledger, `${card.title || ''} ${card.line || ''}`);
            });
          } else if (g.type === 'document') {
            if (!g.image) warn(`${gwhere}: document needs an image`);
            else if (!fs.existsSync(path.join(ROOT, 'assets', 'film-media', g.image))) {
              warn(`${gwhere}: missing media image ${g.image}`);
            }
            if (!g.credit) warn(`${gwhere}: document needs an image credit`);
            checkLedgerNumbers(`${gwhere} document`, g.ledger, `${g.title || ''} ${g.body || ''} ${g.caption || ''}`);
          } else if (g.type === 'split') {
            if (!g.left || !g.right) warn(`${gwhere}: split needs left and right sides`);
            [g.left, g.right].forEach((side, i) => {
              if (!side) return;
              checkLedgerNumbers(`${gwhere} split ${i === 0 ? 'left' : 'right'}`,
                side.ledger, `${side.value == null ? '' : side.value} ${side.title || ''} ${side.body || ''}`);
            });
          }
        }
      }
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
      const tr = shot.transition;
      if (tr == null) {
        warn(`${where}/${shot.id}: transition is required (use a transition object)`);
      } else if (typeof tr === 'string') {
        if (!TRANSITIONS.has(tr)) warn(`${where}/${shot.id}: unknown transition ${tr}`);
      } else if (typeof tr === 'object') {
        if (!tr.type || !TRANSITIONS.has(tr.type)) {
          warn(`${where}/${shot.id}: transition.type must be a known type`);
        }
        const frames = Number(tr.frames);
        if (!Number.isInteger(frames) || frames < 0 || frames > 18) {
          warn(`${where}/${shot.id}: transition.frames must be an integer from 0 to 18`);
        }
        if (!tr.reason || String(tr.reason).trim().length < 12) {
          warn(`${where}/${shot.id}: transition needs a one-sentence reason`);
        }
        if (tr.type !== 'hard-cut' && !tr.sound) {
          warn(`${where}/${shot.id}: ${tr.type} needs a sound bridge`);
        }
        if (tr.type === 'dip' && shot.id !== film.scenes[film.scenes.length - 1].shots.slice(-1)[0].id) {
          warn(`${where}/${shot.id}: dip is only allowed on the final shot`);
        }
      } else {
        warn(`${where}/${shot.id}: transition must be a string or object`);
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
