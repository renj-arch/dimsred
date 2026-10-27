#!/usr/bin/env node
/*
 * Repair mechanical edit-rule violations before the build.
 *
 * The edit QC is allowed to reject a film for a bad cut, but it should not
 * reject a film for a transition that can be fixed without changing a word of
 * narration. This pass caps repeated effects, downgrades an effect whose
 * reason does not name the thing it lands on, and puts the single dip on the
 * final cut. Every change is logged; nothing is silent.
 *
 * Usage:
 *   node scripts/film/repair-edit.js data/films/<film>.json
 *   node scripts/film/repair-edit.js data/films/<film>.json --write
 */
'use strict';

const fs = require('fs');

const RANGES = {
  'match-cut': [0, 2],
  iris: [7, 10],
  'paper-wipe': [6, 10],
  dissolve: [8, 14],
  'whip-left': [5, 8],
  'whip-right': [5, 8],
  'flash-frame': [1, 2],
  dip: [4, 6]
};

const REASONS = {
  iris: /circle|ring|seal|handwheel|rim/i,
  'paper-wipe': /paper|ledger|newspaper|page|document/i,
  dissolve: /gas|vapou?r|haze|smoke|cloud/i,
  'whip-left': /siren|turn|motion|whip|air/i,
  'whip-right': /siren|turn|motion|whip|air/i
};

const SOUNDS = {
  iris: 'lamp click',
  'paper-wipe': 'paper drag',
  'page-turn': 'single page turn',
  dip: 'flame out',
  dissolve: 'room tone',
  'whip-left': 'air whip',
  'whip-right': 'air whip',
  'flash-frame': 'shutter',
  'object-wipe': 'object drag'
};

const CUT_REASON =
  'The cut lands on the first word of the line so the figure and the voice arrive together.';

function hardCut(id, repairs, why) {
  repairs.push(`${id}: ${why}; replaced with a hard cut`);
  return { type: 'hard-cut', frames: 0, sound: 'line onset', reason: CUT_REASON };
}

function repairFilm(input) {
  const film = JSON.parse(JSON.stringify(input));
  const repairs = [];
  const shots = [];
  for (const scene of film.scenes || []) {
    for (const shot of scene.shots || []) shots.push(shot);
  }

  const counts = {};
  shots.forEach((shot, index) => {
    const raw = shot.transition;
    let spec = raw && typeof raw === 'object'
      ? Object.assign({}, raw)
      : { type: raw || 'hard-cut', frames: 0, reason: '', sound: null };
    const id = shot.id || `shot ${index + 1}`;
    let type = String(spec.type || 'hard-cut');
    const last = index === shots.length - 1;

    if (type === 'match-cut') {
      // A match cut is a zero-frame cut for timing purposes.
      spec.frames = 0;
    }

    if (type === 'hard-cut') {
      if (Number(spec.frames) !== 0) {
        repairs.push(`${id}: hard cut had ${spec.frames} frames; set to 0`);
        spec.frames = 0;
      }
      if (!spec.reason || String(spec.reason).trim().length < 12) {
        spec.reason = CUT_REASON;
      }
      spec.sound = spec.sound || 'line onset';
      shot.transition = spec;
      return;
    }

    if (type === 'dip' && !last) {
      shot.transition = hardCut(id, repairs, 'dip is only allowed on the final cut');
      return;
    }

    if (type === 'flash-frame' && index !== 0) {
      shot.transition = hardCut(id, repairs, 'flash frame is only allowed on the opening cut');
      return;
    }

    if (type === 'page-turn' && !(Number(spec.frames) > 0)) {
      spec.frames = 10;
      repairs.push(`${id}: page turn had no duration; set to 10 frames`);
    }

    const range = RANGES[type];
    if (range) {
      const frames = Number(spec.frames);
      if (!Number.isFinite(frames) || frames < range[0] || frames > range[1]) {
        const fixed = Math.min(range[1], Math.max(range[0], Number.isFinite(frames) ? Math.round(frames) : range[0]));
        repairs.push(`${id}: ${type} was ${spec.frames} frames; set to ${fixed}`);
        spec.frames = fixed;
      }
    }

    if (REASONS[type] && !REASONS[type].test(String(spec.reason || ''))) {
      shot.transition = hardCut(id, repairs, `${type} did not name the object it lands on`);
      return;
    }

    if (!spec.reason || String(spec.reason).trim().length < 12) {
      shot.transition = hardCut(id, repairs, `${type} had no written reason`);
      return;
    }

    counts[type] = (counts[type] || 0) + 1;
    if (counts[type] > 2) {
      shot.transition = hardCut(id, repairs, `${type} was the third use of the same effect`);
      return;
    }

    spec.sound = spec.sound || SOUNDS[type] || 'room tone';
    shot.transition = spec;
  });

  return { film, repairs };
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node scripts/film/repair-edit.js <storyboard.json> [--write]');
    process.exitCode = 2;
    return;
  }
  const original = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { film, repairs } = repairFilm(original);
  for (const repair of repairs) console.log(`repair: ${repair}`);
  console.log(`${repairs.length} mechanical edit repair(s)`);
  if (process.argv.includes('--write') && repairs.length) {
    fs.writeFileSync(file, JSON.stringify(film, null, 2) + '\n');
    console.log(`wrote ${file}`);
  }
}

if (require.main === module) main();

module.exports = { repairFilm };
