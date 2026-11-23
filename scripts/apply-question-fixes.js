#!/usr/bin/env node
/**
 * apply-question-fixes.js — apply verified question fixes to the served bank.
 *
 * data/question-fixes.json is written by audit-questions.js after an independent
 * verifier confirms each correction. This runs on the final deploy tree so a
 * corrected option, stem or explanation reaches readers even though the lesson
 * source is rebuilt by other lanes.
 *
 *   node scripts/apply-question-fixes.js [root]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || '.');
const fixesPath = path.resolve(__dirname, '..', 'data', 'question-fixes.json');
const bankPath = path.join(root, 'data', 'course-questions.json');

let fixes;
try { fixes = JSON.parse(fs.readFileSync(fixesPath, 'utf8')); } catch (e) { console.log('apply-question-fixes: no fixes file'); process.exit(0); }
if (!Array.isArray(fixes.fixes) || !fixes.fixes.length) { console.log('apply-question-fixes: no fixes'); process.exit(0); }
let bank;
try { bank = JSON.parse(fs.readFileSync(bankPath, 'utf8')); } catch (e) { console.log('apply-question-fixes: no bank'); process.exit(0); }

let applied = 0, already = 0, missing = 0;
for (const f of fixes.fixes) {
  if (!f || !f.q || !f.quote || !f.correction) continue;
  const q = (bank.questions || []).find((x) => x && x.q === f.q);
  if (!q) { missing++; continue; }
  if (f.field === 'stem') {
    if (q.q.indexOf(f.correction) !== -1) { already++; continue; }
    if (q.q.indexOf(f.quote) === -1) { missing++; continue; }
    q.q = q.q.split(f.quote).join(f.correction);
    applied++;
  } else if (f.field === 'option') {
    if (!Array.isArray(q.opts)) { missing++; continue; }
    let hit = false;
    q.opts = q.opts.map((o) => {
      if (String(o).indexOf(f.quote) === -1) return o;
      hit = true;
      const next = String(o).split(f.quote).join(f.correction);
      if (q.a === o) q.a = next; // keep the key pointing at the same option
      return next;
    });
    if (hit) applied++; else missing++;
  } else {
    if (!q.solution) { missing++; continue; }
    if (q.solution.indexOf(f.correction) !== -1) { already++; continue; }
    if (q.solution.indexOf(f.quote) === -1) { missing++; continue; }
    q.solution = q.solution.split(f.quote).join(f.correction);
    applied++;
  }
}
if (applied) fs.writeFileSync(bankPath, JSON.stringify(bank) + '\n', 'utf8');
console.log('apply-question-fixes: ' + applied + ' applied, ' + already + ' already, ' + missing + ' not found');