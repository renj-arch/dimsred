const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, '..', 'data', 'questions');
const quizPath = path.join(__dirname, '..', 'data', 'quiz.json');

if (!fs.existsSync(questionsDir)) {
  fs.mkdirSync(questionsDir, { recursive: true });
  fs.writeFileSync(quizPath, JSON.stringify({ questions: [] }));
  console.log('Created data/questions/ directory; wrote empty quiz.json');
  process.exit(0);
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
