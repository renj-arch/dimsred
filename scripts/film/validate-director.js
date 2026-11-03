#!/usr/bin/env node
'use strict';

/**
 * The director gate.
 *
 * validate-film.js proves the storyboard is legal. This proves it is an
 * Evidence Room film: the six beats in order, the case-file graphics actually
 * present, every claim tagged, and no generic footage language. It is
 * deterministic and runs before any plate is rendered, so a weak board costs
 * seconds instead of an hour of CPU.
 *
 * Usage:
 *   node scripts/film/validate-director.js data/films/chauri-chaura-1922.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/film/validate-director.js <storyboard.json>');
  process.exit(2);
}

const film = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8'));
const problems = [];
const fail = (m) => problems.push(m);

const BEATS = ['THE ANOMALY', 'THE FILE', 'THE CHAIN', 'THE SPLIT', 'THE MECHANISM', 'THE RETURN'];
const GRAPHIC_TYPES = new Set(['map', 'timeline', 'stats', 'compare', 'board', 'document', 'split']);
const STOCK_WORDS = /\b(stock footage|stock clip|drone shot|drone|talking head|b-roll|generic montage|montage|slow motion|aerial)\b/i;

const scenes = Array.isArray(film.scenes) ? film.scenes : [];
const shots = scenes.flatMap((s) => (s.shots || []).map((shot) => ({ ...shot, scene: s })));
const graphics = shots.filter((shot) => shot.render === 'graphic');
const narrations = scenes.flatMap((s) => s.narration || []);

// 1. The six beats, in order, before the coda.
const titles = scenes.map((s) => String(s.title || '').toUpperCase());
BEATS.forEach((beat, i) => {
  const at = titles.indexOf(beat);
  if (at < 0) fail(`missing beat ${beat} (scene ${i + 1})`);
  else if (i > 0) {
    const prev = titles.indexOf(BEATS[i - 1]);
    if (prev >= 0 && at <= prev) fail(`${beat} must follow ${BEATS[i - 1]}`);
  }
});
const beatScenes = scenes.filter((s) => BEATS.includes(String(s.title || '').toUpperCase()));
if (beatScenes.length < 6) fail(`only ${beatScenes.length} of the six beats are present`);

// 2. The room must be recognisable in the opening five seconds.
const first = shots[0];
if (!first) fail('the film has no shots');
else {
  const opensOnRoom = first.render === 'title' ||
    (first.render === 'graphic' && first.graphic && first.graphic.type === 'board');
  if (!opensOnRoom) fail('the first shot must be the title card or the evidence board');
  if ((Number(first.hold) || 0) < 2.5 && first.render === 'title') {
    fail('the opening title card needs at least 2.5 seconds');
  }
}

// 3. Graphics carry the argument, not decoration.
const types = new Set(graphics.map((shot) => shot.graphic && shot.graphic.type));
if (graphics.length < 10) fail(`only ${graphics.length} graphic shots; the format needs at least 10`);
if (graphics.length / Math.max(1, shots.length) < 0.28) {
  fail(`graphics are ${Math.round((graphics.length / shots.length) * 100)}% of shots; the floor is 28%`);
}
['map', 'timeline', 'stats', 'board'].forEach((type) => {
  if (!types.has(type)) fail(`the case file needs at least one ${type} graphic`);
});
if (!types.has('document') && !types.has('split')) {
  fail('the case file needs a document insert or a split-screen argument');
}

// 4. Every graphic is labelled like evidence, and every figure has a row.
graphics.forEach((shot) => {
  const g = shot.graphic || {};
  const where = shot.id;
  if (!GRAPHIC_TYPES.has(g.type)) fail(`${where}: unknown graphic type ${g.type}`);
  if (!g.title || String(g.title).trim().length < 3) fail(`${where}: graphic needs a title`);
  if (!g.source || String(g.source).trim().length < 4) fail(`${where}: graphic needs a visible source tag`);
  if (!g.source.includes('LEDGER')) fail(`${where}: source tag must name the ledger, not a vibe`);
});

if (graphics.length < 1) fail('no graphics to check');

// 5. No generic footage language anywhere in the board.
shots.forEach((shot) => {
  const hay = `${shot.visual || ''} ${shot.camera || ''} ${(shot.sfx || []).join(' ')}`;
  const m = hay.match(STOCK_WORDS);
  if (m) fail(`${shot.id}: generic footage language "${m[0]}"`);
});

// 6. Numbers on plates must be tagged to a row.
shots.forEach((shot) => {
  if (shot.render === 'graphic') return;
  if (/\d/.test(String(shot.text || '')) && !shot.sourceTag) {
    fail(`${shot.id}: on-screen number "${shot.text}" needs a sourceTag`);
  }
});

// 7. The film is a case file, not a sketch: enough lines, a sane length.
if (narrations.length < 36) fail(`only ${narrations.length} narration lines; the floor is 36`);
if (!(Number(film.targetDuration) >= 240 && Number(film.targetDuration) <= 420)) {
  fail(`targetDuration ${film.targetDuration}s is outside the 4:00–7:00 case-file range`);
}
if (!film.caseNumber) fail('caseNumber is required for the poster and title card');
if (!Array.isArray(film.titleLines) || film.titleLines.length < 1) fail('titleLines are required for the title card');

// 8. Every act must return to paper.
const plateShots = shots.filter((shot) => shot.render !== 'graphic' && shot.render !== 'title');
if (plateShots.length < 12) fail(`only ${plateShots.length} plate shots; the room needs enough paper to breathe`);

for (const p of problems) console.error(`FAIL ${p}`);
if (problems.length) {
  console.error(`\n${problems.length} director problem(s) in ${file}`);
  process.exit(1);
}

const byType = {};
graphics.forEach((shot) => {
  const type = shot.graphic.type;
  byType[type] = (byType[type] || 0) + 1;
});
console.log(`PASS director gate: ${scenes.length} scenes · ${shots.length} shots · ${narrations.length} lines · ${graphics.length} graphics`);
console.log(`  beats: ${BEATS.join(' → ')}${titles.includes('CODA') ? ' → CODA' : ''}`);
console.log(`  graphics: ${Object.entries(byType).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
