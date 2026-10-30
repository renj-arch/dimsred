#!/usr/bin/env node
/*
 * Render leases for the film slate.
 *
 * The autopilot used to run once a day, so a topic could sit at "ready" for
 * hours without anybody else touching it. Running several slots a day makes
 * that unsafe: a slow authoring pass plus a three-hour render can overlap the
 * next slot, and two runners would render the same film. This script is the
 * smallest lock that fixes it, and the slate stays the single source of truth.
 *
 *   node scripts/film/claim-topic.js --reap
 *   node scripts/film/claim-topic.js --claim salt-march
 *   node scripts/film/claim-topic.js --release salt-march
 *   node scripts/film/claim-topic.js --block salt-march --reason "QC rejected the master"
 *   node scripts/film/claim-topic.js --unblock salt-march
 *
 * --block is the circuit breaker for the repair lane. A blocked topic is not
 * ready and cannot be claimed, so the autopilot stops spending runners on a
 * failure that needs a human or a creative fix. --unblock returns it to the
 * queue after the fix is committed.
 *
 * --reap returns a lease older than the render timeout to the queue. film.yml
 * has a six-hour job cap, so a seven-hour lease cannot belong to a live run.
 * Exit codes: 0 changed or nothing to do, 2 the lease could not be taken.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');
const FILMS = path.join(ROOT, 'data', 'films');
const LEASE_HOURS = 7;

function readSlate(file) {
  return JSON.parse(fs.readFileSync(file || SLATE, 'utf8').replace(/^\uFEFF/, ''));
}

function writeSlate(slate, file) {
  slate.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(file || SLATE, JSON.stringify(slate, null, 2) + '\n');
}

function filmExists(id) {
  return fs.existsSync(path.join(FILMS, `${id}.json`));
}

function reapedStatus(topic) {
  return filmExists(topic.id) ? 'ready' : 'research';
}

function main() {
  const argv = process.argv.slice(2);
  const at = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : null;
  };
  const slateFile = at('--slate') ? path.resolve(process.cwd(), at('--slate')) : SLATE;
  const slate = readSlate(slateFile);
  const topics = Array.isArray(slate.topics) ? slate.topics : [];

  if (argv.includes('--reap')) {
    const cutoff = Date.now() - LEASE_HOURS * 3600 * 1000;
    const stale = topics.filter((topic) => {
      if (topic.status !== 'rendering') return false;
      const started = Date.parse(topic.renderStartedAt || '');
      return !Number.isFinite(started) || started < cutoff;
    });
    if (!stale.length) {
      process.stdout.write(`no stale leases (${LEASE_HOURS}h)\n`);
      return;
    }
    for (const topic of stale) {
      const next = reapedStatus(topic);
      topic.status = next;
      topic.renderAttempts = (Number(topic.renderAttempts) || 0);
      topic.lastRenderFailedAt = topic.renderStartedAt || null;
      delete topic.renderStartedAt;
      process.stdout.write(`reaped ${topic.id} (${next})\n`);
    }
    writeSlate(slate, slateFile);
    return;
  }

  const claimId = at('--claim');
  if (claimId) {
    const topic = topics.find((t) => t.id === claimId);
    if (!topic) {
      process.stderr.write(`claim failed: ${claimId} is not on the slate\n`);
      process.exitCode = 2;
      return;
    }
    if (topic.status === 'rendering') {
      process.stderr.write(`claim failed: ${claimId} is already rendering\n`);
      process.exitCode = 2;
      return;
    }
    if (topic.status !== 'ready') {
      process.stderr.write(`claim failed: ${claimId} is ${topic.status}, not ready\n`);
      process.exitCode = 2;
      return;
    }
    topic.status = 'rendering';
    topic.renderStartedAt = new Date().toISOString();
    topic.renderAttempts = (Number(topic.renderAttempts) || 0) + 1;
    writeSlate(slate, slateFile);
    process.stdout.write(`claimed ${claimId}\n`);
    return;
  }

  const releaseId = at('--release');
  if (releaseId) {
    const topic = topics.find((t) => t.id === releaseId);
    if (!topic) {
      process.stderr.write(`release failed: ${releaseId} is not on the slate\n`);
      process.exitCode = 2;
      return;
    }
    topic.status = reapedStatus(topic);
    delete topic.renderStartedAt;
    delete topic.blockedAt;
    delete topic.blockedReason;
    writeSlate(slate, slateFile);
    process.stdout.write(`released ${releaseId} (${topic.status})\n`);
    return;
  }

  const blockId = at('--block');
  if (blockId) {
    const topic = topics.find((t) => t.id === blockId);
    if (!topic) {
      process.stderr.write(`block failed: ${blockId} is not on the slate\n`);
      process.exitCode = 2;
      return;
    }
    topic.status = 'blocked';
    topic.blockedAt = new Date().toISOString();
    topic.blockedReason = at('--reason') || 'the repair lane stopped';
    delete topic.renderStartedAt;
    writeSlate(slate, slateFile);
    process.stdout.write(`blocked ${blockId}\n`);
    return;
  }

  const unblockId = at('--unblock');
  if (unblockId) {
    const topic = topics.find((t) => t.id === unblockId);
    if (!topic) {
      process.stderr.write(`unblock failed: ${unblockId} is not on the slate\n`);
      process.exitCode = 2;
      return;
    }
    topic.status = reapedStatus(topic);
    delete topic.blockedAt;
    delete topic.blockedReason;
    delete topic.renderStartedAt;
    writeSlate(slate, slateFile);
    process.stdout.write(`unblocked ${unblockId} (${topic.status})\n`);
    return;
  }

  process.stderr.write('usage: --reap | --claim <id> | --release <id> | --block <id> [--reason text] | --unblock <id>\n');
  process.exitCode = 2;
}

main();
