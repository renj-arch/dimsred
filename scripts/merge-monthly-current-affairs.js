// Merge fresh monthly "Current Affairs" / "Indian Current Affairs" questions
// (written by fetch-current-events.js and fetch-indian-ca.js) into the tracked
// data/questions/current-affairs.json so the auto-fetch output is committed and
// served. Preserves all existing subSubjects and dedups by text+answer.
//
// Usage: node scripts/merge-monthly-current-affairs.js [--keep-scratch]

const fs = require('fs');
const path = require('path');

const AFFAIRS = path.join(__dirname, '..', 'data', 'questions', 'current-affairs.json');
const SOURCES = [
  path.join(__dirname, '..', 'data', 'questions', 'current-events.json'),
  path.join(__dirname, '..', 'data', 'questions', 'indian-current-affairs.json'),
];

function norm(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&#160;/g, ' ')
    .replace(/&#91;/g, '[')
    .replace(/&#93;/g, ']')
    .replace(/&#39;/g, "'")
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function eventKey(q) {
  return norm(q.question || q.text) + '||' + norm(q.answer || q.entity);
}

function flatSubSubjects(catFile) {
  const out = [];
  for (const [, subjData] of Object.entries(catFile)) {
    if (!subjData || !subjData.subSubjects) continue;
    for (const [ss, qs] of Object.entries(subjData.subSubjects)) {
      for (const q of qs) out.push({ ss, q });
    }
  }
  return out;
}

function main() {
  if (!fs.existsSync(AFFAIRS)) {
    console.error('current-affairs.json not found: ' + AFFAIRS);
    process.exit(1);
  }
  const affairs = JSON.parse(fs.readFileSync(AFFAIRS, 'utf8').replace(/^\uFEFF/, ''));

  // Collect existing keys so we don't duplicate questions already present.
  const seen = new Set();
  for (const { q } of flatSubSubjects(affairs)) seen.add(eventKey(q));

  let added = 0;
  let mergedFrom = 0;
  for (const src of SOURCES) {
    if (!fs.existsSync(src)) { console.error('skip (missing): ' + src); continue; }
    const fresh = JSON.parse(fs.readFileSync(src, 'utf8').replace(/^\uFEFF/, ''));
    for (const { ss, q } of flatSubSubjects(fresh)) {
      // Only fold in monthly subSubjects (e.g. "August 2026"), never topical ones.
      if (!/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/.test(ss)) {
        continue;
      }
      const key = eventKey(q);
      if (seen.has(key)) continue;
      seen.add(key);
      // Store under the single "Current Affairs" root (matches split-quiz output).
      const rootKey = Object.keys(affairs)[0];
      const root = affairs[rootKey];
      if (!root.subSubjects[ss]) root.subSubjects[ss] = [];
      root.subSubjects[ss].push(q);
      added++;
    }
    mergedFrom++;
    if (process.argv.indexOf('--keep-scratch') === -1) {
      fs.unlinkSync(src);
      console.error('removed scratch: ' + src);
    }
  }

  fs.writeFileSync(AFFAIRS, JSON.stringify(affairs), 'utf8');
  const total = Object.values(affairs[Object.keys(affairs)[0]].subSubjects)
    .reduce((a, qs) => a + qs.length, 0);
  console.log('Merged monthly current-affairs: ' + mergedFrom + ' source(s), +' + added + ' questions. Total now ' + total);
  if (added === 0) console.error('No new monthly questions found (fetchers produced nothing new).');
}

main();