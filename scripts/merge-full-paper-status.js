// Resolve a merge conflict in data/full-paper-status.json.
//
// Every full-paper run rewrites this file with a single entry. Two runs can
// still meet when one finishes while another is pushing, and a rebase then
// aborts on the same file forever. This merges both sides by exam+paper,
// keeping the newest checkedAt, so no run's status is lost.
const fs = require('fs');
const { execSync } = require('child_process');

const FILE = 'data/full-paper-status.json';

function side(stage) {
  try {
    return JSON.parse(execSync('git show :' + stage + ':' + FILE, { encoding: 'utf8' }));
  } catch (e) {
    return { papers: [] };
  }
}

const ours = side(2);
const theirs = side(3);
const map = {};
[].concat(theirs.papers || [], ours.papers || []).forEach(function (s) {
  if (!s || !s.exam) return;
  const k = s.exam + '|' + (s.paper || '');
  const prev = map[k];
  if (!prev || String(s.checkedAt || '') >= String(prev.checkedAt || '')) map[k] = s;
});
const out = {
  updatedAt: new Date().toISOString(),
  papers: Object.keys(map).map(function (k) { return map[k]; })
    .sort(function (a, b) { return String(b.checkedAt || '').localeCompare(String(a.checkedAt || '')); })
};
fs.writeFileSync(FILE, JSON.stringify(out, null, 2), 'utf-8');
console.log('merged ' + out.papers.length + ' full-paper status entries');
