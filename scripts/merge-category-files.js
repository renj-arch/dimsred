const fs = require('fs');
const path = require('path');

const sourceDir = process.argv[2];
const targetDir = process.argv[3] || path.join(__dirname, '..', 'data', 'questions');

if (!sourceDir || !fs.existsSync(sourceDir)) {
  console.error('Usage: node merge-category-files.js <source-dir> [target-dir]');
  console.error('Merges questions from source per-category files into target per-category files');
  process.exit(1);
}

function normQ(q) {
  return ((q.question || '') + '||' + (q.answer || '')).toLowerCase().replace(/\s+/g, ' ').trim();
}

function flatQuestions(catFile) {
  const out = [];
  for (const [, subjData] of Object.entries(catFile)) {
    if (!subjData.subSubjects) continue;
    for (const [, qs] of Object.entries(subjData.subSubjects)) {
      for (const q of qs) out.push(q);
    }
  }
  return out;
}

function rebuild(qs) {
  const cat = {};
  for (const q of qs) {
    const subject = q.subject || 'Uncategorized';
    const subSubject = q.subSubject || 'General';
    if (!cat[subject]) cat[subject] = { subSubjects: {} };
    if (!cat[subject].subSubjects[subSubject]) cat[subject].subSubjects[subSubject] = [];
    cat[subject].subSubjects[subSubject].push(q);
  }
  return cat;
}

const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.json') && f !== 'manifest.json');
let totalMerged = 0;

for (const f of files) {
  const srcPath = path.join(sourceDir, f);
  const tgtPath = path.join(targetDir, f);

  let srcData;
  try { srcData = JSON.parse(fs.readFileSync(srcPath, 'utf8')); }
  catch (e) { continue; }

  let tgtData = {};
  try { tgtData = JSON.parse(fs.readFileSync(tgtPath, 'utf8')); }
  catch (e) { /* target doesn't exist yet — that's fine */ }

  const srcQs = flatQuestions(srcData);
  const tgtQs = flatQuestions(tgtData);
  const seen = new Set(tgtQs.map(normQ));
  let added = 0;

  for (const q of srcQs) {
    if (!seen.has(normQ(q))) {
      tgtQs.push(q);
      seen.add(normQ(q));
      added++;
    }
  }

  if (added > 0) {
    const mergedCat = rebuild(tgtQs);
    fs.writeFileSync(tgtPath, JSON.stringify(mergedCat));
    totalMerged++;
    console.log('  ' + f + ': added ' + added + ' questions');
  }
}

console.log('Merged ' + totalMerged + ' category files');
