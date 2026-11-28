#!/usr/bin/env node
'use strict';
/**
 * repair-cartoon-labels.js — fix overlapping text in passage-cartoon SVGs.
 *
 * The generation gate only compared label anchor points, so ~1/3 of the 3,900
 * inline cartoons have labels whose rendered text boxes collide (including
 * labels parked inside the dark bottom caption strip). This walks the lessons,
 * repairs each SVG deterministically (nudge apart, evict from the caption strip,
 * drop only if it cannot be separated inside the canvas), and rewrites the page.
 *
 *   node scripts/repair-cartoon-labels.js --lesson upsc/course/... --dry
 *   node scripts/repair-cartoon-labels.js
 */
const fs = require('fs');
const path = require('path');
const { repairSvg, collidingPairs } = require('./lib/cartoon-text');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');
const only = (() => { const i = process.argv.indexOf('--lesson'); return i >= 0 ? process.argv[i + 1] : null; })();

function lessons() {
  if (only) return [path.resolve(ROOT, only)];
  const out = [];
  (function walk(dir) {
    let es = []; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of es) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/^lesson-.*\.html$/.test(e.name)) out.push(p);
    }
  })(path.join(ROOT, 'upsc', 'course'));
  return out.sort();
}

let files = 0, cartoons = 0, repaired = 0, movedTotal = 0, droppedTotal = 0, capsRemoved = 0, remainingTotal = 0, failed = 0;
const FIG = /<figure class="passage-cartoon" data-cartoon="([a-z0-9]+)">([\s\S]*?)<\/figure>/g;
for (const file of lessons()) {
  let html; try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  let changed = false;
  // Use a replace callback so replacements never invalidate regex offsets.
  const next = html.replace(FIG, (whole) => {
    const svg = (whole.match(/<svg[\s\S]*?<\/svg>/i) || [])[0];
    if (!svg) return whole;
    cartoons++;
    if (!collidingPairs(svg, 3).length) return whole;
    const res = repairSvg(svg);
    if (res.remaining > 0) failed++;
    if (res.svg == null || res.svg === svg) return whole;
    // Any change counts — a caption-bar removal fixes a cartoon with moved=0.
    repaired++;
    movedTotal += res.moved;
    droppedTotal += res.dropped;
    capsRemoved += res.captionRemoved ? 1 : 0;
    remainingTotal += res.remaining;
    changed = true;
    return whole.replace(svg, res.svg);
  });
  if (changed && !DRY) { fs.writeFileSync(file, next, 'utf8'); }
  if (changed) files++;
}
console.log((DRY ? 'DRY: ' : '') + 'cartoons seen: ' + cartoons + ' | repaired: ' + repaired +
  ' | labels moved: ' + movedTotal + ' | dropped: ' + droppedTotal +
  ' | caption bars removed: ' + capsRemoved +
  ' | files: ' + files + ' | still-overlapping svgs: ' + failed);