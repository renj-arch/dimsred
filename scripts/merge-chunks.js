const fs = require('fs');
const path = require('path');
const { readQuiz, writeQuizQuestions } = require('./lib/quiz-store');

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
      const existing = readQuiz(QUIZ_PATH);
      allQuestions = existing.questions || [];
      console.log('Existing quiz.json: ' + allQuestions.length + ' questions');
    } catch (e) {
      console.error('Error reading quiz.json: ' + e.message);
    }
  }

  const seen = new Set(allQuestions.map(q => norm(q.question)));
  const byKey = new Map(allQuestions.map(q => [norm(q.question), q]));

  // Merge each chunk's output.
  // Each chunk artifact is itself a full copy of the quiz (sharded into
  // .part.N files), so we stream its parts one at a time instead of calling
  // readQuiz() which would hold a second ~3M-question array in memory on top
  // of allQuestions/seen/byKey and OOM the 7GB runner heap.
  let added = 0;
  const linkPool = {};
  try {
    const existingPool = JSON.parse(fs.readFileSync(LINK_POOL_PATH, 'utf8'));
    Object.entries(existingPool).forEach(([c, titles]) => { linkPool[c] = titles; });
  } catch (e) { /* no existing pool */ }

  function consumeQuestions(qs, f) {
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
    return chunkAdded;
  }

  for (const f of chunkFiles) {
    try {
      const chunkPath = path.join(CHUNKS_DIR, f);
      // Primary file holds top-level fields (linkPool, shardCount, questions).
      const primary = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
      let chunkTotal = 0;
      let chunkAdded = 0;
      if (primary.shardCount) {
        // Aggregate this chunk's linked-page pool so partially-mined linked
        // pages get finished by the revisit pool on future runs.
        if (primary.linkPool && typeof primary.linkPool === 'object') {
          Object.entries(primary.linkPool).forEach(([c, titles]) => {
            if (!Array.isArray(titles)) return;
            linkPool[c] = [...new Set([...(linkPool[c] || []), ...titles])];
          });
        }
        // Stream parts one at a time so only ~1/N of the chunk is in memory.
        for (let i = 0; i < primary.shardCount; i++) {
          const part = JSON.parse(fs.readFileSync(chunkPath + '.part.' + i, 'utf8'));
          const qs = part.questions || [];
          chunkTotal += qs.length;
          chunkAdded += consumeQuestions(qs, f);
        }
      } else {
        const qs = primary.questions || [];
        chunkTotal = qs.length;
        chunkAdded += consumeQuestions(qs, f);
        if (primary.linkPool && typeof primary.linkPool === 'object') {
          Object.entries(primary.linkPool).forEach(([c, titles]) => {
            if (!Array.isArray(titles)) return;
            linkPool[c] = [...new Set([...(linkPool[c] || []), ...titles])];
          });
        }
      }
      console.log('  ' + f + ': ' + chunkTotal + ' questions (' + chunkAdded + ' new)');
      added += chunkAdded;
      // Free disk as we go: each chunk is a full quiz copy (~1 GB sharded) and
      // holding all 27 simultaneously blew the runner mid-merge (run #458).
      try {
        fs.unlinkSync(chunkPath);
        if (primary.shardCount) {
          for (let i = 0; i < primary.shardCount; i++) fs.unlinkSync(chunkPath + '.part.' + i);
        }
      } catch (e2) { /* best-effort cleanup */ }
    } catch (e) {
      console.error('  ' + f + ': ERROR ' + e.message);
    }
  }

  // Write merged quiz.json
  writeQuizQuestions(QUIZ_PATH, allQuestions);
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
