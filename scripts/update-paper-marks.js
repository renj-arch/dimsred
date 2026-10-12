const fs = require('fs');
const path = require('path');

const patterns = JSON.parse(fs.readFileSync(path.join(__dirname, 'exam-patterns.json'), 'utf-8'));
const root = path.resolve(__dirname, '..');

function getAllHtmlFiles(dir) {
  var results = [];
  var list = fs.readdirSync(dir);
  for (var i = 0; i < list.length; i++) {
    var file = path.join(dir, list[i]);
    var stat = fs.statSync(file);
    if (stat.isDirectory() && file.indexOf('node_modules') === -1) {
      results = results.concat(getAllHtmlFiles(file));
    } else if (file.endsWith('.html')) {
      results.push(file);
    }
  }
  return results;
}

function getExamName(filePath) {
  var parts = filePath.replace(/\\/g, '/').split('/');
  // Find exam name from path: root/{exam}/papers/ or root/{exam}/papers/previous-year/
  var exams = Object.keys(patterns);
  for (var i = 0; i < exams.length; i++) {
    if (parts.indexOf(exams[i]) !== -1) {
      return exams[i];
    }
  }
  return null;
}

var allFiles = getAllHtmlFiles(root);
var paperFiles = [];

// Only process files in {exam}/papers/ directories
for (var i = 0; i < allFiles.length; i++) {
  var f = allFiles[i].replace(/\\/g, '/');
  if (f.match(/\/(cgl|rbi|jee|neet|gate|agniveer|upsc|ibps-po|sbi-clerk|ssc-gd|ctet)\/papers\//)) {
    paperFiles.push(allFiles[i]);
  }
}

var stats = { header: 0, negbox: 0, marks: 0 };

for (var fi = 0; fi < paperFiles.length; fi++) {
  var filePath = paperFiles[fi];
  var examName = getExamName(filePath);
  if (!examName) continue;
  
  var pattern = patterns[examName];
  if (!pattern) continue;

  var html = fs.readFileSync(filePath, 'utf-8');
  var original = html;

  // Build marks/negative info strings
  var marksStr = pattern.totalMarks + ' Marks';
  var negStr = pattern.negativeMarkingDisplay;
  var perQMark = pattern.perQuestionMarks;
  var isVarMark = pattern.perQuestionMarks === '1 or 2';

  // 1. Update paper-header meta section - add marks and negative marking
  // Find the paper-meta div and add/update marks info
  var metaRegex = /(<div class="paper-meta">)([\s\S]*?)(<\/div>)/;
  if (metaRegex.test(html)) {
    var metaMatch = html.match(metaRegex);
    var metaContent = metaMatch[0];
    var updatedMeta = metaContent;

    // Remove existing marks/questions entries to avoid duplication
    updatedMeta = updatedMeta.replace(/<span>\s*[\d,]+\s*(Marks|Questions|Minutes)\s*<\/span>\s*/g, '');
    
    // Add correct entries
    var newMetaContent = '<div class="paper-meta">\n';
    newMetaContent += '                <span>' + pattern.totalQuestions + ' Questions</span>\n';
    newMetaContent += '                <span>' + pattern.totalMarks + ' Marks</span>\n';
    newMetaContent += '                <span>' + pattern.durationMinutes + ' Minutes</span>\n';
    if (perQMark !== '1 or 2') {
      newMetaContent += '                <span>+' + perQMark + ' per correct answer</span>\n';
    } else {
      newMetaContent += '                <span>1 or 2 marks per question</span>\n';
    }

    // Close the div
    newMetaContent += '            </div>';

    // Replace the whole paper-meta div
    html = html.replace(/<div class="paper-meta">[\s\S]*?<\/div>/, newMetaContent);
    stats.header++;
  }

  // 2. Add negative marking info box after the sections badge or timer bar
  var negBox = '<div class="neg-marking-box" style="margin-bottom:16px;padding:10px 14px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.15);border-radius:8px;font-size:.82em;color:#fca5a5">';
  negBox += '<strong style="color:#ef4444">&#9888; Negative Marking:</strong> ' + pattern.negativeMarkingDisplay;
  if (!pattern.hasNegative) {
    negBox = '<div class="neg-marking-box" style="margin-bottom:16px;padding:10px 14px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.15);border-radius:8px;font-size:.82em;color:#6ee7b7">';
    negBox += '<strong style="color:#34d399">&#9989;</strong> ' + pattern.negativeMarkingDisplay;
  }
  negBox += '</div>';

  if (html.indexOf('neg-marking-box') === -1) {
    // Insert after the timer bar or after the sections div (whichever comes later)
    var insertAfter = html.indexOf('<div style="margin-bottom:20px;padding:12px;');
    if (insertAfter === -1) {
      insertAfter = html.indexOf('</div>\n        <p style='); // after timer-bar
    }
    if (insertAfter !== -1) {
      var endOfDiv = html.indexOf('</div>', insertAfter);
      if (endOfDiv !== -1) {
        var afterClose = html.indexOf('</div>', endOfDiv + 6);
        if (afterClose !== -1) {
          html = html.slice(0, afterClose + 6) + '\n        ' + negBox + html.slice(afterClose + 6);
        } else {
          html = html.slice(0, endOfDiv + 6) + '\n        ' + negBox + html.slice(endOfDiv + 6);
        }
      }
    }
    stats.negbox++;
  }

  // 3. Add per-question marks after Q-number
  // Pattern: Q1. or Q1. <span class="section-badge">
  var marksSuffix = isVarMark ? '' : ' <span class="q-marks" style="font-size:.75em;color:#a1a1aa;font-weight:500">[+' + perQMark;
  if (pattern.hasNegative) {
    marksSuffix += ', -' + pattern.negativeMarking + ']';
  } else {
    marksSuffix += ']';
  }
  marksSuffix += '</span>';

  if (isVarMark) {
    marksSuffix = ' <span class="q-marks" style="font-size:.75em;color:#a1a1aa;font-weight:500">[1 or 2 marks]</span>';
  }

  if (html.indexOf('q-marks') === -1) {
    // Replace Q1. (or Q1. followed by space/Span)
    html = html.replace(/(Q\d+\.)(?:\s*<span class="section-badge)/g, function(match, qNum) {
      return qNum + marksSuffix + ' <span class="section-badge';
    });
    stats.marks++;
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf-8');
  }
}

console.log('Updated paper headers: ' + stats.header);
console.log('Added neg marking box: ' + stats.negbox);
console.log('Added per-Q marks: ' + stats.marks);
