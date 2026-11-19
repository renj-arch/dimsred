#!/usr/bin/env node
/**
 * strip-doubled-heading-numbers.js — a heading should not be numbered twice.
 *
 * The lesson Table-of-Contents pass prepends a running number to every h3. On
 * mains pages whose headings already carried a syllabus number, that produced
 * "21. 4.4 Indo-Islamic Structural Logic" - 409 headings across 11 pages. The
 * contents list still says "4.4 ...", so the heading and its own link disagree.
 *
 * The auto number is removed where the heading already starts with a section
 * number, and the anchor id is left alone so existing links keep working.
 *
 *   node scripts/strip-doubled-heading-numbers.js
 *   node scripts/strip-doubled-heading-numbers.js --check
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
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

// "23. 4.4 Title" -> "4.4 Title", but "4.4 Title" and "23. Title" are untouched.
const DOUBLED = /(<h[1-6][^>]*>)(\s*)(\d+\.)\s+(\d+(?:\.\d+)*)\s+/g;

let fixed = 0;
const stale = [];

for (const file of walk(ROOT, [])) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  if (!/<h[1-6]/.test(html)) continue;

  let here = 0;
  const next = html.replace(DOUBLED, (m, open, space, auto, section) => {
    here++;
    return open + space + section + ' ';
  });
  if (!here) continue;

  fixed += here;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (CHECK) { stale.push(rel + ' (' + here + ')'); continue; }
  fs.writeFileSync(file, next, 'utf8');
}

if (CHECK) {
  if (stale.length) {
    console.error('FAIL ' + fixed + ' heading(s) numbered twice on ' + stale.length + ' page(s)');
    stale.slice(0, 8).forEach((s) => console.error('  ' + s));
    process.exitCode = 1;
  } else {
    console.log('headings: no doubled numbers');
  }
} else {
  console.log('renumbered ' + fixed + ' heading(s)');
}