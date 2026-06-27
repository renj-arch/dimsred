const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./data/quiz.json', 'utf8'));
let qs = data.questions;

// 1. Fix truncated question
let fixedCount = 0;
qs.forEach((q, i) => {
  if (/Gujarat Announces/i.test(q.question) && /for Ex$/i.test(q.question)) {
    console.log('Fixed Q#' + i + ': "' + q.question + '" -> "Gujarat Announces _____% Reservation for Ex-servicemen"');
    q.question = 'Gujarat Announces _____% Reservation for Ex-servicemen';
    fixedCount++;
  }
  // Fix double space
  if (/\s{2,}/.test(q.question)) {
    const before = q.question;
    q.question = q.question.replace(/\s{2,}/g, ' ');
    console.log('Fixed Q#' + i + ': double space "' + before + '" -> "' + q.question + '"');
    fixedCount++;
  }
});

// 2. Remove duplicates (keep first occurrence by question+answer key)
const seen = new Map();
const keep = [];
let removedCount = 0;
qs.forEach((q, i) => {
  const key = (q.question + '|||' + q.answer).toLowerCase().trim();
  if (seen.has(key)) {
    console.log('Removed Q#' + i + ' (duplicate of Q#' + seen.get(key) + '): "' + q.question.slice(0, 60) + '" -> ' + q.answer);
    removedCount++;
  } else {
    seen.set(key, i);
    keep.push(q);
  }
});

data.questions = keep;
data.updatedAt = new Date().toISOString();

fs.writeFileSync('./data/quiz.json', JSON.stringify(data, null, 2), 'utf8');
console.log('\nDone. Fixed ' + fixedCount + ' question(s), removed ' + removedCount + ' duplicate(s).');
console.log('Questions: ' + qs.length + ' -> ' + keep.length);
