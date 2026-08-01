const fs = require('fs');
const path = require('path');

const quizPath = path.join(__dirname, '..', 'data', 'quiz.json');
let quiz;
try {
  quiz = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
} catch (e) {
  console.error('Warning: Could not parse quiz.json (' + e.message + '). Skipping cleanup.');
  process.exit(0);
}
const all = quiz.questions;

const before = all.length;

function isBad(q) {
  const text = (q.question || '').trim();
  const answer = (q.answer || '').trim();

  // Empty or too short
  if (text.length < 20) return true;

  // Starts with blank (year/term was at start of table row)
  if (/^_____/.test(text)) return true;
  if (/_____\s*$/.test(text)) return true;

  // No space at all → fragment
  if (!/\s/.test(text)) return true;

  // Comma density too high (table row) — relaxed from 15 to 8
  const commas = (text.match(/,/g) || []).length;
  if (commas > 0 && text.length / commas < 8) return true;

  // Contains known table fragments (Nobel list patterns)
  if (/, (Physics|Chemistry|Peace|Literature|Medicine|Economics)(,|$)/.test(text)) return true;
  if (/^[A-Z][a-z]+,\s*[A-Z][a-z]+,\s*_____/.test(text)) return true;

  // Question is just a fragment: "Robert A" or " Charles G" etc
  if (/^[A-Z]?[a-z]+\s+[A-Z]\.?\s*$/.test(text)) return true;

  // Less than 3 words
  const words = text.split(/\s+/);
  if (words.length < 3) return true;

  // Answer is just a year AND the year is already mentioned in question text (tautological)
  if (/^(1[0-9]{3}|20[0-9]{2})$/.test(answer) && text.includes(answer)) return true;

  // Answer is just a single digit/ordinal AND already mentioned in question text (tautological)
  if (/^\d+(st|nd|rd|th)?$/i.test(answer) && text.includes(answer)) return true;

  // Question looks like "Name, Name (_____)" (list entry fragment)
  if (/^[A-Z][a-z]+[,\s]+[A-Z][a-z]+.*\(_____\)/.test(text)) return true;
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*\(_____\)/.test(text)) return true;

  // Question is just a parenthesized blank "(_____)"
  if (/^\(_____\)/.test(text)) return true;

  // Answer is empty
  if (answer.length < 1) return true;

  // Question contains no lowercase letters → all caps or all structured fragment
  if (!/[a-z]/.test(text)) return true;

  // Wikipedia section markup
  if (/==/.test(text)) return true;
  if (/^(See also|References|Notes|External links|Further reading|Bibliography)\b/i.test(text)) return true;

  // Citation/reference boilerplate
  if (/^(Archived from|Retrieved\s|Retrieved from)/i.test(text)) return true;
  if (/https?:\/\//i.test(text)) return true;

  // Citation entry: "Surname, Firstname (date)" or "Name (date)" pattern
  if (/^[A-Z][a-z]+,\s*[A-Z][a-z]+.*\(\d{4}\)/.test(text)) return true;
  if (/^[A-Z][a-z]+\s+\([12]\d{3}\)/.test(text)) return true;
  if (/\(\d{4}\)\s*$/.test(text) && text.length < 20) return true;

  // Blank replaces first word of sentence (always bad - "_____ in 1961")
  const firstWord = text.split(/\s+/)[0];
  if (/^_____/.test(text) && firstWord === '_____') {
    const restAfterBlank = text.replace(/^_____[,\s]*/, '');
    const nextWord = restAfterBlank.split(/\s+/)[0];
    // If the blanked word is lowercase (common verb), it's a bad question
    if (nextWord && /^[a-z]/.test(nextWord)) return true;
  }

  // Generic "What is X?" / "Who is X?" definition lookups lacking quiz context
  if (/^(What|Who)\s+is\s+(?!(the|a|an)\s)/i.test(text)) return true;

  // Reference-section citation strings that slipped past generation: {{cite}}
  // template errors, "Title": page-range citations, and bare quoted titles.
  if (/{{cite|^Cite\s+[A-Za-z]+\s+requires/i.test(text)) return true;
  if (/^"[^"]{8,}":\s*\d+/.test(text)) return true;
  if (/\w+":\s*\d+/.test(text)) return true;
  if (/^"[^"]{8,}"\s*$/.test(text)) return true;

  return false;
}

const clean = all.filter(q => !isBad(q));

quiz.questions = clean;
fs.writeFileSync(quizPath, JSON.stringify(quiz));

const removed = before - clean.length;
console.log('Cleaned: ' + before + ' → ' + clean.length + ' questions (-' + removed + ' garbage)');
