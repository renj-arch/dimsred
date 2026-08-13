// Move existing junk sub-subjects whose Wikipedia categories say they belong
// elsewhere, using the shared wiki-category-routes table. This catches the
// title-signature misses that cleanup-junk-subjects.js and
// relocate-misplaced-subjects.js can't see (record labels, Bahá'í, foreign
// parks/airports, universities sitting under Courts / Farm Machinery / etc.).
//
// Unlike a title-regex classifier, the decision comes from Wikipedia's own
// category index — so "Cricket Wireless" (a telecom MVNO whose categories are
// about mobile networks, not sport) stays put, and "Ayodhya Airport" routes to
// Indian Aviation & Shipping while "Heathrow Airport" routes to World
// Geography. Page categories are fetched in batched API calls (50 titles per
// request) with redirect handling, so a full sweep is ~1 request per 50 subs.
//
// Two-phase, fully in-memory (same pattern as cleanup-junk-subjects.js): every
// file is loaded once, mutated in memory, written exactly once.
// Usage:
//   node scripts/relocate-by-wiki-categories.js            (apply)
//   node scripts/relocate-by-wiki-categories.js --dry      (report only)
//   node scripts/relocate-by-wiki-categories.js --all      (sweep every sub-subject)

const fs = require('fs');
const path = require('path');
const https = require('https');

const { routeByCategories } = require('./wiki-category-routes');

const DRY = process.argv.includes('--dry');
const SWEEP_ALL = process.argv.includes('--all');

const QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');
const LINK_POOL_PATH = path.join(__dirname, '..', 'data', 'wiki-link-pool.json');
const CATEGORY_INDEX_PATH = path.join(__dirname, '..', 'data', 'wiki-page-categories.json');
const WIKI_API = 'https://en.wikipedia.org/w/api.php';

// Candidate title signatures — reused from the cluster classifier so we only
// pay API cost on titles that plausibly mean a cross-category leak. In --all
// mode every sub-subject is a candidate instead.
const CANDIDATE = [
  /\b(?:University|Universidad|Universität|Institute of Technology| Polytechnic)\b/i,
  /\bRecords\b|Record label|discograph/i,
  /\bBah[áa][ʼ’']?[íi]|Baha'?i\b/i,
  /\b(?:National Park|State Park|Provincial Park|Trail|Wilderness|Scenic Area)\b/i,
  /(?:airport|Airport Station)$/i,
  /\bOlympic Games?|Summer Olympics|Winter Olympics\b/i,
  /(?:World Cup|World Championship|Champions League|Champions Trophy|Grand Prix|Premier League|Super League|Indian Premier League|Formula One|UEFA|FIFA|FIBA|PGA Championship|Championship Game|National Championship Game|Asia Cup|Club World|Championship|Chess Olympiad|Esports World Cup|Oceanian Championship|South American Championship|AFC Championship|CONCACAF Championship|FIFA World Cup)\b/i,
  /\b(?:football|soccer|cricket|basketball|volleyball|hockey|bandy|baseball|rugby|tennis|handball|chess|chessboxing|kho kho|kabaddi|netball|sevens|floorball)\b/i,
];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url + '&origin=*', { headers: { 'User-Agent': 'WikiClean/1.0' } }, (res) => {
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

const delay = ms => new Promise(r => setTimeout(r, ms));

// Fetch categories for up to 50 titles in one batched API call (redirects
// resolved). Returns a map title(lowercased) -> [category titles].
async function fetchCategoriesBatch(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    let data = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await delay(parseInt(process.env.WIKI_CAT_DELAY_MS || '400', 10));
        const url = `${WIKI_API}?action=query&prop=categories&cllimit=500&clshow=!hidden&redirects=1&titles=${encodeURIComponent(batch.join('|'))}&format=json&formatversion=2`;
        data = await fetchJSON(url);
        break;
      } catch (err) {
        const is429 = err.statusCode === 429 || /429/.test(err.message || '');
        const base = is429 ? (err.retryAfter || 30) * 1000 : 8000 * Math.pow(2, attempt);
        await delay(base);
      }
    }
    if (!data || !data.query) continue;
    const normBy = {};
    if (data.query.normalized) for (const n of data.query.normalized) normBy[n.from.toLowerCase()] = n.to.toLowerCase();
    if (data.query.redirects) for (const r of data.query.redirects) normBy[r.from.toLowerCase()] = r.to.toLowerCase();
    for (const p of data.query.pages) {
      const rawTitle = (p.title || '');
      const key = (normBy[rawTitle.toLowerCase()] || rawTitle).toLowerCase();
      if (!p.categories) continue;
      out[key] = p.categories.map(c => c.title).filter(Boolean);
    }
  }
  return out;
}

function isCandidate(sub) {
  return CANDIDATE.some(re => re.test(sub));
}

