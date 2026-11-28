#!/usr/bin/env node
/**
 * design-sets.test.js — the JS designer and the Python compiler must agree.
 *
 * design-sets.js carries its own copy of the space and prop vocabularies so it
 * can run without Blender. scene_kit_base.py / scene_kit_props.py own the real
 * lists. If someone adds a prop to Python and not here, the designer silently
 * stops being able to use it; if someone adds one here first, the compiler
 * raises SystemExit mid-render. This test fails on either drift, and on the
 * designer producing a spec the compiler would reject.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BASE = path.join(ROOT, 'scripts', 'film', 'blender', 'scene_kit_base.py');
const PROPS_PY = path.join(ROOT, 'scripts', 'film', 'blender', 'scene_kit_props.py');

const designer = require('./design-sets');

function pythonKeys(file, marker) {
  const text = fs.readFileSync(file, 'utf8');
  const at = text.indexOf(marker);
  assert.ok(at >= 0, `${path.basename(file)} has no ${marker}`);
  const open = text.indexOf('{', at);
  let depth = 0;
  let end = open;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  const block = text.slice(open, end);
  const keys = [...block.matchAll(/^\s*["']([a-z0-9-]+)["']\s*:/gm)].map((m) => m[1]);
  return keys;
}

function testVocabulariesMatch() {
  const spaces = pythonKeys(BASE, 'SPACES = {');
  const props = pythonKeys(PROPS_PY, 'PROPS = {');
  assert.deepStrictEqual(
    [...spaces].sort(), [...designer.SPACES].sort(),
    'SPACES in design-sets.js must match scene_kit_base.py'
  );
  assert.deepStrictEqual(
    [...props].sort(), [...designer.PROPS].sort(),
    'PROPS in design-sets.js must match scene_kit_props.py'
  );
  console.log(`  vocabularies match: ${spaces.length} spaces, ${props.length} props`);
}

function testTonesMatch() {
  const text = fs.readFileSync(BASE, 'utf8');
  const m = text.match(/EXPOSURE\s*=\s*\{([\s\S]*?)\}/);
  assert.ok(m, 'EXPOSURE not found');
  const tones = [...m[1].matchAll(/["']([a-z]+)["']\s*:/g)].map((x) => x[1]);
  assert.deepStrictEqual([...tones].sort(), [...designer.TONES].sort(),
    'TONES must match EXPOSURE keys');
  console.log(`  tones match: ${tones.join(', ')}`);
}

function fixture() {
  return {
    id: 'unit-fixture',
    title: 'Unit Fixture',
    edit: { grammar: 'paper-ledger' },
    scenes: [
      {
        id: 'S01', title: 'The Hook', purpose: 'open on the record',
        duration: 20, start: 0,
        narration: [{ text: 'A register sits open under a single sodium lamp.', source: 'a' }],
        shots: [
          { id: 'S01-A', plate: 'title', render: 'title', hold: 3, camera: 'locked title card', visual: 'Title over black.', sfx: ['tone'] },
          { id: 'S01-B', plate: 'ledger-01', render: 'blender', camera: 'slow push across the desk', visual: 'A ruled ledger open on a desk, columns of dues and one blank column in raking light.', sfx: ['paper', 'room tone'] }
        ]
      },
      {
        id: 'S02', title: 'The Plant', purpose: 'mechanical cause',
        duration: 20, start: 20,
        narration: [{ text: 'At the chemical plant the pressure gauge climbs past the red line.', source: 'a' }],
        shots: [
          { id: 'S02-A', plate: 'valve-01', render: 'blender', camera: 'close up, macro on the gauge', visual: 'A pressure gauge on a chemical plant valve, needle past the red line, piped corridor behind.', sfx: ['hiss'] }
        ]
      },
      {
        id: 'S03', title: 'The Room', purpose: 'the argument',
        duration: 20, start: 40,
        narration: [{ text: 'In court the witness describes the cell where he was held.', source: 'a' }],
        shots: [
          { id: 'S03-A', plate: 'gavel-01', render: 'blender', camera: 'top down on the long table', visual: 'A courtroom long table seen from above, gavel and witness box at the frame edge.', sfx: ['wood'] }
        ]
      }
    ]
  };
}

function testDesignIsCoherent() {
  const sets = designer.design(fixture());
  const plates = Object.keys(sets.plates);
  assert.deepStrictEqual(plates.sort(), ['gavel-01', 'ledger-01', 'valve-01']);
  assert.strictEqual(sets.script, 'scene_compiler.py');
  assert.ok(sets.palette.paper && sets.palette.ink && sets.palette.accent);

  const fingerprints = new Set();
  for (const [key, spec] of Object.entries(sets.scenes)) {
    assert.ok(designer.SPACES.includes(spec.space), `${key}: bad space ${spec.space}`);
    assert.ok(designer.PROPS.includes(spec.hero), `${key}: bad hero ${spec.hero}`);
    assert.ok(designer.TONES.includes(spec.tone), `${key}: bad tone ${spec.tone}`);
    assert.ok(Number.isInteger(spec.framing) && spec.framing >= 0 && spec.framing <= 5, `${key}: bad framing`);
    assert.ok(spec.dims.w >= 7 && spec.dims.w <= 19, `${key}: w out of range`);
    assert.ok(spec.dims.d >= 5 && spec.dims.d <= 12, `${key}: d out of range`);
    assert.ok(spec.dims.h >= 3.2 && spec.dims.h <= 7.6, `${key}: h out of range`);
    const fp = `${spec.space}|${spec.hero}|${spec.framing}`;
    assert.ok(!fingerprints.has(fp), `${key}: duplicate fingerprint ${fp}`);
    fingerprints.add(fp);
    assert.strictEqual(sets.plates[key].scene, key);
  }

  // The narration must actually steer the set, not fall back to a default.
  assert.strictEqual(sets.scenes['valve-01'].hero, 'valve', 'the chemical-plant line should cast a valve');
  assert.strictEqual(sets.scenes['valve-01'].space, 'warehouse', 'the plant line should be a plant room');
  assert.strictEqual(sets.scenes['gavel-01'].space, 'court', 'the courtroom line should be a court');
  assert.strictEqual(sets.scenes['ledger-01'].hero, 'ledger', 'the ledger line should cast a ledger');
  console.log('  narration steers sets: ledger→ledger, valve→plant, gavel→court');
}

function testDeterministic() {
  const a = designer.design(fixture());
  const b = designer.design(fixture());
  assert.deepStrictEqual(a, b, 'designing the same board twice must give the same sets');
  console.log('  deterministic: same board, same sets');
}

function testHonoursExplicitHint() {
  const film = fixture();
  film.scenes[0].shots[1].set = { space: 'newsroom', hero: 'press', props: ['paper-rack'], tone: 'night' };
  const sets = designer.design(film);
  assert.strictEqual(sets.scenes['ledger-01'].space, 'newsroom');
  assert.strictEqual(sets.scenes['ledger-01'].hero, 'press');
  assert.strictEqual(sets.scenes['ledger-01'].tone, 'night');
  console.log('  explicit shot.set hint is honoured');
}

const tests = [
  testVocabulariesMatch,
  testTonesMatch,
  testDesignIsCoherent,
  testDeterministic,
  testHonoursExplicitHint
];

let failed = 0;
for (const t of tests) {
  try {
    t();
  } catch (e) {
    failed++;
    console.error(`FAIL ${t.name}: ${e.message}`);
  }
}
console.log(failed ? `\n${failed} failed` : '\nall design-sets tests passed');
if (failed) process.exitCode = 1;