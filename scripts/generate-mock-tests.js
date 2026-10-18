var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');

var patterns = JSON.parse(fs.readFileSync(path.join(__dirname, 'exam-patterns.json'), 'utf-8'));
var questionBanks = {};
var banksDir = path.join(ROOT, 'question-bank');
fs.readdirSync(banksDir).filter(function(f){return f.endsWith('.json') && !f.endsWith('-meta.json') && f !== 'exam-patterns.json';}).forEach(function(f){
  var key = f.replace('.json','');
  questionBanks[key] = JSON.parse(fs.readFileSync(path.join(banksDir, f), 'utf-8'));
});

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function normText(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function pickQuestions(bank, sectionName, count, usedIds, seenText) {
  if (!usedIds) usedIds = {};
  if (!seenText) seenText = {};
  var aliases = sectionMappings[sectionName] || [sectionName];
  var aliasNorm = aliases.map(function(a){ return a.toLowerCase().replace(/[^a-z0-9]/g,''); });
  var matched = (bank.questions || []).filter(function(q){
    if (usedIds[q.id]) return false;
    if (!q.text || seenText[normText(q.text)]) return false;
    return aliasNorm.indexOf((q.section || '').toLowerCase().replace(/[^a-z0-9]/g,'')) !== -1;
  });
  // Fallback: fuzzy section-name containment. Questions with no section are
  // never pulled in (an empty section means "unclassified", not "any section").
  if (matched.length < count) {
    var sn = sectionName.toLowerCase().replace(/[^a-z0-9]/g,'');
    var extra = (bank.questions || []).filter(function(q){
      if (usedIds[q.id]) return false;
      if (!q.text || seenText[normText(q.text)]) return false;
      if (matched.indexOf(q) !== -1) return false;
      var qs = (q.section || '').toLowerCase().replace(/[^a-z0-9]/g,'');
      if (!qs) return false;
      return qs.indexOf(sn) !== -1 || sn.indexOf(qs) !== -1;
    });
    extra.forEach(function(q){ matched.push(q); });
  }
  // Dedupe the candidate list by normalized text (template refills can hold
  // the same question text under several ids).
  var seenLocal = {};
  matched = matched.filter(function(q){
    var nt = normText(q.text);
    if (seenLocal[nt]) return false;
    seenLocal[nt] = true;
    return true;
  });
  shuffle(matched);
  var picked = matched.slice(0, count);
  picked.forEach(function(q){ usedIds[q.id] = true; seenText[normText(q.text)] = true; });
  return picked;
}

// Map exam config section names to question bank section names
var sectionMappings = {
  'Botany': ['Biology', 'Botany'],
  'Zoology': ['Biology', 'Zoology'],
  'General Intelligence & Reasoning': ['General Intelligence & Reasoning', 'General Intelligence', 'Reasoning'],
  'General Awareness': ['General Awareness', 'General Knowledge', 'GK'],
  'Quantitative Aptitude': ['Quantitative Aptitude', 'Mathematics', 'Maths', 'Quant'],
  'English Comprehension': ['English Comprehension', 'English', 'English Language'],
  'English/Hindi': ['English'],
  'English Language': ['English', 'English Language'],
  'Reasoning Ability': ['Reasoning'],
  'General Knowledge & Awareness': ['General Knowledge'],
  'General Studies': ['General Studies', 'GS'],
  'Current Affairs': ['Current Affairs'],
  'CSAT (Qualifying)': ['CSAT', 'Logical Reasoning'],
  'Science & Technology': ['General Science', 'Science'],
  'Child Development & Pedagogy': ['Child Development & Pedagogy'],
  'Mathematics (CTET)': ['Mathematics'],
  'Environmental Studies': ['Environmental Studies'],
  'Language': ['Language', 'English']
};

// Banks that store one shared pool for several pattern sections.
var SHARED_POOLS = {
  neet: { 'Biology': ['Botany', 'Zoology'] }
};

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
}

