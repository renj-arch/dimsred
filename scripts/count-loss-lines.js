#!/usr/bin/env node
'use strict';
/**
 * count-loss-lines.js — deleted lines that represent a REAL content loss.
 *
 * The course-expand loss-guard refuses to publish a page whose regeneration
 * drops more than 200 lines, because that usually means hand-built sections
 * living only in the committed file would be lost. But a lesson's inline
 * figure block (<!-- course-figure:id --> + <figure class="lesson-figure">…
 * </figure>, ~240 lines of SVG) is NOT in course-data.json: it is injected
 * onto the page by scripts/attach-course-figures.js. So a regeneration that
 * correctly carries a much larger body to the page still measured as a >200
 * line "loss" — the figure alone — and every expansion was reverted. The lane
 * then re-deepened the same lesson forever until it hit the pass cap, while
 * the reader kept seeing the original short page (csat/comprehension grew to
 * 105k words of source behind a 2,922-word page).
 *
 * This counts deleted lines, ignoring any that belong to a figure block, so
 * the guard still fires on a real prose loss but lets a figure-only deletion
 * through (the figure is re-attached afterwards by attach-course-figures.js).
 *
 *   git diff -- <page> | node scripts/count-loss-lines.js
 */
const fs = require('fs');

let text = '';
try { text = fs.readFileSync(0, 'utf8'); } catch (e) { text = ''; }
const lines = text.split('\n');

let inFigure = false;
let deleted = 0;
for (const raw of lines) {
  if (raw.slice(0, 3) === '+++' || raw.slice(0, 3) === '---') continue;
  // Strip a single diff prefix so the markers are recognisable.
  let body = raw;
  if (body[0] === '+' || body[0] === '-' || body[0] === ' ') body = body.slice(1);

  if (!inFigure) {
    if (/<!--\s*course-figure:/.test(body) || /<figure\b[^>]*lesson-figure/.test(body)) {
      inFigure = true;
      continue;
    }
    if (raw[0] === '-') deleted++;
  } else {
    // We are inside a figure block; stop when it closes.
    if (/<\/figure>/.test(body)) inFigure = false;
  }
}
process.stdout.write(String(deleted));
