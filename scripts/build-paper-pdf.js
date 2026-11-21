// Build a real PDF for every full paper: cover + instructions, all questions
// and options, the answer key, and every explanation. Uses pdfkit (pure JS,
// no browser) so the GitHub runner can produce it.
const fs = require('fs');
const path = require('path');
const researchStore = require('./lib/research-store');

let PDFDocument;
try { PDFDocument = require('pdfkit'); } catch (e) {
  console.error('pdfkit is missing. Run npm install (pdfkit is a dependency) before building PDFs.');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'papers-data');
const OUT_DIR = path.join(ROOT, 'pdfs');
const M = 46;
let RESEARCH = {};
let SLUG = '';

function safe(s) {
  return String(s == null ? '' : s)
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...')
    .replace(/\u2192/g, '->').replace(/\u20B9/g, 'Rs ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function correctLabel(q) {
  const o = (q.options || []).find(function (x) { return x.correct; });
  return o ? o.label : '';
}

function build(data) {
  RESEARCH = researchStore.indexByPaper(researchStore.load(ROOT));
  SLUG = data.slug;
  const doc = new PDFDocument({ size: 'A4', margin: M, info: {
    Title: safe(data.pageTitle), Author: 'vlymbooq', Subject: safe(data.meta),
    Keywords: 'exam, full paper, ' + data.folder, CreationDate: new Date()
  } });
  const file = path.join(OUT_DIR, data.slug + '.pdf');
  doc.pipe(fs.createWriteStream(file));
  const W = doc.page.width - M * 2;

  function h1(t) { doc.font('Helvetica-Bold').fontSize(20).fillColor('#111').text(safe(t), { width: W }); }
  function h2(t) { doc.moveDown(0.5); doc.font('Helvetica-Bold').fontSize(14).fillColor('#111').text(safe(t), { width: W }); doc.moveDown(0.3); }
  function p(t, opts) { doc.font('Helvetica').fontSize(10).fillColor('#222').text(safe(t), Object.assign({ width: W }, opts || {})); }
  function need(h) { if (doc.y + h > doc.page.height - M) doc.addPage(); }
  function footer() {
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.font('Helvetica').fontSize(8).fillColor('#777')
        .text(safe(data.title) + '  ·  page ' + (i + 1) + ' of ' + range.count, M, doc.page.height - 30, { width: W, align: 'center' });
    }
  }

  doc.rect(0, 0, doc.page.width, 150).fill('#0f172a');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(11).text('VLYMBOOQ · FULL-LENGTH MOCK PAPER', M, 40, { width: W });
  doc.fontSize(24).text(safe(data.title), M, 62, { width: W });
  doc.font('Helvetica').fontSize(11).fillColor('#cbd5e1')
    .text(safe(data.questions.length + ' questions · ' + data.totalMarks + ' marks · ' + data.timerMinutes + ' minutes'), M, 112, { width: W });
  doc.fillColor('#111').y = 176;

  h2('Paper pattern');
  p('Exam: ' + data.title);
  p('Questions: ' + data.questions.length + '   Marks: ' + data.totalMarks + '   Time: ' + data.timerMinutes + ' minutes');
  p('Negative marking: ' + (data.negativeNote || data.negativeMarking));
  if (data.source) p('Source: ' + data.source);
  p('Generated: ' + (data.generatedAt || data.createdDate) + '   By: ' + (data.generatedBy || ''));
  if (data.note) p('Note: ' + data.note);
  if (data.provisional) p('Section counts for this paper are provisional and may vary by year.');

  h2('Sections');
  (data.sectionsMeta || []).forEach(function (s) {
    p('• ' + s.name + ' — ' + s.count + ' questions, ' + s.marks + ' marks');
  });
  h2('Instructions');
  ['The timer is for practice; the real paper allows ' + data.timerMinutes + ' minutes.',
    'Each question has exactly one correct option.',
    'Negative marking: ' + (data.negativeNote || data.negativeMarking) + '.',
    'The answer key and a full explanation for every question follow the paper.',
    'Model-generated questions are marked as such in the HTML page; verify any factual detail against the official notification.'
  ].forEach(function (t) { p('• ' + t); });

  doc.addPage();
  let current = '';
  data.questions.forEach(function (q) {
    if (q.section !== current) {
      current = q.section;
      need(50);
      h2(current);
    }
    need(60);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111').text('Q' + q.q + '. ', M, doc.y, { continued: true, width: W });
    doc.font('Helvetica').fillColor('#111').text(safe(q.text), { width: W });
    doc.moveDown(0.15);
    (q.options || []).forEach(function (o) {
      doc.font('Helvetica').fontSize(9.5).fillColor('#333').text('   ' + o.label + '. ' + safe(o.text), { width: W, indent: 8 });
    });
    if (q.source === 'model' || q.reviewed === false) {
      doc.font('Helvetica-Oblique').fontSize(8).fillColor('#92400e')
        .text('   Model-generated · ' + safe(String(q.generatedAt || '').slice(0, 10)), { width: W, indent: 8 });
    }
    doc.moveDown(0.35);
  });

  doc.addPage();
  h2('Answer key');
  const perRow = 4;
  for (let i = 0; i < data.questions.length; i += perRow) {
    const chunk = data.questions.slice(i, i + perRow);
    need(18);
    const y = doc.y;
    chunk.forEach(function (q, j) {
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111')
        .text('Q' + q.q + '  ' + correctLabel(q), M + j * (W / perRow), y, { width: W / perRow - 8 });
    });
    doc.y = y + 16;
  }

  doc.addPage();
  h2('Solutions and explanations');
  data.questions.forEach(function (q) {
    need(45);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111').text('Q' + q.q + '. ' + safe(q.text), { width: W });
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#047857').text('Answer: ' + correctLabel(q), { width: W });
    doc.font('Helvetica').fontSize(9).fillColor('#222').text(safe(q.solution || ''), { width: W });
    var lab = RESEARCH[SLUG + '#' + q.q];
    if (lab && lab.methods && lab.methods[0]) {
      var m = lab.methods[0];
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1d4ed8')
        .text('Research Team · ~' + (parseInt(m.seconds, 10) || 10) + 's · ' + safe(m.name), { width: W });
      doc.font('Helvetica').fontSize(8.5).fillColor('#1e3a8a')
        .text('   ' + safe((m.steps || []).join(' → ')), { width: W, indent: 6 });
    }
    doc.moveDown(0.45);
  });

  footer();
  doc.end();
  return file;
}

function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // A paper run must only rebuild its own PDF. Rebuilding every PDF changes
  // bytes on every run and turns parallel paper pushes into binary conflicts.
  const slugArg = process.argv.slice(2).find(function (a) { return a.indexOf('--slug=') === 0; });
  const onlySlug = slugArg ? slugArg.slice('--slug='.length) : '';
  const files = fs.readdirSync(DATA_DIR).filter(function (f) { return f.endsWith('.json'); });
  let n = 0;
  files.forEach(function (f) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')); } catch (e) { return; }
    if (data.kind !== 'full') return;
    if (onlySlug && data.slug !== onlySlug) return;
    const out = build(data);
    console.log(path.relative(ROOT, out) + ' (' + data.questions.length + ' Q)');
    n++;
  });
  console.log('Built ' + n + ' PDF(s).');
}

run();
