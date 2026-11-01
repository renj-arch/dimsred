// Remove degenerate questions mined from Wikipedia disambiguation / "same name"
// index pages (e.g. 'What is Panini? Topics referred to by the same term.').
// These have an empty fact and their question text is just the DAB boilerplate.
//
// Usage: node scripts/cleanup-dab-questions.js

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'questions');

// Signatures that identify a degenerate disambiguation-miner question:
// - question ends in a DAB "same term / same name / list of" phrasing, or
// - the question is essentially "<Topic> is ..." where answer == topic and no fact.
const DAB = /topics referred to by the same term|index(?:ed)? of (?:articles|conflicts|people|entities|banks|currencies)(?: associated)? with the same name|list of banks and currencies/i;

function isDabQuestion(q) {
  const text = String(q && q.question || '') + ' ' + String(q && q.fact || '');
  if (DAB.test(text)) return true;
  const ans = String(q && q.answer || '');
  if (/\(disambiguation\)/i.test(ans)) return true;
  // Degenerate empty-fact question that merely echoes a bare topic name,
  // e.g. 'The _____ was World Weightlifting Championships.' — no explanatory
  // content. Empty fact + question ends by restating the noun phrase.
  const question = String(q && q.question || '').replace(/\s+/g, ' ').trim();
  if (!String(q && q.fact || '').trim() && question.length < 65) {
    const noun = ans.replace(/^\d{4}[\s-]+/, '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (noun.length > 3 && question.toLowerCase().indexOf(noun) >= 0) return true;
  }
  return false;
}

function main() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'manifest.json');
  let removedTotal = 0;
  let changedFiles = 0;

  files.forEach(file => {
    const p = path.join(DATA_DIR, file);
    let raw = fs.readFileSync(p, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    let j;
    try { j = JSON.parse(raw); } catch (e) { return; }

    let removed = 0;
    Object.keys(j).forEach(cat => {
      const subs = j[cat].subSubjects;
      if (!subs) return;
      Object.keys(subs).forEach(ss => {
        const qs = subs[ss];
        if (!Array.isArray(qs)) return;
        const kept = qs.filter(q => {
          if (isDabQuestion(q)) { removed++; return false; }
          return true;
        });
        if (kept.length !== qs.length) subs[ss] = kept;
      });
    });

    if (removed > 0) {
      // Preserve original formatting flavour (these files are minified single-line).
      fs.writeFileSync(p, JSON.stringify(j), 'utf8');
      changedFiles++;
      removedTotal += removed;
      console.log(file + ': removed ' + removed);
    }
  });

  console.log('\nDone: removed ' + removedTotal + ' degenerate DAB questions across ' + changedFiles + ' files.');
}

main();