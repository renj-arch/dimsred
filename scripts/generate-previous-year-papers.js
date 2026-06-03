const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bankDir = path.join(root, 'question-bank');

// CSP and config matching the existing build-papers.js
const CSP = "default-src 'self' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src https://fonts.gstatic.com https://unpkg.com; script-src 'self' https://pagead2.googlesyndication.com https://www.gstatic.com https://apis.google.com https://unpkg.com https://static.cloudflareinsights.com https://ep2.adtrafficquality.google https://*.adtrafficquality.google; connect-src 'self' https://krvlufonfbcabgcjomvs.supabase.co https://pagead2.googlesyndication.com https://ep2.adtrafficquality.google https://static.cloudflareinsights.com https://apis.google.com https://www.gstatic.com https://www.google.com https://googleads.g.doubleclick.net; frame-src 'self' https://googleads.g.doubleclick.net https://ep2.adtrafficquality.google https://www.google.com; upgrade-insecure-requests";
const BASE = 'https://vlymbooq.qzz.io';

const EXAMS = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer', 'upsc', 'ibps-po', 'sbi-clerk', 'ssc-gd', 'ctet'];

const NAV_LABELS = {
  cgl: 'CGL', rbi: 'RBI', jee: 'JEE', neet: 'NEET', gate: 'GATE',
  agniveer: 'Agniveer', upsc: 'UPSC', 'ibps-po': 'IBPS PO',
  'sbi-clerk': 'SBI Clerk', 'ssc-gd': 'SSC GD', ctet: 'CTET'
};

const EXAM_FULL_NAMES = {
  agniveer: 'Agniveer (Indian Army)',
  upsc: 'UPSC Civil Services Prelims',
  'ibps-po': 'IBPS PO Prelims',
  'sbi-clerk': 'SBI Clerk Prelims',
  'ssc-gd': 'SSC GD Constable',
  ctet: 'CTET Paper 1'
};

const EXAM_SHORT = {
  agniveer: 'Agniveer', upsc: 'UPSC', 'ibps-po': 'IBPS PO',
  'sbi-clerk': 'SBI Clerk', 'ssc-gd': 'SSC GD', ctet: 'CTET'
};

// Define previous year papers to create for each exam
const EXAM_PAPERS = {
  agniveer: [
    { year: 2025, slug: '2025-paper', title: 'Agniveer (Indian Army) 2025', qCount: 30 },
    { year: 2024, slug: '2024-paper', title: 'Agniveer (Indian Army) 2024', qCount: 30 },
    { year: 2023, slug: '2023-paper', title: 'Agniveer (Indian Army) 2023', qCount: 30 }
  ],
  upsc: [
    { year: 2025, slug: '2025-prelims', title: 'UPSC Civil Services Prelims 2025', qCount: 30 },
    { year: 2024, slug: '2024-prelims', title: 'UPSC Civil Services Prelims 2024', qCount: 30 },
    { year: 2023, slug: '2023-prelims', title: 'UPSC Civil Services Prelims 2023', qCount: 30 }
  ],
  'ibps-po': [
    { year: 2025, slug: '2025-prelims', title: 'IBPS PO Prelims 2025', qCount: 30 },
    { year: 2024, slug: '2024-prelims', title: 'IBPS PO Prelims 2024', qCount: 30 },
    { year: 2023, slug: '2023-prelims', title: 'IBPS PO Prelims 2023', qCount: 30 }
  ],
  'sbi-clerk': [
    { year: 2025, slug: '2025-prelims', title: 'SBI Clerk Prelims 2025', qCount: 30 },
    { year: 2024, slug: '2024-prelims', title: 'SBI Clerk Prelims 2024', qCount: 30 },
    { year: 2023, slug: '2023-prelims', title: 'SBI Clerk Prelims 2023', qCount: 30 }
  ],
  'ssc-gd': [
    { year: 2025, slug: '2025-paper', title: 'SSC GD Constable 2025', qCount: 30 },
    { year: 2024, slug: '2024-paper', title: 'SSC GD Constable 2024', qCount: 30 },
    { year: 2023, slug: '2023-paper', title: 'SSC GD Constable 2023', qCount: 30 }
  ],
  ctet: [
    { year: 2025, slug: '2025-paper1', title: 'CTET Paper 1 2025', qCount: 30 },
    { year: 2024, slug: '2024-paper1', title: 'CTET Paper 1 2024', qCount: 30 },
    { year: 2023, slug: '2023-paper1', title: 'CTET Paper 1 2023', qCount: 30 }
  ]
};

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function getSectionColor(sections, sectionName) {
  for (var i = 0; i < sections.length; i++) {
    if (sections[i].name === sectionName) return sections[i].color;
  }
  return '#a855f7';
}

