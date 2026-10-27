#!/usr/bin/env node
/*
 * Check a storyboard that already exists, without calling the model.
 *
 * The author pass checks these rules while it writes. This script checks the
 * committed file after an editor has touched a line, so a repaired sentence
 * cannot quietly drift off its row.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const filmId = process.argv[2] || process.env.FILM;
if (!filmId) {
  console.error('usage: node scripts/film/audit-storyboard.js <film-id>');
  process.exit(2);
}

const filmFile = path.join(ROOT, 'data', 'films', `${filmId}.json`);
const ledgerFile = path.join(ROOT, 'data', 'films', `${filmId}-ledger.json`);
const film = JSON.parse(fs.readFileSync(filmFile, 'utf8'));
const ledgerRaw = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
const ledger = ledgerRaw.rows || ledgerRaw;
const byId = new Map(ledger.map((row) => [row.id, row]));

function words(text) {
  return (text.match(/[A-Za-z0-9][A-Za-z0-9'’.,%-]*/g) || []).length;
}

function numbers(text) {
  return (text.match(/\d[\d,.]*/g) || []).map((n) => n.replace(/,/g, '').replace(/\.$/, ''));
}

const problems = [];
const seen = new Map();
let lines = 0;

for (const scene of film.scenes || []) {
  for (const [index, line] of (scene.narration || []).entries()) {
    lines++;
    const where = `${scene.id}.${index + 1}`;
    const text = String(line.text || '').trim();
    const quote = String(line.quote || '').trim();
    const row = byId.get(line.ledger);

    if (!text) problems.push(`${where}: empty line`);
    if (!quote) problems.push(`${where}: no quote`);
    if (!row) {
      problems.push(`${where}: ledger row ${line.ledger} does not exist`);
    } else {
      if (row.text !== quote) problems.push(`${where}: quote is not the verbatim text of ${row.id}`);
      if (row.source !== line.source) problems.push(`${where}: source is ${line.source}, row is ${row.source}`);
    }

    const count = words(text);
    if (count < 7 || count > 22) problems.push(`${where}: ${count} words, expected 7-22`);
    if (/\b(you|your|yours)\b/i.test(text)) problems.push(`${where}: second person`);
    if (/\b(reportedly|it is said|some say|many believe)\b/i.test(text)) {
      problems.push(`${where}: hedge`);
    }

    const lineNumbers = numbers(text);
    const rowNumbers = new Set(numbers(quote));
    for (const number of lineNumbers) {
      if (!rowNumbers.has(number)) problems.push(`${where}: ${number} is not in ${line.ledger}`);
    }

    const key = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seen.has(key)) problems.push(`${where}: repeats ${seen.get(key)}`);
    else seen.set(key, where);
  }
}

if (lines < 36) problems.push(`only ${lines} narration lines; a film needs at least 36`);

for (const problem of problems) console.error(`FAIL ${problem}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s) in ${filmId}`);
  process.exit(1);
}
console.log(`PASS ${filmId}: ${film.scenes.length} scenes, ${lines} lines, every number on its row`);