function slugFor(cat) {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json') && !['catalog.json', 'manifest.json'].includes(f));

  const cats = {};
  for (const file of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf8')); } catch { continue; }
    const subject = Object.keys(data)[0];
    if (!cats[subject]) cats[subject] = { files: [] };
    cats[subject].files.push({ file, data });
  }

  const targetFiles = {};
  const ensureCat = (subject) => {
    if (targetFiles[subject]) return targetFiles[subject];
    const existing = cats[subject] && cats[subject].files[0];
    if (existing) { targetFiles[subject] = existing; return existing; }
    const entry = { file: slugFor(subject) + '.json', data: { [subject]: { subSubjects: {} } } };
    cats[subject] = { files: [entry] };
    targetFiles[subject] = entry;
    return entry;
  };

  // Collect candidate sub-subjects: { title, subject } (deduped by title).
  const candidates = [];
  const seen = new Set();
  for (const subject of Object.keys(cats)) {
    for (const { data } of cats[subject].files) {
      const subs = data[subject] && data[subject].subSubjects || {};
      for (const sub of Object.keys(subs)) {
        if (SWEEP_ALL || isCandidate(sub)) {
          const key = sub.toLowerCase().trim();
          if (seen.has(key)) continue;
          seen.add(key);
          candidates.push({ title: sub.trim(), subject });
        }
      }
    }
  }

  console.log('WIKI-CATEGORY RELOCATE — ' + (DRY ? 'DRY (nothing written)' : 'APPLY') + ' — ' + candidates.length + ' candidate sub-subjects to check');

  // Use the committed local index when present (no live API); otherwise fall
  // back to batched live lookups. The local index is refreshed by
  // build-wiki-category-index.js and covers every sub-subject in data/.
  let catMap = {};
  let usedLocal = false;
  try {
    catMap = JSON.parse(fs.readFileSync(CATEGORY_INDEX_PATH, 'utf8'));
    usedLocal = true;
  } catch (e) { catMap = {}; }
  if (usedLocal) {
    console.log('  Using local index: data/wiki-page-categories.json (' + Object.keys(catMap).length + ' titles)');
    // Titles absent from the frozen snapshot (added after the last index
    // build) are the only ones we need to hit the live API for.
    const missing = candidates.filter(c => !catMap[c.title.toLowerCase()]).map(c => c.title).filter(t => t);
    if (missing.length) {
      console.log('  ' + missing.length + ' titles missing from index — fetching live (batched)...');
      const live = await fetchCategoriesBatch(missing);
      for (const [k, v] of Object.entries(live)) if (!catMap[k]) catMap[k] = v;
    }
  } else {
    console.log('  Local index not found — fetching categories live (batched).');
    catMap = await fetchCategoriesBatch(candidates.map(c => c.title));
  }
  const decisions = [];
  const movedSet = new Set();
  let noCats = 0;
  for (const c of candidates) {
    const catsOf = catMap[c.title.toLowerCase()] || catMap[`category:${c.title.toLowerCase()}`];
    if (!catsOf) { noCats++; continue; }
    const r = routeByCategories(catsOf, c.subject);
    if (r && r.to !== c.subject) {
      decisions.push({ title: c.title, subject: c.subject, to: r.to, why: r.why });
      movedSet.add(c.title.toLowerCase());
    }
  }

  console.log('Checked ' + candidates.length + ' candidates; ' + decisions.length + ' would move; ' + noCats + ' had no retrievable categories.\n');

  let movedTotal = 0;
  const byTarget = {};
  const movedList = [];
  for (const subject of Object.keys(cats)) {
    for (const { data } of cats[subject].files) {
      const srcSubs = data[subject].subSubjects || {};
      const removeKeys = [];
      for (const [sub, qs] of Object.entries(srcSubs)) {
        const d = decisions.find(x => x.title === sub);
        if (!d || d.subject !== subject) continue;
        const t = ensureCat(d.to);
        const targetSubs = t.data[d.to].subSubjects;
        for (const q of qs) { q.category = d.to; q.subject = d.to; }
        if (!targetSubs[sub]) targetSubs[sub] = [];
        targetSubs[sub] = targetSubs[sub].concat(qs);
        movedTotal += qs.length;
        byTarget[d.to] = (byTarget[d.to] || 0) + qs.length;
        movedList.push({ cat: subject, sub, n: qs.length, to: d.to, why: d.why });
        removeKeys.push(sub);
      }
      for (const k of removeKeys) delete srcSubs[k];
    }
  }

  // Persist link-pool relocation so the next wiki-fill re-mines these titles
  // under the correct subject (only for titles actually moved).
  try {
    const pool = JSON.parse(fs.readFileSync(LINK_POOL_PATH, 'utf8'));
    let relocated = 0;
    for (const catName of Object.keys(pool)) {
      const moved = [];
      const kept = [];
      for (const t of pool[catName]) {
        const d = decisions.find(x => x.title === t);
        if (d && d.subject === catName && d.to !== catName) moved.push([t, d.to]);
        else kept.push(t);
      }
      pool[catName] = kept;
      for (const [t, to] of moved) {
        if (!pool[to]) pool[to] = [];
        pool[to].push(t);
        relocated++;
      }
    }
    if (!DRY) fs.writeFileSync(LINK_POOL_PATH, JSON.stringify(pool, null, 1));
    console.log('Link pool relocated ' + relocated + ' titles to their routed categories.');
  } catch (e) {
    console.log('  (link pool not relocated: ' + e.message + ')');
  }

  if (!DRY) {
    let written = 0;
    for (const subject of Object.keys(cats)) {
      for (const { file, data } of cats[subject].files) {
        fs.writeFileSync(path.join(QUESTIONS_DIR, file), JSON.stringify(data));
        written++;
      }
    }
    console.log('\nWrote ' + written + ' category files.');
  } else {
    console.log('\nDRY-RUN — no files written.');
  }

  console.log('MOVED ' + movedTotal + ' questions to their Wikipedia-category homes:');
  Object.entries(byTarget).forEach(([c, n]) => console.log('  ' + n + '  ->  ' + c));
  if (movedList.length) {
    console.log('\nMoved break-down:');
    movedList.forEach(d => console.log('  ' + JSON.stringify(d)));
  }
  console.log('\nDone. Moved ' + movedTotal + ' questions (nothing dropped).');
}

main().catch(e => { console.error(e); process.exit(1); });