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
  var mo = monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
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

function callGemini(apiKey, prompt, retries) {
  if (!retries) retries = 3;
  var model = 'gemini-2.5-flash-lite';
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
  var body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } });
  return (function attempt(n) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body })
      .then(function(r) {
        if (r.status === 429 && n > 1) { return new Promise(function(ok) { setTimeout(ok, 5000); }).then(function() { return attempt(n - 1); }); }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        var text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) || '';
        return text.trim();
      })
      .catch(function(e) {
        if (n > 1) return new Promise(function(ok) { setTimeout(ok, 2000); }).then(function() { return attempt(n - 1); });
        throw e;
      });
  })(retries);
}

async function getDetailedSolutions(apiKey, exam, questions) {
  if (!apiKey) return null;
  var label = EXAM_LABELS[exam] || exam.toUpperCase();
  var qText = questions.map(function(q, i) {
    var opts = (q.options || []).map(function(o) { return o.label + '. ' + (o.text || ''); }).join(' | ');
    var correctLabel = '';
    for (var oi = 0; oi < (q.options || []).length; oi++) { if (q.options[oi].correct) { correctLabel = q.options[oi].label; break; } }
    return 'Q' + (i + 1) + ': ' + (q.text || q.question || '') + '\nOptions: ' + opts + '\nCorrect Answer: ' + correctLabel;
  }).join('\n\n');

  var prompt = 'You are a top ' + label + ' tutor. For each question below, provide an EXTREMELY DETAILED solution. Each solution MUST include:\n' +
    '- Step-by-step working with all formulas and calculations shown clearly\n' +
    '- The logical reasoning behind each step\n' +
    '- Smart shortcuts, tricks, or alternative methods to solve faster\n' +
    '- Common mistakes students make on this question\n' +
    '- Final answer\n\n' +
    'Questions:\n' + qText + '\n\n' +
    'Return in this exact format (use ===Q1=== as delimiters):\n' +
    '===Q1===\n[detailed solution for question 1]\n===Q2===\n[detailed solution for question 2]\n...\n\n' +
    'Make each solution at least 4-6 sentences. Be thorough and exam-focused.';

  try {
    var text = await callGemini(apiKey, prompt);
    var solutions = {};
    var parts = text.split(/===Q(\d+)===/);
    for (var i = 1; i < parts.length; i += 2) {
      var idx = parseInt(parts[i]) - 1;
      var sol = parts[i + 1];
      if (idx >= 0 && sol) solutions[idx] = sol.trim();
    }
    return solutions;
  } catch (e) {
    console.log('  Detailed solutions failed: ' + e.message);
    return null;
  }
}

