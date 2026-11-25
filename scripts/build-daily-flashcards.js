#!/usr/bin/env node
'use strict';
/**
 * build-daily-flashcards.js — a rotating 20-card deck for flashcards.html.
 *
 * The page used to ship one hard-coded ten-card deck, so every visit showed
 * "Article 368 deals with?" again. This builds a deck from the real question
 * banks and rotates it by date, so the set changes each day.
 *
 *   node scripts/build-daily-flashcards.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BANK_DIR = path.join(ROOT, 'question-bank');
const OUT = path.join(ROOT, 'data', 'flashcards-daily.json');
const COUNT = 20;

const all = [];
for (const f of fs.readdirSync(BANK_DIR).filter((x) => /\.json$/.test(x) && !/-meta\.json$/.test(x))) {
  let bank;
  try { bank = JSON.parse(fs.readFileSync(path.join(BANK_DIR, f), 'utf8')); } catch (e) { continue; }
  const exam = bank.exam || f.replace(/\.json$/, '').toUpperCase();
  for (const q of (bank.questions || [])) {
    const text = String(q.text || '').trim();
    const opts = Array.isArray(q.options) ? q.options : [];
    const ci = opts.findIndex((o) => o && o.correct === true);
    if (!text || text.length < 12 || ci < 0) continue;
    const answer = String(opts[ci].text || '').trim();
    if (!answer) continue;
    all.push({
      q: text,
      a: answer,
      sol: String(q.solution || '').replace(/\s+/g, ' ').trim().slice(0, 400),
      topic: q.section || 'Revision',
      exam: exam
    });
  }
}
// Fallback when the question-bank checkout is absent (some lanes exclude it):
// use the committed course-question bank instead.
if (!all.length) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course-questions.json'), 'utf8'));
    for (const q of (d.questions || [])) {
      const text = String(q.q || '').trim();
      const opts = Array.isArray(q.opts) ? q.opts : [];
      const ci = opts.findIndex((o) => o && o.c === true);
      if (!text || text.length < 12 || ci < 0) continue;
      all.push({ q: text, a: String(opts[ci].t || '').trim(), sol: String(q.sol || '').slice(0, 400), topic: q.subject || 'Revision', exam: q._exam || '' });
    }
  } catch (e) { /* no fallback available */ }
}

// stable order, then rotate by day so the deck advances daily
all.sort((a, b) => (a.q < b.q ? -1 : a.q > b.q ? 1 : 0));
const day = Math.floor(Date.now() / 86400000);
const start = all.length ? (day * COUNT) % all.length : 0;
const cards = [];
for (let i = 0; i < Math.min(COUNT, all.length); i++) cards.push(all[(start + i) % all.length]);

fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString().slice(0, 10), cards }, null, 1) + '\n', 'utf8');
console.log('flashcards-daily: ' + cards.length + ' cards from ' + all.length + ' bank questions (start ' + start + ')');