function buildQuestionHTML(q, qNum, sections) {
  var section = q.section || '';
  var color = getSectionColor(sections, section);
  var badge = section ? '<span class="section-badge" style="background:' + color + '">' + esc(section) + '</span>' : '';

  var opts = '';
  for (var i = 0; i < q.options.length; i++) {
    var o = q.options[i];
    var correct = o.correct ? ' data-correct="true"' : '';
    var label = o.label ? o.label + '. ' : '';
    opts += '<div class="q-option"' + correct + '>' + label + esc(o.text) + '</div>';
  }

  var correctAnswer = '';
  for (var i = 0; i < q.options.length; i++) {
    if (q.options[i].correct) { correctAnswer = esc(q.options[i].label || String.fromCharCode(65 + i)); break; }
  }

  var sol = q.solution ? '<br><span style="color:#4b5563">' + esc(q.solution) + '</span>' : '';

  return '<div class="question" data-q="' + qNum + '"><div class="q-number">Q' + qNum + '. ' + badge + '</div><div class="q-text">' + esc(q.text) + '</div><div class="q-options">' + opts + '</div><button class="show-soln">Show Answer</button><div class="solution-box"><strong>Correct Answer:</strong> ' + correctAnswer + sol + '</div></div>';
}

function buildPaperHTML(exam, paper, questions, sections) {
  var shortName = EXAM_SHORT[exam];
  var fullName = EXAM_FULL_NAMES[exam];

  // Build nav links
  var navLinks = '<a href="../index.html">Home</a>';
  for (var i = 0; i < EXAMS.length; i++) {
    var e = EXAMS[i];
    if (e === exam) {
      navLinks += '<a href="../index.html" class="active">' + NAV_LABELS[e] + '</a>';
    } else {
      navLinks += '<a href="../../' + e + '/index.html">' + NAV_LABELS[e] + '</a>';
    }
  }

  // Section badges
  var sectionBadges = '';
  if (sections.length > 0) {
    var badges = '';
    for (var i = 0; i < sections.length; i++) {
      badges += '<span class="section-badge" style="background:' + sections[i].color + '">' + esc(sections[i].name) + '</span>';
    }
    sectionBadges = '<div style="margin-bottom:20px;padding:12px;background:rgba(255,255,255,.02);border-radius:8px;font-size:.85em"><strong>Sections:</strong> ' + badges + '</div>';
  }

  // Questions
  var qHtml = '';
  for (var i = 0; i < questions.length; i++) {
    qHtml += buildQuestionHTML(questions[i], i + 1, sections);
  }

  var pageTitle = paper.title + ' — Solved Paper';
  var pageDesc = 'Free ' + fullName + ' ' + paper.year + ' solved paper with detailed solutions.';
  var slug = paper.slug;
  var title = paper.title;

  var timerDisplay = '';
  if (exam === 'upsc') {
    timerDisplay = '<div class="timer-bar"><span style="font-size:.9em;color:#6b7280">Time Remaining:</span><span class="timer" id="timer">120:00</span></div>';
  } else if (exam === 'ibps-po' || exam === 'sbi-clerk') {
    timerDisplay = '<div class="timer-bar"><span style="font-size:.9em;color:#6b7280">Time Remaining:</span><span class="timer" id="timer">60:00</span></div>';
  } else if (exam === 'ctet') {
    timerDisplay = '<div class="timer-bar"><span style="font-size:.9em;color:#6b7280">Time Remaining:</span><span class="timer" id="timer">150:00</span></div>';
  } else {
    timerDisplay = '<div class="timer-bar"><span style="font-size:.9em;color:#6b7280">Time Remaining:</span><span class="timer" id="timer">60:00</span></div>';
  }

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n    <meta charset="UTF-8">\n    <script src="../../js/auth-guard.js"></script>\n    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n    <title>' + esc(pageTitle) + '</title>\n    <meta name="description" content="' + esc(pageDesc) + '">\n    <link rel="icon" type="image/svg+xml" href="../../favicon.svg">\n    <link rel="canonical" href="' + BASE + '/' + exam + '/papers/' + slug + '.html">\n    <link rel="stylesheet" href="../css/style.css">\n    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7363013795551054" crossorigin="anonymous"></script>\n</head>\n<body>\n    <nav class="nav">\n        <div class="nav-inner">\n            <a href="../index.html" class="nav-logo"><svg viewBox="0 0 28 28" fill="none"><defs><linearGradient id="n" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#a78bfa"/><stop offset="48%" stop-color="#a78bfa"/><stop offset="52%" stop-color="#34d399"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs><path d="M6 5 L14 24 L22 5" stroke="url(#n)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="4" r="1.2" fill="#a78bfa"/><circle cx="14" cy="4" r="3" fill="none" stroke="#a78bfa" stroke-width="0.5" opacity="0.35"/></svg><span class="grad">vlymbooq</span></a>\n            <div class="nav-links">' + navLinks + '</div>\n        </div>\n    </nav>\n    <div class="paper-page">\n        <div class="paper-header">\n            <h1>' + esc(title) + '</h1>\n            <div class="paper-meta">\n                <span>' + esc(fullName) + '</span>\n                <span>' + questions.length + ' Questions</span>\n            </div>\n        </div>\n        ' + timerDisplay + '\n        <p style="font-size:.9em;color:#4b5563;margin-bottom:24px">Click any option to check your answer.</p>\n        ' + sectionBadges + '\n        ' + qHtml + '\n    </div>\n    <footer class="site-footer"><p>' + shortName + 'Pro — Free ' + fullName + ' preparation resources.</p></footer>\n    <script src="../js/main.js"></script>\n    <script src="../../js/supabase.js?v=20260529b"></script>\n    <script src="../../js/shared.js?v=20260529b"></script>\n</body>\n</html>';
}

