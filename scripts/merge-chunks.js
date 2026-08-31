const fs = require('fs');
const path = require('path');
const { iterQuizQuestions, createStreamingShardWriter } = require('./lib/quiz-store');

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

  // ── Pass 1: index existing questions by streaming the shards ──
  // Only the normalized question KEY is kept in memory (a Set), never the full
  // question objects. The current quiz.json is sharded across ~4 files totaling
  // ~940MB with ~6.1M questions; materializing every object (readQuiz) plus the
  // seen/byKey structures blew the 7GB runner heap (FATAL OOM). Streaming the
  // keys keeps peak memory to roughly one key-set + one shard at a time.
  const seen = new Set();
  const existingWikiDone = new Set();
  let existingCount = 0;
  if (fs.existsSync(QUIZ_PATH)) {
    try {
      iterQuizQuestions(QUIZ_PATH, (q) => {
        existingCount++;
        const key = norm(q.question);
        seen.add(key);
        if (q.wikiDone) existingWikiDone.add(key);
      });
      console.log('Existing quiz.json: ' + existingCount + ' questions');
    } catch (e) {
      console.error('Error reading quiz.json: ' + e.message);
    }
  }

  // ── Load linked-page pool (small) ──
  const linkPool = {};
  try {
    const existingPool = JSON.parse(fs.readFileSync(LINK_POOL_PATH, 'utf8'));
    Object.entries(existingPool).forEach(([c, titles]) => { linkPool[c] = titles; });
  } catch (e) { /* no existing pool */ }

  // ── Pass 2: stream each chunk, collect ONLY new questions ──
  // carry holds keys where a chunk marks an already-existing question as
  // wikiDone (so we can patch those existing questions during the write pass).
  const carry = new Set();
  const newQuestions = [];
  let added = 0;

  for (const f of chunkFiles) {
    try {
      const chunkPath = path.join(CHUNKS_DIR, f);
      const primary = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
      let chunkTotal = 0;
      let chunkAdded = 0;

      if (primary.linkPool && typeof primary.linkPool === 'object') {
        Object.entries(primary.linkPool).forEach(([c, titles]) => {
          if (!Array.isArray(titles)) return;
          linkPool[c] = [...new Set([...(linkPool[c] || []), ...titles])];
        });
      }

      const consume = (qs) => {
        for (const q of qs) {
          chunkTotal++;
          const key = norm(q.question);
          if (!seen.has(key)) {
            seen.add(key);
            newQuestions.push(q);
            chunkAdded++;
          } else if (q.wikiDone) {
            carry.add(key);
          }
        }
      };

      if (primary.shardCount) {
        for (let i = 0; i < primary.shardCount; i++) {
          const part = JSON.parse(fs.readFileSync(chunkPath + '.part.' + i, 'utf8'));
          consume(part.questions || []);
        }
      } else {
        consume(primary.questions || []);
      }

      console.log('  ' + f + ': ' + chunkTotal + ' questions (' + chunkAdded + ' new)');
      added += chunkAdded;

      // Free disk as we go: each chunk is a full quiz copy sharded across many
      // files. Removing it after consuming caps peak disk usage at ~1 chunk.
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

  // ── Pass 3: stream-merge into a temp file (existing patched + new) ──
  // We never hold the full question list in memory: existing questions are
  // streamed one shard at a time into the writer, and only this run's genuinely
  // new questions are in memory at once.
  const TMP = QUIZ_PATH + '.merging';
  try { fs.unlinkSync(TMP); } catch (e) {}
  for (let i = 0; i < 1000; i++) { try { fs.unlinkSync(TMP + '.part.' + i); } catch (e) { break; } }

  const writer = createStreamingShardWriter(TMP);
  let total = 0;
  let carried = 0;
  if (fs.existsSync(QUIZ_PATH)) {
    try {
      iterQuizQuestions(QUIZ_PATH, (q) => {
        const key = norm(q.question);
        if (carry.has(key) && !q.wikiDone) {
          q.wikiDone = true;
          carried++;
        }
        writer.add(q);
        total++;
      });
    } catch (e) {
      console.error('Error re-streaming quiz.json for write: ' + e.message);
    }
  }
  for (const q of newQuestions) {
    writer.add(q);
    total++;
  }
  newQuestions.length = 0;
  const res = writer.finish();
  console.log('Wrote quiz.json: ' + total + ' total (' + added + ' new, ' + carried + ' wikiDone carried) across ' + (res.shards || 0) + ' shards');

  // ── Atomically swap temp file in for the real quiz.json ──
  if (res.shards) {
    for (let i = 0; i < 1000; i++) {
      const sp = QUIZ_PATH + '.part.' + i;
      try { fs.unlinkSync(sp); } catch (e) { break; }
    }
    for (let i = 0; i < res.shards; i++) {
      fs.renameSync(TMP + '.part.' + i, QUIZ_PATH + '.part.' + i);
    }
    fs.renameSync(TMP, QUIZ_PATH);
  } else {
    console.error('No questions written — leaving existing quiz.json untouched.');
  }

  // ── Prune fully-mined titles from the pool ──
  // A title is "done" once every question carrying it has wikiDone=true.
  const doneTitles = new Set();
  const titleQuestionCount = new Map();
  const tally = (q) => {
    if (!q.subSubject) return;
    const k = norm(q.subSubject);
    titleQuestionCount.set(k, (titleQuestionCount.get(k) || 0) + 1);
    if (q.wikiDone) doneTitles.add(k);
  };
  if (fs.existsSync(QUIZ_PATH)) {
    iterQuizQuestions(QUIZ_PATH, tally);
  }
  for (const q of newQuestions) tally(q);

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
