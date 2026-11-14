// Gap report for curated subject figure topics.
//
// For every topic in data/figure-topics-curated.json, tell whether a figure
// exists in any of the sources the builder consults (hand-picked exact files,
// the structured-data resolver's output, and the builder's own cache). Anything
// with no figure is a gap: the topic reads as "still needing a figure" on the
// subject pack, and the only way to close it is a hand-pick into
// data/figure-files-curated.json (the resolver already ran and found nothing at
// confidence >= 0.85, or the topic is one of the deliberately-absent entities
// where the nearest article is something else).
//
// Output: data/figure-gaps.json plus a human-readable table. Run after
// build-subject-figures.js to see what is still missing.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
}

const raw = readJSON(path.join(ROOT, 'data', 'figure-topics-curated.json'));
if (!raw) { console.error('data/figure-topics-curated.json missing'); process.exit(1); }
const slugs = Object.keys(raw).filter(k => k.charAt(0) !== '_');

const hand = {};
const exFile = path.join(ROOT, 'data', 'figure-files-curated.json');
const ex = readJSON(exFile);
if (ex) for (const s of Object.keys(ex)) if (s.charAt(0) !== '_')
  for (const t of Object.keys(ex[s] || {})) hand[norm(t)] = ex[s][t];

const auto = {};
const auFile = path.join(ROOT, 'data', 'figure-files-auto.json');
const au = readJSON(auFile);
if (au) for (const s of Object.keys(au)) if (s.charAt(0) !== '_')
  for (const t of Object.keys(au[s] || {})) auto[norm(t)] = au[s][t];

const cache = {};
const cacheFile = path.join(ROOT, 'data', 'subject-figures-cache.json');
const c = readJSON(cacheFile);
if (c) for (const k of Object.keys(c)) cache[norm(k)] = c[k];

function hasFile(x) { return !!x && typeof x === 'string' && x.length > 0; }
function hasAuto(x) { return !!x && (typeof x === 'string' ? x.length > 0 : hasFile(x.file)); }
function hasCache(x) { return !!x && (typeof x === 'string' ? x.length > 0 : hasFile(x.file)); }

let totalTopics = 0;
const bySubject = {};
for (const slug of slugs) {
  const list = [].concat(raw[slug] || []);
  totalTopics += list.length;
  const gaps = [];
  for (const t of list) {
    const n = norm(t);
    const covered = hand[n] || hasAuto(auto[n]) || hasCache(cache[n]);
    if (!covered) gaps.push(t);
  }
  bySubject[slug] = gaps;
  const covered = list.length - gaps.length;
  console.log('  ' + slug + ': ' + list.length + ' topics, ' + covered +
    ' covered, ' + gaps.length + ' gaps');
}

const totalGaps = Object.keys(bySubject).reduce((sum, s) => sum + bySubject[s].length, 0);
console.log('total curated topics:', totalTopics);
console.log('total gaps:', totalGaps);

const out = {
  generated: new Date().toISOString(),
  source: 'scripts/report-figure-gaps.js',
  totalTopics: totalTopics,
  totalGaps: totalGaps,
  bySubject: bySubject
};
const outFile = path.join(ROOT, 'data', 'figure-gaps.json');
fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
console.log('wrote data/figure-gaps.json');