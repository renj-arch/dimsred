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
 *   - data/invented/quarantine.json is a hard blocklist. A question removed
 *     for a wrong key must not come back through a remote snapshot. If the
 *     manifest exists but cannot be read, the union is refused (exit 2)
 *     rather than published without its safety control.
 *
 * Usage: node scripts/union-invented.js <remote.json> <local.json>
 * Rewrites <local.json> in place when the union actually adds questions.
 */
const fs = require('fs');
const path = require('path');

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

// The manifest lives beside the pool it governs. A missing file is tolerated
// for old checkouts and tests; an unreadable one is not: silently unioning
// without the blocklist would resurrect exactly the questions it exists to
// bury.
function loadQuarantine(poolPath) {
  const manifestPath = path.join(path.dirname(poolPath), 'quarantine.json');
  if (!fs.existsSync(manifestPath)) return { ids: new Set(), path: null };
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    console.error('union-invented: quarantine manifest unreadable (' + e.message + ') — refusing to union');
    process.exit(2);
  }
  if (!manifest || !Array.isArray(manifest.items)) {
    console.error('union-invented: quarantine manifest has no items array — refusing to union');
    process.exit(2);
  }
  const ids = new Set();
  for (const item of manifest.items) {
    const id = String((item && item.id) || '').trim();
    if (id) ids.add(id);
  }
  return { ids: ids, path: manifestPath };
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

const quarantine = loadQuarantine(localPath);
const banned = quarantine.ids;
const isBanned = q => banned.has(String((q && q.id) || ''));
const remoteClean = remote.questions.filter(q => !isBanned(q));
const localClean = local.questions.filter(q => !isBanned(q));
const droppedLocal = local.questions.length - localClean.length;
const droppedRemote = remote.questions.length - remoteClean.length;

const localKeys = new Set(localClean.map(qkey));
const missing = remoteClean.filter(q => !localKeys.has(qkey(q)));
if (!missing.length && !droppedLocal) {
  console.log('union-invented: local already contains all ' + remoteClean.length + ' remote question(s)' +
    (banned.size ? ' (' + banned.size + ' quarantined id(s) blocked)' : ''));
  process.exit(0);
}

// Remote base (its order) + our questions appended: our run's newest items
// stay at the tail, which is what the novelty memory reads.
const seen = new Set();
const merged = [];
for (const q of remoteClean.concat(localClean)) {
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
console.log('union-invented: ' + remoteClean.length + ' remote + ' + localClean.length + ' local -> ' +
  capped.length + ' pooled (+' + missing.length + ' recovered, -' + (droppedLocal + droppedRemote) +
  ' quarantined)');
