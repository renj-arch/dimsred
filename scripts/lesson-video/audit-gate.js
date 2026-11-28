'use strict';
/**
 * audit-gate.js — decide whether a lesson may be narrated into a video.
 *
 * Rule (owner's requirement): a video is made only after the fact audit has
 * passed for the *exact* prose currently on the page.
 *
 * The audit lane now records, per lesson:
 *   data/fact-audit-state.json
 *     lessons[rel] = ISO timestamp of the last audit
 *     hashes[rel]  = prose hash that was certified
 *     clean[rel]   = false when that run left flags that were not resolved
 *
 * A lesson is eligible when it is audited, the certified hash equals the current
 * prose hash, the lesson is not marked unclean, and no flagged quote from the
 * latest report is still present in the prose.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE = path.join(ROOT, 'data', 'fact-audit-state.json');
const REPORT = path.join(ROOT, 'data', 'fact-audit.json');

function load(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }
function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

function status(rel, doc) {
  const st = load(STATE, { lessons: {} });
  const rep = load(REPORT, { problems: [] });
  const auditedAt = (st.lessons && st.lessons[rel]) || '';
  const recordedHash = (st.hashes && st.hashes[rel]) || '';
  const clean = st.clean ? st.clean[rel] : undefined;
  const prose = norm(doc.proseText || '');
  const problems = (rep.problems || []).filter((p) => p && p.file === rel);
  const unresolved = problems.filter((p) => {
    const q = norm(p.quote).slice(0, 90);
    return q && prose.includes(q);
  });

  const reasons = [];
  if (!auditedAt) reasons.push('never fact-audited');
  if (!recordedHash) reasons.push('audit predates hash tracking — re-run the fact audit');
  else if (recordedHash !== doc.proseHash) reasons.push('content changed since the last audit (prose hash mismatch)');
  if (clean === false) reasons.push('last audit left unresolved flags');
  if (unresolved.length) reasons.push(unresolved.length + ' flagged claim(s) still present in the prose');

  return { eligible: reasons.length === 0, auditedAt, recordedHash, clean, unresolved: unresolved.length, reasons };
}

/**
 * Bootstrap / explicit certification: after a human or a fresh audit confirms
 * the lesson is clean, stamp the current prose hash so videos can proceed. This
 * refuses if the lesson was never audited, is marked unclean, or still contains
 * a flagged quote — it cannot paper over a failed audit.
 */
function recordAudit(rel, doc) {
  const st = load(STATE, { lessons: {} });
  if (!st.lessons || !st.lessons[rel]) return { ok: false, reason: 'lesson has not been fact-audited' };
  if (st.clean && st.clean[rel] === false) return { ok: false, reason: 'last audit left unresolved flags' };
  const rep = load(REPORT, { problems: [] });
  const prose = norm(doc.proseText || '');
  const unresolved = (rep.problems || []).filter((p) => p && p.file === rel && prose.includes(norm(p.quote).slice(0, 90)));
  if (unresolved.length) return { ok: false, reason: unresolved.length + ' flagged claim(s) still present' };
  if (!st.hashes || typeof st.hashes !== 'object') st.hashes = {};
  if (!st.clean || typeof st.clean !== 'object') st.clean = {};
  st.hashes[rel] = doc.proseHash;
  st.clean[rel] = true;
  fs.writeFileSync(STATE, JSON.stringify(st, null, 1) + '\n', 'utf8');
  return { ok: true };
}

module.exports = { status, recordAudit, STATE, REPORT };