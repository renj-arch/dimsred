#!/usr/bin/env node
// Validate agent-drafted mind-tree proposals against their Wikipedia evidence.
// Every item must carry an exact quote from the supplied extract. This is the
// guard that stops an authoring model from turning a plausible sentence into a
// "fact" the source never said.
//
// Usage:
//   node scripts/validate-mindtree-proposal.js data/mindtree-proposals.json [evidenceDir]
//
// evidenceDir defaults to %TEMP%/opencode/mindtree on Windows, or
// /tmp/opencode/mindtree elsewhere.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const PROPOSAL = process.argv[2] || 'data/mindtree-proposals.json';
const EVIDENCE_DIR = process.argv[3] ||
  path.join(os.tmpdir(), 'opencode', 'mindtree');

const TYPES = new Set(['person', 'event', 'concept', 'org', 'place', 'work']);
const errors = [];
const warnings = [];

function norm(s) {
  return String(s == null ? '' : s)
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    .trim();
}
function low(s) { return norm(s).toLowerCase(); }

function fail(topic, msg) { errors.push(topic + ': ' + msg); }
function warn(topic, msg) { warnings.push(topic + ': ' + msg); }

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main() {
  if (!fs.existsSync(PROPOSAL)) {
    console.error('proposal not found: ' + PROPOSAL);
    process.exit(2);
  }
  const doc = readJson(PROPOSAL);
  const topics = doc.topics || doc;
  const keys = Object.keys(topics);
  if (!keys.length) {
    console.error('no topics in proposal');
    process.exit(2);
  }

  for (const key of keys) {
    const t = topics[key];
    if (!t || typeof t !== 'object') { fail(key, 'topic is not an object'); continue; }
    if (!t.name) fail(key, 'missing name');
    if (!t.branches || !Array.isArray(t.branches)) { fail(key, 'missing branches'); continue; }
    if (t.branches.length < 3 || t.branches.length > 6) {
      fail(key, 'expected 3-6 branches, got ' + t.branches.length);
    }

    const evidenceFile = t._evidenceFile ||
      (t._source && t._source.includes('wikipedia.org') ? null : null);
    if (!evidenceFile) {
      fail(key, 'missing _evidenceFile (relative evidence JSON filename)');
      continue;
    }
    const ep = path.join(EVIDENCE_DIR, evidenceFile);
    if (!fs.existsSync(ep)) { fail(key, 'evidence file not found: ' + ep); continue; }
    const evDoc = readJson(ep);
    if (!evDoc.extract) { fail(key, 'evidence file has no extract'); continue; }
    const extract = low(evDoc.extract);
    if (extract.length < 1000) fail(key, 'evidence extract is too short to ground a tree');

    const seenItems = new Set();
    const seenBranches = new Set();

    t.branches.forEach((br, bi) => {
      const where = 'branch[' + bi + ']';
      if (!br || typeof br !== 'object') { fail(key, where + ' is not an object'); return; }
      if (!norm(br.title)) fail(key, where + ' missing title');
      if (seenBranches.has(low(br.title))) fail(key, where + ' duplicate branch title');
      seenBranches.add(low(br.title));
      if (!norm(br.desc) || norm(br.desc).length < 20) {
        fail(key, where + ' desc must be at least 20 characters');
      }
      if (!Array.isArray(br.items) || br.items.length < 3 || br.items.length > 6) {
        fail(key, where + ' expected 3-6 items, got ' + (Array.isArray(br.items) ? br.items.length : 0));
        return;
      }
      br.items.forEach((it, ii) => {
        const at = where + '.item[' + ii + ']';
        if (!it || typeof it !== 'object') { fail(key, at + ' is not an object'); return; }
        if (!norm(it.name)) fail(key, at + ' missing name');
        if (!TYPES.has(it.type)) fail(key, at + ' bad type: ' + it.type);
        if (!norm(it.rel)) fail(key, at + ' missing rel');
        if (!norm(it.desc) || norm(it.desc).length < 20) {
          fail(key, at + ' desc must be at least 20 characters');
        }
        const quote = norm(it.ev);
        if (quote.length < 20) fail(key, at + ' ev quote must be at least 20 characters');
        if (quote.length > 500) fail(key, at + ' ev quote is too long (>500 chars)');
        if (!extract.includes(low(quote))) {
          fail(key, at + ' ev is not an exact quote from the evidence: ' + quote.slice(0, 120));
        }
        const itemName = low(it.name);
        if (itemName && !low(quote).includes(itemName)) {
          // Allow a distinctive surname/short name (e.g. "Gandhi" for
          // "Mahatma Gandhi") but not a completely unrelated label.
          const toks = itemName.split(/[^a-z0-9]+/).filter(x => x.length >= 4);
          const ok = toks.some(tok => low(quote).includes(tok));
          if (!ok) fail(key, at + ' item name does not appear in its evidence quote');
        }
        if (seenItems.has(itemName)) fail(key, at + ' duplicate item: ' + it.name);
        seenItems.add(itemName);
      });
    });

    if (!t._source || !/wikipedia\.org/.test(t._source)) {
      fail(key, 'missing or non-Wikipedia _source');
    }
    if (t._agent !== true) fail(key, '_agent must be true');
    if (t._verified !== true) fail(key, '_verified must be true');
  }

  for (const w of warnings) console.warn('WARN ' + w);
  if (errors.length) {
    console.error('FAIL ' + errors.length + ' issue(s):');
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }
  console.log('PASS ' + keys.length + ' topic(s), every item quote verified.');
}

main();
