const fs = require('fs');
const path = require('path');

const quizPath = path.join(__dirname, '..', 'data', 'quiz.json');
const outDir = path.join(__dirname, '..', 'data', 'questions');

let quiz;
try { quiz = JSON.parse(fs.readFileSync(quizPath, 'utf8')); }
catch (e) { console.error('Failed to read quiz.json:', e.message); process.exit(1); }

const catMap = {};
for (const q of quiz.questions) {
  const subject = q.subject || 'Uncategorized';
  const subSubject = q.subSubject || 'General';
  if (!catMap[subject]) catMap[subject] = {};
  if (!catMap[subject][subSubject]) catMap[subject][subSubject] = [];
  catMap[subject][subSubject].push(q);
}

let written = 0;
for (const [subject, subMap] of Object.entries(catMap)) {
  const slug = subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const catPath = path.join(outDir, slug + '.json');
  const catFile = {};
  catFile[subject] = { subSubjects: {} };
  for (const [subSub, qs] of Object.entries(subMap)) {
    catFile[subject].subSubjects[subSub] = qs;
  }
  fs.writeFileSync(catPath, JSON.stringify(catFile));
  written++;
}

console.log('Wrote ' + written + ' category files from ' + quiz.questions.length + ' questions');
