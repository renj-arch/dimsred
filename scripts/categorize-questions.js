const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./data/quiz.json', 'utf8'));

data.questions.forEach((q, i) => {
  console.log('Q#' + i + ' [' + q.category + '][' + q.subject + '] ' + q.question.slice(0, 100));
  console.log('  Answer: ' + q.answer + ' | Source: ' + q.source);
  console.log('');
});
