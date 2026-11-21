const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./data/quiz.json', 'utf8'));
const qs = data.questions;
let issues = [];

qs.forEach((q, i) => {
  if (/for Ex$/i.test(q.question) || /(for|the|in|of|to|and|a|an) $/i.test(q.question)) {
    issues.push({ idx: i, type: 'TRUNCATED', msg: 'Question cuts off abruptly', q: q.question, a: q.answer });
  }
  if (q.question.length < 20) {
    issues.push({ idx: i, type: 'TOO_SHORT', msg: 'Length=' + q.question.length, q: q.question });
  }
  if (!q.answer || q.answer.trim() === '') {
    issues.push({ idx: i, type: 'NO_ANSWER', msg: 'Answer is empty', q: q.question });
  }
  if (!q.options || q.options.length === 0) {
    issues.push({ idx: i, type: 'NO_OPTIONS', msg: 'No options', q: q.question });
  }
  if (q.options && q.options.length < 2) {
    issues.push({ idx: i, type: 'FEW_OPTIONS', msg: 'Only ' + q.options.length + ' option(s)', q: q.question });
  }
  if (q.type === 'fill_blank' && q.options && q.options.length > 0) {
    const a = q.answer.trim().toLowerCase();
    if (!q.options.some(o => o.trim().toLowerCase() === a)) {
      issues.push({ idx: i, type: 'ANSWER_MISMATCH', msg: 'Answer "' + q.answer + '" not in options', q: q.question, opts: q.options });
    }
  }
  if (/<[a-z][\s\S]*>/i.test(q.question)) {
    issues.push({ idx: i, type: 'HAS_HTML', msg: 'Contains HTML tags', q: q.question });
  }
  if (/\s{2,}/.test(q.question)) {
    issues.push({ idx: i, type: 'DOUBLE_SPACE', msg: 'Has double spaces', q: q.question });
  }
});

// Check duplicates (same question text AND same answer)
const seen = {};
qs.forEach((q, i) => {
  const key = (q.question + '|||' + q.answer).toLowerCase().trim();
  if (seen[key] !== undefined) {
    issues.push({ idx: i, type: 'DUPLICATE', msg: 'Duplicate of Q#' + seen[key], q: q.question, a: q.answer });
  } else {
    seen[key] = i;
  }
});

console.log('Total questions: ' + qs.length);
console.log('Total issues: ' + issues.length + '\n');

if (issues.length === 0) {
  console.log('All questions pass validation ✓');
} else {
  const byType = {};
  issues.forEach(iss => { byType[iss.type] = (byType[iss.type] || 0) + 1; });
  console.log('Issues by type:');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log('  ' + t + ': ' + c));
  console.log('');

  issues.forEach(iss => {
    console.log('Q#' + iss.idx + ' [' + iss.type + '] ' + (iss.msg || ''));
    console.log('  Q: ' + (iss.q || '').slice(0, 90));
    if (iss.a) console.log('  A: ' + iss.a);
    if (iss.opts) console.log('  Options: ' + iss.opts.join(' | '));
    console.log('');
  });
}

// Output indices of questions to remove (duplicates)
const toRemove = new Set();
const seen2 = {};
qs.forEach((q, i) => {
  const key = (q.question + '|||' + q.answer).toLowerCase().trim();
  if (seen2[key] !== undefined) {
    toRemove.add(i);
  } else {
    seen2[key] = i;
  }
});

if (toRemove.size > 0) {
  console.log('Questions to remove (duplicates): [' + [...toRemove].sort((a, b) => b - a).join(', ') + ']');
  console.log('Count: ' + toRemove.size);
}
