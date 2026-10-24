#!/usr/bin/env node
// Repair: card TITLE links in */mock-tests/index.html were clobbered to the
// exam hub (e.g. <div class="m-title"><a href="/cgl/">Mock Test 2026 10 18
// cgl</a></div>) by the selfcheck's old whole-page exam-nav pass — clicking a
// mock's title went to the exam hub instead of the mock. That pass is now
// scoped to the <nav> block (site-agent.js fixExamNavLinks), so this is a
// one-time repair: each card title link goes back to the card's own mock
// file, taken from the card's "Start Test" button, which the pass never
// touched (its text carries no exam token).
// Idempotent: cards already pointing at their own file are left unchanged.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let filesChanged = 0, linksFixed = 0, skipped = 0;

for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(ROOT, entry.name, 'mock-tests', 'index.html');
  if (!fs.existsSync(file)) continue;
  const orig = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  let fixedHere = 0;
  const out = orig.replace(
    /(<div class="m-title"><a href=")([^"]*)(">)([^<]*)(<\/a><\/div>[\s\S]*?<a href=")([^"]+\.html)(" class="btn btn-success">)/g,
    function (m, pre, href, mid, text, between, good, post) {
      if (href === good) return m;
      if (!fs.existsSync(path.join(dir, good))) { skipped++; return m; }
      fixedHere++; linksFixed++;
      return pre + good + mid + text + between + good + post;
    }
  );
  if (out !== orig) { fs.writeFileSync(file, out); filesChanged++; }
  if (fixedHere) console.log(entry.name + ': fixed ' + fixedHere + ' card title link(s)');
}
console.log('repair-mock-index-links: ' + linksFixed + ' link(s) in ' + filesChanged +
  ' file(s) repaired' + (skipped ? ', ' + skipped + ' skipped (missing target)' : ''));
