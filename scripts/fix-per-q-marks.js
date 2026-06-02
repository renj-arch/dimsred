const fs = require('fs');
const path = require('path');

const patterns = JSON.parse(fs.readFileSync(path.join(__dirname, 'exam-patterns.json'), 'utf-8'));
const root = path.resolve(__dirname, '..');

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
    if (stat.isDirectory() && file.indexOf('node_modules') === -1)
      results = results.concat(getAllHtmlFiles(file));
    else if (file.endsWith('.html'))
      results.push(file);
  }
  return results;
}

var allFiles = getAllHtmlFiles(root);
var paperFiles = [];
for (var i = 0; i < allFiles.length; i++) {
  var f = allFiles[i].replace(/\\/g, '/');
  if (f.match(/\/(cgl|rbi|jee|neet|gate|agniveer|upsc|ibps-po|sbi-clerk|ssc-gd|ctet)\/papers\//))
    paperFiles.push(allFiles[i]);
}

var fixed = 0;

for (var fi = 0; fi < paperFiles.length; fi++) {
  var filePath = paperFiles[fi];
  var examName = getExamName(filePath);
  if (!examName) continue;
  var pattern = patterns[examName];
  if (!pattern) continue;

  var html = fs.readFileSync(filePath, 'utf-8');
  var original = html;

  var perQMark = pattern.perQuestionMarks;
  var isVarMark = perQMark === '1 or 2';
  var hasNeg = pattern.hasNegative;
  var negVal = pattern.negativeMarking;

  var marksSuffix;
  if (isVarMark) {
    marksSuffix = ' <span class="q-marks" style="font-size:.75em;color:#a1a1aa;font-weight:500">[1 or 2 marks]</span>';
  } else if (hasNeg && negVal !== '0') {
    marksSuffix = ' <span class="q-marks" style="font-size:.75em;color:#a1a1aa;font-weight:500">[+' + perQMark + ', -' + negVal + ']</span>';
  } else {
    marksSuffix = ' <span class="q-marks" style="font-size:.75em;color:#a1a1aa;font-weight:500">[+' + perQMark + ']</span>';
  }

  // Replace all Q<N>. that don't already have q-marks after them
  // No capture groups - just (Q\d+\.)
  html = html.replace(/Q\d+\./g, function(match, offset, full) {
    var after = full.substring(offset + match.length, offset + match.length + 60);
    if (after.indexOf('q-marks') !== -1) return match;
    var before = full.substring(Math.max(0, offset - 30), offset);
    if (before.indexOf('q-number') === -1) return match;
    return match + marksSuffix;
  });

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf-8');
    fixed++;
  }
}

console.log('Fixed files with missing per-Q marks: ' + fixed);
