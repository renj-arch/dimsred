// Builds data/questions/archive-index.json
// Contains the true total question count (6.1M) plus per-file metadata so the
// browser can (a) show the correct archive total instantly and (b) load files
// lazily/on-demand instead of pulling all 3.3GB up front.
//
// Usage: node scripts/build-archive-index.mjs
import fs from 'fs';
import path from 'path';

const DIR = 'data/questions';
const OUT = path.join(DIR, 'archive-index.json');
const MSG = {};

let total = 0;
const files = [];
const seenSubjects = {};

for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith('.json')) continue;
  if (f === 'manifest.json' || f === 'archive-index.json') continue;
  const p = path.join(DIR, f);
  let count = 0;
  const subjects = {};
  const subtopics = {};
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const sk in data) {
      const ss = data[sk];
      if (!ss || typeof ss !== 'object') continue;
      if (ss.subSubjects && typeof ss.subSubjects === 'object') {
        const arr = Array.isArray(ss.subSubjects) ? ss.subSubjects : Object.entries(ss.subSubjects);
        const keys = Array.isArray(ss.subSubjects) ? null : Object.keys(ss.subSubjects);
        if (Array.isArray(ss.subSubjects)) {
          // shouldn't happen: subSubjects is an object map
          subjects[sk] = 0;
        } else {
          let subCount = 0;
          const subList = [];
          for (const st in ss.subSubjects) {
            const qs = ss.subSubjects[st];
            if (!Array.isArray(qs)) continue;
            subCount += qs.length;
            subList.push(st);
          }
          subjects[sk] = subCount;
          subtopics[sk] = subList;
          count += subCount;
          seenSubjects[sk] = true;
        }
      }
    }
  } catch (e) {
    MSG[f] = 'parse-error';
  }
  files.push({ file: f, count, subjects, subtopics });
  total += count;
}

const index = {
  generatedAt: new Date().toISOString(),
  total,
  fileCount: files.length,
  manifestFileCount: (() => {
    try { return JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8')).length; } catch (e) { return null; }
  })(),
  files
};

fs.writeFileSync(OUT, JSON.stringify(index));
console.log('Wrote', OUT);
console.log('Files:', files.length, '  Total questions:', total.toLocaleString());
if (Object.keys(MSG).length) console.log('Errors:', MSG);
