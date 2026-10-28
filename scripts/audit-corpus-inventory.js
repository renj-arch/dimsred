// Inventory + duplicate audit for data/questions.
// Usage: node scripts/audit-corpus-inventory.js [--dupes N]
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data', 'questions');
const SKIP = new Set(['manifest.json', 'catalog.json', 'archive-index.json', 'archive-cat-index.json']);

function baseName(f) {
  return f.replace(/-\d+\.json$/, '').replace(/\.json$/, '');
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !SKIP.has(f));
const buckets = new Map();
for (const f of files) {
  const st = fs.statSync(path.join(DIR, f));
  const k = baseName(f);
  const b = buckets.get(k) || { mb: 0, files: 0 };
  b.mb += st.size / 1048576;
  b.files += 1;
  buckets.set(k, b);
}

const rows = [...buckets.entries()].sort((a, b) => a[1].mb - b[1].mb);
const totalMb = rows.reduce((a, r) => a + r[1].mb, 0);
console.log(`files=${files.length} base=${rows.length} totalMB=${totalMb.toFixed(0)}`);
console.log('\n=== SMALLEST 40 BASE CATEGORIES ===');
for (const [k, v] of rows.slice(0, 40)) {
  console.log(String(v.mb.toFixed(2)).padStart(8), String(v.files).padStart(3), k);
}
console.log('\n=== LARGEST 20 ===');
for (const [k, v] of rows.slice(-20).reverse()) {
  console.log(String(v.mb.toFixed(0)).padStart(8), String(v.files).padStart(3), k);
}

// Exam-syllabus buckets: how much of the corpus each named area actually owns.
const AREAS = {
  'Polity & Constitution': [/polity/, /constitution/, /judiciary/, /elections/, /panchayat/, /governance/],
  'Economy & Banking': [/econom/], // business-economy etc, checked below
  'Awards & Honours': [/award/],
  'Defence & Security': [/defence/, /security/, /strategic/],
  'International Relations': [/international/, /organi[sz]ations-summits/],
  'Art & Culture': [/art-culture/, /architecture/, /festival/, /music/, /theatre/, /cinema/, /handicraft/, /heritage/, /museums/],
  'History': [/history/, /ancient-india/, /medieval/, /battles/, /archaeology/],
  'Geography': [/geograph/],
  'Environment': [/environment/, /ecology/, /wildlife/, /climate/],
  'Science & Tech': [/science/, /technology/, /physics/, /chemistr/, /biolog/, /space/, /computer/, /isro/],
  'Current Affairs': [/current-affairs/, /pib/, /important-days/],
  'Schemes & Governance': [/scheme/, /social-security/, /rural/, /urban/],
  'Committees & Bodies': [/committees/, /commissions/],
  'Ethics': [/ethics/],
  'State GK': [/state-gk/, /indian-states/],
  'Literature & Language': [/literature/, /language/, /linguistic/],
  'Sports': [/sports/],
  'Agriculture': [/agri/, /crop/, /horticulture/, /soil/, /farm/, /plant-/, /spices/, /fisheries/, /animal-husbandry/],
};

console.log('\n=== AREA TOTALS (MB) ===');
const areaRows = [];
for (const [area, pats] of Object.entries(AREAS)) {
  let mb = 0;
  const hits = [];
  for (const [k, v] of rows) {
    if (pats.some((p) => p.test(k))) {
      mb += v.mb;
      hits.push(k);
    }
  }
  areaRows.push({ area, mb, n: hits.length, hits });
}
areaRows.sort((a, b) => b.mb - a.mb);
for (const a of areaRows) console.log(String(a.mb.toFixed(0)).padStart(8), String(a.n).padStart(3), a.area);

if (process.argv.includes('--dupes')) {
  const limit = parseInt(process.argv[process.argv.indexOf('--dupes') + 1] || '400', 10);
  const seen = new Map();
  let total = 0;
  let exactDupes = 0;
  let answerMismatch = 0;
  const samples = [];
  const filesToScan = files.slice(0, limit);
  for (const f of filesToScan) {
    let doc;
    try {
      doc = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8').replace(/^\uFEFF/, ''));
    } catch { continue; }
    for (const cat of Object.keys(doc)) {
      const subs = (doc[cat] && doc[cat].subSubjects) || {};
      for (const ss of Object.keys(subs)) {
        for (const q of subs[ss] || []) {
          if (!q || !q.question) continue;
          total++;
          const key = String(q.question).toLowerCase().replace(/\s+/g, ' ').trim();
          const prev = seen.get(key);
          if (prev) {
            exactDupes++;
            if (String(prev.answer || '').toLowerCase() !== String(q.answer || '').toLowerCase()) answerMismatch++;
            if (samples.length < 8) samples.push({ q: q.question, a1: prev.answer, a2: q.answer, f1: prev.file, f2: f });
          } else {
            seen.set(key, { answer: q.answer, file: f });
          }
        }
      }
    }
  }
  console.log(`\n=== DUPLICATES (first ${filesToScan.length} files) ===`);
  console.log('scanned questions:', total, 'unique question texts:', seen.size,
    'dupes:', exactDupes, `(${(100 * exactDupes / Math.max(1, total)).toFixed(1)}%)`,
    'conflicting answers:', answerMismatch);
  for (const s of samples) {
    console.log('\n Q:', String(s.q).slice(0, 130));
    console.log('   ', s.f1, '=>', String(s.a1).slice(0, 60));
    console.log('   ', s.f2, '=>', String(s.a2).slice(0, 60));
  }
}
