const fs = require('fs');
const path = require('path');

const CSP = "default-src 'self' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src https://fonts.gstatic.com https://unpkg.com; script-src 'self' https://pagead2.googlesyndication.com https://www.gstatic.com https://apis.google.com https://unpkg.com https://static.cloudflareinsights.com https://ep2.adtrafficquality.google https://*.adtrafficquality.google; connect-src 'self' https:; frame-src 'self' https://googleads.g.doubleclick.net https://ep2.adtrafficquality.google https://www.google.com; upgrade-insecure-requests";

const BASE = 'https://vlymbooq.qzz.io';
const EXAMS = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer', 'upsc', 'ibps-po', 'sbi-clerk', 'ssc-gd', 'ctet'];

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const NAV_LABELS = { cgl: 'CGL', rbi: 'RBI', jee: 'JEE', neet: 'NEET', gate: 'GATE', agniveer: 'Agniveer', 'upsc': 'UPSC', 'ibps-po': 'IBPS PO', 'sbi-clerk': 'SBI Clerk', 'ssc-gd': 'SSC GD', 'ctet': 'CTET' };

function navLinks(folder) {
  var links = '<a href="../index.html">Home</a>';
  for (var i = 0; i < EXAMS.length; i++) {
    var exam = EXAMS[i];
    if (exam === folder) {
      links += '<a href="../index.html" class="active">' + NAV_LABELS[exam] + '</a>';
    } else {
      links += '<a href="../../' + exam + '/index.html">' + NAV_LABELS[exam] + '</a>';
    }
  }
  return links;
}

function jsonLd(type, extra) {
  var obj = { '@context': 'https://schema.org', '@type': type };
  for (var k in extra) { obj[k] = extra[k]; }
  return '<script type="application/ld+json">' + JSON.stringify(obj) + '</script>';
}

function buildQuestion(q, sections) {
  var section = null;
  for (var i = 0; i < sections.length; i++) {
    if (sections[i].name === q.section) { section = sections[i]; break; }
  }
  var badge = section
    ? '<span class="section-badge" style="background:' + section.color + '">' + esc(section.name) + '</span>'
    : '';

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

  return '<div class="question" data-q="' + q.q + '"><div class="q-number">Q' + q.q + '. ' + badge + '</div><div class="q-text">' + esc(q.text) + '</div><div class="q-options">' + opts + '</div><button class="show-soln">Show Answer</button><div class="solution-box"><strong>Correct Answer:</strong> ' + correctAnswer + sol + '</div></div>';
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

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n    <title>' + esc(data.pageTitle) + '</title>\n    <meta name="description" content="' + esc(data.pageDesc) + '">\n    <link rel="icon" type="image/svg+xml" href="../../favicon.svg">\n    <link rel="canonical" href="' + BASE + '/' + data.folder + '/papers/' + data.slug + '.html">\n    ' + jsonLd('WebPage', { name: data.pageTitle, description: data.pageDesc, url: BASE + '/' + data.folder + '/papers/' + data.slug + '.html', educationalLevel: 'Competitive Exam', audience: { '@type': 'EducationalAudience', educationalRole: 'student' } }) + '\n    <link rel="stylesheet" href="../css/style.css">\n    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7363013795551054" crossorigin="anonymous"></script>\n</head>\n<body>\n    <nav class="nav">\n        <div class="nav-inner">\n            <a href="../index.html" class="nav-logo"><svg viewBox="0 0 28 28" fill="none"><defs><linearGradient id="n" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#a78bfa"/><stop offset="48%" stop-color="#a78bfa"/><stop offset="52%" stop-color="#34d399"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs><path d="M6 5 L14 24 L22 5" stroke="url(#n)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="4" r="1.2" fill="#a78bfa"/><circle cx="14" cy="4" r="3" fill="none" stroke="#a78bfa" stroke-width="0.5" opacity="0.35"/></svg><span class="grad">vlymbooq</span></a>\n            <div class="nav-links">' + navLinks(f) + '</div>\n        </div>\n    </nav>\n    <div class="paper-page">\n        <div class="paper-header">\n            <h1>' + esc(data.title) + '</h1>\n            <div class="paper-meta">\n                <span>' + esc(data.meta) + '</span>\n            </div>\n        </div>\n        <div class="timer-bar">\n            <span style="font-size:.9em;color:#6b7280">Time Remaining:</span>\n            <span class="timer" id="timer">' + (data.timerMinutes || 60) + ':00</span>\n        </div>\n        <p style="font-size:.9em;color:#4b5563;margin-bottom:24px">Click any option to check your answer.</p>' + sectionBadges + qHtml + '\n    </div>\n    <footer class="site-footer"><p>' + esc(data.title) + ' — Free preparation resource.</p></footer>\n    <script src="../js/main.js"></script>\n    <script src="../../js/supabase.js?v=20260529b"></script>\n    <script src="../../js/shared.js?v=20260529b"></script>\n</body>\n</html>';
}

function run() {
  var root = path.resolve(__dirname, '..');
  var dataDir = path.join(root, 'papers-data');
  var files = fs.readdirSync(dataDir).filter(function(f) { return f.endsWith('.json'); });

  if (files.length === 0) {
    console.log('No JSON files found in papers-data/');
    return;
  }

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
    var folder = data.folder;
    var slug = data.slug;

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
