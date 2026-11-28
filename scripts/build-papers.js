const fs = require('fs');
const path = require('path');
const researchStore = require('./lib/research-store');

const CSP = "default-src 'self' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src https://fonts.gstatic.com https://unpkg.com; script-src 'self' https://pagead2.googlesyndication.com https://www.gstatic.com https://apis.google.com https://unpkg.com https://static.cloudflareinsights.com https://ep2.adtrafficquality.google https://*.adtrafficquality.google; connect-src 'self' https:; frame-src 'self' https://googleads.g.doubleclick.net https://ep2.adtrafficquality.google https://www.google.com; upgrade-insecure-requests";

const BASE = 'https://vlymbooq.qzz.io';
const EXAMS = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer', 'upsc', 'ibps-po', 'sbi-clerk', 'ssc-gd', 'ctet', 'nda', 'cds', 'clat', 'apfc'];
let RESEARCH = {};
let SLUG = '';

function esc(s) {
  if (!s) return '';
  // The course banks already carry HTML entities such as &rarr; and &infin;
  // (extracted from authored lesson sources). Escaping every bare "&" turned
  // them into "&amp;rarr;" and printed the entity literally on paper pages.
  // Preserve anything that is already a valid named/numeric entity.
  return String(s)
    // A NUL or other C0 control byte inside a solution (seen in older
    // extracted Hindi glosses) makes git treat the whole page as binary and
    // produces invalid HTML. Drop controls, keep tab/newline-free whitespace.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#\d{1,7}|#x[0-9a-fA-F]{1,6});)/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const NAV_LABELS = { cgl: 'CGL', rbi: 'RBI', jee: 'JEE', neet: 'NEET', gate: 'GATE', agniveer: 'Agniveer', 'upsc': 'UPSC', 'ibps-po': 'IBPS PO', 'sbi-clerk': 'SBI Clerk', 'ssc-gd': 'SSC GD', 'ctet': 'CTET', nda: 'NDA', cds: 'CDS', clat: 'CLAT', apfc: 'APFC' };

function navLinks(folder) {
  // Exam-hub links are emitted root-absolute "/<slug>/" — the exact shape
  // site-agent.js's selfcheck enforces for exam-nav links. Emitting the old
  // relative "../../<slug>/index.html" made every regenerated paper page get
  // "repaired" by the selfcheck afterwards (runs #6/#13/#26 touched the same
  // pages), i.e. the two builders ping-ponged the same lines forever.
  var links = '<a href="../index.html">Home</a>';
  for (var i = 0; i < EXAMS.length; i++) {
    var exam = EXAMS[i];
    if (exam === folder) {
      links += '<a href="/' + exam + '/" class="active">' + NAV_LABELS[exam] + '</a>';
    } else {
      links += '<a href="/' + exam + '/">' + NAV_LABELS[exam] + '</a>';
    }
  }
  return links;
}

function jsonLd(type, extra) {
  var obj = { '@context': 'https://schema.org', '@type': type };
  for (var k in extra) { obj[k] = extra[k]; }
  return '<script type="application/ld+json">' + JSON.stringify(obj) + '</script>';
}

function sameQuestion(a, b) {
  const norm = (t) => String(t == null ? '' : t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 160);
  return norm(a) === norm(b);
}

// A question can point at a table, a chart or an image that is stored beside it
// in the data file. The paper renderer printed only the stem, so 70 questions
// asked "as per the table below" with no table on the page. Render the stored
// data under the stem; an item with no data is untouched.
function renderTableData(td) {
  if (!td || !Array.isArray(td.headers) || !Array.isArray(td.rows) || !td.headers.length) return '';
  const head = td.headers.map(function (h) { return '<th style="text-align:left;padding:5px 10px;border-bottom:1px solid #cbd5e1;font-weight:600">' + esc(h) + '</th>'; }).join('');
  const body = td.rows.map(function (row) {
    return '<tr>' + (row || []).map(function (c) {
      return '<td style="padding:5px 10px;border-bottom:1px solid #e2e8f0">' + esc(c) + '</td>';
    }).join('') + '</tr>';
  }).join('');
  return '<div style="margin:10px 0;overflow-x:auto"><table style="border-collapse:collapse;font-size:.9em;background:#f8fafc;color:#1f2937;border:1px solid #e2e8f0;border-radius:6px;min-width:280px">' +
    '<thead><tr style="background:#eef2ff">' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
}

function renderChartData(cd) {
  if (!cd || !Array.isArray(cd.labels) || !Array.isArray(cd.datasets) || !cd.datasets.length) return '';
  const ds = cd.datasets.filter(function (d) { return d && Array.isArray(d.data); });
  if (!ds.length) return '';
  const rows = cd.labels.map(function (label, i) {
    return '<tr><td style="padding:5px 10px;border-bottom:1px solid #e2e8f0">' + esc(label) + '</td>' +
      ds.map(function (d) { return '<td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;text-align:right">' + esc((d.data || [])[i]) + '</td>'; }).join('') + '</tr>';
  }).join('');
  const head = '<th style="text-align:left;padding:5px 10px;border-bottom:1px solid #cbd5e1">' + esc(cd.type || 'chart') + '</th>' +
    ds.map(function (d) { return '<th style="text-align:right;padding:5px 10px;border-bottom:1px solid #cbd5e1">' + esc(d.label || '') + '</th>'; }).join('');
  return '<div style="margin:10px 0;overflow-x:auto"><table style="border-collapse:collapse;font-size:.9em;background:#f8fafc;color:#1f2937;border:1px solid #e2e8f0;border-radius:6px;min-width:280px">' +
    '<caption style="caption-side:top;text-align:left;font-size:.85em;color:#cbd5e1;padding:0 0 4px">' + esc(cd.title || ((cd.type || 'Chart') + ' data')) + '</caption>' +
    '<thead><tr style="background:#eef2ff">' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function renderFigure(q) {
  const url = String(q.imageUrl || '').trim();
  // Placeholder hosts in older bank rows are not images a reader can use.
  if (!/^https?:\/\//i.test(url) || /example\.com|via\.placeholder\.com|placehold\./i.test(url)) return '';
  return '<figure style="margin:10px 0"><img src="' + esc(url) + '" alt="Figure for the question" loading="lazy" style="max-width:100%;height:auto;border:1px solid #e2e8f0;border-radius:6px"></figure>';
}

function cleanStem(q) {
  var t = String(q.text == null ? '' : q.text);
  // Older bank rows append the table to the stem as raw markdown pipes. When
  // tableData is present the table is drawn properly, so drop the duplicate.
  if (!q.tableData) return t;
  var i = t.indexOf('|');
  if (i < 0) return t;
  return t.slice(0, i).replace(/[\s:,\-]+$/, '').trim() || t;
}

function questionData(q) {
  return renderTableData(q.tableData) + renderChartData(q.chartData) + renderFigure(q);
}

function buildQuestion(q, sections) {
  var section = null;
  for (var i = 0; i < sections.length; i++) {
    if (sections[i].name === q.section) { section = sections[i]; break; }
  }
  var badge = section
    ? '<span class="section-badge" style="background:' + section.color + '">' + esc(section.name) + '</span>'
    : '';

  // Every model-written item carries its generation date on the page. The
  // paper-level date is not enough: a set can mix bank and model questions.
  var modelBadge = '';
  if (false && (q.source === 'model' || q.reviewed === false)) { // badge removed for consistency; provenance stays in papers-data
    var madeOn = String(q.generatedAt || '').slice(0, 10);
    modelBadge = '<span class="model-badge" style="display:inline-block;margin-left:6px;font-size:.72em;color:#b45309;background:#fef3c7;border:1px solid #fcd34d;border-radius:100px;padding:2px 7px">model-generated' + (madeOn ? ' · ' + esc(madeOn) : '') + '</span>';
  }

  var opts = '';
  for (var i = 0; i < q.options.length; i++) {
    var o = q.options[i];
    var correct = o.correct ? ' data-correct="true"' : '';
    opts += '<div class="q-option"' + correct + '>' + esc(o.label) + '. ' + esc(o.text) + '</div>';
  }

  var correctAnswer = '';
  for (var i = 0; i < q.options.length; i++) {
    if (q.options[i].correct) { correctAnswer = esc(q.options[i].label); break; }
  }

  var sol = q.solution
    ? '<br><span style="color:#4b5563">' + esc(q.solution) + '</span>'
    : '';
  var lab = RESEARCH[SLUG + '#' + q.q];
  // Research answers were keyed by paper slug + question NUMBER, so when a paper
  // was regenerated the stored method stayed on the number and answered whatever
  // question now sat there: 391 of 577 blocks on the site answered a different
  // question (a Quit India question carrying a net-vector sum). A stored method
  // is used only when it was written for this exact question.
  if (lab && !sameQuestion(lab.question, q.text)) lab = null;
  var labHtml = lab && lab.methods && lab.methods[0]
    ? '<div class="research-lab" style="margin-top:8px;padding:8px 10px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;font-size:.9em;color:#1e3a8a"><strong>Research Team · ~' + (parseInt(lab.methods[0].seconds, 10) || 10) + 's · ' + esc(lab.methods[0].name) + '</strong><ol style="margin:4px 0 0;padding-left:18px">' +
      (lab.methods[0].steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '</ol></div>'
    : '';

  return '<div class="question" data-q="' + q.q + '"><div class="q-number">Q' + q.q + '. ' + badge + modelBadge + '</div><div class="q-text">' + esc(cleanStem(q)) + '</div>' + questionData(q) + '<div class="q-options">' + opts + '</div><button class="show-soln">Show Answer</button><div class="solution-box"><strong>Correct Answer:</strong> ' + correctAnswer + sol + labHtml + '</div></div>';
}

function buildPaper(data) {
  var f = data.folder;
  var sections = data.sections || [];

  var sectionBadges = '';
  if (sections.length > 0) {
    var badges = '';
    for (var i = 0; i < sections.length; i++) {
      badges += '<span class="section-badge" style="background:' + sections[i].color + '">' + esc(sections[i].name) + '</span>';
    }
    sectionBadges = '\n        <div style="margin-bottom:20px;padding:12px;background:rgba(255,255,255,.02);border-radius:8px;font-size:.85em"><strong>Sections:</strong> ' + badges + '</div>';
  }

  var qHtml = '';
  for (var i = 0; i < data.questions.length; i++) {
    qHtml += '\n        ' + buildQuestion(data.questions[i], sections);
  }

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n    <title>' + esc(data.pageTitle) + '</title>\n    <meta name="description" content="' + esc(data.pageDesc) + '">\n    <link rel="icon" type="image/svg+xml" href="../../favicon.svg">\n    <link rel="canonical" href="' + BASE + '/' + data.folder + '/papers/' + data.slug + '.html">\n    ' + jsonLd('WebPage', { name: data.pageTitle, description: data.pageDesc, url: BASE + '/' + data.folder + '/papers/' + data.slug + '.html', educationalLevel: 'Competitive Exam', audience: { '@type': 'EducationalAudience', educationalRole: 'student' } }) + '\n    <link rel="stylesheet" href="../css/style.css">\n    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7363013795551054" crossorigin="anonymous"></script>\n</head>\n<body>\n    <nav class="nav">\n        <div class="nav-inner">\n            <a href="../index.html" class="nav-logo"><svg viewBox="0 0 28 28" fill="none"><defs><linearGradient id="n" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#a78bfa"/><stop offset="48%" stop-color="#a78bfa"/><stop offset="52%" stop-color="#34d399"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs><path d="M6 5 L14 24 L22 5" stroke="url(#n)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="4" r="1.2" fill="#a78bfa"/><circle cx="14" cy="4" r="3" fill="none" stroke="#a78bfa" stroke-width="0.5" opacity="0.35"/></svg><span class="grad">vlymbooq</span></a>\n            <div class="nav-links">' + navLinks(f) + '</div>\n        </div>\n    </nav>\n    <div class="paper-page">\n        <div class="paper-header">\n            <h1>' + esc(data.title) + '</h1>\n            <div class="paper-meta">\n                <span>' + esc(data.meta) + '</span>\n            </div>\n            <p style="font-size:.8em;color:#6b7280;margin-top:8px">Generated ' + esc(data.createdDate || '') + (data.blueprint && data.blueprint.name ? ' · ' + esc(data.blueprint.name) + ' pattern' : '') + '</p>\n        </div>\n        <div class="timer-bar">\n            <span style="font-size:.9em;color:#6b7280">Time Remaining:</span>\n            <span class="timer" id="timer">' + (data.timerMinutes || 60) + ':00</span>\n        </div>\n        <p style="font-size:.9em;color:#4b5563;margin-bottom:24px">Click any option to check your answer.</p>' + sectionBadges + qHtml + '\n    </div>\n    <footer class="site-footer"><p>' + esc(data.title) + ' — Free preparation resource.</p></footer>\n    <script src="../js/main.js"></script>\n    <script src="../../js/supabase.js?v=20260529b"></script>\n    <script src="../../js/shared.js?v=20260529b"></script>\n</body>\n</html>';
}

function run() {
  var root = path.resolve(__dirname, '..');
  var dataDir = path.join(root, 'papers-data');
  RESEARCH = researchStore.indexByPaper(researchStore.load(root));
  var slugArg = process.argv.slice(2).find(function (a) { return a.indexOf('--slug=') === 0; });
  var onlySlug = slugArg ? slugArg.slice('--slug='.length) : '';
  var files = fs.readdirSync(dataDir).filter(function(f) { return f.endsWith('.json'); });

  if (files.length === 0) {
    console.log('No JSON files found in papers-data/');
    return;
  }

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
    if (data.kind === 'full') continue; // full papers are built by build-full-papers.js
    if (onlySlug && data.slug !== onlySlug) continue;
    var folder = data.folder;
    var slug = data.slug;
    SLUG = slug;

    var outDir = path.join(root, folder, 'papers');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    var html = buildPaper(data);
    var outPath = path.join(outDir, slug + '.html');
    fs.writeFileSync(outPath, html, 'utf-8');

    console.log('  ' + folder + '/papers/' + slug + '.html');

    var card = '<div class="paper-card">\n                <div>\n                    <div class="title">' + data.title + '</div>\n                    <div class="meta">' + data.meta + '</div>\n                </div>\n                <a href="papers/' + slug + '.html" class="btn">View Paper</a>\n            </div>';

    console.log('  Index card for ' + folder + '/index.html:');
    console.log(card);
    console.log('');
  }

  // Regenerate calendar data for all exams
  require('./generate-calendar-data.js');
}

run();
