#!/usr/bin/env node
/**
 * prune-unsupported-solutions.js — drop questions whose own solution says the
 * answer is not among the options.
 *
 * The deploy gate refuses a bank entry when its explanation admits the options
 * do not contain the computed value ("the true value is not an option", "closest
 * option is..."). Those items came from a model and are unanswerable: a reader
 * cannot pick a right answer that is not there. One such item blocks the whole
 * deploy, which is how a single bad question froze the site on 2026-11-16.
 *
 * Removing it is the honest fix. The alternative — rewriting the explanation —
 * would leave a wrong answer keyed as correct.
 *
 *   node scripts/prune-unsupported-solutions.js
 *   node scripts/prune-unsupported-solutions.js --check
 */

'use strict';

const fs = require('fs');
const path = require('path');
const guard = require('./lib/question-solution-guard');

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['question-bank', 'papers-data'];
const CHECK = process.argv.includes('--check');

let removed = 0;
const rows = [];

for (const dir of DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs).filter((x) => x.endsWith('.json'))) {
    const file = path.join(abs, f);
    let doc;
    let raw;
    try { raw = fs.readFileSync(file, 'utf8'); doc = JSON.parse(raw); } catch (e) { continue; }
    if (!doc || !Array.isArray(doc.questions)) continue;

    const keep = [];
    let dropped = 0;
    doc.questions.forEach((q, i) => {
      const why = guard.leakReason(String((q && q.solution) || ''));
      if (!why) { keep.push(q); return; }
      dropped++;
      if (rows.length < 12) {
        rows.push(dir + '/' + f + ' #' + (q.q || q.id || i + 1) + ': ' + why);
      }
    });
    if (!dropped) continue;
    if (CHECK) { removed += dropped; continue; }
    doc.questions = keep;
    // Keep the file's own layout. Writing with a fixed indent rewrote every
    // line of a 6 MB bank - a 130,000-line diff for four deleted questions.
    const indentMatch = /\n( +)"/.exec(raw);
    const indent = indentMatch ? indentMatch[1].length : 1;
    const eol = raw.indexOf('\r\n') !== -1 ? '\r\n' : '\n';
    const out = JSON.stringify(doc, null, indent).replace(/\n/g, eol);
    fs.writeFileSync(file, out + (raw.endsWith('\n') ? eol : ''), 'utf8');
    removed += dropped;
    console.log('  ' + dir + '/' + f + ': removed ' + dropped + ', kept ' + keep.length);
  }
}

rows.forEach((r) => console.log('  - ' + r));
if (CHECK) {
  if (removed) {
    console.error('FAIL ' + removed + ' question(s) still carry an unsupported solution');
    process.exitCode = 1;
  } else {
    console.log('question bank: every solution is supported by its options');
  }
} else {
  console.log('pruned ' + removed + ' unanswerable question(s)');
}