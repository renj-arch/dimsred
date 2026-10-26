#!/usr/bin/env node
/**
 * Render the 3D plates for a film with Blender, on the CI runner.
 *
 * No frame is generated on the owner's machine. The film storyboard names a
 * plate; this script maps it to a procedural Blender scene and writes a single
 * high-quality still. The motion-graphic timeline then gives that still its
 * camera move, typography and sound.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

// Each film owns a small, explicit set of procedural Blender scenes. A plate
// name is part of the storyboard contract; an unknown plate must fail before a
// runner spends an hour rendering the wrong thing.
const FILMS = {
  'salt-march': {
    script: 'salt_scenes.py',
    scenes: {
      'crystal-macro': 'crystal',
      'march-wide': 'march',
      'dandi-hand': 'dandi',
      'dharasana-line': 'dharasana',
      'prison-gate': 'prison'
    }
  },
  'jallianwala-bagh': {
    script: 'jallianwala_scenes.py',
    scenes: {
      'notice-desk': 'notice',
      'bagh-wall': 'bagh-wall',
      'bagh-wall-empty': 'bagh-wall-empty',
      'bagh-gate': 'bagh-gate',
      'bagh-gate-empty': 'bagh-gate-empty',
      'wall-scar': 'wall-scar',
      'watch': 'watch',
      'well': 'well',
      'report-desk': 'report',
      'lamp': 'lamp',
      'memorial': 'memorial'
    }
  },
  'bhopal-gas-tragedy': {
    script: 'bhopal_scenes.py',
    scenes: {
      'plant-gate': 'plant-gate',
      'tank-farm': 'tank-farm',
      'tank-610': 'tank-610',
      'gauge': 'gauge',
      'valve': 'valve',
      'flare': 'flare',
      'flare-cold': 'flare-cold',
      'control-panel': 'control-panel',
      'pipe-corridor': 'pipe-corridor',
      'company-sign': 'company-sign',
      'city-rooftops': 'city-rooftops',
      'street-lamp': 'street-lamp',
      'hospital-corridor': 'hospital-corridor',
      'clinic-window': 'clinic-window',
      'newspaper-desk': 'newspaper-desk',
      'courtroom': 'courtroom',
      'court-ledger': 'court-ledger',
      'water-tap': 'water-tap',
      'sample-jar': 'sample-jar',
      'memorial-wall': 'memorial-wall',
      'memorial-flame': 'memorial-flame',
      'archive': 'archive',
      'siren': 'siren',
      'clock': 'clock'
    }
  }
};

function parse(argv) {
  const o = {
    film: 'salt-march',
    outDir: '',
    width: 1920,
    height: 1080,
    samples: 32,
    only: '',
    force: false,
    blender: process.env.BLENDER || 'blender'
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === '--film') o.film = next();
    else if (a === '--out-dir') o.outDir = next();
    else if (a === '--width') o.width = Number(next());
    else if (a === '--height') o.height = Number(next());
    else if (a === '--samples') o.samples = Number(next());
    else if (a === '--only') o.only = next();
    else if (a === '--force') o.force = true;
    else if (a === '--blender') o.blender = next();
    else if (a === '--help' || a === '-h') {
      console.log('node scripts/film/render-plates.js --film salt-march [--samples 32] [--width 1920] [--height 1080] [--force]');
      process.exit(0);
    } else throw new Error(`Unknown option: ${a}`);
  }
  if (!o.outDir) o.outDir = path.join(ROOT, 'out', 'film', o.film, 'plates');
  return o;
}

/*
 * A film either brings its own scene file (the three bespoke films do) or a
 * sets file that points at the stock archetypes. The sets file carries the
 * palette and one entry per plate, so re-dressing a film never touches Python.
 */
