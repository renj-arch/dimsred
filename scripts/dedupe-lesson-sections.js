#!/usr/bin/env node
'use strict';
// Remove byte-identical duplicated lesson sections and rebuild the TOC.
//
// deepen-page passes stacked near-identical trailing blocks ("Advanced
// Problem Types / Multi-Step Problems / Common Traps" repeated 3-4x on
// reasoning pages). The repetition guard only compares NEW addon headings
// to prior addon headings, so identical blocks already committed survived.
// This pass drops a later section only when BOTH its heading and its full
// body text are identical to an earlier section -- never on heading match
// alone, so genuinely different content under a repeated title survives.
//
// It also strips the lesson-toc marker block and the ls-N numbering so the
// TOC pass can rebuild cleanly afterwards.
//
// Run: node scripts/dedupe-lesson-sections.js [course-root ...]

var fs = require('fs');
var path = require('path');
var toc = require('./add-lesson-toc');

var ROOTS = process.argv.slice(2);
if (!ROOTS.length) {
  // every exam dir with a course/ folder plus upsc/course
  ROOTS = fs.readdirSync(path.join(__dirname, '..'), { withFileTypes: true })
    .filter(function (e) { return e.isDirectory() && fs.existsSync(path.join(__dirname, '..', e.name, 'course')); })
    .map(function (e) { return path.join(__dirname, '..', e.name, 'course'); });
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&middot;/g, '-').replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

function normHeading(t) {
  return stripTags(t).replace(/^\d+\.\s*/, '');
}

function processFile(fp) {
  var html = fs.readFileSync(fp, 'utf8');
  if (html.indexOf('<!-- lesson-toc -->') === -1 && html.indexOf('lesson-body') === -1) return 'skip';

  // 1. strip the TOC block we injected and de-number/de-id the h3s we added.
  html = html.replace(/<!-- lesson-toc --><style>[\s\S]*?<\/style><nav class="lesson-toc">[\s\S]*?<\/nav>\s*/g, '');
  html = html.replace(/<h3([^>]*?) id="ls-\d+"([^>]*)>(\d+)\.\s*/g, '<h3$1$2>');

  var lbOpen = html.indexOf('<div class="lesson-body">');
  if (lbOpen === -1) { fs.writeFileSync(fp, html, 'utf8'); return 'toc-only'; }

  // Bound the editable region: lesson-body up to the practice block or the
  // lesson-new script, whichever comes first.
  var bounds = [html.indexOf('Practice Questions', lbOpen), html.indexOf('id="practice-qs"', lbOpen), html.indexOf('<script>', lbOpen)].filter(function (x) { return x > lbOpen; });
  var scopeEnd = bounds.length ? Math.min.apply(null, bounds) : html.length;
  var head = html.slice(0, lbOpen);
  var scope = html.slice(lbOpen, scopeEnd);
  var tail = html.slice(scopeEnd);

  // 2. split scope into h3-led sections; dedupe identical heading+body.
  var h3re = /<h3\b[^>]*>[\s\S]*?<\/h3>/g;
  var marks = [], m;
  while ((m = h3re.exec(scope)) !== null) marks.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  if (marks.length < 2) { fs.writeFileSync(fp, head + scope + tail, 'utf8'); return 'no-sections'; }

  var seen = {};
  var drop = [];
  for (var i = 0; i < marks.length; i++) {
    var s = marks[i];
    var e = i + 1 < marks.length ? marks[i + 1].start : scope.length;
    var heading = normHeading(s.text.replace(/<\/?h3[^>]*>/g, ''));
    var body = stripTags(scope.slice(s.end, e));
    if (!heading || heading === 'learning objectives' || heading === 'key concepts') continue;
    var key = heading + '|' + body.slice(0, 400);
    if (seen[key]) drop.push([s.start, e]);
    else seen[key] = 1;
  }
  if (!drop.length) { fs.writeFileSync(fp, head + scope + tail, 'utf8'); return 'clean'; }

  // 3. remove dropped ranges (back to front).
  drop.sort(function (a, b) { return b[0] - a[0]; });
  for (var d = 0; d < drop.length; d++) scope = scope.slice(0, drop[d][0]) + scope.slice(drop[d][1]);
  fs.writeFileSync(fp, head + scope + tail, 'utf8');
  return 'deduped(' + drop.length + ')';
}

var stats = {};
ROOTS.forEach(function (r) {
  var list = r.endsWith('.html') && fs.existsSync(r) ? [r] : toc.walk(r, []);
  list.forEach(function (f) {
    var res = processFile(f);
    var k = res.split('(')[0];
    stats[k] = (stats[k] || 0) + 1;
  });
});
var total = Object.keys(stats).reduce(function (s, k) { return s + stats[k]; }, 0);
console.log('dedupe-lesson-sections: ' + total + ' pages scanned');
Object.keys(stats).sort().forEach(function (k) { console.log('  ' + k + ': ' + stats[k]); });
