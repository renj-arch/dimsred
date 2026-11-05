#!/usr/bin/env node
'use strict';
/**
 * Import validated AI-invented questions into the exam question banks.
 *
 * The site has two question sources that are actually exam-grade:
 *   1. real questions extracted from the solved papers
 *      (scripts/extract-question-bank.js), and
 *   2. brand-new questions invented + validated by the local model
 *      (scripts/invent-questions.js -> data/invented/questions.json).
 *
 * generate-daily-questions.js is a template engine and is now only the
 * last-resort filler for an empty bank. This script closes the gap on the
 * other side: every accepted invented question is copied into the banks of
 * the general-aptitude exams, so daily papers draw on real/AI material
 * instead of procedural filler.
 *
 * Invented questions are ORIGINAL, not previous-year papers. They are never
 * labelled as PYQs.
 *
 * Usage: node scripts/import-invented-to-banks.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bankDir = path.join(root, 'question-bank');
const inventedPath = path.join(root, 'data', 'invented', 'questions.json');
const DRY = process.argv.indexOf('--dry-run') !== -1;

// Only exams whose syllabus genuinely includes general aptitude/reasoning/
// English. JEE/NEET/GATE are deliberately excluded: a bank/SSC-style aptitude
// item is not a valid JEE/NEET question.
const ELIGIBLE = [
  'cgl', 'rbi', 'upsc', 'ibps-po', 'sbi-clerk',
  'ssc-gd', 'ctet', 'nda', 'cds', 'clat'
];

function matchType(sectionName) {
  const n = String(sectionName || '').toLowerCase();
  if (/quant|math|aptitude|numerical|numeracy/.test(n)) return 'quant';
  if (/reason|intelligence|logical|logic/.test(n)) return 'reasoning';
  if (/english|language|verbal|comprehension/.test(n)) return 'english';
  return null;
}

function normStem(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function valid(q) {
  if (!q || typeof q !== 'object') return false;
  if (!q.stem || !q.solution) return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  if (new Set(q.options.map(o => String(o).toLowerCase())).size !== 4) return false;
  if (!q.answer) return false;
  return q.options.some(o => String(o) === String(q.answer));
}

function main() {
  if (!fs.existsSync(inventedPath)) {
    console.log('No invented pool at ' + inventedPath + ', nothing to import');
    return 0;
  }
  if (!fs.existsSync(bankDir)) {
    console.log('No question-bank directory, nothing to import');
    return 0;
  }

  let pool;
  try {
    pool = JSON.parse(fs.readFileSync(inventedPath, 'utf8'));
  } catch (e) {
    console.error('Could not parse invented pool: ' + e.message);
    return 1;
  }
  const invented = (pool.questions || []).filter(valid);
  if (!invented.length) {
    console.log('Invented pool has no valid questions, nothing to import');
    return 0;
  }

  let totalAdded = 0;
  for (const exam of ELIGIBLE) {
    const bankPath = path.join(bankDir, exam + '.json');
    if (!fs.existsSync(bankPath)) continue;

    let bank;
    try {
      bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
    } catch (e) {
      console.log(exam + ': unreadable bank, skipping');
      continue;
    }
    if (!Array.isArray(bank.questions)) bank.questions = [];
    if (!Array.isArray(bank.sections)) bank.sections = [];

    const byType = {};
    for (const s of bank.sections) {
      const t = matchType(s.name);
      if (t && !byType[t]) byType[t] = s.name;
    }
    if (!Object.keys(byType).length) continue;

    const seen = new Set(bank.questions.map(q => normStem(q.text)));
    let maxId = 0;
    for (const q of bank.questions) if (Number(q.id) > maxId) maxId = Number(q.id);

    let added = 0;
    for (const q of invented) {
      const target = byType[q.section];
      if (!target) continue;
      const key = normStem(q.stem);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      maxId++;
      bank.questions.push({
        id: maxId,
        q: bank.questions.length + 1,
        section: target,
        text: q.stem,
        options: q.options.map((text, i) => ({
          label: String.fromCharCode(65 + i),
          text: String(text),
          correct: String(text) === String(q.answer)
        })),
        solution: q.solution,
        source: 'invented',
        difficulty: q.difficulty,
        seconds: q.seconds,
        topic: q.topic,
        style: q.style
      });
      added++;
    }

    if (added) {
      totalAdded += added;
      if (!DRY) fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2), 'utf8');
      console.log(exam + ': +' + added + ' invented questions (bank ' + bank.questions.length + ')');
    } else {
      console.log(exam + ': no new invented questions');
    }
  }

  console.log((DRY ? '[dry-run] ' : '') + 'Imported ' + totalAdded + ' invented question(s) into exam banks');
  return 0;
}

try {
  process.exit(main());
} catch (e) {
  console.error('import-invented-to-banks error: ' + e.message);
  process.exit(1);
}
