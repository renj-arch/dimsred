const fs = require('fs');
const path = require('path');

const quizPath = path.join(__dirname, '..', 'data', 'quiz.json');
const quiz = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
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

  // Answer is just a year (4-digit number) — not useful practice
  if (/^(1[0-9]{3}|20[0-9]{2})$/.test(answer)) return true;

  // Answer is just a single digit or ordinal
  if (/^\d+(st|nd|rd|th)?$/i.test(answer)) return true;

  // Question looks like "Name, Name (_____)" (list entry fragment)
  if (/^[A-Z][a-z]+[,\s]+[A-Z][a-z]+.*\(_____\)/.test(text)) return true;
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*\(_____\)/.test(text)) return true;

  // Question is just a parenthesized blank "(_____)"
  if (/^\(_____\)/.test(text)) return true;

  // Answer is too short and generic (1-2 chars)
  if (answer.length < 2) return true;

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
  if (/\(\d{4}\)\s*$/.test(text) && text.length < 60) return true;

  // Question starts with a citation-style author name + comma
  if (/^[A-Z][a-z]+,\s+[A-Z][a-z]/.test(text) && !/\b(?:was|were|is|are|has|have|had|said|born|died|known|became|served|joined|established|founded|created|introduced|developed|published|released|announced|launched|appointed|elected|awarded|received|won|played|worked|studied|taught|led|built|designed|invented|discovered|proposed|suggested|argued|stated|noted|observed|reported|described|explained|introduced|formed|made|given|taken|held|shown|found|seen|heard|known|considered|regarded|believed|thought|felt|wanted|needed|used)\b/i.test(text)) return true;

  // Blank replaces first word of sentence (always bad - "_____ in 1961")
  const firstWord = text.split(/\s+/)[0];
  if (/^_____/.test(text) && firstWord === '_____') {
    const restAfterBlank = text.replace(/^_____[,\s]*/, '');
    const nextWord = restAfterBlank.split(/\s+/)[0];
    // If the blanked word is lowercase (common verb), it's a bad question
    if (nextWord && /^[a-z]/.test(nextWord)) return true;
  }

  return false;
}

const clean = all.filter(q => !isBad(q));

quiz.questions = clean;
fs.writeFileSync(quizPath, JSON.stringify(quiz));

const removed = before - clean.length;
console.log('Cleaned: ' + before + ' → ' + clean.length + ' questions (-' + removed + ' garbage)');
