const fs = require('fs');
const path = require('path');
const { MAX_SHARD_BYTES } = require('./lib/quiz-store');

const questionsDir = process.env.REBUILD_QUESTIONS_DIR || path.join(__dirname, '..', 'data', 'questions');
const quizPath = process.env.REBUILD_QUIZ_PATH || path.join(__dirname, '..', 'data', 'quiz.json');

if (!fs.existsSync(questionsDir)) {
  fs.mkdirSync(questionsDir, { recursive: true });
  fs.writeFileSync(quizPath, JSON.stringify({ questions: [] }));
  console.log('Created data/questions/ directory; wrote empty quiz.json');
  process.exit(0);
}

// Streamed rebuild of quiz.json (+ .part.N shards).
//
// The old implementation pushed every question object into one array and handed
// it to quiz-store.writeQuiz(), which holds the whole corpus in memory while it
// measures shard sizes. That heap grows without bound as the corpus grows and is
// the pipeline's next heap ceiling after the archive build. This mirrors
// writeQuiz's exact shard-splitting algorithm (same HEADER, per-question JSON
// byte length and flush threshold) and identical file layout, but feeds it one
// category file at a time, so peak heap is bounded by a single category file plus
// at most one ~300 MiB shard buffer instead of the full corpus.
const HEADER = Buffer.byteLength('{"questions":[]}');
const shards = [];
let cur = [];
let curLen = HEADER;

function removeParts(p) {
  for (let i = 0; fs.existsSync(p + '.part.' + i); i++) fs.unlinkSync(p + '.part.' + i);
}

let total = 0;
const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json') && f !== 'manifest.json' && f !== 'archive-cat-index.json');

files.forEach(f => {
  try {
    let content = fs.readFileSync(path.join(questionsDir, f), 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const data = JSON.parse(content);
    Object.entries(data).forEach(([subject, subjData]) => {
      if (subjData.subSubjects) {
        Object.entries(subjData.subSubjects).forEach(([subSubject, qs]) => {
          for (const q of qs) {
            const qLen = Buffer.byteLength(JSON.stringify(q));
            if (cur.length && curLen + qLen + 1 > MAX_SHARD_BYTES) {
              shards.push(cur);
              cur = [];
              curLen = HEADER;
            }
            cur.push(q);
            curLen += qLen + 1;
            total++;
          }
        });
      }
    });
  } catch (e) {
    console.error('  Skipping ' + f + ': ' + e.message);
  }
});

// Drop stale .part.N files from a previous (larger) corpus, then write the new
// shards with the primary LAST so its shardCount only advertises files that are
// already on disk.
removeParts(quizPath);
if (shards.length === 0) {
  fs.writeFileSync(quizPath, JSON.stringify({ questions: cur }));
} else {
  shards.push(cur);
  shards.forEach((sh, i) => {
    fs.writeFileSync(quizPath + '.part.' + i, JSON.stringify({ questions: sh }));
  });
  fs.writeFileSync(quizPath, JSON.stringify({ questions: [], shardCount: shards.length }));
}

console.log('Rebuilt quiz.json with ' + total + ' questions');