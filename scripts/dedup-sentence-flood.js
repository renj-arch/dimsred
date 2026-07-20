const fs = require('fs');
const path = require('path');

const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');
const QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');

function baseText(q) {
  return (q.question || '').toLowerCase().replace(/_{5,}/g, '___').replace(/\s+/g, ' ').trim();
}

function clean(questions, source) {
  const seen = new Map(); // baseText → first question
  const removed = [];
  const kept = [];
  for (const q of questions) {
    const key = baseText(q);
    if (seen.has(key)) {
      removed.push({ question: q.question, answer: q.answer, keptAnswer: seen.get(key).answer });
    } else {
      seen.set(key, q);
      kept.push(q);
    }
  }
  return { kept, removed };
}

async function main() {
  let totalRemoved = 0;
  let totalKept = 0;

  // Clean quiz.json if it exists
  if (fs.existsSync(QUIZ_PATH)) {
    const quiz = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8').replace(/^\uFEFF/, ''));
    const { kept, removed } = clean(quiz.questions, 'quiz.json');
    totalRemoved += removed.length;
    totalKept += kept.length;
    quiz.questions = kept;
    fs.writeFileSync(QUIZ_PATH, JSON.stringify(quiz));
    console.log(`quiz.json: removed ${removed.length} sentence-duplicate questions, kept ${kept.length}`);
  }

  // Clean data/questions/*.json
  if (fs.existsSync(QUESTIONS_DIR)) {
    const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json') && f !== 'manifest.json');
    for (const f of files) {
      const fp = path.join(QUESTIONS_DIR, f);
      const data = JSON.parse(fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, ''));
      let fileKept = 0, fileRemoved = 0;
      const out = {};
      for (const [subject, subjData] of Object.entries(data)) {
        out[subject] = { subSubjects: {} };
        if (!subjData.subSubjects) { out[subject] = subjData; continue; }
        for (const [ss, qs] of Object.entries(subjData.subSubjects)) {
          const { kept, removed } = clean(qs, `${f}/${subject}/${ss}`);
          fileRemoved += removed.length;
          fileKept += kept.length;
          out[subject].subSubjects[ss] = kept;
        }
      }
      if (fileRemoved > 0) {
        fs.writeFileSync(fp, JSON.stringify(out));
        console.log(`${f}: removed ${fileRemoved} sentence-duplicate questions, kept ${fileKept}`);
        totalRemoved += fileRemoved;
        totalKept += fileKept;
      }
    }
  }

  console.log(`\nTotal: removed ${totalRemoved} questions, kept ${totalKept}`);
}

main().catch(e => { console.error(e); process.exit(1); });