function generateMockTest(examKey, dateOverride) {
  var pattern = patterns[examKey];
  if (!pattern) { console.log(examKey + ': no exam pattern'); return; }
  var bank = questionBanks[examKey];
  if (!bank) { console.log(examKey + ': no question bank'); return; }

  // Some banks keep one shared pool that the exam pattern splits into several
  // sections (neet stores "Biology"; the pattern wants Botany + Zoology).
  // Split it randomly for the mock so one section does not swallow the pool.
  var shared = SHARED_POOLS[examKey];
  if (shared) {
    var moved = [];
    Object.keys(shared).forEach(function (src) {
      var targets = shared[src];
      var ti = 0;
      (bank.questions || []).forEach(function (q) {
        if (q.section === src) {
          var c = JSON.parse(JSON.stringify(q));
          c.section = targets[ti % targets.length];
          ti++;
          moved.push(c);
        }
      });
    });
    if (moved.length) {
      var rest = (bank.questions || []).filter(function (q) { return !shared[q.section]; });
      bank = Object.assign({}, bank, { questions: rest.concat(moved) });
    }
  }

  var EXAM_DIR = path.join(ROOT, bank.folder || examKey);
  var MOCK_DIR = path.join(EXAM_DIR, 'mock-tests');
  if (!fs.existsSync(MOCK_DIR)) fs.mkdirSync(MOCK_DIR, {recursive:true});

  // Pick questions for each section (in-memory dedup only — mock tests can reuse questions from practice papers)
  var usedIds = {};
  var seenText = {};
  var selectedQs = [];
  var sectionCounts = {};
  pattern.sections.forEach(function(sec){
    var picked = pickQuestions(bank, sec.name, sec.count, usedIds, seenText);
    // Honest shortfall: leave a section short rather than pad it with questions
    // from other sections — a mismatched question is worse than a short mock.
    picked = picked.map(function(q){
      var c = JSON.parse(JSON.stringify(q));
      c.section = sec.name; // relabel the copy only; only mapped-section questions are picked
      return c;
    });
    sectionCounts[sec.name] = picked.length;
    selectedQs = selectedQs.concat(picked);
  });

  if (selectedQs.length < pattern.totalQuestions) {
    console.log(examKey + ': only ' + selectedQs.length + ' questions available (need ' + pattern.totalQuestions + ')');
  }

  // Generate mock test ID (dateOverride is used when refreshing existing files)
  var now = new Date();
  var dateStr = dateOverride || now.toISOString().split('T')[0];
  var mockId = 'mock-' + dateStr + '-' + examKey;

  // Per-question marks: most patterns use a number; GATE-style patterns say
  // "1 or 2". Fire a numeric approximation (the paper's average) so scoring
  // never becomes NaN.
  var pqmRaw = String(pattern.perQuestionMarks === undefined || pattern.perQuestionMarks === null ? '' : pattern.perQuestionMarks).trim();
  var pqmNum = /^\d+(\.\d+)?$/.test(pqmRaw) ? parseFloat(pqmRaw) : NaN;
  if (isNaN(pqmNum) || !isFinite(pqmNum) || pqmNum <= 0) {
    pqmNum = Math.round((pattern.totalMarks / (pattern.totalQuestions || 1)) * 100) / 100;
  }
  var mockTotalMarks = Math.round(pqmNum * selectedQs.length);

  // Build test data
  var testData = {
    examName: pattern.fullName || examKey.toUpperCase(),
    totalQuestions: selectedQs.length,
    totalMarks: mockTotalMarks,
    duration: pattern.durationMinutes,
    negativeMarking: pattern.negativeMarking || '0',
    negativeMarkingDisplay: pattern.negativeMarkingDisplay || '',
    perQuestionMarks: pqmNum,
    hasNegative: pattern.hasNegative || false,
    sections: pattern.sections.filter(function(s){ return sectionCounts[s.name] > 0; }).map(function(s){ return {name: s.name, count: sectionCounts[s.name], color: getSectionColor(s.name)}; }),
    questions: selectedQs
  };

  // Generate HTML
  var h = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
  h += '    <meta charset="UTF-8">\n';
  h += '    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n';
  h += '    <title>' + esc(testData.examName) + ' Mock Test — Free Full-Length Practice | vlymbooq</title>\n';
  h += '    <meta name="description" content="Free ' + esc(testData.examName) + ' full-length mock test with ' + selectedQs.length + ' questions, ' + pattern.durationMinutes + ' minute timer, and detailed solutions.">\n';
  h += '    <meta property="og:image" content="https://vlymbooq.qzz.io/logo.png">\n';
  h += '    <link rel="icon" type="image/svg+xml" href="../../favicon.svg">\n';
  h += '    <link rel="icon" type="image/png" href="../../logo.png">\n';
  h += '    <link rel="canonical" href="https://vlymbooq.qzz.io/' + (bank.folder || examKey) + '/mock-tests/' + mockId + '.html">\n';
  h += '    <style>\n';
  h += '        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");\n';
  h += '        *{margin:0;padding:0;box-sizing:border-box}\n';
  h += '        :root{--bg:#09090b;--bg-card:#111113;--bg-elevated:#0c0c0f;--border:rgba(255,255,255,.06);--text:#fafafa;--text-sec:#a1a1aa;--text-muted:#52525b;--emerald:#34d399;--radius:12px}\n';
  h += '        body{font-family:Inter,-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}\n';
  h += '        a{color:var(--purple,#a78bfa);text-decoration:none}\n';
  h += '        .nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}\n';
  h += '        .nav-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}\n';
  h += '        .brand{display:flex;align-items:center;gap:8px}\n';
  h += '        .brand-icon{width:28px;height:28px;border-radius:6px;flex-shrink:0}\n';
  h += '        .brand-text{font-weight:800;font-size:1.05em;background:linear-gradient(135deg,#6366f1,var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n';
  h += '        .nav-links{display:flex;gap:2px;align-items:center;flex-wrap:wrap}\n';
  h += '        .nav-links a{padding:7px 14px;border-radius:100px;font-size:.82em;font-weight:500;color:#a1a1aa;transition:all .2s;white-space:nowrap}\n';
  h += '        .nav-links a:hover{color:var(--text);background:rgba(255,255,255,.04)}\n';
  h += '        .nav-links a.active{color:var(--text);background:rgba(255,255,255,.06)}\n';
  h += '        .container{max-width:1000px;margin:0 auto;padding:24px}\n';
  h += '        .btn{padding:8px 20px;border-radius:100px;font-weight:600;font-size:.82em;border:none;cursor:pointer}\n';
  h += '        .btn-primary{background:rgba(167,139,250,.15);color:#a78bfa}\n';
  h += '        .btn-primary:hover{background:rgba(167,139,250,.25)}\n';
  h += '        .btn-success{background:rgba(52,211,153,.15);color:#34d399}\n';
  h += '        .btn-success:hover{background:rgba(52,211,153,.25)}\n';
  h += '        .btn-danger{background:rgba(239,68,68,.15);color:#ef4444}\n';
  h += '        @media print{.nav{display:none}}\n';
  h += '    </style>\n';
  h += '</head>\n<body>\n';

  // Nav
  h += '    <nav class="nav"><div class="nav-inner"><a href="../../index.html" class="brand"><img src="../../logo.png" alt="" class="brand-icon"><span class="brand-text">vlymbooq</span></a><div class="nav-links"><a href="../../index.html">Home</a><a href="../index.html">' + esc(testData.examName) + '</a><a href="../course/index.html">Course</a><a href="index.html" class="active">Mock Tests</a></div></div></nav>\n';

  // Intro screen
  h += '    <div class="container" id="mt-intro">\n';
  h += '        <div style="text-align:center;max-width:600px;margin:40px auto">\n';
  h += '            <h1 style="font-size:1.8em;font-weight:900;margin-bottom:8px">' + esc(testData.examName) + ' Mock Test</h1>\n';
  h += '            <div style="color:var(--text-sec);font-size:.9em;margin-bottom:24px;line-height:1.6">Full-length mock test with timer, section-wise navigation, and detailed solutions.</div>\n';
  h += '            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:24px">\n';
  h += '                <span style="padding:6px 14px;border-radius:100px;background:rgba(255,255,255,.06);font-size:.82em">' + testData.totalQuestions + ' Questions</span>\n';
  h += '                <span style="padding:6px 14px;border-radius:100px;background:rgba(255,255,255,.06);font-size:.82em">' + testData.totalMarks + ' Marks</span>\n';
  h += '                <span style="padding:6px 14px;border-radius:100px;background:rgba(255,255,255,.06);font-size:.82em">' + testData.duration + ' Minutes</span>\n';
  h += '                <span style="padding:6px 14px;border-radius:100px;background:rgba(255,255,255,.06);font-size:.82em">+' + testData.perQuestionMarks + ' per correct' + (testData.hasNegative ? ', -' + testData.negativeMarking + ' per wrong' : '') + '</span>\n';
  h += '            </div>\n';
  h += '            <div style="text-align:left;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:24px">\n';
  h += '                <h3 style="font-size:.9em;font-weight:700;margin-bottom:8px">Instructions</h3>\n';
  h += '                <ul style="font-size:.82em;color:var(--text-sec);line-height:2;padding-left:20px">\n';
  h += '                    <li>The test has ' + testData.sections.length + ' sections with a total of ' + testData.totalQuestions + ' questions.</li>\n';
  h += '                    <li>You have ' + testData.duration + ' minutes to complete the test.</li>\n';
  h += '                    <li>Each question carries ' + testData.perQuestionMarks + ' marks.' + (testData.hasNegative ? ' <span style="color:#ef4444">' + testData.negativeMarkingDisplay + '</span>' : '') + '</li>\n';
  h += '                    <li>You can mark questions for review and navigate between sections.</li>\n';
  h += '                    <li>The test will auto-submit when time runs out.</li>\n';
  h += '                </ul>\n';
  h += '            </div>\n';
  h += '            <div style="display:flex;gap:10px;justify-content:center">\n';
  h += '                <button onclick="startMockTest()" class="btn btn-success" style="padding:12px 32px;font-size:1em">Start Test</button>\n';
  h += '                <a href="../index.html" class="btn btn-primary" style="padding:12px 24px;font-size:.9em">&#x2190; Back</a>\n';
  h += '            </div>\n';
  h += '        </div>\n';
  h += '    </div>\n';

  // Mock test root (hidden)
  h += '    <div id="mt-root"></div>\n';

  // Data + scripts
  h += '    <script>\n';
  h += '    window._mockTestData = ' + JSON.stringify(testData) + ';\n';
  h += '    function startMockTest() {\n';
  h += '      document.getElementById("mt-intro").style.display = "none";\n';
  h += '      window._mockTest.init();\n';
  h += '    }\n';
  h += '    </script>\n';
  h += '    <script src="../../js/mock-test.js"></script>\n';

  h += '</body>\n</html>';

  var fp = path.join(MOCK_DIR, mockId + '.html');
  fs.writeFileSync(fp, h, 'utf-8');
  console.log(examKey + ': wrote ' + mockId + '.html (' + selectedQs.length + ' questions)');

  // Generate index page for mock tests
  generateMockIndex(examKey, pattern, bank);
}

