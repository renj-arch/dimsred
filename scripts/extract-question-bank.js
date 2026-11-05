var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var bankDir = path.join(root, 'question-bank');

var COLORS = ['#a855f7', '#60a5fa', '#34d399', '#fb923c', '#6366f1', '#f59e0b'];

// Strip C0 control characters (notably the NUL left behind in older Hindi
// glosses) before they reach a bank or a built HTML page. A single NUL makes
// git treat the generated paper as a binary file and breaks text search.
function stripControls(s) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sec(name, color) { return { name: name, color: color }; }

// All 14 exams the site advertises. `sections` is the syllabus fallback;
// run() derives the actual bank sections from the extracted questions so a
// paper's own badge labels (e.g. UPSC "CSAT") stay consistent with its
// questions instead of silently losing badges in build-papers.js.
var EXAMS = {
  cgl: { name: 'CGL', sections: [sec('General Intelligence & Reasoning', '#a855f7'), sec('General Awareness', '#60a5fa'), sec('Quantitative Aptitude', '#34d399'), sec('English Language', '#fb923c')] },
  rbi: { name: 'RBI Grade B', sections: [sec('General Awareness', '#a855f7'), sec('Quantitative Aptitude', '#60a5fa'), sec('Reasoning', '#34d399'), sec('English Language', '#fb923c')] },
  jee: { name: 'JEE Main', sections: [sec('Physics', '#6366f1'), sec('Chemistry', '#f59e0b'), sec('Mathematics', '#34d399')] },
  neet: { name: 'NEET UG', sections: [sec('Physics', '#6366f1'), sec('Chemistry', '#f59e0b'), sec('Biology', '#34d399')] },
  gate: { name: 'GATE', sections: [sec('General Aptitude', '#a855f7'), sec('Core Subject', '#6366f1'), sec('Engineering Mathematics', '#34d399')] },
  agniveer: { name: 'Agniveer', sections: [sec('General Knowledge', '#a855f7'), sec('Mathematics', '#60a5fa'), sec('Science', '#34d399'), sec('Reasoning', '#fb923c')] },
  upsc: { name: 'UPSC Civil Services', sections: [sec('General Studies', '#a855f7'), sec('Quantitative Aptitude', '#60a5fa'), sec('General Awareness', '#34d399'), sec('English Language', '#fb923c')] },
  'ibps-po': { name: 'IBPS PO', sections: [sec('Reasoning', '#a855f7'), sec('Quantitative Aptitude', '#60a5fa'), sec('English Language', '#34d399'), sec('General Awareness', '#fb923c')] },
  'sbi-clerk': { name: 'SBI Clerk', sections: [sec('Reasoning', '#a855f7'), sec('Quantitative Aptitude', '#60a5fa'), sec('English Language', '#34d399'), sec('General Awareness', '#fb923c')] },
  'ssc-gd': { name: 'SSC GD Constable', sections: [sec('General Knowledge', '#a855f7'), sec('Mathematics', '#60a5fa'), sec('Reasoning', '#34d399'), sec('English Language', '#fb923c')] },
  ctet: { name: 'CTET', sections: [sec('General Knowledge', '#a855f7'), sec('Quantitative Aptitude', '#60a5fa'), sec('English Language', '#34d399')] },
  nda: { name: 'NDA', sections: [sec('Mathematics', '#60a5fa'), sec('General Knowledge', '#a855f7')] },
  cds: { name: 'CDS', sections: [sec('English Language', '#34d399'), sec('General Knowledge', '#a855f7'), sec('Mathematics', '#60a5fa')] },
  clat: { name: 'CLAT', sections: [sec('English Language', '#34d399'), sec('Current Affairs & GK', '#a855f7'), sec('Reasoning', '#60a5fa'), sec('Quantitative Aptitude', '#fb923c')] }
};

// Keep only sections that actually occur in the extracted questions (in the
// order they appear), falling back to the syllabus list when a paper has no
// section badges.
function deriveSections(folder, questions) {
  var defined = EXAMS[folder].sections;
  var byName = {};
  for (var i = 0; i < defined.length; i++) byName[defined[i].name] = defined[i];

  var out = [];
  var seen = {};
  for (var q = 0; q < questions.length; q++) {
    var name = questions[q].section;
    if (!name || seen[name]) continue;
    seen[name] = true;
    out.push(byName[name] || sec(name, COLORS[out.length % COLORS.length]));
  }
  return out.length ? out : defined;
}

var questionId = 1;

var SECTION_HINTS = {
  cgl: [
    ['English Language', /\b(synonym|antonym|spelling|idiom|phrase|grammar|sentence|passage|comprehension|cloze|preposition|article|tense|voice|speech|error|word)\b/i],
    ['General Intelligence & Reasoning', /\b(series|coding|blood|direction|statement|assumption|syllogism|analogy|odd|seating|ranking|figure|mirror|water image|conclusion|argument|venn|alphabet|letter)\b/i],
    ['Quantitative Aptitude', /\b(ratio|average|profit|loss|interest|percentage|percent|speed|distance|train|work|mixture|discount|principal|lcm|hcf|area|volume|perimeter|square|root|number)\b/i]
  ],
  rbi: [
    ['English Language', /\b(synonym|antonym|spelling|idiom|grammar|sentence|passage|comprehension|cloze|preposition|error|word)\b/i],
    ['Reasoning', /\b(series|coding|blood|direction|statement|assumption|syllogism|analogy|odd|seating|ranking|figure|conclusion|argument)\b/i],
    ['Quantitative Aptitude', /\b(ratio|average|profit|loss|interest|percentage|speed|distance|work|mixture|discount|area|volume|number)\b/i]
  ],
  gate: [
    ['General Aptitude', /\b(synonym|antonym|grammar|sentence|passage|comprehension|ratio|average|percentage|profit|loss|series|coding|analogy|logic)\b/i],
    ['Engineering Mathematics', /\b(matrix|eigen|calculus|integral|derivative|differential|probability|statistics|linear algebra|fourier|laplace|complex)\b/i]
  ]
};

