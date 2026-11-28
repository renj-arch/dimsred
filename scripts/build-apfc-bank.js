#!/usr/bin/env node
'use strict';
// Build question-bank/apfc.json for the UPSC APFC (Assistant Provident Fund
// Commissioner) Recruitment Test from the existing reviewed banks.
//
// APFC is a single 2-hour objective paper: 160 questions, 300 marks, -1/3
// negative marking, covering nine syllabus areas. The bank has no APFC file,
// so this script re-homes questions whose section honestly matches an APFC
// area:
//
//   English                        <- cds/nda English
//   General Knowledge              <- cds/nda GK + upsc GS (culture, economy,
//                                    polity, science all live in the GS bucket)
//   Mathematics                    <- cds/nda Mathematics
//   Mental Ability                 <- upsc CSAT (reasoning/data interpretation)
//   Current Affairs                <- upsc Current Affairs
//
// Industrial Relations/Labour Codes and Accountancy/Auditing/Insurance have
// NO honest source in the existing banks -- they are left empty on purpose so
// the model-fill lane (full-paper-lane.js --fill / daily generation) writes
// them, clearly labelled model-generated, instead of GS questions being
// mislabelled as accountancy.
//
// Duplicate stems across source banks are dropped by normalized-text hash.
//
//   node scripts/build-apfc-bank.js

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var BANK_DIR = path.join(ROOT, 'question-bank');
var OUT = path.join(BANK_DIR, 'apfc.json');
var META = path.join(BANK_DIR, 'apfc-meta.json');

// section tag in apfc.json <- source bank files + their section values
var SOURCES = [
  { file: 'upsc.json', map: { 'General Studies': 'General Studies', 'Current Affairs': 'Current Affairs', 'CSAT': 'Mental Ability' } },
  { file: 'cds.json', map: { 'English Language': 'English', 'English': 'English', 'General Knowledge': 'General Knowledge', 'Mathematics': 'Mathematics' } },
  { file: 'nda.json', map: { 'English': 'English', 'General Knowledge': 'General Knowledge', 'Mathematics': 'Mathematics' } }
];

function readBank(name) {
  try {
    var j = JSON.parse(fs.readFileSync(path.join(BANK_DIR, name), 'utf8'));
    return Array.isArray(j) ? j : (j.questions || []);
  } catch (e) { return []; }
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

var seen = {};
var out = [];
var id = 1;
var perSection = {};

SOURCES.forEach(function (src) {
  readBank(src.file).forEach(function (q) {
    var tag = src.map[q.section];
    if (!tag) return;
    var text = q.text || q.q || '';
    var h = norm(text).slice(0, 120);
    if (!h || seen[h]) return;
    seen[h] = 1;
    out.push({
      id: id++,
      q: id - 1,
      section: tag,
      text: text,
      options: q.options,
      solution: q.solution || '',
      sourceExam: src.file.replace('.json', '')
    });
    perSection[tag] = (perSection[tag] || 0) + 1;
  });
});

var bank = {
  exam: 'UPSC APFC (Assistant Provident Fund Commissioner)',
  folder: 'apfc',
  sections: [
    { name: 'English', color: '#a855f7' },
    { name: 'General Knowledge', color: '#60a5fa' },
    { name: 'General Studies', color: '#a78bfa' },
    { name: 'Mathematics', color: '#34d399' },
    { name: 'Mental Ability', color: '#fbbf24' },
    { name: 'Current Affairs', color: '#60a5fa' },
    { name: 'Industrial Relations', color: '#f97316' },
    { name: 'Accountancy', color: '#fb7185' }
  ],
  timerMinutes: 120,
  paperDefaults: {
    titlePrefix: 'UPSC APFC Practice Set',
    pageTitleTemplate: 'UPSC APFC Practice Set {number} — Solved Paper',
    pageDescTemplate: 'Free UPSC APFC practice paper set {number} with answers and explanations.'
  },
  questions: out
};
fs.writeFileSync(OUT, JSON.stringify(bank, null, 1), 'utf8');
if (!fs.existsSync(META)) {
  fs.writeFileSync(META, JSON.stringify({ lastSetNumber: 0, usedIds: [] }, null, 1) + '\n', 'utf8');
}

console.log('apfc bank: ' + out.length + ' questions');
Object.keys(perSection).sort().forEach(function (s) {
  console.log('  ' + s + ': ' + perSection[s]);
});
console.log('empty (model-fill): Industrial Relations, Accountancy');
