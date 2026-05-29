var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var bankDir = path.join(root, 'question-bank');

var EXAMS = {
  cgl: { name: 'CGL', sections: [{ name: 'General Intelligence', color: '#a855f7' }, { name: 'General Awareness', color: '#60a5fa' }, { name: 'Mathematics', color: '#34d399' }, { name: 'English', color: '#fb923c' }] },
  rbi: { name: 'RBI Grade B', sections: [{ name: 'General Awareness', color: '#a855f7' }, { name: 'Quantitative Aptitude', color: '#60a5fa' }, { name: 'Reasoning', color: '#34d399' }, { name: 'English', color: '#fb923c' }] },
  jee: { name: 'JEE Main', sections: [{ name: 'Physics', color: '#6366f1' }, { name: 'Chemistry', color: '#f59e0b' }, { name: 'Mathematics', color: '#34d399' }] },
  neet: { name: 'NEET UG', sections: [{ name: 'Physics', color: '#6366f1' }, { name: 'Chemistry', color: '#f59e0b' }, { name: 'Biology', color: '#34d399' }] },
  gate: { name: 'GATE', sections: [{ name: 'General Aptitude', color: '#a855f7' }, { name: 'Core Subject', color: '#6366f1' }, { name: 'Engineering Mathematics', color: '#34d399' }] }
};

var questionId = 1;

function extractQuestions(html) {
  var questions = [];
  var lines = html.split('\n');
  var inQuestion = false;
  var depth = 0;
  var block = '';
  var qNum = 0;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    var questionMatch = line.match(/<div class="question" data-q="(\d+)"/);
    if (questionMatch) {
      inQuestion = true;
      depth = 0;
      block = '';
      qNum = parseInt(questionMatch[1]);
    }

    if (inQuestion) {
      block += line + '\n';
      var openDivs = (line.match(/<div[^>]*>/g) || []).length;
      var closeDivs = (line.match(/<\/div>/g) || []).length;
      depth += openDivs - closeDivs;

      if (depth <= 0 && block.trim().length > 0) {
        inQuestion = false;
        var q = parseQuestionBlock(block, qNum);
        if (q) questions.push(q);
        block = '';
      }
    }
  }

  return questions;
}

function parseQuestionBlock(block, qNum) {
  var section = '';
  var secMatch = block.match(/section-badge[^>]*>([^<]+)<\/span>/);
  if (secMatch) section = secMatch[1].trim();

  var text = '';
  var textMatch = block.match(/<div class="q-text">([\s\S]*?)<\/div>/);
  if (textMatch) text = textMatch[1].trim();

  var optionDivs = block.match(/<div class="q-option"[^>]*>[\s\S]*?<\/div>/g);
  var options = [];
  if (optionDivs) {
    for (var j = 0; j < optionDivs.length; j++) {
      var opt = optionDivs[j];
      var correct = opt.indexOf('data-correct="true"') !== -1;
      var content = opt.replace(/<\/?div[^>]*>/g, '').trim();
      var labelMatch = content.match(/^([A-E])\.\s*/);
      var label = labelMatch ? labelMatch[1] : String.fromCharCode(65 + j);
      var optText = labelMatch ? content.substring(labelMatch[0].length).trim() : content;
      options.push({ label: label, text: optText, correct: correct });
    }
  }

  var solution = '';
  var solBoxMatch = block.match(/<div class="solution-box">([\s\S]*?)<\/div>/);
  if (solBoxMatch) {
    var solText = solBoxMatch[1];
    var solSpanMatch = solText.match(/<span style="color:#4b5563">([\s\S]*?)<\/span>/);
    if (solSpanMatch) solution = solSpanMatch[1].trim();
  }

  if (text && options.length > 0) {
    return { id: questionId++, q: qNum, section: section, text: text, options: options, solution: solution };
  }
  return null;
}

function run() {
  for (var folder in EXAMS) {
    var papersDir = path.join(root, folder, 'papers');
    if (!fs.existsSync(papersDir)) {
      console.log('  Skipping ' + folder + ' (no papers dir)');
      continue;
    }

    var files = fs.readdirSync(papersDir).filter(function(f) { return f.endsWith('.html'); });
    var allQuestions = [];
    var counts = {};

    for (var i = 0; i < files.length; i++) {
      var html = fs.readFileSync(path.join(papersDir, files[i]), 'utf-8');
      var qs = extractQuestions(html);
      allQuestions = allQuestions.concat(qs);
      counts[files[i]] = qs.length;
    }

    if (allQuestions.length === 0) continue;

    var bank = {
      exam: EXAMS[folder].name,
      folder: folder,
      sections: EXAMS[folder].sections,
      timerMinutes: 60,
      paperDefaults: {
        titlePrefix: EXAMS[folder].name + ' Practice Set',
        pageTitleTemplate: EXAMS[folder].name + ' Practice Set {number} — Solved Paper',
        pageDescTemplate: 'Free ' + EXAMS[folder].name + ' practice paper set {number} with detailed solutions.',
        metaTemplate: '{questionCount} Q · Solved with answers'
      },
      questions: allQuestions,
      generatedPapers: []
    };

    var outPath = path.join(bankDir, folder + '.json');
    fs.writeFileSync(outPath, JSON.stringify(bank, null, 2), 'utf-8');

    console.log(folder + ': ' + allQuestions.length + ' questions extracted from ' + files.length + ' papers');
    for (var f in counts) {
      console.log('  ' + f + ': ' + counts[f] + ' questions');
    }
    console.log('');
  }
}

run();
