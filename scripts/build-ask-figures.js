#!/usr/bin/env node
// Compact figure index for the Ask page.
//
// Source of truth is data/figure-published.json (built by build-figure-pages.js
// in the Figures workflow); that file is multi-megabyte and shaped for the
// paginated gallery, so Ask gets a slim projection: topic -> up to 3
// hotlinkable file names (Commons Special:FilePath), topics sorted, files
// sorted, so the output is byte-stable and an unchanged library writes
// nothing.
//
// Run: node scripts/build-ask-figures.js
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var SRC = path.join(ROOT, 'data', 'figure-published.json');
var OUT = path.join(ROOT, 'data', 'ask-figures.json');
var PER_TOPIC = 3;

var FT = require('./lib/figure-topics.js');

var pub = JSON.parse(fs.readFileSync(SRC, 'utf8'));
var files = pub.files || {};
var byTopic = {};
Object.keys(files).forEach(function (id) {
  var e = files[id];
  if (!e || !e.file || !e.topic) return;
  var f = String(e.file).trim();
  if (!/\.(jpe?g|png|webp|svg|gif)$/i.test(f)) return;
  var t = String(e.topic).trim();
  if (!t) return;
  // Sport, cinema, award shows and commemorative days are not GS content.
  // The gallery has a full audit of this list; Mains/Ask must not attach those
  // pictures to a syllabus answer just because a word overlapped.
  if (!FT.keep(t)) return;
  (byTopic[t] = byTopic[t] || []).push(f);
});

var topics = Object.keys(byTopic).sort().map(function (t) {
  var seen = {};
  var picked = [];
  byTopic[t].sort().forEach(function (f) {
    if (seen[f] || picked.length >= PER_TOPIC) return;
    seen[f] = 1;
    picked.push(f);
  });
  return [t, picked];
});

var doc = { v: 1, source: 'figure-published.json', topics: topics };
var next = JSON.stringify(doc) + '\n';
var prev = null;
try { prev = fs.readFileSync(OUT, 'utf8'); } catch (e) { /* first build */ }

if (prev === next) {
  console.log('ask-figures.json unchanged (' + topics.length + ' topics)');
  process.exit(0);
}
fs.writeFileSync(OUT, next);
console.log('ask-figures.json written: ' + topics.length + ' topics, ' +
  Math.round(next.length / 1024) + 'KB');
