#!/usr/bin/env node
'use strict';
// Give every generated lesson page the crafted-course feel of the hand-built
// GS papers: a Contents block after "Key Concepts", numbered section headings
// and anchor ids, all derived deterministically from the <h3> sections the
// lesson already has. No model calls, idempotent (skips pages that already
// carry the marker), and safe on hand-built pages (they already have their
// own TOC and are skipped by the marker/heuristic below).
//
// Run: node scripts/add-lesson-toc.js [course-root]
// Default root: upsc/course

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'upsc', 'course'));
var MARK = '<!-- lesson-toc -->';
var BOILERPLATE = {
  'learning objectives': 1,
  'key concepts': 1,
  'common traps': 1,
  'memory tricks': 1,
  'practice questions': 1,
  'solved examples': 1,
  'example': 1,
  'contents': 1
};

function walk(dir, out) {
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '-').replace(/\s+/g, ' ').trim();
}

var TOC_CSS = '<style>.lesson-toc{background:var(--card2,#111);border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:14px 18px;margin:14px 0}.lesson-toc .t{font-weight:700;font-size:.8em;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted,#71717a);margin-bottom:8px}.lesson-toc ol{margin:0;padding-left:20px}.lesson-toc li{font-size:.88em;line-height:1.9}.lesson-toc a{color:var(--purple,#a78bfa);text-decoration:none}.lesson-toc a:hover{text-decoration:underline}</style>';

function processFile(fp) {
  var html = fs.readFileSync(fp, 'utf8');
  if (html.indexOf(MARK) !== -1) return 'skip-marker';
  var lbOpen = html.indexOf('<div class="lesson-body">');
  if (lbOpen === -1) return 'no-body';
  // Scope to lesson-body only.
  var end = html.indexOf('Practice Questions', lbOpen);
  var scope = end === -1 ? html.slice(lbOpen) : html.slice(lbOpen, end);

  // Collect content h3s (skip boilerplate), in order.
  var sections = [];
  var re = /<h3([^>]*)>([\s\S]*?)<\/h3>/g, m;
  while ((m = re.exec(scope)) !== null) {
    var text = stripTags(m[2]);
    var key = text.toLowerCase().replace(/[^a-z ]/g, '').trim();
    if (BOILERPLATE[key]) continue;
    if (text.length < 3 || text.length > 90) continue;
    sections.push({ attrs: m[1], inner: m[2], text: text });
  }
  if (sections.length < 4) return 'too-few-sections(' + sections.length + ')';

  // Number + id the headings. Replace in the full html, in order.
  var idx = 0;
  var out = html.replace(/<h3([^>]*)>([\s\S]*?)<\/h3>/g, function (whole, attrs, inner) {
    var text = stripTags(inner);
    var key = text.toLowerCase().replace(/[^a-z ]/g, '').trim();
    if (BOILERPLATE[key] || text.length < 3 || text.length > 90) return whole;
    idx++;
    var hasId = /\bid\s*=/.test(attrs);
    var idAttr = hasId ? '' : ' id="ls-' + idx + '"';
    return '<h3' + attrs + idAttr + '>' + idx + '. ' + inner + '</h3>';
  });
  if (idx !== sections.length) return 'count-mismatch';

  // Build TOC and insert right after the "Key Concepts" h3 (or before first
  // content h3 if that heading is absent).
  var toc = MARK + TOC_CSS +
    '<nav class="lesson-toc"><div class="t">Contents</div><ol>' +
    sections.map(function (s, i) {
      return '<li><a href="#ls-' + (i + 1) + '">' + s.text.replace(/</g, '&lt;') + '</a></li>';
    }).join('') +
    '</ol></nav>';

  var kc = out.indexOf('<h3>Key Concepts</h3>');
  var insAt;
  if (kc !== -1) {
    insAt = kc + '<h3>Key Concepts</h3>'.length;
  } else {
    // First non-boilerplate h3 after lesson-body opens (Learning Objectives
    // and Key Concepts chrome no longer precede the body).
    var h3re = /<h3([^>]*)>([\s\S]*?)<\/h3>/g, hm;
    insAt = -1;
    while ((hm = h3re.exec(out.slice(lbOpen))) !== null) {
      var t = stripTags(hm[2]).toLowerCase().replace(/[^a-z ]/g, '').trim();
      if (!BOILERPLATE[t] && stripTags(hm[2]).length >= 3) { insAt = lbOpen + hm.index; break; }
    }
  }
  if (insAt === -1) return 'no-anchor';
  out = out.slice(0, insAt) + '\n' + toc + '\n' + out.slice(insAt);

  fs.writeFileSync(fp, out, 'utf8');
  return 'toc(' + sections.length + ')';
}

function run(root) {
  var files = walk(root, []);
  var stats = {};
  files.forEach(function (f) {
    var r = processFile(f);
    stats[r.split('(')[0]] = (stats[r.split('(')[0]] || 0) + 1;
  });
  return { files: files.length, stats: stats };
}

module.exports = { processFile: processFile, walk: walk, run: run };

if (require.main === module) {
  var res = run(ROOT);
  console.log('lesson-toc: ' + res.files + ' pages scanned');
  Object.keys(res.stats).sort().forEach(function (k) { console.log('  ' + k + ': ' + res.stats[k]); });
}
