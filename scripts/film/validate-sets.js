#!/usr/bin/env node
/**
 * validate-sets.js — gate the generated scene designs before Blender runs.
 *
 * `design-sets.js` writes `data/films/<id>-sets.json` from the narration.
 * `scene_compiler.py` will raise SystemExit on an unknown space or hero, but
 * only after a runner has booted Blender and paid the start-up cost. This gate
 * runs in milliseconds and refuses the same mistakes up front, plus the ones
 * Python cannot see:
 *
 *   - a plate in the storyboard with no design
 *   - a design for a scene that is not in the file
 *   - dims outside the compiler's clamp, framing outside 0..5
 *   - two shots in one film with the same space/hero/framing fingerprint
 *   - a palette that is missing a key the compiler reads
 *
 * Usage:
 *   node scripts/film/validate-sets.js data/films/<id>-sets.json
 *   node scripts/film/validate-sets.js            # every *-sets.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FILMS = path.join(ROOT, 'data', 'films');
const DIMS = { w: [7.0, 19.0], d: [5.0, 12.0], h: [3.2, 7.6] };

const SPACES = new Set([
  'hall', 'corridor', 'cell', 'court', 'open', 'street', 'warehouse', 'office',
  'studio', 'ward', 'deck', 'yard', 'vault', 'archive', 'lab', 'hangar',
  'platform', 'market', 'temple', 'tunnel', 'bunker', 'newsroom'
]);

const PROPS = new Set([
  'press', 'paper-rack', 'ink-slab', 'stamp', 'ink-pad', 'notes-stack',
  'ledger', 'desk', 'typewriter', 'telephone', 'radio-rack', 'microphone',
  'map-table', 'long-table', 'crates', 'barrel', 'tarp', 'sandbags', 'fence',
  'flag', 'podium', 'ranks', 'cot', 'bars', 'gavel', 'witness-box', 'scales',
  'plinth', 'wreath', 'candles', 'lathe', 'toolboard', 'workbench', 'valve',
  'clock', 'lamp-post', 'bed', 'ballot-box', 'oil-drum', 'pew', 'stage'
]);

const TONES = new Set(['dawn', 'day', 'dusk', 'night']);
const LIGHT_KEYS = new Set(['warm', 'cool', 'hard', 'sodium']);
const PALETTE_KEYS = ['paper', 'ink', 'accent'];

function fail(list, msg) {
  list.push(msg);
}

function checkDim(problems, where, key, value) {
  const [lo, hi] = DIMS[key];
  const n = Number(value);
  if (!Number.isFinite(n)) fail(problems, `${where}: dims.${key} is not a number`);
  else if (n < lo || n > hi) fail(problems, `${where}: dims.${key} ${n} outside ${lo}..${hi}`);
}

function storyboardPlates(filmId) {
  const file = path.join(FILMS, `${filmId}.json`);
  if (!fs.existsSync(file)) return null;
  const film = JSON.parse(fs.readFileSync(file, 'utf8'));
  const plates = [];
  for (const scene of film.scenes || []) {
    for (const shot of scene.shots || []) {
      if (shot.render === 'blender' && shot.plate) plates.push(String(shot.plate));
    }
  }
  return plates;
}

function validate(file) {
  const problems = [];
  const rel = path.relative(ROOT, file);
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`FAIL ${rel} is not valid JSON: ${e.message}`);
    process.exitCode = 1;
    return;
  }

  if (!doc.film) fail(problems, 'film id is required');
  if (doc.script !== 'scene_compiler.py') {
    fail(problems, `script must be scene_compiler.py for a designed set (found ${JSON.stringify(doc.script)})`);
  }

  const palette = doc.palette || {};
  for (const key of PALETTE_KEYS) {
    if (!/^#[0-9a-f]{6}$/i.test(String(palette[key] || ''))) {
      fail(problems, `palette.${key} must be a #rrggbb colour`);
    }
  }

  const scenes = doc.scenes || {};
  const plates = doc.plates || {};
  const sceneKeys = Object.keys(scenes);
  if (!sceneKeys.length) fail(problems, 'scenes map is empty');

  const fingerprints = new Map();
  for (const key of sceneKeys) {
    const spec = scenes[key] || {};
    const where = `scene ${key}`;
    if (!SPACES.has(spec.space)) fail(problems, `${where}: unknown space ${JSON.stringify(spec.space)}`);
    if (!PROPS.has(spec.hero)) fail(problems, `${where}: unknown hero ${JSON.stringify(spec.hero)}`);
    for (const p of spec.props || []) {
      if (!PROPS.has(p)) fail(problems, `${where}: unknown prop ${JSON.stringify(p)}`);
      if (p === spec.hero) fail(problems, `${where}: hero ${p} repeated in props`);
    }
    if (!TONES.has(spec.tone)) fail(problems, `${where}: unknown tone ${JSON.stringify(spec.tone)}`);
    const light = spec.light || {};
    if (!LIGHT_KEYS.has(light.key)) fail(problems, `${where}: unknown light.key ${JSON.stringify(light.key)}`);
    const framing = Number(spec.framing);
    if (!Number.isInteger(framing) || framing < 0 || framing > 5) {
      fail(problems, `${where}: framing must be an integer 0..5 (found ${JSON.stringify(spec.framing)})`);
    }
    const dims = spec.dims || {};
    for (const k of ['w', 'd', 'h']) checkDim(problems, where, k, dims[k]);
    if (!Number.isInteger(Number(spec.seed))) fail(problems, `${where}: seed must be an integer`);

    const fp = `${spec.space}|${spec.hero}|${framing}`;
    if (fingerprints.has(fp)) {
      fail(problems, `${where}: same space/hero/framing as ${fingerprints.get(fp)} (${fp})`);
    } else {
      fingerprints.set(fp, key);
    }
  }

  for (const [plate, entry] of Object.entries(plates)) {
    if (!entry || !entry.scene) fail(problems, `plate ${plate} has no scene`);
    else if (!scenes[entry.scene]) fail(problems, `plate ${plate} points at missing scene ${entry.scene}`);
    if (entry && entry.script && entry.script !== 'scene_compiler.py') {
      fail(problems, `plate ${plate} uses ${entry.script}; a designed set must use scene_compiler.py`);
    }
  }

  // The storyboard and the set must describe the same shots.
  const wanted = doc.film ? storyboardPlates(doc.film) : null;
  if (wanted) {
    const have = new Set(Object.keys(plates));
    const missing = [...new Set(wanted)].filter((p) => !have.has(p));
    const extra = [...have].filter((p) => !wanted.includes(p));
    if (missing.length) fail(problems, `storyboard plates with no design: ${missing.join(', ')}`);
    if (extra.length) fail(problems, `designs with no shot in the storyboard: ${extra.join(', ')}`);
  }

  if (problems.length) {
    console.error(`FAIL ${rel}`);
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exitCode = 1;
    return;
  }

  const spaces = [...new Set(Object.values(scenes).map((s) => s.space))];
  const heroes = [...new Set(Object.values(scenes).map((s) => s.hero))];
  console.log(`OK   ${rel}`);
  console.log(`     ${sceneKeys.length} scenes · ${spaces.length} spaces · ${heroes.length} heroes · ${Object.keys(plates).length} plates`);
}

function main() {
  const arg = process.argv[2];
  const files = arg
    ? [path.resolve(arg)]
    : fs.readdirSync(FILMS)
        .filter((f) => f.endsWith('-sets.json'))
        .sort()
        .map((f) => path.join(FILMS, f));
  if (!files.length) {
    console.error('FAIL no *-sets.json files found');
    process.exitCode = 1;
    return;
  }
  for (const file of files) validate(file);
}

try {
  main();
} catch (e) {
  console.error(`FAIL ${e.message}`);
  process.exitCode = 1;
}