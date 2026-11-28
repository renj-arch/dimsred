'use strict';
// One-shot cleanup for the label leak fixed in deep-rewrite.js: public lesson
// headings carried the internal anchor label ("Deep-1: Taxonomy",
// "Section 2: Federalism"). The id attribute stays; only the visible label goes.
//
// Dry-run by default. Pass --apply to write. Safe to re-run: the stripper is
// idempotent, so a second run reports zero changes.
const fs = require('fs');
const path = require('path');
const { stripHeadingPrefixes } = require('./lib/heading-text');

const ROOT = path.resolve(__dirname, '..');
const COURSE = path.join(ROOT, 'upsc', 'course');
const APPLY = process.argv.indexOf('--apply') !== -1;

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/^lesson-.*\.html$/.test(e.name)) out.push(full);
  }
  return out;
}

function headings(html) {
  const out = [];
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[2].replace(/<[^>]+>/g, '').trim());
  return out;
}

const files = walk(COURSE, []);
let touched = 0;
let labels = 0;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const next = stripHeadingPrefixes(html);
  if (next === html) continue;

  const before = headings(html);
  const after = headings(next);
  const changed = before.filter(function (h, i) { return h !== after[i]; });
  if (!changed.length) continue;

  touched++;
  labels += changed.length;
  console.log(path.relative(ROOT, file).replace(/\\/g, '/') + '  (' + changed.length + ')');
  for (const h of changed.slice(0, 3)) console.log('    - ' + h.slice(0, 90));

  if (APPLY) fs.writeFileSync(file, next);
}

console.log('\n' + (APPLY ? 'applied' : 'dry run') + ': ' + labels + ' heading label(s) in ' + touched + ' lesson(s) of ' + files.length + ' scanned');
if (!APPLY && labels) console.log('re-run with --apply to write');
