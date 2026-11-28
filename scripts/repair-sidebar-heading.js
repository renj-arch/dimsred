#!/usr/bin/env node
/**
 * repair-sidebar-heading.js — fix the unclosed sidebar heading div.
 *
 * Symptom: a lesson renders as one narrow column of tiny text. Cause: the
 * sidebar's module heading was written twice, with the first opening <div>
 * never closed:
 *
 *   <div style="font-size:.7em;...">   <div style="font-size:.7em;...">Module</div>
 *
 * The unclosed div then wraps the entire page, so everything after it inherits
 * .7em and sits inside the .side column. Collapsing the duplicate restores both
 * the font size and the two-column layout.
 *
 *   node scripts/repair-sidebar-heading.js            # fix in place
 *   node scripts/repair-sidebar-heading.js --check    # exit 1 if any remain
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');
const CLS = 'font-size:.7em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;padding-left:10px';
const DOUBLED = new RegExp(
  '(<div style="' + CLS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '">)(\\s*)(<div style="' +
  CLS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '">)',
  'g'
);

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

const files = walk(ROOT, []);
let fixed = 0;
const bad = [];

for (const file of files) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  if (html.indexOf(CLS) === -1) continue;
  const next = html.replace(DOUBLED, '$3');
  if (next === html) continue;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (CHECK) { bad.push(rel); continue; }
  fs.writeFileSync(file, next, 'utf8');
  fixed++;
  if (fixed <= 6) console.log('  fixed ' + rel);
}

if (CHECK) {
  if (bad.length) {
    console.error('FAIL ' + bad.length + ' page(s) still have the unclosed sidebar heading');
    bad.slice(0, 10).forEach((b) => console.error('  ' + b));
    process.exitCode = 1;
  } else {
    console.log('sidebar headings: all closed');
  }
} else {
  console.log('sidebar heading repair: ' + fixed + ' page(s) fixed');
}