#!/usr/bin/env node
/**
 * resolve-conflict-markers.js — clean committed merge-conflict markers.
 *
 * On 2026-11-21 the ci-push fallback ran `git add -A` on a conflicted tree and
 * pushed it, so 246 tracked generated files landed with `<<<<<<< HEAD` blocks:
 * lesson pages, course indexes, figure SVGs, the addons store. A page with a
 * conflict block is not a page a student should ever see.
 *
 * Each conflict is resolved to one side (ours by default; --theirs for the
 * remote side). Generated files are rebuilt from source anyway, and either
 * side is a complete variant of the same file, so this is safe. Any stray
 * marker line left after the pairwise resolve is dropped.
 *
 *   node scripts/resolve-conflict-markers.js
 *   node scripts/resolve-conflict-markers.js --theirs
 */
'use strict';

const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const THEIRS = process.argv.includes('--theirs');

const files = execSync('git grep -l -F "<<<<<<< " -- "*.html" "*.json" "*.css" "*.svg"', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .trim().split(/\r?\n/).filter(Boolean);

function resolve(text) {
  let out = text;
  // Pairwise conflict, optionally with a diff3 base section.
  const re = /^<<<<<<< [^\n]*\r?\n([\s\S]*?)(?:^\|\|\|\|\|\|\| [^\n]*\r?\n[\s\S]*?)?^=======\r?\n([\s\S]*?)^>>>>>>> [^\n]*\r?\n/gm;
  out = out.replace(re, (m, ours, theirs) => (THEIRS ? theirs : ours));
  // Any unmatched marker line (a truncated or nested block) is not content.
  out = out.split(/\r?\n/).filter((l) =>
    !/^<<<<<<< /.test(l) && !/^>>>>>>> /.test(l) && !/^\|\|\|\|\|\|\| /.test(l) && l !== '======='
  ).join('\n');
  return out;
}

let changed = 0;
for (const rel of files) {
  const p = ROOT + '/' + rel;
  let text;
  try { text = fs.readFileSync(p, 'utf8'); } catch (e) { continue; }
  const fixed = resolve(text);
  if (fixed !== text) {
    fs.writeFileSync(p, fixed, 'utf8');
    changed++;
  }
}
console.log('files with conflict markers: ' + files.length);
console.log('resolved: ' + changed + ' (kept ' + (THEIRS ? 'remote' : 'ours') + ')');