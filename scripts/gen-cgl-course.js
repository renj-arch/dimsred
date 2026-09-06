const fs = require('fs');
const path = require('path');

var ROOT = path.resolve(__dirname, '..');
var CGL_COURSE = path.join(ROOT, 'cgl', 'course');
var REASONING = path.join(CGL_COURSE, 'reasoning');

// Ensure directories exist
[CGL_COURSE, REASONING].forEach(function(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive:true}); });

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
}

// ========== MODULE DATA ==========
var modules = {
  reasoning: {
    name: 'General Intelligence & Reasoning',
    num: 1,
    icon: '🧠',
    color: '#60a5fa',
    desc: 'Master all 8 reasoning topics tested in SSC CGL Tier 1. Each lesson includes theory, solved examples, and practice MCQs.',
    lessons: [
      { slug:'analogy', title:'Analogy', desc:'Understand word, letter, and number analogies with shortcut techniques.', topics:'Types of Analogies, Relationship Mapping, Letter/Number Patterns' },
      { slug:'coding-decoding', title:'Coding — Decoding', desc:'Learn letter shifting, number coding, substitution ciphers, and symbol coding.', topics:'Letter Coding, Number Coding, Substitution, Symbol Coding' },
      { slug:'syllogism', title:'Syllogism', desc:'Master Venn diagram approach and conclusion-based reasoning for all statement types.', topics:'All-No-Some Statements, Venn Diagrams, Either-Or Cases' },
      { slug:'blood-relation', title:'Blood Relations', desc:'Solve family tree problems using generation mapping and coded relations.', topics:'Family Trees, Coded Relations, Generation Gap Calculation' },
      { slug:'direction-distance', title:'Direction & Distance', desc:'Plot paths and calculate displacements using cardinal directions.', topics:'Cardinal Directions, Path Plotting, Displacement, Shadow Problems' },
      { slug:'series', title:'Number & Alphabet Series', desc:'Identify patterns in numerical and alphabetical sequences.', topics:'Number Patterns, Alphabet Series, Mixed Series, Missing Terms' },
      { slug:'puzzles', title:'Puzzles & Seating Arrangement', desc:'Solve linear, circular, and grid-based puzzles with step-by-step logic.', topics:'Linear Arrangement, Circular Arrangement, Comparison Puzzles' },
      { slug:'calendar-clock', title:'Calendar & Clock', desc:'Calculate weekdays, angles, and time using modular arithmetic.', topics:'Odd Days, Leap Years, Angle Between Hands, Mirror Images' }
    ]
  },
  quant: {
    name: 'Quantitative Aptitude',
    num: 2,
    icon: '📐',
    color: '#34d399',
    desc: 'Master all 10 quantitative topics for SSC CGL Tier 1 with concept clarity and speed techniques.',
    lessons: [
      { slug:'number-system', title:'Number System', desc:'Divisibility rules, LCM-HCF, remainder theorem, and digit patterns.', topics:'Divisibility, LCM & HCF, Remainder Theorem, Cyclicity' },
      { slug:'percentage', title:'Percentage', desc:'Percentage change, successive percentages, profit-loss percentage.', topics:'Basic %, Successive Change, Election/Vote Problems' },
      { slug:'profit-loss', title:'Profit, Loss & Discount', desc:'Marked price, discounts, successive discounts, and false weight problems.', topics:'CP/SP, Markup & Discount, Successive Discount, False Weight' },
      { slug:'time-work', title:'Time & Work', desc:'Work efficiency, pipes & cisterns, alternate day work, and wages.', topics:'Efficiency, Pipes & Cisterns, Wages, Alternating Work' },
      { slug:'speed-distance', title:'Speed, Distance & Time', desc:'Relative speed, trains, boats & streams, average speed.', topics:'Relative Speed, Trains, Boats & Streams, Average Speed' },
      { slug:'simple-interest', title:'Simple & Compound Interest', desc:'SI, CI, installment problems, and interest rate comparisons.', topics:'Simple Interest, Compound Interest, Installments, Rate Comparison' },
      { slug:'ratio-proportion', title:'Ratio, Proportion & Mixture', desc:'Direct/indirect proportion, mixtures, alligation, and partnership.', topics:'Ratio, Mixture & Alligation, Partnership, Coin Problems' },
      { slug:'mensuration', title:'Mensuration', desc:'Area, volume, surface area of 2D and 3D shapes.', topics:'Triangles, Circles, Cylinders, Cones, Spheres, Prisms' },
      { slug:'algebra', title:'Algebra', desc:'Linear equations, quadratic equations, polynomials, and identities.', topics:'Linear Equations, Quadratics, Polynomials, Factorization' },
      { slug:'geometry-trigo', title:'Geometry & Trigonometry', desc:'Lines, angles, triangles, circles, trigonometric ratios, heights & distances.', topics:'Lines & Angles, Triangles, Circles, sin/cos/tan, Height & Distance' }
    ]
  },
  ga: {
    name: 'General Awareness',
    num: 3,
    icon: '🌍',
    color: '#f59e0b',
    desc: 'Cover all static GK and current affairs topics tested in SSC CGL General Awareness section.',
    lessons: [
      { slug:'indian-history', title:'Indian History', desc:'Ancient, medieval, and modern Indian history with important events and personalities.', topics:'Indus Valley, Vedic Period, Maurya, Mughal, British Rule, Freedom Struggle' },
      { slug:'indian-polity', title:'Indian Polity', desc:'Constitution, parliament, judiciary, fundamental rights, and governance.', topics:'Constitution, Parliament, Supreme Court, Fundamental Rights, Amendments' },
      { slug:'indian-geography', title:'Indian Geography', desc:'Physical, political, and economic geography of India.', topics:'Rivers, Mountains, Climate, Agriculture, Minerals, States & Capitals' },
      { slug:'indian-economy', title:'Indian Economy', desc:'GDP, inflation, banking, budget, five-year plans, and economic reforms.', topics:'GDP/GNP, Inflation, RBI, Budget, Planning Commission, Reforms' },
      { slug:'general-science', title:'General Science', desc:'Basic physics, chemistry, and biology concepts for competitive exams.', topics:'Physics Laws, Chemical Compounds, Human Body, Vitamins, Diseases' },
      { slug:'current-affairs', title:'Current Affairs', desc:'Important national and international events, awards, sports, and appointments.', topics:'National Events, International Summits, Awards, Sports, Appointments' }
    ]
  },
  english: {
    name: 'English Comprehension',
    num: 4,
    icon: '📝',
    color: '#a78bfa',
    desc: 'Improve grammar, vocabulary, reading comprehension, and verbal ability for SSC CGL English.',
    lessons: [
      { slug:'grammar-basics', title:'Grammar Basics', desc:'Parts of speech, tenses, subject-verb agreement, articles, and conjunctions.', topics:'Nouns/Verbs, Tenses, Subject-Verb Agreement, Articles, Prepositions' },
      { slug:'vocabulary', title:'Vocabulary & Word Power', desc:'Synonyms, antonyms, one-word substitutions, idioms and phrases.', topics:'Synonyms & Antonyms, One-Word Substitutions, Idioms, Phrasal Verbs' },
      { slug:'sentence-correction', title:'Sentence Correction & Para Jumbles', desc:'Spotting errors, improving sentences, rearranging paragraphs.', topics:'Error Detection, Sentence Improvement, Para Jumbles' },
      { slug:'comprehension', title:'Reading Comprehension', desc:'Strategies to solve RC passages quickly and accurately.', topics:'Passage Reading, Inference Questions, Vocabulary in Context' },
      { slug:'active-passive', title:'Active-Passive & Direct-Indirect', desc:'Transformation of sentences between active/passive voice and direct/indirect speech.', topics:'Active to Passive, Direct to Indirect, Tense Change Rules' },
      { slug:'filler-cloze', title:'Fillers & Cloze Test', desc:'Fill in the blanks, cloze tests, and phrase replacement.', topics:'Single Fillers, Double Fillers, Cloze Test, Phrase Replacement' }
    ]
  }
};