function getUnusedQuestions(bank) {
  var metaPath = path.join(bankDir, bank.folder + '-meta.json');
  var usedIds = [];
  if (fs.existsSync(metaPath)) {
    try {
      var meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      usedIds = meta.usedIds || [];
    } catch (e) {}
  }
  return bank.questions.filter(function(q) { return usedIds.indexOf(q.id) === -1; });
}

function markUsed(exam, usedIds) {
  var metaPath = path.join(bankDir, exam + '-meta.json');
  var meta = {};
  if (fs.existsSync(metaPath)) {
    try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch (e) {}
  }
  meta.usedIds = (meta.usedIds || []).concat(usedIds);
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

function updateIndexPage(exam) {
  var indexPath = path.join(root, exam, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('  WARNING: ' + indexPath + ' not found');
    return;
  }

  var html = fs.readFileSync(indexPath, 'utf-8');
  var papers = EXAM_PAPERS[exam];
  var inserted = 0;

  for (var p = 0; p < papers.length; p++) {
    var paper = papers[p];
    var slug = paper.slug;

    // Skip if already exists
    if (html.indexOf('papers/' + slug + '.html') !== -1) {
      console.log('  SKIPPED: ' + slug + ' already in index');
      continue;
    }

    var cardHtml = '\n            <div class="paper-card">\n                <div>\n                    <div class="title">' + paper.title + '</div>\n                    <div class="meta">' + paper.qCount + ' Q · Solved with answers</div>\n                </div>\n                <a href="papers/' + slug + '.html" class="btn">View Paper →</a>\n            </div>';

    // Insert after last previous year paper or before first practice set
    var insertAt = html.indexOf('<div class="pagination-controls"');
    if (insertAt === -1) {
      var sectionStart = html.indexOf('class="section"');
      if (sectionStart === -1) {
        console.log('  WARNING: Could not find section in ' + indexPath);
        return;
      }
      insertAt = html.indexOf('</section>', sectionStart);
      if (insertAt === -1) return;
    }

    var before = html.substring(0, insertAt);
    var after = html.substring(insertAt);
    html = before + cardHtml + '\n        ' + after;
    inserted++;
  }

  if (inserted > 0) {
    fs.writeFileSync(indexPath, html, 'utf-8');
    console.log('  Updated ' + exam + '/index.html (' + inserted + ' cards)');
  }
}

function updateCalendarData(exam) {
  var calPath = path.join(root, exam, 'papers', 'calendar-data.json');
  if (!fs.existsSync(calPath)) {
    console.log('  WARNING: ' + calPath + ' not found');
    return;
  }

  var calData = JSON.parse(fs.readFileSync(calPath, 'utf-8'));
  var papers = EXAM_PAPERS[exam];
  var today = new Date().toISOString().split('T')[0];
  var added = 0;

  for (var p = 0; p < papers.length; p++) {
    var paper = papers[p];
    // Check if already exists
    var exists = false;
    for (var i = 0; i < calData.length; i++) {
      if (calData[i].slug === paper.slug) { exists = true; break; }
    }
    if (exists) continue;

    calData.push({
      date: today,
      title: paper.title,
      slug: paper.slug,
      questions: paper.qCount,
      meta: paper.qCount + ' Q'
    });
    added++;
  }

  if (added > 0) {
    fs.writeFileSync(calPath, JSON.stringify(calData, null, 2), 'utf-8');
    console.log('  Updated ' + exam + '/papers/calendar-data.json (' + added + ' entries)');
  }
}

function updateLabJS() {
  var labPath = path.join(root, 'js', 'lab.js');
  if (!fs.existsSync(labPath)) {
    console.log('  WARNING: lab.js not found');
    return;
  }

  var js = fs.readFileSync(labPath, 'utf-8');

  var targetExams = ['agniveer', 'upsc', 'ibps-po', 'sbi-clerk', 'ssc-gd', 'ctet'];
  var changes = 0;

  for (var e = 0; e < targetExams.length; e++) {
    var exam = targetExams[e];
    var papers = EXAM_PAPERS[exam];

    // Build the new PAPERS array entry
    var newEntries = [];
    // First, find existing practice set entries
    var existingPracticeSets = [];
    var regex = new RegExp("'" + exam + "':\\s*\\[([\\s\\S]*?)\\]", 'm');
    var match = js.match(regex);
    if (match) {
      // Parse existing entries
      var existingContent = match[1];
      var entryRegex = /\\{[^}]+\\}/g;
      var existingEntries = existingContent.match(entryRegex) || [];
      // Keep practice set entries only
      for (var i = 0; i < existingEntries.length; i++) {
        if (existingEntries[i].indexOf('practice') !== -1) {
          existingPracticeSets.push(existingEntries[i]);
        }
      }
    }

    // Add previous year paper entries
    for (var p = 0; p < papers.length; p++) {
      var paper = papers[p];
      var id = exam + '-' + paper.year;
      newEntries.push("        { id:'" + id + "', title:'" + EXAM_SHORT[exam] + " " + paper.year + "', path:'" + exam + "/papers/" + paper.slug + ".html' }");
    }

    // Add existing practice sets back
    for (var i = 0; i < existingPracticeSets.length; i++) {
      newEntries.push("        " + existingPracticeSets[i]);
    }

    var newSection = "'" + exam + "': [\n" + newEntries.join(",\n") + "\n    ]";

    // Replace in JS
    if (match) {
      js = js.substring(0, match.index) + newSection + js.substring(match.index + match[0].length);
      changes++;
    }
  }

  if (changes > 0) {
    fs.writeFileSync(labPath, js, 'utf-8');
    console.log('  Updated js/lab.js (' + changes + ' exam sections)');
  }
}

