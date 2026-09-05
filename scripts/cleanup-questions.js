const fs = require('fs');
const path = require('path');
const { iterQuizQuestions, MAX_SHARD_BYTES } = require('./lib/quiz-store');

const quizPath = path.join(__dirname, '..', 'data', 'quiz.json');

if (!fs.existsSync(quizPath)) {
  console.error('Warning: Could not parse quiz.json (ENOENT: quiz.json missing). Skipping cleanup.');
  process.exit(0);
}

// Read only the primary (no questions) to recover the non-question top-level
// fields and their key order, so the rewritten file keeps the exact layout
// writeQuiz produced.
let primary;
try {
  primary = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
} catch (e) {
  console.error('Warning: Could not parse quiz.json (' + e.message + '). Skipping cleanup.');
  process.exit(0);
}
delete primary.shardCount;
const rest = {};
for (const k of Object.keys(primary)) {
  if (k !== 'questions') rest[k] = primary[k];
}

function isBad(q) {
  const text = (q.question || '').trim();
  const answer = (q.answer || '').trim();

  // Empty or too short
  if (text.length < 20) return true;

  // Starts with blank (year/term was at start of table row)
  if (/^_____/.test(text)) return true;
  if (/_____\s*$/.test(text)) {
    // A trailing blank is allowed when the answer is strongly determined:
    //  - right after a month name ("in September _____" → a year),
    //  - after a strong object-verb "by" ("provided/supplied by _____" → an agent), or
    //  - after a temporal preposition when the answer is itself a year
    //    ("commenced trials in _____" → 2014).
    const isYear = /^(1[0-9]{3}|20[0-9]{2})$/.test(answer);
    const trailingBlankOk =
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+_____\s*$/.test(text) ||
      /\b(?:provided|supplied|built|designed|written|authored|made|produced|developed|created|sponsored|funded|conducted|commissioned|painted|composed)\s+by\s+_____\s*$/.test(text) ||
      (isYear && /\b(?:in|by|on|during|until|since|before|after)\s+_____\s*$/.test(text));
    if (!trailingBlankOk) return true;
  }

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

// Streamed filter + rewrite. The old code held the entire corpus in memory
// through readQuiz() plus the filtered copy and handed it to writeQuiz() — the
// same whole-corpus heap that eventually OOMs as the corpus grows. This mirrors
// writeQuiz's exact shard layout and per-question byte measurement while walking
// the questions one shard at a time, so peak heap stays bounded instead.
const HEADER = Buffer.byteLength('{"questions":[]}');
const shards = [];
let cur = [];
let curLen = HEADER;
let before = 0;
let kept = 0;

function removeParts(p) {
  for (let i = 0; fs.existsSync(p + '.part.' + i); i++) fs.unlinkSync(p + '.part.' + i);
}

try {
  iterQuizQuestions(quizPath, (q) => {
    before++;
    if (isBad(q)) return;
    const qLen = Buffer.byteLength(JSON.stringify(q));
    if (cur.length && curLen + qLen + 1 > MAX_SHARD_BYTES) {
      shards.push(cur);
      cur = [];
      curLen = HEADER;
    }
    cur.push(q);
    curLen += qLen + 1;
    kept++;
  });
} catch (e) {
  console.error('Warning: Could not parse quiz.json (' + e.message + '). Skipping cleanup.');
  process.exit(0);
}

removeParts(quizPath);
if (shards.length === 0) {
  const out = {};
  for (const k of Object.keys(primary)) out[k] = primary[k];
  out.questions = cur;
  fs.writeFileSync(quizPath, JSON.stringify(out));
} else {
  shards.push(cur);
  shards.forEach((sh, i) => {
    fs.writeFileSync(quizPath + '.part.' + i, JSON.stringify({ questions: sh }));
  });
  const header = Object.assign({}, rest, { questions: [], shardCount: shards.length });
  fs.writeFileSync(quizPath, JSON.stringify(header));
}

console.log('Cleaned: ' + before + ' → ' + kept + ' questions (-' + (before - kept) + ' garbage)');