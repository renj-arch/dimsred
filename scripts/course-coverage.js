#!/usr/bin/env node
// Coverage audit for the agent-written course lessons.
//
// The question "is the course complete and detailed?" needs a number, not an
// opinion. This measures every exam-configured lesson page against the same
// depth target the expander uses, so gaps and progress are both visible:
//
//   node scripts/course-coverage.js            # human report
//   node scripts/course-coverage.js --json     # machine-readable summary
//   node scripts/course-coverage.js --top 40   # show more gaps
//
// Why word targets: the eight hand-built UPSC GS lessons average 58,278 words
// of prose. A generated lesson averaged 902. A fifth of the corpus was at less
// than 1% of hand-built density, and a pass-count cap hid that completely.
//
// Writes data/course-coverage.json (allowlisted in .gitignore) so the site can
// publish the same figure it is judged on.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET = Math.max(1000, parseInt(process.env.EXPAND_DEPTH_TARGET_WORDS || '20000', 10));
const TARGET_BUILT = Math.max(1000, parseInt(process.env.EXPAND_DEPTH_TARGET_WORDS_BUILT || '45000', 10));
const OUT = path.join(ROOT, 'data', 'course-coverage.json');

const args = process.argv.slice(2);
const asJson = args.indexOf('--json') !== -1;
const topIdx = args.indexOf('--top');
const topN = topIdx === -1 ? 25 : Math.max(1, parseInt(args[topIdx + 1] || '25', 10) || 25);

// Same cleaning the expander uses: scripts/styles/svg are not prose.
function cleanPageSource(html) {
  return String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}
function pageWords(fp) {
  try {
    const text = cleanPageSource(fs.readFileSync(fp, 'utf8')).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ');
    return text.split(/\s+/).filter(w => w.length > 1).length;
  } catch (e) {
    return null; // unreadable: reported separately, never silently zero
  }
}

const configs = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'exam-configs.json'), 'utf8'));
const lessons = new Map(); // key -> { key, words, page, exams[] }

for (const ek of Object.keys(configs)) {
  const cfg = configs[ek];
  if (!cfg || !cfg.modules) continue;
  const dir = cfg.dir || ek;
  for (const mk of (cfg.moduleOrder || Object.keys(cfg.modules))) {
    const mod = cfg.modules[mk];
    if (!mod || !Array.isArray(mod.lessons)) continue;
    for (const lesson of mod.lessons) {
      const slug = lesson && (lesson.slug || lesson.id);
      if (!slug) continue;
      const key = mk + '/' + slug;
      if (lessons.has(key)) continue;
      const rel = dir + '/course/' + mk + '/lesson-' + slug + '.html';
      const abs = path.join(ROOT, rel);
      const words = fs.existsSync(abs) ? pageWords(abs) : null;
      lessons.set(key, { key, page: rel, words: words, exams: [ek] });
    }
  }
}

// Hand-built pages that no exam config lists (the serious ones).
const GS_DIR = path.join(ROOT, 'upsc', 'course', 'gs');
if (fs.existsSync(GS_DIR)) {
  for (const f of fs.readdirSync(GS_DIR)) {
    if (!f.startsWith('lesson-') || !f.endsWith('.html')) continue;
    const key = 'upsc-guide/' + f.replace(/^lesson-/, '').replace(/\.html$/, '');
    const rel = 'upsc/course/gs/' + f;
    lessons.set(key, { key, page: rel, words: pageWords(path.join(ROOT, rel)), exams: ['upsc'], handBuilt: true });
  }
}

const rows = [...lessons.values()].map(r => {
  const target = r.handBuilt ? TARGET_BUILT : TARGET;
  const words = r.words;
  return {
    key: r.key,
    page: r.page,
    handBuilt: !!r.handBuilt,
    words: words,
    target: target,
    deficit: words === null ? target : Math.max(0, target - words),
    pct: words === null ? 0 : Math.min(100, Math.round((words / target) * 1000) / 10)
  };
});

const unreadable = rows.filter(r => r.words === null);
const measured = rows.filter(r => r.words !== null);
const met = measured.filter(r => r.words >= r.target).length;
const totalWords = measured.reduce((a, r) => a + r.words, 0);
const totalTarget = rows.reduce((a, r) => a + r.target, 0);
const gaps = measured.filter(r => r.words < r.target).sort((a, b) => a.pct - b.pct);

const summary = {
  generatedAt: new Date().toISOString(),
  lessons: rows.length,
  measured: measured.length,
  unreadable: unreadable.length,
  atTarget: met,
  targetWords: { generated: TARGET, handBuilt: TARGET_BUILT },
  totalWords: totalWords,
  totalTargetWords: totalTarget,
  coveragePct: Math.round((totalWords / totalTarget) * 1000) / 10,
  medianWords: measured.length ? measured.map(r => r.words).sort((a, b) => a - b)[Math.floor(measured.length / 2)] : 0,
  gaps: gaps.slice(0, 200)
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));

if (asJson) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('=== COURSE COVERAGE ===');
  console.log('lessons measured      : ' + summary.measured + (unreadable.length ? '  (' + unreadable.length + ' unreadable)' : ''));
  console.log('at target or better   : ' + met);
  console.log('median lesson         : ' + summary.medianWords + ' words');
  console.log('total prose           : ' + totalWords.toLocaleString() + ' / ' + totalTarget.toLocaleString() + ' target words');
  console.log('overall coverage      : ' + summary.coveragePct + '%');
  console.log('');
  console.log('=== ' + Math.min(topN, gaps.length) + ' BIGGEST GAPS (of ' + gaps.length + ') ===');
  for (const g of gaps.slice(0, topN)) {
    console.log('  ' + String(g.pct).padStart(5) + '%  ' + String(g.words).padStart(7) + '/' + String(g.target).padStart(6) +
      '  ' + (g.handBuilt ? '[hand] ' : '       ') + g.key);
  }
  if (unreadable.length) {
    console.log('');
    console.log('=== UNREADABLE (a missing page is a defect, not a zero) ===');
    unreadable.slice(0, 20).forEach(r => console.log('  ' + r.page));
  }
  console.log('');
  console.log('wrote ' + path.relative(ROOT, OUT));
}