async function run() {
  console.log('=== Generating Previous Year Papers ===\n');

  var targetExams = ['agniveer', 'upsc', 'ibps-po', 'sbi-clerk', 'ssc-gd', 'ctet'];

  for (var ei = 0; ei < targetExams.length; ei++) {
    var exam = targetExams[ei];
    console.log('\n--- ' + EXAM_SHORT[exam] + ' ---');

    var bankPath = path.join(bankDir, exam + '.json');
    if (!fs.existsSync(bankPath)) {
      console.log('  ERROR: Question bank not found at ' + bankPath);
      continue;
    }

    var bank = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
    var sections = bank.sections || [];

    var papers = EXAM_PAPERS[exam];

    for (var pi = 0; pi < papers.length; pi++) {
      var paper = papers[pi];
      var slug = paper.slug;
      var count = paper.qCount;

      console.log('  Paper: ' + paper.title + ' (' + slug + ')');

      // Check if HTML already exists
      var htmlPath = path.join(root, exam, 'papers', slug + '.html');
      if (fs.existsSync(htmlPath)) {
        console.log('    EXISTS: ' + slug + '.html already exists, skipping');
        continue;
      }

      // Get unused questions
      var unused = getUnusedQuestions(bank);
      if (unused.length < count) {
        console.log('    WARNING: Only ' + unused.length + ' unused questions available (need ' + count + '). Using all available.');
        count = unused.length;
      }

      if (count < 10) {
        console.log('    ERROR: Not enough questions (' + count + '). Skipping.');
        continue;
      }

      var picked = shuffle(unused).slice(0, count);
      var usedIds = picked.map(function(q) { return q.id; });

      // Generate HTML
      var html = buildPaperHTML(exam, paper, picked, sections);
      var outDir = path.join(root, exam, 'papers');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(htmlPath, html, 'utf-8');
      console.log('    CREATED: ' + slug + '.html (' + count + ' questions)');

      // Mark questions as used
      markUsed(exam, usedIds);
    }

    // Update index.html
    updateIndexPage(exam);

    // Update calendar-data.json
    updateCalendarData(exam);
  }

  // Update lab.js
  console.log('\n--- Updating lab.js ---');
  updateLabJS();

  console.log('\n=== Done! ===');
}

run().catch(function(e) { console.error(e); process.exit(1); });