// ========== TEMPLATES ==========

function head(title, desc, canonical, extra) {
  var h = '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n';
  h += '    <title>' + esc(title) + '</title>\n';
  h += '    <meta name="description" content="' + esc(desc) + '">\n';
  h += '    <meta property="og:image" content="https://vlymbooq.qzz.io/logo.png">\n';
  h += '    <link rel="icon" type="image/svg+xml" href="../../favicon.svg">\n';
  h += '    <link rel="icon" type="image/png" href="../../logo.png">\n';
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
  h += '        .diagram-box{background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin:16px 0;text-align:center}\n';
  h += '        .diagram-box svg{max-width:100%;height:auto}\n';
  h += '        .diagram-box .diagram-caption{font-size:.78em;color:var(--text-muted);margin-top:8px}\n';
  h += '        .download-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:100px;font-weight:600;font-size:.82em;border:1px solid var(--border);cursor:pointer;background:var(--bg-card);color:var(--text-sec);transition:all .2s}\n';
  h += '        .download-btn:hover{background:rgba(255,255,255,.06);color:var(--text)}\n';
  h += '        @media print{.nav,.sidebar-nav,.download-btn{display:none!important}.container{padding:0}.lesson-body h3{break-after:avoid}.q-card{break-inside:avoid}.q-card .q-soln{display:block!important}.q-card .q-opt.disabled{opacity:1}.q-card .q-opt.correct{border-color:#34d399}.q-card .q-result{display:none}}\n';
  if (extra) h += extra;
  h += '    </style>\n</head>\n<body>\n';
  h += '    <nav class="nav"><div class="nav-inner"><a href="../../index.html" class="brand"><img src="../../logo.png" alt="" class="brand-icon"><span class="brand-text">vlymbooq</span></a><div class="nav-links"><a href="../../index.html">Home</a><a href="../../dashboard.html">Dashboard</a><a href="../../community.html">Community</a><a href="../index.html">CGL</a><a href="index.html" class="active">Course</a></div></div></nav>\n';
  h += '    <div class="container">\n';
  return h;
}

