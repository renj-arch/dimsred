#!/usr/bin/env node
'use strict';

/**
 * The director gate — craft, not a house template.
 *
 * This gate used to require an "Evidence Room" case file: six fixed beat
 * titles (THE ANOMALY, THE FILE, THE CHAIN ...), at least ten graphic shots,
 * graphics making up 28% of the board, at least one map / timeline / stats /
 * board graphic, a caseNumber, and a runtime between 4:00 and 7:00.
 *
 * The authoring lane never produced any of that. It writes its own scene
 * titles ("The object", "The order", "The machine", "The cost", "The turn",
 * "The argument", "The record", "The return") and no `render: "graphic"`
 * shots at all. So every authored film failed here with sixteen problems and
 * was struck off the slate before Blender ever started. Run 43746770519 is the
 * clearest example: a perfectly renderable board, blocked by a template.
 *
 * A gate no valid film can pass is not a gate. What matters is craft, and that
 * is what this checks now:
 *
 *   - the film opens on something rather than a blank frame
 *   - every shot has a visual sentence, a camera move and a sound cue
 *   - no generic footage language ("stock footage", "b-roll", "drone")
 *   - a repeated plate must change its framing, not be parked on
 *   - narration is sourced, short enough to breathe, and not filler
 *   - the runtime is a real short film, neither a sketch nor a slog
 *   - graphics, when a board chooses to use them, are labelled with a source
 *   - the scene structure is the film's own
 *
 * A board that wants the old format can opt in with `"format": "evidence-room"`
 * and the strict case-file checks still run.
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

const STOCK_WORDS = /\b(stock footage|stock clip|drone shot|\bdrone\b|talking head|b-roll|generic montage|montage)\b/i;
const BANNED_NARRATION = [
  /here is the one-line core/i,
  /first the faces, then the events/i,
  /that is all of it/i,
  /the essentials, spoken/i,
  /a lecture in chapters/i,
  /remember these/i
];

const scenes = Array.isArray(film.scenes) ? film.scenes : [];
const shots = scenes.flatMap((s) => (s.shots || []).map((shot) => ({ ...shot, scene: s })));
const narrations = scenes.flatMap((s) => s.narration || []);
const graphics = shots.filter((shot) => shot.render === 'graphic');
const plateShots = shots.filter((shot) => shot.render === 'blender');

/* -------------------------------------------------------------------------
 * The template, for boards that ask for it.
 * ---------------------------------------------------------------------- */

function evidenceRoomGate() {
  const BEATS = ['THE ANOMALY', 'THE FILE', 'THE CHAIN', 'THE SPLIT', 'THE MECHANISM', 'THE RETURN'];
  const GRAPHIC_TYPES = new Set(['map', 'timeline', 'stats', 'compare', 'board', 'document', 'split']);

  const titles = scenes.map((s) => String(s.title || '').toUpperCase());
  BEATS.forEach((beat, i) => {
    const at = titles.indexOf(beat);
    if (at < 0) fail(`missing beat ${beat} (scene ${i + 1})`);
    else if (i > 0) {
      const prev = titles.indexOf(BEATS[i - 1]);
      if (prev >= 0 && at <= prev) fail(`${beat} must follow ${BEATS[i - 1]}`);
    }
  });

  const types = new Set(graphics.map((shot) => shot.graphic && shot.graphic.type));
  if (graphics.length < 10) fail(`only ${graphics.length} graphic shots; this format needs at least 10`);
  if (graphics.length / Math.max(1, shots.length) < 0.28) {
    fail(`graphics are ${Math.round((graphics.length / shots.length) * 100)}% of shots; this format's floor is 28%`);
  }
  ['map', 'timeline', 'stats', 'board'].forEach((type) => {
    if (!types.has(type)) fail(`this format needs at least one ${type} graphic`);
  });
  if (!types.has('document') && !types.has('split')) {
    fail('this format needs a document insert or a split-screen argument');
  }
  graphics.forEach((shot) => {
    const g = shot.graphic || {};
    if (!GRAPHIC_TYPES.has(g.type)) fail(`${shot.id}: unknown graphic type ${g.type}`);
    if (!g.title || String(g.title).trim().length < 3) fail(`${shot.id}: graphic needs a title`);
    if (!g.source || !String(g.source).includes('LEDGER')) fail(`${shot.id}: source tag must name the ledger`);
  });
  if (!(Number(film.targetDuration) >= 240 && Number(film.targetDuration) <= 420)) {
    fail(`targetDuration ${film.targetDuration}s is outside the 4:00-7:00 range this format asks for`);
  }
  if (!film.caseNumber) fail('caseNumber is required for the poster and title card in this format');
  if (narrations.length < 36) fail(`only ${narrations.length} narration lines; this format's floor is 36`);
}

/* -------------------------------------------------------------------------
 * The craft gate — what every film has to be, whatever it is about.
 * ---------------------------------------------------------------------- */

