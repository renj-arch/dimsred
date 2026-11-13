#!/usr/bin/env node
'use strict';
// Whole-site defect sweep. Reports, does not fix:
//   1. dead internal links / missing local assets (href, src)
//   2. broken same-page anchors (#fragment -> missing id)
//   3. visible placeholder / filler / template-leak text
//   4. invalid JSON data files
//   5. JS syntax errors in js/ and scripts/
//   6. pages missing <title> or suspiciously thin
//   7. leftover duplicate h3 sections
//
// Run: node scripts/audit-site.js [rootDir]   (default repo root)

var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
var findings = { deadLinks: [], deadAnchors: [], placeholder: [], badJson: [], badJs: [], thinPages: [], dupSections: [] };

function walk(dir, out, exts) {
  var es;
  try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (var i = 0; i < es.length; i++) {
    var p = path.join(dir, es[i].name);
    if (es[i].isDirectory()) {
      // templates/ holds build-time partials (<!--ROOT--> placeholders are
      // substituted by build-page.js) — they are not served pages.
      if (/node_modules|\.git|data\/ocr-cache|(^|[\\/])templates$/.test(p)) continue;
      walk(p, out, exts);
    } else if (exts.test(es[i].name)) out.push(p);
  }
  return out;
}

var htmlFiles = walk(ROOT, [], /\.html?$/i);
console.log('scanning ' + htmlFiles.length + ' html files...');

var SKIP_DIRS = /node_modules|\.git/;
var LINK_RE = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
var PLACEHOLDER_RE = /\b(lorem ipsum|TODO|FIXME|XXX\b|placeholder text|coming soon|under construction|this lesson covers <strong>|\[object Object\]|undefined is not|NaN\b)/i;

htmlFiles.forEach(function (fp) {
  var rel = path.relative(ROOT, fp).replace(/\\/g, '/');
  var raw;
  try { raw = fs.readFileSync(fp, 'utf8'); } catch (e) { return; }
  // Link scan runs on markup only: JS template strings like href="$1" and
  // inline onclick handlers are not navigational links.
  var html = raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // dead links / missing assets
  var m;
  LINK_RE.lastIndex = 0;
  var seen = {};
  while ((m = LINK_RE.exec(html)) !== null) {
    var u = m[1].trim();
    if (!u || u.startsWith('#') || /^(https?:|mailto:|tel:|javascript:|data:|blob:|\/\/)/i.test(u)) continue;
    var clean = u.split('#')[0].split('?')[0];
    if (!clean) continue;
    var key = clean;
    if (seen[key]) continue;
    seen[key] = 1;
    // Root-relative URLs resolve against the site root, not the filesystem.
    var target = clean.charAt(0) === '/'
      ? path.join(ROOT, clean)
      : path.resolve(path.dirname(fp), decodeURIComponent(clean));
    if (!fs.existsSync(target)) {
      findings.deadLinks.push(rel + ' -> ' + u);
    }
  }

  // same-page anchors
  var ids = {};
  var idRe = /\bid\s*=\s*["']([^"']+)["']/g, im;
  while ((im = idRe.exec(html)) !== null) ids[im[1]] = 1;
  var aRe = /href\s*=\s*["']#([^"']+)["']/g, am;
  var badA = {};
  while ((am = aRe.exec(html)) !== null) {
    var frag = am[1];
    if (!ids[frag] && !badA[frag]) { badA[frag] = 1; findings.deadAnchors.push(rel + ' -> #' + frag); }
  }

  // placeholder / filler text (visible prose only, not inside script/style)
  var visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  var pm = visible.match(PLACEHOLDER_RE);
  if (pm) findings.placeholder.push(rel + ' :: ' + pm[0]);

  // duplicate h3 sections inside lesson-body
  if (html.indexOf('lesson-body') !== -1) {
    var lb = html.indexOf('lesson-body');
    var end = html.indexOf('Practice Questions', lb);
    var scope = end === -1 ? html.slice(lb) : html.slice(lb, end);
    var h3s = {};
    var h3re = /<h3[^>]*>([\s\S]*?)<\/h3>/g, hm;
    while ((hm = h3re.exec(scope)) !== null) {
      var t = hm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (t.length > 3) h3s[t] = (h3s[t] || 0) + 1;
    }
    var dups = Object.keys(h3s).filter(function (k) { return h3s[k] > 1; });
    if (dups.length) findings.dupSections.push(rel + ' :: ' + dups.slice(0, 4).join(' | '));
  }

  // thin / missing title
  var title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [null, ''])[1].trim();
  if (!title) findings.thinPages.push(rel + ' :: no <title>');
  var size = fs.statSync(fp).size;
  if (size < 2500 && !/404|not-found|empty/i.test(rel)) findings.thinPages.push(rel + ' :: ' + size + ' bytes');
});

// JSON validity
walk(ROOT, [], /\.json$/i).forEach(function (fp) {
  var rel = path.relative(ROOT, fp).replace(/\\/g, '/');
  if (/package-lock|tsconfig|\.vscode/.test(rel)) return;
  try { JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch (e) { findings.badJson.push(rel + ' :: ' + e.message.slice(0, 80)); }
});

// JS syntax
walk(ROOT, [], /\.js$/i).forEach(function (fp) {
  var rel = path.relative(ROOT, fp).replace(/\\/g, '/');
  if (/node_modules|_tmp|\.min\.js|vendor\//.test(rel)) return;
  try {
    cp.execFileSync(process.execPath, ['--check', fp], { stdio: 'pipe' });
  } catch (e) {
    var msg = (e.stderr || e.message || '').toString().split('\n').slice(0, 3).join(' ');
    findings.badJs.push(rel + ' :: ' + msg.slice(0, 140));
  }
});

console.log('\n=== AUDIT RESULTS ===');
Object.keys(findings).forEach(function (k) {
  console.log('\n' + k + ': ' + findings[k].length);
  findings[k].slice(0, 25).forEach(function (x) { console.log('  ' + x); });
  if (findings[k].length > 25) console.log('  ... +' + (findings[k].length - 25) + ' more');
});
fs.writeFileSync(path.join(ROOT, 'data', 'audit-findings.json'), JSON.stringify({ at: new Date().toISOString(), findings: findings }, null, 2), 'utf8');
console.log('\nwrote data/audit-findings.json');
