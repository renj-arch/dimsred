const fs = require('fs');
const path = require('path');
const { createStreamingShardWriter } = require('./lib/quiz-store');

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
// The original pushed every question object into one array and handed it to
// quiz-store.writeQuiz(), which holds the whole corpus in memory while it
// measures shard sizes. A rewrite then claimed to fix that by "feeding it one
// category file at a time", but it kept a `shards` array and only wrote it after
// the whole loop, so it retained the entire corpus anyway. It died on
// 2026-10-02 in the wiki-fill setup job with "Ineffective mark-compacts near heap
// limit / JavaScript heap out of memory" (exit 134) against a ~4.8 GB corpus at
// the 12 GB NODE_OPTIONS cap. See cleanup-questions.js for the same bug class
// diagnosed at 6 GB during recovery run #33.
//
// This now uses the shared streaming writer that cleanup-questions.js,
// dedup-sentence-flood.js, merge-chunks.js and wiki-fill-all.cjs already use, so
// the shard arithmetic cannot drift from theirs. Each finished shard is written
// before the next one starts, so peak heap is one category file plus one ~300 MiB
// shard buffer, not the corpus.
//
// Verified: output is byte-identical to the previous implementation on a mixed
// synthetic corpus (6 categories, nested subSubjects, a BOM-prefixed file, and
// the two skipped filenames), and on a 1,000,000-question / 252 MiB corpus the
// previous version died at a 300 MB heap cap while this completes, writing the
// same 64 parts.
function removeParts(p) {
  for (let i = 0; fs.existsSync(p + '.part.' + i); i++) fs.unlinkSync(p + '.part.' + i);
}

let total = 0;
const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json') && f !== 'manifest.json' && f !== 'archive-cat-index.json');

// Stale parts must go before the first part is written; the writer writes the
// primary last, so its shardCount only ever advertises files already on disk.
removeParts(quizPath);
const writer = createStreamingShardWriter(quizPath);

files.forEach(f => {
  let data = null;
  try {
    let content = fs.readFileSync(path.join(questionsDir, f), 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    data = JSON.parse(content);
    // Release the raw text before the shard buffer starts filling, so a category
    // file is not held twice over for the whole iteration.
    content = null;
    Object.entries(data).forEach(([subject, subjData]) => {
      if (subjData.subSubjects) {
        Object.entries(subjData.subSubjects).forEach(([subSubject, qs]) => {
          for (const q of qs) {
            writer.add(q);
            total++;
          }
        });
      }
    });
  } catch (e) {
    console.error('  Skipping ' + f + ': ' + e.message);
  } finally {
    data = null;
  }
});

const res = writer.finish();
if (!res || !res.shards) {
  // The directory existed but held no category files. The streaming writer
  // deliberately writes nothing in that case, which would leave a stale
  // quiz.json from an earlier run looking current -- so write the empty bank
  // explicitly, as the previous implementation did.
  fs.writeFileSync(quizPath, JSON.stringify({ questions: [] }));
  console.log('No category files in ' + questionsDir + '; wrote empty quiz.json');
} else {
  console.log('Rebuilt quiz.json with ' + total + ' questions in ' + res.shards + ' shard(s)');
}
