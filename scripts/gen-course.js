var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');

var configs = JSON.parse(fs.readFileSync(path.join(__dirname, 'exam-configs.json'), 'utf-8'));

var cglContent = null, cglPractice = null;
try {
  cglContent = JSON.parse(fs.readFileSync(path.join(__dirname, 'course-data.json'), 'utf-8'));
  cglPractice = JSON.parse(fs.readFileSync(path.join(__dirname, 'course-practice.json'), 'utf-8'));
} catch(e) { /* content files optional */ }

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
}

function head(exam, examDir, examName, title, desc, canonical, extra, depth) {
  depth = depth || 2;
  var p = Array(depth).fill('..').join('/');
  var h = '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n';
  h += '    <title>' + esc(title) + '</title>\n';
  h += '    <meta name="description" content="' + esc(desc) + '">\n';
  h += '    <meta property="og:image" content="https://vlymbooq.qzz.io/logo.png">\n';
  h += '    <link rel="icon" type="image/svg+xml" href="' + p + '/favicon.svg">\n';
  h += '    <link rel="icon" type="image/png" href="' + p + '/logo.png">\n';
  h += '    <link rel="canonical" href="https://vlymbooq.qzz.io/' + canonical + '">\n';
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
  h += '        .course-header{padding:24px 0;border-bottom:1px solid var(--border);margin-bottom:24px}\n';
  h += '        .course-header .badge{display:inline-flex;padding:4px 12px;border-radius:100px;background:rgba(167,139,250,.12);color:var(--purple,#a78bfa);font-size:.75em;font-weight:600;margin-bottom:8px}\n';
  h += '        .course-header h1{font-size:1.8em;font-weight:900;margin-bottom:8px;line-height:1.2}\n';
  h += '        .course-header .sub{color:var(--text-sec);font-size:.9em;line-height:1.6}\n';
  h += '        .module-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px;transition:border-color .2s}\n';
  h += '        .module-card:hover{border-color:rgba(255,255,255,.12)}\n';
  h += '        .module-card .m-title{font-size:1.1em;font-weight:700;margin-bottom:4px}\n';
  h += '        .module-card .m-desc{font-size:.85em;color:var(--text-sec);margin-bottom:10px;line-height:1.5}\n';
  h += '        .module-card .m-topics{display:flex;gap:6px;flex-wrap:wrap}\n';
  h += '        .module-card .m-topics a{padding:4px 12px;border-radius:100px;font-size:.78em;background:rgba(255,255,255,.03);border:1px solid var(--border);color:var(--text-sec);transition:all .2s}\n';
  h += '        .module-card .m-topics a:hover{background:rgba(167,139,250,.1);border-color:var(--purple,#a78bfa);color:var(--purple,#a78bfa)}\n';
  h += '        .lesson-body{padding:20px 0}\n';
  h += '        .lesson-body h2{font-size:1.3em;font-weight:700;margin:20px 0 10px}\n';
  h += '        .lesson-body h3{font-size:1.05em;font-weight:600;margin:16px 0 8px;color:var(--emerald)}\n';
  h += '        .lesson-body p{color:var(--text-sec);font-size:.9em;line-height:1.7;margin-bottom:10px}\n';
  h += '        .lesson-body ul{padding-left:20px;color:var(--text-sec);font-size:.9em;line-height:1.8;margin-bottom:12px}\n';
  h += '        .example-box{background:rgba(96,165,250,.04);border-left:3px solid var(--purple,#a78bfa);padding:14px 16px;margin:12px 0;border-radius:0 8px 8px 0}\n';
  h += '        .example-box .ex-title{font-weight:600;font-size:.85em;color:var(--pureple,#a78bfa);margin-bottom:4px}\n';
  h += '        .example-box .ex-text{font-size:.88em;color:var(--text-sec);line-height:1.6}\n';
  h += '        .example-box .ex-soln{font-size:.85em;color:var(--emerald);margin-top:6px;font-weight:500}\n';
  h += '        .tip-box{background:rgba(52,211,153,.04);border:1px solid rgba(52,211,153,.1);border-radius:var(--radius);padding:14px 16px;margin:14px 0}\n';
  h += '        .tip-box .tip-title{font-weight:600;font-size:.85em;color:var(--emerald);margin-bottom:4px}\n';
  h += '        .tip-box .tip-text{font-size:.85em;color:var(--text-sec);line-height:1.5}\n';
  h += '        .q-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:12px}\n';
  h += '        .q-card .q-text{font-size:.9em;margin-bottom:10px;line-height:1.6;font-weight:500}\n';
  h += '        .q-card .q-opts{display:grid;grid-template-columns:1fr 1fr;gap:6px}\n';
  h += '        @media(max-width:500px){.q-card .q-opts{grid-template-columns:1fr}}\n';
  h += '        .q-card .q-opt{padding:8px 12px;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:.82em;transition:all .15s}\n';
  h += '        .q-card .q-opt:hover{border-color:rgba(255,255,255,.15)}\n';
  h += '        .q-card .q-opt.correct{border-color:var(--emerald);background:rgba(52,211,153,.1)}\n';
  h += '        .q-card .q-opt.wrong{border-color:#ef4444;background:rgba(239,68,68,.1);color:#ef4444}\n';
  h += '        .q-card .q-opt.disabled{pointer-events:none;opacity:.7}\n';
  h += '        .q-card .q-soln{display:none;margin-top:8px;padding:8px;background:rgba(167,139,250,.06);border-radius:6px;font-size:.82em;color:var(--text-sec)}\n';
  h += '        .q-card .q-soln.show{display:block}\n';
  h += '        .q-card .q-soln strong{color:var(--emerald)}\n';
  h += '        .progress-bar{height:4px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;margin:12px 0}\n';
  h += '        .progress-bar .fill{height:100%;background:linear-gradient(90deg,var(--purple,#a78bfa),var(--emerald));border-radius:4px;transition:width .4s}\n';
  h += '        .sidebar-nav{position:sticky;top:72px}\n';
  h += '        .sidebar-nav a{display:block;padding:6px 10px;font-size:.82em;color:var(--text-sec);border-radius:6px;margin-bottom:2px}\n';
  h += '        .sidebar-nav a:hover,.sidebar-nav a.active{background:rgba(255,255,255,.04);color:var(--text)}\n';
  h += '        .btn{padding:8px 20px;border-radius:100px;font-weight:600;font-size:.82em;border:none;cursor:pointer}\n';
  h += '        .btn-primary{background:rgba(167,139,250,.15);color:var(--purple,#a78bfa)}\n';
  h += '        .btn-primary:hover{background:rgba(167,139,250,.25)}\n';
  h += '        .btn-success{background:rgba(52,211,153,.15);color:var(--emerald)}\n';
  h += '        .btn-success:hover{background:rgba(52,211,153,.25)}\n';
  h += '        .flex-row{display:flex;gap:24px}\n';
  h += '        .flex-row .main{flex:1;min-width:0}\n';
  h += '        .flex-row .side{width:220px;flex-shrink:0}\n';
  h += '        @media(max-width:768px){.flex-row{flex-direction:column}.flex-row .side{width:100%}}\n';
  h += '        @media print{.nav,.sidebar-nav{display:none}}\n';
  if (extra) h += extra;
  h += '    </style>\n</head>\n<body>\n';
  h += '    <nav class="nav"><div class="nav-inner"><a href="' + p + '/index.html" class="brand"><img src="' + p + '/logo.png" alt="" class="brand-icon"><span class="brand-text">vlymbooq</span></a><div class="nav-links"><a href="' + p + '/index.html">Home</a><a href="' + p + '/dashboard.html">Dashboard</a><a href="' + p + '/community.html">Community</a><a href="../index.html">' + examName + '</a><a href="index.html" class="active">Course</a></div></div></nav>\n';
  h += '    <div class="container">\n';
  return h;
}

