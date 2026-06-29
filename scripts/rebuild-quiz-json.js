const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, '..', 'data', 'questions');
const quizPath = path.join(__dirname, '..', 'data', 'quiz.json');

if (!fs.existsSync(questionsDir)) {
  console.error('data/questions/ directory not found — cannot rebuild quiz.json');
  process.exit(1);
}

const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'));
const allQuestions = [];

files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(questionsDir, f), 'utf8'));
  Object.entries(data).forEach(([subject, subjData]) => {
    if (subjData.subSubjects) {
      Object.entries(subjData.subSubjects).forEach(([subSubject, qs]) => {
        qs.forEach(q => {
          allQuestions.push(q);
        });
      });
    }
  });
});

fs.writeFileSync(quizPath, JSON.stringify({ questions: allQuestions }));
console.log('Rebuilt quiz.json with ' + allQuestions.length + ' questions');