function foot() {
  return '    </div>\n</body>\n</html>';
}

// ========== COURSE INDEX PAGE ==========
var modKeys = ['reasoning','quant','ga','english'];
var courseIndex = '';

courseIndex += head('SSC CGL Full Course — Free Complete Study Material | vlymbooq',
  'Complete SSC CGL free study course covering all 4 Tier 1 sections: Reasoning, Quant, General Awareness, and English. Topic-wise lessons with theory, examples, and practice.',
  'cgl/course/index.html');

courseIndex += '        <div class="course-header">\n';
courseIndex += '            <div class="badge">SSC CGL Tier 1 · Free Full Course</div>\n';
courseIndex += '            <h1>SSC CGL Full Course — Complete Study Material</h1>\n';
courseIndex += '            <div class="sub">4 modules covering all Tier 1 sections. Each topic has detailed theory, solved examples, shortcut techniques, and practice MCQs. Designed for self-study — no signup required.</div>\n';
courseIndex += '            <div class="progress-bar"><div class="fill" id="course-progress" style="width:0%"></div></div>\n';
courseIndex += '            <div style="display:flex;justify-content:space-between;font-size:.78em;color:var(--text-muted)"><span id="progress-text">0 of ' + modKeys.reduce(function(s,k){return s+modules[k].lessons.length},0) + ' lessons complete</span></div>\n';
courseIndex += '        </div>\n';

for (var mi = 0; mi < modKeys.length; mi++) {
  var mk = modKeys[mi];
  var mod = modules[mk];
  courseIndex += '        <div class="module-card">\n';
  courseIndex += '            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">\n';
  courseIndex += '                <span style="font-size:1.4em">' + mod.icon + '</span>\n';
  courseIndex += '                <div class="m-title" style="color:' + mod.color + '">Module ' + mod.num + ': ' + esc(mod.name) + '</div>\n';
  courseIndex += '            </div>\n';
  courseIndex += '            <div class="m-desc">' + esc(mod.desc) + '</div>\n';
  courseIndex += '            <div class="m-topics">\n';
  for (var li = 0; li < mod.lessons.length; li++) {
    var lesson = mod.lessons[li];
    courseIndex += '                <a href="' + mk + '/lesson-' + lesson.slug + '.html">' + esc(lesson.title) + '</a>\n';
  }
  courseIndex += '            </div>\n';
  courseIndex += '        </div>\n';
}

courseIndex += '        <script>\n';
courseIndex += '        try{var done=JSON.parse(localStorage.getItem("cgl-course-done")||"[]");document.getElementById("course-progress").style.width=(done.length/' + modKeys.reduce(function(s,k){return s+modules[k].lessons.length},0) + '*100)+"%";document.getElementById("progress-text").textContent=done.length+" of ' + modKeys.reduce(function(s,k){return s+modules[k].lessons.length},0) + ' lessons complete"}catch(e){}\n';
courseIndex += '        </script>\n';
courseIndex += '<div style="text-align:center;padding:30px 0"><a href="../index.html" class="btn btn-success">&#x2190; Back to CGL Home</a> <a href="../../dashboard.html" class="btn btn-primary">&#x1f4ca; Dashboard</a></div>\n';
courseIndex += foot();
fs.writeFileSync(path.join(CGL_COURSE, 'index.html'), courseIndex, 'utf-8');
console.log('Wrote: course/index.html');

