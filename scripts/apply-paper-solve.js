#!/usr/bin/env node
'use strict';
/**
 * Gate + apply agent-solved paper questions.
 *
 * scripts/solve-paper-agent.py downloads the OFFICIAL question paper and has
 * the local model propose answers. Nothing it produces may reach papers.json
 * unchecked — the same fail-closed rule as the invented quiz. This script
 * runs every candidate through the deterministic revalidator
 * (scripts/lib/invented-quality.js), requires the key to be one of the four
 * options, and only then merges into data/papers.json with an honest label:
 *
 *   source: "agent-solved", official: false,
 *   verification: "agent-solved-unverified"
 *
 * The green "official paper" badge in papers.html is driven by `official`,
 * so agent-solved papers never wear it; they keep officialPdf so the user can
 * check the original paper themselves.
 *
 * Usage:
 *   node scripts/apply-paper-solve.js           # gate + apply + save
 *   node scripts/apply-paper-solve.js --check   # report only, exit 1 on hard failure
 */

const fs = require('fs');
const path = require('path');
const { auditQuestion } = require('./lib/invented-quality');

const ROOT = path.join(__dirname, '..');
const CANDIDATES = path.join(ROOT, 'data', 'paper-solve-candidates.json');
const PAPERS = path.join(ROOT, 'data', 'papers.json');
const CHECK_ONLY = process.argv.indexOf('--check') !== -1;

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}

function main() {
  const cand = readJson(CANDIDATES, null);
  if (!cand || !Array.isArray(cand.candidates)) {
    console.log('apply-paper-solve: no candidates file — nothing to do');
    return;
  }
  const papers = readJson(PAPERS, { papers: [] });
  if (!Array.isArray(papers.papers)) papers.papers = [];

  const byId = new Map(papers.papers.map(p => [p.id, p]));
  const seenQ = new Set();
  for (const p of papers.papers) for (const q of (p.questions || [])) if (q && q.id) seenQ.add(q.id);

  const hard = [];
  const accepted = [];
  const rejected = [];

  for (const c of cand.candidates) {
    const id = 'agentsolve-' + c.paperId + '-' + c.n;
    const item = {
      id: id,
      section: 'reasoning',
      difficulty: 'hard',
      style: 'official PYQ (agent-solved)',
      topic: (c.paper || '') + ' ' + (c.exam || '') + ' ' + (c.year || ''),
      stem: String(c.q || ''),
      options: Array.isArray(c.options) ? c.options.map(String) : [],
      answer: String(c.answer || ''),
      solution: String(c.solution || ''),
      hint: ''
    };
    const problems = [];
    if (seenQ.has(id)) problems.push('already applied');
    if (!/^[ABCD]$/.test(String(c.letter || ''))) problems.push('letter not A-D (X = unanswerable)');
    const audit = auditQuestion(item);
    for (const e of audit.errors) problems.push(e);
    // The key must be exactly one of the option texts.
    if (item.options.length === 4 && !item.options.some(o => o === item.answer)) {
      problems.push('answer text is not among the options');
    }
    if (problems.length) {
      hard.push(id + ': ' + problems.join('; '));
      rejected.push({ id: id, why: problems.join('; ') });
    } else {
      accepted.push(c);
    }
  }

  console.log('apply-paper-solve: ' + cand.candidates.length + ' candidate(s): ' +
    accepted.length + ' accepted, ' + rejected.length + ' rejected');
  for (const h of hard) console.log('REJECT ' + h);

  if (CHECK_ONLY) {
    if (hard.length) process.exit(1);
    return;
  }

  // Merge accepted candidates into papers.json.
  let applied = 0;
  const appliedIds = new Set();
  for (const c of accepted) {
    const id = 'agentsolve-' + c.paperId + '-' + c.n;
    if (seenQ.has(id)) continue;
    let paper = byId.get(c.paperId);
    if (!paper) {
      paper = {
        id: c.paperId,
        exam: c.exam || 'UPSC',
        year: c.year || null,
        paper: c.paper || '',
        type: 'Prelims',
        totalQuestions: 0,
        duration: null,
        marks: null,
        cutoff: null,
        officialPdf: c.qpUrl,
        source: 'agent-solved',
        verification: 'agent-solved-unverified',
        official: false,
        questions: []
      };
      papers.papers.push(paper);
      byId.set(c.paperId, paper);
    }
    paper.questions.push({
      n: c.n,
      id: id,
      q: c.q,
      options: c.options,
      subject: '',
      answer: c.answer,
      letter: c.letter,
      solution: c.solution,
      explain: c.solution,
      pyqExam: c.exam,
      pyqYear: c.year,
      officialPdf: c.qpUrl,
      source: 'agent-solved',
      verification: 'agent-solved-unverified',
      model: c.model,
      solvedAt: c.solvedAt
    });
    seenQ.add(id);
    appliedIds.add(id);
    applied++;
  }
  for (const p of papers.papers) {
    if (!Array.isArray(p.questions)) continue;
    p.questions.sort((a, b) => (a.n || 0) - (b.n || 0));
    p.totalQuestions = Math.max(p.totalQuestions || 0, p.questions.length);
  }

  // Drop applied candidates; keep rejected ones for inspection (they are NOT
  // merged, and the solver's `known` set prevents infinite retries next run
  // only for applied ones — rejected stay visible in the file).
  cand.candidates = cand.candidates.filter(c => !appliedIds.has('agentsolve-' + c.paperId + '-' + c.n));
  cand.rejected = rejected;
  cand.updatedAt = new Date().toISOString();

  fs.writeFileSync(PAPERS, JSON.stringify(papers, null, 1) + '\n');
  fs.writeFileSync(CANDIDATES, JSON.stringify(cand, null, 1) + '\n');
  console.log('apply-paper-solve: applied ' + applied + ' question(s) into data/papers.json; ' +
    cand.candidates.length + ' candidate(s) remain');

  // Hard failures never block the apply of good items, but they must be loud.
  if (hard.length) process.exitCode = 1;
}

main();
