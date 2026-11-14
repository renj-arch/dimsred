const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, '..', 'data', 'questions');
const quizPath = path.join(__dirname, '..', 'data', 'quiz.json');

function safeParaphrase(text, answer) {
  if (!text || text.length < 20) return text;
  const sentences = text.split('.').filter(s => s.trim().length > 15);
  if (sentences.length === 0) return text.substring(0, 500);

  const answerLower = (answer || '').toLowerCase();
  let chosen;
  if (answerLower) {
    const matching = sentences.filter(s => s.toLowerCase().includes(answerLower));
    chosen = matching.length > 0 ? matching : sentences;
  } else {
    chosen = sentences;
  }
  // Keep up to 4 sentences for context
  chosen = chosen.slice(0, 4);

  let result = chosen.join('. ').trim();
  // Only safe rewrites — no tense changes (no was→is, were→are)
  const swaps = {
    ' established ': ' set up ',
    ' established.': ' set up.',
    ' founded ': ' set up ',
    ' founded.': ' set up.',
    ' located in ': ' in ',
    ' situated in ': ' in ',
    ' known as ': ' called ',
    ' referred to as ': ' called ',
  };
  for (const [from, to] of Object.entries(swaps)) {
    result = result.split(from).join(to);
  }
  if (result.length > 500) result = result.substring(0, 497) + '...';
  if (result.length > 0 && !/[.!?]$/.test(result)) result += '.';
  return result;
}

let totalFixed = 0;

function processQuestions(arr) {
  arr.forEach(q => {
    if (q.fact) {
      const old = q.fact;
      q.fact = safeParaphrase(q.fact, q.answer);
      if (old !== q.fact) totalFixed++;
    }
  });
}

// Read all per-category JSON files
const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'));

files.forEach(f => {
  const fp = path.join(questionsDir, f);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  Object.entries(data).forEach(([subject, subjData]) => {
    if (subjData.subSubjects) {
      Object.entries(subjData.subSubjects).forEach(([subSubject, qs]) => {
        processQuestions(qs);
      });
    }
  });
  fs.writeFileSync(fp, JSON.stringify(data));
  console.log('  Fixed ' + fp);
});

// Also fix quiz.json if present
if (fs.existsSync(quizPath)) {
  const quiz = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
  if (quiz.questions) {
    processQuestions(quiz.questions);
    fs.writeFileSync(quizPath, JSON.stringify(quiz));
    console.log('  Fixed ' + quizPath);
  }
}

console.log('Done. Rephrased facts for ' + totalFixed + ' questions.');
