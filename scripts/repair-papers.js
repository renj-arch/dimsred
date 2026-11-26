#!/usr/bin/env node
'use strict';
/**
 * repair-papers.js — replace invalid questions in papers-data from the bank.
 *
 * Generated papers shipped questions with empty, duplicate or placeholder
 * options ("A) A B) B C) C D) D"). This walks every papers-data file, swaps
 * each bad question for a valid one from the exam's question bank (same
 * section where possible), and drops it only if no replacement exists.
 *
 *   node scripts/repair-papers.js --dry
 *   node scripts/repair-papers.js
 */
const fs = require('fs');
const path = require('path');
const { badQuestion, norm } = require('./lib/paper-quality');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'papers-data');
const DRY = process.argv.includes('--dry');

const bankCache = {};
function poolFor(exam) {
  if (bankCache[exam]) return bankCache[exam];
  const out = [];
  const p = path.join(ROOT, 'question-bank', exam + '.json');
  if (fs.existsSync(p)) {
    try {
      const b = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const q of (b.questions || [])) {
        if (badQuestion(q)) continue;
        out.push({ text: q.text, options: q.options, solution: q.solution || '', section: q.section || '' });
      }
    } catch (e) { /* ignore */ }
  }
  bankCache[exam] = out;
  return out;
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
let papers = 0, removed = 0, replaced = 0, dropped = 0;
const changed = [];

for (const f of files) {
  const p = path.join(DIR, f);
  let data;
  try { data = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { continue; }
  const qs = data.questions || [];
  if (!qs.length) continue;
  const exam = String(data.folder || data.exam || f.split('-')[0] || '').toLowerCase();
  const pool = poolFor(exam);
  const used = new Set(qs.filter((q) => !badQuestion(q)).map((q) => norm(q.text || q.question)));
  let changedHere = false;
  const next = [];
  for (const q of qs) {
    const why = badQuestion(q);
    if (!why) { next.push(q); continue; }
    removed++;
    let pick = null;
    for (const c of pool) {
      if (used.has(norm(c.text))) continue;
      if (q.section && c.section && q.section !== c.section) continue;
      pick = c; break;
    }
    if (!pick) { for (const c of pool) { if (!used.has(norm(c.text))) { pick = c; break; } } }
    if (pick) {
      used.add(norm(pick.text));
      next.push({ id: q.id, q: q.q, section: pick.section || q.section || '', text: pick.text, options: pick.options, solution: pick.solution || '' });
      replaced++;
      changedHere = true;
    } else {
      dropped++;
      changedHere = true;
    }
  }
  if (!changedHere) continue;
  next.forEach((q, i) => { q.q = i + 1; });
  data.questions = next;
  data.totalQuestions = next.length;
  if (data.totalMarks != null) data.totalMarks = next.length;
  papers++;
  changed.push(f + ' (-' + (qs.length - next.length) + ')');
  if (!DRY) fs.writeFileSync(p, JSON.stringify(data, null, 1), 'utf8');
}

console.log('papers repaired: ' + papers + ' | bad questions seen: ' + removed + ' | replaced from bank: ' + replaced + ' | dropped: ' + dropped);
if (changed.length) console.log(changed.slice(0, 15).join('\n'));