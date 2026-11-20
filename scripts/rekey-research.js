#!/usr/bin/env node
/**
 * rekey-research.js — match each stored research method to the question it is for.
 *
 * The store was keyed by paper slug + question NUMBER. Regenerating a paper
 * changed what sat on number 7 while the method stayed put, so 391 of 577 blocks
 * answered a question they had never seen: a Quit India question under a
 * net-vector sum, an English grammar question under a geometry argument.
 *
 * The renderers now refuse to show a method unless its stored question matches
 * the one on the page. This repairs the store itself: every method is matched to
 * the question whose text it was written for, wherever that question now sits in
 * the paper, and methods for questions that no longer exist are dropped - a
 * method is only useful if there is a question to put it under.
 *
 *   node scripts/rekey-research.js            # rewrite the store
 *   node scripts/rekey-research.js --check    # report only
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');
const STORE = path.join(ROOT, 'data', 'research-solutions.json');

const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 200);

const store = JSON.parse(fs.readFileSync(STORE, 'utf8'));
const solutions = store.solutions || [];

// question text -> number, per paper slug
const papers = {};
for (const file of fs.readdirSync(path.join(ROOT, 'papers-data')).filter((f) => f.endsWith('.json'))) {
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(ROOT, 'papers-data', file), 'utf8')); } catch (e) { continue; }
  const slug = d.slug || file.replace(/\.json$/, '');
  papers[slug] = papers[slug] || {};
  for (const q of d.questions || []) papers[slug][norm(q.text)] = q.q;
}

let rekeyed = 0, dropped = 0, kept = 0;
const out = [];

for (const s of solutions) {
  if (!s || !s.paperSlug) { out.push(s); continue; }
  const map = papers[s.paperSlug];
  if (!map) {
    // The paper itself is gone; keep the record but it can never render.
    out.push(s);
    continue;
  }
  const number = map[norm(s.question)];
  if (number === undefined) {
    dropped++;
    continue;
  }
  if (Number(s.questionNumber) !== Number(number)) rekeyed++;
  s.questionNumber = number;
  kept++;
  out.push(s);
}

console.log('solutions: ' + solutions.length);
console.log('matched to a live question: ' + kept + ' (' + rekeyed + ' renumbered)');
console.log('dropped, question no longer in the paper: ' + dropped);

if (!CHECK) {
  store.solutions = out;
  store.updatedAt = new Date().toISOString();
  fs.writeFileSync(STORE, JSON.stringify(store, null, 2) + '\n', 'utf8');
  console.log('store rewritten');
}

if (CHECK && dropped) {
  console.error('FAIL ' + dropped + ' research method(s) point at a question that does not exist');
  process.exitCode = 1;
}