var fs = require('fs');
var path = require('path');
var examBlueprint = require('./lib/exam-blueprint');

var root = path.resolve(__dirname, '..');
var bankDir = path.join(root, 'question-bank');
var dataDir = path.join(root, 'papers-data');

var QUESTION_COUNTS = { cgl: 15, rbi: 15, jee: 15, neet: 15, gate: 15, agniveer: 15, upsc: 15, 'ibps-po': 15, 'sbi-clerk': 15, 'ssc-gd': 15, ctet: 15, nda: 15, cds: 15, clat: 15 };
var MIN_BANK_SIZE = { cgl: 30, rbi: 30, jee: 30, neet: 30, gate: 30, agniveer: 30, upsc: 30, 'ibps-po': 30, 'sbi-clerk': 30, 'ssc-gd': 30, ctet: 30, nda: 30, cds: 30, clat: 30 };
var EXAMS = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer', 'upsc', 'ibps-po', 'sbi-clerk', 'ssc-gd', 'ctet', 'nda', 'cds', 'clat'];

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function getNextSetNumber(folder) {
  var metaPath = path.join(bankDir, folder + '-meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      var meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      return (meta.lastSetNumber || 0) + 1;
    } catch (e) {}
  }
  // Scan existing files
  var papersDir = path.join(root, folder, 'papers');
  if (!fs.existsSync(papersDir)) return 1;
  var files = fs.readdirSync(papersDir);
  var maxNum = 0;
  for (var i = 0; i < files.length; i++) {
    var m = files[i].match(/practice-set-(\d+)\.html$/);
    if (m) {
      var n = parseInt(m[1]);
      if (n > maxNum) maxNum = n;
    }
  }
  return maxNum + 1;
}

