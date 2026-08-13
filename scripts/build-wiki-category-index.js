// Build a local index of Wikipedia categories for every sub-subject in the
// data, so the category-driven mover and the ingest router never hit the live
// API during a run. Wikipedia's own category membership is the ground truth for
// where a page belongs (record labels, universities, airports, parks, etc.),
// captured ONCE into data/wiki-page-categories.json as:
//   { "<sub-subject title lowercase>": ["Category:...", ...], ... }
//
// Batched prop=categories (50 titles per request, redirects resolved) keeps the
// API cost to ~1 request per 50 subtopics. The index is committed to the repo;
// run it only when a refreshed snapshot is wanted (e.g. after wiki-fill pulls
// in many new sub-subjects).
//
// Usage: node scripts/build-wiki-category-index.js

const fs = require('fs');
const path = require('path');
const https = require('https');

const QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');
const OUT = path.join(__dirname, '..', 'data', 'wiki-page-categories.json');
const WIKI_API = 'https://en.wikipedia.org/w/api.php';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url + '&origin=*', { headers: { 'User-Agent': 'WikiIndex/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          const err = new Error('HTTP ' + res.statusCode + ': ' + data.substring(0, 120));
          err.statusCode = res.statusCode;
          const ra = res.headers['retry-after'];
          if (ra) { const s = parseInt(ra, 10); if (!isNaN(s) && s > 0) err.retryAfter = s; }
          return reject(err);
        }
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('not valid JSON: ' + data.substring(0, 120))); }
      });
    }).on('error', reject);
  });
}

function norm(s) { return (s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

  // Collect every unique sub-subject title across all data files.
  const titles = new Set();
  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json') && !['catalog.json', 'manifest.json'].includes(f));
  for (const file of files) {
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf8')); } catch { continue; }
    for (const o of Object.values(j)) {
      for (const sub of Object.keys(o.subSubjects || {})) titles.add(sub.trim());
    }
  }
  const all = [...titles].filter(t => t.length > 0);
  if (limit > 0) all.length = Math.min(limit, all.length);
  console.log('Indexing categories for ' + all.length + ' unique sub-subject titles...');

  const index = {};
  const total = all.length;
  let done = 0;
  for (let i = 0; i < all.length; i += 50) {
    const batch = all.slice(i, i + 50);
    let data = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await delay(parseInt(process.env.WIKI_INDEX_DELAY_MS || '400', 10));
        const url = `${WIKI_API}?action=query&prop=categories&cllimit=500&clshow=!hidden&redirects=1&titles=${encodeURIComponent(batch.join('|'))}&format=json&formatversion=2`;
        data = await fetchJSON(url);
        break;
      } catch (err) {
        const is429 = err.statusCode === 429 || /429/.test(err.message || '');
        const base = is429 ? (err.retryAfter || 30) * 1000 : 8000 * Math.pow(2, attempt);
        await delay(base);
      }
    }
    if (data && data.query) {
      const normBy = {};
      if (data.query.normalized) for (const n of data.query.normalized) normBy[n.from.toLowerCase()] = n.to.toLowerCase();
      if (data.query.redirects) for (const r of data.query.redirects) normBy[r.from.toLowerCase()] = r.to.toLowerCase();
      for (const p of data.query.pages) {
        const raw = (p.title || '').toLowerCase();
        const key = normBy[raw] || raw;
        if (p.categories) index[key] = p.categories.map(c => c.title).filter(Boolean);
      }
    }
    done += batch.length;
    if (done % 500 < 50 || done === total) console.log('  ' + done + '/' + total + ' (' + Math.round(done * 100 / total) + '%)');
  }

  fs.writeFileSync(OUT, JSON.stringify(index));
  console.log('Wrote ' + Object.keys(index).length + ' titles -> ' + path.relative('.', OUT));
}

main().catch(e => { console.error(e); process.exit(1); });