// --- Doodle Helpers ---
function starPts(cx, cy, R) {
  var a = [], r = R * 0.382;
  for (var i = 0; i < 5; i++) {
    var o = (i * 72 - 90) * Math.PI / 180, n = (i * 72 + 36 - 90) * Math.PI / 180;
    a.push(cx + R * Math.cos(o), cy + R * Math.sin(o), cx + r * Math.cos(n), cy + r * Math.sin(n));
  }
  return a;
}
function drawStar(doc, cx, cy, R, c) { doc.save().fillColor(c).polygon(starPts(cx, cy, R)).fill().restore(); }
function drawSparkle(doc, x, y, s, c) {
  doc.save().fillColor(c);
  doc.polygon([x, y - s, x + s * 0.3, y - s * 0.3, x + s, y, x + s * 0.3, y + s * 0.3, x, y + s, x - s * 0.3, y + s * 0.3, x - s, y, x - s * 0.3, y - s * 0.3]).fill();
  doc.restore();
}
function drawDots(doc, x, y, n, sp, r, c) { doc.save().fillColor(c); for (var i = 0; i < n; i++) doc.circle(x + i * sp, y, r).fill(); doc.restore(); }
function drawDottedLine(doc, x1, y1, x2, y2, c) {
  doc.save().strokeColor(c).lineWidth(0.6);
  var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy), st = Math.floor(len / 5);
  for (var i = 0; i <= st; i++) { if (i % 2 === 0) { var t = i / st, t2 = Math.min((i + 1) / st, 1); doc.moveTo(x1 + dx * t, y1 + dy * t).lineTo(x1 + dx * t2, y1 + dy * t2).stroke(); } }
  doc.restore();
}
function drawFlourish(doc, x, y, w, c) {
  doc.save().strokeColor(c).lineWidth(1); var m = x + w / 2;
  doc.moveTo(x, y).lineTo(m - 8, y).stroke(); doc.moveTo(m + 8, y).lineTo(x + w, y).stroke();
  doc.fillColor(c).polygon([m, y - 4, m + 4, y, m, y + 4, m - 4, y]).fill(); doc.restore();
}
function drawNumCircle(doc, x, y, num, r, c) {
  doc.save().circle(x + r, y + r, r).fillColor(c).fill();
  doc.fillColor('#ffffff').fontSize(r * 0.85).text(String(num), x + r - doc.widthOfString(String(num)) / 2, y + r - r * 0.35);
  doc.restore();
}
function drawRadio(doc, x, y, filled, c) {
  doc.save(); doc.circle(x + 5, y + 4, 5).lineWidth(1.2).strokeColor(c).stroke();
  if (filled) doc.circle(x + 5, y + 4, 3).fillColor(c).fill();
  doc.restore();
}
function drawAccent(doc, x, y, h, c) { doc.save().roundedRect(x, y, 4, h, 2).fillColor(c).fill().restore(); }