function getSectionColor(name) {
  var colors = {
    'General Intelligence & Reasoning': '#a855f7',
    'General Awareness': '#60a5fa',
    'Quantitative Aptitude': '#34d399',
    'English Comprehension': '#fb923c',
    'English Language': '#fb923c',
    'Reasoning': '#a855f7',
    'Reasoning Ability': '#a855f7',
    'General Knowledge': '#f59e0b',
    'General Knowledge & Awareness': '#f59e0b',
    'Mathematics': '#34d399',
    'General Studies': '#60a5fa',
    'Current Affairs': '#f59e0b',
    'CSAT (Qualifying)': '#a78bfa',
    'English/Hindi': '#fb923c',
    'Physics': '#f87171',
    'Chemistry': '#34d399',
    'Biology': '#60a5fa',
    'General Aptitude': '#60a5fa',
    'Engineering Mathematics': '#f59e0b',
    'Child Development & Pedagogy': '#60a5fa',
    'Environmental Studies': '#34d399',
    'Language': '#a78bfa',
    'Science': '#34d399'
  };
  return colors[name] || '#a78bfa';
}

function generateMockIndex(examKey, pattern, bank) {
  var EXAM_DIR = path.join(ROOT, bank.folder || examKey);
  var MOCK_DIR = path.join(EXAM_DIR, 'mock-tests');
  if (!fs.existsSync(MOCK_DIR)) return;

  var files = fs.readdirSync(MOCK_DIR).filter(function(f){return f.endsWith('.html') && f !== 'index.html';}).sort().reverse();
  if (files.length === 0) return;

  var examName = pattern.fullName || examKey.toUpperCase();

  var h = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
  h += '    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n';
  h += '    <title>' + esc(examName) + ' Mock Tests — Free Full-Length Practice | vlymbooq</title>\n';
  h += '    <meta name="description" content="Free ' + esc(examName) + ' full-length mock tests with timer, section-wise navigation, and detailed solutions.">\n';
  h += '    <meta property="og:image" content="https://vlymbooq.qzz.io/logo.png">\n';
  h += '    <link rel="icon" type="image/svg+xml" href="../../favicon.svg">\n';
  h += '    <link rel="icon" type="image/png" href="../../logo.png">\n';
  h += '    <link rel="canonical" href="https://vlymbooq.qzz.io/' + (bank.folder || examKey) + '/mock-tests/index.html">\n';
  h += '    <style>\n';
  h += '        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");\n';
  h += '        *{margin:0;padding:0;box-sizing:border-box}\n';
  h += '        :root{--bg:#09090b;--bg-card:#111113;--bg-elevated:#0c0c0f;--border:rgba(255,255,255,.06);--text:#fafafa;--text-sec:#a1a1aa;--text-muted:#52525b;--emerald:#34d399;--radius:12px}\n';
  h += '        body{font-family:Inter,-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}\n';
  h += '        a{color:var(--purple,#a78bfa);text-decoration:none}\n';
  h += '        .nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}\n';
  h += '        .nav-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}\n';
  h += '        .brand{display:flex;align-items:center;gap:8px}\n';
  h += '        .brand-icon{width:28px;height:28px;border-radius:6px;flex-shrink:0}\n';
  h += '        .brand-text{font-weight:800;font-size:1.05em;background:linear-gradient(135deg,#6366f1,var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n';
  h += '        .nav-links{display:flex;gap:2px;align-items:center;flex-wrap:wrap}\n';
  h += '        .nav-links a{padding:7px 14px;border-radius:100px;font-size:.82em;font-weight:500;color:#a1a1aa;transition:all .2s;white-space:nowrap}\n';
  h += '        .nav-links a:hover{color:var(--text);background:rgba(255,255,255,.04)}\n';
  h += '        .nav-links a.active{color:var(--text);background:rgba(255,255,255,.06)}\n';
  h += '        .container{max-width:900px;margin:0 auto;padding:24px}\n';
  h += '        .mock-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px;margin-bottom:12px;transition:border-color .2s}\n';
  h += '        .mock-card:hover{border-color:rgba(255,255,255,.12)}\n';
  h += '        .mock-card .m-title{font-size:1em;font-weight:700;margin-bottom:4px}\n';
  h += '        .mock-card .m-meta{font-size:.8em;color:var(--text-sec);margin-bottom:8px}\n';
  h += '        .btn{padding:6px 16px;border-radius:100px;font-weight:600;font-size:.82em;border:none;cursor:pointer;display:inline-block}\n';
  h += '        .btn-success{background:rgba(52,211,153,.15);color:#34d399}\n';
  h += '        .btn-success:hover{background:rgba(52,211,153,.25)}\n';
  h += '        @media print{.nav{display:none}}\n';
  h += '    </style>\n';
  h += '</head>\n<body>\n';
  h += '    <nav class="nav"><div class="nav-inner"><a href="../../index.html" class="brand"><img src="../../logo.png" alt="" class="brand-icon"><span class="brand-text">vlymbooq</span></a><div class="nav-links"><a href="../../index.html">Home</a><a href="../index.html">' + esc(examName) + '</a><a href="../course/index.html">Course</a><a href="index.html" class="active">Mock Tests</a></div></div></nav>\n';
  h += '    <div class="container">\n';
  h += '        <h1 style="font-size:1.5em;font-weight:900;margin-bottom:4px">' + esc(examName) + ' Mock Tests</h1>\n';
  h += '        <p style="color:var(--text-sec);font-size:.85em;margin-bottom:20px">Full-length mock tests with real-time timer and detailed solutions.</p>\n';

  files.forEach(function(f){
    var name = f.replace('.html','').replace(/mock-/g,'Mock Test ').replace(/-/g,' ');
    var qCount = pattern.totalQuestions;
    try {
      var head = fs.readFileSync(path.join(MOCK_DIR, f), 'utf-8').slice(0, 1200);
      var mm = head.match(/with (\d+) questions/);
      if (mm) qCount = parseInt(mm[1], 10);
    } catch (e) {}
    h += '        <div class="mock-card">\n';
    h += '            <div class="m-title"><a href="' + f + '">' + esc(name) + '</a></div>\n';
    var pqmRaw = String(pattern.perQuestionMarks === undefined || pattern.perQuestionMarks === null ? '' : pattern.perQuestionMarks).trim();
    var pqm = /^\d+(\.\d+)?$/.test(pqmRaw) ? parseFloat(pqmRaw) : NaN;
    if (isNaN(pqm) || pqm <= 0) pqm = Math.round((pattern.totalMarks / (pattern.totalQuestions || 1)) * 100) / 100;
    h += '            <div class="m-meta">' + qCount + ' Questions &middot; ' + pattern.durationMinutes + ' min &middot; ' + Math.round(qCount * pqm) + ' Marks</div>\n';
    h += '            <a href="' + f + '" class="btn btn-success">Start Test &#x2192;</a>\n';
    h += '        </div>\n';
  });

  h += '        <div style="margin-top:24px"><a href="../index.html" class="btn btn-success" style="padding:8px 20px">&#x2190; Back to ' + esc(examName) + ' Home</a></div>\n';
  h += '    </div>\n';
  h += '</body>\n</html>';

  fs.writeFileSync(path.join(MOCK_DIR, 'index.html'), h, 'utf-8');
  console.log(examKey + ': wrote mock-tests/index.html');
}

