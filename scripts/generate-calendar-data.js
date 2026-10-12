var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var dataDir = path.join(root, 'papers-data');

var ALL_EXAMS = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer', 'upsc', 'ibps-po', 'sbi-clerk', 'ssc-gd', 'ctet', 'nda', 'cds', 'clat'];
var EXAMS = process.argv.slice(2).filter(function(a) { return a.indexOf('--') !== 0; }).map(function(a) { return a.toLowerCase(); });
if (EXAMS.length === 0 || (EXAMS.length === 1 && EXAMS[0] === 'all')) EXAMS = ALL_EXAMS;

var byFolder = {};
EXAMS.forEach(function(f) { byFolder[f] = {}; }); // slug -> entry

// 1. Read JSON files
var files = fs.readdirSync(dataDir).filter(function(f) { return f.endsWith('.json'); });
files.forEach(function(file) {
  var data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
  var folder = data.folder;
  if (byFolder[folder]) {
    byFolder[folder][data.slug] = {
      date: data.createdDate || '2026-05-30',
      title: data.title,
      slug: data.slug,
      questions: (data.questions || []).length,
      meta: data.meta
    };
  }
});

// 2. Scan papers/ HTML files for papers not in JSON
EXAMS.forEach(function(folder) {
  var papersDir = path.join(root, folder, 'papers');
  if (!fs.existsSync(papersDir)) return;
  var htmlFiles = fs.readdirSync(papersDir).filter(function(f) { return f.endsWith('.html') && f !== 'calendar-data.json'; });
  htmlFiles.forEach(function(hf) {
    var slug = hf.replace(/\.html$/, '');
    if (byFolder[folder][slug]) return; // already has JSON data

    // Extract title from HTML
    var html = fs.readFileSync(path.join(papersDir, hf), 'utf-8');
    var title = slug;
    var m = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    if (m) title = m[1].trim();

    // Extract question count from HTML
    var qCount = 0;
    var qm = html.match(/<div class="question"/g);
    if (qm) qCount = qm.length;

    // HTML-only papers are legacy (created before JSON system). Default to site launch date.
    var date = '2026-05-29';

    byFolder[folder][slug] = {
      date: date,
      title: title,
      slug: slug,
      questions: qCount,
      meta: qCount + ' Q'
    };
  });
});

// 3. Convert to sorted array per folder
EXAMS.forEach(function(folder) {
  var arr = Object.keys(byFolder[folder]).map(function(slug) { return byFolder[folder][slug]; });
  arr.sort(function(a, b) { return a.date.localeCompare(b.date); });
  byFolder[folder] = arr;
});

// 4. Write calendar-data.json per exam
var total = 0;
EXAMS.forEach(function(folder) {
  var outDir = path.join(root, folder, 'papers');
  if (!fs.existsSync(outDir)) { fs.mkdirSync(outDir, { recursive: true }); }
  fs.writeFileSync(path.join(outDir, 'calendar-data.json'), JSON.stringify(byFolder[folder], null, 2), 'utf-8');
  console.log(folder + ': ' + byFolder[folder].length + ' papers');
  total += byFolder[folder].length;
});

console.log('\nTotal: ' + total + ' papers across ' + EXAMS.length + ' exams.');