// Some previous-year papers print one section legend above the paper instead of
// a badge on each question. Without this, those papers contributed hundreds of
// questions with section:"" and lost their badge in every generated paper.
function inferSection(folder, text) {
  var rules = SECTION_HINTS[folder] || [];
  for (var i = 0; i < rules.length; i++) {
    if (rules[i][1].test(text)) return rules[i][0];
  }
  if (folder === 'cgl' || folder === 'rbi') return 'General Awareness';
  if (folder === 'gate') return 'Core Subject';
  return '';
}

function normalizeSection(folder, name) {
  var s = String(name || '').replace(/&amp;/g, '&').trim();
  if (!s) return '';
  if (folder === 'cgl') {
    if (/english/i.test(s)) return 'English Language';
    if (/general intelligence/i.test(s)) return 'General Intelligence & Reasoning';
    if (/math/i.test(s)) return 'Quantitative Aptitude';
  }
  if (/^(rbi|ibps-po|sbi-clerk|ssc-gd|ctet)$/.test(folder) && /^english$/i.test(s)) return 'English Language';
  if (folder === 'ctet' && /^mathematics$/i.test(s)) return 'Quantitative Aptitude';
  return s;
}

function extractQuestions(html, folder) {
  var questions = [];
  // Papers pack several questions onto one long line (the 2023/2024/2025
  // previous-year pages do). The old line-based scanner only ever saw the
  // first question on such a line, which is why those papers yielded 1
  // question each. Slice between question markers instead.
  var re = /<div class="question"[^>]*data-q="(\d+)"/g;
  var marks = [];
  var m;
  while ((m = re.exec(html)) !== null) {
    marks.push({ q: parseInt(m[1], 10), start: m.index });
  }
  for (var i = 0; i < marks.length; i++) {
    var end = (i + 1 < marks.length) ? marks[i + 1].start : html.length;
    var block = html.slice(marks[i].start, end);
    var q = parseQuestionBlock(block, marks[i].q, folder);
    if (q) questions.push(q);
  }
  return questions;
}

function parseQuestionBlock(block, qNum, folder) {
  var section = '';
  var secMatch = block.match(/section-badge[^>]*>([^<]+)<\/span>/);
  if (secMatch) section = normalizeSection(folder, secMatch[1]);

  // Some papers print the section as plain text inside q-number, e.g.
  // "Q1. [+1, -0.25] General Awareness" (RBI previous-year papers).
  if (!section) {
    var qnMatch = block.match(/<div class="q-number">([\s\S]*?)<\/div>/);
    if (qnMatch) {
      var qnText = qnMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      qnText = qnText.replace(/^Q\d+\.?\s*/i, '').replace(/\[[^\]]*\]/g, '').trim();
      if (qnText && qnText.length <= 60 && /[A-Za-z]/.test(qnText)) {
        section = normalizeSection(folder, qnText);
      }
    }
  }

  var text = '';
  var textMatch = block.match(/<div class="q-text">([\s\S]*?)<\/div>/);
  if (textMatch) text = stripControls(textMatch[1]);

  if (!section && text) section = inferSection(folder, text);

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
      options.push({ label: label, text: stripControls(optText), correct: correct });
    }
  }

  var solution = '';
  var solBoxMatch = block.match(/<div class="solution-box">([\s\S]*?)<\/div>/);
  if (solBoxMatch) {
    var solText = solBoxMatch[1];
    var solSpanMatch = solText.match(/<span style="color:#4b5563">([\s\S]*?)<\/span>/);
    if (solSpanMatch) solution = stripControls(solSpanMatch[1]);
  }

  if (text && options.length > 0) {
    return { id: questionId++, q: qNum, section: section, text: text, options: options, solution: solution };
  }
  return null;
}

function run() {
  var args = process.argv.slice(2);
  var missingOnly = args.indexOf('--missing-only') !== -1;

  for (var folder in EXAMS) {
    var outPath = path.join(bankDir, folder + '.json');
    // --missing-only lets the daily workflow backfill banks that do not exist
    // yet without re-extracting (and possibly reordering) banks that do.
    if (missingOnly && fs.existsSync(outPath)) {
      console.log('  Skipping ' + folder + ' (bank already exists)');
      continue;
    }

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
      var qs = extractQuestions(html, folder);
      allQuestions = allQuestions.concat(qs);
      counts[files[i]] = qs.length;
    }

    if (allQuestions.length === 0) {
      console.log('  Skipping ' + folder + ' (no questions found)');
      continue;
    }

    var sections = deriveSections(folder, allQuestions);
    var bank = {
      exam: EXAMS[folder].name,
      folder: folder,
      sections: sections,
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

    fs.writeFileSync(outPath, JSON.stringify(bank, null, 2), 'utf-8');

    console.log(folder + ': ' + allQuestions.length + ' questions extracted from ' + files.length + ' papers');
    for (var f in counts) {
      console.log('  ' + f + ': ' + counts[f] + ' questions');
    }
    console.log('');
  }
}

run();
