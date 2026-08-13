// PRECISION analyzer: uses the curated `topics` arrays from wiki-fill-all.cjs as
// authoritative category vocabularies (NOT token overlap with random other sub-
// subjects, which produces false positives like "Ravi River -> Art & Culture").
// Each sub-subject's rare/discriminative tokens are scored against those curated
// vocabularies. Only sub-subjects whose best-matching OTHER category clearly wins
// are reported. DRY-RUN: writes nothing.
// Usage: node scripts/analyze-misplaced-subjects.js [minScoreGap]

const fs = require('fs');
const path = require('path');

const QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');
const FILL_SCRIPT = path.join(__dirname, 'wiki-fill-all.cjs');
const MIN_GAP = parseFloat(process.argv[2] || '2.0');

const STOP = new Set([
  'a','an','the','of','in','on','for','and','or','to','at','by','with','from','as','is','are',
  'was','were','it','its','their','this','that','be','been','being','indian','india',
  'government','national','international','day','year','history','category',
  'new','list','city','town','village','district','river','people','group',
  '','–','-','&','i','ii','iii','iv','v','vi','vii','viii','ix','x'
]);

function tokenize(s) {
  return (s.toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9&]+/g, ' ')
    .split(' ')
    .filter(t => t.length > 2 && !STOP.has(t)));
}

// Parse CATEGORIES from wiki-fill-all.cjs: name + topics (curated, authoritative).
function curatedVocab() {
  const src = fs.readFileSync(FILL_SCRIPT, 'utf8').replace(/\r/g, '');
  const arrMatch = src.match(/const CATEGORIES = \[([\s\S]*?)\n\];/);
  const arr = arrMatch[1];
  const blocks = [...arr.matchAll(/\{\s*name:\s*'([^']+)'([\s\S]*?)(?=\n\s*\]\},)/g)];
  const out = {};
  for (const b of blocks) {
    const name = b[1];
    const ti = b[2].indexOf('topics:[');
    if (ti === -1) continue;
    const body = b[2].slice(ti + 8);
    const topics = [...body.matchAll(/'([^']+)'/g)].map(m => m[1]);
    out[name] = topics;
  }
  return out;
}

function loadSubs() {
  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json') && !['catalog.json', 'manifest.json'].includes(f));
  const cats = {};
  for (const file of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf8')); } catch { continue; }
    const subject = Object.keys(data)[0];
    if (!cats[subject]) cats[subject] = {};
    const ss = data[subject].subSubjects || {};
    for (const [name, qs] of Object.entries(ss)) {
      cats[subject][name] = (cats[subject][name] || 0) + qs.length;
    }
  }
  return cats;
}

function main() {
  const subs = loadSubs();
  const vocab = curatedVocab();
  const fillSubjects = new Set(Object.keys(vocab));
  console.log('Curated categories with topic vocabularies: ' + fillSubjects.size);
  console.log('Data sub-subjects loaded across ' + Object.keys(subs).length + ' subjects');

  // TF-IDF over curated vocabularies: idf = log(total cats / cats containing token)
  const catNames = Object.keys(vocab);
  const docFreq = {};
  for (const c of catNames) {
    new Set(vocab[c].flatMap(tokenize)).forEach(t => docFreq[t] = (docFreq[t] || 0) + 1);
  }
  const idf = t => Math.log((catNames.length + 1) / ((docFreq[t] || 0) + 1)) + 0.5;
  const catVec = {};
  for (const c of catNames) {
    const v = {};
    for (const t of new Set(vocab[c].flatMap(tokenize))) v[t] = idf(t);
    catVec[c] = v;
  }

  function scoreFor(cat, toks) {
    const vec = catVec[cat] || {};
    return toks.reduce((a, t) => a + (vec[t] || 0), 0);
  }

  let totalMoved = 0, flaggedCats = 0, flagged = [];
  const byCat = {};

  for (const subject of Object.keys(subs)) {
    for (const name of Object.keys(subs[subject])) {
      const n = subs[subject][name];
      const toks = tokenize(name);
      if (!toks.length) continue;

      let best = '', bestScore = 0;
      for (const c of catNames) {
        if (c === subject) continue;
        const sc = scoreFor(c, toks);
        if (sc > bestScore) { bestScore = sc; best = c; }
      }
      const ownScore = scoreFor(subject, toks);
      // Only move when the OTHER category clearly beats the current one, AND at
      // least one rare token actually matched the winning vocabulary.
      if (best && bestScore >= ownScore + MIN_GAP) {
        const matchedToks = toks.filter(t => catVec[best][t] && !catVec[subject][t]);
        if (!matchedToks.length) continue;
        totalMoved += n;
        if (!byCat[subject]) byCat[subject] = [];
        byCat[subject].push({ sub: name, n, to: best, gap: (bestScore - ownScore).toFixed(1), matched: matchedToks.join(',') });
      }
    }
  }

  console.log('Candidates (other-category curated vocabulary wins by ' + MIN_GAP + '): ' + totalMoved + ' questions');
  console.log('--- By source category ---');
  Object.entries(byCat)
    .map(([c, items]) => [c, items, items.reduce((x, y) => x + y.n, 0)])
    .sort((a, b) => b[2] - a[2])
    .forEach(([c, items, total]) => {
      console.log('\n' + c + ': ' + total + ' qs in ' + items.length + ' subs');
      items.sort((a, b) => b.n - a.n).slice(0, 20).forEach(d =>
        console.log('   ' + d.sub + ' (' + d.n + ') -> ' + d.to + ' [gap=' + d.gap + ' match=' + d.matched + ']'));
      if (items.length > 20) console.log('   ... and ' + (items.length - 20) + ' more');
    });
}

main();