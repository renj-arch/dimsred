#!/usr/bin/env node
/*
 * Authoring strikes.
 *
 * The autopilot used to re-dispatch the same research topic forever: the
 * authoring pass failed, the slate stayed at "research", and the next slot
 * picked the same topic again. Three failures in a row is enough evidence that
 * the corpus or the model cannot carry this film today, so the topic is moved
 * to "blocked" and the chain moves to the next brief.
 *
 *   node scripts/film/author-strike.js --fail bengal-famine-1943 --reason "S04 did not produce five lines"
 *   node scripts/film/author-strike.js --pass bengal-famine-1943
 *
 * --fail increments authoringFails and blocks on the third strike. --pass
 * clears the counter and any block this script itself set. A human can always
 * unblock with claim-topic.js --unblock.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');
const STRIKES = 3;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  if (!next || next.startsWith('--')) return true;
  return next;
}

function readSlate(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function writeSlate(slate, file) {
  slate.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(file, JSON.stringify(slate, null, 2) + '\n');
}

function main() {
  const failId = arg('fail');
  const passId = arg('pass');
  if ((!failId && !passId) || (failId && passId)) {
    throw new Error('usage: node scripts/film/author-strike.js --fail <id> [--reason text] | --pass <id>');
  }
  const slateFile = arg('slate')
    ? path.resolve(process.cwd(), arg('slate'))
    : SLATE;
  const slate = readSlate(slateFile);
  const topics = Array.isArray(slate.topics) ? slate.topics : [];
  const id = failId || passId;
  const topic = topics.find((t) => t.id === id);
  if (!topic) throw new Error(`${id} is not in ${path.relative(ROOT, slateFile)}`);

  if (failId) {
    const strikes = (Number(topic.authoringFails) || 0) + 1;
    topic.authoringFails = strikes;
    topic.lastAuthorFailedAt = new Date().toISOString();
    if (strikes >= STRIKES && !['published', 'rendering'].includes(topic.status)) {
      topic.status = 'blocked';
      topic.blockedAt = new Date().toISOString();
      topic.blockedBy = 'author';
      topic.blockedReason = `authoring failed ${strikes} times: ${arg('reason') || 'the gate did not pass'}`;
      delete topic.renderStartedAt;
      writeSlate(slate, slateFile);
      console.log(`[strike] ${id}: ${strikes}/${STRIKES} - blocked (${topic.blockedReason})`);
      return;
    }
    writeSlate(slate, slateFile);
    console.log(`[strike] ${id}: ${strikes}/${STRIKES} - still in the queue`);
    return;
  }

  const wasBlocked = topic.status === 'blocked' && topic.blockedBy === 'author';
  delete topic.authoringFails;
  delete topic.lastAuthorFailedAt;
  if (wasBlocked) {
    topic.status = fs.existsSync(path.join(ROOT, 'data', 'films', `${id}.json`)) ? 'storyboard' : 'research';
    delete topic.blockedAt;
    delete topic.blockedBy;
    delete topic.blockedReason;
  }
  writeSlate(slate, slateFile);
  console.log(`[strike] ${id}: cleared${wasBlocked ? ` and unblocked (${topic.status})` : ''}`);
}

try {
  main();
} catch (err) {
  console.error(`[strike] FAIL ${err.message}`);
  process.exitCode = 1;
}
