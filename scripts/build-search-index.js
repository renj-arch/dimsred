// Build data/search-index.json — the page corpus behind search.html.
//
// Scans every *.html page in the repo (root pages, exam hubs, course
// lessons, figures) and writes one compact entry per page: path, title, a
// short description and its section. search.html fetches the JSON and
// searches client-side — no server, no API keys, no model.
//
// Runs in .github/workflows/search-index.yml on every push that touches a
// page, once a day as a safety net, and on manual dispatch. When nothing
// changed the file is left alone so quiet runs stay quiet (no commit noise).
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'search-index.json');
// data/ holds question banks (some very large) and no pages we link to;
// .github holds workflow files; node_modules is noise.
const SKIP_DIRS = { data: 1, '.github': 1, node_modules: 1, '.git': 1 };

const SECTION_NAMES = {
  figures: 'Figures & charts'
};

function sectionOf(rel) {
  const parts = String(rel).split('/');
  if (parts.length === 1) return 'Site pages';
  const dir = parts[0];
  if (SECTION_NAMES[dir]) return SECTION_NAMES[dir];
  return dir.replace(/-/g, ' ').replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
}

function cleanText(s) {
  return String(s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&mdash;/gi, '\u2014')
    .replace(/&ndash;/gi, '\u2013')
    .replace(/&middot;/gi, '\u00B7')
    .replace(/&hellip;/gi, '\u2026')
    .replace(/\s+/g, ' ')
    .trim();
}

function extract(html) {
  const titleM = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const descM = /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html);
  const h1M = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const h2M = /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(html);
  let t = titleM ? cleanText(titleM[1]) : '';
  if (!t && h1M) t = cleanText(h1M[1]);
  let d = descM ? cleanText(descM[1]) : '';
  if (!d && h1M) d = cleanText(h1M[1]);
  if (!d && h2M) d = cleanText(h2M[1]);
  return { t: t.slice(0, 130), d: d.slice(0, 170) };
}

function walk(dir, rel, out) {
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const it of items) {
    const name = it.name;
    if (!name || name.charAt(0) === '.') continue;
    if (SKIP_DIRS[name]) continue;
    const r = rel ? rel + '/' + name : name;
    if (it.isDirectory()) walk(path.join(dir, name), r, out);
    else if (/\.html$/i.test(name)) out.push(r);
  }
}

const files = [];
walk(ROOT, '', files);
files.sort();

const entries = [];
for (const rel of files) {
  let html = '';
  try { html = fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { continue; }
  const x = extract(html);
  const entry = { u: rel, t: x.t || rel, c: sectionOf(rel) };
  if (x.d) entry.d = x.d;
  entries.push(entry);
}
entries.sort(function (a, b) {
  if (a.c !== b.c) return a.c < b.c ? -1 : 1;
  return a.u < b.u ? -1 : a.u > b.u ? 1 : 0;
});

// A checkout that misses the html tree would "succeed" with an empty index —
// refuse instead so the run goes red and nobody ships a broken search.
if (entries.length < 200) {
  console.error('[search-index] only ' + entries.length + ' pages found — the checkout looks incomplete; refusing to write');
  process.exit(1);
}

let prev = null;
try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { prev = null; }
if (prev && Array.isArray(prev.entries) &&
    JSON.stringify(prev.entries) === JSON.stringify(entries)) {
  console.log('[search-index] no changes — ' + entries.length + ' pages');
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  count: entries.length,
  entries: entries
}) + '\n');
console.log('[search-index] wrote ' + entries.length + ' pages — ' + path.relative(ROOT, OUT));
