const fs = require('fs');
const path = require('path');

const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'quiz.json'), 'utf8'));

let count = 0;

for (const q of quiz.questions) {
  if (q.question && q.question.includes('_____') && q.answer) {
    q.question = q.question.replace('_____', q.answer);
    count++;
  }
}

fs.writeFileSync(path.join(__dirname, '..', 'data', 'quiz.json'), JSON.stringify(quiz, null, 2), 'utf8');
console.log(`Filled ${count} questions`);
