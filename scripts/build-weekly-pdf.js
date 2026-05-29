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
    return (i + 1) + '. ' + (q.text || q.question || '');
  }).join('\n\n');

  var prompt = 'You are an expert ' + EXAM_LABELS[exam] + ' tutor. Analyze these practice questions and provide a concise analysis with:\n' +
    '1. Topics Covered - List main topics and subtopics tested\n' +
    '2. Difficulty Breakdown - Rough percentage easy/medium/hard\n' +
    '3. Key Concepts - Most important concepts to master\n' +
    '4. Common Mistakes - Errors students commonly make\n' +
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

function buildExamPDF(exam, paper, analysis, weekRange, dateStr) {
  return new Promise(function(resolve, reject) {
    var label = EXAM_LABELS[exam] || exam.toUpperCase();
    var filename = 'weekly-' + dateStr + '-' + exam + '.pdf';
    var filepath = path.join(pdfDir, filename);
    var questions = paper.questions || [];
    var sections = paper.sections || [];
    var pageW = 495;

    var doc = new PDFDocument({ margin: 50, size: 'A4' });
    var stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // --- Cover ---
    doc.rect(0, 0, doc.page.width, doc.page.height).fillColor('#1e1b4b').fill();
    doc.fillColor('#ffffff').fontSize(32).text(label + ' Study Digest', 50, 170, { align: 'left' });
    doc.fontSize(14).fillColor('#a5b4fc').text(weekRange, 50, 215);
    doc.moveTo(50, 245).lineTo(350, 245).strokeColor('#6366f1').lineWidth(2).stroke();
    doc.fontSize(11).fillColor('#c7d2fe').text('vlymbooq.qzz.io', 50, 265);
    doc.fontSize(10).fillColor('#e0e7ff').text(paper.title || label + ' Practice', 50, 290);
    doc.fontSize(10).fillColor('#e0e7ff').text(questions.length + ' questions with detailed solutions', 50, 310);

    // --- Questions ---
    doc.addPage();
    doc.fillColor('#1e1b4b').fontSize(18).text(label, 50, 40);
    doc.moveTo(50, 62).lineTo(180, 62).strokeColor('#6366f1').lineWidth(1.5).stroke();

    var y = 80;

    // Topic analysis
    if (analysis) {
      doc.fillColor('#1f2937').fontSize(12).text('Topic Analysis', 50, y);
      y += 20;
      var aLines = analysis.split('\n');
      var aHeight = Math.max(aLines.length * 14 + 20, 40);
      doc.roundedRect(50, y, pageW, aHeight, 6).fillColor('#eef2ff').fill();
      doc.fillColor('#374151').fontSize(9);
      var ay = y + 10;
      for (var ai = 0; ai < aLines.length; ai++) {
        var line = aLines[ai].trim();
        if (line) { doc.text(line, 60, ay, { width: pageW - 20 }); ay = doc.y + 4; }
      }
      doc.fillColor('#1f2937');
      y = ay + 20;
    }

    // Questions
    for (var qi = 0; qi < questions.length; qi++) {
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

      if (y > 680) { doc.addPage(); y = 40; }

      if (sectionName) {
        var bw = doc.widthOfString(sectionName, { fontSize: 8 }) + 16;
        doc.roundedRect(50, y, bw, 16, 4).fillColor(sectionColor).fill();
        doc.fillColor('#ffffff').fontSize(8).text(sectionName, 58, y + 4);
        doc.fillColor('#1f2937');
        y += 22;
      }

      doc.fontSize(11).fillColor('#111827').text('Q' + (qi + 1) + '. ' + qText, 50, y, { width: pageW });
      y = doc.y + 6;

      if (qOptions.length > 0) {
        doc.fontSize(10);
        for (var oi = 0; oi < qOptions.length; oi++) {
          var opt = qOptions[oi];
          doc.fillColor(opt.correct ? '#059669' : '#4b5563');
          doc.text('     ' + opt.label + '. ' + (opt.text || ''), 50, y, { width: pageW - 60 });
          y = doc.y + 2;
        }
        y += 2;
        doc.fillColor('#059669').fontSize(9).text('  \u2713 Correct: ' + correctLabel, 50, y);
        y = doc.y + 6;
        doc.fillColor('#1f2937');
      }

      if (qSolution) {
        doc.fontSize(9).fillColor('#6b7280').text('  \u25B7 ' + qSolution, 50, y, { width: pageW - 20 });
        y = doc.y + 8;
        doc.fillColor('#1f2937');
      }

      y += 6;
      if (qi < questions.length - 1) {
        doc.moveTo(50, y).lineTo(50 + pageW, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
        y += 10;
      }
    }

    // Footer
    doc.addPage();
    doc.fillColor('#1e1b4b').fontSize(18).text('Study Tips', 50, 50);
    doc.moveTo(50, 72).lineTo(180, 72).strokeColor('#6366f1').lineWidth(1.5).stroke();
    doc.fontSize(10).fillColor('#374151');
    var tips = [
      'Review each solution carefully, even for questions you got right',
      'Practice similar problems from the same topic to reinforce concepts',
      'Track your accuracy and time per question to measure improvement',
      'Focus on weak areas identified in the Topic Analysis section',
      'Attempt the online mock tests on vlymbooq for timed practice'
    ];
    var ty = 100;
    for (var ti = 0; ti < tips.length; ti++) {
      doc.text((ti + 1) + '. ' + tips[ti], 50, ty, { width: pageW });
      ty += 24;
    }
    ty += 30;
    doc.fillColor('#9ca3af').fontSize(9).text(label + ' \u2014 vlymbooq.qzz.io \u2014 Generated ' + new Date().toDateString(), 50, ty, { align: 'center' });

    doc.end();

    stream.on('finish', function() {
      var stats = fs.statSync(filepath);
      console.log('  ' + filename + ' (' + (stats.size / 1024).toFixed(1) + ' KB \u00B7 ' + questions.length + ' Q)');
      resolve({ exam: exam, filename: filename, size: stats.size });
    });
    stream.on('error', reject);
  });
}

async function buildPDF() {
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);

  var dateStr = getDateStr();
  var weekRange = formatWeekRange();
  var apiKey = getApiKey();

  var papers = [];
  for (var i = 0; i < EXAMS.length; i++) {
    var p = getLatestPaper(EXAMS[i]);
    if (p) papers.push({ exam: EXAMS[i], paper: p });
  }

  if (papers.length === 0) {
    console.log('No paper data found. Run generate-papers first.');
    return;
  }

  console.log('Building weekly study digests (' + weekRange + '):');

  // Fetch topic analyses
  var analyses = {};
  if (apiKey) {
    console.log('  Fetching topic analyses from Gemini...');
    for (var ai = 0; ai < papers.length; ai++) {
      var exam = papers[ai].exam;
      var label = EXAM_LABELS[exam] || exam.toUpperCase();
      process.stdout.write('    ' + label + '... ');
      var text = await getTopicAnalysis(apiKey, exam, papers[ai].paper.questions);
      if (text) { analyses[exam] = text; console.log('OK'); }
      else { console.log('skipped'); }
      if (ai < papers.length - 1) await new Promise(function(r) { setTimeout(r, 3000); });
    }
  } else {
    console.log('  No Gemini API key found, skipping topic analyses');
  }

  // Build one PDF per exam
  var results = [];
  for (var i = 0; i < papers.length; i++) {
    var r = await buildExamPDF(papers[i].exam, papers[i].paper, analyses[papers[i].exam], weekRange, dateStr);
    results.push(r);
  }

  // Write latest.json
  var manifest = {};
  for (var i = 0; i < results.length; i++) {
    manifest[results[i].exam] = { filename: results[i].filename, date: weekRange };
  }
  fs.writeFileSync(path.join(pdfDir, 'latest.json'), JSON.stringify(manifest, null, 2));
  console.log('\nDone! Generated ' + results.length + ' PDF(s).');
}

buildPDF().catch(function(err) {
  console.error('Error:', err);
  process.exit(1);
});