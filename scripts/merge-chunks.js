const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { iterQuizQuestions, createStreamingShardWriter } = require('./lib/quiz-store');

const CHUNKS_DIR = path.join(__dirname, '..', 'chunks');
const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');
const LINK_POOL_PATH = path.join(__dirname, '..', 'data', 'wiki-link-pool.json');
const STATE_DIR = path.join(CHUNKS_DIR, '.merge-state');
const NEW_QUESTIONS_PATH = path.join(STATE_DIR, 'new.jsonl');
const CARRY_PATH = path.join(STATE_DIR, 'carry.txt');
const SEEN_PATH = path.join(STATE_DIR, 'seen.txt');
const LOOP_POOL_PATH = path.join(STATE_DIR, 'linkpool.json');

function norm(s) {
  return String(s).replace(/\s+/g, ' ').trim().toLowerCase();
}

// Compact hash for dedup: SHA-256 truncated to 16 bytes (base64 = 22 chars).
function compactKey(s) {
  return crypto.createHash('sha256').update(s).digest('base64').slice(0, 22);
}

// ── Bloom filter: replaces Set to avoid V8 "Set maximum size exceeded" ──
// 64MB bit array + 7 hash functions → holds 30M+ keys with <0.1% false positives.
// Fixed memory regardless of key count. Has same add()/has() interface as Set.
class BloomFilter {
  constructor(bits) {
    this.bits = bits || (64 * 1024 * 1024 * 8); // 64MB = 536M bits
    this.arr = new Uint8Array(Math.ceil(this.bits / 8));
    this.k = 7; // number of hash functions
    this.count = 0;
  }
  _hashes(key) {
    const h1 = crypto.createHash('sha256').update(key).digest();
    const h2 = crypto.createHash('sha256').update(h1).digest();
    const a = h1.readUInt32LE(0), b = h1.readUInt32LE(4);
    const c = h2.readUInt32LE(0), d = h2.readUInt32LE(4);
    const out = [];
    for (let i = 0; i < this.k; i++) {
      out.push(((a + i * b + i * c * 31) >>> 0) % this.bits);
    }
    return out;
  }
  add(key) {
    for (const pos of this._hashes(key)) {
      this.arr[pos >> 3] |= (1 << (pos & 7));
    }
    this.count++;
  }
  has(key) {
    for (const pos of this._hashes(key)) {
      if (!(this.arr[pos >> 3] & (1 << (pos & 7)))) return false;
    }
    return true;
  }
  get size() { return this.count; }
  // Save bit array to disk
  save(filePath) {
    fs.writeFileSync(filePath, this.arr);
  }
  // Load bit array from disk
  static load(filePath) {
    const bf = new BloomFilter();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      bf.arr.set(data);
      bf.count = data.length; // approximate
    }
    return bf;
  }
  // Iterate keys (needed by saveSeen compatibility) — not supported for Bloom
  [Symbol.iterator]() {
    // Yield nothing — callers should use save() instead
    return [][Symbol.iterator]();
  }
}

function listChunkFiles() {
  if (!fs.existsSync(CHUNKS_DIR)) return [];
  return fs.readdirSync(CHUNKS_DIR).filter(f => f.endsWith('.json') && f.startsWith('quiz-chunk-'));
}

// Load the dedup-key set for a `collect` run. The first collect builds it from
// the baseline quiz.json (one full pass) and persists it; later collects (each
// a fresh process) just reload it, so no per-chunk full corpus pass is needed.
// Save/load dedup using BloomFilter (avoids Set size limit with 16M+ keys)
function saveSeen(seen) {
  return new Promise((resolve, reject) => {
    try {
      fs.mkdirSync(STATE_DIR, { recursive: true });
      if (seen instanceof BloomFilter) {
        seen.save(SEEN_PATH);
        console.log('Saved BloomFilter dedup: ' + seen.size + ' keys');
        resolve();
      } else {
        // Fallback: original Set-based save
        const ws = fs.createWriteStream(SEEN_PATH);
        ws.on('finish', resolve);
        ws.on('error', reject);
        let buf = '';
        for (const k of seen) {
          buf += k + '\n';
          if (buf.length >= 8 * 1024 * 1024) { ws.write(buf); buf = ''; }
        }
        if (buf) ws.write(buf);
        ws.end();
      }
    } catch (e) { reject(e); }
  });
}

