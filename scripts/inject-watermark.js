#!/usr/bin/env node
/**
 * inject-watermark.js — put the site name on every page and inside every
 * hand-drawn figure.
 *
 * Two marks, both subtle and both non-interactive:
 *   - a fixed "vlymbooq" line at the bottom-right of every HTML page
 *   - "vlymbooq" inside each generated figure SVG, so the diagram carries the
 *     name when it is saved, printed or screenshotted on its own
 *
 * Only figues are touched inside SVG: the marker is added to an <svg> that has
 * the figure viewBox (760x420), never to an icon or a layout SVG.
 *
 *   node scripts/inject-watermark.js            # all HTML
 *   node scripts/inject-watermark.js --check    # exit 1 if any page lacks it
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2).filter((a) => a !== '--check');
const TARGET = argv[0] ? path.resolve(argv[0]) : ROOT;
const CHECK = process.argv.includes('--check');

const PAGE_MARK = '<!-- vlymbooq-watermark -->';
const PAGE_CSS = PAGE_MARK +
  '<style>#vlymbooq-mark{position:fixed;right:12px;bottom:10px;z-index:60;' +
  'font:600 11px/1 Inter,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.16em;' +
  'text-transform:uppercase;color:rgba(242,230,208,.34);text-shadow:0 1px 2px rgba(0,0,0,.6);' +
  'pointer-events:none;user-select:none}</style>' +
  '<div id="vlymbooq-mark" aria-hidden="true">vlymbooq</div>';

const SVG_MARK = 'vlymbooq-svg';
function svgMark() {
  return '<text class="' + SVG_MARK + '" x="752" y="414" text-anchor="end" font-size="9" ' +
    'fill="#1f2937" fill-opacity="0.42" font-family="\'Segoe Print\',\'Bradley Hand\',cursive">vlymbooq</text>';
}

function walk(dir, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'data') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = walk(TARGET, []);
let paged = 0;
const missing = [];

for (const file of files) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }

  const before = html;
  // 1. page mark
  if (html.indexOf(PAGE_MARK) === -1) {
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, PAGE_CSS + '</body>');
    else html = html + PAGE_CSS;
  }
  // 2. figure marks: only inside the figure viewBox, and only once each
  if (html.indexOf(SVG_MARK) === -1 && /viewBox="0 0 760 420"/.test(html)) {
    html = html.replace(/(<svg[^>]*viewBox="0 0 760 420"[\s\S]*?)<\/svg>/g, function (m) {
      if (m.indexOf(SVG_MARK) !== -1) return m;
      return m.replace(/<\/svg>$/, svgMark() + '</svg>');
    });
  }

  if (html === before) { continue; }
  if (CHECK) { missing.push(path.relative(ROOT, file).replace(/\\/g, '/')); continue; }
  fs.writeFileSync(file, html, 'utf8');
  paged++;
}

if (CHECK) {
  if (missing.length) {
    console.error('FAIL ' + missing.length + ' page(s) without the watermark');
    missing.slice(0, 10).forEach((m) => console.error('  ' + m));
    process.exitCode = 1;
  } else {
    console.log('watermark: present on all pages');
  }
} else {
  console.log('watermark: ' + paged + '/' + files.length + ' page(s) marked');
}