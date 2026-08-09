// resolve-data-merge.js
//
// Resolve git merge conflicts on union-mergeable data files (current-affairs.json,
// pib-archive.json) by keeping BOTH sides (deduped by question||answer), instead
// of git's default which drops one side. On non-data conflicts it simply stages
// the merge result we already resolved.
//
// Usage (after a merge left conflicted files):
//   node scripts/resolve-data-merge.js
//
// It looks for files listed in `git diff --name-only --diff-filter=U`, for each
// known SHARED file it reads stage 2 (ours) and stage 3 (theirs) blobs, unions
// them, writes the winning content and `git add`s it. Everything else is left
// for git (default resolution).

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SHARED = ['current-affairs.json', 'pib-archive.json'];

function norm(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&#160;/g, ' ')
    .replace(/&#91;/g, '[')
    .replace(/&#93;/g, ']')
    .replace(/&#39;/g, "'")
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
function qKey(q) {
  return norm(q.question || q.text) + '||' + norm(q.answer || q.entity);
}
function clone(v) { return JSON.parse(JSON.stringify(v)); }

function unionMerge(base, shard) {
  for (const rootKey of Object.keys(shard)) {
    if (!(rootKey in base)) { base[rootKey] = clone(shard[rootKey]); continue; }
    const bRoot = base[rootKey];
    const sRoot = shard[rootKey];
    for (const key of Object.keys(sRoot)) {
      if (key === 'subSubjects') {
        if (!bRoot.subSubjects) bRoot.subSubjects = {};
        for (const ss of Object.keys(sRoot.subSubjects)) {
          const qs = sRoot.subSubjects[ss] || [];
          if (!Array.isArray(qs) || qs.length === 0) continue;
          if (!bRoot.subSubjects[ss]) bRoot.subSubjects[ss] = [];
          const seen = new Set(bRoot.subSubjects[ss].map(qKey));
          for (const q of qs) {
            const k = qKey(q);
            if (seen.has(k)) continue;
            seen.add(k);
            bRoot.subSubjects[ss].push(q);
          }
        }
      } else {
        bRoot[key] = clone(sRoot[key]);
      }
    }
  }
}
function recomputeTotal(fileObj) {
  for (const rootKey of Object.keys(fileObj)) {
    const root = fileObj[rootKey];
    if (root && root.subSubjects) {
      let total = 0;
      for (const qs of Object.values(root.subSubjects)) total += Array.isArray(qs) ? qs.length : 0;
      if (root.total !== undefined) root.total = total;
      if (root.totalQuestions !== undefined) root.totalQuestions = total;
    }
  }
}

function readStage(file) {
  // git show :2:path  (ours)   :3:path (theirs)
  // NOTE: the index paths are repo-relative (e.g. data/questions/current-affairs.json),
  // so `file` must be the full conflicted path, NOT a basename.
  const ours = JSON.parse(execSync('git show :2:' + file, { maxBuffer: 512 * 1024 * 1024 }).toString());
  const theirs = JSON.parse(execSync('git show :3:' + file, { maxBuffer: 512 * 1024 * 1024 }).toString());
  recomputeTotal(ours);
  recomputeTotal(theirs);
  unionMerge(ours, theirs); // ours is base, theirs appended
  recomputeTotal(ours); // totals must reflect the post-union counts
  return JSON.stringify(ours);
}

function main() {
  const conflicted = execSync('git diff --name-only --diff-filter=U')
    .toString().split('\n').filter(s => s.trim());
  if (conflicted.length === 0) { console.log('No conflicts to resolve.'); return; }
  for (const rel of conflicted) {
    const base = path.basename(rel);
    if (SHARED.indexOf(base) === -1) {
      console.log('Non-data conflict — keeping local (ours) version: ' + rel);
      execSync('git checkout --ours -- ' + rel);
      execSync('git add ' + JSON.stringify(rel));
      continue;
    }
    console.log('Union-merging ' + rel + ' (keeping both sides, deduped)');
    fs.writeFileSync(rel, readStage(rel));
    execSync('git add ' + JSON.stringify(rel));
  }
  console.log('Conflict resolution complete.');
}

main();