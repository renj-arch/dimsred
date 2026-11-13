#!/usr/bin/env node
/**
 * audit-bank-keys.js — audit every question-bank/*.json for wrong answer keys
 * and structural defects.
 *
 * Checks:
 *   1. structure  — exactly one correct option, valid 0-3 index, 4 non-empty
 *                   distinct options, stem long enough.
 *   2. key-vs-solution — for numeric sections, extract the solution's final
 *                   computed value and flag when the KEYED option does not
 *                   contain it but another option does. Heuristic: flags for
 *                   review, never auto-fixes.
 *
 * Usage: node scripts/audit-bank-keys.js [--json] [--exam=apfc]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const BANK_DIR = path.resolve(__dirname, '..', 'question-bank');
const NUMERIC_SECTION = /math|quant|arithmetic|physics|chemistry|accountancy|accounting|finance|data.interpretation/i;

function nums(s) {
  return (String(s || '').match(/-?\d+\.?\d*/g) || []).map(Number);
}

function auditQuestion(q) {
  const issues = [];
  const opts = q.options || [];
  const text = q.text || q.q || '';
  if (text.trim().length < 10) issues.push('stem too short');
  // RBI Grade B legitimately uses 5 options; everything else uses 4.
  if (opts.length !== 4 && opts.length !== 5) issues.push('bad option count ' + opts.length);
  else {
    const correct = opts.filter(o => o.correct);
    if (correct.length !== 1) issues.push(correct.length + ' correct options');
    const texts = opts.map(o => String(o.text || '').trim().toLowerCase());
    if (new Set(texts).size !== opts.length) issues.push('duplicate option text');
    if (opts.some(o => !String(o.text || '').trim())) issues.push('empty option');
  }

  // key-vs-solution heuristic (numeric sections only) - review signal only,
  // never a hard failure: text-answer questions legitimately contain numbers
  // in their solutions that do not map onto options.
  if (NUMERIC_SECTION.test(q.section || '') && opts.length >= 4) {
    const correct = opts.find(o => o.correct);
    const sol = q.solution || '';
    const sn = nums(sol);
    if (correct && sn.length >= 2) {
      const final = sn[sn.length - 1];
      const has = v => nums(v).some(x => Math.abs(x - final) < 1e-6);
      const keyedHas = has(correct.text);
      const otherHas = opts.filter(o => !o.correct).some(o => has(o.text));
      if (!keyedHas && otherHas) {
        issues.push('REVIEW key-mismatch? solution ends ' + final + ', keyed "' + correct.text + '"');
      }
    }
  }
  return issues;
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const only = (args.find(a => a.startsWith('--exam=')) || '').split('=')[1];

const report = {};
let totalQ = 0, totalIssues = 0;
for (const f of fs.readdirSync(BANK_DIR).sort()) {
  if (!f.endsWith('.json') || f.endsWith('-meta.json')) continue;
  const key = f.replace('.json', '');
  if (only && key !== only) continue;
  let bank;
  try { bank = JSON.parse(fs.readFileSync(path.join(BANK_DIR, f), 'utf8')); }
  catch (e) { report[key] = { error: 'unparseable: ' + e.message }; continue; }
  const questions = bank.questions || [];
  const flagged = [];
  for (const q of questions) {
    const issues = auditQuestion(q);
    if (issues.length) flagged.push({ id: q.id, section: q.section, issues });
  }
  totalQ += questions.length;
  totalIssues += flagged.length;
  report[key] = { questions: questions.length, flagged: flagged.length, items: flagged.slice(0, 200) };
}

if (asJson) {
  console.log(JSON.stringify(report, null, 1));
} else {
  for (const k of Object.keys(report)) {
    const r = report[k];
    if (r.error) { console.log(k + ': ' + r.error); continue; }
    console.log(k.padEnd(14) + String(r.questions).padStart(6) + ' q, ' + String(r.flagged).padStart(4) + ' flagged');
    for (const it of (r.items || []).slice(0, 12)) {
      console.log('   #' + it.id + ' [' + it.section + '] ' + it.issues.join('; '));
    }
    if (r.flagged > 12) console.log('   ... +' + (r.flagged - 12) + ' more');
  }
  console.log('\nTOTAL ' + totalQ + ' questions, ' + totalIssues + ' flagged');
}

// Hard gate: structural defects only (REVIEW heuristic items never fail).
let hard = 0;
for (const k of Object.keys(report)) {
  for (const it of (report[k].items || [])) {
    if (it.issues.some(i => !i.startsWith('REVIEW'))) hard++;
  }
}
if (hard > 0) {
  console.error('FAIL: ' + hard + ' structural defect(s) in question banks');
  process.exitCode = 1;
}
