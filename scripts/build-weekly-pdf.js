const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

var root = path.resolve(__dirname, '..');
var bankDir = path.join(root, 'question-bank');
var dataDir = path.join(root, 'papers-data');
var pdfDir = path.join(root, 'pdfs');
var EXAMS = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer'];
var EXAM_LABELS = { cgl: 'SSC CGL', rbi: 'RBI Grade B', jee: 'JEE Main', neet: 'NEET UG', gate: 'GATE', agniveer: 'Agniveer' };

function getApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  var keyPath = path.join(root, '.gemini-key');
  if (fs.existsSync(keyPath)) return fs.readFileSync(keyPath, 'utf-8').trim();
  return null;
}

function getMonday(d) {
  var date = new Date(d);
  var day = date.getDay();
  var diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

function formatWeekRange() {
  var monday = getMonday(new Date());
  var sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  var opts = { month: 'long', day: 'numeric' };
  var mo = monday.toLocaleDateString('en-US', opts);
  var su = sunday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return mo + ' \u2013 ' + su;
}

function getDateStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getLatestPaper(exam) {
  var metaPath = path.join(bankDir, exam + '-meta.json');
  if (!fs.existsSync(metaPath)) return null;
  var meta;
  try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch (e) { return null; }
  if (!meta.lastSetNumber) return null;
  var setNum = String(meta.lastSetNumber).padStart(2, '0');
  var paperPath = path.join(dataDir, exam + '-practice-set-' + setNum + '.json');
  if (!fs.existsSync(paperPath)) return null;
  try { return JSON.parse(fs.readFileSync(paperPath, 'utf-8')); } catch (e) { return null; }
}

async function getTopicAnalysis(apiKey, exam, questions) {
  var model = 'gemini-2.5-flash-lite';
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;

  var qText = questions.map(function(q, i) {
    return (i + 1) + '. ' + (q.text || q.question || '') + '\nOptions: ' + (q.options || []).join(', ') + '\nAnswer: ' + (q.answer || q.correctAnswer || '');
  }).join('\n\n');

  var prompt = 'You are an expert ' + EXAM_LABELS[exam] + ' tutor. Analyze these practice questions and provide a concise analysis with:\n' +
    '1. Topics Covered - List main topics and subtopics tested\n' +
    '2. Difficulty Breakdown - What percentage were easy, medium, hard\n' +
    '3. Key Concepts - Most important concepts to master\n' +
    '4. Common Mistakes - Errors students commonly make on these questions\n' +
    '5. Study Tips - How to prepare for these topics effectively\n\n' +
    'Questions:\n' + qText + '\n\n' +
    'Use plain text with bullet points (use *). Do NOT use markdown headers or formatting. Keep it under 300 words.';

  var body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
  });

  for (var attempt = 1; attempt <= 3; attempt++) {
    try {
      var resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body });
      if (!resp.ok) {
        if (resp.status === 429) {
          console.log('  Rate limited, waiting 5s...');
          await new Promise(function(r) { setTimeout(r, 5000); });
          continue;
        }
        console.log('  Gemini error ' + resp.status + ', attempt ' + attempt);
        if (attempt < 3) await new Promise(function(r) { setTimeout(r, 2000); });
        continue;
      }
      var data = await resp.json();
      var text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) || '';
      return text.trim();
    } catch (e) {
      console.log('  Error calling Gemini: ' + e.message);
      if (attempt < 3) await new Promise(function(r) { setTimeout(r, 2000); });
    }
  }
  return null;
}