function loadSeen() {
  const BLOOM_PATH = SEEN_PATH + '.bloom';
  if (fs.existsSync(BLOOM_PATH)) {
    const bf = BloomFilter.load(BLOOM_PATH);
    console.log('Loaded BloomFilter dedup: ~' + bf.size + ' keys (' + Math.round(bf.arr.length / 1024 / 1024) + 'MB)');
    return Promise.resolve(bf);
  }
  // Legacy: text file of keys
  if (fs.existsSync(SEEN_PATH)) {
    const bf = new BloomFilter();
    return new Promise((resolve) => {
      const rl = readline.createInterface({ input: fs.createReadStream(SEEN_PATH), crlfDelay: Infinity });
      let n = 0;
      rl.on('line', (l) => { if (l) { bf.add(l); n++; } });
      rl.on('close', () => {
        console.log('Migrated ' + n + ' keys to BloomFilter');
        bf.save(BLOOM_PATH);
        resolve(bf);
      });
    });
  }
  return (async () => {
    const bf = new BloomFilter();
    if (fs.existsSync(QUIZ_PATH)) {
      iterQuizQuestions(QUIZ_PATH, (q) => { bf.add(compactKey(norm(q.question))); });
    }
    bf.save(BLOOM_PATH);
    console.log('Built BloomFilter from quiz.json: ~' + bf.size + ' questions');
    return bf;
  })();
}

