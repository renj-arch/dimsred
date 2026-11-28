const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const papersDir = path.join(root, 'papers-data');
const outFile = path.join(root, 'data', 'papers.json');

// Exam display names + short codes for paper page URLs
const EXAM_LABELS = {
  agniveer: 'Agniveer', upsc: 'UPSC', 'ibps-po': 'IBPS PO',
  'sbi-clerk': 'SBI Clerk', 'ssc-gd': 'SSC GD', ctet: 'CTET',
  cgl: 'SSC CGL', gate: 'GATE', jee: 'JEE', neet: 'NEET',
  nda: 'NDA', cds: 'CDS', clat: 'CLAT', rbi: 'RBI'
};

// Full exam names
const EXAM_FULL = {
  agniveer: 'Agniveer (Indian Army)',
  upsc: 'UPSC Civil Services',
  'ibps-po': 'IBPS PO',
  'sbi-clerk': 'SBI Clerk',
  'ssc-gd': 'SSC GD Constable',
  ctet: 'CTET',
  cgl: 'SSC CGL',
  gate: 'GATE',
  jee: 'JEE Main',
  neet: 'NEET UG',
  nda: 'NDA',
  cds: 'CDS',
  clat: 'CLAT',
  rbi: 'RBI Grade B'
};

// Scan papers-data/ for previous-year and practice-set papers
function scanPapers() {
  const files = fs.readdirSync(papersDir).filter(f => f.endsWith('.json'));
  const papers = [];

  for (const f of files) {
    const p = path.join(papersDir, f);
    let d;
    try { d = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { continue; }
    const qs = d.questions || d || [];
    if (!qs.length) continue;

    // Determine exam key from filename
    let examKey = null;
    for (const ek of Object.keys(EXAM_LABELS)) {
      if (f.startsWith(ek + '-')) { examKey = ek; break; }
    }
    if (!examKey) continue;

    // Determine type and year
    let type = 'practice';
    let year = null;
    let paperLabel = null;

    const mYear = f.match(/-(\d{4})-|full-(\d{4})-/);
    if (mYear) year = parseInt(mYear[1] || mYear[2], 10);

    if (f.includes('-full-')) {
      type = 'previous-year';
      paperLabel = f.replace('.json', '').replace(examKey + '-full-', '');
    } else if (f.includes('-practice-set-')) {
      type = 'practice-set';
      const mSet = f.match(/-practice-set-(\d+)/);
      paperLabel = 'Practice Set ' + (mSet ? mSet[1] : '');
    } else {
      continue; // skip unknown
    }

    // Count sections
    const sections = {};
    qs.forEach(q => { const s = q.section || 'General'; sections[s] = (sections[s] || 0) + 1; });

    papers.push({
      id: examKey + '-' + f.replace('.json', ''),
      exam: EXAM_LABELS[examKey],
      examKey: examKey,
      year: year || 0,
      paper: paperLabel || f.replace('.json', ''),
      type: type,
      totalQuestions: qs.length,
      sections: Object.entries(sections).map(([name, count]) => ({ name, count })),
      sourceFile: f
    });
  }

  // Sort: previous-year first (by year desc), then practice sets (by set num desc)
  papers.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'previous-year' ? -1 : 1;
    if (a.type === 'previous-year') return b.year - a.year;
    return b.year - a.year;
  });

  return papers;
}

const papers = scanPapers();
const out = {
  generatedAt: new Date().toISOString(),
  totalPapers: papers.length,
  totalQuestions: papers.reduce((s, p) => s + p.totalQuestions, 0),
  exams: [...new Set(papers.map(p => p.exam))].sort(),
  papers: papers
};

fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('Wrote ' + outFile);
console.log('Total papers: ' + papers.length);
console.log('Total questions: ' + out.totalQuestions);
const byExam = {};
papers.forEach(p => { byExam[p.exam] = (byExam[p.exam] || 0) + 1; });
Object.entries(byExam).forEach(([e, c]) => console.log('  ' + e + ': ' + c + ' papers'));
