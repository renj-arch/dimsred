#!/usr/bin/env node
/**
 * autopilot.js — choose the next film topic from the slate.
 *
 * Reads data/film-slate.json and picks the next topic to author or render.
 * Output is JSON consumed by film-autopilot.yml:
 *
 *   { "kind": "ready",   "topic": { "id": "...", "title": "..." } }   → dispatch film.yml (render)
 *   { "kind": "research","topic": { "id": "...", "title": "..." } }   → dispatch author.yml (write)
 *   { "kind": "invent",  "topic": { "id": "invent", "title": "..." } } → dispatch author.yml (invent new topic)
 *   { "kind": "cap" }                                                  → daily cap reached
 *
 * Usage:
 *   node scripts/film/autopilot.js --json > out/autopilot/pick.json
 *   node scripts/film/autopilot.js --text
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');
const TOPIC_BANK = path.join(ROOT, 'data', 'films', 'topic-bank.json');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

function flag(name) {
  return process.argv.includes('--' + name);
}

function fail(msg) {
  console.error('autopilot: ' + msg);
  process.exitCode = 1;
}

function readSlate() {
  if (!fs.existsSync(SLATE)) return { topics: [] };
  try { return JSON.parse(fs.readFileSync(SLATE, 'utf8')); } catch (e) { return { topics: [] }; }
}

function readTopicBank() {
  if (!fs.existsSync(TOPIC_BANK)) return { topics: [] };
  try { return JSON.parse(fs.readFileSync(TOPIC_BANK, 'utf8')); } catch (e) { return { topics: [] }; }
}

function main() {
  const json = flag('json');
  const slate = readSlate();
  const topics = Array.isArray(slate.topics) ? slate.topics : [];

  // 1. Find a ready topic (authored, waiting for render)
  const ready = topics.find((t) => t.status === 'ready');
  if (ready) {
    const bank = readTopicBank();
    const t = bank.topics.find((b) => b.id === ready.id);
    const pick = { kind: 'ready', topic: { id: ready.id, title: t ? t.title : ready.id } };
    if (json) console.log(JSON.stringify(pick));
    else console.log('kind=ready film=' + ready.id + ' title=' + pick.topic.title);
    return;
  }

  // 2. Find a research-authored topic (needs authoring pass → render)
  //    A topic with status 'authored' means author.js wrote it; now render.
  const authored = topics.find((t) => t.status === 'authored');
  if (authored) {
    const bank = readTopicBank();
    const t = bank.topics.find((b) => b.id === authored.id);
    const pick = { kind: 'ready', topic: { id: authored.id, title: t ? t.title : authored.id } };
    if (json) console.log(JSON.stringify(pick));
    else console.log('kind=ready film=' + authored.id + ' title=' + pick.topic.title);
    return;
  }

  // 3. Find a topic that needs research (status 'research' or unset)
  const needsResearch = topics.find((t) => t.status === 'research' || t.status === 'new' || !t.status);
  if (needsResearch) {
    const bank = readTopicBank();
    const t = bank.topics.find((b) => b.id === needsResearch.id);
    const pick = { kind: 'research', topic: { id: needsResearch.id, title: t ? t.title : needsResearch.id } };
    if (json) console.log(JSON.stringify(pick));
    else console.log('kind=research film=' + needsResearch.id + ' title=' + pick.topic.title);
    return;
  }

  // 4. Slate is empty or all done — invent a new topic from topic-bank
  const bank = readTopicBank();
  const bankTopics = Array.isArray(bank.topics) ? bank.topics : [];
  const slateIds = new Set(topics.map((t) => t.id));
  const unseeded = bankTopics.find((b) => !slateIds.has(b.id));
  if (unseeded) {
    const pick = { kind: 'invent', topic: { id: unseeded.id, title: unseeded.title } };
    if (json) console.log(JSON.stringify(pick));
    else console.log('kind=invent film=' + unseeded.id + ' title=' + unseeded.title);
    return;
  }

  // 5. Daily cap reached — nothing left to do
  const pick = { kind: 'cap' };
  if (json) console.log(JSON.stringify(pick));
  else console.log('kind=cap');
}

try {
  main();
} catch (err) {
  fail(err.message);
}
