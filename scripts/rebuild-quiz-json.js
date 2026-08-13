const fs = require('fs');
const path = require('path');
const { writeQuizQuestions } = require('./lib/quiz-store');

const questionsDir = path.join(__dirname, '..', 'data', 'questions');
const quizPath = path.join(__dirname, '..', 'data', 'quiz.json');

if (!fs.existsSync(questionsDir)) {
  fs.mkdirSync(questionsDir, { recursive: true });
  writeQuizQuestions(quizPath, []);
  console.log('Created data/questions/ directory; wrote empty quiz.json');
  process.exit(0);
}

const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json') && f !== 'manifest.json');
const allQuestions = [];

files.forEach(f => {
  try {
    let content = fs.readFileSync(path.join(questionsDir, f), 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const data = JSON.parse(content);
    Object.entries(data).forEach(([subject, subjData]) => {
      if (subject === 'Junk') return;
      if (subjData.subSubjects) {
        Object.entries(subjData.subSubjects).forEach(([subSubject, qs]) => {
          qs.forEach(q => {
            allQuestions.push(q);
          });
        });
      }
    });
  } catch (e) {
    console.error('  Skipping ' + f + ': ' + e.message);
  }
});

writeQuizQuestions(quizPath, allQuestions);
console.log('Rebuilt quiz.json with ' + allQuestions.length + ' questions');
