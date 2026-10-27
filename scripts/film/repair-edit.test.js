#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { repairFilm } = require('./repair-edit');

const ROOT = path.resolve(__dirname, '..', '..');

// A real, already-valid film must pass through untouched.
const emergency = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'data', 'films', 'emergency-1975.json'), 'utf8'));
const clean = repairFilm(emergency);
assert.deepStrictEqual(clean.repairs, [], 'valid film should need no repairs');

// A deliberately broken edit must come out inside every QC limit.
const broken = {
  scenes: [{
    shots: [
      { id: 'A', transition: { type: 'hard-cut', frames: 3, reason: 'A cut with frames.' } },
      { id: 'B', transition: { type: 'iris', frames: 8, reason: 'The iris closes.', sound: 'x' } },
      { id: 'C', transition: { type: 'paper-wipe', frames: 12, reason: 'A page wipes.', sound: 'x' } },
      { id: 'D', transition: { type: 'iris', frames: 8, reason: 'The rim closes.', sound: 'x' } },
      { id: 'E', transition: { type: 'iris', frames: 8, reason: 'The ring closes.', sound: 'x' } },
      { id: 'F', transition: { type: 'iris', frames: 8, reason: 'The seal closes.', sound: 'x' } },
      { id: 'G', transition: { type: 'dip', frames: 8, reason: 'The final dip.', sound: 'x' } }
    ]
  }]
};
const fixed = repairFilm(broken);
const shots = fixed.film.scenes[0].shots;
assert.strictEqual(shots[0].transition.type, 'hard-cut');
assert.strictEqual(shots[0].transition.frames, 0);
assert.strictEqual(shots[1].transition.type, 'hard-cut', 'bad iris reason downgraded');
assert.strictEqual(shots[2].transition.frames, 10, 'paper wipe clamped');
const iris = shots.filter((shot) => shot.transition.type === 'iris');
assert.strictEqual(iris.length, 2, 'no more than two irises survive');
assert.strictEqual(shots[6].transition.type, 'dip');
assert.strictEqual(shots[6].transition.frames, 6, 'final dip clamped to six frames');
assert.ok(fixed.repairs.length >= 4, 'repairs are reported');

// A dip anywhere but the last cut must become a hard cut.
const earlyDip = {
  scenes: [{ shots: [
    { id: 'A', transition: { type: 'dip', frames: 5, reason: 'An early dip.', sound: 'x' } },
    { id: 'B', transition: { type: 'hard-cut', frames: 0, reason: 'The final cut.' } }
  ] }]
};
const early = repairFilm(earlyDip);
assert.strictEqual(early.film.scenes[0].shots[0].transition.type, 'hard-cut');

console.log(`PASS repair-edit: ${fixed.repairs.length} repairs, ${iris.length} irises, clean film untouched`);
