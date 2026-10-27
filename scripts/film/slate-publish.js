#!/usr/bin/env node
/**
 * Mark a film published in the slate.
 *
 * The slate is the autopilot's memory. A run that published a film but left the
 * topic on `storyboard` would author it again next week, so this is the last
 * step of a successful publish, not a note someone remembers to make.
 *
 * Usage:
 *   node scripts/film/slate-publish.js --film bhopal-gas-tragedy \
 *     --release film-bhopal-gas-tragedy-final-42
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SLATE = path.join(ROOT, 'data', 'film-slate.json');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return '';
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : '';
}

function main() {
  const id = arg('film');
  const release = arg('release');
  if (!id) throw new Error('usage: node scripts/film/slate-publish.js --film <id> [--release <tag>]');
  const slate = JSON.parse(fs.readFileSync(SLATE, 'utf8'));
  const topic = (slate.topics || []).find((t) => t.id === id);
  if (!topic) throw new Error(`${id} is not in data/film-slate.json`);
  topic.status = 'published';
  topic.publishedAt = new Date().toISOString().slice(0, 10);
  topic.watch = `watch.html?film=${id}`;
  if (release) topic.release = release;
  slate.updated = topic.publishedAt;
  fs.writeFileSync(SLATE, JSON.stringify(slate, null, 2) + '\n');
  console.log(`[slate] ${id} published${release ? ` (${release})` : ''}`);
}

try {
  main();
} catch (e) {
  console.error(`[slate] FAIL ${e.message}`);
  process.exitCode = 1;
}