// Load the per-run accumulated chunk link pools (merged with the committed
// pool during finalize).
function loadLoopPool() {
  try {
    return JSON.parse(fs.readFileSync(LOOP_POOL_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}

// collect: consume chunks/, appending only the delta (new questions, carry
// keys, new dedup keys, link-pool additions) to .merge-state. Never touches
// quiz.json, so every chunk costs one chunk read instead of a full corpus
// pass. Deleting the chunk files as they are consumed keeps ~1 chunk on disk.
async function collectChunks() {
  const chunkFiles = listChunkFiles();
  if (chunkFiles.length === 0) {
    console.error('No chunk output files found in chunks/. Nothing to collect.');
    return;
  }
  console.log('Found ' + chunkFiles.length + ' chunk output files');
  const seen = await loadSeen();
  consumeChunks(chunkFiles, seen);
}

function consumeChunks(chunkFiles, seen) {
  const linkPool = loadLoopPool();

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
      const newSeen = [];
      const consume = (qs) => {
        for (const q of qs) {
          chunkTotal++;
          const key = norm(q.question);
          const ck = compactKey(key);
          if (!seen.has(ck)) {
            seen.add(ck);
            newSeen.push(ck);
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

      fs.mkdirSync(STATE_DIR, { recursive: true });
      if (newQbuf.length) fs.appendFileSync(NEW_QUESTIONS_PATH, newQbuf.join('\n') + '\n');
      if (carryBuf.length) fs.appendFileSync(CARRY_PATH, carryBuf.join('\n') + '\n');
      if (newSeen.length) fs.appendFileSync(SEEN_PATH, newSeen.join('\n') + '\n');

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

  fs.writeFileSync(LOOP_POOL_PATH, JSON.stringify(linkPool, null, 1));
  console.log('Collected chunks into .merge-state (ready for finalize)');
}

// finalize: drain .merge-state once — apply carry patches to the existing
// quiz.json, append every collected new question, prune the link pool. This is
// the only full pass over the corpus, so it happens exactly once per run.
async function finalizeChunks() {
  if (!fs.existsSync(STATE_DIR)) {
    console.error('No .merge-state found. Nothing to finalize.');
    return;
  }

  // Load carry keys into a small in-memory Set for the write pass
  const carry = new Set();
  try {
    const lines = fs.readFileSync(CARRY_PATH, 'utf8').split('\n').filter(Boolean);
    for (const l of lines) carry.add(l);
  } catch (e) { /* empty */ }

  // Stream-merge into a temp file (existing patched + new from state)
  const TMP = QUIZ_PATH + '.merging';
  try { fs.unlinkSync(TMP); } catch (e) {}
  for (let i = 0; i < 1000; i++) { try { fs.unlinkSync(TMP + '.part.' + i); } catch (e) { break; } }

  const writer = createStreamingShardWriter(TMP);
  let total = 0;
  let added = 0;
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
  // Stream new questions collected across all chunks. A question that was both
  // newly added and carried by a later chunk gets the same wikiDone patch the
  // merge path would have applied.
  await new Promise((resolve) => {
    if (!fs.existsSync(NEW_QUESTIONS_PATH)) { resolve(); return; }
    const rl = readline.createInterface({ input: fs.createReadStream(NEW_QUESTIONS_PATH), crlfDelay: Infinity });
    rl.on('line', (line) => {
      if (!line) return;
      const q = JSON.parse(line);
      const key = norm(q.question);
      if (carry.has(key) && q.wikiDone !== true) {
        q.wikiDone = true;
        carried++;
      }
      writer.add(q);
      total++;
      added++;
    });
    rl.on('close', () => resolve());
  });
  const res = writer.finish();
  console.log('Wrote quiz.json: ' + total + ' total (' + added + ' new, ' + carried + ' wikiDone handled) across ' + (res.shards || 0) + ' shards');

  // Atomically swap temp file in for the real quiz.json
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
    return;
  }

  // Prune fully-mined titles from the pool. Combine the committed pool with the
  // pools the chunks contributed this run, then drop any title whose questions
  // are all wikiDone=true in the final quiz.json.
  const linkPool = {};
  try {
    const existingPool = JSON.parse(fs.readFileSync(LINK_POOL_PATH, 'utf8'));
    Object.entries(existingPool).forEach(([c, titles]) => { linkPool[c] = titles; });
  } catch (e) { /* no existing pool */ }
  try {
    const loopPool = JSON.parse(fs.readFileSync(LOOP_POOL_PATH, 'utf8'));
    Object.entries(loopPool).forEach(([c, titles]) => {
      if (!Array.isArray(titles)) return;
      linkPool[c] = [...new Set([...(linkPool[c] || []), ...titles])];
    });
  } catch (e) { /* no loop pool */ }

  const doneTitles = new Set();
  const titleQuestionCount = new Map();
  if (fs.existsSync(QUIZ_PATH)) {
    iterQuizQuestions(QUIZ_PATH, (q) => {
      if (!q.subSubject) return;
      const k = norm(q.subSubject);
      titleQuestionCount.set(k, (titleQuestionCount.get(k) || 0) + 1);
      if (q.wikiDone) doneTitles.add(k);
    });
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

  // The collection state is fully drained — drop it so the next run starts clean.
  try { fs.rmSync(STATE_DIR, { recursive: true, force: true }); } catch (e) {}
}

async function main() {
  const mode = (process.argv[2] || '').trim();
  if (mode === 'collect') return collectChunks();
  if (mode === 'finalize') return finalizeChunks();

  // Legacy one-shot merge: assumes every chunk in chunks/ plus quiz.json is the
  // full picture, applies the whole merge in one process. Kept unchanged for
  // recover-wiki-fill.yml and manual/standalone runs.
  const chunkFiles = listChunkFiles();
  if (chunkFiles.length === 0) {
    console.error('No chunk output files found in chunks/. Nothing to merge.');
    process.exit(0);
  }
  console.log('Found ' + chunkFiles.length + ' chunk output files');

  // ── Pass 1: index existing questions by streaming the shards ──
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
  let added = 0;

  try { fs.unlinkSync(NEW_QUESTIONS_PATH); } catch (e) {}
  try { fs.unlinkSync(CARRY_PATH); } catch (e) {}
  fs.mkdirSync(STATE_DIR, { recursive: true });

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

      if (newQbuf.length) fs.appendFileSync(NEW_QUESTIONS_PATH, newQbuf.join('\n') + '\n');
      if (carryBuf.length) fs.appendFileSync(CARRY_PATH, carryBuf.join('\n') + '\n');

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

main().catch((e) => { console.error('FATAL: ' + e.message); process.exit(1); });