// CLI: default writes today's mock per exam. --refresh-all rewrites every
// existing mock-*.html from the current (cleaned) bank, keeping filenames;
// --only=cgl,rbi limits the run to specific exams.
var cliArgs = process.argv.slice(2);
var refreshAll = cliArgs.indexOf('--refresh-all') !== -1;
var onlyExams = null;
cliArgs.forEach(function(a){
  var m = a.match(/^--only=(.+)$/);
  if (m) onlyExams = m[1].split(',');
});

var examKeys = Object.keys(patterns).filter(function(key){
  if (!questionBanks[key]) { console.log(key + ': skipped (no question bank)'); return false; }
  if (onlyExams && onlyExams.indexOf(key) === -1) return false;
  return true;
});

if (refreshAll) {
  examKeys.forEach(function(key){
    var bank = questionBanks[key];
    var MOCK_DIR = path.join(ROOT, bank.folder || key, 'mock-tests');
    if (!fs.existsSync(MOCK_DIR)) { console.log(key + ': no mock-tests dir'); return; }
    var dates = [];
    fs.readdirSync(MOCK_DIR).forEach(function(f){
      var m = f.match(/^mock-(\d{4}-\d{2}-\d{2})-.+\.html$/);
      if (m && dates.indexOf(m[1]) === -1) dates.push(m[1]);
    });
    if (!dates.length) { console.log(key + ': no existing mocks to refresh'); return; }
    dates.sort().forEach(function(d){ generateMockTest(key, d); });
  });
} else {
  examKeys.forEach(function(key){ generateMockTest(key); });
}

console.log('\n=== Mock tests generated ===');
