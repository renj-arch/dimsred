#!/usr/bin/env node
// Collapse duplicated accessibility attributes.
//
// The A11Y agent used to prepend ` role="button" tabindex="0"` to every
// clickable <div> on every run without checking whether the attribute was
// already present. Files that the agent touched many times accumulated runs
// like:
//
//   <div role="button" tabindex="0" role="button" tabindex="0" ... onclick=...>
//
// Besides bloating pages (some grew by hundreds of KB), the repetition is
// invalid HTML and confuses assistive tech. This pass collapses any run of
// two or more identical `role="button" tabindex="0"` pairs into one. It is
// idempotent and only rewrites a file when bytes actually change.
//
// Run: node scripts/clean-dup-attrs.js [root]
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = process.argv[2] || path.join(__dirname, '..');
var RUN = /role="button"[ \t\r\n]+tabindex="0"(?:[ \t\r\n]+role="button"[ \t\r\n]+tabindex="0")+/g;

function htmlFiles(dir, out, depth) {
  if (depth > 2) return out;
  var entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      htmlFiles(path.join(dir, e.name), out, depth + 1);
    } else if (/\.html?$/i.test(e.name)) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

var files = htmlFiles(ROOT, [], 0);
var changed = 0;
var saved = 0;
for (var i = 0; i < files.length; i++) {
  var f = files[i];
  var src = fs.readFileSync(f, 'utf8');
  if (src.indexOf('role="button"') === -1) continue;
  var out = src.replace(RUN, 'role="button" tabindex="0"');
  if (out !== src) {
    fs.writeFileSync(f, out);
    changed++;
    saved += src.length - out.length;
  }
}
console.log('clean-dup-attrs: ' + changed + ' file(s) changed, ' + (saved / 1024).toFixed(1) + ' KiB removed, ' + files.length + ' scanned');