function foot() {
  return '    </div>\n</body>\n</html>';
}

function generateAutoContent(lesson, moduleName, examKey) {
  var topics = lesson.topics.split(',').map(function(t){return t.trim()});
  var h = '<p>This lesson covers <strong>' + lesson.title + '</strong>, a key topic in ' + moduleName + ' for ' + examKey.toUpperCase() + '. Below is a structured overview of the core concepts you need to master.</p>\n';
  h += '<h3>Key Concepts Covered</h3>\n<ul>\n';
  topics.forEach(function(t){h += '  <li><strong>' + esc(t) + ':</strong> Learn the fundamental principles, formulas, and problem-solving approaches for this topic.</li>\n';});
  h += '</ul>\n';
  h += '<h3>Important Formulas & Rules</h3>\n<p>Focus on understanding the core formulas and when to apply them. Practice identifying the correct formula based on question type. Create a formula sheet for quick revision before the exam.</p>\n';
  h += '<h3>Common Question Types</h3>\n<ul>\n';
  h += '  <li>Direct application of formulas and concepts</li>\n';
  h += '  <li>Multi-step problems requiring combination of concepts</li>\n';
  h += '  <li>Data interpretation and analysis-based questions</li>\n';
  h += '</ul>\n';
  h += '<div class=\"tip-box\"><div class=\"tip-title\">Exam Strategy</div><div class=\"tip-text\">Practice topic-wise questions first, then attempt mixed sets. Focus on accuracy before speed. Review your mistakes and maintain an error log.</div></div>\n';
  return h;
}

