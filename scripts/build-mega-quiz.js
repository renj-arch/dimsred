#!/usr/bin/env node
// Build mega quiz — samples across ALL files (not just first few).
const fs = require('fs');
const path = require('path');

const qDir = path.join(__dirname, '..', 'data', 'questions');
const outFile = path.join(__dirname, '..', 'data', 'mega-quiz.json');
const MAX_TOTAL = 8000;

if (!fs.existsSync(qDir)) { console.error('data/questions/ not found'); process.exit(1); }

const files = fs.readdirSync(qDir).filter(f => f.endsWith('.json'));
const bySubject = {};
const all = [];
const perFileCap = Math.max(5, Math.floor(MAX_TOTAL / files.length));

for (const f of files) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(qDir, f), 'utf8'));
    let fileCount = 0;
    for (const subjectKey of Object.keys(j)) {
      if (fileCount >= perFileCap) break;
      const subSubjects = j[subjectKey].subSubjects || {};
      for (const subKey of Object.keys(subSubjects)) {
        if (fileCount >= perFileCap) break;
        const qs = subSubjects[subKey];
        if (!Array.isArray(qs)) continue;
        for (const q of qs) {
          if (fileCount >= perFileCap || all.length >= MAX_TOTAL) break;
          if (!q.question || !q.answer) continue;
          all.push({
            id: q.id || (subjectKey + '-' + subKey + '-' + all.length),
            q: q.question,
            a: q.answer,
            subject: q.subject || subjectKey,
            sub: q.subSubject || subKey,
            type: q.type || 'short',
            hint: q.hint || '',
            fact: q.fact || ''
          });
          if (!bySubject[subjectKey]) bySubject[subjectKey] = 0;
          bySubject[subjectKey]++;
          fileCount++;
        }
      }
    }
  } catch (e) { /* skip */ }
}

for (let i = all.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [all[i], all[j]] = [all[j], all[i]];
}

fs.writeFileSync(outFile, JSON.stringify({
  built: new Date().toISOString(),
  totalQuestions: all.length,
  subjects: bySubject,
  questions: all
}));
console.log('Built: ' + all.length + ' questions, ' + Object.keys(bySubject).length + ' subjects, ' +
  (fs.statSync(outFile).size / 1024 / 1024).toFixed(1) + 'MB');
Object.keys(bySubject).sort(function(a,b){return bySubject[b]-bySubject[a]}).slice(0,15).forEach(function(s){
  console.log('  ' + s + ': ' + bySubject[s]);
});
