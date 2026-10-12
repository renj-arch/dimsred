const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const examPatterns = JSON.parse(fs.readFileSync(path.join(__dirname, 'exam-patterns.json'), 'utf-8'));

var patterns = {
  cgl: { full: 'SSC CGL', short: 'CGL' },
  rbi: { full: 'RBI Grade B', short: 'RBI' },
  jee: { full: 'JEE Main', short: 'JEE' },
  neet: { full: 'NEET UG', short: 'NEET' },
  gate: { full: 'GATE', short: 'GATE' },
  agniveer: { full: 'Agniveer (Indian Army)', short: 'Agniveer' },
  upsc: { full: 'UPSC Civil Services', short: 'UPSC' },
  'ibps-po': { full: 'IBPS PO', short: 'IBPS PO' },
  'sbi-clerk': { full: 'SBI Clerk', short: 'SBI Clerk' },
  'ssc-gd': { full: 'SSC GD Constable', short: 'SSC GD' },
  ctet: { full: 'CTET', short: 'CTET' }
};

function getExamName(filePath) {
  var parts = filePath.replace(/\\/g, '/').split('/');
  var exams = Object.keys(patterns);
  for (var i = 0; i < exams.length; i++) {
    if (parts.indexOf(exams[i]) !== -1) return exams[i];
  }
  return null;
}

function getAllHtmlFiles(dir) {
  var results = [];
  var list = fs.readdirSync(dir);
  for (var i = 0; i < list.length; i++) {
    var file = path.join(dir, list[i]);
    var stat = fs.statSync(file);
    if (stat.isDirectory() && file.indexOf('node_modules') === -1) results = results.concat(getAllHtmlFiles(file));
    else if (file.endsWith('.html')) results.push(file);
  }
  return results;
}

var allFiles = getAllHtmlFiles(root);
var paperFiles = [];
for (var i = 0; i < allFiles.length; i++) {
  var f = allFiles[i].replace(/\\/g, '/');
  if (f.match(/\/(cgl|rbi|jee|neet|gate|agniveer|upsc|ibps-po|sbi-clerk|ssc-gd|ctet)\/papers\//)) paperFiles.push(allFiles[i]);
}

var updated = 0;

for (var fi = 0; fi < paperFiles.length; fi++) {
  var filePath = paperFiles[fi];
  var examName = getExamName(filePath);
  var exam = patterns[examName];
  if (!exam) continue;

  var html = fs.readFileSync(filePath, 'utf-8');
  var original = html;
  var filename = path.basename(filePath, '.html');

  // Determine paper type and year
  var year = '';
  var paperDesc = '';
  var isPractice = filename.indexOf('practice-set-') !== -1;
  var isYearPaper = !isPractice;

  if (isPractice) {
    var num = filename.replace('practice-set-', '');
    paperDesc = 'Practice Set ' + num;
    year = '';
  } else {
    // Extract year from filename (first 4 digits)
    var yrMatch = filename.match(/(\d{4})/);
    year = yrMatch ? yrMatch[1] : '';
    // Clean up description
    paperDesc = filename
      .replace(/-paper\d*$/g, '')
      .replace(/-s\d+/g, function(m) { return ' Shift ' + m.replace('-s', ''); })
      .replace(/-prelims/g, ' Prelims')
      .replace(/-/g, ' ');
    paperDesc = paperDesc.replace(/\s+/g, ' ').trim();
    paperDesc = paperDesc.replace(/(\d{4})/, '$1');
  }

  // Create SEO title and description
  var title = '';
  var desc = '';

  var totalQ = (examPatterns[examName] && examPatterns[examName].totalQuestions) || '50';

  if (isPractice) {
    var num = filename.replace('practice-set-', '');
    title = exam.full + ' ' + exam.short + ' Practice Set ' + num + ' - Solved Paper with Answers';
    desc = 'Free ' + exam.full + ' practice paper set ' + num + '. ' + totalQ + ' questions with detailed solutions. Download PDF for offline practice.';
  } else {
    title = exam.full + ' ' + paperDesc;
    if (title.indexOf('Solved Paper') === -1) title += ' - Previous Year Paper Solved';
    desc = 'Free ' + exam.full + ' ' + paperDesc + ' previous year paper with detailed solutions. ' + totalQ + ' MCQ questions with answer key. Download PDF.';
  }

  // Also add year to title if present and not already there
  if (year && title.indexOf(year) === -1) {
    // Insert year after exam name
    var idx = title.indexOf(' - ');
    if (idx !== -1) title = title.substring(0, idx) + ' ' + year + title.substring(idx);
  }

  // Update title
  var titleRegex = /<title>(.*?)<\/title>/;
  if (titleRegex.test(html)) {
    html = html.replace(titleRegex, '<title>' + title + '</title>');
  }

  // Update or add meta description
  var descRegex = /<meta name="description" content="(.*?)">/;
  if (descRegex.test(html)) {
    html = html.replace(descRegex, '<meta name="description" content="' + desc + '">');
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf-8');
    updated++;
  }
}

console.log('Updated meta tags on ' + updated + ' files');
