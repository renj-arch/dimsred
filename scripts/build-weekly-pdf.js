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
  var qText = questions.map(function(q, i) { return (i + 1) + '. ' + (q.text || q.question || ''); }).join('\n\n');
  var prompt = 'You are an expert ' + EXAM_LABELS[exam] + ' tutor. Analyze these practice questions and provide a concise analysis with:\n' +
    '1. Topics Covered - List main topics and subtopics tested\n' +
    '2. Difficulty Breakdown - Rough percentage easy/medium/hard\n' +
    '3. Key Concepts - Most important concepts to master\n' +
    '4. Common Mistakes - Errors students commonly make\n' +
    '5. Study Tips - How to prepare for these topics effectively\n\n' +
    'Questions:\n' + qText + '\n\n' +
    'Use plain text with bullet points (use *). Do NOT use markdown headers or formatting. Keep it under 300 words.';
  var body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 500 } });
  for (var attempt = 1; attempt <= 3; attempt++) {
    try {
      var resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body });
      if (!resp.ok) {
        if (resp.status === 429) { console.log('  Rate limited, waiting 5s...'); await new Promise(function(r) { setTimeout(r, 5000); }); continue; }
        console.log('  Gemini error ' + resp.status); if (attempt < 3) await new Promise(function(r) { setTimeout(r, 2000); }); continue;
      }
      var data = await resp.json();
      var text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) || '';
      return text.trim();
    } catch (e) { if (attempt < 3) await new Promise(function(r) { setTimeout(r, 2000); }); }
  }
  return null;
}

// --- Doodle & Decoration Helpers ---

function starPoints(cx, cy, R) {
  var pts = [];
  var r = R * 0.382;
  for (var i = 0; i < 5; i++) {
    var aOuter = (i * 72 - 90) * Math.PI / 180;
    var aInner = (i * 72 + 36 - 90) * Math.PI / 180;
    pts.push(cx + R * Math.cos(aOuter), cy + R * Math.sin(aOuter));
    pts.push(cx + r * Math.cos(aInner), cy + r * Math.sin(aInner));
  }
  return pts;
}

function drawStar(doc, cx, cy, R, color) {
  var pts = starPoints(cx, cy, R);
  doc.save().fillColor(color).polygon(pts).fill().restore();
}

function drawSparkle(doc, x, y, s, color) {
  doc.save();
  doc.fillColor(color);
  // Diamond sparkle: 4-pointed star
  var pts = [x, y - s, x + s * 0.3, y - s * 0.3, x + s, y, x + s * 0.3, y + s * 0.3, x, y + s, x - s * 0.3, y + s * 0.3, x - s, y, x - s * 0.3, y - s * 0.3];
  doc.polygon(pts).fill();
  doc.restore();
}

function drawDots(doc, x, y, count, spacing, r, color) {
  doc.save().fillColor(color);
  for (var i = 0; i < count; i++) { doc.circle(x + i * spacing, y, r).fill(); }
  doc.restore();
}

function drawDottedLine(doc, x1, y1, x2, y2, color) {
  doc.save();
  doc.strokeColor(color).lineWidth(0.8);
  var dx = x2 - x1, dy = y2 - y1;
  var len = Math.sqrt(dx * dx + dy * dy);
  var steps = Math.floor(len / 4);
  for (var i = 0; i <= steps; i++) {
    if (i % 2 === 0) {
      var t = i / steps, tx = x1 + dx * t, ty = y1 + dy * t;
      var t2 = (i + 1) / steps, tnx = x1 + dx * t2, tny = y1 + dy * t2;
      if (i < steps) { doc.moveTo(tx, ty).lineTo(tnx, tny).stroke(); }
    }
  }
  doc.restore();
}

function drawFlourish(doc, x, y, w, color) {
  doc.save();
  doc.strokeColor(color).lineWidth(1.2);
  var mid = x + w / 2;
  // Left line
  doc.moveTo(x, y).lineTo(mid - 10, y).stroke();
  // Right line
  doc.moveTo(mid + 10, y).lineTo(x + w, y).stroke();
  // Center diamond
  doc.fillColor(color);
  doc.polygon([mid, y - 5, mid + 5, y, mid, y + 5, mid - 5, y]).fill();
  doc.restore();
}

