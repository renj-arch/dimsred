#!/usr/bin/env node
'use strict';
/**
 * Apply data/invented/quarantine.json to the invented question pool.
 *
 * The generator used to append questions with only textual checks. A model can
 * write a confident solution whose arithmetic contradicts its own key, so
 * revalidation is now manual + deterministic: wrong items are recorded with a
 * reason, removed from the pool, and blocked from ever being unioned back in
 * by scripts/union-invented.js.
 *
 * Usage:
 *   node scripts/apply-invented-quarantine.js
 *   node scripts/apply-invented-quarantine.js --check   # report only
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POOL_PATH = path.join(ROOT, 'data', 'invented', 'questions.json');
const MANIFEST_PATH = path.join(ROOT, 'data', 'invented', 'quarantine.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function extractChoices(stem) {
  const out = {};
  for (const line of String(stem || '').split(/\r?\n/)) {
    const m = /^\s*['"]?([A-D])[).:]\s+(.+?)\s*['"]?\s*$/.exec(line);
    if (m && !out[m[1]]) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return out;
}

function keyLetter(answer) {
  const m = /^\s*\[?([A-D])\]?\s*[).:]?/.exec(String(answer || ''));
  return m ? m[1] : '';
}

function applyRepair(q, repair) {
  if (repair.extractOptionsFromStem) {
    const choices = extractChoices(q.stem);
    const letter = keyLetter(q.answer);
    const missing = ['A', 'B', 'C', 'D'].filter(l => !choices[l]);
    if (missing.length) throw new Error(q.id + ': cannot extract choices ' + missing.join(','));
    if (!letter) throw new Error(q.id + ': answer has no A-D letter');
    if (!choices[letter]) throw new Error(q.id + ': key letter ' + letter + ' has no choice text');
    const ordered = ['A', 'B', 'C', 'D'].map(l => choices[l]);
    if (new Set(ordered.map(x => x.toLowerCase())).size !== 4) {
      throw new Error(q.id + ': extracted choices are not distinct');
    }
    q.options = ordered;
    q.answer = choices[letter];
    return;
  }
  Object.keys(repair.set || {}).forEach(function (field) {
    q[field] = repair.set[field];
  });
}

function main() {
  const checkOnly = process.argv.indexOf('--check') !== -1;
  const pool = readJson(POOL_PATH);
  const manifest = readJson(MANIFEST_PATH);
  const questions = Array.isArray(pool.questions) ? pool.questions : [];
  const byId = new Map(questions.map(q => [q.id, q]));

  const quarantineIds = new Set((manifest.items || []).map(x => x.id));
  const repairs = manifest.repairs || [];
  for (const r of repairs) {
    if (quarantineIds.has(r.id)) throw new Error('id is both repaired and quarantined: ' + r.id);
  }

  let repaired = 0;
  for (const repair of repairs) {
    const q = byId.get(repair.id);
    if (!q) {
      console.warn('repair target missing (already applied?): ' + repair.id);
      continue;
    }
    applyRepair(q, repair);
    repaired++;
  }

  // Enrich the record with what the question actually was, so a later reader
  // can audit the decision even after the stem is gone from the live pool.
  const now = new Date().toISOString();
  const enriched = (manifest.items || []).map(function (entry) {
    const q = byId.get(entry.id);
    if (!q) return entry;
    return Object.assign({}, entry, {
      section: q.section || '',
      difficulty: q.difficulty || '',
      topic: q.topic || '',
      stemPreview: String(q.stem || '').replace(/\s+/g, ' ').slice(0, 140),
      model: q.model || '',
      inventedAt: q.inventedAt || ''
    });
  }).sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const kept = questions.filter(q => !quarantineIds.has(q.id));
  const removed = questions.length - kept.length;
  const bySection = {};
  for (const q of kept) bySection[q.section] = (bySection[q.section] || 0) + 1;

  const nextManifest = Object.assign({}, manifest, {
    updatedAt: now.slice(0, 10),
    appliedAt: now,
    counts: { before: questions.length, removed: removed, kept: kept.length, repaired: repaired }
  });
  nextManifest.items = enriched;

  const nextPool = Object.assign({}, pool, {
    curatedAt: now,
    curatedFrom: questions.length,
    questions: kept
  });

  console.log('pool: ' + questions.length + ' -> ' + kept.length + ' (removed ' + removed + ', repaired ' + repaired + ')');
  console.log('kept by section: ' + JSON.stringify(bySection));
  if (checkOnly) return;

  fs.writeFileSync(POOL_PATH, JSON.stringify(nextPool));
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(nextManifest, null, 2) + '\n');
}

main();
