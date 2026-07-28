const fs = require('fs');
const path = require('path');

const CHUNKS_DIR = path.join(__dirname, '..', 'chunks');
const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');

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

  // Merge each chunk's output
  let added = 0;
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
          chunkAdded++;
        }
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

  console.log('Now running build-archive-single.js...');
}

main();
