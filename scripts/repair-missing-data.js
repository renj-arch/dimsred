#!/usr/bin/env node
/**
 * repair-missing-data.js — fix the questions that point at data the reader
 * cannot see, without deleting the backlog blind.
 *
 * The first version of this dropped 124 questions on a stem-only test and
 * reformatted every bank it touched, which is not a repair. It now does two
 * narrow things and nothing else:
 *
 *   1. applies the known rewrites (below), as text, so the file's layout and
 *      every other question stay byte-identical;
 *   2. writes data/missing-data-report.json listing what is still broken, so the
 *      backlog is visible and can be worked through instead of guessed at.
 *
 * The exemplar: "As per the table, what is the approximate CAGR of Product X
 * from 2019 to 2021?" with no table, answered from 100 and 144 - numbers the
 * page never showed. The numbers are in the explanation, so the stem states them
 * now and the question is answerable.
 *
 *   node scripts/repair-missing-data.js
 *   node scripts/repair-missing-data.js --check
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

const REWRITES = [
  {
    from: 'As per the table, what is the approximate compound annual growth rate (CAGR) of Product X from 2019 to 2021?',
    to: 'Product X recorded sales of ₹100 crore in 2019 and ₹144 crore in 2021. What is the approximate compound annual growth rate (CAGR) over this period?'
  }
];

const REFERS_TO_DATA = /\b(?:as per|according to|from|in|using|refer to|study|shown in|given in)\s+the\s+(?:given\s+|above\s+|following\s+)?(table|chart|graph|figure|diagram|pie|bar chart)\b/i;
const REFERS_TO_PASSAGE = /\b(?:the|this|given|above)\s+passage\b(?!\s+of\b)/i;
const HAS_VISUAL = /<(?:table|svg|img)\b/i;

function isBroken(stem) {
  const s = String(stem || '');
  if (REFERS_TO_DATA.test(s) && !HAS_VISUAL.test(s)) return 'missing-figure';
  if (REFERS_TO_PASSAGE.test(s) && !/^\s*passage\s*:/i.test(s) &&
      !/\bread the following\b|\bpassage\s*:/i.test(s) && s.length < 400) return 'missing-passage';
  return '';
}

function walk(dir, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.json')) out.push(full);
  }
  return out;
}

const report = [];
let rewritten = 0;
const rewrittenFiles = new Set();

for (const file of walk(ROOT, [])) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }

  // 1. allowlisted rewrites, as text
  let next = raw;
  for (const r of REWRITES) {
    const variants = [r.from, JSON.stringify(r.from).slice(1, -1)];
    for (const v of variants) {
      if (next.indexOf(v) === -1) continue;
      const replacement = v === r.from ? r.to : JSON.stringify(r.to).slice(1, -1);
      const hits = next.split(v).length - 1;
      next = next.split(v).join(replacement);
      rewritten += hits;
      rewrittenFiles.add(rel);
    }
  }
  if (next !== raw && !CHECK) fs.writeFileSync(file, next, 'utf8');

  // 2. report what is still broken
  let doc;
  try { doc = JSON.parse(next); } catch (e) { continue; }
  const arr = Array.isArray(doc) ? doc : doc && Array.isArray(doc.questions) ? doc.questions : null;
  if (!arr) continue;
  arr.forEach((q, i) => {
    if (!q || typeof q !== 'object') return;
    const stem = q.text || q.question || q.q || q.stem || '';
    const kind = isBroken(stem);
    if (!kind) return;
    report.push({
      file: rel,
      id: q.id || i + 1,
      kind,
      stem: String(stem).replace(/\s+/g, ' ').slice(0, 160)
    });
  });
}

if (!CHECK) {
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'missing-data-report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), total: report.length, questions: report }, null, 1) + '\n', 'utf8');
}

console.log((CHECK ? 'would rewrite ' : 'rewrote ') + rewritten + ' stem(s) in ' + rewrittenFiles.size + ' file(s)');
console.log('backlog: ' + report.length + ' question(s) still point at data the reader cannot see');
if (!CHECK) console.log('report: data/missing-data-report.json');
if (CHECK && rewritten) process.exitCode = 1;