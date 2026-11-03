#!/usr/bin/env node
/**
 * Record a failed autopilot promotion attempt.
 *
 * The autopilot runs draft -> QC -> final -> publish. A failure must not leave
 * the topic on `rendering` until the lease expires, and it must not retry
 * forever. The first failure returns the topic to the queue; the second blocks
 * it and names the failure. That is the whole retry budget.
 *
 * Usage:
 *   node scripts/film/slate-fail.js --film chauri-chaura-1922 \
 *     --stage draft --reason "independent QC rejected the draft"
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');
const FILMS = path.join(ROOT, 'data', 'films');
const OUT = path.join(ROOT, 'out', 'film', 'slate-failure.json');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return '';
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : '';
}

function main() {
  const id = arg('film');
  const stage = arg('stage') || 'render';
  const reason = arg('reason') || `the ${stage} stage failed`;
  if (!id) throw new Error('usage: node scripts/film/slate-fail.js --film <id> --stage <stage> [--reason <text>]');

  const slateFile = arg('slate') ? path.resolve(process.cwd(), arg('slate')) : SLATE;
  const slate = JSON.parse(fs.readFileSync(slateFile, 'utf8'));
  const topic = (slate.topics || []).find((t) => t.id === id);
  if (!topic) throw new Error(`${id} is not in data/film-slate.json`);

  // A failure after the publish step must never un-publish a live film.
  if (topic.status === 'published') {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify({ film: id, stage, retry: false, reason: 'already published' }, null, 2) + '\n');
    console.log(`[slate] ${id} is already published; failure not recorded`);
    return;
  }

  const failures = (Number(topic.promotionFailures) || 0) + 1;
  topic.promotionFailures = failures;
  topic.lastFailureAt = new Date().toISOString();
  topic.lastFailureStage = stage;
  topic.lastFailureReason = String(reason).slice(0, 300);
  delete topic.renderStartedAt;

  let retry = true;
  if (failures >= 2) {
    topic.status = 'blocked';
    topic.blockedAt = new Date().toISOString();
    topic.blockedBy = 'autopilot';
    topic.blockedReason = `promotion failed twice: ${topic.lastFailureReason}`;
    retry = false;
  } else {
    topic.status = fs.existsSync(path.join(FILMS, `${id}.json`)) ? 'ready' : 'research';
  }

  slate.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(slateFile, JSON.stringify(slate, null, 2) + '\n');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    film: id,
    stage,
    failures,
    retry,
    status: topic.status,
    reason: topic.lastFailureReason
  }, null, 2) + '\n');
  console.log(`[slate] ${id} ${topic.status}; failure ${failures}/2${retry ? '; one retry left' : ''}`);
}

try {
  main();
} catch (e) {
  console.error(`[slate] FAIL ${e.message}`);
  process.exitCode = 1;
}
