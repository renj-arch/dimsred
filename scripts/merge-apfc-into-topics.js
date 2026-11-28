// Merge APFC bank questions into the curated subject pools used by the
// Topic Micro-Tests, filed under the right subject category.
const fs = require('fs');
const path = require('path');
const bank = JSON.parse(fs.readFileSync('question-bank/apfc.json', 'utf8'));
const topicDir = 'data/topics';

const MAP = {
  'Mathematics': 'mathematics',
  'English': 'english',
  'Mental Ability': 'reasoning',
  'General Studies': 'general-knowledge',
  'General Knowledge': 'general-knowledge',
  'Industrial Relations': 'general-knowledge',
  'Accountancy': 'general-knowledge',
  'Current Affairs': 'general-studies'
};

const byPool = {};
for (const q of bank.questions) {
  const pool = MAP[q.section];
  if (!pool) continue;
  const correctIdx = (q.options || []).findIndex(o => o.correct);
  if (correctIdx === -1) continue;
  (byPool[pool] = byPool[pool] || []).push({
    id: q.id,
    text: q.text || q.q,
    options: (q.options || []).map(o => ({ label: o.label, text: o.text })),
    answer: correctIdx,
    solution: q.solution || '',
    _source: 'UPSC APFC',
    _sourceSection: q.section
  });
}

for (const pool in byPool) {
  const jf = path.join(topicDir, pool + '.json');
  const jfJs = path.join(topicDir, pool + '.js');
  if (!fs.existsSync(jf)) { console.log('skip (no file):', pool); continue; }
  const data = JSON.parse(fs.readFileSync(jf, 'utf8'));
  const sec = data.sections[0];
  const before = sec.questions.length;
  const seen = new Set(sec.questions.map(q => q.id + '|' + (q.text || '').slice(0, 60)));
  let added = 0;
  for (const q of byPool[pool]) {
    const key = q.id + '|' + q.text.slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    sec.questions.push(q);
    added++;
  }
  data.total = sec.questions.length;
  fs.writeFileSync(jf, JSON.stringify(data));
  fs.writeFileSync(jfJs, 'window.__examData=' + JSON.stringify(data) + ';');
  console.log(pool + ': +' + added + ' (now ' + data.total + ')');
}
