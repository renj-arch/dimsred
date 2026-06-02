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

function pickQuestions(bank, sectionName, count, usedIds) {
  if (!usedIds) usedIds = {};
  var matched = (bank.questions || []).filter(function(q){
    return q.section === sectionName && !usedIds[q.id];
  });
  // Also try matching without some extra words
  if (matched.length < count) {
    var extra = (bank.questions || []).filter(function(q){
      if (usedIds[q.id]) return false;
      var sn = sectionName.toLowerCase().replace(/[^a-z0-9]/g,'');
      var qs = (q.section || '').toLowerCase().replace(/[^a-z0-9]/g,'');
      return qs.indexOf(sn) !== -1 || sn.indexOf(qs) !== -1;
    });
    extra.forEach(function(q){ if (matched.indexOf(q) === -1) matched.push(q); });
  }
  shuffle(matched);
  var picked = matched.slice(0, count);
  picked.forEach(function(q){ usedIds[q.id] = true; });
  return picked;
}

// Map exam config section names to question bank section names
var sectionMappings = {
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

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
}

function generateMockTest(examKey) {
  var pattern = patterns[examKey];
  if (!pattern) { console.log(examKey + ': no exam pattern'); return; }
  var bank = questionBanks[examKey];
  if (!bank) { console.log(examKey + ': no question bank'); return; }

  var EXAM_DIR = path.join(ROOT, bank.folder || examKey);
  var MOCK_DIR = path.join(EXAM_DIR, 'mock-tests');
  if (!fs.existsSync(MOCK_DIR)) fs.mkdirSync(MOCK_DIR, {recursive:true});

  // Pick questions for each section
  var usedIds = {};
  var selectedQs = [];
  pattern.sections.forEach(function(sec){
    var count = sec.count;
    var picked = pickQuestions(bank, sec.name, count, usedIds);
    // If not enough, pad with more from broader search
    if (picked.length < count) {
      var remaining = (bank.questions || []).filter(function(q){ return !usedIds[q.id]; });
      shuffle(remaining);
      var extra = remaining.slice(0, count - picked.length);
      extra.forEach(function(q){ usedIds[q.id] = true; });
      picked = picked.concat(extra);
    }
    // Assign section name
    picked.forEach(function(q){ q.section = sec.name; });
    selectedQs = selectedQs.concat(picked);
  });

  if (selectedQs.length < pattern.totalQuestions) {
    console.log(examKey + ': only ' + selectedQs.length + ' questions available (need ' + pattern.totalQuestions + ')');
  }

  // Generate mock test ID
  var now = new Date();
  var dateStr = now.toISOString().split('T')[0];
  var mockId = 'mock-' + dateStr + '-' + examKey;

  // Build test data
  var testData = {
    examName: pattern.fullName || examKey.toUpperCase(),
    totalQuestions: selectedQs.length,
    totalMarks: pattern.totalMarks,
    duration: pattern.durationMinutes,
    negativeMarking: pattern.negativeMarking || '0',
    negativeMarkingDisplay: pattern.negativeMarkingDisplay || '',
    perQuestionMarks: pattern.perQuestionMarks || 1,
    hasNegative: pattern.hasNegative || false,
    sections: pattern.sections.map(function(s){ return {name: s.name, count: s.count, color: getSectionColor(s.name)}; }),
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
    var parts = f.replace('.html','').split('-');
    var datePart = parts.length >= 3 ? parts[1] + '-' + parts[2] + '-' + parts[3] : '';
    h += '        <div class="mock-card">\n';
    h += '            <div class="m-title"><a href="' + f + '">' + esc(name) + '</a></div>\n';
    h += '            <div class="m-meta">' + pattern.totalQuestions + ' Questions &middot; ' + pattern.durationMinutes + ' min &middot; ' + pattern.totalMarks + ' Marks</div>\n';
    h += '            <a href="' + f + '" class="btn btn-success">Start Test &#x2192;</a>\n';
    h += '        </div>\n';
  });

  h += '        <div style="margin-top:24px"><a href="../index.html" class="btn btn-success" style="padding:8px 20px">&#x2190; Back to ' + esc(examName) + ' Home</a></div>\n';
  h += '    </div>\n';
  h += '</body>\n</html>';

  fs.writeFileSync(path.join(MOCK_DIR, 'index.html'), h, 'utf-8');
  console.log(examKey + ': wrote mock-tests/index.html');
}

// Generate for all exams with question banks
var examKeys = Object.keys(patterns);
examKeys.forEach(function(key){
  if (questionBanks[key]) {
    generateMockTest(key);
  } else {
    console.log(key + ': skipped (no question bank)');
  }
});

console.log('\n=== Mock tests generated ===');
