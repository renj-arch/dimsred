#!/usr/bin/env node
/**
 * legible-lesson-text.js — raise the reading size on lesson pages.
 *
 * The reader's report: "lesson-social-justice text are so small". It is small,
 * and it is small on every lesson: the template set body paragraphs to .9em and
 * tables to .85em against a 16px base, so prose renders at 14.4px and a table
 * cell at 13.6px. That is fine for a card caption and wrong for a page a
 * candidate reads for twenty minutes.
 *
 * This raises the three rules that carry the reading text, in the pages that
 * already exist as well as in the generators that will write the next ones:
 *
 *   .lesson-body p     .9em  -> 1.02em
 *   .lesson-body ul    .9em  -> 1.02em
 *   .lesson-body table .85em -> .95em
 *
 *   node scripts/legible-lesson-text.js
 *   node scripts/legible-lesson-text.js --check
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

const RULES = [
  ['.lesson-body p{color:var(--text-sec);font-size:.9em',
    '.lesson-body p{color:var(--text-sec);font-size:1.02em'],
  ['.lesson-body ul{padding-left:20px;color:var(--text-sec);font-size:.9em',
    '.lesson-body ul{padding-left:20px;color:var(--text-sec);font-size:1.02em'],
  ['.lesson-body table{width:100%;border-collapse:collapse;margin:14px 0;font-size:.85em',
    '.lesson-body table{width:100%;border-collapse:collapse;margin:14px 0;font-size:.95em'],
  // Hand-built mains pages carry a slightly different table rule.
  ['.comparison-table{width:100%;border-collapse:collapse;margin:12px 0;font-size:.85em',
    '.comparison-table{width:100%;border-collapse:collapse;margin:12px 0;font-size:.95em']
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

const files = walk(ROOT, []);
let touched = 0;
const stale = [];

for (const file of files) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  let next = html;
  let hits = 0;
  for (const [from, to] of RULES) {
    if (next.indexOf(from) === -1) continue;
    hits += next.split(from).length - 1;
    next = next.split(from).join(to);
  }
  if (!hits) continue;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (CHECK) { stale.push(rel); continue; }
  fs.writeFileSync(file, next, 'utf8');
  touched++;
  if (touched <= 5) console.log('  ' + rel);
}

if (CHECK) {
  if (stale.length) {
    console.error('FAIL ' + stale.length + ' lesson page(s) still set body text at .9em');
    stale.slice(0, 6).forEach((s) => console.error('  ' + s));
    process.exitCode = 1;
  } else {
    console.log('lesson text: reading size is legible on every page');
  }
} else {
  console.log('raised reading size on ' + touched + ' page(s)');
}