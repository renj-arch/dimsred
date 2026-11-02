#!/usr/bin/env node
'use strict';
/**
 * Fail-closed provenance gate for data/papers.json.
 *
 * Rules (any violation = exit 1):
 *  1. Every question that carries an answer MUST have a source label:
 *     'official-pyq' (parsed from an official answer-key PDF by
 *     ingest-official-paper.py) or 'agent-solved' (produced by the site agent
 *     from the official QP, gated by apply-paper-solve.js).
 *  2. source === 'agent-solved' must NEVER have official === true — agent
 *     answers may not wear the green "official paper" badge.
 *  3. A paper with official === true must have source === 'official-pyq'.
 *  4. A paper whose questions carry answers but whose source is not
 *     'official-pyq' must be labelled 'agent-solved'.
 *
 * Usage:
 *   node scripts/check-papers-provenance.js          # audit, exit 1 on violation
 *   node scripts/check-papers-provenance.js --fix    # normalize legacy entries, then audit
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAPERS = path.join(ROOT, 'data', 'papers.json');
const OFFICIAL = 'official-pyq';
const AGENT = 'agent-solved';

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}

/** Normalize legacy papers.json entries so every answered question is honestly
 * labelled. Papers not ingested from a parsed official key are agent-solved. */
function normalizePapers(papers) {
  if (!papers || !Array.isArray(papers.papers)) return papers;
  let changed = 0;
  for (const p of papers.papers) {
    if (p.source !== OFFICIAL) {
      if (p.source !== AGENT) { p.source = AGENT; changed++; }
      if (p.official !== false) { p.official = false; changed++; }
      if (!p.verification) { p.verification = 'agent-solved-unverified'; changed++; }
    }
    for (const q of (p.questions || [])) {
      if (!q || q.answer == null) continue;
      if (p.source === OFFICIAL && q.pyqExam) continue; // official-key ingest
      if (q.source !== AGENT) { q.source = AGENT; changed++; }
      if (q.official !== false && q.source === AGENT) { q.official = false; changed++; }
    }
  }
  return changed;
}

function checkPapers(papers) {
  const violations = [];
  if (!papers || !Array.isArray(papers.papers)) {
    violations.push('papers.json unreadable or missing papers[]');
    return violations;
  }
  for (const p of papers.papers) {
    if (p.official === true && p.source !== OFFICIAL) {
      violations.push('paper ' + p.id + ': official=true but source is not ' + OFFICIAL);
    }
    if (p.source !== OFFICIAL && p.source !== AGENT && (p.questions || []).some(q => q && q.answer != null)) {
      violations.push('paper ' + p.id + ': answered questions but no source label');
    }
    for (const q of (p.questions || [])) {
      if (!q || q.answer == null) continue;
      if (q.source !== OFFICIAL && q.source !== AGENT) {
        violations.push('paper ' + p.id + ' q' + q.n + ': answer without source label');
      }
      if (q.source === AGENT && q.official === true) {
        violations.push('paper ' + p.id + ' q' + q.n + ': agent-solved but official=true');
      }
    }
  }
  return violations;
}

function main() {
  const fix = process.argv.indexOf('--fix') !== -1;
  const papers = readJson(PAPERS, null);
  if (!papers) { console.error('check-papers-provenance: cannot read data/papers.json'); process.exit(1); }
  if (fix) {
    const changed = normalizePapers(papers);
    if (changed) {
      fs.writeFileSync(PAPERS, JSON.stringify(papers, null, 1) + '\n');
      console.log('check-papers-provenance: normalised ' + changed + ' field(s)');
    }
  }
  const violations = checkPapers(papers);
  if (violations.length) {
    for (const v of violations) console.log('VIOLATION ' + v);
    console.log('check-papers-provenance: ' + violations.length + ' violation(s) — FAIL');
    process.exit(1);
  }
  console.log('check-papers-provenance: OK (' + papers.papers.length + ' paper(s), all answered questions labelled)');
}

if (require.main === module) main();

module.exports = { checkPapers, normalizePapers, OFFICIAL, AGENT };