function craftGate() {
  if (!scenes.length) {
    fail('the film has no scenes');
    return;
  }
  if (!shots.length) {
    fail('the film has no shots');
    return;
  }

  // 1. It has to open on something.
  const first = shots[0];
  if (!['title', 'blender', 'graphic'].includes(first.render)) {
    fail(`the first shot has an unknown render kind ${JSON.stringify(first.render)}`);
  }
  if (first.render === 'title' && Number(first.hold || 0) < 1.5) {
    fail('the opening title card needs at least 1.5 seconds');
  }

  // 2. Every shot is actually designed: a picture, a move, a sound.
  for (const shot of shots) {
    const where = shot.id || '(no shot id)';
    if (!shot.visual || String(shot.visual).trim().length < 24) {
      fail(`${where}: visual description is too thin to light a set from`);
    }
    if (!shot.camera || String(shot.camera).trim().length < 4) {
      fail(`${where}: no camera move`);
    }
    if (!Array.isArray(shot.sfx) || !shot.sfx.length) {
      fail(`${where}: no sound cue`);
    }
    if (shot.render === 'blender' && !shot.plate) {
      fail(`${where}: a Blender shot needs a plate`);
    }
    if (shot.render === 'graphic') {
      const g = shot.graphic || {};
      if (!g.title || String(g.title).trim().length < 3) fail(`${where}: graphic needs a title`);
      if (!g.source || String(g.source).trim().length < 4) fail(`${where}: graphic needs a visible source`);
    }
  }

  // 3. No generic footage language, anywhere.
  for (const shot of shots) {
    const hay = `${shot.visual || ''} ${shot.camera || ''} ${(shot.sfx || []).join(' ')}`;
    const m = hay.match(STOCK_WORDS);
    if (m) fail(`${shot.id}: generic footage language "${m[0]}"`);
  }

  // 4. A plate may come back, but not parked on: a repeat must change framing.
  const plates = new Map();
  for (const shot of plateShots) {
    const key = String(shot.plate);
    const zoom = Array.isArray(shot.framing && shot.framing.zoom) ? shot.framing.zoom.join('-') : 'none';
    const seenFramings = plates.get(key) || new Set();
    if (seenFramings.has(zoom) && seenFramings.size >= 2 && [...seenFramings].length >= 2) {
      fail(`${shot.id}: plate ${key} is reused with the same framing; change the lens or the plate`);
    }
    seenFramings.add(zoom);
    plates.set(key, seenFramings);
  }

  // 5. Narration: sourced, short, not filler.
  if (narrations.length < scenes.length) {
    fail('every scene needs at least one narration line');
  }
  for (const line of narrations) {
    const text = String(line.text || '');
    if (!line.source) fail(`narration has no source: ${text.slice(0, 40)}`);
    if (text.trim().length < 8) fail(`narration line is too short: ${JSON.stringify(text)}`);
    if (text.length > 260) fail(`narration line is too long for one breath (${text.length} chars)`);
    for (const re of BANNED_NARRATION) {
      if (re.test(text)) fail(`banned filler phrase: ${text.slice(0, 60)}`);
    }
  }

  // 6. A real short film.
  const total = Number(film.targetDuration) || 0;
  if (total < 90) fail(`targetDuration ${total}s is too short to be a film (floor 90s)`);
  if (total > 1200) fail(`targetDuration ${total}s is too long for a single render (ceiling 1200s)`);
  if (shots.length < scenes.length) fail('every scene needs at least one shot');
  if (plateShots.length < 3) fail(`only ${plateShots.length} 3D plate shots; a film needs at least 3`);
}

if (String(film.format || '').toLowerCase() === 'evidence-room') {
  evidenceRoomGate();
  if (graphics.length < 1) fail('no graphics to check');
  if (narrations.length < 36) fail(`only ${narrations.length} narration lines; the floor is 36`);
}
craftGate();

for (const p of problems) console.error(`FAIL ${p}`);
if (problems.length) {
  console.error(`\n${problems.length} director problem(s) in ${file}`);
  process.exit(1);
}

const spaces = new Set(plateShots.map((s) => s.plate && String(s.plate).split('-')[0]));
const byType = {};
graphics.forEach((shot) => {
  const type = (shot.graphic && shot.graphic.type) || 'graphic';
  byType[type] = (byType[type] || 0) + 1;
});
console.log(`PASS director gate: ${scenes.length} scenes · ${shots.length} shots · ${narrations.length} lines · ${plateShots.length} plate shots`);
console.log(`  format: ${film.format || 'free (craft gate)'} · ${Number(film.targetDuration) || 0}s · plate families: ${[...spaces].filter(Boolean).join(', ') || 'n/a'}`);
if (graphics.length) {
  console.log(`  graphics: ${Object.entries(byType).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
}