#!/usr/bin/env node
'use strict';
/**
 * repair-cartoon-labels.js — pull cartoon labels back inside the canvas.
 *
 * Some generated SVGs place a <text> at x<0 / y<0 or beyond viewBox, so the
 * label is clipped at the edge. This clamps every text anchor into the canvas
 * (with a margin) across lesson pages.
 *
 *   node scripts/repair-cartoon-labels.js --dry
 *   node scripts/repair-cartoon-labels.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');

function walk(dir, out) {
  let es = [];
  try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of es) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/^lesson-.*\.html$/.test(e.name)) out.push(p);
  }
  return out;
}

let figures = 0, fixedFigs = 0, fixedLabels = 0;
const files = walk(path.join(ROOT, 'upsc', 'course'), []);
for (const f of files) {
  let html = fs.readFileSync(f, 'utf8');
  let changed = false;
  html = html.replace(/<figure class="passage-cartoon"[\s\S]*?<\/figure>/g, function (block) {
    figures++;
    let b = block;
    const vb = b.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    const W = vb ? +vb[1] : 560, H = vb ? +vb[2] : 320;
    let any = false;
    b = b.replace(/<text\b([^>]*)>/g, function (tag, attrs) {
      const xm = attrs.match(/\bx="(-?[\d.]+)"/);
      const ym = attrs.match(/\by="(-?[\d.]+)"/);
      if (!xm || !ym) return tag;
      let x = +xm[1], y = +ym[1];
      const nx = Math.max(12, Math.min(W - 12, x));
      const ny = Math.max(16, Math.min(H - 8, y));
      if (nx === x && ny === y) return tag;
      fixedLabels++; any = true;
      let a2 = attrs.replace(/\bx="-?[\d.]+"/, 'x="' + nx + '"').replace(/\by="-?[\d.]+"/, 'y="' + ny + '"');
      return '<text' + a2 + '>';
    });
    // Also clamp tspan x/y that repeat the anchor.
    b = b.replace(/<tspan\b([^>]*)>/g, function (tag, attrs) {
      const xm = attrs.match(/\bx="(-?[\d.]+)"/);
      const ym = attrs.match(/\by="(-?[\d.]+)"/);
      if (!xm && !ym) return tag;
      let a2 = attrs;
      if (xm) { const nx = Math.max(12, Math.min(W - 12, +xm[1])); a2 = a2.replace(/\bx="-?[\d.]+"/, 'x="' + nx + '"'); }
      if (ym) { const ny = Math.max(16, Math.min(H - 8, +ym[1])); a2 = a2.replace(/\by="-?[\d.]+"/, 'y="' + ny + '"'); }
      return '<tspan' + a2 + '>';
    });
    if (any) { fixedFigs++; changed = true; }
    return b;
  });
  if (changed) {
    if (!DRY) fs.writeFileSync(f, html, 'utf8');
    console.log(path.relative(ROOT, f).replace(/\\/g, '/'));
  }
}
console.log((DRY ? 'DRY: ' : '') + 'figures scanned: ' + figures + ' | figures fixed: ' + fixedFigs + ' | labels clamped: ' + fixedLabels);