function drawNumberCircle(doc, x, y, num, r, color) {
  doc.save();
  doc.circle(x + r, y + r, r).fillColor(color).fill();
  doc.fillColor('#ffffff').fontSize(r * 0.9).text(String(num), x + r - doc.widthOfString(String(num)) / 2, y + r - r * 0.35);
  doc.restore();
}

function drawRadio(doc, x, y, filled, color) {
  doc.save();
  doc.circle(x + 5, y + 4, 5).lineWidth(1.2).strokeColor(color).stroke();
  if (filled) { doc.circle(x + 5, y + 4, 3).fillColor(color).fill(); }
  doc.restore();
}

function drawAccentBar(doc, x, y, h, color) {
  doc.save();
  doc.roundedRect(x, y, 4, h, 2).fillColor(color).fill();
  doc.restore();
}

// --- PDF Builder ---

function buildExamPDF(exam, paper, analysis, weekRange, dateStr) {
  return new Promise(function(resolve, reject) {
    var label = EXAM_LABELS[exam] || exam.toUpperCase();
    var filename = 'weekly-' + dateStr + '-' + exam + '.pdf';
    var filepath = path.join(pdfDir, filename);
    var questions = paper.questions || [];
    var sections = paper.sections || [];
    var pageW = 495;
    var marginL = 50;
    var contentW = pageW;

    var doc = new PDFDocument({ margin: 50, size: 'A4' });
    var stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // ===== COVER PAGE =====
    doc.rect(0, 0, doc.page.width, doc.page.height).fillColor('#0f0d1a').fill();
    // Subtle gradient overlay
    doc.rect(0, 0, doc.page.width, doc.page.height / 2).fillColor('#1a1540').fill({ opacity: 0.3 });
    // Decorative top-right cluster
    drawStar(doc, doc.page.width - 80, 90, 25, '#8b5cf6');
    drawStar(doc, doc.page.width - 40, 130, 12, '#a78bfa');
    drawSparkle(doc, doc.page.width - 120, 60, 8, '#c4b5fd');
    drawSparkle(doc, doc.page.width - 30, 50, 5, '#a78bfa');
    // Bottom-left decorations
    drawStar(doc, 80, doc.page.height - 100, 18, '#6366f1');
    drawSparkle(doc, 60, doc.page.height - 150, 6, '#818cf8');
    drawSparkle(doc, 120, doc.page.height - 80, 7, '#818cf8');
    // Dot cluster top-left
    drawDots(doc, 55, 55, 8, 14, 2, '#4f46e5');
    drawDots(doc, 60, 80, 6, 12, 1.5, '#6366f1');

    // Cover title
    doc.fillColor('#ffffff').fontSize(36).font('Helvetica-Bold');
    doc.text(label, 50, 180, { align: 'left' });
    doc.fontSize(22).fillColor('#a78bfa').font('Helvetica');
    doc.text('Weekly Study Digest', 50, 225);
    // Decorative flourish under title
    drawFlourish(doc, 50, 265, 200, '#8b5cf6');

    // Date in a pill
    var dateW = doc.widthOfString(weekRange, { fontSize: 11 }) + 32;
    doc.roundedRect(50, 290, dateW, 30, 15).fillColor('#2e1065').fill();
    doc.fillColor('#c4b5fd').fontSize(11).font('Helvetica').text(weekRange, 66, 298);

    // Stats badge
    doc.fontSize(10).fillColor('#94a3b8');
    var qCount = questions.length;
    var secNames = sections.map(function(s) { return s.name; }).join(' \u00B7 ');
    doc.text(qCount + ' Questions \u00B7 ' + (secNames || 'Mixed Topics'), 50, 340);

    // Bottom branding
    doc.fontSize(9).fillColor('#4f46e5');
    doc.text('vlymbooq.qzz.io', 50, doc.page.height - 60);
    doc.fontSize(8).fillColor('#374151');
    doc.text('Premium Weekly Study Digest', 50, doc.page.height - 42);

    // Dots footer
    drawDots(doc, 50, doc.page.height - 80, 30, 6, 1.2, '#312e81');

    // ===== CONTENT PAGES =====
    doc.addPage();

    // Page header
    doc.fillColor('#1e1b4b').fontSize(16).font('Helvetica-Bold').text(label, marginL, 35);
    doc.fontSize(9).fillColor('#6b7280').font('Helvetica').text('Weekly Study Digest \u00B7 ' + weekRange, marginL, 55);
    doc.moveTo(marginL, 70).lineTo(marginL + 120, 70).strokeColor('#8b5cf6').lineWidth(2).stroke();

    var y = 90;

    // ===== Topic Analysis =====
    if (analysis) {
      var aLines = analysis.split('\n');
      var aHeight = Math.max(aLines.length * 14 + 36, 60);
      if (y + aHeight > 700) { doc.addPage(); y = 40; }

      // Analysis card
      doc.roundedRect(marginL, y, contentW, aHeight, 8).fillColor('#f5f3ff').fill();
      // Left accent
      drawAccentBar(doc, marginL + 4, y + 8, aHeight - 16, '#8b5cf6');
      // Header
      drawSparkle(doc, marginL + 20, y + 16, 5, '#8b5cf6');
      doc.fillColor('#4c1d95').fontSize(11).font('Helvetica-Bold').text('Topic Analysis', marginL + 32, y + 8);

      doc.fillColor('#374151').fontSize(9).font('Helvetica');
      var ay = y + 28;
      for (var ai = 0; ai < aLines.length; ai++) {
        var line = aLines[ai].trim();
        if (line) {
          if (line.charAt(0) === '*') {
            doc.circle(marginL + 22, ay + 4, 2).fillColor('#8b5cf6').fill();
            doc.fillColor('#374151').text(line.substring(1).trim(), marginL + 32, ay, { width: contentW - 60 });
          } else {
            doc.text(line, marginL + 22, ay, { width: contentW - 50 });
          }
          ay = doc.y + 3;
        }
      }
      y = ay + 20;
    }

    // ===== Questions =====
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

      // Estimate card height (rough)
      var estH = 80 + (qOptions.length * 16) + (qSolution ? 60 : 0);
      if (y + estH > 720) { doc.addPage(); y = 40; }

      var cardX = marginL;
      var cardY = y;
      var cardW = contentW;
      var cardPad = 14;

      // Card background
      doc.roundedRect(cardX, cardY, cardW, 10, 8).fillColor('#fafafa').fill(); // placeholder, actual height unknown
      // Actual card: we need to draw after we know the height. Use two-pass.

      // --- First pass: measure content height ---
      // We'll use doc.y tracking for the actual height
      var innerX = cardX + cardPad + 8; // +8 for accent bar
      var innerW = cardW - cardPad * 2 - 12;

      // Save state, calculate height by writing to a scratch approach
      // Actually, just use a pre-draw then re-draw approach
      var contentStartY = cardY + cardPad;

      // Draw card (will be re-drawn after we know final height)
      // We'll just draw now and track y properly

      // Card background (light)
      doc.roundedRect(cardX, cardY, cardW, 10, 8).fillColor('#f8fafc').fill();
      // We'll track the height and re-draw
      // Actually, let's use the stroke approach - fill first, track height, then adjust

      // Accent bar
      drawAccentBar(doc, cardX + 4, cardY + 8, 10, sectionColor);

      // Section badge (if different from previous)
      if (sectionName) {
        var bw = doc.widthOfString(sectionName, { fontSize: 7.5 }) + 14;
        doc.roundedRect(innerX, contentStartY, bw, 16, 4).fillColor(sectionColor).fill();
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold').text(sectionName, innerX + 7, contentStartY + 4);
        y = contentStartY + 22;
      } else {
        y = contentStartY + 4;
      }

      // Question number badge + text
      var numR = 10;
      drawNumberCircle(doc, innerX, y, qi + 1, numR, sectionColor);

      doc.fillColor('#111827').fontSize(10.5).font('Helvetica-Bold');
      // Question text next to badge
      var qX = innerX + numR * 2 + 8;
      doc.text(qText, qX, y + 2, { width: innerW - numR * 2 - 8 });
      y = Math.max(doc.y, y + numR * 2) + 6;

      // Options
      if (qOptions.length > 0) {
        doc.fontSize(10).font('Helvetica');
        for (var oi = 0; oi < qOptions.length; oi++) {
          var opt = qOptions[oi];
          var isCorrect = opt.correct;
          drawRadio(doc, innerX, y, isCorrect, isCorrect ? '#059669' : '#9ca3af');
          doc.fillColor(isCorrect ? '#059669' : '#4b5563');
          doc.text(opt.label + '. ' + (opt.text || ''), innerX + 16, y, { width: innerW - 20 });
          y = doc.y + 2;
        }
        y += 4;
      }

      // Correct answer badge
      if (correctLabel) {
        var ansW = doc.widthOfString('\u2713 Correct: ' + correctLabel, { fontSize: 8.5 }) + 20;
        doc.roundedRect(innerX, y, ansW, 18, 9).fillColor('#ecfdf5').fill();
        doc.roundedRect(innerX, y, ansW, 18, 9).lineWidth(0.8).strokeColor('#a7f3d0').stroke();
        doc.fillColor('#059669').fontSize(8.5).font('Helvetica-Bold');
        doc.text('\u2713 Correct: ' + correctLabel, innerX + 10, y + 4);
        y += 28;
      }

      // Solution box
      if (qSolution) {
        var solLines = qSolution.split('\n');
        var solH = Math.max(solLines.length * 14 + 20, 36);
        doc.roundedRect(innerX, y, innerW, solH, 6).fillColor('#f0f9ff').fill();
        doc.roundedRect(innerX, y, innerW, solH, 6).lineWidth(0.6).strokeColor('#bae6fd').stroke();
        drawAccentBar(doc, innerX + 3, y + 6, solH - 12, '#38bdf8');
        doc.fillColor('#0369a1').fontSize(8).font('Helvetica-Bold');
        var solLabelW = doc.widthOfString('Solution');
        doc.text('Solution', innerX + 14, y + 5);
        doc.fillColor('#475569').fontSize(8.5).font('Helvetica');
        doc.text(qSolution, innerX + 14, y + 18, { width: innerW - 28 });
        y = doc.y + 10;
      }

      y += 8;

      // Now re-draw the card with the correct height
      var cardH = y - cardY;
      // Fill card
      doc.roundedRect(cardX, cardY, cardW, cardH, 8).fillColor('#f8fafc').fill();
      // Card border
      doc.roundedRect(cardX, cardY, cardW, cardH, 8).lineWidth(0.6).strokeColor('#e2e8f0').stroke();
      // Left accent bar (full height)
      doc.roundedRect(cardX + 3, cardY + 6, 3, cardH - 12, 1.5).fillColor(sectionColor).fill();

      // Re-draw all content (overlay on the card background)
      // Section badge
      if (sectionName) {
        var bw = doc.widthOfString(sectionName, { fontSize: 7.5 }) + 14;
        doc.roundedRect(innerX, contentStartY, bw, 16, 4).fillColor(sectionColor).fill();
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold').text(sectionName, innerX + 7, contentStartY + 4);
      }

      // Question number
      var qNumY = sectionName ? contentStartY + 22 : contentStartY + 4;
      drawNumberCircle(doc, innerX, qNumY, qi + 1, numR, sectionColor);
      doc.fillColor('#111827').fontSize(10.5).font('Helvetica-Bold');
      doc.text(qText, qX, qNumY + 2, { width: innerW - numR * 2 - 8 });

      // Options
      var optY = Math.max(doc.y, qNumY + numR * 2) + 6;
      if (qOptions.length > 0) {
        doc.fontSize(10).font('Helvetica');
        for (var oi = 0; oi < qOptions.length; oi++) {
          var opt = qOptions[oi];
          drawRadio(doc, innerX, optY, opt.correct, opt.correct ? '#059669' : '#9ca3af');
          doc.fillColor(opt.correct ? '#059669' : '#4b5563');
          doc.text(opt.label + '. ' + (opt.text || ''), innerX + 16, optY, { width: innerW - 20 });
          optY = doc.y + 2;
        }
        optY += 4;
      }

      // Correct answer
      if (correctLabel) {
        var ansW = doc.widthOfString('\u2713 Correct: ' + correctLabel, { fontSize: 8.5 }) + 20;
        doc.roundedRect(innerX, optY, ansW, 18, 9).fillColor('#ecfdf5').fill();
        doc.roundedRect(innerX, optY, ansW, 18, 9).lineWidth(0.8).strokeColor('#a7f3d0').stroke();
        doc.fillColor('#059669').fontSize(8.5).font('Helvetica-Bold');
        doc.text('\u2713 Correct: ' + correctLabel, innerX + 10, optY + 4);
        optY += 28;
      }

      // Solution
      if (qSolution) {
        var solLines2 = qSolution.split('\n');
        var solH2 = Math.max(solLines2.length * 14 + 20, 36);
        doc.roundedRect(innerX, optY, innerW, solH2, 6).fillColor('#f0f9ff').fill();
        doc.roundedRect(innerX, optY, innerW, solH2, 6).lineWidth(0.6).strokeColor('#bae6fd').stroke();
        drawAccentBar(doc, innerX + 3, optY + 6, solH2 - 12, '#38bdf8');
        doc.fillColor('#0369a1').fontSize(8).font('Helvetica-Bold').text('Solution', innerX + 14, optY + 5);
        doc.fillColor('#475569').fontSize(8.5).font('Helvetica');
        doc.text(qSolution, innerX + 14, optY + 18, { width: innerW - 28 });
        optY = doc.y + 10;
      }

      y = cardY + cardH + 10;

      // Dotted separator
      if (qi < questions.length - 1) {
        drawDottedLine(doc, marginL + 20, y, marginL + contentW - 20, y, '#d1d5db');
        y += 14;
      }
    }

    // ===== CLOSING PAGE: Study Tips =====
    doc.addPage();

    // Background decoration
    doc.rect(0, 0, doc.page.width, doc.page.height).fillColor('#faf5ff').fill();
    drawStar(doc, doc.page.width - 80, 80, 20, '#e9d5ff');
    drawSparkle(doc, doc.page.width - 40, 130, 6, '#c4b5fd');
    drawSparkle(doc, 70, doc.page.height - 80, 7, '#c4b5fd');
    drawDots(doc, 50, 40, 10, 12, 1.5, '#ddd6fe');

    // Header
    doc.fillColor('#4c1d95').fontSize(22).font('Helvetica-Bold').text('Study Tips', 50, 60);
    drawFlourish(doc, 50, 88, 150, '#8b5cf6');

    doc.fontSize(10).fillColor('#6b7280').font('Helvetica');
    doc.text('Maximize your learning with these strategies:', 50, 110);

    var tips = [
      { icon: '\uD83D\uDCD6', title: 'Review Thoroughly', desc: 'Read every solution carefully, even for questions you answered correctly. Understanding why the wrong options are incorrect is just as important.' },
      { icon: '\uD83D\uDD0D', title: 'Practice Similar Problems', desc: 'After reviewing, find 2-3 similar problems on the same topic and solve them. Repetition builds neural pathways for recall during exams.' },
      { icon: '\u23F1\uFE0F', title: 'Track Your Time', desc: 'Note how long each question takes you. If a question takes more than 2 minutes, flag it and move on. Speed comes with practice.' },
      { icon: '\uD83D\uDCCA', title: 'Measure Progress', desc: 'Keep a weekly accuracy log. Compare your scores across weeks. A rising trend means your preparation is on track.' },
      { icon: '\uD83C\uDFAF', title: 'Focus on Weak Areas', desc: 'Use the Topic Analysis section to identify which areas need more attention. Dedicate extra practice time to those topics.' },
      { icon: '\uD83D\uDCDD', title: 'Mock Tests', desc: 'Take the online timed mock tests on vlymbooq. Simulating exam conditions reduces anxiety and improves time management.' }
    ];

    var ty = 145;
    for (var ti = 0; ti < tips.length; ti++) {
      var t = tips[ti];
      // Tip card
      var tipH = 65;
      doc.roundedRect(50, ty, contentW, tipH, 8).fillColor('#ffffff').fill();
      doc.roundedRect(50, ty, contentW, tipH, 8).lineWidth(0.5).strokeColor('#e9d5ff').stroke();
      drawAccentBar(doc, 50, ty + 6, tipH - 12, '#8b5cf6');

      doc.fontSize(20).fillColor('#7c3aed');
      doc.text(t.icon, 68, ty + 10);

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e1b4b');
      doc.text(t.title, 100, ty + 10, { width: contentW - 120 });

      doc.fontSize(8.5).font('Helvetica').fillColor('#6b7280');
      doc.text(t.desc, 100, ty + 28, { width: contentW - 120 });

      ty += tipH + 10;
    }

    // Footer
    ty += 15;
    drawDottedLine(doc, 50, ty, 50 + contentW, ty, '#d1d5db');
    ty += 18;
    doc.fillColor('#6b7280').fontSize(8.5).font('Helvetica');
    doc.text(label + ' \u2014 vlymbooq.qzz.io \u2014 Generated ' + new Date().toDateString(), 50, ty, { align: 'center' });

    doc.end();

    stream.on('finish', function() {
      var stats = fs.statSync(filepath);
      console.log('  ' + filename + ' (' + (stats.size / 1024).toFixed(1) + ' KB \u00B7 ' + questions.length + ' Q)');
      resolve({ exam: exam, filename: filename, size: stats.size });
    });
    stream.on('error', reject);
  });
}

