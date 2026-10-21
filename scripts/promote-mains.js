#!/usr/bin/env node
'use strict';
// Promote one reviewed item from data/mains-fresh.json into the reviewed bank.
//
//   node scripts/promote-mains.js ci-mvdwyl9p
//   node scripts/promote-mains.js --latest
//   node scripts/promote-mains.js --latest --dry-run
//
// The quality gate is a floor, not a substitute for reading. The owner should
// open the card on /mains.html, check the facts and the argument, then run this
// script (or the "Promote a mains item" workflow) to publish it.
const fs = require('fs');
const path = require('path');
const { assess } = require('./lib/mains-quality');

const ROOT = path.join(__dirname, '..');
const BANK = path.join(ROOT, 'data/mains-questions.json');
const FRESH = path.join(ROOT, 'data/mains-fresh.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
}
function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const args = process.argv.slice(2);
const dry = args.indexOf('--dry-run') !== -1;
const want = args.filter(a => a.indexOf('--') !== 0)[0] || '';

if (!want) {
  console.error('usage: node scripts/promote-mains.js <id|--latest> [--dry-run]');
  process.exit(2);
}

const fresh = readJson(FRESH);
const bank = readJson(BANK);
if (!fresh || !Array.isArray(fresh.items)) {
  console.error('data/mains-fresh.json has no items array');
  process.exit(1);
}
if (!bank || !Array.isArray(bank.questions)) {
  console.error('data/mains-questions.json has no questions array');
  process.exit(1);
}

const item = want === '--latest'
  ? fresh.items[fresh.items.length - 1]
  : fresh.items.find(x => x && x.id === want);
if (!item) {
  console.error('No fresh item with id "' + want + '". Recent ids:');
  fresh.items.slice(-10).forEach(x => console.error('  ' + x.id));
  process.exit(1);
}

const qa = assess(item);
console.log('item      ' + item.id + '  (' + item.paper + ', ' + item.marks + ' marks)');
console.log('words     ' + qa.words + ' / target ' + qa.targetWords + '  anchors ' + qa.anchors + '  sections ' + qa.sections);
console.log('score     ' + qa.score + '/100  ' + (qa.ok ? 'PASS' : 'FAIL'));
if (qa.warnings.length) qa.warnings.forEach(w => console.log('warning   ' + w));
if (qa.failures.length) qa.failures.forEach(f => console.log('failure   ' + f));
if (!qa.ok) {
  console.error('\nRefusing to promote: fix the failures or write a stronger answer first.');
  process.exit(1);
}

const signature = norm(item.question);
const duplicate = bank.questions.find(x => norm(x && x.question) === signature);
if (duplicate) {
  console.error('Already in the reviewed bank as ' + duplicate.id);
  process.exit(1);
}

const baseId = 'reviewed-' + String(item.id || Date.now().toString(36)).replace(/[^a-z0-9-]/gi, '');
let id = baseId;
let n = 2;
while (bank.questions.some(x => x && x.id === id)) id = baseId + '-' + (n++);

const promoted = {
  id: id,
  paper: String(item.paper),
  topic: String(item.topic || 'Reviewed AI practice'),
  marks: Number(item.marks),
  difficulty: String(item.difficulty || 'medium'),
  years: Array.isArray(item.years) ? item.years.map(String).slice(0, 6) : [],
  question: String(item.question).trim(),
  answer: (item.answer || []).filter(s => s && (s.h || s.p)).slice(0, 10).map(s => ({
    h: String(s.h || 'Section').slice(0, 120),
    p: String(s.p || '').slice(0, 2000)
  })),
  marksGuide: (item.marksGuide || []).filter(Boolean).map(String).slice(0, 6),
  pitfalls: (item.pitfalls || []).filter(Boolean).map(String).slice(0, 6),
  laws: (item.laws || []).filter(Boolean).map(String).slice(0, 8),
  keywords: (item.keywords || []).filter(Boolean).map(String).slice(0, 8),
  ai: 1,
  origin: 'reviewed-ai',
  model: String(item.model || ''),
  reviewed: true,
  reviewedAt: new Date().toISOString(),
  quality: { score: qa.score, words: qa.words, targetWords: qa.targetWords, anchors: qa.anchors }
};

bank.questions.push(promoted);
bank.meta = bank.meta || {};
bank.meta.updated = new Date().toISOString().slice(0, 10);
bank.meta.scale = 'Reviewed bank. Most answers are hand-authored; a small number are AI-drafted, checked against a quality rubric and approved by the owner before publication. Nothing is published here without review.';

fresh.items = fresh.items.filter(x => x && x.id !== item.id);
fresh.meta = fresh.meta || {};
fresh.meta.updated = new Date().toISOString().slice(0, 10);
fresh.meta.count = fresh.items.length;
fresh.meta.about = "Fresh AI practice questions written by the site's model on its GitHub runners. Unreviewed until the owner promotes an item to data/mains-questions.json; the two files are kept separate on purpose.";

if (dry) {
  console.log('\nDRY RUN — would promote as ' + id + ' and remove it from the fresh pool.');
  process.exit(0);
}
writeJson(BANK, bank);
writeJson(FRESH, fresh);
console.log('\nPromoted ' + item.id + ' -> ' + id + '. The fresh pool now has ' + fresh.items.length + ' item(s).');
