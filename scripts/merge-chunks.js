const fs = require('fs');
const path = require('path');

const CHUNKS_DIR = path.join(__dirname, '..', 'chunks');
const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');
const LINK_POOL_PATH = path.join(__dirname, '..', 'data', 'wiki-link-pool.json');

function norm(s) {
  return String(s).replace(/\s+/g, ' ').trim().toLowerCase();
}

function main() {
  if (!fs.existsSync(CHUNKS_DIR)) {
    console.error('No chunks/ directory found. Nothing to merge.');
    process.exit(0);
  }

  const chunkFiles = fs.readdirSync(CHUNKS_DIR).filter(f => f.endsWith('.json') && f.startsWith('quiz-chunk-'));
  if (chunkFiles.length === 0) {
    console.error('No chunk output files found in chunks/. Nothing to merge.');
    process.exit(0);
  }
  console.log('Found ' + chunkFiles.length + ' chunk output files');

  // Load existing quiz.json
  let allQuestions = [];
  if (fs.existsSync(QUIZ_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'));
      allQuestions = existing.questions || [];
      console.log('Existing quiz.json: ' + allQuestions.length + ' questions');
    } catch (e) {
      console.error('Error reading quiz.json: ' + e.message);
    }
  }

  const seen = new Set(allQuestions.map(q => norm(q.question)));
  const byKey = new Map(allQuestions.map(q => [norm(q.question), q]));

  // Merge each chunk's output
  let added = 0;
  const linkPool = {};
  try {
    const existingPool = JSON.parse(fs.readFileSync(LINK_POOL_PATH, 'utf8'));
    Object.entries(existingPool).forEach(([c, titles]) => { linkPool[c] = titles; });
  } catch (e) { /* no existing pool */ }
  for (const f of chunkFiles) {
    try {
      const chunkData = JSON.parse(fs.readFileSync(path.join(CHUNKS_DIR, f), 'utf8'));
      const qs = chunkData.questions || [];
      let chunkAdded = 0;
      for (const q of qs) {
        const key = norm(q.question);
        if (!seen.has(key)) {
          allQuestions.push(q);
          seen.add(key);
          byKey.set(key, q);
          chunkAdded++;
        } else if (q.wikiDone) {
          // Carry the "fully covered" marker onto the already-existing question
          // so partial articles stop being re-fetched on future runs.
          const existing = byKey.get(key);
          if (existing && !existing.wikiDone) existing.wikiDone = true;
        }
      }
      // Aggregate this chunk's linked-page pool so partially-mined linked
      // pages get finished by the revisit pool on future runs.
      if (chunkData.linkPool && typeof chunkData.linkPool === 'object') {
        Object.entries(chunkData.linkPool).forEach(([c, titles]) => {
          if (!Array.isArray(titles)) return;
          linkPool[c] = [...new Set([...(linkPool[c] || []), ...titles])];
        });
      }
      console.log('  ' + f + ': ' + qs.length + ' questions (' + chunkAdded + ' new)');
      added += chunkAdded;
    } catch (e) {
      console.error('  ' + f + ': ERROR ' + e.message);
    }
  }

  // Write merged quiz.json
  fs.writeFileSync(QUIZ_PATH, JSON.stringify({ questions: allQuestions }));
  console.log('Wrote quiz.json: ' + allQuestions.length + ' total (' + added + ' new from chunks)');

  // Prune fully-mined titles from the pool so it only holds in-progress pages.
  // A title is "done" once every question carrying it has wikiDone=true.
  const doneTitles = new Set();
  const titleQuestionCount = new Map();
  allQuestions.forEach(q => {
    if (!q.subSubject) return;
    const k = norm(q.subSubject);
    titleQuestionCount.set(k, (titleQuestionCount.get(k) || 0) + 1);
    if (q.wikiDone) doneTitles.add(k);
  });
  const fullyDone = new Set();
  Object.keys(linkPool).forEach(c => {
    linkPool[c] = (linkPool[c] || []).filter(t => {
      const k = norm(t);
      const isDone = doneTitles.has(k);
      if (isDone) fullyDone.add(t);
      return !isDone;
    });
  });
  if (fullyDone.size) {
    console.log('Pruned ' + fullyDone.size + ' fully-mined titles from link pool');
  }

  try {
    fs.writeFileSync(LINK_POOL_PATH, JSON.stringify(linkPool, null, 1));
    const totalPool = Object.values(linkPool).reduce((s, a) => s + a.length, 0);
    console.log('Wrote linked-page pool: ' + totalPool + ' titles across ' + Object.keys(linkPool).length + ' categories');
  } catch (e) {
    console.error('Could not write link pool: ' + e.message);
  }

  console.log('Now running build-archive-single.js...');
}

main();
