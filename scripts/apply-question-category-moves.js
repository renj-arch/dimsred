#!/usr/bin/env node
'use strict';
/**
 * Apply every approved move in data/category-moves.json to data/questions.
 *
 *   node scripts/apply-question-category-moves.js --dry-run
 *   node scripts/apply-question-category-moves.js
 *   node scripts/apply-question-category-moves.js --id=arp4761-indian-aviation
 *
 * Exit 1 on any invalid declaration, missing category, changed shard, or
 * unmatched evidence. The Question Quality workflow runs this as a gate, so a
 * bad registry stops the publish instead of silently mis-filing questions.
 */

const path = require('path');
const { applyRegistry } = require('./lib/question-category-moves');

const args = process.argv.slice(2);
const dryRun = args.indexOf('--dry-run') !== -1;
const ids = args.filter(a => a.indexOf('--id=') === 0).map(a => a.slice(5));
const rootArg = args.filter(a => a.indexOf('--root=') === 0).map(a => a.slice(7))[0];

try {
  const out = applyRegistry({
    root: rootArg ? path.resolve(rootArg) : path.join(__dirname, '..'),
    dryRun: dryRun,
    ids: ids.length ? ids : null
  });
  if (out.skipped) {
    console.log('category-moves: ' + out.skipped);
  } else {
    for (const item of out.applied) {
      if (item.alreadyApplied) {
        console.log('category-moves: ' + item.id + ' already applied');
        continue;
      }
      console.log('category-moves: ' + item.id + ' moved ' + item.moved +
        ' question(s) ' + item.from + ' -> ' + item.to +
        (item.timeline && item.timeline.patched
          ? ' (timeline ' + item.timeline.file + ')'
          : ' (timeline: ' + ((item.timeline && item.timeline.reason) || 'not patched') + ')') +
        (dryRun ? ' [dry run]' : ''));
    }
  }
} catch (e) {
  console.error('category-moves: ' + e.message);
  process.exit(1);
}
