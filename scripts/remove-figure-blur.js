#!/usr/bin/env node
/**
 * remove-figure-blur.js — take the displacement filter off every drawn figure.
 *
 * Each figure wrapped its whole drawing in
 *
 *   <filter id="rough-..."><feTurbulence .../><feDisplacementMap scale="1.4"/></filter>
 *
 * to look hand-drawn. On a full-width figure that filter smears strokes into
 * bright streaks and blurs every line - the "laser lines" a reader reported on
 * a lesson page. The shapes are already drawn slightly irregular, so the filter
 * goes: cleaner strokes, no artefacts, and the labels stay sharp.
 *
 *   node scripts/remove-figure-blur.js
 *   node scripts/remove-figure-blur.js --check
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

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
const stale = [];

for (const file of walk(ROOT, [])) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  if (html.indexOf('feDisplacementMap') === -1 && html.indexOf('filter="url(#rough-') === -1) continue;

  let next = html
    .replace(/<filter id="rough-[^"]*"[\s\S]*?<\/filter>/g, '')
    .replace(/\sfilter="url\(#rough-[^"]*\)"/g, '');

  if (next === html) continue;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (CHECK) { stale.push(rel); continue; }
  fs.writeFileSync(file, next, 'utf8');
  touched++;
  if (touched <= 5) console.log('  ' + rel);
}

if (CHECK) {
  if (stale.length) {
    console.error('FAIL ' + stale.length + ' page(s) still blur their figures');
    stale.slice(0, 6).forEach((s) => console.error('  ' + s));
    process.exitCode = 1;
  } else {
    console.log('figures: no displacement filters left');
  }
} else {
  console.log('cleaned ' + touched + ' page(s)');
}