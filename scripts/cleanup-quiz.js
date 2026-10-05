const fs = require('fs');
const path = require('path');

const QUIZ_PATH = path.join(__dirname, '..', 'data', 'quiz.json');

const quiz = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'));
const questions = quiz.questions;

const trashPatterns = [
  /Which term is described as/i,
  /Belly dance/i,
  /film (?:career|actress|actor|director|producer|industry|award|festival)|movie|reality (?:tv|show|television|series)/i,

  // Foreign culture/economy/geography under Indian or wrong categories
  /culture of (?:Albania|Algeria|Angola|Argentina|Australia|Bolivia|Brazil|Cambodia|Cameroon|Canada|Chile|China|Colombia|Croatia|Cuba|Czech|Denmark|Egypt|Estonia|Ethiopia|Finland|France|Germany|Ghana|Greece|Hungary|Iceland|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Japan|Jordan|Kazakhstan|Kenya|Laos|Latvia|Lebanon|Lithuania|Malaysia|Mexico|Morocco|Myanmar|Nepal|Netherlands|New Zealand|Nigeria|Norway|Pakistan|Peru|Philippines|Poland|Portugal|Romania|Russia|Saudi|Serbia|Singapore|South Africa|South Korea|Spain|Sri Lanka|Sudan|Sweden|Switzerland|Syria|Taiwan|Tanzania|Thailand|Tunisia|Turkey|Uganda|Ukraine|United Kingdom|United States|Uzbekistan|Venezuela|Vietnam|Zimbabwe)/i,
  /economy of (?:Albania|Algeria|Angola|Argentina|Australia|Bolivia|Brazil|Cambodia|Cameroon|Canada|Chile|China|Colombia|Croatia|Cuba|Czech|Denmark|Egypt|Estonia|Ethiopia|Finland|France|Germany|Ghana|Greece|Hungary|Iceland|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Japan|Jordan|Kazakhstan|Kenya|Laos|Latvia|Lebanon|Lithuania|Malaysia|Mexico|Morocco|Myanmar|Nepal|Netherlands|New Zealand|Nigeria|Norway|Pakistan|Peru|Philippines|Poland|Portugal|Romania|Russia|Saudi|Serbia|Singapore|South Africa|South Korea|Spain|Sri Lanka|Sudan|Sweden|Switzerland|Syria|Taiwan|Tanzania|Thailand|Tunisia|Turkey|Uganda|Ukraine|United Kingdom|United States|Uzbekistan|Venezuela|Vietnam|Zimbabwe)/i,
  /geography of (?:Albania|Algeria|Angola|Argentina|Australia|Bolivia|Brazil|Cambodia|Cameroon|Canada|Chile|China|Colombia|Croatia|Cuba|Czech|Denmark|Egypt|Estonia|Ethiopia|Finland|France|Germany|Ghana|Greece|Hungary|Iceland|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Japan|Jordan|Kazakhstan|Kenya|Laos|Latvia|Lebanon|Lithuania|Malaysia|Mexico|Morocco|Myanmar|Nepal|Netherlands|New Zealand|Nigeria|Norway|Pakistan|Peru|Philippines|Poland|Portugal|Romania|Russia|Saudi|Serbia|Singapore|South Africa|South Korea|Spain|Sri Lanka|Sudan|Sweden|Switzerland|Syria|Taiwan|Tanzania|Thailand|Tunisia|Turkey|Uganda|Ukraine|United Kingdom|United States|Uzbekistan|Venezuela|Vietnam|Zimbabwe)/i,
  /history of (?:Albania|Algeria|Angola|Argentina|Australia|Bolivia|Brazil|Cambodia|Cameroon|Canada|Chile|China|Colombia|Croatia|Cuba|Czech|Denmark|Egypt|Estonia|Ethiopia|Finland|France|Germany|Ghana|Greece|Hungary|Iceland|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Japan|Jordan|Kazakhstan|Kenya|Laos|Latvia|Lebanon|Lithuania|Malaysia|Mexico|Morocco|Myanmar|Nepal|Netherlands|New Zealand|Nigeria|Norway|Pakistan|Peru|Philippines|Poland|Portugal|Romania|Russia|Saudi|Serbia|Singapore|South Africa|South Korea|Spain|Sri Lanka|Sudan|Sweden|Switzerland|Syria|Taiwan|Tanzania|Thailand|Tunisia|Turkey|Uganda|Ukraine|United Kingdom|United States|Uzbekistan|Venezuela|Vietnam|Zimbabwe)/i,
];

function isBad(q) {
  const text = q.question + ' ' + (q.fact || '') + ' ' + (q.category || '') + ' ' + (q.subSubject || '');

  // Pattern-based trash
  if (trashPatterns.some(re => re.test(text))) return true;

  // Question too short
  if (q.question.length < 25) return true;

  // Answer too short
  if (q.answer && q.answer.length < 3) return true;

  // Answer is a year and that year appears in question (filled blank, now useless)
  if (q.answer && /^\d{4}$/.test(q.answer) && q.question.includes(q.answer)) return true;

  // Tautological fact (fact starts with answer + colon/equals)
  if (q.fact && q.answer) {
    const aEsc = q.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp('^' + aEsc + '[:,]').test(q.fact)) return true;
  }

  // Fragment question (starts with lowercase)
  if (/^[a-z]/.test(q.question)) return true;

  // Fragment question (starts with year range)
  if (/^\d{4}[-–]/.test(q.question)) return true;

  // Question has 4+ underscores (broken blank template)
  if ((q.question.match(/_+/g) || []).length > 3) return true;

  return false;
}

const kept = [];
const removed = [];
for (const q of questions) {
  if (isBad(q)) {
    removed.push(q);
  } else {
    kept.push(q);
  }
}

quiz.questions = kept;

fs.writeFileSync(QUIZ_PATH, JSON.stringify(quiz, null, 2));
console.log(`Cleanup complete. Removed ${removed.length} bad questions. Kept ${kept.length} questions.`);

// Write removal log
const logPath = path.join(__dirname, '..', 'data', 'cleanup-removed.json');
fs.writeFileSync(logPath, JSON.stringify(removed, null, 2));
console.log(`Removed questions logged to ${logPath}`);
