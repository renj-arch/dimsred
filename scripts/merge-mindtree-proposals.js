#!/usr/bin/env node
// Surgically merge verified mind-tree proposals into data/topic-layers.json.
//
// Why this exists: the data file is 4.4 MB and byte-formatting matters. Parsing
// and rewriting the whole document would churn every entry. This script finds the
// exact top-level block, replaces only that block, and leaves every other byte
// untouched. It validates the result before swapping the file in.
//
// Usage:
//   node scripts/merge-mindtree-proposals.js [proposal] [layers]
//
// Safety:
//   - only entries with _agent:true and _verified:true are merged
//   - every other top-level key must be byte-for-byte equivalent after parsing
//   - the new file must parse as JSON and the target entries must deep-equal the proposals

'use strict';

const fs = require('fs');
const path = require('path');

const PROPOSAL = process.argv[2] || 'data/mindtree-proposals.json';
const LAYERS = process.argv[3] || 'data/topic-layers.json';

function findTopLevelBlock(raw, key) {
  const marker = '\n "' + key + '": {';
  const at = raw.indexOf(marker);
  if (at < 0) throw new Error('top-level key not found: ' + key);
  const start = raw.indexOf('{', at);
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { start, end: i + 1 };
    }
  }
  throw new Error('unbalanced block for ' + key);
}

function main() {
  const proposals = JSON.parse(fs.readFileSync(PROPOSAL, 'utf8'));
  const topics = proposals.topics || proposals;
  const raw = fs.readFileSync(LAYERS, 'utf8');
  const before = JSON.parse(raw);

  const targets = Object.keys(topics).filter(k => {
    const t = topics[k];
    return t && t._agent === true && t._verified === true;
  });
  if (!targets.length) {
    console.log('nothing to merge: no _agent/_verified entries');
    return;
  }

  let out = raw;
  const newline = raw.includes('\r\n') ? '\r\n' : '\n';
  for (const key of targets) {
    const block = findTopLevelBlock(out, key);
    const entry = topics[key];
    const pretty = JSON.stringify(entry, null, 1).replace(/\n/g, newline + ' ');
    out = out.slice(0, block.start) + pretty + out.slice(block.end);
  }

  const after = JSON.parse(out);
  const beforeKeys = Object.keys(before);
  const afterKeys = Object.keys(after);
  if (beforeKeys.length !== afterKeys.length || beforeKeys.some((k, i) => k !== afterKeys[i])) {
    throw new Error('top-level key set/order changed');
  }
  for (const k of beforeKeys) {
    if (targets.includes(k)) continue;
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      throw new Error('untouched entry changed: ' + k);
    }
  }
  for (const k of targets) {
    if (JSON.stringify(after[k]) !== JSON.stringify(topics[k])) {
      throw new Error('merged entry does not match proposal: ' + k);
    }
  }

  const tmp = LAYERS + '.tmp-mindtree';
  fs.writeFileSync(tmp, out, 'utf8');
  fs.renameSync(tmp, LAYERS);

  console.log('merged ' + targets.length + ' topic(s) into ' + LAYERS);
  for (const k of targets) {
    const t = topics[k];
    console.log('  ' + k + ': ' + t.branches.length + ' branches, ' +
      t.branches.reduce((a, b) => a + (b.items || []).length, 0) + ' items');
  }
  console.log('byte delta: ' + (out.length - raw.length));
}

try { main(); } catch (e) {
  console.error('MERGE FAILED: ' + e.message);
  process.exit(1);
}
