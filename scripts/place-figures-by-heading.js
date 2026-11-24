#!/usr/bin/env node
/**
 * place-figures-by-heading.js — move an existing figure beside the passage it
 * explains.
 *
 * attach-course-figures originally injected every figure right after
 * <div class="lesson-body">, so a diagram sat at the top of a 50,000-word
 * lesson instead of under the section it describes. This re-inserts each
 * existing figure under the h2/h3 whose words best match the figure's
 * title/intro/tag. Idempotent; only the block's position changes.
 *
 *   node scripts/place-figures-by-heading.js            # all lessons
 *   node scripts/place-figures-by-heading.js --check
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'data', 'figures'].indexOf(e.name) !== -1) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/[\\/]course[\\/].*[\\/]lesson-.*\.html$/.test(p)) out.push(p);
  }
  return out;
}

// id -> metadata (invented store + hand-built library)
const meta = {};
try {
  const inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'figures', 'invented.json'), 'utf8'));
  (inv.figures || []).forEach((f) => { if (f && f.id) meta[f.id] = { title: f.title, intro: f.intro, tag: f.tag }; });
} catch (e) {}
try {
  const lib = require('./lib/upsc-svg-figures.js');
  (lib.FIGURES || []).forEach((f) => { if (f && f.id) meta[f.id] = { title: f.title, intro: f.intro, tag: f.tag }; });
} catch (e) {}

function bestInsertIndex(html, fig) {
  const words = (String(fig.title || '') + ' ' + String(fig.intro || '') + ' ' + String(fig.tag || ''))
    .toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 4);
  const set = new Set(words);
  let best = null;
  const heads = [];
  for (const m of html.matchAll(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, ' ').toLowerCase();
    let score = 0;
    for (const w of text.split(/[^a-z0-9]+/)) if (set.has(w)) score++;
    heads.push({ score, at: m.index + m[0].length });
    if (score >= 2 && (!best || score > best.score)) best = { score, at: m.index + m[0].length };
  }
  if (best) return best.at;
  // Fallback: the closest heading (score 1) rather than leaving it at the top.
  const one = heads.filter((h) => h.score >= 1).sort((a, b) => b.score - a.score)[0];
  if (one) return one.at;
  // Last resort: the second section, i.e. after the intro section.
  return heads.length > 1 ? heads[1].at : (heads.length ? heads[0].at : null);
}

let moved = 0, kept = 0, noMatch = 0;
for (const file of walk(ROOT, [])) {
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/<!-- course-figure:([a-z0-9-]+) -->[\s\S]*?<\/figure>/);
  if (!m) continue;
  const id = m[1];
  const fig = meta[id] || {};
  const withoutBlock = html.slice(0, m.index) + html.slice(m.index + m[0].length);
  const at = bestInsertIndex(withoutBlock, fig);
  if (at == null) { noMatch++; continue; }
  const next = withoutBlock.slice(0, at) + '\n' + m[0] + '\n' + withoutBlock.slice(at);
  if (next === html) { kept++; continue; }
  if (!CHECK) fs.writeFileSync(file, next, 'utf8');
  moved++;
}

console.log((CHECK ? '[check] ' : '') + 'moved beside a matching section: ' + moved + ' | already there: ' + kept + ' | no matching heading: ' + noMatch);