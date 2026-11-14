#!/usr/bin/env node
// Repair: the "Also practice" sibling links in
// jee/chapters/*-important-questions.html were rewritten to /jee/ by the
// selfcheck's old whole-page exam-nav pass ("JEE" in the link text → forced
// to the exam hub). That pass is now scoped to the <nav> container
// (site-agent.js fixExamNavLinks), so this one-time repair restores each
// link to the file the page generators emit (gen-jee-pages.js):
//   - sibling pages: physics/maths/chemistry-important-questions.html
//   - "JEE Full Mock Tests" → ../index.html (the JEE hub, as templated)
// Idempotent: links already pointing at their file are left alone, and any
// link NOT in the clobbered shape (/jee/) is never second-guessed.
'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'jee', 'chapters');
const MAP = {
  'JEE Physics Important Questions': 'physics-important-questions.html',
  'JEE Maths Important Questions': 'maths-important-questions.html',
  'JEE Chemistry Important Questions': 'chemistry-important-questions.html',
  'JEE Full Mock Tests': '../index.html'
};

let filesChanged = 0, linksFixed = 0, skipped = 0;
for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith('-important-questions.html')) continue;
  const p = path.join(DIR, f);
  const orig = fs.readFileSync(p, 'utf8');
  let n = 0;
  const out = orig.replace(/(<a\b[^>]*?href=")([^"]*)("[^>]*>)([\s\S]*?)(<\/a>)/gi,
    function (m, pre, href, mid, inner, post) {
      const text = inner.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const want = MAP[text];
      if (!want) return m;
      if (href === want) return m;
      if (href !== '/jee/' && href !== 'jee/') { skipped++; return m; }
      const target = want === '../index.html' ? path.join(DIR, '..', 'index.html') : path.join(DIR, want);
      if (!fs.existsSync(target)) { skipped++; return m; }
      n++; linksFixed++;
      return pre + want + mid + inner + post;
    });
  if (out !== orig) { fs.writeFileSync(p, out); filesChanged++; }
  if (n) console.log(f + ': fixed ' + n + ' link(s)');
}
console.log('repair-jee-related-links: ' + linksFixed + ' link(s) in ' + filesChanged +
  ' file(s)' + (skipped ? ' — ' + skipped + ' skipped (unexpected shape)' : ''));
