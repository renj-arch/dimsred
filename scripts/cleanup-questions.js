const fs = require('fs');
const path = require('path');

const quizPath = path.join(__dirname, '..', 'data', 'quiz.json');
const quiz = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
const all = quiz.questions;

const before = all.length;

function isBad(q) {
  const text = (q.question || '').trim();

  // Empty or too short
  if (text.length < 15) return true;

  // Starts with blank (year/term was at start of table row)
  if (/^_____/.test(text)) return true;

  // No space at all → fragment
  if (!/\s/.test(text)) return true;

  // Comma density too high (table row)
  const commas = (text.match(/,/g) || []).length;
  if (commas > 0 && text.length / commas < 15) return true;

  // Contains known table fragments (Nobel list patterns)
  if (/, (Physics|Chemistry|Peace|Literature|Medicine|Economics)(,|$)/.test(text)) return true;
  if (/^[A-Z][a-z]+,\s*[A-Z][a-z]+,\s*_____/.test(text)) return true;

  // Question is just a fragment: "Robert A" or " Charles G" etc
  if (/^[A-Z]?[a-z]+\s+[A-Z]\.?\s*$/.test(text)) return true;

  // Less than 3 words
  const words = text.split(/\s+/);
  if (words.length < 3) return true;

  return false;
}

const clean = all.filter(q => !isBad(q));

quiz.questions = clean;
fs.writeFileSync(quizPath, JSON.stringify(quiz));

const removed = before - clean.length;
console.log('Cleaned: ' + before + ' → ' + clean.length + ' questions (-' + removed + ' garbage)');
