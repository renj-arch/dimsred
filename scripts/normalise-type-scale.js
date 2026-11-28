#!/usr/bin/env node
/**
 * normalise-type-scale.js — stop every element picking its own font size.
 *
 * A reader on the world-history lesson: "the font is varied throughout, no
 * evenness". They were right. One page carried nine inline sizes - .7em, .72em,
 * .75em, .8em, .82em, .85em, .88em, 1.1em, 1.5em - because each block (sidebar
 * label, notice, breadcrumb, contents list, figure caption, banner) was written
 * separately and each chose its own.
 *
 * They collapse onto a five-step scale that keeps the intended hierarchy:
 *
 *   1.5em   page title
 *   1.3em   section heading
 *   1.05em  sub-heading
 *   1em     body
 *   .9em    secondary (captions, contents, notices)
 *   .75em   meta (sidebar labels, breadcrumbs, uppercase tags)
 *
 *   node scripts/normalise-type-scale.js
 *   node scripts/normalise-type-scale.js --check
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

// Only the small, near-duplicate sizes collapse; the heading steps are already
// distinct and are left alone.
const MAP = [
  ['.70em', '.75em'], ['.7em', '.75em'], ['.72em', '.75em'], ['.73em', '.75em'],
  ['.78em', '.9em'], ['.8em', '.9em'], ['.82em', '.9em'], ['.84em', '.9em'],
  ['.85em', '.9em'], ['.86em', '.9em'], ['.88em', '.9em'], ['.89em', '.9em']
];

function walk(dir, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'data') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

let touched = 0;
let replacements = 0;
const stale = [];

for (const file of walk(ROOT, [])) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  if (html.indexOf('font-size') === -1) continue;

  let next = html;
  let here = 0;
  for (const [from, to] of MAP) {
    const re = new RegExp('font-size:\\s*' + from.replace('.', '\\.') + '(?![\\d])', 'g');
    const hits = (next.match(re) || []).length;
    if (!hits) continue;
    next = next.replace(re, 'font-size:' + to);
    here += hits;
  }
  if (!here) continue;

  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (CHECK) { stale.push(rel + ' (' + here + ')'); continue; }
  fs.writeFileSync(file, next, 'utf8');
  touched++;
  replacements += here;
}

if (CHECK) {
  if (stale.length) {
    console.error('FAIL ' + stale.length + ' page(s) still carry off-scale inline sizes');
    stale.slice(0, 6).forEach((s) => console.error('  ' + s));
    process.exitCode = 1;
  } else {
    console.log('type scale: consistent');
  }
} else {
  console.log('normalised ' + replacements + ' inline size(s) across ' + touched + ' page(s)');
}