function loadSetMap(filmId) {
  const setsFile = path.join(ROOT, 'data', 'films', `${filmId}-sets.json`);
  if (!fs.existsSync(setsFile)) return null;
  const sets = JSON.parse(fs.readFileSync(setsFile, 'utf8'));
  if (!sets.plates || typeof sets.plates !== 'object') {
    throw new Error(`${path.relative(ROOT, setsFile)} has no plates map`);
  }
  const map = new Map();
  for (const [plate, entry] of Object.entries(sets.plates)) {
    if (!entry || !entry.scene) throw new Error(`plate ${plate} has no scene in ${path.relative(ROOT, setsFile)}`);
    map.set(plate, {
      scene: entry.scene,
      params: { ...(entry.params || {}), palette: sets.palette || {} }
    });
  }
  return { script: sets.script || 'stock_sets.py', map, palette: sets.palette || {} };
}

function main() {
  const opts = parse(process.argv.slice(2));
  const filmPath = path.join(ROOT, 'data', 'films', `${opts.film}.json`);
  if (!fs.existsSync(filmPath)) throw new Error(`Film not found: ${filmPath}`);
  const film = JSON.parse(fs.readFileSync(filmPath, 'utf8'));
  const config = FILMS[opts.film];
  const sets = config ? null : loadSetMap(opts.film);
  if (!config && !sets) {
    throw new Error(`No Blender scene set registered for film ${opts.film} (add data/films/${opts.film}-sets.json)`);
  }
  const blenderScript = path.join(__dirname, 'blender', config ? config.script : sets.script);
  if (!fs.existsSync(blenderScript)) throw new Error(`Blender script not found: ${blenderScript}`);
  const lookup = (plate) => config
    ? { scene: config.scenes[plate], params: null }
    : sets.map.get(plate);
  fs.mkdirSync(opts.outDir, { recursive: true });

  const plates = new Map();
  for (const scene of film.scenes || []) {
    for (const shot of scene.shots || []) {
      if (shot.render !== 'blender') continue;
      const entry = lookup(shot.plate);
      if (!entry || !entry.scene) throw new Error(`No Blender scene mapped for plate ${shot.plate} in ${opts.film}`);
      plates.set(shot.plate, entry);
    }
  }
  const wanted = opts.only
    ? [{ plate: opts.only, ...lookup(opts.only) }]
    : [...plates].map(([plate, entry]) => ({ plate, ...entry }));
  if (!wanted.length) throw new Error('No Blender plates requested');

  const blenderCheck = spawnSync(opts.blender, ['--version'], { encoding: 'utf8' });
  if (blenderCheck.error) {
    throw new Error(`Blender not found at ${opts.blender}. Set BLENDER or install Blender on the runner.`);
  }
  console.log(blenderCheck.stdout.split('\n')[0]);

  for (const { plate, scene, params } of wanted) {
    if (!scene) throw new Error(`No Blender scene mapped for plate ${plate}`);
    const out = path.join(opts.outDir, `${plate}.png`);
    if (fs.existsSync(out) && !opts.force) {
      console.log(`[skip] ${plate} already exists`);
      continue;
    }
    const paramArgs = params ? ['--params', JSON.stringify(params)] : [];
    console.log(`\n[blender] ${plate} ← scene ${scene}${params ? ` (${JSON.stringify(params)})` : ''}  ${opts.width}x${opts.height} @ ${opts.samples} samples`);
    const result = spawnSync(
      opts.blender,
      [
        '-b',
        '--python', blenderScript,
        '--',
        '--scene', scene,
        '--out', out,
        '--width', String(opts.width),
        '--height', String(opts.height),
        '--samples', String(opts.samples),
        ...paramArgs
      ],
      { stdio: 'inherit', cwd: ROOT, timeout: 2 * 60 * 60 * 1000 }
    );
    if (result.error) throw new Error(`Blender failed for ${plate}: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`Blender exited ${result.status} for ${plate}`);
    if (!fs.existsSync(out)) throw new Error(`Blender did not write ${out}`);
    const bytes = fs.statSync(out).size;
    console.log(`[blender] ${plate}: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  }

  fs.writeFileSync(
    path.join(opts.outDir, 'plates.json'),
    JSON.stringify({ film: opts.film, width: opts.width, height: opts.height, samples: opts.samples, plates: wanted }, null, 2) + '\n'
  );
  console.log(`\nplates ready: ${opts.outDir}`);
}

try {
  main();
} catch (e) {
  console.error(`FAIL ${e.message}`);
  process.exitCode = 1;
}