// ========== LESSON GENERATOR ==========
function genLesson(moduleKey, lesson, lessonIndex, moduleLessons) {
  var mod = modules[moduleKey];
  var dir = path.join(CGL_COURSE, moduleKey);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});

  var qNum = 5;
  var lessonQs = lesson.practice || [];
  // If no practice questions defined, generate placeholder ones
  // We'll store them in lesson data above instead

  var prevL = lessonIndex > 0 ? moduleLessons[lessonIndex-1] : null;
  var nextL = lessonIndex < moduleLessons.length-1 ? moduleLessons[lessonIndex+1] : null;

  var h = head(lesson.title + ' — SSC CGL ' + mod.name + ' Lesson | vlymbooq',
    'Free SSC CGL ' + mod.name + ' ' + lesson.title + ' lesson with theory, solved examples, shortcut tricks, and practice MCQs.',
    'cgl/course/' + moduleKey + '/lesson-' + lesson.slug + '.html');

  h += '        <div class="flex-row">\n';
  h += '            <div class="side">\n';
  h += '                <div class="sidebar-nav">\n';
  h += '                    <div style="font-size:.7em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;padding-left:10px">' + esc(mod.name) + '</div>\n';
  for (var i = 0; i < moduleLessons.length; i++) {
    var active = i === lessonIndex;
    h += '                    <a href="lesson-' + moduleLessons[i].slug + '.html"' + (active ? ' class="active"' : '') + '>' + moduleLessons[i].title + '</a>\n';
  }
  h += '                </div>\n';
  h += '            </div>\n';
  h += '            <div class="main">\n';

  // Header
  h += '                <div style="margin-bottom:16px">\n';
  h += '                    <div style="font-size:.75em;font-weight:600;color:var(--text-muted);margin-bottom:4px">Module ' + mod.num + ' &middot; SSC CGL ' + esc(mod.name) + '</div>\n';
  h += '                    <h1 style="font-size:1.5em;font-weight:900">' + esc(lesson.title) + '</h1>\n';
  h += '                    <div style="color:var(--text-sec);font-size:.85em;margin-top:4px">' + esc(lesson.desc) + '</div>\n';
  h += '                    <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">\n';
  h += '                        <span style="font-size:.75em;color:var(--text-muted)">' + lesson.topics.split(',').map(function(t){return t.trim()}).join(' · ') + '</span>\n';
  h += '                    </div>\n';
  h += '                    <div style="display:flex;gap:8px;margin-top:10px">\n';
  h += '                        <button onclick="window.print()" class="download-btn">&#x1f4c4; Download PDF</button>\n';
  h += '                        <a href="../../mock-tests/index.html" class="download-btn">&#x1f3af; Take Mock Test</a>\n';
  h += '                    </div>\n';
  h += '                </div>\n';

  // Lesson body content
  h += '                <div class="lesson-body">\n';

  // Learning Objectives
  h += '                <h3>Learning Objectives</h3>\n';
  h += '                <ul>\n';
  var objectives = {
    'analogy': ['Understand different types of analogies (word, letter, number)', 'Learn relationship mapping techniques', 'Solve analogy questions in under 30 seconds'],
    'coding-decoding': ['Master letter-to-letter coding patterns', 'Understand number-based and symbol coding', 'Solve substitution cipher problems efficiently'],
    'syllogism': ['Use Venn diagrams to solve syllogism problems', 'Understand all-no-some-some-not statements', 'Handle either-or and neither-nor cases'],
    'blood-relation': ['Draw family trees from verbal descriptions', 'Calculate generation gaps', 'Solve coded blood relation problems'],
    'direction-distance': ['Use cardinal directions for path plotting', 'Calculate net displacement using Pythagoras', 'Solve shadow-based direction problems'],
    'series': ['Identify arithmetic and geometric progressions', 'Recognize letter patterns (position-based)', 'Solve mixed series with alternating rules'],
    'puzzles': ['Build linear and circular seating arrangements', 'Apply constraints step by step', 'Solve comparison-based puzzles (height/age/rank)'],
    'calendar-clock': ['Calculate odd days and weekdays for any date', 'Find angle between clock hands', 'Solve mirror image and water image problems'],
    'number-system': ['Apply divisibility rules for 2-11', 'Calculate LCM and HCF using prime factorization', 'Use remainder theorem for large numbers'],
    'percentage': ['Convert between fractions and percentages', 'Calculate successive percentage changes', 'Solve population and election problems'],
    'profit-loss': ['Calculate profit/loss percentage accurately', 'Solve marked price and discount problems', 'Handle successive discounts and false weight'],
    'time-work': ['Calculate work efficiency and combined work', 'Solve pipe and cistern problems', 'Handle alternate day work and wage distribution'],
    'speed-distance': ['Apply speed-distance-time formulas', 'Solve train and platform problems', 'Handle boat and stream problems'],
    'simple-interest': ['Calculate simple and compound interest', 'Solve installment and repayment problems', 'Compare interest rates across periods'],
    'ratio-proportion': ['Solve ratio and proportion problems', 'Apply mixture and alligation rules', 'Handle partnership and coin problems'],
    'mensuration': ['Calculate areas of 2D shapes', 'Find volumes and surface areas of 3D shapes', 'Solve combination shape problems'],
    'algebra': ['Solve linear and quadratic equations', 'Factor polynomials using identities', 'Apply algebraic formulas for speed'],
    'geometry-trigo': ['Use properties of lines, angles, and triangles', 'Apply circle theorems', 'Use trigonometric ratios for heights and distances'],
    'indian-history': ['Understand major periods of Indian history', 'Remember important dates and personalities', 'Connect historical events to their impact'],
    'indian-polity': ['Understand the structure of Indian government', 'Know key constitutional articles', 'Differentiate between fundamental rights and duties'],
    'indian-geography': ['Identify major rivers, mountains, and climate zones', 'Know agricultural and mineral resources', 'Understand population distribution patterns'],
    'indian-economy': ['Understand GDP, inflation, and economic indicators', 'Know banking system and RBI functions', 'Track five-year plans and economic reforms'],
    'general-science': ['Understand basic physics laws and phenomena', 'Know important chemical compounds and reactions', 'Understand human body systems and nutrition'],
    'current-affairs': ['Track important national and international events', 'Remember awards, sports, and appointments', 'Connect current events to static GK'],
    'grammar-basics': ['Identify parts of speech correctly', 'Use tenses and subject-verb agreement properly', 'Apply articles and prepositions correctly'],
    'vocabulary': ['Build a strong vocabulary for SSC exams', 'Learn synonyms, antonyms, and one-word substitutions', 'Master common idioms and phrasal verbs'],
    'sentence-correction': ['Detect grammatical errors in sentences', 'Improve sentences without changing meaning', 'Rearrange jumbled paragraphs logically'],
    'comprehension': ['Read passages quickly while retaining key info', 'Answer inference and vocabulary questions accurately', 'Identify main ideas and supporting details'],
    'active-passive': ['Convert active voice to passive and vice versa', 'Change direct speech to indirect speech', 'Apply tense change rules correctly'],
    'filler-cloze': ['Choose correct words for fill-in-the-blanks', 'Solve cloze tests with contextual understanding', 'Replace phrases without changing meaning']
  };
  var objs = objectives[lesson.slug] || ['Understand key concepts of ' + lesson.title, 'Apply learned techniques to solve problems', 'Practice with exam-level MCQs'];
  for (var oi = 0; oi < objs.length; oi++) h += '                    <li>' + esc(objs[oi]) + '</li>\n';
  h += '                </ul>\n';

  h += '                <h3>Key Concepts</h3>\n';
  // Read lesson content from a data file or inline
  h += lesson.content || '<p>Detailed lesson content for ' + esc(lesson.title) + ' coming soon. Practice questions below are ready to attempt.</p>\n';

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
  h += '        <script>\n';
  h += '        var practiceQs = ' + JSON.stringify(lessonQs) + ';\n';
  h += '        var answered={},correctCount=0,lessonSlug="' + lesson.slug + '";\n';
  h += '        function renderPractice(){var c=document.getElementById("practice-qs"),h="";if(!practiceQs||!practiceQs.length){h="<p style=\\"color:var(--text-muted);font-size:.85em\\">Practice questions loading...</p>"}else{for(var i=0;i<practiceQs.length;i++){var q=practiceQs[i],o="";for(var j=0;j<q.options.length;j++){o+="<div class=\\"q-opt\\" data-qid=\\""+q.id+"\\" data-idx=\\""+j+"\\" onclick=\\"selectOpt("+q.id+","+j+")\\">"+q.options[j].l+". "+q.options[j].t+"</div>"}h+="<div class=\\"q-card\\" id=\\"q-"+q.id+"\\"><div class=\\"q-text\\">"+(i+1)+". "+q.text+"</div><div class=\\"q-opts\\">"+o+"</div><div class=\\"q-soln\\" id=\\"soln-"+q.id+"\\"><strong>Correct: "+getCL(q)+"</strong><br>"+q.sol+"</div><div class=\\"q-result\\" id=\\"result-"+q.id+"\\"></div></div>"}}c.innerHTML=h;updateProgress()}\n';
  h += '        function getCL(q){for(var i=0;i<q.options.length;i++){if(q.options[i].c)return q.options[i].l+". "+q.options[i].t}return""}\n';
  h += '        function selectOpt(qId,idx){if(answered[qId])return;answered[qId]=true;var q=practiceQs.filter(function(x){return x.id===qId})[0];var opts=document.querySelectorAll("#q-"+qId+" .q-opt");var cr=q.options[idx].c;for(var i=0;i<opts.length;i++)opts[i].classList.add("disabled");if(cr){opts[idx].classList.add("correct");document.getElementById("result-"+qId).textContent="\\u2713 Correct";correctCount++}else{opts[idx].classList.add("wrong");document.getElementById("result-"+qId).textContent="\\u2717 Wrong";for(var i=0;i<q.options.length;i++){if(q.options[i].c)opts[i].classList.add("correct")}}document.getElementById("soln-"+qId).classList.add("show");updateProgress()}\n';
  h += '        function updateProgress(){var t=Object.keys(answered).length;var s=document.getElementById("score-display");if(!s){s=document.createElement("div");s.id="score-display";s.style.cssText="font-size:.85em;color:var(--text-sec);margin-bottom:10px";document.getElementById("practice-qs").before(s)}s.textContent="Attempted: "+t+"/"+(practiceQs.length||0)+" | Correct: "+correctCount+" | Accuracy: "+(t>0?Math.round(correctCount/t*100):0)+"%"}\n';
  h += '        function resetPractice(){if(!confirm("Reset all answers?"))return;answered={};correctCount=0;document.querySelectorAll("#practice-qs .q-opt").forEach(function(e){e.className="q-opt"});document.querySelectorAll("#practice-qs .q-soln").forEach(function(e){e.classList.remove("show")});document.querySelectorAll("#practice-qs .q-result").forEach(function(e){e.textContent="";e.className="q-result"});var s=document.getElementById("score-display");if(s)s.textContent="";renderPractice()}\n';
  h += '        function markComplete(){try{var done=JSON.parse(localStorage.getItem("cgl-course-done")||"[]");if(done.indexOf(lessonSlug)===-1){done.push(lessonSlug);localStorage.setItem("cgl-course-done",JSON.stringify(done));document.getElementById("complete-btn").textContent="\\u2713 Completed!";document.getElementById("complete-btn").style.opacity="0.6"}}catch(e){alert("Progress saved locally")}}\n';
  h += '        renderPractice();\n';
  h += '        try{var done=JSON.parse(localStorage.getItem("cgl-course-done")||"[]");if(done.indexOf(lessonSlug)!==-1){document.getElementById("complete-btn").textContent="\\u2713 Completed!";document.getElementById("complete-btn").style.opacity="0.6"}}catch(e){}\n';
  h += '        </script>\n';
  h += foot();

  var fp = path.join(dir, 'lesson-' + lesson.slug + '.html');
  fs.writeFileSync(fp, h, 'utf-8');
  console.log('Wrote: ' + moduleKey + '/lesson-' + lesson.slug + '.html');
}

// Load lesson content and practice data
var contentData = JSON.parse(fs.readFileSync(path.join(__dirname, 'course-data.json'), 'utf-8'));
var practiceData = JSON.parse(fs.readFileSync(path.join(__dirname, 'course-practice.json'), 'utf-8'));

// Generate all lessons
for (var mi = 0; mi < modKeys.length; mi++) {
  var mk = modKeys[mi];
  var mod = modules[mk];
  var lessons = mod.lessons;
  for (var li = 0; li < lessons.length; li++) {
    var lesson = lessons[li];
    // Attach content and practice
    var key = mk + '/' + lesson.slug;
    lesson.content = contentData[key] || '';
    lesson.practice = practiceData[key] || [];
    genLesson(mk, lesson, li, lessons);
  }
}

console.log('\nAll course pages generated!');
