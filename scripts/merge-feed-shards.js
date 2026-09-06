// Union-merge current-affairs.json / pib-archive.json produced independently by
// parallel feed shards (each shard replayed the baseline then appended its own
// questions), then copy any singleton files the shards wrote (scratch files,
// book-summaries.json, etc). Keeps all subSubjects; dedups questions by
// text+answer so questions produced by two shards never duplicate in the repo.
//
// Usage:
//   node scripts/merge-feed-shards.cjs <shardsRootDir> [<baselineDir>]
//
//   shardsRootDir : dir whose subdirs each contain `data/` (uploaded per shard)
//   baselineDir   : dir with the untouched merged data/ (defaults to cwd/data)

const fs = require('fs');
const path = require('path');

const SHARED = ['current-affairs.json', 'pib-archive.json'];
const SKIP_FILES = ['quiz.json', 'archive.html']; // not merged here

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

// Merge `shard` (parsed) into `base` (parsed), deduping by qKey within every subSubject.
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
          if (!bRoot.subSubjects[ss]) { bRoot.subSubjects[ss] = []; }
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
  // Some producers store a "total" field on each root/subject; fix stale numbers.
  for (const rootKey of Object.keys(fileObj)) {
    const root = fileObj[rootKey];
    if (root && root.subSubjects) {
      let total = 0;
      for (const qs of Object.values(root.subSubjects)) total += Array.isArray(qs) ? qs.length : 0;

      if (root.total !== undefined) root.total = total;
      if (root.totalQuestions !== undefined) root.totalQuestions = total;
    }
  }
  return fileObj;
}

function load(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function main() {
  const shardsRoot = process.argv[2] || 'shards';
  const baseline = process.argv[3] || process.cwd();
  const qDir = path.resolve(baseline, 'data', 'questions');

  if (!fs.existsSync(shardsRoot)) {
    console.log('No shard dir (' + shardsRoot + '); nothing to merge. Baseline left untouched.');
    return;
  }

  const shardDirs = fs.readdirSync(shardsRoot, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => path.join(shardsRoot, e.name));
  if (shardDirs.length === 0) { console.error('No shard dirs found in ' + shardsRoot); process.exit(1); }

  // Per shard, locate its payload: uploads carry `data/questions` (path was
  // `data/...` in older runs) or just `questions`/singletons (narrowed upload).
  const shardQuestionDirs = shardDirs.map(sd => {
    const probes = [
      ['data', 'data/questions'],
      ['', 'questions'],
      ['data', 'data'],
    ];
    for (const [root, qRel] of probes) {
      const qDirPath = path.join(sd, qRel);
      if (fs.existsSync(qDirPath)) return { dir: sd, qDir: qDirPath, dataDir: path.join(sd, root) };
    }
    return { dir: sd, qDir: sd, dataDir: sd };
  });

  // 1) union-merge the shared files
  for (const name of SHARED) {
    const baseFile = path.join(qDir, name);
    let base = fs.existsSync(baseFile) ? load(baseFile) : {};
    for (const s of shardQuestionDirs) {
      const sf = path.join(s.qDir, name);
      if (!fs.existsSync(sf)) continue;
      console.error('union ' + name + ' <- ' + sf);
      unionMerge(base, load(sf));
    }
    base = recomputeTotal(base);
    fs.writeFileSync(baseFile, JSON.stringify(base), 'utf8');
    console.log('Merged ' + name + ' -> ' + baseFile);
  }

  // 2) copy any other file each shard writes (scratch, book-summaries, etc.)
  for (const s of shardQuestionDirs) {
    const sdData = s.dataDir;
    if (!fs.existsSync(sdData)) continue;
    const walk = (dir, relRoot) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const src = path.join(dir, e.name);
        if (e.isDirectory()) { walk(src, path.join(relRoot, e.name)); continue; }
        if (SKIP_FILES.indexOf(e.name) !== -1) continue;
        if (SHARED.indexOf(e.name) !== -1) { if (relRoot.endsWith('questions')) continue; }
        const dest = path.join(baseline, relRoot, e.name);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        console.error('copy ' + src + ' -> ' + dest);
      }
    };
    walk(sdData, 'data');
  }
  console.log('Feed shards merged successfully.');
}

main();