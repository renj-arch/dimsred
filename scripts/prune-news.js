#!/usr/bin/env node
'use strict';
/**
 * prune-news.js — drop news items older than the 30-day freshness contract.
 *
 * The deploy gate (scripts/lib/feed-validate.js) rejects any snapshot whose
 * item is older than 30 days or in the future. A quiet desk can leave one stale
 * item in data/news.json and freeze every deploy. The news lane runs this right
 * after fetching so the snapshot always satisfies its contract.
 *
 *   node scripts/prune-news.js
 *   node scripts/prune-news.js --dry
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'data', 'news.json');
const DRY = process.argv.includes('--dry');

let data;
try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { console.log('prune-news: no readable news.json'); process.exit(0); }
const now = Date.now();
const oldest = now - 30 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000; // 30 days, 1h margin
const future = now + 24 * 60 * 60 * 1000;

let removed = 0;
for (const sec of (data.sections || [])) {
  if (!Array.isArray(sec.items)) continue;
  const before = sec.items.length;
  sec.items = sec.items.filter((it) => {
    const t = Date.parse(it && it.publishedAt);
    return isFinite(t) && t >= oldest && t <= future;
  });
  removed += before - sec.items.length;
}
if (data.stats) data.stats.items = (data.sections || []).reduce((a, s) => a + ((s.items || []).length), 0);

if (!DRY && removed) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 1) + '\n', 'utf8');
}
console.log('prune-news: removed ' + removed + ' stale/future item(s)' + (DRY ? ' (dry)' : '') + ', items now ' + (data.stats && data.stats.items));