function wrapText(doc, text, x, y, maxWidth, lineHeight) {
  var lines = [];
  var currentLine = '';
  var words = text.split(' ');
  for (var i = 0; i < words.length; i++) {
    var testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
    if (doc.widthOfString(testLine) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawWrapped(doc, text, x, y, maxWidth, lineHeight) {
  var lines = wrapText(doc, text, x, y, maxWidth, lineHeight);
  for (var i = 0; i < lines.length; i++) {
    doc.text(lines[i], x, y, { lineBreak: false });
    y += lineHeight;
  }
  return y;
}

function addSectionBadge(doc, sectionName, sectionColor, y) {
  doc.roundedRect(50, y, doc.widthOfString(sectionName, { fontSize: 8 }) + 16, 16, 4)
    .fillColor(sectionColor).fill();
  doc.fillColor('#ffffff')
    .fontSize(8)
    .text(sectionName, 58, y + 4);
  doc.fillColor('#1f2937');
}

async function buildPDF() {
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);

  var dateStr = getDateStr();
  var weekRange = formatWeekRange();
  var filename = 'weekly-' + dateStr + '.pdf';
  var filepath = path.join(pdfDir, filename);

  var papers = [];
  for (var i = 0; i < EXAMS.length; i++) {
    var p = getLatestPaper(EXAMS[i]);
    if (p) papers.push({ exam: EXAMS[i], paper: p });
  }

  if (papers.length === 0) {
    console.log('No paper data found. Run generate-papers first.');
    return null;
  }

  var totalQ = 0;
  for (var i = 0; i < papers.length; i++) totalQ += papers[i].paper.questions.length;

  console.log('Building PDF: ' + filename);
  console.log('  Exams: ' + papers.length + ', Questions: ' + totalQ);

  var apiKey = getApiKey();
  var analyses = {};
  if (apiKey) {
    console.log('  Fetching topic analyses from Gemini...');
    for (var ai = 0; ai < papers.length; ai++) {
      var exam = papers[ai].exam;
      var label = EXAM_LABELS[exam] || exam.toUpperCase();
      process.stdout.write('    ' + label + '... ');
      var text = await getTopicAnalysis(apiKey, exam, papers[ai].paper.questions);
      if (text) {
        analyses[exam] = text;
        console.log('OK');
      } else {
        console.log('skipped');
      }
      if (ai < papers.length - 1) await new Promise(function(r) { setTimeout(r, 3000); });
    }
  } else {
    console.log('  No Gemini API key found, skipping topic analyses');
  }

  var doc = new PDFDocument({ margin: 50, size: 'A4' });
  var stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  var pageW = doc.page.width - 100;
  var accentColor = '#6366f1';
  var lightBg = '#f3f4f6';

  // --- Cover Page ---
  doc.rect(0, 0, doc.page.width, doc.page.height).fillColor('#1e1b4b').fill();
  doc.fillColor('#ffffff')
    .fontSize(36)
    .text('Weekly Study Digest', 50, 180, { align: 'left' });
  doc.fontSize(16)
    .fillColor('#a5b4fc')
    .text(weekRange, 50, 230);
  doc.moveTo(50, 270).lineTo(350, 270).strokeColor('#6366f1').lineWidth(2).stroke();
  doc.fontSize(12)
    .fillColor('#c7d2fe')
    .text('vlymbooq.qzz.io', 50, 290);
  doc.fontSize(11)
    .text('Premium Weekly Question Analysis & Solutions', 50, 315);

  doc.fontSize(10).fillColor('#e0e7ff');
  var y = 370;
  for (var i = 0; i < papers.length; i++) {
    var exam = papers[i].exam;
    var label = EXAM_LABELS[exam] || exam.toUpperCase();
    var count = papers[i].paper.questions.length;
    var title = papers[i].paper.title || '';
    doc.text('\u2022  ' + label + ' \u2014 ' + title + ' (' + count + ' questions)', 50, y);
    y += 22;
  }

  doc.addPage();

  // --- Table of Contents ---
  doc.fillColor('#1e1b4b').fontSize(22).text('Contents', 50, 50);
  doc.moveTo(50, 75).lineTo(200, 75).strokeColor(accentColor).lineWidth(2).stroke();
  y = 100;
  doc.fontSize(12).fillColor('#374151');
  for (var i = 0; i < papers.length; i++) {
    var label = EXAM_LABELS[papers[i].exam] || papers[i].exam.toUpperCase();
    doc.text('  ' + (i + 1) + '.  ' + label + ' \u2014 ' + papers[i].paper.questions.length + ' questions', 50, y);
    y += 24;
  }
  doc.text('  ' + (papers.length + 1) + '.  Week in Review', 50, y);
  doc.addPage();

  // --- Per-Exam Sections ---
  var qNumGlobal = 0;
  for (var ei = 0; ei < papers.length; ei++) {
    var exam = papers[ei].exam;
    var paper = papers[ei].paper;
    var questions = paper.questions || [];
    var label = EXAM_LABELS[exam] || exam.toUpperCase();
    var sections = paper.sections || [];

    // Exam header page
    y = 50;
    doc.fillColor('#1e1b4b').fontSize(24).text(label, 50, y);
    y += 35;
    doc.fillColor('#6b7280').fontSize(11).text(paper.title || label + ' Practice', 50, y);
    y += 30;
    doc.moveTo(50, y).lineTo(300, y).strokeColor(accentColor).lineWidth(1.5).stroke();
    y += 25;

    var analysis = analyses[exam];
    if (analysis) {
      doc.fillColor('#1f2937').fontSize(13).text('Topic Analysis', 50, y);
      y += 22;
      var aLines = analysis.split('\n');
      var aHeight = aLines.length * 14 + 20;
      if (aHeight < 40) aHeight = 40;
      doc.roundedRect(50, y, pageW, aHeight, 6).fillColor('#eef2ff').fill();
      doc.fillColor('#374151').fontSize(9);
      var ay = y + 10;
      for (var ai = 0; ai < aLines.length; ai++) {
        var line = aLines[ai].trim();
        if (line) {
          doc.text(line, 60, ay, { width: pageW - 20, lineBreak: true });
          ay = doc.y + 4;
        }
      }
      doc.fillColor('#1f2937');
      y = ay + 20;
    }

    for (var qi = 0; qi < questions.length; qi++) {
      qNumGlobal++;
      var q = questions[qi];
      var qText = q.text || q.question || '';
      var qOptions = q.options || [];
      var qSolution = q.solution || '';
      var sectionName = q.section || (sections.length > 0 ? sections[0].name : '');
      var sectionColor = '#6366f1';
      for (var si = 0; si < sections.length; si++) {
        if (sections[si].name === sectionName) { sectionColor = sections[si].color || sectionColor; break; }
      }

      var correctLabel = '';
      for (var oi = 0; oi < qOptions.length; oi++) {
        if (qOptions[oi].correct) { correctLabel = qOptions[oi].label; break; }
      }

      if (y > 620) { doc.addPage(); y = 50; }

      if (sectionName) {
        doc.roundedRect(50, y, doc.widthOfString(sectionName, { fontSize: 8 }) + 16, 16, 4).fillColor(sectionColor).fill();
        doc.fillColor('#ffffff').fontSize(8).text(sectionName, 58, y + 4);
        doc.fillColor('#1f2937');
        y += 22;
      }

      doc.fontSize(11).fillColor('#111827');
      doc.text('Q' + qNumGlobal + '. ' + qText, 50, y, { width: pageW, lineBreak: true });
      y = doc.y + 6;

      if (qOptions.length > 0) {
        doc.fontSize(10);
        for (var oi = 0; oi < qOptions.length; oi++) {
          var opt = qOptions[oi];
          var prefix = opt.label + '. ';
          var isCorrect = opt.correct;
          doc.fillColor(isCorrect ? '#059669' : '#4b5563');
          doc.text('     ' + prefix + (opt.text || ''), 50, y, { width: pageW - 60, lineBreak: true });
          y = doc.y + 2;
        }
        y += 2;
        doc.fillColor('#059669').fontSize(9);
        doc.text('  \u2713 Correct: ' + correctLabel, 50, y);
        y = doc.y + 6;
        doc.fillColor('#1f2937');
      }

      if (qSolution) {
        doc.fontSize(9).fillColor('#6b7280');
        doc.text('  \u25B7 ' + qSolution, 50, y, { width: pageW - 20, lineBreak: true });
        y = doc.y + 8;
        doc.fillColor('#1f2937');
      }

      y += 8;

      if (qi < questions.length - 1) {
        doc.moveTo(50, y).lineTo(50 + pageW, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
        y += 10;
      }
    }

    // Page break between exams
    if (ei < papers.length - 1) doc.addPage();
  }

  // --- Week in Review ---
  doc.addPage();
  doc.fillColor('#1e1b4b').fontSize(22).text('Week in Review', 50, 50);
  doc.moveTo(50, 75).lineTo(250, 75).strokeColor(accentColor).lineWidth(2).stroke();

  y = 100;
  doc.fontSize(12).fillColor('#374151');
  doc.text('This week\'s digest covered ' + totalQ + ' questions across ' + papers.length + ' exams.', 50, y);
  y += 30;

  var perExam = [];
  for (var i = 0; i < papers.length; i++) {
    perExam.push(EXAM_LABELS[papers[i].exam] + ' (' + papers[i].paper.questions.length + ' Q)');
  }
  doc.text('Exams covered: ' + perExam.join(', '), 50, y);
  y += 30;

  doc.fontSize(11).fillColor('#6b7280');
  doc.text('Review Strategy:', 50, y);
  y += 22;
  var tips = [
    'Review questions you got wrong and understand the solution thoroughly',
    'Practice similar problems from each topic to reinforce concepts',
    'Time yourself when attempting questions to simulate exam conditions',
    'Track your accuracy across weeks to measure improvement',
    'Focus on weak areas identified in the topic analysis sections'
  ];
  for (var ti = 0; ti < tips.length; ti++) {
    doc.text('  ' + (ti + 1) + '. ' + tips[ti], 50, y);
    y += 20;
  }

  y += 30;
  doc.fillColor('#374151').fontSize(10);
  doc.text('vlymbooq.qzz.io  |  Premium Weekly Study Digest', 50, y, { align: 'center' });
  y += 18;
  doc.fillColor('#9ca3af').fontSize(9);
  doc.text('Generated on ' + new Date().toDateString(), 50, y, { align: 'center' });

  doc.end();

  return new Promise(function(resolve, reject) {
    stream.on('finish', function() {
      var stats = fs.statSync(filepath);
      fs.writeFileSync(path.join(pdfDir, 'latest.json'), JSON.stringify({ filename: filename, date: weekRange, generated: dateStr }));
      console.log('  PDF created: ' + filename + ' (' + (stats.size / 1024).toFixed(1) + ' KB)');
      resolve({ filename: filename, filepath: filepath, size: stats.size });
    });
    stream.on('error', reject);
  });
}

// Run
buildPDF().catch(function(err) {
  console.error('Error building PDF:', err);
  process.exit(1);
});