// ===== Main =====

async function buildPDF() {
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);
  var dateStr = getDateStr();
  var weekRange = formatWeekRange();
  var apiKey = getApiKey();
  var papers = [];
  for (var i = 0; i < EXAMS.length; i++) { var p = getLatestPaper(EXAMS[i]); if (p) papers.push({ exam: EXAMS[i], paper: p }); }
  if (papers.length === 0) { console.log('No paper data found. Run generate-papers first.'); return; }
  console.log('Building weekly study digests (' + weekRange + '):');
  var analyses = {};
  if (apiKey) {
    console.log('  Fetching topic analyses from Gemini...');
    for (var ai = 0; ai < papers.length; ai++) {
      var exam = papers[ai].exam;
      var label = EXAM_LABELS[exam] || exam.toUpperCase();
      process.stdout.write('    ' + label + '... ');
      var text = await getTopicAnalysis(apiKey, exam, papers[ai].paper.questions);
      if (text) { analyses[exam] = text; console.log('OK'); } else { console.log('skipped'); }
      if (ai < papers.length - 1) await new Promise(function(r) { setTimeout(r, 3000); });
    }
  } else { console.log('  No Gemini API key found, skipping topic analyses'); }
  var results = [];
  for (var i = 0; i < papers.length; i++) {
    var r = await buildExamPDF(papers[i].exam, papers[i].paper, analyses[papers[i].exam], weekRange, dateStr);
    results.push(r);
  }
  var manifest = {};
  for (var i = 0; i < results.length; i++) { manifest[results[i].exam] = { filename: results[i].filename, date: weekRange }; }
  fs.writeFileSync(path.join(pdfDir, 'latest.json'), JSON.stringify(manifest, null, 2));
  console.log('\nDone! Generated ' + results.length + ' PDF(s).');
}

buildPDF().catch(function(err) { console.error('Error:', err); process.exit(1); });