const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { iterQuizQuestions, createStreamingShardWriter } = require('./lib/quiz-store');

const CHUNKS_DIR = path.join(__dirname, '..', 'chunks');
const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');
const LINK_POOL_PATH = path.join(__dirname, '..', 'data', 'wiki-link-pool.json');
const NEW_QUESTIONS_PATH = path.join(CHUNKS_DIR, '.new-questions.jsonl');
const CARRY_PATH = path.join(CHUNKS_DIR, '.carry-keys.txt');

function norm(s) {
  return String(s).replace(/\s+/g, ' ').trim().toLowerCase();
}

// Compact hash for dedup: SHA-256 truncated to 16 bytes (base64 = 22 chars).
// 6M keys x 22 bytes ~ 132 MB vs ~1.5 GB for full normalized strings.
function compactKey(s) {
  return crypto.createHash('sha256').update(s).digest('base64').slice(0, 22);
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
  // Uses compact SHA-256 hashes instead of full normalized question strings to
  // keep the dedup Set under ~200 MB even for 6M+ questions (previously the
  // full-string Set consumed ~1.5 GB, causing OOM in later passes).
  const seen = new Set();
  let existingCount = 0;
  if (fs.existsSync(QUIZ_PATH)) {
    try {
      iterQuizQuestions(QUIZ_PATH, (q) => {
        existingCount++;
        seen.add(compactKey(norm(q.question)));
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

  // ── Pass 2: stream each chunk, write new questions + carry keys to disk ──
  // Instead of accumulating new questions in an in-memory array (which grows
  // unbounded and contributed to the OOM), each new question is appended to a
  // newline-delimited JSON temp file. Carry keys (existing questions whose
  // wikiDone flag needs patching) are similarly flushed to disk.
  let added = 0;

  // Remove stale temp files from prior failed runs
  try { fs.unlinkSync(NEW_QUESTIONS_PATH); } catch (e) {}
  try { fs.unlinkSync(CARRY_PATH); } catch (e) {}

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

      const newQbuf = [];
      const carryBuf = [];
      const consume = (qs) => {
        for (const q of qs) {
          chunkTotal++;
          const key = norm(q.question);
          const ck = compactKey(key);
          if (!seen.has(ck)) {
            seen.add(ck);
            newQbuf.push(JSON.stringify(q));
            chunkAdded++;
          } else if (q.wikiDone) {
            carryBuf.push(key);
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

      // Flush per-chunk buffers to disk so they don't accumulate across chunks
      if (newQbuf.length) fs.appendFileSync(NEW_QUESTIONS_PATH, newQbuf.join('\n') + '\n');
      if (carryBuf.length) fs.appendFileSync(CARRY_PATH, carryBuf.join('\n') + '\n');

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

  // Load carry keys into a small in-memory Set for the write pass
  const carry = new Set();
  try {
    const lines = fs.readFileSync(CARRY_PATH, 'utf8').split('\n').filter(Boolean);
    for (const l of lines) carry.add(l);
  } catch (e) { /* empty */ }

  // ── Pass 3: stream-merge into a temp file (existing patched + new from disk) ──
  // Existing questions are streamed one shard at a time into the writer, and
  // new questions are read line-by-line from the temp JSONL file — nothing
  // large lives in memory at once.
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
  // Stream new questions from the temp JSONL file
  try {
    const newQdata = fs.readFileSync(NEW_QUESTIONS_PATH, 'utf8');
    for (const line of newQdata.split('\n')) {
      if (!line) continue;
      writer.add(JSON.parse(line));
      total++;
    }
  } catch (e) {
    console.error('Error reading new questions temp file: ' + e.message);
  }
  // Clean up temp files
  try { fs.unlinkSync(NEW_QUESTIONS_PATH); } catch (e) {}
  try { fs.unlinkSync(CARRY_PATH); } catch (e) {}
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
  // The merged quiz.json already includes the new questions, so streaming it
  // covers both existing and newly-added questions.
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
