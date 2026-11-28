#!/usr/bin/env node
/**
 * check-generated-state.js — the generated state files must be valid JSON.
 *
 * On 2026-11-21 a ci-push merge fallback ran `git add -A` on a conflicted tree,
 * so scripts/course-addons.json was committed with `<<<<<<< HEAD` markers and
 * stopped parsing. Every later lane then read a broken file, and the addenda
 * quietly shrank from 31.9 MB to 1 MB. The deploy gate never parsed it.
 *
 * This runs in the deploy gate: a corrupted state file stops the publish with a
 * clear message instead of shipping hand-built lesson sections out of the site.
 *
 *   node scripts/check-generated-state.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const FILES = [
  'scripts/course-addons.json',
  'scripts/course-data.json',
  'scripts/course-practice.json',
  'scripts/course-versions.json',
  'scripts/course-depth.json',
  'data/topic-index.json',
  'data/invented/questions.json'
];

let failed = 0;
for (const rel of FILES) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
  const text = fs.readFileSync(p, 'utf8');
  const markers = (text.match(/<<<<<<< |>>>>>>> /g) || []).length;
  if (markers) {
    console.error('FAIL  ' + rel + ': ' + markers + ' merge-conflict marker(s) committed');
    failed++;
    continue;
  }
  try {
    JSON.parse(text);
  } catch (e) {
    console.error('FAIL  ' + rel + ': does not parse — ' + e.message);
    failed++;
  }
}

if (failed) {
  console.error('FAIL ' + failed + ' generated state file(s) are corrupt — a merge committed conflict markers or bad JSON');
  process.exitCode = 1;
} else {
  console.log('PASS  generated state files parse and carry no conflict markers');
}