function saveMeta(folder, setNumber, usedIds) {
  var metaPath = path.join(bankDir, folder + '-meta.json');
  var meta = {};
  if (fs.existsSync(metaPath)) {
    try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch (e) {}
  }
  meta.lastSetNumber = setNumber;
  meta.usedIds = (meta.usedIds || []).concat(usedIds);
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
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

function pickQuestions(bank, count) {
  var unused = getUnusedQuestions(bank);
  if (unused.length < count) {
    console.log('  SKIPPED: Only ' + unused.length + ' unused questions left (need ' + count + '). Run generate-ai-questions first.');
    return null;
  }
  var picked = shuffle(unused).slice(0, count);
  // Renumber sequentially
  for (var i = 0; i < picked.length; i++) {
    picked[i].q = i + 1;
  }
  return picked;
}

// Daily practice keeps the exam's real section proportions even though it is
// a short set. If a section pool cannot supply its share, the whole paper is
// skipped rather than silently drifting away from the pattern.
function pickProportionalQuestions(bank, plan) {
  var unused = getUnusedQuestions(bank);
  var picked = [];
  var used = {};
  for (var i = 0; i < plan.length; i++) {
    var p = plan[i];
    var def = { name: p.name, bank: p.bank };
    var candidates = unused.filter(function (q) {
      return !used[q.id] && examBlueprint.sectionAccepts(def, q.section);
    });
    if (candidates.length < p.count) {
      console.log('  SKIPPED: section "' + p.name + '" has ' + candidates.length + ' unused (need ' + p.count + ')');
      return null;
    }
    var take = shuffle(candidates).slice(0, p.count);
    for (var j = 0; j < take.length; j++) {
      used[take[j].id] = 1;
      var q = Object.assign({}, take[j]);
      q.section = p.name;
      picked.push(q);
    }
  }
  picked = shuffle(picked);
  for (var k = 0; k < picked.length; k++) picked[k].q = k + 1;
  return picked;
}

function colorFor(name, bankSections) {
  var palette = ['#a855f7', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#22d3ee', '#f87171', '#a3e635'];
  for (var i = 0; i < (bankSections || []).length; i++) {
    if (bankSections[i].name === name && bankSections[i].color) return bankSections[i].color;
  }
  var h = 0;
  for (var j = 0; j < name.length; j++) h = (h * 31 + name.charCodeAt(j)) >>> 0;
  return palette[h % palette.length];
}

function updateIndexPage(folder, title, slug, meta) {
  var indexPath = path.join(root, folder, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('  WARNING: ' + indexPath + ' not found, skipping index update');
    return;
  }

  var html = fs.readFileSync(indexPath, 'utf-8');

  // Skip if card already exists
  if (html.indexOf('papers/' + slug + '.html') !== -1) {
    console.log('  SKIPPED: ' + slug + ' already exists in ' + folder + '/index.html');
    return;
  }

  var cardHtml = '\n            <div class="paper-card">\n                <div>\n                    <div class="title">' + title.replace(/"/g, '&quot;') + '</div>\n                    <div class="meta">' + meta + '</div>\n                </div>\n                <a href="papers/' + slug + '.html" class="btn">View Paper</a>\n            </div>';

  // Insert card before pagination controls or before closing </section>
  var insertAt = html.indexOf('<div class="pagination-controls"');
  if (insertAt === -1) {
    // Fall back: insert before the closing </section> of the first section
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
  fs.writeFileSync(indexPath, before + cardHtml + '\n        ' + after, 'utf-8');
  console.log('  Updated ' + folder + '/index.html');
}

function generatePaper(folder) {
  console.log('\n' + folder + ':');
  var bankPath = path.join(bankDir, folder + '.json');
  if (!fs.existsSync(bankPath)) {
    console.log('  No question bank found, run extract first');
    return;
  }

  var bank = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
  var count = QUESTION_COUNTS[folder] || 30;
  var setNumber = getNextSetNumber(folder);
  var slug = 'practice-set-' + String(setNumber).padStart(2, '0');
  var title = bank.paperDefaults.titlePrefix + ' ' + setNumber;

  var blueprints = examBlueprint.load(root);
  var pattern = examBlueprint.paperForDaily(blueprints, folder, setNumber);
  var plan = examBlueprint.allocate(count, pattern.sections);
  var questions = pickProportionalQuestions(bank, plan);
  if (!questions) {
    console.log('  SKIPPED ' + title + ': section pools are short for the real ' + pattern.name + ' pattern');
    return;
  }
  var usedIds = questions.map(function(q) { return q.id; });
  var totalInBank = bank.questions.length;
  var dailyMarks = Math.round(pattern.marks * count / pattern.total);
  var dailyMinutes = Math.max(1, Math.round(pattern.duration * count / pattern.total));
  var meta = count + ' Q \u00B7 ' + dailyMinutes + ' min \u00B7 ' + dailyMarks + ' marks \u00B7 ' + pattern.name + ' pattern';

  var paperJson = {
    folder: folder,
    slug: slug,
    title: title,
    pageTitle: bank.paperDefaults.pageTitleTemplate.replace('{number}', setNumber),
    pageDesc: bank.paperDefaults.pageDescTemplate.replace('{number}', setNumber) + ' Pattern: ' + pattern.name + '.',
    meta: meta,
    timerMinutes: dailyMinutes,
    totalMarks: dailyMarks,
    createdDate: new Date().toISOString().split('T')[0],
    blueprint: {
      paper: pattern.id,
      name: pattern.name,
      total: pattern.total,
      marks: pattern.marks,
      duration: pattern.duration,
      negative: pattern.negative,
      source: pattern.source,
      provisional: !!pattern.provisional,
      sections: plan
    },
    sections: plan.map(function (p) { return { name: p.name, color: colorFor(p.name, bank.sections) }; }),
    questions: questions
  };

  // Write to papers-data
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  var jsonPath = path.join(dataDir, folder + '-' + slug + '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(paperJson, null, 2), 'utf-8');

  console.log('  Generated ' + title + ' (' + count + ' questions from ' + totalInBank + ' in bank)');

  // Generate HTML via build-papers script
  var buildScript = path.join(__dirname, 'build-papers.js');
  require('child_process').execSync('node "' + buildScript + '"', { cwd: root, stdio: 'inherit' });

  // Update index
  updateIndexPage(folder, title, slug, meta);

  // Save meta
  saveMeta(folder, setNumber, usedIds);

  return { folder: folder, setNumber: setNumber, slug: slug, title: title };
}

function countPapers() {
  var total = 0;
  for (var i = 0; i < EXAMS.length; i++) {
    var dir = path.join(root, EXAMS[i], 'papers');
    if (fs.existsSync(dir)) {
      var files = fs.readdirSync(dir).filter(function(f) { return f.endsWith('.html'); });
      total += files.length;
    }
  }
  return total;
}

function countQuestions() {
  var total = 0;
  for (var i = 0; i < EXAMS.length; i++) {
    var bankPath = path.join(bankDir, EXAMS[i] + '.json');
    if (fs.existsSync(bankPath)) {
      try {
        var bank = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
        total += bank.questions.length;
      } catch (e) {}
    }
  }
  return total;
}

function countPapersForExam(folder) {
  var dir = path.join(root, folder, 'papers');
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter(function(f) { return f.endsWith('.html'); }).length;
}

function countQuestionsInBank(folder) {
  var bankPath = path.join(bankDir, folder + '.json');
  if (!fs.existsSync(bankPath)) return 0;
  try { return JSON.parse(fs.readFileSync(bankPath, 'utf-8')).questions.length; } catch (e) { return 0; }
}

function updateExamStats() {
  for (var i = 0; i < EXAMS.length; i++) {
    var folder = EXAMS[i];
    var indexPath = path.join(root, folder, 'index.html');
    if (!fs.existsSync(indexPath)) { console.log('  WARNING: ' + indexPath + ' not found'); continue; }

    var paperCount = countPapersForExam(folder);
    var questionCount = countQuestionsInBank(folder);
    var html = fs.readFileSync(indexPath, 'utf-8');

    html = html.replace(
      /(<div class="num">)\d+(<\/div>\s*<div class="label">Solved Papers)/,
      function(m, before, after) { return before + paperCount + after; }
    );
    html = html.replace(
      /(<div class="num">)\d+\+?(<\/div>\s*<div class="label">Questions)/,
      function(m, before, after) { return before + questionCount + '+' + after; }
    );

    fs.writeFileSync(indexPath, html, 'utf-8');
    console.log('  Updated ' + folder + '/index.html: ' + paperCount + ' papers, ' + questionCount + '+ questions');
  }
}

function updateRootHeroBadge() {
  var indexPath = path.join(root, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  var papers = countPapers();
  var questions = countQuestions();
  var exams = EXAMS.length;
  var html = fs.readFileSync(indexPath, 'utf-8');
  html = html.replace(
    /(<div class="hero-badge">🔥 )[\d,]+[+]?( Questions · )\d+( Papers · )\d+( Exams · Free<\/div>)/,
    function(m, a, b, c, d) { return a + questions.toLocaleString() + '+' + b + papers + c + exams + d; }
  );
  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('  Updated hero badge: ' + questions.toLocaleString() + '+ Q · ' + papers + ' P · ' + exams + ' Exams');
}

function updateExamGridCards() {
  var indexPath = path.join(root, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  var html = fs.readFileSync(indexPath, 'utf-8');
  var metaOpen = '<div class="meta">';
  var updated = 0;
  var skipped = [];

  // Locate each exam card by its link, not by a hardcoded <h3> label. The old
  // label map drifted from the markup ("SSC GD" vs "SSC GD Constable",
  // "JEE Main & Advanced" vs "JEE Main &amp; Advanced") and had no entry at all
  // for NDA/CDS/CLAT, so label.replace() crashed the whole run. Anchoring on
  // href="/<folder>/" can never be undefined and keeps working when a card's
  // display name is edited.
  for (var i = 0; i < EXAMS.length; i++) {
    var folder = EXAMS[i];
    var paperCount = countPapersForExam(folder);
    var questionCount = countQuestionsInBank(folder);

    var anchor = html.indexOf('href="/' + folder + '/"');
    if (anchor === -1) { skipped.push(folder); continue; }
    var metaAt = html.indexOf(metaOpen, anchor);
    if (metaAt === -1) { skipped.push(folder); continue; }
    var metaEnd = html.indexOf('</div>', metaAt + metaOpen.length);
    if (metaEnd === -1) { skipped.push(folder); continue; }

    html = html.substring(0, metaAt + metaOpen.length) +
      paperCount + ' papers \u00B7 ' + questionCount + '+ questions' +
      html.substring(metaEnd);
    updated++;
  }

  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('  Updated exam grid cards (' + updated + ')' + (skipped.length ? ', no card: ' + skipped.join(', ') : ''));
}

function updateTrustBar() {
  var indexPath = path.join(root, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  var papers = countPapers();
  var questions = countQuestions();
  var html = fs.readFileSync(indexPath, 'utf-8');

  html = html.replace(
    /(<div class="trust-item"><span class="icon">📝<\/span><div class="num">)[^<]+(<\/div><div class="label">Questions Solved)/,
    function(m, before, after) { return before + questions.toLocaleString() + '+' + after; }
  );
  html = html.replace(
    /(<div class="trust-item"><span class="icon">🏆<\/span><div class="num">)[^<]+(<\/div><div class="label">Full Papers)/,
    function(m, before, after) { return before + papers + after; }
  );

  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('  Updated trust bar: ' + questions.toLocaleString() + '+ questions, ' + papers + ' papers');
}

function updateRootStats() {
  var indexPath = path.join(root, 'index.html');
  if (!fs.existsSync(indexPath)) { console.log('  WARNING: root index.html not found'); return; }

  var papers = countPapers();
  var questions = countQuestions();
  var exams = EXAMS.length;

  console.log('  Root stats: ' + questions + ' questions, ' + papers + ' papers, ' + exams + ' exams');

  var html = fs.readFileSync(indexPath, 'utf-8');
  html = html.replace(
    /(data-target=")\d+(">\s*)0(\s*<\/div>\s*<div class="stat-label">Practice Questions)/,
    function(m, a, b, c) { return a + questions + b + '0' + c; }
  );
  html = html.replace(
    /(data-target=")\d+(">\s*)0(\s*<\/div>\s*<div class="stat-label">Full-Length Papers)/,
    function(m, a, b, c) { return a + papers + b + '0' + c; }
  );
  html = html.replace(
    /(data-target=")\d+(">\s*)0(\s*<\/div>\s*<div class="stat-label">Exams Covered)/,
    function(m, a, b, c) { return a + exams + b + '0' + c; }
  );
  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('  Updated root index.html stats');
}

function run() {
  var args = process.argv.slice(2).map(function(a) { return a.toLowerCase(); });
  if (args.length === 1 && args[0] === 'all') args = [];
  var folders = args.length > 0 ? args : EXAMS;

  for (var i = 0; i < folders.length; i++) {
    generatePaper(folders[i]);
  }

  updateRootHeroBadge();
  updateExamGridCards();
  updateTrustBar();
  updateRootStats();
  updateExamStats();

  console.log('\nDone! Generated ' + folders.length + ' paper(s).');
}

run();
