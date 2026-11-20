#!/usr/bin/env node
/**
 * missing-data-guard.js — find questions that point at data the reader cannot see.
 *
 * A paper asked: "As per the table, what is the approximate CAGR of Product X
 * from 2019 to 2021?" and printed no table. The explanation then used 100 and
 * 144 - numbers that appear nowhere on the page. The reader cannot answer it and
 * cannot see what was meant.
 *
 * Detected here:
 *   1. a stem that refers to a table/chart/figure with no table, svg or img in
 *      the question itself;
 *   2. the same, where the explanation then uses numbers the stem never shows;
 *   3. a stem that refers to "the passage" with no passage inline.
 *
 * "the passage of the Unlawful Internet Gambling Act" is legislation, not a
 * printed passage, so that phrasing is excluded - a guard that cries wolf on
 * those is a guard people turn off.
 *
 * Scans question-bank / papers-data / data JSON and the question arrays inside
 * generated paper and lesson pages.
 *
 *   node scripts/missing-data-guard.js            # report
 *   node scripts/missing-data-guard.js --check    # exit 1 if any found
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

const REFERS_TO_DATA = /\b(?:as per|according to|from|in|using|refer to|study|shown in|given in)\s+the\s+(?:given\s+|above\s+|following\s+)?(table|chart|graph|figure|diagram|pie|bar chart)\b/i;
const REFERS_TO_PASSAGE = /\b(?:the|this|given|above)\s+passage\b(?!\s+of\b)/i;
const HAS_VISUAL = /<(?:table|svg|img)\b/i;

const numbersIn = (text) => new Set((String(text).match(/\d+(?:\.\d+)?/g) || []));

function inspect(stem, solution) {
  const s = String(stem || '');
  const out = [];

  const m = REFERS_TO_DATA.exec(s);
  if (m && !HAS_VISUAL.test(s)) {
    const stemNums = numbersIn(s);
    const hidden = [...numbersIn(solution)].filter((n) => !stemNums.has(n));
    out.push({
      kind: 'missing-figure',
      detail: 'refers to a ' + m[1] + ' but carries no table or figure' +
        (hidden.length ? '; explanation works from numbers never shown: ' + hidden.slice(0, 5).join(', ') : '')
    });
  }

  if (REFERS_TO_PASSAGE.test(s) && !/^\s*passage\s*:/i.test(s) &&
      !/\bread the following\b|\bpassage\s*:/i.test(s) && s.length < 400) {
    out.push({ kind: 'missing-passage', detail: 'refers to the passage but none is printed in the question' });
  }
  return out;
}

function walk(dir, out, exts) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out, exts);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(full);
  }
  return out;
}

const hits = [];
let scanned = 0;

function checkArray(arr, rel) {
  arr.forEach((q, i) => {
    if (!q || typeof q !== 'object') return;
    const stem = q.text || q.question || q.q || q.stem || '';
    if (!stem) return;
    const sol = q.sol || q.solution || q.explanation || '';
    // A table/chart/image stored beside the question is shown by the renderers
    // (papers, full papers, micro-tests). The guard only looked at the stem
    // string, so it called 70 answerable items missing. Data in hand is not
    // missing; a passage field counts for the same reason.
    const carriesData = !!(q.tableData || q.chartData || q.imageUrl || q.passage || q.passageText);
    inspect(stem, sol).forEach((f) => {
      if (carriesData) return;
      hits.push(rel + ' #' + (q.id || i + 1) + ' [' + f.kind + '] ' + f.detail +
        '\n      "' + String(stem).replace(/\s+/g, ' ').slice(0, 120) + '"');
    });
  });
}

for (const file of walk(ROOT, [], ['.json'])) {
  let doc;
  try { doc = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { continue; }
  scanned++;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  // Never audit the guard's own output: it holds the previous hits.
  if (/missing-data-report\.json$/.test(rel)) continue;
  if (Array.isArray(doc)) checkArray(doc, rel);
  else if (doc && Array.isArray(doc.questions)) checkArray(doc.questions, rel);
  else if (doc && Array.isArray(doc.items)) checkArray(doc.items, rel);
}

// Question arrays embedded in generated pages.
for (const file of walk(ROOT, [], ['.html'])) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const re = /var\s+(?:questions|practiceQs|qs)\s*=\s*(\[[\s\S]*?\]);/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    let arr;
    try { arr = JSON.parse(m[1]); } catch (e) { continue; }
    if (!Array.isArray(arr)) continue;
    scanned++;
    checkArray(arr, rel);
  }
}

console.log('scanned ' + scanned + ' question collection(s)');
hits.slice(0, 30).forEach((h) => console.log('  ' + h));
console.log(hits.length + ' question(s) point at data the reader cannot see');
if (CHECK && hits.length) process.exitCode = 1;