function generateAutoQuestions(moduleKey, lesson, examKey, startId) {
  var qs = [];
  var templates = [
    {q:'What is the primary concept tested in ' + lesson.title + '?', opts:['Direct application','Conceptual understanding','Formula recall','All of the above'], ans:3},
    {q:'Which of the following best describes the approach to solve ' + lesson.title + ' problems?', opts:['Memorize all formulas','Understand concepts first','Practice only difficult questions','Skip theory'], ans:1},
    {q:'In ' + lesson.title + ', which step is most critical for accurate problem-solving?', opts:['Reading the question carefully','Using the correct formula','Performing calculations accurately','All of the above'], ans:3},
    {q:'How can you improve your speed in ' + lesson.title + ' questions?', opts:['Regular practice with timer','Solving only easy questions','Memorizing answers','Skipping calculations'], ans:0},
    {q:'What is the best strategy for attempting ' + lesson.title + ' questions in the exam?', opts:['Attempt all questions','Easy questions first, then difficult','Difficult questions first','Random order'], ans:1}
  ];
  for (var i = 0; i < templates.length; i++) {
    var t = templates[i];
    var opts = [];
    for (var j = 0; j < t.opts.length; j++) {
      opts.push({l: String.fromCharCode(97+j), t: t.opts[j], c: j === t.ans});
    }
    qs.push({id: startId + i, text: t.q, options: opts, sol: 'The correct approach is: ' + opts[t.ans].t + '. Focus on understanding core concepts and regular practice for ' + lesson.title + '.'});
  }
  return qs;
}

