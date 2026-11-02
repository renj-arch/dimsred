#!/usr/bin/env node
'use strict';
/**
 * Revalidate the whole invented-question pool before it is published.
 *
 * The generator's own checks only prove that a question is well shaped. They
 * cannot prove that the key is the answer to the stem. This CLI runs the
 * deterministic revalidator over every stored item, checks that nothing on the
 * quarantine manifest is still being served, and fails the run on any hard
 * defect. Publishing steps call it as a gate: a pool that fails here is never
 * committed.
 *
 * Usage:
 *   node scripts/revalidate-invented.js
 *   node scripts/revalidate-invented.js data/invented/questions.json
 *   node scripts/revalidate-invented.js --strict   # warnings fail too
 *   node scripts/revalidate-invented.js --json     # machine-readable summary
 */

const fs = require('fs');
const path = require('path');
const { auditQuestion } = require('./lib/invented-quality');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const positional = args.filter(a => !a.startsWith('--'));
const POOL = path.resolve(positional[0] || path.join(ROOT, 'data', 'invented', 'questions.json'));
const MANIFEST = path.resolve(
  (flags.has('--manifest') && positional[1]) ||
  path.join(path.dirname(POOL), 'quarantine.json')
);
const STRICT = flags.has('--strict');
const JSON_OUT = flags.has('--json');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return { __error: e.message };
  }
}

function stemKey(q) {
  return String((q && (q.stem || q.question)) || '')
    .toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
}

function main() {
  const errors = [];
  const warnings = [];
  const pool = readJson(POOL);
  if (pool.__error) {
    console.error('revalidate: cannot read pool ' + POOL + ': ' + pool.__error);
    process.exit(2);
  }
  if (!pool || !Array.isArray(pool.questions)) {
    console.error('revalidate: pool is not {questions: [...]}: ' + POOL);
    process.exit(2);
  }
  if (!pool.questions.length) errors.push('pool is empty');

  // A malformed manifest is a safety-control failure, not a missing optional
  // file: if it exists but cannot be read, do not guess which ids are banned.
  let manifest = { items: [], repairs: [] };
  if (fs.existsSync(MANIFEST)) {
    const m = readJson(MANIFEST);
    if (m.__error) {
      console.error('revalidate: cannot read quarantine manifest ' + MANIFEST + ': ' + m.__error);
      process.exit(2);
    }
    if (!Array.isArray(m.items)) {
      console.error('revalidate: quarantine manifest has no items array: ' + MANIFEST);
      process.exit(2);
    }
    manifest = m;
  }

  const quarantined = new Set((manifest.items || []).map(x => String(x.id || '')).filter(Boolean));
  const repaired = new Set((manifest.repairs || []).map(x => String(x.id || '')).filter(Boolean));
  for (const id of quarantined) {
    if (repaired.has(id)) errors.push('id is both quarantined and repaired: ' + id);
  }

  const seenIds = new Set();
  const seenStems = new Set();
  let ok = 0;
  let failed = 0;
  const failures = [];

  for (const q of pool.questions) {
    const id = String((q && q.id) || '(no id)');
    const result = auditQuestion(q);
    if (quarantined.has(id)) errors.push('quarantined id still in pool: ' + id);
    if (seenIds.has(id)) errors.push('duplicate id: ' + id);
    seenIds.add(id);
    const sk = stemKey(q);
    if (sk) {
      if (seenStems.has(sk)) errors.push('duplicate stem: ' + id);
      seenStems.add(sk);
    }
    if (!result.ok) {
      failed++;
      for (const e of result.errors) errors.push(id + ' (' + (q.section || '?') + '): ' + e);
      failures.push({ id: id, errors: result.errors });
    } else {
      ok++;
    }
    for (const w of result.warnings) warnings.push(id + ': ' + w);
  }

  if (STRICT) errors.push.apply(errors, warnings.map(w => 'warning: ' + w));

  const summary = {
    pool: POOL,
    manifest: fs.existsSync(MANIFEST) ? MANIFEST : null,
    total: pool.questions.length,
    ok: ok,
    failed: failed,
    warnings: warnings.length,
    errors: errors.length,
    failures: failures
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    if (manifest.items && manifest.items.length) {
      console.log('quarantine: ' + manifest.items.length + ' banned id(s), ' + (manifest.repairs || []).length + ' repair(s) recorded');
    }
    for (const e of errors) console.log('FAIL ' + e);
    for (const w of warnings) console.log('WARN ' + w);
    console.log('\n' + ok + ' ok, ' + failed + ' failed, ' + warnings.length + ' warnings, ' + pool.questions.length + ' total');
  }

  if (errors.length) process.exit(1);
}

main();