// --- PDF Builder ---
function buildExamPDF(exam, paper, analysis, weekRange, dateStr, detailedSols, quickRef) {
  return new Promise(function(resolve, reject) {
    var label = EXAM_LABELS[exam] || exam.toUpperCase();
    var filename = 'weekly-' + dateStr + '-' + exam + '.pdf';
    var filepath = path.join(pdfDir, filename);
    var questions = paper.questions || [];
    var sections = paper.sections || [];
    var PW = 495, ML = 50;
    var doc = new PDFDocument({ margin: 50, size: 'A4' });
    var stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // ========== COVER ==========
    doc.rect(0, 0, doc.page.width, doc.page.height).fillColor('#0f0d1a').fill();
    doc.rect(0, 0, doc.page.width, doc.page.height / 2).fillColor('#1a1540').fill({ opacity: 0.3 });
    drawStar(doc, doc.page.width - 80, 90, 25, '#8b5cf6');
    drawStar(doc, doc.page.width - 40, 130, 12, '#a78bfa');
    drawSparkle(doc, doc.page.width - 120, 60, 8, '#c4b5fd');
    drawSparkle(doc, doc.page.width - 30, 50, 5, '#a78bfa');
    drawStar(doc, 80, doc.page.height - 100, 18, '#6366f1');
    drawSparkle(doc, 60, doc.page.height - 150, 6, '#818cf8');
    drawSparkle(doc, 120, doc.page.height - 80, 7, '#818cf8');
    drawDots(doc, 55, 55, 8, 14, 2, '#4f46e5');
    drawDots(doc, 60, 80, 6, 12, 1.5, '#6366f1');

    doc.fillColor('#ffffff').fontSize(36).font('Helvetica-Bold').text(label, 50, 170);
    doc.fontSize(22).fillColor('#a78bfa').font('Helvetica').text('Weekly Study Digest', 50, 215);
    drawFlourish(doc, 50, 255, 200, '#8b5cf6');

    var dw = doc.widthOfString(weekRange, { fontSize: 11 }) + 32;
    doc.roundedRect(50, 280, dw, 30, 15).fillColor('#2e1065').fill();
    doc.fillColor('#c4b5fd').fontSize(11).font('Helvetica').text(weekRange, 66, 288);

    doc.fontSize(10).fillColor('#94a3b8').text(questions.length + ' Questions \u00B7 Detailed Solutions with Shortcuts', 50, 330);
    doc.fontSize(9).fillColor('#4f46e5').text('vlymbooq.qzz.io', 50, doc.page.height - 60);
    doc.fontSize(8).fillColor('#374151').text('Premium Weekly Study Digest', 50, doc.page.height - 42);
    drawDots(doc, 50, doc.page.height - 80, 30, 6, 1.2, '#312e81');

    // ========== CONTENT ==========
    doc.addPage();
    doc.fillColor('#1e1b4b').fontSize(16).font('Helvetica-Bold').text(label, ML, 35);
    doc.fontSize(9).fillColor('#6b7280').font('Helvetica').text('Weekly Study Digest \u00B7 ' + weekRange, ML, 55);
    doc.moveTo(ML, 70).lineTo(ML + 120, 70).strokeColor('#8b5cf6').lineWidth(2).stroke();

    var y = 90;

    // ===== Topic Analysis =====
    if (analysis) {
      var aLines = analysis.split('\n');
      var aH = Math.max(aLines.length * 14 + 36, 60);
      if (y + aH > 700) { doc.addPage(); y = 40; }
      doc.roundedRect(ML, y, PW, aH, 8).fillColor('#f5f3ff').fill();
      drawAccent(doc, ML + 4, y + 8, aH - 16, '#8b5cf6');
      drawSparkle(doc, ML + 20, y + 16, 5, '#8b5cf6');
      doc.fillColor('#4c1d95').fontSize(11).font('Helvetica-Bold').text('Topic Analysis', ML + 32, y + 8);
      doc.fillColor('#374151').fontSize(9).font('Helvetica');
      var ay = y + 28;
      for (var ai = 0; ai < aLines.length; ai++) {
        var l = aLines[ai].trim();
        if (l) {
          if (l.charAt(0) === '*') { doc.circle(ML + 22, ay + 4, 2).fillColor('#8b5cf6').fill(); doc.fillColor('#374151').text(l.substring(1).trim(), ML + 32, ay, { width: PW - 60 }); }
          else { doc.text(l, ML + 22, ay, { width: PW - 50 }); }
          ay = doc.y + 3;
        }
      }
      y = ay + 20;
    }

    // ===== Quick Reference =====
    if (quickRef) {
      var qrLines = quickRef.split('\n');
      var qrH = Math.max(qrLines.length * 14 + 36, 50);
      if (y + qrH > 700) { doc.addPage(); y = 40; }
      doc.roundedRect(ML, y, PW, qrH, 8).fillColor('#fefce8').fill();
      drawAccent(doc, ML + 4, y + 8, qrH - 16, '#eab308');
      doc.fillColor('#854d0e').fontSize(11).font('Helvetica-Bold').text('\u26A1 Quick Reference', ML + 20, y + 8);
      doc.fillColor('#713f12').fontSize(9).font('Helvetica');
      var qy = y + 28;
      for (var qi2 = 0; qi2 < qrLines.length; qi2++) {
        var l = qrLines[qi2].trim();
        if (l) {
          if (l.charAt(0) === '*') { doc.circle(ML + 20, qy + 4, 2).fillColor('#eab308').fill(); doc.fillColor('#713f12').text(l.substring(1).trim(), ML + 28, qy, { width: PW - 50 }); }
          else if (l.match(/^7\.|Weekly Strategy/i)) { doc.fillColor('#854d0e').fontSize(9.5).font('Helvetica-Bold').text(l, ML + 20, qy, { width: PW - 40 }); }
          else { doc.fillColor('#713f12').text(l, ML + 20, qy, { width: PW - 40 }); }
          qy = doc.y + 3;
        }
      }
      y = qy + 20;
    }

    // ===== Questions =====
    for (var qi = 0; qi < questions.length; qi++) {
      var q = questions[qi];
      var qText = q.text || q.question || '';
      var qOptions = q.options || [];
      var qSolution = detailedSols && detailedSols[qi] ? detailedSols[qi] : (q.solution || '');
      var sectionName = q.section || (sections.length > 0 ? sections[0].name : '');
      var sectionColor = '#6366f1';
      for (var si = 0; si < sections.length; si++) { if (sections[si].name === sectionName) { sectionColor = sections[si].color || sectionColor; break; } }
      var correctLabel = '';
      for (var oi = 0; oi < qOptions.length; oi++) { if (qOptions[oi].correct) { correctLabel = qOptions[oi].label; break; } }

      // Pre-measure all heights
      var innerX = ML + 22, innerW = PW - 36;
      var pad = 14, numR = 10;
      var contentY = 0;
      var hBadge = sectionName ? 22 : 0;
      var hNum = numR * 2 + 6;
      var hQ = doc.heightOfString(qText, { width: innerW - numR * 2 - 8 });
      var hOpts = 0;
      if (qOptions.length > 0) {
        for (var oi = 0; oi < qOptions.length; oi++) hOpts += doc.heightOfString(qOptions[oi].label + '. ' + (qOptions[oi].text || ''), { width: innerW - 20 }) + 3;
        hOpts += 10;
      }
      var hAns = correctLabel ? 24 : 0;
      var hSol = qSolution ? doc.heightOfString(qSolution, { width: innerW - 28 }) + 30 : 0;
      var cardH = pad + hBadge + Math.max(hNum, hQ) + hOpts + hAns + hSol + pad + 10;

      if (y + cardH > 720) { doc.addPage(); y = 40; }

      var cardX = ML, cardY = y;

      // Draw card background
      doc.roundedRect(cardX, cardY, PW, cardH, 8).fillColor('#f8fafc').fill();
      doc.roundedRect(cardX, cardY, PW, cardH, 8).lineWidth(0.6).strokeColor('#e2e8f0').stroke();
      drawAccent(doc, cardX + 3, cardY + 6, cardH - 12, sectionColor);

      y = cardY + pad;

      // Section badge
      if (sectionName) {
        var bw = doc.widthOfString(sectionName, { fontSize: 7.5 }) + 14;
        doc.roundedRect(innerX, y, bw, 16, 4).fillColor(sectionColor).fill();
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold').text(sectionName, innerX + 7, y + 4);
        y += 22;
      }

      // Question number + text
      drawNumCircle(doc, innerX, y, qi + 1, numR, sectionColor);
      var qx = innerX + numR * 2 + 8;
      doc.fillColor('#111827').fontSize(10.5).font('Helvetica-Bold').text(qText, qx, y + 2, { width: innerW - numR * 2 - 8 });
      y = Math.max(doc.y, y + numR * 2) + 6;

      // Options
      if (qOptions.length > 0) {
        doc.fontSize(10).font('Helvetica');
        for (var oi = 0; oi < qOptions.length; oi++) {
          var opt = qOptions[oi];
          drawRadio(doc, innerX, y, opt.correct, opt.correct ? '#059669' : '#9ca3af');
          doc.fillColor(opt.correct ? '#059669' : '#4b5563').text(opt.label + '. ' + (opt.text || ''), innerX + 16, y, { width: innerW - 20 });
          y = doc.y + 2;
        }
        y += 4;
      }

      // Correct answer badge
      if (correctLabel) {
        var aw = doc.widthOfString('\u2713 Correct: ' + correctLabel, { fontSize: 8.5 }) + 20;
        doc.roundedRect(innerX, y, aw, 18, 9).fillColor('#ecfdf5').fill();
        doc.roundedRect(innerX, y, aw, 18, 9).lineWidth(0.8).strokeColor('#a7f3d0').stroke();
        doc.fillColor('#059669').fontSize(8.5).font('Helvetica-Bold').text('\u2713 Correct: ' + correctLabel, innerX + 10, y + 4);
        y += 26;
      }

      // Solution box
      if (qSolution) {
        var solH = doc.heightOfString(qSolution, { width: innerW - 28 }) + 30;
        doc.roundedRect(innerX, y, innerW, solH, 6).fillColor('#f0f9ff').fill();
        doc.roundedRect(innerX, y, innerW, solH, 6).lineWidth(0.6).strokeColor('#bae6fd').stroke();
        drawAccent(doc, innerX + 3, y + 6, solH - 12, '#38bdf8');
        doc.fillColor('#0369a1').fontSize(8).font('Helvetica-Bold').text('Detailed Solution', innerX + 14, y + 5);
        doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text(qSolution, innerX + 14, y + 18, { width: innerW - 28 });
        y = doc.y + 10;
      }

      y = cardY + cardH + 10;

      // Dotted separator
      if (qi < questions.length - 1) {
        drawDottedLine(doc, ML + 20, y, ML + PW - 20, y, '#d1d5db');
        y += 12;
      }
    }

    // ========== STUDY TIPS ==========
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fillColor('#faf5ff').fill();
    drawStar(doc, doc.page.width - 80, 80, 20, '#e9d5ff');
    drawSparkle(doc, doc.page.width - 40, 130, 6, '#c4b5fd');
    drawSparkle(doc, 70, doc.page.height - 80, 7, '#c4b5fd');
    drawDots(doc, 50, 40, 10, 12, 1.5, '#ddd6fe');

    doc.fillColor('#4c1d95').fontSize(22).font('Helvetica-Bold').text('Study Tips', 50, 60);
    drawFlourish(doc, 50, 88, 150, '#8b5cf6');
    doc.fontSize(10).fillColor('#6b7280').font('Helvetica').text('Maximize your preparation with these strategies:', 50, 110);

    var tips = [
      { icon: '\uD83D\uDCD6', title: 'Review Thoroughly', desc: 'Read each detailed solution carefully, even for questions you got right. The shortcuts and alternative methods will save you time on exam day.' },
      { icon: '\uD83D\uDD0D', title: 'Practice Similar Problems', desc: 'After reviewing, solve 2-3 similar problems on the same topic. Pattern recognition is the key to speed in competitive exams.' },
      { icon: '\u23F1\uFE0F', title: 'Master the Shortcuts', desc: 'The shortcuts in these solutions are battle-tested. Practice them until they become automatic. A 30-second shortcut can decide your rank.' },
      { icon: '\uD83D\uDCCA', title: 'Track Accuracy & Speed', desc: 'Note time per question. If a question takes >2 minutes, flag it. Review why it took long \u2014 was it the concept or the calculation?' },
      { icon: '\uD83C\uDFAF', title: 'Focus on Weak Areas', desc: 'Use the Topic Analysis to identify weak spots. Dedicate extra sessions to those topics before moving to new material.' },
      { icon: '\uD83D\uDCDD', title: 'Simulate Exam Conditions', desc: 'Take timed mock tests on vlymbooq. Real exam simulation reduces anxiety and builds the mental stamina needed for 2-3 hour papers.' }
    ];

    var ty = 140;
    for (var ti = 0; ti < tips.length; ti++) {
      var t = tips[ti];
      var tipH = 60;
      doc.roundedRect(50, ty, PW, tipH, 8).fillColor('#ffffff').fill();
      doc.roundedRect(50, ty, PW, tipH, 8).lineWidth(0.5).strokeColor('#e9d5ff').stroke();
      drawAccent(doc, 50, ty + 6, tipH - 12, '#8b5cf6');
      doc.fontSize(18).fillColor('#7c3aed').text(t.icon, 66, ty + 10);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e1b4b').text(t.title, 96, ty + 10, { width: PW - 110 });
      doc.fontSize(8.5).font('Helvetica').fillColor('#6b7280').text(t.desc, 96, ty + 28, { width: PW - 110 });
      ty += tipH + 10;
    }

    ty += 10;
    drawDottedLine(doc, 50, ty, 50 + PW, ty, '#d1d5db');
    ty += 16;
    doc.fillColor('#6b7280').fontSize(8.5).font('Helvetica').text(label + ' \u2014 vlymbooq.qzz.io \u2014 Generated ' + new Date().toDateString(), 50, ty, { align: 'center' });

    doc.end();
    stream.on('finish', function() {
      var stats = fs.statSync(filepath);
      console.log('  ' + filename + ' (' + (stats.size / 1024).toFixed(1) + ' KB \u00B7 ' + questions.length + ' Q)');
      resolve({ exam: exam, filename: filename, size: stats.size });
    });
    stream.on('error', reject);
  });
}

