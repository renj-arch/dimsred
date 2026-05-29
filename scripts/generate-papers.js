var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var bankDir = path.join(root, 'question-bank');
var dataDir = path.join(root, 'papers-data');

var QUESTION_COUNTS = { cgl: 100, rbi: 80, jee: 30, neet: 30, gate: 30, agniveer: 10 };
var MIN_BANK_SIZE = { cgl: 200, rbi: 160, jee: 60, neet: 60, gate: 60, agniveer: 12 };
var EXAMS = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer'];

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
    console.log('  Only ' + unused.length + ' unused questions left, reusing from full bank');
    // Reset and use all
    unused = shuffle(bank.questions.slice());
  }
  var picked = shuffle(unused).slice(0, count);
  // Renumber sequentially
  for (var i = 0; i < picked.length; i++) {
    picked[i].q = i + 1;
  }
  return picked;
}

function updateIndexPage(folder, title, slug) {
  var indexPath = path.join(root, folder, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('  WARNING: ' + indexPath + ' not found, skipping index update');
    return;
  }

  var html = fs.readFileSync(indexPath, 'utf-8');
  var cardHtml = '\n            <div class="paper-card">\n                <div>\n                    <div class="title">' + title.replace(/"/g, '&quot;') + '</div>\n                    <div class="meta">' + QUESTION_COUNTS[folder] + ' Q \u00B7 Solved with answers</div>\n                </div>\n                <a href="papers/' + slug + '.html" class="btn">View Paper</a>\n            </div>';

  // Find the papers section and insert before its closing </section>
  var sectionEnd = html.lastIndexOf('</section>');
  if (sectionEnd === -1) {
    console.log('  WARNING: Could not find section end in ' + indexPath);
    return;
  }

  // Find the start of the first papers section
  var sectionStart = html.indexOf('class="section"');
  if (sectionStart === -1) {
    console.log('  WARNING: Could not find section in ' + indexPath);
    return;
  }

  // Find the </section> that closes the papers section (first one after the section)
  var firstSectionEnd = html.indexOf('</section>', sectionStart);
  if (firstSectionEnd === -1) return;

  var before = html.substring(0, firstSectionEnd);
  var after = html.substring(firstSectionEnd);
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

  var questions = pickQuestions(bank, count);
  var usedIds = questions.map(function(q) { return q.id; });
  var totalInBank = bank.questions.length;

  var paperJson = {
    folder: folder,
    slug: slug,
    title: title,
    pageTitle: bank.paperDefaults.pageTitleTemplate.replace('{number}', setNumber),
    pageDesc: bank.paperDefaults.pageDescTemplate.replace('{number}', setNumber),
    meta: bank.paperDefaults.metaTemplate.replace('{questionCount}', count),
    timerMinutes: bank.timerMinutes || 60,
    sections: bank.sections,
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
  updateIndexPage(folder, title, slug);

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
  var args = process.argv.slice(2);
  var folders = args.length > 0 ? args : EXAMS;

  for (var i = 0; i < folders.length; i++) {
    generatePaper(folders[i]);
  }

  updateRootStats();

  console.log('\nDone! Generated ' + folders.length + ' paper(s).');
}

run();
