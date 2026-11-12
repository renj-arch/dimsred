#!/usr/bin/env node
'use strict';
// Emit figures/svg-<id>.html — one dedicated page per hand-drawn SVG
// diagram in scripts/lib/upsc-svg-figures.js.
//
// figures/index.html's "Exam-Ready Hand-Drawn Diagrams" hero links to these
// pages. They were hand-injected into the generated index once and the links
// rotted (mangled markup, slugs that matched nothing). Generating them here
// makes the hero reproducible: the pages and the cards come from the same
// FIGURES array, so a link can never point at a diagram that does not exist.
//
//   node scripts/build-svg-figure-pages.js

var fs = require('fs');
var path = require('path');
var FIGLIB = require('./lib/upsc-svg-figures.js');

var ROOT = path.join(__dirname, '..');
var OUTDIR = path.join(ROOT, 'figures');
var FIGURES = FIGLIB.FIGURES;
var PAPER = FIGLIB.PAPER;
var svg = FIGLIB.svg;
var esc = FIGLIB.esc;

var CSS = 'body{font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f1115;color:#e8eaed;margin:0;padding:24px}' +
  '.wrap{max-width:1000px;margin:0 auto}' +
  'h1{font-size:22px;margin:0 0 6px}' +
  '.meta{color:#9aa0a6;font-size:13px;margin-bottom:16px}' +
  '.card{background:#1a1d23;border:1px solid #2a2e37;border-radius:10px;padding:18px;margin-bottom:18px}' +
  '.canvas{background:#fbf7ec;border-radius:8px;padding:10px}' +
  '.canvas svg{display:block;width:100%;height:auto}' +
  '.tag{display:inline-block;font-size:11px;padding:2px 8px;border-radius:99px;background:#26324a;color:#8ab4f8;margin-right:8px}' +
  'a{color:#8ab4f8}.nav{margin:18px 0;display:flex;gap:14px;flex-wrap:wrap}' +
  '.intro{color:#c8ccd2;font-size:14px;margin:10px 0 16px}';

function page(f) {
  var meta = PAPER[f.paper] || PAPER.GS1;
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="description" content="' + esc(f.title) + ' — hand-drawn UPSC diagram (' + esc(meta.label) + ', ' + esc(f.tag) + ') on vlymbooq. Redraw it from memory in the exam hall.">' +
    '<title>' + esc(f.title) + ' — UPSC Figure | vlymbooq</title><style>' + CSS + '</style></head><body><div class="wrap">' +
    '<div class="nav"><a href="index.html">&#8592; figures index</a><a href="../figures.html">figure library</a></div>' +
    '<h1>' + esc(f.title) + '</h1>' +
    '<p class="meta"><span class="tag" style="background:' + meta.color + '22;color:' + meta.color + '">' + esc(meta.label) + '</span>' + esc(f.tag) + ' &#183; hand-drawn SVG &#183; redraw from memory</p>' +
    '<div class="card"><p class="intro">' + esc(f.intro) + '</p>' +
    '<div class="canvas">' + svg({ id: f.id, w: 760, h: 420, aria: f.title, items: f.items }) + '</div></div>' +
    '<p class="meta">Part of the <a href="../figures.html">UPSC figure library</a> — label-first sketches a candidate can reproduce in the exam hall. All ' + FIGURES.length + ' diagrams are inline SVG: no image can 404.</p>' +
    '</div></body></html>';
}

if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

var written = 0;
FIGURES.forEach(function (f) {
  fs.writeFileSync(path.join(OUTDIR, 'svg-' + f.id + '.html'), page(f));
  written++;
});

console.log('svg figure pages: wrote ' + written + ' (figures/svg-<id>.html)');