// ========== MAIN ==========
async function buildPDF() {
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);
  var dateStr = getDateStr();
  var weekRange = formatWeekRange();
  var apiKey = getApiKey();
  var papers = [];
  for (var i = 0; i < EXAMS.length; i++) { var p = getLatestPaper(EXAMS[i]); if (p) papers.push({ exam: EXAMS[i], paper: p }); }
  if (papers.length === 0) { console.log('No paper data found. Run generate-papers first.'); return; }
  console.log('Building weekly study digests (' + weekRange + '):');

  // Fetch topic analyses + detailed solutions
  var analyses = {};
  var quickRefs = {};
  var allSols = {};
  if (apiKey) {
    console.log('  Fetching topic analyses & detailed solutions from Gemini...');
    for (var ai = 0; ai < papers.length; ai++) {
      var exam = papers[ai].exam;
      var label = EXAM_LABELS[exam] || exam.toUpperCase();
      process.stdout.write('    ' + label + '... ');
      try {
      var text = await callGemini(apiKey,
        'You are an expert ' + label + ' tutor. Analyze these practice questions and provide a concise analysis. Use the EXACT format below with ===SECTION=== markers:\n\n' +
        '===ANALYSIS===\n' +
        '1. Topics Covered - List main topics and subtopics tested\n' +
        '2. Difficulty Breakdown - Rough percentage easy/medium/hard\n' +
        '3. Key Concepts - Most important concepts to master\n' +
        '4. Common Mistakes - Errors students commonly make\n' +
        '5. Study Tips - How to prepare\n' +
        '===QUICKREF===\n' +
        '6. Key Formulas & Shortcuts - List key formulas, time-saving shortcuts, and quick tricks relevant to these questions\n' +
        '7. Weekly Strategy - One actionable strategy to master this week\'s topics\n\n' +
        'Questions:\n' + papers[ai].paper.questions.map(function(q, i) { return (i + 1) + '. ' + (q.text || q.question || ''); }).join('\n') + '\n\n' +
        'Use plain text with bullet points (use *). Keep each section under 150 words.'
      );
      if (text) {
        var parts = text.split('===QUICKREF===');
        analyses[exam] = parts[0] ? parts[0].replace('===ANALYSIS===', '').trim() : text;
        quickRefs[exam] = parts[1] ? parts[1].replace(/^6\.\s*Key Formulas.*?\n/i, '').trim() : '';
        console.log('OK');
      } else { console.log('analysis skipped'); }
    } catch (e) { console.log('analysis unavailable (' + e.message + ')'); }

    await new Promise(function(r) { setTimeout(r, 2000); });

    process.stdout.write('      solutions... ');
    try {
      var sols = await getDetailedSolutions(apiKey, exam, papers[ai].paper.questions);
      if (sols) { allSols[exam] = sols; console.log('OK (' + Object.keys(sols).length + ' enhanced)'); }
      else { console.log('using existing solutions'); }
    } catch (e) { console.log('enhancement unavailable (' + e.message + ')'); }

      if (ai < papers.length - 1) await new Promise(function(r) { setTimeout(r, 3000); });
    }
  } else {
    console.log('  No Gemini API key found, skipping AI enhancements');
  }

  var results = [];
  for (var i = 0; i < papers.length; i++) {
    var r = await buildExamPDF(papers[i].exam, papers[i].paper, analyses[papers[i].exam], weekRange, dateStr, allSols[papers[i].exam] || null, quickRefs[papers[i].exam] || null);
    results.push(r);
  }
  var manifest = {};
  for (var i = 0; i < results.length; i++) manifest[results[i].exam] = { filename: results[i].filename, date: weekRange };
  fs.writeFileSync(path.join(pdfDir, 'latest.json'), JSON.stringify(manifest, null, 2));
  console.log('\nDone! Generated ' + results.length + ' PDF(s).');
}

buildPDF().catch(function(err) { console.error('Error:', err); process.exit(1); });