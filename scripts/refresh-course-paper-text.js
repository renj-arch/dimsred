#!/usr/bin/env node
'use strict';
// Refresh the text of course-sourced questions inside existing paper data.
//
// question-bank/*.json is the source of truth for a paper's questions. When the
// course-question importer refreshes those entries (for example to fix a lost
// superscript), papers-data/*.json keeps the old strings until it is rebuilt.
// This script copies the current text, options and solution for each
// source:"course" question by id, then build-papers.js can regenerate the HTML.
//
//   node scripts/refresh-course-paper-text.js
//   node scripts/refresh-course-paper-text.js --dry-run

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var BANK_DIR = path.join(ROOT, 'question-bank');
var DATA_DIR = path.join(ROOT, 'papers-data');
var DRY = process.argv.includes('--dry-run');

if (!fs.existsSync(DATA_DIR)) {
  console.log('No papers-data directory; nothing to refresh.');
  process.exit(0);
}

var banks = {};
var files = fs.readdirSync(DATA_DIR).filter(function (f) { return /\.json$/i.test(f); });
var changedFiles = 0, changedQuestions = 0, missing = 0;

files.forEach(function (file) {
  var p = path.join(DATA_DIR, file);
  var data;
  try { data = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return; }
  var folder = String(data.folder || '').toLowerCase();
  if (!folder) return;
  if (!banks[folder]) {
    var bankPath = path.join(BANK_DIR, folder + '.json');
    banks[folder] = fs.existsSync(bankPath) ? JSON.parse(fs.readFileSync(bankPath, 'utf8')) : null;
  }
  var bank = banks[folder];
  if (!bank || !Array.isArray(bank.questions)) return;
  var byId = {};
  bank.questions.forEach(function (q) { byId[String(q.id)] = q; });

  var changed = 0;
  (data.questions || []).forEach(function (q) {
    if (q.source !== 'course') return;
    var live = byId[String(q.id)];
    if (!live || live.source !== 'course') { missing++; return; }
    if (live.text !== q.text || JSON.stringify(live.options) !== JSON.stringify(q.options) ||
        live.solution !== q.solution) {
      q.text = live.text;
      q.options = live.options;
      q.solution = live.solution;
      changed++;
    }
  });

  if (changed) {
    changedFiles++;
    changedQuestions += changed;
    if (!DRY) fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
});

console.log((DRY ? 'DRY RUN: ' : '') + 'refreshed ' + changedQuestions + ' question(s) in ' + changedFiles +
  ' paper data file(s)' + (missing ? '; ' + missing + ' course question id(s) no longer in a bank' : ''));
