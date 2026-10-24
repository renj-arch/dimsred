#!/usr/bin/env node
'use strict';
/**
 * Union two data/invented/questions.json snapshots (ci-push merge helper).
 *
 * Why this exists: invent runs APPEND to the pool, but ci-push's conflict
 * policy keeps OUR side when two publishes race — the loser's questions
 * vanish silently. Observed 2026-10-18: the 27B lane published 3 questions
 * from a base that predated the 9b run's publish, the merge kept "ours",
 * and the 9b's 9 questions were gone from main (recoverable only from git
 * history). This unions instead: remote first (stable tier order for the
 * novelty memory), then every local question the remote lacks appended.
 *
 * Safety rules:
 *   - A side that is missing or not JSON {questions: []} is treated as
 *     unusable — the local file is left untouched (exit 0). Never throws
 *     a publish away over this helper.
 *   - If the local file already contains every remote question (by id, or
 *     by normalized stem when an id is missing), nothing is written at all
 *     — repeated ci-push retries are no-ops.
 *   - 1200-question cap matches INVENT_MAX_STORE.
 *
 * Usage: node scripts/union-invented.js <remote.json> <local.json>
 * Rewrites <local.json> in place when the union actually adds questions.
 */
const fs = require('fs');

const MAX_STORE = 1200;

function load(p) {
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!j || !Array.isArray(j.questions)) return null;
    return j;
  } catch (e) { return null; }
}

function stemKey(q) {
  return String((q && (q.stem || q.question)) || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
}

// Id when present, else a stem-derived key. Questions are machine-written
// (inv-<stamp>-<n> / agent-<slug>-<stamp>), so ids are stable identifiers;
// the stem fallback exists only for hand-inserted items.
function qkey(q) {
  const id = String((q && q.id) || '');
  return id || ('stem:' + stemKey(q));
}

const remotePath = process.argv[2];
const localPath = process.argv[3];
if (!remotePath || !localPath) {
  console.error('union-invented: usage: node scripts/union-invented.js <remote.json> <local.json>');
  process.exit(2);
}

const remote = load(remotePath);
const local = load(localPath);
if (!local) { console.error('union-invented: local pool unreadable — no union'); process.exit(0); }
if (!remote) { console.error('union-invented: remote pool unreadable — keeping local'); process.exit(0); }

const localKeys = new Set(local.questions.map(qkey));
const missing = remote.questions.filter(q => !localKeys.has(qkey(q)));
if (!missing.length) {
  console.log('union-invented: local already contains all ' + remote.questions.length + ' remote question(s)');
  process.exit(0);
}

// Remote base (its order) + our questions appended: our run's newest items
// stay at the tail, which is what the novelty memory reads.
const seen = new Set();
const merged = [];
for (const q of remote.questions.concat(local.questions)) {
  if (!q || typeof q !== 'object') continue;
  const k = qkey(q);
  if (seen.has(k)) continue;
  seen.add(k);
  merged.push(q);
}
const capped = merged.length > MAX_STORE ? merged.slice(merged.length - MAX_STORE) : merged;

const out = Object.assign({}, remote, {
  generatedAt: new Date().toISOString(),
  model: local.model || remote.model || null,
  version: 1,
  questions: capped
});
fs.writeFileSync(localPath, JSON.stringify(out) + '\n');
console.log('union-invented: ' + remote.questions.length + ' remote + ' + local.questions.length + ' local -> ' +
  capped.length + ' pooled (+' + missing.length + ' recovered)');
