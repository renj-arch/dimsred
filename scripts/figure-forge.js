#!/usr/bin/env node
'use strict';
// Turn a queue of curated figure briefs into renderable diagrams.
//
// This is the automation half of the figure library. A brief is a small JSON
// object: a title, a template and the labels. The forge supplies the geometry,
// the shared renderer supplies the ink grammar, and the scheduled workflow
// rebuilds the hub and publishes it. Adding a diagram therefore means adding a
// brief -- no SVG is hand-pasted, and no label is invented by the machine.
//
//   node scripts/figure-forge.js
//   node scripts/figure-forge.js --check   # fail if the output is stale
//
// Output: data/figure-forge.json (committed so a fresh checkout renders the
// same library without running the forge first).

var fs = require('fs');
var path = require('path');
var TEMPLATES = require('./lib/figure-templates.js');

var ROOT = path.join(__dirname, '..');
var BRIEFS = path.join(ROOT, 'data', 'figure-briefs.json');
var OUT = path.join(ROOT, 'data', 'figure-forge.json');

var PAPER = { GS1: 1, GS2: 1, GS3: 1, GS4: 1 };

function fail(msg) {
  console.error('figure-forge: ' + msg);
  process.exit(1);
}

var doc = JSON.parse(fs.readFileSync(BRIEFS, 'utf8'));
var briefs = doc.briefs || doc;
if (!Array.isArray(briefs) || !briefs.length) fail('no briefs in data/figure-briefs.json');

var seen = {};
var figures = [];
var themeMap = {};

briefs.forEach(function (b) {
  if (!b.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.id)) fail('bad id: ' + b.id);
  if (seen[b.id]) fail('duplicate id: ' + b.id);
  seen[b.id] = 1;
  if (!PAPER[b.paper]) fail(b.id + ': paper must be GS1-GS4');
  if (!b.title || b.title.length < 8) fail(b.id + ': title is too short');
  if (!b.tag || !b.theme) fail(b.id + ': tag and theme are required');
  var draw = TEMPLATES[b.template];
  if (!draw) fail(b.id + ': unknown template "' + b.template + '"');

  var items = draw(b);
  if (!items.length) fail(b.id + ': template produced no items');

  figures.push({
    id: b.id,
    title: b.title,
    paper: b.paper,
    tag: b.tag,
    intro: b.intro || '',
    items: items
  });

  var key = b.paper + '|' + b.theme;
  var group = themeMap[key] || (themeMap[key] = { paper: b.paper, theme: b.theme, figs: [] });
  group.figs.push(b.id);
});

var themes = Object.keys(themeMap).map(function (k) { return themeMap[k]; });
// No timestamp in the output. The forge runs on a daily schedule and a build
// with unchanged briefs must be a byte-identical no-op -- otherwise every run
// would commit a fresh "generated" field and the publish step could never say
// "already current". The commit message carries the date instead.
var out = {
  source: 'data/figure-briefs.json',
  figures: figures,
  themes: themes
};
var json = JSON.stringify(out, null, 1) + '\n';

if (process.argv.indexOf('--check') !== -1) {
  if (!fs.existsSync(OUT)) fail('data/figure-forge.json is missing; run the forge');
  var current = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  var a = JSON.stringify(current.figures);
  var b = JSON.stringify(out.figures);
  if (a !== b) fail('data/figure-forge.json is stale; run node scripts/figure-forge.js');
  console.log('forge output is current: ' + figures.length + ' figures');
  process.exit(0);
}

fs.writeFileSync(OUT, json, 'utf8');
console.log('forge: ' + figures.length + ' figures from ' + briefs.length + ' briefs, ' +
  themes.length + ' theme groups -> data/figure-forge.json');