function generateExam(examKey) {
  var cfg = configs[examKey];
  if (!cfg) { console.log('Skipping ' + examKey + ': no config'); return; }

  var COURSE_DIR = path.join(ROOT, cfg.dir, 'course');
  if (!fs.existsSync(COURSE_DIR)) fs.mkdirSync(COURSE_DIR, {recursive:true});

  var modKeys = cfg.moduleOrder;
  var modules = cfg.modules;
  var totalLessons = 0;
  modKeys.forEach(function(mk){totalLessons += modules[mk].lessons.length;});

  // Build content/practice lookup from CGL data
  function findContent(mk, slug) {
    var key = mk + '/' + slug;
    if (cglContent && cglContent[key]) return cglContent[key];
    // Try alternate module key mappings for shared content
    var altKeys = {reasoning:'reasoning',quant:'quant',english:'english',ga:'ga',gk:'ga',maths:'quant',aptitude:'reasoning'};
    var altMk = altKeys[mk] || mk;
    if (altMk !== mk && cglContent && cglContent[altMk + '/' + slug]) return cglContent[altMk + '/' + slug];
    if (altMk !== mk && cglPractice && cglPractice[altMk + '/' + slug]) return cglPractice[altMk + '/' + slug];
    return null;
  }

  // ========== COURSE INDEX PAGE ==========
  var idx = '';
  idx += head(cfg.examName, cfg.dir, cfg.examName, cfg.metaTitle, cfg.metaDesc, cfg.canonical, null, 2);
  idx += '        <div class="course-header">\n';
  idx += '            <div class="badge">' + esc(cfg.badge) + '</div>\n';
  idx += '            <h1>' + esc(cfg.siteTitle) + '</h1>\n';
  idx += '            <div class="sub">' + esc(cfg.siteDesc) + '</div>\n';
  idx += '            <div class="progress-bar"><div class="fill" id="course-progress" style="width:0%"></div></div>\n';
  idx += '            <div style="display:flex;justify-content:space-between;font-size:.78em;color:var(--text-muted)"><span id="progress-text">0 of ' + totalLessons + ' lessons complete</span></div>\n';
  idx += '        </div>\n';

  for (var mi = 0; mi < modKeys.length; mi++) {
    var mk = modKeys[mi];
    var mod = modules[mk];
    idx += '        <div class="module-card">\n';
    idx += '            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">\n';
    idx += '                <span style="font-size:1.4em">' + mod.icon + '</span>\n';
    idx += '                <div class="m-title" style="color:' + mod.color + '">Module ' + mod.num + ': ' + esc(mod.name) + '</div>\n';
    idx += '            </div>\n';
    idx += '            <div class="m-desc">' + esc(mod.desc) + '</div>\n';
    idx += '            <div class="m-topics">\n';
    for (var li = 0; li < mod.lessons.length; li++) {
      var lesson = mod.lessons[li];
      idx += '                <a href="' + mk + '/lesson-' + lesson.slug + '.html">' + esc(lesson.title) + '</a>\n';
    }
    idx += '            </div>\n';
    idx += '        </div>\n';
  }

  idx += '        <script>\n';
  idx += '        try{var done=JSON.parse(localStorage.getItem("' + examKey + '-course-done")||"[]");document.getElementById("course-progress").style.width=(done.length/' + totalLessons + '*100)+"%";document.getElementById("progress-text").textContent=done.length+" of ' + totalLessons + ' lessons complete"}catch(e){}\n';
  idx += '        </script>\n';
  idx += '<div style="text-align:center;padding:30px 0"><a href="../index.html" class="btn btn-success">&#x2190; Back to ' + esc(cfg.examName) + ' Home</a> <a href="../../dashboard.html" class="btn btn-primary">&#x1f4ca; Dashboard</a></div>\n';
  idx += foot();
  fs.writeFileSync(path.join(COURSE_DIR, 'index.html'), idx, 'utf-8');
  console.log('[' + examKey + '] Wrote: course/index.html');

  // ========== LESSON PAGES ==========
  var globalQId = 1;
  for (var mi = 0; mi < modKeys.length; mi++) {
    var mk = modKeys[mi];
    var mod = modules[mk];
    var modDir = path.join(COURSE_DIR, mk);
    if (!fs.existsSync(modDir)) fs.mkdirSync(modDir, {recursive:true});

    var lessons = mod.lessons;
    for (var li = 0; li < lessons.length; li++) {
      var lesson = lessons[li];

      // Get content and practice (with cross-exam reuse)
      var altKeys = {reasoning:'reasoning', quant:'quant', english:'english', ga:'ga', gk:'ga', maths:'quant', aptitude:'reasoning', gs:'ga', csat:'quant', evs:'ga', language:'english', science:'ga', cdp:'ga'};
      var contentKey = mk + '/' + lesson.slug;
      var lessonContent = null;
      if (cglContent && cglContent[contentKey]) lessonContent = cglContent[contentKey];
      if (!lessonContent && altKeys[mk] && cglContent && cglContent[altKeys[mk] + '/' + lesson.slug]) lessonContent = cglContent[altKeys[mk] + '/' + lesson.slug];
      var lessonQs = [];
      if (cglPractice && cglPractice[contentKey]) {
        lessonQs = cglPractice[contentKey];
      } else if (altKeys[mk] && cglPractice && cglPractice[altKeys[mk] + '/' + lesson.slug]) {
        lessonQs = cglPractice[altKeys[mk] + '/' + lesson.slug];
      } else {
        lessonQs = generateAutoQuestions(mk, lesson, examKey, globalQId);
        globalQId += 5;
      }

      var prevL = li > 0 ? lessons[li-1] : null;
      var nextL = li < lessons.length-1 ? lessons[li+1] : null;

      var canonicalPath = cfg.dir + '/course/' + mk + '/lesson-' + lesson.slug + '.html';
      var title = lesson.title + ' — ' + cfg.examName + ' ' + mod.name + ' Lesson | vlymbooq';
      var desc = 'Free ' + cfg.examName + ' ' + mod.name + ' ' + lesson.title + ' lesson with theory, solved examples, shortcut tricks, and practice MCQs.';

      var h = head(cfg.examName, cfg.dir, cfg.examName, title, desc, canonicalPath, null, 3);

      h += '        <div class="flex-row">\n';
      h += '            <div class="side">\n';
      h += '                <div class="sidebar-nav">\n';
      h += '                    <div style="font-size:.7em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;padding-left:10px">' + esc(mod.name) + '</div>\n';
      for (var i = 0; i < lessons.length; i++) {
        h += '                    <a href="lesson-' + lessons[i].slug + '.html"' + (i === li ? ' class="active"' : '') + '>' + lessons[i].title + '</a>\n';
      }
      h += '                </div>\n';
      h += '            </div>\n';
      h += '            <div class="main">\n';

      // Header
      h += '                <div style="margin-bottom:16px">\n';
      h += '                    <div style="font-size:.75em;font-weight:600;color:var(--text-muted);margin-bottom:4px">Module ' + mod.num + ' &middot; ' + cfg.examName + ' ' + esc(mod.name) + '</div>\n';
      h += '                    <h1 style="font-size:1.5em;font-weight:900">' + esc(lesson.title) + '</h1>\n';
      h += '                    <div style="color:var(--text-sec);font-size:.85em;margin-top:4px">' + esc(lesson.desc) + '</div>\n';
      h += '                    <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">\n';
      h += '                        <span style="font-size:.75em;color:var(--text-muted)">' + lesson.topics.split(',').map(function(t){return t.trim()}).join(' · ') + '</span>\n';
      h += '                    </div>\n';
      h += '                </div>\n';

      // Lesson body
      h += '                <div class="lesson-body">\n';
      h += '                    <h3>Learning Objectives</h3>\n';
      h += '                    <ul>\n';
      h += '                        <li>Understand the fundamental concepts of ' + esc(lesson.title) + '</li>\n';
      h += '                        <li>Apply key formulas and techniques to solve problems</li>\n';
      h += '                        <li>Practice with exam-level questions to build speed and accuracy</li>\n';
      h += '                    </ul>\n';
      h += '                    <h3>Key Concepts</h3>\n';

      if (lessonContent) {
        h += lessonContent;
      } else {
        h += generateAutoContent(lesson, mod.name, examKey);
      }

      h += '                </div>\n'; // lesson-body

      // Practice Questions
      h += '                <h3 style="margin-top:24px;margin-bottom:12px;font-size:1.1em">Practice Questions</h3>\n';
      h += '                <div id="practice-qs"></div>\n';
      h += '                <div style="display:flex;gap:10px;margin-top:10px">\n';
      h += '                    <button onclick="resetPractice()" class="btn btn-primary">Reset</button>\n';
      h += '                    <button onclick="markComplete()" class="btn btn-success" id="complete-btn">Mark Lesson Complete</button>\n';
      h += '                </div>\n';

      // Navigation
      h += '                <div style="display:flex;justify-content:space-between;margin-top:30px;padding-top:16px;border-top:1px solid var(--border)">\n';
      if (prevL) h += '                    <a href="lesson-' + prevL.slug + '.html" class="btn btn-primary">&#x2190; ' + esc(prevL.title) + '</a>\n';
      else h += '                    <span></span>\n';
      if (nextL) h += '                    <a href="lesson-' + nextL.slug + '.html" class="btn btn-success">' + esc(nextL.title) + ' &#x2192;</a>\n';
      else h += '                    <a href="../index.html" class="btn btn-success">&#x2190; Course Home</a>\n';
      h += '                </div>\n';

      h += '            </div>\n';
      h += '        </div>\n';

      // Script
      var storageKey = examKey + '-course-done';
      h += '        <script>\n';
      h += '        var practiceQs = ' + JSON.stringify(lessonQs) + ';\n';
      h += '        var answered={},correctCount=0,lessonSlug="' + lesson.slug + '";\n';
      h += '        function renderPractice(){var c=document.getElementById("practice-qs"),h="";if(!practiceQs||!practiceQs.length){h="<p style=\\"color:var(--text-muted);font-size:.85em\\">Practice questions loading...</p>"}else{for(var i=0;i<practiceQs.length;i++){var q=practiceQs[i],o="";for(var j=0;j<q.options.length;j++){o+="<div class=\\"q-opt\\" data-qid=\\""+q.id+"\\" data-idx=\\""+j+"\\" onclick=\\"selectOpt("+q.id+","+j+")\\">"+q.options[j].l+". "+q.options[j].t+"</div>"}h+="<div class=\\"q-card\\" id=\\"q-"+q.id+"\\"><div class=\\"q-text\\">"+(i+1)+". "+q.text+"</div><div class=\\"q-opts\\">"+o+"</div><div class=\\"q-soln\\" id=\\"soln-"+q.id+"\\"><strong>Correct: "+getCL(q)+"</strong><br>"+q.sol+"</div><div class=\\"q-result\\" id=\\"result-"+q.id+"\\"></div></div>"}}c.innerHTML=h;updateProgress()}\n';
      h += '        function getCL(q){for(var i=0;i<q.options.length;i++){if(q.options[i].c)return q.options[i].l+". "+q.options[i].t}return""}\n';
      h += '        function selectOpt(qId,idx){if(answered[qId])return;answered[qId]=true;var q=practiceQs.filter(function(x){return x.id===qId})[0];var opts=document.querySelectorAll("#q-"+qId+" .q-opt");var cr=q.options[idx].c;for(var i=0;i<opts.length;i++)opts[i].classList.add("disabled");if(cr){opts[idx].classList.add("correct");document.getElementById("result-"+qId).textContent="\\u2713 Correct";correctCount++}else{opts[idx].classList.add("wrong");document.getElementById("result-"+qId).textContent="\\u2717 Wrong";for(var i=0;i<q.options.length;i++){if(q.options[i].c)opts[i].classList.add("correct")}}document.getElementById("soln-"+qId).classList.add("show");updateProgress()}\n';
      h += '        function updateProgress(){var t=Object.keys(answered).length;var s=document.getElementById("score-display");if(!s){s=document.createElement("div");s.id="score-display";s.style.cssText="font-size:.85em;color:var(--text-sec);margin-bottom:10px";document.getElementById("practice-qs").before(s)}s.textContent="Attempted: "+t+"/"+(practiceQs.length||0)+" | Correct: "+correctCount+" | Accuracy: "+(t>0?Math.round(correctCount/t*100):0)+"%"}\n';
      h += '        function resetPractice(){if(!confirm("Reset all answers?"))return;answered={};correctCount=0;document.querySelectorAll("#practice-qs .q-opt").forEach(function(e){e.className="q-opt"});document.querySelectorAll("#practice-qs .q-soln").forEach(function(e){e.classList.remove("show")});document.querySelectorAll("#practice-qs .q-result").forEach(function(e){e.textContent="";e.className="q-result"});var s=document.getElementById("score-display");if(s)s.textContent="";renderPractice()}\n';
      h += '        function markComplete(){try{var done=JSON.parse(localStorage.getItem("' + storageKey + '")||"[]");if(done.indexOf(lessonSlug)===-1){done.push(lessonSlug);localStorage.setItem("' + storageKey + '",JSON.stringify(done));document.getElementById("complete-btn").textContent="\\u2713 Completed!";document.getElementById("complete-btn").style.opacity="0.6"}}catch(e){alert("Progress saved locally")}}\n';
      h += '        renderPractice();\n';
      h += '        try{var done=JSON.parse(localStorage.getItem("' + storageKey + '")||"[]");if(done.indexOf(lessonSlug)!==-1){document.getElementById("complete-btn").textContent="\\u2713 Completed!";document.getElementById("complete-btn").style.opacity="0.6"}}catch(e){}\n';
      h += '        </script>\n';
      h += foot();

      var fp = path.join(modDir, 'lesson-' + lesson.slug + '.html');
      fs.writeFileSync(fp, h, 'utf-8');
      console.log('[' + examKey + '] Wrote: ' + mk + '/lesson-' + lesson.slug + '.html');
    }
  }
  console.log('[' + examKey + '] Done!');
}

// Generate for all exams
var examKeys = Object.keys(configs);
examKeys.forEach(generateExam);
console.log('\n=== All course pages generated! ===');
