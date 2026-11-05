// Builds data/questions/archive-index.json
// Contains the true total question count (6.1M) plus per-file counts so the
// browser can (a) show the correct archive total instantly and (b) load files
// lazily/on-demand instead of pulling all 3.3GB up front.
//
// Only {file,count} are emitted: the archive quiz needs nothing else, and the
// heavier per-file subject/subtopic maps inflated the index to ~5MB — which can
// blow past the browser's XHR timeout on slow mobile and leave the archive
// showing "not loaded". Keeping it tiny makes it load in milliseconds.
//
// Usage: node scripts/build-archive-index.mjs
import fs from 'fs';
import path from 'path';

const DIR = 'data/questions';
const OUT = path.join(DIR, 'archive-index.json');
const MSG = {};

let total = 0;
const files = [];

for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith('.json')) continue;
  if (f === 'manifest.json' || f === 'archive-index.json' || f === 'archive-cat-index.json') continue;
  const p = path.join(DIR, f);
  let count = 0;
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const sk in data) {
      const ss = data[sk];
      if (!ss || typeof ss !== 'object') continue;
      if (ss.subSubjects && typeof ss.subSubjects === 'object' && !Array.isArray(ss.subSubjects)) {
        for (const st in ss.subSubjects) {
          const qs = ss.subSubjects[st];
          if (!Array.isArray(qs)) continue;
          count += qs.length;
        }
      }
    }
  } catch (e) {
    MSG[f] = 'parse-error';
  }
  files.push({ file: f, count });
  total += count;
}

const index = {
  generatedAt: new Date().toISOString(),
  // The deduplicated unique count — the number archive.html/catalog.json show
  // and visitors browse (questions re-filed into several files collapse to
  // one). catalog.json is written by build-archive-single.js in the same
  // pipeline pass; fall back to the raw per-file sum if it is missing.
  total: (() => {
    const cat = (() => {
      try { return JSON.parse(fs.readFileSync(path.join(DIR, 'catalog.json'), 'utf8')); } catch (e) { return null; }
    })();
    const prev = (() => {
      try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { return null; }
    })();
    let candidate = (cat && typeof cat.total === 'number' && cat.total > 0) ? cat.total : total;

    // A stale/partial catalog.json must never make the published total shrink
    // while the corpus itself grew. If the corpus is at least as large as the
    // previous build but the catalog reports a lower total, the catalog is
    // behind — keep the previous published total instead of regressing.
    if (prev && typeof prev.total === 'number' && prev.total > 0) {
      if (candidate < prev.total && total >= (prev.rawTotal || 0)) {
        console.warn('Ignoring stale catalog total ' + candidate.toLocaleString() +
          ' (previous published ' + prev.total.toLocaleString() + ', corpus raw ' + total.toLocaleString() + ')');
        candidate = prev.total;
      }
    }
    return candidate;
  })(),
  rawTotal: total,
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
