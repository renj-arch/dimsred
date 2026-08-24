const fs = require('fs');
const path = require('path');
const { readQuiz } = require('./lib/quiz-store');

const quizPath = process.env.SPLIT_QUIZ_PATH || path.join(__dirname, '..', 'data', 'quiz.json');
const outDir = process.env.SPLIT_OUT_DIR || path.join(__dirname, '..', 'data', 'questions');

let quiz;
try { quiz = readQuiz(quizPath); }
catch (e) { console.error('Failed to read quiz.json:', e.message); process.exit(1); }

const catMap = {};
for (const q of quiz.questions) {
  const subject = q.subject || 'Uncategorized';
  const subSubject = q.subSubject || 'General';
  if (!catMap[subject]) catMap[subject] = {};
  if (!catMap[subject][subSubject]) catMap[subject][subSubject] = [];
  catMap[subject][subSubject].push(q);
}

// A single monolithic file per subject now overflows V8's ~512Mi-char string
// limit (RangeError: Invalid string length — run #461) and was heading for
// GitHub's 100MB push cap. Split oversized subjects into deterministic
// <slug>-2.json… part files at whole-sub-topic granularity: the exact
// multi-file layout build-archive-single.js already produces and every reader
// in this pipeline (rebuild-quiz-json, dedup-sentence-flood, classify-global,
// the site's SUBJECT_FILES map) consumes transparently. A sub-topic is never
// split internally, so no reader can ever see a partial question array.
// Cap stays under git's 100MB hard block with headroom for growth.
const MAX_BYTES = (parseInt(process.env.SPLIT_MAX_MB, 10) || 90) * 1024 * 1024;

function slugFor(subject) {
  return subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

let written = 0;
for (const [subject, subMap] of Object.entries(catMap)) {
  const entries = Object.keys(subMap).map(ss => ({ ss, qs: subMap[ss] }));
  // Deterministic order keeps the split seam stable across runs (smaller diffs).
  entries.sort((a, b) => (a.ss < b.ss ? -1 : a.ss > b.ss ? 1 : 0));

  const parts = [];
  let chunk = {}, chunkBytes = 0, chunkEntries = 0;
  for (const { ss, qs } of entries) {
    let entryBytes;
    try { entryBytes = Buffer.byteLength(JSON.stringify(qs)) + Buffer.byteLength(JSON.stringify(ss)) + 40; }
    catch (e) {
      console.error('Failed to measure "' + subject + '" / "' + ss + '": ' + e.message);
      process.exit(1);
    }
    const alone = entryBytes > MAX_BYTES; // giant single sub-topic gets its own file
    if ((chunkEntries > 0 && chunkBytes + entryBytes > MAX_BYTES) || (alone && chunkEntries > 0)) {
      parts.push(chunk);
      chunk = {}; chunkBytes = 0; chunkEntries = 0;
    }
    chunk[ss] = qs;
    chunkBytes += entryBytes;
    chunkEntries++;
    if (alone && chunkEntries === 1 && chunkBytes > MAX_BYTES) {
      console.log('WARNING: sub-topic "' + ss + '" in "' + subject + '" is ' +
        (chunkBytes / 1024 / 1024).toFixed(1) + ' MiB on its own (> cap, kept whole)');
    }
  }
  if (chunkEntries > 0) parts.push(chunk);

  const baseName = slugFor(subject);
  parts.forEach((partSubs, i) => {
    const catFile = {};
    catFile[subject] = { subSubjects: partSubs };
    const partName = baseName + (i > 0 ? '-' + (i + 1) : '') + '.json';
    const partPath = path.join(outDir, partName);
    fs.writeFileSync(partPath, JSON.stringify(catFile));
    written++;
    if (parts.length > 1) {
      console.log('  ' + subject + ': part ' + (i + 1) + '/' + parts.length + ' → ' + partName +
        ' (' + (fs.statSync(partPath).size / 1024 / 1024).toFixed(1) + ' MiB)');
    }
  });
}

console.log('Wrote ' + written + ' category files from ' + quiz.questions.length + ' questions');
