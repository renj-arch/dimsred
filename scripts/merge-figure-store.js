#!/usr/bin/env node
/**
 * merge-figure-store.js — union-merge data/figures/invented.json.
 *
 * Several expand lanes invent figures from different lessons. A whole-file
 * "-X ours" (or a lane whose checkout predates another lane's figures) replaces
 * the library with its own small copy: on 2026-11-21 the store fell from 254
 * figures to 17, then 21, and the hub dropped from ~194 cards to 61. Figures are
 * keyed by id and are append-only, so merge by id: keep both, preferring the
 * richer/newer entry on a collision.
 *
 *   node scripts/merge-figure-store.js <remote.json> <ours.json> <out.json>
 */
'use strict';

const fs = require('fs');

const [remotePath, oursPath, outPath] = process.argv.slice(2);
if (!remotePath || !oursPath || !outPath) {
  console.error('usage: node scripts/merge-figure-store.js <remote> <ours> <out>');
  process.exit(2);
}

function read(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

const remote = read(remotePath) || { figures: [] };
const ours = read(oursPath) || { figures: [] };
const rl = Array.isArray(remote.figures) ? remote.figures : [];
const ol = Array.isArray(ours.figures) ? ours.figures : [];

const byId = new Map();
for (const f of rl.concat(ol)) {
  if (!f || !f.id) continue;
  const prev = byId.get(f.id);
  if (!prev) { byId.set(f.id, f); continue; }
  const prevItems = Array.isArray(prev.items) ? prev.items.length : 0;
  const nextItems = Array.isArray(f.items) ? f.items.length : 0;
  const prevAt = String(prev.inventedAt || prev.generatedAt || '');
  const nextAt = String(f.inventedAt || f.generatedAt || '');
  if (nextItems > prevItems || (nextItems === prevItems && nextAt > prevAt)) byId.set(f.id, f);
}

const out = {
  generatedAt: [remote.generatedAt, ours.generatedAt].filter(Boolean).sort().pop() || new Date().toISOString(),
  figures: [...byId.values()]
};
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('merge-figure-store: remote ' + rl.length + ' + ours ' + ol.length + ' -> ' + out.figures.length);