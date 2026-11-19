#!/usr/bin/env node
/**
 * remove-filler-questions.js — strip study-advice questions from generated pages.
 *
 * scripts/gen-course.js used to emit five of these per lesson without a
 * hand-written set:
 *
 *   "What is the best strategy for attempting <lesson> questions in the exam?"
 *   "How can you improve your speed in <lesson> questions?"
 *
 * They ask nothing about the subject. gen-course.js no longer produces them, but
 * the pages already built still carry them, so this removes them from the
 * committed HTML. A practice block with three real questions is better than one
 * with three real questions padded by five study tips.
 *
 *   node scripts/remove-filler-questions.js
 *   node scripts/remove-filler-questions.js --check
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

const FILLER = [
  /^what is the primary concept tested in /i,
  /^which of the following best describes the approach to solve /i,
  /^in .+, which step is most critical for accurate problem-solving\?/i,
  /^how can you improve your speed in .+ questions\?/i,
  /^what is the best strategy for attempting .+ questions in the exam\?/i,
  /^how should you approach .+ questions\?/i
];

function isFiller(text) {
  const t = String(text == null ? '' : text).trim();
  return FILLER.some((re) => re.test(t));
}

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
let removed = 0;
const stale = [];

for (const file of files) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  if (html.indexOf('best strategy for attempting') === -1 &&
      html.indexOf('primary concept tested in') === -1 &&
      html.indexOf('improve your speed in') === -1) continue;

  const block = /var (?:practiceQs|questions) = (\[[\s\S]*?\]);\r?\n/.exec(html);
  if (!block) { continue; }

  let arr;
  try { arr = JSON.parse(block[1]); } catch (e) { continue; }
  if (!Array.isArray(arr)) continue;

  const keep = arr.filter((q) => !isFiller(q && q.text));
  if (keep.length === arr.length) continue;

  removed += arr.length - keep.length;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (CHECK) { stale.push(rel + ' (' + (arr.length - keep.length) + ')'); continue; }

  const next = html.slice(0, block.index) + 'var questions = ' + JSON.stringify(keep) + ';\n' +
    html.slice(block.index + block[0].length);
  fs.writeFileSync(file, next, 'utf8');
  touched++;
  if (touched <= 6) console.log('  ' + rel + ': -' + (arr.length - keep.length) + ' -> ' + keep.length);
}

if (CHECK) {
  if (removed) {
    console.error('FAIL ' + removed + ' filler question(s) remain on ' + stale.length + ' page(s)');
    stale.slice(0, 8).forEach((s) => console.error('  ' + s));
    process.exitCode = 1;
  } else {
    console.log('question sets: no study-advice filler');
  }
} else {
  console.log('removed ' + removed + ' filler question(s) from ' + touched + ' page(s)');
}