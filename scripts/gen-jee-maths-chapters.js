const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "jee", "chapters");
const SUBJECT = "Maths";
const BADGE_COLOR = "#f59e0b";
const BADGE_BG = "245,158,11";

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
}
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildPage(chNum, chName, questions, navItems) {
  var cls = chNum <= 13 ? "11" : "12";
  var fileSlug = "maths-chapter-" + chNum + "-" + slug(chName);
  var title = "JEE Maths Chapter " + chNum + ": " + chName + " \u2014 MCQ with Answers";
  var desc = "Free JEE Maths Chapter " + chNum + " (" + chName + ") MCQ with detailed solutions. " + questions.length + " practice questions for JEE Main " + chName + ". NCERT Class " + cls + ".";
  var canonical = "https://vlymbooq.qzz.io/jee/chapters/" + fileSlug + ".html";
  var navHtml = navItems.map(function(n) {
    var href = "maths-chapter-" + n.num + "-" + slug(n.name) + ".html";
    var active = n.num === chNum ? ' class="active"' : "";
    return '<a href="' + href + '"' + active + ">Ch " + n.num + "</a>";
  }).join("\n            ");
  var qsJson = JSON.stringify(questions.map(function(q, idx) {
    return { id: idx + 1, text: esc(q.text), topic: q.topic, opts: q.opts.map(function(o) { return { l: o.l, t: esc(o.t), c: o.c || false }; }), sol: esc(q.sol) };
  }));
  var totalQ = questions.length;
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <link rel="stylesheet" href="../../css/style.css">\n    <meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n    <title>' + title + '</title>\n    <meta name="description" content="' + desc + '">\n    <meta property="og:image" content="https://vlymbooq.qzz.io/logo.png">\n    <link rel="icon" type="image/svg+xml" href="/favicon.svg">\n    <link rel="icon" type="image/png" href="/logo.png">\n    <link rel="canonical" href="' + canonical + '">\n    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"' + title + '","description":"' + desc + '","url":"' + canonical + '","educationalLevel":"Competitive Exam","audience":{"@type":"EducationalAudience","educationalRole":"student"},"publisher":{"@type":"Organization","name":"vlymbooq","url":"https://vlymbooq.qzz.io"}}</script>\n    <style>\n        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");\n        *{margin:0;padding:0;box-sizing:border-box}\n        :root{--bg:#09090b;--bg-card:#111113;--border:rgba(255,255,255,.06);--text:#fafafa;--text-sec:#a1a1aa;--text-muted:#52525b;--amber:#f59e0b;--emerald:#34d399;--radius:12px}\n        body{font-family:Inter,-apple-system,sans-serif;background:var(--bg);color:var(--text)}\n        a{color:var(--amber);text-decoration:none}\n        .nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);border-bottom:1px solid var(--border)}\n        .nav-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}\n        .brand{display:flex;align-items:center;gap:8px}\n        .brand-icon{width:28px;height:28px;border-radius:6px;flex-shrink:0}\n        .brand-text{font-weight:800;font-size:1.05em;background:linear-gradient(135deg,#6366f1,var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n        .nav-links{display:flex;gap:2px;align-items:center;flex-wrap:wrap}\n        .nav-links a{padding:7px 14px;border-radius:100px;font-size:.82em;font-weight:500;color:#a1a1aa;transition:all .2s;white-space:nowrap}\n        .nav-links a:hover{color:var(--text);background:rgba(255,255,255,.04)}\n        .nav-links a.active{color:var(--text);background:rgba(255,255,255,.06)}\n        .container{max-width:900px;margin:0 auto;padding:24px;position:relative}\n        .chapter-header{padding:24px 0;border-bottom:1px solid var(--border);margin-bottom:24px}\n        .chapter-header .badge{display:inline-flex;padding:4px 12px;border-radius:100px;background:rgba(' + BADGE_BG + ',.12);color:' + BADGE_COLOR + ';font-size:.75em;font-weight:600;margin-bottom:8px}\n        .chapter-header h1{font-size:1.8em;font-weight:900;margin-bottom:8px;line-height:1.2}\n        .chapter-header .sub{color:var(--text-sec);font-size:.92em;line-height:1.6}\n        .chapter-header .meta{display:flex;gap:16px;margin-top:12px;flex-wrap:wrap}\n        .chapter-header .meta span{font-size:.82em;color:var(--text-muted)}\n        .chapters-list{display:flex;gap:6px;flex-wrap:wrap;margin:16px 0 24px}\n        .chapters-list a{padding:6px 14px;border-radius:100px;font-size:.82em;border:1px solid var(--border);color:var(--text-sec);transition:all .2s}\n        .chapters-list a:hover{border-color:' + BADGE_COLOR + ';color:' + BADGE_COLOR + '}\n        .chapters-list a.active{background:rgba(' + BADGE_BG + ',.12);border-color:' + BADGE_COLOR + ';color:' + BADGE_COLOR + '}\n        .score-bar{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}\n        .score-bar .score{font-size:1.4em;font-weight:800;color:' + BADGE_COLOR + '}\n        .score-bar .score .denom{color:var(--text-muted);font-weight:400}\n        .score-bar .btn-reset{padding:8px 20px;border-radius:100px;background:rgba(255,255,255,.04);color:var(--text-sec);border:1px solid var(--border);cursor:pointer;font-size:.8em}\n        .score-bar .btn-reset:hover{background:rgba(255,255,255,.08)}\n        .q-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:14px}\n        .q-card:hover{border-color:rgba(255,255,255,.1)}\n        .q-card .q-num{font-size:.8em;color:var(--text-muted);margin-bottom:6px;display:flex;justify-content:space-between}\n        .q-card .q-topic{font-size:.7em;padding:2px 8px;border-radius:100px;background:rgba(' + BADGE_BG + ',.1);color:' + BADGE_COLOR + '}\n        .q-card .q-text{font-size:.95em;margin-bottom:12px;line-height:1.7;font-weight:500}\n        .q-card .q-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}\n        @media(max-width:500px){.q-card .q-opts{grid-template-columns:1fr}}\n        .q-card .q-opt{padding:10px 14px;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:.85em;transition:all .15s}\n        .q-card .q-opt:hover{border-color:rgba(255,255,255,.15)}\n        .q-card .q-opt.correct{border-color:var(--emerald);background:rgba(52,211,153,.1)}\n        .q-card .q-opt.wrong{border-color:#ef4444;background:rgba(239,68,68,.1);color:#ef4444}\n        .q-card .q-opt.disabled{pointer-events:none;opacity:.7}\n        .q-card .q-soln{display:none;margin-top:12px;padding:12px;background:rgba(' + BADGE_BG + ',.06);border-radius:8px;font-size:.85em;color:var(--text-sec);line-height:1.6}\n        .q-card .q-soln.show{display:block}\n        .q-card .q-soln strong{color:var(--emerald)}\n        .q-card .q-result{font-size:.8em;font-weight:600;margin-top:8px}\n        .q-card .q-result.correct{color:var(--emerald)}\n        .q-card .q-result.wrong{color:#ef4444}\n        .pdf-download{display:flex;align-items:center;gap:12px;padding:16px 20px;background:rgba(52,211,153,.04);border:1px solid rgba(52,211,153,.1);border-radius:var(--radius);margin:24px 0}\n        .pdf-download .btn-dl{padding:10px 24px;border-radius:100px;background:rgba(52,211,153,.12);color:var(--emerald);font-weight:600;font-size:.85em;border:none;cursor:pointer}\n        .pdf-download .btn-dl:hover{background:rgba(52,211,153,.2)}\n        .seo-content{padding:24px 0;border-top:1px solid var(--border);margin-top:24px}\n        .seo-content h2{font-size:1.2em;font-weight:700;margin-bottom:12px}\n        .seo-content p{color:var(--text-sec);font-size:.9em;line-height:1.7;margin-bottom:12px}\n        .seo-content ul{list-style:none;color:var(--text-sec);font-size:.88em;line-height:1.8}\n        .seo-content ul li:before{content:\'\u2713 \';color:var(--emerald);margin-right:4px}\n        @media print{.nav,.score-bar,.pdf-download,.chapters-list{display:none}.q-card .q-soln{display:block!important}.q-card .q-opt.disabled{opacity:1}}\n    </style>\n</head>\n<body>\n    <nav class="nav">\n        <div class="nav-inner">\n            <a href="../index.html" class="brand"><img src="../logo.png" alt="" class="brand-icon"><span class="brand-text">vlymbooq</span></a>\n            <div class="nav-links">\n                <a href="../index.html">Home</a>\n                <a href="../dashboard.html">Dashboard</a>\n                <a href="../dashboard.html">Community</a>\n                <a href="../neet/index.html">NEET</a>\n                <a href="../jee/index.html" class="active">JEE</a>\n                <a href="../cgl/index.html">CGL</a>\n            </div>\n        </div>\n    </nav>\n\n    <div class="container">\n        <div class="chapters-list">\n            <a href="maths-important-questions.html">\u2605 Maths Important Qs</a>\n            ' + navHtml + '\n        </div>\n\n        <div class="chapter-header">\n            <div class="badge">\uD83D\uDC69\u200D\uD83C\uDF93 JEE Main 2027 &middot; Maths Chapter ' + chNum + '</div>\n            <h1>Chapter ' + chNum + ': ' + chName + ' \u2014 JEE Main MCQ Practice</h1>\n            <div class="sub">' + totalQ + ' handpicked MCQs on ' + chName + ' for JEE Main 2027. Class ' + cls + ' NCERT-aligned. Each question includes a step-by-step solution.</div>\n            <div class="meta">\n                <span>\uD83D\uDCDD ' + totalQ + ' Questions</span>\n                <span>\u23F1 ' + (totalQ * 2) + ' Minutes</span>\n                <span>\uD83C\uDFAF +4, -1 Marking</span>\n                <span>\uD83D\uDCDA Class ' + cls + '</span>\n            </div>\n        </div>\n\n        <div class="score-bar">\n            <div><span class="score" id="correct-count">0</span><span class="denom"> / ' + totalQ + '</span> correct</div>\n            <div><span id="accuracy-pct" style="font-weight:700;color:var(--emerald)">0%</span></div>\n            <button class="btn-reset" onclick="resetQuiz()">\uD83D\uDD04 Reset</button>\n        </div>\n\n        <div id="questions-container"></div>\n\n        <div class="pdf-download">\n            <div style="flex:1"><strong>\uD83D\uDCC4 JEE Maths Chapter ' + chNum + ' (' + chName + ') PDF</strong><br><span style="font-size:.82em;color:var(--text-muted)">Download as PDF for offline practice</span></div>\n            <button class="btn-dl" onclick="window.print()">\u2B07 Download PDF</button>\n        </div>\n\n        <div class="seo-content">\n            <h2>\uD83D\uDCA1 Master ' + chName + ' for JEE Main 2027</h2>\n            <p>Chapter ' + chNum + ': ' + chName + ' is an important topic in the JEE Main Mathematics syllabus (Class ' + cls + '). These ' + totalQ + ' handpicked questions cover all key concepts including definitions, formulas, problem-solving techniques, and exam-style applications. Each MCQ follows the JEE Main (+4, -1) marking scheme and includes a detailed solution to help you understand the reasoning.</p>\n            <ul>\n                <li>' + totalQ + ' JEE Main pattern MCQs with step-by-step solutions</li>\n                <li>Covers all critical topics within ' + chName + '</li>\n                <li>Follows JEE Main (+4, -1) marking scheme</li>\n                <li>Free PDF download for offline practice</li>\n                <li>Track your accuracy and identify weak areas</li>\n            </ul>\n            <p style="margin-top:12px">Also practice: <a href="physics-important-questions.html">JEE Physics Important Questions</a> &middot; <a href="chemistry-important-questions.html">JEE Chemistry Important Questions</a> &middot; <a href="maths-important-questions.html">JEE Maths Important Questions</a> &middot; <a href="../index.html">JEE Full Mock Tests</a></p>\n        </div>\n    </div>\n\n    <script>\n    var questions = ' + qsJson + ';\n    var answered={}, correctCount=0;\n    function renderQuestions(){var c=document.getElementById(\'questions-container\'),h=\'\';for(var i=0;i<questions.length;i++){var q=questions[i],o=\'\';for(var j=0;j<q.opts.length;j++){o+=\'<div class="q-opt" data-qid="\'+q.id+\'" data-idx="\'+j+\'" onclick="selectOpt(\'+q.id+\',\'+j+\')">\'+q.opts[j].l+\'. \'+q.opts[j].t+\'</div>\'}h+=\'<div class="q-card" id="q-\'+q.id+\'"><div class="q-num"><span>Question \'+(i+1)+\' of \'+questions.length+\'</span><span class="q-topic">\'+q.topic+\'</span></div><div class="q-text">\'+q.text+\'</div><div class="q-opts">\'+o+\'</div><div class="q-soln" id="soln-\'+q.id+\'"><strong>Correct: \'+getCorrectLabel(q)+\'</strong><br>\'+q.sol+\'</div><div class="q-result" id="result-\'+q.id+\'"></div></div>\'}c.innerHTML=h;updateScore()}\n    function getCorrectLabel(q){for(var i=0;i<q.opts.length;i++){if(q.opts[i].c)return q.opts[i].l+\'. \'+q.opts[i].t}return\'\'}\n    function selectOpt(qId,idx){if(answered[qId])return;answered[qId]=true;var q=questions.filter(function(x){return x.id===qId})[0];var opts=document.querySelectorAll(\'#q-\'+qId+\' .q-opt\');var isCorrect=q.opts[idx].c;for(var i=0;i<opts.length;i++)opts[i].classList.add(\'disabled\');if(isCorrect){opts[idx].classList.add(\'correct\');document.getElementById(\'result-\'+qId).textContent=\'+4 Correct!\';document.getElementById(\'result-\'+qId).className=\'q-result correct\';correctCount++}else{opts[idx].classList.add(\'wrong\');document.getElementById(\'result-\'+qId).textContent=\'-1 Wrong\';document.getElementById(\'result-\'+qId).className=\'q-result wrong\';for(var i=0;i<q.opts.length;i++){if(q.opts[i].c)opts[i].classList.add(\'correct\')}}document.getElementById(\'soln-\'+qId).classList.add(\'show\');updateScore()}\n    function updateScore(){document.getElementById(\'correct-count\').textContent=correctCount;var t=Object.keys(answered).length;document.getElementById(\'accuracy-pct\').textContent=(t>0?Math.round(correctCount/t*100):0)+\'%\'}\n    function resetQuiz(){if(!confirm(\'Reset all answers?\'))return;answered={};correctCount=0;var cards=document.querySelectorAll(\'.q-card\');for(var i=0;i<cards.length;i++){cards[i].querySelectorAll(\'.q-opt\').forEach(function(e){e.className=\'q-opt\'});cards[i].querySelector(\'.q-soln\').classList.remove(\'show\');cards[i].querySelector(\'.q-result\').className=\'q-result\';cards[i].querySelector(\'.q-result\').textContent=\'\'}updateScore()}\n    renderQuestions();\n    </script>\n</body>\n</html>';
}

var MATH_CHAPTERS = [
  {num:1,name:"Sets",q:[
    {t:"If A = {1,2,3,4} and B = {3,4,5,6}, then A U B is:",p:"Set Operations",o:[{l:"A",v:"{1,2,3,4,5,6}",c:true},{l:"B",v:"{3,4}"},{l:"C",v:"{1,2,5,6}"},{l:"D",v:"{1,2,3,4,5}"}],s:"Union contains all elements from both sets: {1,2,3,4,5,6}."},
    {t:"If n(A)=10, n(B)=15, n(AUB)=20, then n(AnB)=",p:"Set Operations",o:[{l:"A",v:"5",c:true},{l:"B",v:"10"},{l:"C",v:"15"},{l:"D",v:"25"}],s:"n(AUB)=n(A)+n(B)-n(AnB) => 20=10+15-n(AnB) => n(AnB)=5."},
    {t:"Which is a null set?",p:"Sets",o:[{l:"A",v:"{x: x^2=4, x odd}",c:true},{l:"B",v:"{x: x^2=9, x int}"},{l:"C",v:"{x: x^2-x-2=0, x nat}"},{l:"D",v:'{x: x vowel in "sky"}'}],s:"x^2=4 => x=2,-2 (even). No odd solution => null set."},
    {t:"If A subset B, then AnB =",p:"Set Operations",o:[{l:"A",v:"A",c:true},{l:"B",v:"B"},{l:"C",v:"A' "},{l:"D",v:"B' "}],s:"If A subset B, AnB = A."},
    {t:"60% coffee, 50% tea, 30% both. % neither:",p:"Set Applications",o:[{l:"A",v:"20%",c:true},{l:"B",v:"30%"},{l:"C",v:"10%"},{l:"D",v:"40%"}],s:"n(CUT)=60+50-30=80%. Neither=100-80=20%."},
    {t:"If A has 3 elements, number of subsets:",p:"Power Set",o:[{l:"A",v:"8",c:true},{l:"B",v:"6"},{l:"C",v:"3"},{l:"D",v:"9"}],s:"Number of subsets = 2^n = 2^3 = 8."},
    {t:"If A={1,2}, B={2,3}, then A-B:",p:"Set Difference",o:[{l:"A",v:"{1}",c:true},{l:"B",v:"{2}"},{l:"C",v:"{3}"},{l:"D",v:"{1,3}"}],s:"A-B = elements in A not in B = {1}."},
    {t:"De Morgan's law: (AUB)' =",p:"De Morgan",o:[{l:"A",v:"A'nB'",c:true},{l:"B",v:"A'UB'"},{l:"C",v:"(AnB)'"},{l:"D",v:"AUB"}],s:"(AUB)' = A' n B'."},
    {t:"If A and B are disjoint, n(AUB)=",p:"Disjoint Sets",o:[{l:"A",v:"n(A)+n(B)",c:true},{l:"B",v:"n(A)-n(B)"},{l:"C",v:"n(A)n(B)"},{l:"D",v:"0"}],s:"Disjoint => AnB=Ø => n(AUB)=n(A)+n(B)."},
    {t:"n(A)=5, n(B)=6, n(AUB)=9, n(AnB)=",p:"Set Operations",o:[{l:"A",v:"2",c:true},{l:"B",v:"1"},{l:"C",v:"3"},{l:"D",v:"4"}],s:"9=5+6-n(AnB) => n(AnB)=2."}
  ]},
  {num:2,name:"Relations and Functions",q:[
    {t:"If f(x)=x^2+3x, f(2)=",p:"Functions",o:[{l:"A",v:"10",c:true},{l:"B",v:"6"},{l:"C",v:"8"},{l:"D",v:"12"}],s:"f(2)=4+6=10."},
    {t:"Domain of f(x)=1/(x-3):",p:"Domain",o:[{l:"A",v:"R-{3}",c:true},{l:"B",v:"R"},{l:"C",v:"R-{0}"},{l:"D",v:"(3,inf)"}],s:"x!=3. Domain=R-{3}."},
    {t:"(fog)(2) for f=2x+1, g=x^2:",p:"Composite",o:[{l:"A",v:"9",c:true},{l:"B",v:"5"},{l:"C",v:"7"},{l:"D",v:"25"}],s:"(fog)(2)=f(g(2))=f(4)=9."},
    {t:"Which is an even function?",p:"Even-Odd",o:[{l:"A",v:"f(x)=x^2",c:true},{l:"B",v:"f(x)=x^3"},{l:"C",v:"f(x)=x"},{l:"D",v:"f(x)=x+1"}],s:"f(-x)=f(x). x^2 is even."},
    {t:"Range of f(x)=x^2+1:",p:"Range",o:[{l:"A",v:"[1,inf)",c:true},{l:"B",v:"(0,inf)"},{l:"C",v:"R"},{l:"D",v:"[0,inf)"}],s:"x^2>=0 => x^2+1>=1. Range=[1,inf)."},
    {t:"If R={(1,1),(2,2),(3,3)} on {1,2,3}, it is:",p:"Types of Relations",o:[{l:"A",v:"Reflexive",c:true},{l:"B",v:"Symmetric"},{l:"C",v:"Transitive"},{l:"D",v:"All of these"}],s:"Each element relates to itself => reflexive."},
    {t:"f:R?R, f(x)=2x+3. f is:",p:"Types of Functions",o:[{l:"A",v:"Bijective",c:true},{l:"B",v:"Only 1-1"},{l:"C",v:"Only onto"},{l:"D",v:"Neither"}],s:"f is linear with slope?0 => 1-1 and onto."},
    {t:"f(x)=x^3, f^{-1}(x)=",p:"Inverse",o:[{l:"A",v:"x^{1/3}",c:true},{l:"B",v:"x^3"},{l:"C",v:"3x"},{l:"D",v:"x/3"}],s:"y=x^3 => x=y^{1/3} => f^{-1}(x)=x^{1/3}."},
    {t:"Domain of sqrt(x-1):",p:"Domain",o:[{l:"A",v:"[1,inf)",c:true},{l:"B",v:"R"},{l:"C",v:"(1,inf)"},{l:"D",v:"[0,inf)"}],s:"x-1>=0 => x>=1."},
    {t:"If f(x)=x^2 and g(x)=2x, (gof)(x)=",p:"Composite",o:[{l:"A",v:"2x^2",c:true},{l:"B",v:"4x^2"},{l:"C",v:"(2x)^2"},{l:"D",v:"2x"}],s:"(gof)(x)=g(f(x))=g(x^2)=2x^2."}
  ]},
  {num:3,name:"Trigonometric Functions",q:[
    {t:"sin(pi/6)=",p:"Trig Values",o:[{l:"A",v:"1/2",c:true},{l:"B",v:"sqrt3/2"},{l:"C",v:"1/sqrt2"},{l:"D",v:"1"}],s:"sin30=1/2."},
    {t:"cos(2pi/3)=",p:"Trig Values",o:[{l:"A",v:"-1/2",c:true},{l:"B",v:"1/2"},{l:"C",v:"-sqrt3/2"},{l:"D",v:"sqrt3/2"}],s:"cos120=-cos60=-1/2."},
    {t:"If sin t=3/5, t acute, tan t=",p:"Trig Identities",o:[{l:"A",v:"3/4",c:true},{l:"B",v:"4/3"},{l:"C",v:"3/5"},{l:"D",v:"5/3"}],s:"cos t=4/5. tan=3/4."},
    {t:"Period of sin 3x:",p:"Period",o:[{l:"A",v:"2pi/3",c:true},{l:"B",v:"pi/3"},{l:"C",v:"2pi"},{l:"D",v:"pi"}],s:"T=2pi/|a|=2pi/3."},
    {t:"Always true identity:",p:"Identities",o:[{l:"A",v:"sin^2+cos^2=1",c:true},{l:"B",v:"sin^2-cos^2=1"},{l:"C",v:"sin+cos=1"},{l:"D",v:"sec^2-tan^2=0"}],s:"Pythagorean: sin^2+cos^2=1."},
    {t:"sin(pi/2 + x)=",p:"Compound Angles",o:[{l:"A",v:"cos x",c:true},{l:"B",v:"-cos x"},{l:"C",v:"sin x"},{l:"D",v:"-sin x"}],s:"sin(90°+x)=cos x."},
    {t:"Value of sin 15°:",p:"Compound Angles",o:[{l:"A",v:"(sqrt6-sqrt2)/4",c:true},{l:"B",v:"(sqrt6+sqrt2)/4"},{l:"C",v:"1/2"},{l:"D",v:"sqrt3/2"}],s:"sin15=sin(45-30)=sin45cos30-cos45sin30=(v6-v2)/4."},
    {t:"cos2? in terms of sin?:",p:"Double Angle",o:[{l:"A",v:"1-2sin^2?",c:true},{l:"B",v:"2sin^2?-1"},{l:"C",v:"2cos^2?-1"},{l:"D",v:"cos^2?-sin^2?"}],s:"cos2? = 1-2sin^2?."},
    {t:"sec^2? - tan^2? =",p:"Identities",o:[{l:"A",v:"1",c:true},{l:"B",v:"0"},{l:"C",v:"-1"},{l:"D",v:"sec?"}],s:"sec^2? = 1+tan^2? => sec^2?-tan^2?=1."},
    {t:"General solution sin? = 0:",p:"Trig Equations",o:[{l:"A",v:"?=np",c:true},{l:"B",v:"?=2np"},{l:"C",v:"?=(2n+1)p/2"},{l:"D",v:"?=np/2"}],s:"sin?=0 => ?=np where n?Z."}
  ]},
  {num:4,name:"Complex Numbers and Quadratic Equations",q:[
    {t:"i^105 equals (i^2=-1):",p:"Complex Numbers",o:[{l:"A",v:"i",c:true},{l:"B",v:"-i"},{l:"C",v:"1"},{l:"D",v:"-1"}],s:"i^105=i^(104+1)=i^104*i=(i^4)^26*i=1*i=i."},
    {t:"Conjugate of 3+4i:",p:"Complex Numbers",o:[{l:"A",v:"3-4i",c:true},{l:"B",v:"-3+4i"},{l:"C",v:"-3-4i"},{l:"D",v:"3+4i"}],s:"Conj(a+bi)=a-bi."},
    {t:"|3+4i| =",p:"Modulus",o:[{l:"A",v:"5",c:true},{l:"B",v:"3"},{l:"C",v:"4"},{l:"D",v:"7"}],s:"sqrt(9+16)=5."},
    {t:"Roots of x^2-5x+6=0:",p:"Quadratic",o:[{l:"A",v:"2,3",c:true},{l:"B",v:"1,6"},{l:"C",v:"-2,-3"},{l:"D",v:"2,-3"}],s:"(x-2)(x-3)=0 => x=2,3."},
    {t:"Product of roots of x^2-3x+2=0:",p:"Quadratic",o:[{l:"A",v:"2",c:true},{l:"B",v:"3"},{l:"C",v:"-3"},{l:"D",v:"-2"}],s:"Product = c/a = 2/1 = 2."},
    {t:"Value of i^2 + i^4:",p:"Complex Numbers",o:[{l:"A",v:"0",c:true},{l:"B",v:"2"},{l:"C",v:"-1"},{l:"D",v:"1"}],s:"i^2=-1, i^4=1. Sum=0."},
    {t:"(1+i)^2 =",p:"Complex Numbers",o:[{l:"A",v:"2i",c:true},{l:"B",v:"2"},{l:"C",v:"-2"},{l:"D",v:"-2i"}],s:"(1+i)^2 = 1+2i+i^2 = 1+2i-1 = 2i."},
    {t:"D>0 means roots are:",p:"Discriminant",o:[{l:"A",v:"Real & distinct",c:true},{l:"B",v:"Real & equal"},{l:"C",v:"Imaginary"},{l:"D",v:"Complex"}],s:"D>0 => two distinct real roots."},
    {t:"Sum of roots of ax^2+bx+c=0:",p:"Quadratic",o:[{l:"A",v:"-b/a",c:true},{l:"B",v:"b/a"},{l:"C",v:"c/a"},{l:"D",v:"-c/a"}],s:"Sum = -b/a."},
    {t:"Arg(1+i) =",p:"Argument",o:[{l:"A",v:"pi/4",c:true},{l:"B",v:"pi/2"},{l:"C",v:"0"},{l:"D",v:"pi"}],s:"tan?=1/1=1 => ?=p/4."}
  ]},
  {num:5,name:"Linear Inequalities",q:[
    {t:"Solution of 2x-3>5:",p:"Linear Inequalities",o:[{l:"A",v:"x>4",c:true},{l:"B",v:"x>1"},{l:"C",v:"x>2"},{l:"D",v:"x>3"}],s:"2x>8 => x>4."},
    {t:"Solution of |x|<=3:",p:"Absolute Value",o:[{l:"A",v:"[-3,3]",c:true},{l:"B",v:"(-3,3)"},{l:"C",v:"[-3,3)"},{l:"D",v:"(-3,3]"}],s:"-3<=x<=3 => [-3,3]."},
    {t:"x+y<=4 represents:",p:"Graphical",o:[{l:"A",v:"Region below line",c:true},{l:"B",v:"Region above"},{l:"C",v:"Line only"},{l:"D",v:"Origin only"}],s:"(0,0) satisfies => region containing origin (below line)."},
    {t:"If -3<=2x+1<5, x in:",p:"Compound",o:[{l:"A",v:"[-2,2)",c:true},{l:"B",v:"(-2,2]"},{l:"C",v:"[-2,2]"},{l:"D",v:"(-2,2)"}],s:"-3<=2x+1 => x>=-2. 2x+1<5 => x<2. x in [-2,2)."},
    {t:"(x-1)/(x+2)>0 solution:",p:"Rational",o:[{l:"A",v:"(-inf,-2)U(1,inf)",c:true},{l:"B",v:"(-2,1)"},{l:"C",v:"(-inf,1)"},{l:"D",v:"(-2,inf)"}],s:"Critical: x=1,-2. Positive for x<-2 or x>1."},
    {t:"Solve x^2-5x+6<0:",p:"Quadratic",o:[{l:"A",v:"(2,3)",c:true},{l:"B",v:"(-inf,2)U(3,inf)"},{l:"C",v:"[2,3]"},{l:"D",v:"(-inf,inf)"}],s:"(x-2)(x-3)<0 => x in (2,3)."},
    {t:"|2x-1| < 3:",p:"Absolute Value",o:[{l:"A",v:"(-1,2)",c:true},{l:"B",v:"(-2,1)"},{l:"C",v:"[-1,2]"},{l:"D",v:"(-1,2]"}],s:"-3<2x-1<3 => -2<2x<4 => -1<x<2."},
    {t:"If x+y>=2 and x>=0,y>=0, region:",p:"Graphical",o:[{l:"A",v:"Above line x+y=2 in Q1",c:true},{l:"B",v:"Below line"},{l:"C",v:"Left of y-axis"},{l:"D",v:"Whole plane"}],s:"x+y>=2 means above the line, x>=0,y>=0 => first quadrant."},
    {t:"3x+2>=5x-4 solution:",p:"Linear",o:[{l:"A",v:"x<=3",c:true},{l:"B",v:"x>=3"},{l:"C",v:"x<3"},{l:"D",v:"x>3"}],s:"3x+2>=5x-4 => 6>=2x => x<=3."}
  ]},
  {num:6,name:"Permutations and Combinations",q:[
    {t:"5! =",p:"Factorial",o:[{l:"A",v:"120",c:true},{l:"B",v:"60"},{l:"C",v:"24"},{l:"D",v:"720"}],s:"5x4x3x2x1=120."},
    {t:"5C2 =",p:"Combinations",o:[{l:"A",v:"10",c:true},{l:"B",v:"5"},{l:"C",v:"20"},{l:"D",v:"15"}],s:"5!/(2!3!)=10."},
    {t:"3-digit numbers from 1-4 no repeat:",p:"Permutations",o:[{l:"A",v:"24",c:true},{l:"B",v:"12"},{l:"C",v:"64"},{l:"D",v:"18"}],s:"4x3x2=24."},
    {t:"If nP3=60, n=",p:"Permutations",o:[{l:"A",v:"5",c:true},{l:"B",v:"4"},{l:"C",v:"6"},{l:"D",v:"3"}],s:"n(n-1)(n-2)=60. 5x4x3=60 => n=5."},
    {t:"Committee of 3 from 7:",p:"Combinations",o:[{l:"A",v:"35",c:true},{l:"B",v:"21"},{l:"C",v:"210"},{l:"D",v:"70"}],s:"7C3=35."},
    {t:"Number of ways to arrange 5 books:",p:"Permutations",o:[{l:"A",v:"120",c:true},{l:"B",v:"24"},{l:"C",v:"60"},{l:"D",v:"720"}],s:"5!=120."},
    {t:"10P2 =",p:"Permutations",o:[{l:"A",v:"90",c:true},{l:"B",v:"45"},{l:"C",v:"100"},{l:"D",v:"20"}],s:"10!/(10-2)! = 10x9 = 90."},
    {t:"nC0 + nC1 + ... + nCn =",p:"Combinations",o:[{l:"A",v:"2^n",c:true},{l:"B",v:"n^2"},{l:"C",v:"2n"},{l:"D",v:"n^n"}],s:"Sum of all combinations = 2^n."},
    {t:"nC3 = nC5, then n=",p:"Combinations",o:[{l:"A",v:"8",c:true},{l:"B",v:"7"},{l:"C",v:"6"},{l:"D",v:"10"}],s:"nC3=nC5 => 3+5=n => n=8."},
    {t:"Number of diagonals in a hexagon:",p:"Applications",o:[{l:"A",v:"9",c:true},{l:"B",v:"6"},{l:"C",v:"12"},{l:"D",v:"15"}],s:"n(n-3)/2 = 6(3)/2 = 9."}
  ]},
  {num:7,name:"Binomial Theorem",q:[
    {t:"Terms in (x+y)^8:",p:"Binomial",o:[{l:"A",v:"9",c:true},{l:"B",v:"8"},{l:"C",v:"10"},{l:"D",v:"7"}],s:"n+1=9."},
    {t:"Coefficient of x^3 in (1+x)^5:",p:"Coefficients",o:[{l:"A",v:"10",c:true},{l:"B",v:"5"},{l:"C",v:"15"},{l:"D",v:"20"}],s:"5C3=10."},
    {t:"(1+x)^n = sum of:",p:"Formula",o:[{l:"A",v:"nCr x^r",c:true},{l:"B",v:"nPr x^r"},{l:"C",v:"nCr r^x"},{l:"D",v:"r! x^r"}],s:"(1+x)^n = sum_{r=0}^n nCr x^r."},
    {t:"Middle term in (x+y)^6:",p:"Middle Term",o:[{l:"A",v:"20x^3y^3",c:true},{l:"B",v:"15x^3y^3"},{l:"C",v:"10x^3y^3"},{l:"D",v:"30x^3y^3"}],s:"T4 = 6C3 x^3y^3 = 20x^3y^3."},
    {t:"Sum of binomial coeffs:",p:"Coefficients",o:[{l:"A",v:"2^n",c:true},{l:"B",v:"n^2"},{l:"C",v:"2^n-1"},{l:"D",v:"n^n"}],s:"Put x=1: (1+1)^n=2^n."},
    {t:"Coefficient of x^5 in (1+x)^8:",p:"Coefficients",o:[{l:"A",v:"56",c:true},{l:"B",v:"28"},{l:"C",v:"70"},{l:"D",v:"35"}],s:"8C5 = 8C3 = 56."},
    {t:"General term in (a+b)^n:",p:"General Term",o:[{l:"A",v:"nCr a^(n-r) b^r",c:true},{l:"B",v:"nPr a^(n-r) b^r"},{l:"C",v:"nCr a^r b^(n-r)"},{l:"D",v:"r! a^r b^r"}],s:"T_{r+1} = nCr a^{n-r} b^r."},
    {t:"Coefficient of x in (1+x)^10:",p:"Coefficients",o:[{l:"A",v:"10",c:true},{l:"B",v:"1"},{l:"C",v:"45"},{l:"D",v:"120"}],s:"10C1 = 10."},
    {t:"(1-x)^n expansion:",p:"Formula",o:[{l:"A",v:"sum nCr (-x)^r",c:true},{l:"B",v:"sum nCr x^r"},{l:"C",v:"sum nPr (-x)^r"},{l:"D",v:"sum (-nCr) x^r"}],s:"(1-x)^n = S nCr (1)^{n-r}(-x)^r = S nCr (-x)^r."}
  ]},
  {num:8,name:"Sequences and Series",q:[
    {t:"nth term of AP 3,7,11,15,...:",p:"AP",o:[{l:"A",v:"4n-1",c:true},{l:"B",v:"4n+1"},{l:"C",v:"3n"},{l:"D",v:"n+2"}],s:"a=3,d=4. Tn=3+(n-1)4=4n-1."},
    {t:"Sum of 1st n natural numbers:",p:"Series",o:[{l:"A",v:"n(n+1)/2",c:true},{l:"B",v:"n^2"},{l:"C",v:"n(n-1)/2"},{l:"D",v:"n(n+1)"}],s:"Sum = n(n+1)/2."},
    {t:"5th term of GP 2,6,18,54,...:",p:"GP",o:[{l:"A",v:"162",c:true},{l:"B",v:"54"},{l:"C",v:"486"},{l:"D",v:"108"}],s:"a=2,r=3. T5=2x3^4=162."},
    {t:"Sum of infinite GP: 1+1/2+1/4+...:",p:"Infinite GP",o:[{l:"A",v:"2",c:true},{l:"B",v:"1"},{l:"C",v:"3"},{l:"D",v:"1/2"}],s:"S=a/(1-r)=1/(1-0.5)=2."},
    {t:"Sum of 1^2+2^2+...+n^2:",p:"Series",o:[{l:"A",v:"n(n+1)(2n+1)/6",c:true},{l:"B",v:"n(n+1)/2"},{l:"C",v:"n^2(n+1)^2/4"},{l:"D",v:"n(n+1)(n+2)/6"}],s:"Sum of squares = n(n+1)(2n+1)/6."},
    {t:"AP: a=2,d=3, Sum of 5 terms:",p:"AP",o:[{l:"A",v:"40",c:true},{l:"B",v:"30"},{l:"C",v:"35"},{l:"D",v:"45"}],s:"S5 = 5/2(4+4*3) = 2.5(16) = 40."},
    {t:"GP: a=3,r=2, 4th term:",p:"GP",o:[{l:"A",v:"24",c:true},{l:"B",v:"12"},{l:"C",v:"48"},{l:"D",v:"96"}],s:"T4 = 3x2^3 = 3x8 = 24."},
    {t:"AM of a and b:",p:"Means",o:[{l:"A",v:"(a+b)/2",c:true},{l:"B",v:"(a-b)/2"},{l:"C",v:"2ab/(a+b)"},{l:"D",v:"v(ab)"}],s:"Arithmetic mean = (a+b)/2."},
    {t:"GM of 4 and 9:",p:"Means",o:[{l:"A",v:"6",c:true},{l:"B",v:"36"},{l:"C",v:"6.5"},{l:"D",v:"13/2"}],s:"GM = v(4×9) = v36 = 6."},
    {t:"Sum of AP: 1+3+5+...+(2n-1):",p:"AP",o:[{l:"A",v:"n^2",c:true},{l:"B",v:"n(n+1)/2"},{l:"C",v:"n(n+1)"},{l:"D",v:"2n-1"}],s:"Sum of first n odd numbers = n^2."}
  ]},
  {num:9,name:"Straight Lines",q:[
    {t:"Slope of line 2x+3y=6:",p:"Slope",o:[{l:"A",v:"-2/3",c:true},{l:"B",v:"2/3"},{l:"C",v:"-3/2"},{l:"D",v:"3/2"}],s:"y=-2x/3+2 => slope=-2/3."},
    {t:"Distance between (1,2) and (4,6):",p:"Distance",o:[{l:"A",v:"5",c:true},{l:"B",v:"4"},{l:"C",v:"3"},{l:"D",v:"sqrt5"}],s:"d=sqrt(9+16)=5."},
    {t:"Line slope 2 through (1,3):",p:"Equation",o:[{l:"A",v:"y-3=2(x-1)",c:true},{l:"B",v:"y+3=2(x+1)"},{l:"C",v:"y-1=2(x-3)"},{l:"D",v:"y=2x+3"}],s:"Point-slope: y-3=2(x-1)."},
    {t:"Perpendicular lines have:",p:"Angle",o:[{l:"A",v:"m1*m2=-1",c:true},{l:"B",v:"m1=m2"},{l:"C",v:"m1*m2=1"},{l:"D",v:"m1+m2=0"}],s:"Perpendicular => m1*m2=-1."},
    {t:"x-intercept of 3x+4y=12:",p:"Intercepts",o:[{l:"A",v:"4",c:true},{l:"B",v:"3"},{l:"C",v:"12"},{l:"D",v:"-4"}],s:"Put y=0: 3x=12 => x=4."},
    {t:"Distance from (0,0) to 3x+4y=5:",p:"Distance",o:[{l:"A",v:"1",c:true},{l:"B",v:"5"},{l:"C",v:"1/5"},{l:"D",v:"5/v7"}],s:"|0+0-5|/v(9+16)=5/5=1."},
    {t:"Angle between y=x and x-axis:",p:"Angle",o:[{l:"A",v:"45°",c:true},{l:"B",v:"30°"},{l:"C",v:"60°"},{l:"D",v:"90°"}],s:"y=x has slope 1 => angle = 45°."},
    {t:"Line through (0,0) and (1,1):",p:"Equation",o:[{l:"A",v:"y=x",c:true},{l:"B",v:"y=-x"},{l:"C",v:"y=2x"},{l:"D",v:"y=x+1"}],s:"Slope=1, passing through origin => y=x."},
    {t:"Foot of perpendicular from (0,0) to x+y=1:",p:"Perpendicular",o:[{l:"A",v:"(0.5,0.5)",c:true},{l:"B",v:"(1,0)"},{l:"C",v:"(0,1)"},{l:"D",v:"(0.5,1.5)"}],s:"Foot = point where line and perpendicular meet."},
    {t:"Area of triangle (0,0),(3,0),(0,4):",p:"Area",o:[{l:"A",v:"6",c:true},{l:"B",v:"12"},{l:"C",v:"3"},{l:"D",v:"24"}],s:"Area = 1/2 × base × height = 1/2 × 3 × 4 = 6."}
  ]},
  {num:10,name:"Conic Sections",q:[
    {t:"Center of x^2+y^2-4x+6y-12=0:",p:"Circle",o:[{l:"A",v:"(2,-3)",c:true},{l:"B",v:"(-2,3)"},{l:"C",v:"(4,-6)"},{l:"D",v:"(-4,6)"}],s:"Center=(-g,-f) where g=-2, f=3 => (2,-3)."},
    {t:"Radius of x^2+y^2=25:",p:"Circle",o:[{l:"A",v:"5",c:true},{l:"B",v:"25"},{l:"C",v:"sqrt5"},{l:"D",v:"10"}],s:"r^2=25 => r=5."},
    {t:"Focus of y^2=4ax:",p:"Parabola",o:[{l:"A",v:"(a,0)",c:true},{l:"B",v:"(0,a)"},{l:"C",v:"(-a,0)"},{l:"D",v:"(0,-a)"}],s:"Focus is at (a,0) for y^2=4ax."},
    {t:"Eccentricity of ellipse (a>b):",p:"Ellipse",o:[{l:"A",v:"sqrt(1-b^2/a^2)",c:true},{l:"B",v:"sqrt(1-a^2/b^2)"},{l:"C",v:"b/a"},{l:"D",v:"a/b"}],s:"e=sqrt(1-b^2/a^2) for a>b."},
    {t:"Directrix of y^2=12x:",p:"Parabola",o:[{l:"A",v:"x=-3",c:true},{l:"B",v:"x=3"},{l:"C",v:"y=-3"},{l:"D",v:"y=3"}],s:"4a=12 => a=3. Directrix: x=-3."},
    {t:"Eccentricity of parabola:",p:"Parabola",o:[{l:"A",v:"1",c:true},{l:"B",v:"0"},{l:"C",v:"<1"},{l:"D",v:">1"}],s:"Parabola eccentricity = 1."},
    {t:"Eccentricity of hyperbola:",p:"Hyperbola",o:[{l:"A",v:">1",c:true},{l:"B",v:"<1"},{l:"C",v:"=1"},{l:"D",v:"=0"}],s:"Hyperbola eccentricity > 1."},
    {t:"Latus rectum of y^2=8x:",p:"Parabola",o:[{l:"A",v:"8",c:true},{l:"B",v:"4"},{l:"C",v:"2"},{l:"D",v:"16"}],s:"4a=8."},
    {t:"For ellipse x^2/16+y^2/9=1, a=",p:"Ellipse",o:[{l:"A",v:"4",c:true},{l:"B",v:"3"},{l:"C",v:"16"},{l:"D",v:"9"}],s:"a^2=16 => a=4 (denominator under x^2)."},
    {t:"Asymptotes of x^2/a^2-y^2/b^2=1:",p:"Hyperbola",o:[{l:"A",v:"y=±(b/a)x",c:true},{l:"B",v:"y=±(a/b)x"},{l:"C",v:"y=±x"},{l:"D",v:"y=0"}],s:"Asymptotes: y = ±(b/a)x."}
  ]},
  {num:11,name:"Limits and Derivatives",q:[
    {t:"lim(x->0) sin x / x =",p:"Limits",o:[{l:"A",v:"1",c:true},{l:"B",v:"0"},{l:"C",v:"inf"},{l:"D",v:"-1"}],s:"Standard limit: sin x / x -> 1."},
    {t:"If y=x^3, dy/dx =",p:"Derivatives",o:[{l:"A",v:"3x^2",c:true},{l:"B",v:"x^3"},{l:"C",v:"3x"},{l:"D",v:"x^2"}],s:"d(x^n)/dx = nx^(n-1). So 3x^2."},
    {t:"lim(x->0) (e^x-1)/x =",p:"Limits",o:[{l:"A",v:"1",c:true},{l:"B",v:"0"},{l:"C",v:"e"},{l:"D",v:"inf"}],s:"Standard limit: (e^x-1)/x -> 1."},
    {t:"Derivative of sin x:",p:"Derivatives",o:[{l:"A",v:"cos x",c:true},{l:"B",v:"-cos x"},{l:"C",v:"sin x"},{l:"D",v:"-sin x"}],s:"d(sin x)/dx = cos x."},
    {t:"lim(x->0) (1-cos x)/x^2 =",p:"Limits",o:[{l:"A",v:"1/2",c:true},{l:"B",v:"0"},{l:"C",v:"1"},{l:"D",v:"inf"}],s:"= lim 2sin^2(x/2)/x^2 = 2(1/4) = 1/2."},
    {t:"d(cos x)/dx =",p:"Derivatives",o:[{l:"A",v:"-sin x",c:true},{l:"B",v:"sin x"},{l:"C",v:"cos x"},{l:"D",v:"-cos x"}],s:"d(cos x)/dx = -sin x."},
    {t:"lim(x->0) tan x / x =",p:"Limits",o:[{l:"A",v:"1",c:true},{l:"B",v:"0"},{l:"C",v:"inf"},{l:"D",v:"-1"}],s:"tan x/x = (sin x/x)(1/cos x) -> 1×1 = 1."},
    {t:"d(e^x)/dx =",p:"Derivatives",o:[{l:"A",v:"e^x",c:true},{l:"B",v:"xe^{x-1}"},{l:"C",v:"e^x ln e"},{l:"D",v:"ln x"}],s:"d(e^x)/dx = e^x."},
    {t:"lim(x->0) sin 3x / x =",p:"Limits",o:[{l:"A",v:"3",c:true},{l:"B",v:"1"},{l:"C",v:"0"},{l:"D",v:"1/3"}],s:"= 3 × lim(sin3x/3x) = 3×1 = 3."},
    {t:"d(x^5)/dx at x=2:",p:"Derivatives",o:[{l:"A",v:"80",c:true},{l:"B",v:"32"},{l:"C",v:"40"},{l:"D",v:"16"}],s:"d(x^5)/dx=5x^4. At x=2: 5×16=80."}
  ]},
  {num:12,name:"Statistics",q:[
    {t:"Mean of 2,4,6,8,10:",p:"Mean",o:[{l:"A",v:"6",c:true},{l:"B",v:"5"},{l:"C",v:"7"},{l:"D",v:"8"}],s:"(2+4+6+8+10)/5 = 6."},
    {t:"Median of 3,7,2,9,5:",p:"Median",o:[{l:"A",v:"5",c:true},{l:"B",v:"3"},{l:"C",v:"7"},{l:"D",v:"2"}],s:"Sorted: 2,3,5,7,9. Middle = 5."},
    {t:"Variance of 1,3,5,7,9:",p:"Variance",o:[{l:"A",v:"8",c:true},{l:"B",v:"4"},{l:"C",v:"6"},{l:"D",v:"10"}],s:"Mean=5. Var=(16+4+0+4+16)/5=8."},
    {t:"SD of 2,2,2,2,2:",p:"SD",o:[{l:"A",v:"0",c:true},{l:"B",v:"2"},{l:"C",v:"1"},{l:"D",v:"sqrt2"}],s:"All equal => no deviation => SD=0."},
    {t:"If each value increased by 5, mean:",p:"Mean",o:[{l:"A",v:"Increases by 5",c:true},{l:"B",v:"5 times"},{l:"C",v:"Same"},{l:"D",v:"Decreases by 5"}],s:"Mean increases by the same constant."},
    {t:"Mode of 1,2,2,3,4,4,4,5:",p:"Mode",o:[{l:"A",v:"4",c:true},{l:"B",v:"2"},{l:"C",v:"3"},{l:"D",v:"5"}],s:"4 appears 3 times => mode = 4."},
    {t:"Range of 2,8,5,12,3:",p:"Range",o:[{l:"A",v:"10",c:true},{l:"B",v:"9"},{l:"C",v:"12"},{l:"D",v:"6"}],s:"Max=12, Min=2, Range=10."},
    {t:"If variance=4, SD=",p:"SD",o:[{l:"A",v:"2",c:true},{l:"B",v:"4"},{l:"C",v:"16"},{l:"D",v:"8"}],s:"SD = vvariance = v4 = 2."},
    {t:"If each value ×2, variance:",p:"Variance",o:[{l:"A",v:"×4",c:true},{l:"B",v:"×2"},{l:"C",v:"Same"},{l:"D",v:"×v2"}],s:"Variance multiplies by k² = 4."}
  ]},
  {num:13,name:"Probability",q:[
    {t:"P(head) on coin toss:",p:"Basics",o:[{l:"A",v:"1/2",c:true},{l:"B",v:"1"},{l:"C",v:"0"},{l:"D",v:"1/4"}],s:"2 outcomes, 1 favorable => 1/2."},
    {t:"P(odd) on die roll:",p:"Probability",o:[{l:"A",v:"1/2",c:true},{l:"B",v:"1/6"},{l:"C",v:"1/3"},{l:"D",v:"2/3"}],s:"Odd: 1,3,5 => 3/6=1/2."},
    {t:"P(at least 1 head) in 2 coins:",p:"Probability",o:[{l:"A",v:"3/4",c:true},{l:"B",v:"1/4"},{l:"C",v:"1/2"},{l:"D",v:"1"}],s:"Favorable: HH,HT,TH => 3/4."},
    {t:"P(A)=0.3, P(B)=0.4, P(AnB)=0.1, P(AUB)=",p:"Probability",o:[{l:"A",v:"0.6",c:true},{l:"B",v:"0.7"},{l:"C",v:"0.5"},{l:"D",v:"0.8"}],s:"P(AUB)=0.3+0.4-0.1=0.6."},
    {t:"P(ace) from 52 cards:",p:"Probability",o:[{l:"A",v:"1/13",c:true},{l:"B",v:"1/52"},{l:"C",v:"1/4"},{l:"D",v:"1/26"}],s:"4 aces => 4/52=1/13."},
    {t:"P(sum=7) with two dice:",p:"Probability",o:[{l:"A",v:"1/6",c:true},{l:"B",v:"1/12"},{l:"C",v:"1/36"},{l:"D",v:"1/18"}],s:"Favorable: (1,6),(2,5),(3,4),(4,3),(5,2),(6,1) => 6/36=1/6."},
    {t:"P(red card) from deck:",p:"Probability",o:[{l:"A",v:"1/2",c:true},{l:"B",v:"1/4"},{l:"C",v:"1/13"},{l:"D",v:"1/26"}],s:"26 red cards out of 52 => 1/2."},
    {t:"P(king or queen):",p:"Probability",o:[{l:"A",v:"2/13",c:true},{l:"B",v:"1/13"},{l:"C",v:"1/26"},{l:"D",v:"1/52"}],s:"4 kings + 4 queens = 8/52 = 2/13."},
    {t:"Probability of impossible event:",p:"Basics",o:[{l:"A",v:"0",c:true},{l:"B",v:"1"},{l:"C",v:"0.5"},{l:"D",v:"<0"}],s:"P(Ø) = 0."}
  ]},
  {num:14,name:"Relations and Functions (Class 12)",q:[
    {t:"f(x)=x^2 is:",p:"Types",o:[{l:"A",v:"Neither 1-1 nor onto",c:true},{l:"B",v:"1-1 and onto"},{l:"C",v:"Only 1-1"},{l:"D",v:"Only onto"}],s:"f(-1)=f(1) so not 1-1. No negative values => not onto."},
    {t:"(f+g)(x) for f=x+1, g=2x:",p:"Operations",o:[{l:"A",v:"3x+1",c:true},{l:"B",v:"2x+2"},{l:"C",v:"x+2"},{l:"D",v:"3x-1"}],s:"(x+1)+2x=3x+1."},
    {t:"Equivalence relation is:",p:"Relations",o:[{l:"A",v:"Reflexive, symmetric, transitive",c:true},{l:"B",v:"Reflexive, symmetric"},{l:"C",v:"Symmetric, transitive"},{l:"D",v:"Reflexive only"}],s:"Equivalence requires all three properties."},
    {t:"Inverse of f(x)=x+1:",p:"Inverse",o:[{l:"A",v:"x-1",c:true},{l:"B",v:"x+1"},{l:"C",v:"1-x"},{l:"D",v:"x"}],s:"y=x+1 => x=y-1 => f^{-1}(x)=x-1."},
    {t:"Number of reflexive relations on n-element set:",p:"Relations",o:[{l:"A",v:"2^{n^2-n}",c:true},{l:"B",v:"2^n"},{l:"C",v:"2^{n^2}"},{l:"D",v:"n^2"}],s:"Each of n(n-1) off-diagonal pairs can be chosen."},
    {t:"f(x)=x^3 is:",p:"Types",o:[{l:"A",v:"Bijective on R",c:true},{l:"B",v:"Not onto"},{l:"C",v:"Not 1-1"},{l:"D",v:"Neither"}],s:"x^3 is strictly increasing, 1-1 and onto on R."},
    {t:"f(x)=2x+1, f^{-1}(3)=",p:"Inverse",o:[{l:"A",v:"1",c:true},{l:"B",v:"3"},{l:"C",v:"7"},{l:"D",v:"2"}],s:"y=2x+1 => x=(y-1)/2 => f^{-1}(3)=(3-1)/2=1."},
    {t:"R={(1,1),(1,2),(2,1)} on {1,2} is:",p:"Relations",o:[{l:"A",v:"Symmetric only",c:true},{l:"B",v:"Equivalence"},{l:"C",v:"Reflexive"},{l:"D",v:"Transitive"}],s:"(2,2) missing => not reflexive. Not transitive."}
  ]},
  {num:15,name:"Inverse Trigonometric Functions",q:[
    {t:"sin^{-1}(1/2) =",p:"Inverse Trig",o:[{l:"A",v:"pi/6",c:true},{l:"B",v:"pi/3"},{l:"C",v:"pi/4"},{l:"D",v:"pi/2"}],s:"Principal value = pi/6."},
    {t:"tan^{-1}(1) + tan^{-1}(1) =",p:"Inverse Trig",o:[{l:"A",v:"pi/2",c:true},{l:"B",v:"pi/4"},{l:"C",v:"pi"},{l:"D",v:"0"}],s:"pi/4+pi/4=pi/2."},
    {t:"cos^{-1}(-1/2) principal value:",p:"Principal",o:[{l:"A",v:"2pi/3",c:true},{l:"B",v:"pi/3"},{l:"C",v:"pi/4"},{l:"D",v:"-pi/3"}],s:"cos^{-1}(-1/2)=pi-pi/3=2pi/3."},
    {t:"Domain of sin^{-1}x:",p:"Domain",o:[{l:"A",v:"[-1,1]",c:true},{l:"B",v:"R"},{l:"C",v:"[0,1]"},{l:"D",v:"(-1,1)"}],s:"sin^{-1}x defined for x in [-1,1]."},
    {t:"sec^{-1}(2) =",p:"Inverse Trig",o:[{l:"A",v:"pi/3",c:true},{l:"B",v:"pi/6"},{l:"C",v:"pi/4"},{l:"D",v:"pi/2"}],s:"sec(pi/3)=2 => sec^{-1}(2)=pi/3."},
    {t:"tan^{-1}(-1) =",p:"Inverse Trig",o:[{l:"A",v:"-pi/4",c:true},{l:"B",v:"pi/4"},{l:"C",v:"3pi/4"},{l:"D",v:"-pi/3"}],s:"tan(-pi/4)=-1 => tan^{-1}(-1)=-pi/4."},
    {t:"sin^{-1}(-1/2) =",p:"Inverse Trig",o:[{l:"A",v:"-pi/6",c:true},{l:"B",v:"pi/6"},{l:"C",v:"-pi/3"},{l:"D",v:"pi/3"}],s:"sin^{-1}(-1/2) = -pi/6."},
    {t:"Range of cos^{-1}x:",p:"Range",o:[{l:"A",v:"[0,pi]",c:true},{l:"B",v:"[-pi/2,pi/2]"},{l:"C",v:"[0,pi/2]"},{l:"D",v:"(-pi/2,pi/2)"}],s:"Principal range of cos^{-1}x is [0,p]."}
  ]},
  {num:16,name:"Matrices",q:[
    {t:"Order of A = [[1,2],[3,4]]:",p:"Basics",o:[{l:"A",v:"2x2",c:true},{l:"B",v:"2x4"},{l:"C",v:"4x2"},{l:"D",v:"1x4"}],s:"2 rows, 2 columns => 2x2."},
    {t:"adj(A) for 2x2 matrix [[a,b],[c,d]]:",p:"Adjoint",o:[{l:"A",v:"[[d,-b],[-c,a]]",c:true},{l:"B",v:"[[d,b],[c,a]]"},{l:"C",v:"[[a,-b],[-c,d]]"},{l:"D",v:"[[-d,b],[c,-a]]"}],s:"adj(A)=[[d,-b],[-c,a]]."},
    {t:"Symmetric matrix condition:",p:"Types",o:[{l:"A",v:"A^T = A",c:true},{l:"B",v:"A^T = -A"},{l:"C",v:"A^T = I"},{l:"D",v:"A^T = 0"}],s:"Symmetric: A^T = A."},
    {t:"Which is NOT a matrix operation?",p:"Operations",o:[{l:"A",v:"Division",c:true},{l:"B",v:"Addition"},{l:"C",v:"Multiplication"},{l:"D",v:"Transpose"}],s:"Matrix division is not defined directly."},
    {t:"A+B defined when:",p:"Addition",o:[{l:"A",v:"Same order",c:true},{l:"B",v:"Same no. of rows"},{l:"C",v:"Same no. of columns"},{l:"D",v:"Square matrices"}],s:"Addition requires same order."},
    {t:"I_3 is identity matrix of order:",p:"Identity",o:[{l:"A",v:"3",c:true},{l:"B",v:"2"},{l:"C",v:"4"},{l:"D",v:"1"}],s:"I_3 is 3×3 identity matrix."},
    {t:"If A=[[1,2],[3,4]], 2A=",p:"Scalar",o:[{l:"A",v:"[[2,4],[6,8]]",c:true},{l:"B",v:"[[2,4],[3,4]]"},{l:"C",v:"[[2,2],[6,8]]"},{l:"D",v:"[[1,4],[3,8]]"}],s:"Multiply each element by 2."},
    {t:"AB defined when:",p:"Multiplication",o:[{l:"A",v:"A cols = B rows",c:true},{l:"B",v:"A rows = B cols"},{l:"C",v:"Same order"},{l:"D",v:"Square only"}],s:"Matrix multiplication: A_{m×n} × B_{n×p}."}
  ]},
  {num:17,name:"Determinants",q:[
    {t:"|A|=5, order 3, then |2A|=",p:"Properties",o:[{l:"A",v:"40",c:true},{l:"B",v:"10"},{l:"C",v:"20"},{l:"D",v:"80"}],s:"|kA| = k^n|A| = 8x5=40."},
    {t:"Value of |1 2; 3 4|:",p:"Determinants",o:[{l:"A",v:"-2",c:true},{l:"B",v:"2"},{l:"C",v:"10"},{l:"D",v:"-10"}],s:"1x4-2x3=4-6=-2."},
    {t:"If two rows identical, det =",p:"Properties",o:[{l:"A",v:"0",c:true},{l:"B",v:"1"},{l:"C",v:"Cannot say"},{l:"D",v:"Negative"}],s:"Property: det=0 if rows identical."},
    {t:"Area of triangle (0,0),(3,0),(0,4):",p:"Application",o:[{l:"A",v:"6",c:true},{l:"B",v:"12"},{l:"C",v:"3"},{l:"D",v:"24"}],s:"Area = 1/2|det| = 1/2x12=6."},
    {t:"For 3×3 matrix, det exists if:",p:"Properties",o:[{l:"A",v:"Always defined",c:true},{l:"B",v:"Only if symmetric"},{l:"C",v:"Only if invertible"},{l:"D",v:"Only if I-A=0"}],s:"Determinant defined for all square matrices."},
    {t:"|A^T| =",p:"Properties",o:[{l:"A",v:"|A|",c:true},{l:"B",v:"0"},{l:"C",v:"-|A|"},{l:"D",v:"|A|^2"}],s:"|A^T| = |A|."},
    {t:"If |A| ? 0, A is:",p:"Inverse",o:[{l:"A",v:"Non-singular",c:true},{l:"B",v:"Singular"},{l:"C",v:"Symmetric"},{l:"D",v:"Zero matrix"}],s:"Non-singular means det ? 0."},
    {t:"A^{-1} = adj(A)/|A| when:",p:"Inverse",o:[{l:"A",v:"|A| ? 0",c:true},{l:"B",v:"|A| = 0"},{l:"C",v:"A is symmetric"},{l:"D",v:"A is diagonal"}],s:"Inverse exists only when |A| ? 0."}
  ]},
  {num:18,name:"Continuity and Differentiability",q:[
    {t:"f(x)=|x| at x=0:",p:"Continuity",o:[{l:"A",v:"Continuous, not diff",c:true},{l:"B",v:"Continuous and diff"},{l:"C",v:"Not continuous"},{l:"D",v:"Neither"}],s:"|x| continuous at 0. LHD=-1, RHD=1 => not differentiable."},
    {t:"d(e^x)/dx =",p:"Differentiation",o:[{l:"A",v:"e^x",c:true},{l:"B",v:"e^x ln e"},{l:"C",v:"x e^{x-1}"},{l:"D",v:"ln x"}],s:"d(e^x)/dx = e^x."},
    {t:"If y=ln(sin x), dy/dx=",p:"Chain Rule",o:[{l:"A",v:"cot x",c:true},{l:"B",v:"tan x"},{l:"C",v:"sec x"},{l:"D",v:"cosec x"}],s:"dy/dx = (1/sin x)cos x = cot x."},
    {t:"d(tan^{-1}x)/dx =",p:"Differentiation",o:[{l:"A",v:"1/(1+x^2)",c:true},{l:"B",v:"1/(1-x^2)"},{l:"C",v:"x/(1+x^2)"},{l:"D",v:"1/(x^2-1)"}],s:"d(tan^{-1}x)/dx = 1/(1+x^2)."},
    {t:"f(x) = x^2 at x=2 is:",p:"Continuity",o:[{l:"A",v:"Continuous & diff.",c:true},{l:"B",v:"Not continuous"},{l:"C",v:"Continuous not diff."},{l:"D",v:"Neither"}],s:"x^2 is polynomial => everywhere continuous and diff."},
    {t:"d(sin^{-1}x)/dx =",p:"Differentiation",o:[{l:"A",v:"1/v(1-x^2)",c:true},{l:"B",v:"1/(1+x^2)"},{l:"C",v:"-1/v(1-x^2)"},{l:"D",v:"1/v(x^2-1)"}],s:"d(sin^{-1}x)/dx = 1/v(1-x^2)."},
    {t:"Differentiable implies:",p:"Relationship",o:[{l:"A",v:"Continuous",c:true},{l:"B",v:"Discontinuous"},{l:"C",v:"Increasing"},{l:"D",v:"Decreasing"}],s:"Differentiability ? continuity."},
    {t:"f(x)=x^3, f'(0)=",p:"Differentiation",o:[{l:"A",v:"0",c:true},{l:"B",v:"3"},{l:"C",v:"1"},{l:"D",v:"-3"}],s:"f'(x)=3x^2, f'(0)=0."}
  ]},
  {num:19,name:"Applications of Derivatives",q:[
    {t:"Slope of tangent to y=x^2 at (1,1):",p:"Tangent",o:[{l:"A",v:"2",c:true},{l:"B",v:"1"},{l:"C",v:"-2"},{l:"D",v:"3"}],s:"dy/dx=2x. At x=1: 2."},
    {t:"f increasing means f'(x):",p:"Monotonicity",o:[{l:"A",v:">0",c:true},{l:"B",v:"<0"},{l:"C",v:"=0"},{l:"D",v:"<=0"}],s:"f'(x)>0 for increasing function."},
    {t:"dA/dr for circle area at r=5:",p:"Rate of Change",o:[{l:"A",v:"10pi",c:true},{l:"B",v:"25pi"},{l:"C",v:"5pi"},{l:"D",v:"20pi"}],s:"A=pi r^2, dA/dr=2pi r. At r=5: 10pi."},
    {t:"f(x)=x^3 is:",p:"Monotonicity",o:[{l:"A",v:"Strictly increasing",c:true},{l:"B",v:"Strictly decreasing"},{l:"C",v:"Constant"},{l:"D",v:"Neither"}],s:"f'(x)=3x^2>=0 with equality only at x=0. Strictly increasing."},
    {t:"Normal slope = -1/f'(x0) if:",p:"Normal",o:[{l:"A",v:"f'(x0) ? 0",c:true},{l:"B",v:"f'(x0)=0"},{l:"C",v:"Always"},{l:"D",v:"Never"}],s:"Normal slope = -1/f'(x0) when f'(x0) ? 0."},
    {t:"f(x)=x^2 has minimum at:",p:"Maxima-Minima",o:[{l:"A",v:"x=0",c:true},{l:"B",v:"x=1"},{l:"C",v:"x=-1"},{l:"D",v:"x=2"}],s:"f'(x)=2x=0 => x=0. f''(0)=2>0 => minima."},
    {t:"Max value of -x^2+4x+5:",p:"Maxima-Minima",o:[{l:"A",v:"9",c:true},{l:"B",v:"5"},{l:"C",v:"7"},{l:"D",v:"11"}],s:"f'(x)=-2x+4=0 => x=2. f(2)=-4+8+5=9."},
    {t:"f(x)=sin x is increasing in:",p:"Monotonicity",o:[{l:"A",v:"(-pi/2,pi/2)",c:true},{l:"B",v:"(pi/2,3pi/2)"},{l:"C",v:"(0,pi)"},{l:"D",v:"(-pi,0)"}],s:"f'(x)=cos x>0 => x?(-p/2,p/2)."}
  ]},
  {num:20,name:"Integrals",q:[
    {t:"int 2x dx =",p:"Indefinite",o:[{l:"A",v:"x^2+C",c:true},{l:"B",v:"2x^2+C"},{l:"C",v:"x^2/2+C"},{l:"D",v:"x+C"}],s:"int 2x dx = 2.x^2/2+C = x^2+C."},
    {t:"int_0^1 x dx =",p:"Definite",o:[{l:"A",v:"1/2",c:true},{l:"B",v:"1"},{l:"C",v:"0"},{l:"D",v:"2"}],s:"[x^2/2]_0^1 = 1/2."},
    {t:"int sin x dx =",p:"Indefinite",o:[{l:"A",v:"-cos x+C",c:true},{l:"B",v:"cos x+C"},{l:"C",v:"-sin x+C"},{l:"D",v:"sin x+C"}],s:"int sin x dx = -cos x + C."},
    {t:"int_{-1}^{1} x^3 dx =",p:"Definite",o:[{l:"A",v:"0",c:true},{l:"B",v:"1/2"},{l:"C",v:"1"},{l:"D",v:"-1/2"}],s:"x^3 is odd => integral over symmetric limits = 0."},
    {t:"int sec^2 x dx =",p:"Indefinite",o:[{l:"A",v:"tan x+C",c:true},{l:"B",v:"sec x+C"},{l:"C",v:"-cot x+C"},{l:"D",v:"cosec x+C"}],s:"d(tan x)/dx = sec^2 x."},
    {t:"int_0^1 e^x dx =",p:"Definite",o:[{l:"A",v:"e-1",c:true},{l:"B",v:"e"},{l:"C",v:"1"},{l:"D",v:"e+1"}],s:"[e^x]_0^1 = e-1."},
    {t:"int (1/x) dx =",p:"Indefinite",o:[{l:"A",v:"ln|x|+C",c:true},{l:"B",v:"e^x+C"},{l:"C",v:"1/x^2+C"},{l:"D",v:"x+C"}],s:"?(1/x)dx = ln|x| + C."},
    {t:"d/dx [?_0^x t^2 dt] =",p:"Fundamental",o:[{l:"A",v:"x^2",c:true},{l:"B",v:"2x"},{l:"C",v:"0"},{l:"D",v:"x^2/2"}],s:"By FTC, d/dx(?_a^x f(t)dt)=f(x)=x^2."},
    {t:"?_0^{p/2} sin x dx =",p:"Definite",o:[{l:"A",v:"1",c:true},{l:"B",v:"0"},{l:"C",v:"2"},{l:"D",v:"-1"}],s:"[-cos x]_0^{p/2} = 0-(-1)=1."},
    {t:"? cos^2 x dx =",p:"Indefinite",o:[{l:"A",v:"(x+sin2x/2)/2+C",c:true},{l:"B",v:"sin^2 x+C"},{l:"C",v:"x/2+C"},{l:"D",v:"sin x cos x+C"}],s:"cos^2x=(1+cos2x)/2 => ?=x/2+sin2x/4+C."}
  ]},
  {num:21,name:"Applications of Integrals",q:[
    {t:"Area bounded by y=x, x-axis, x=0, x=1:",p:"Area",o:[{l:"A",v:"1/2",c:true},{l:"B",v:"1"},{l:"C",v:"2"},{l:"D",v:"3/2"}],s:"Area = int_0^1 x dx = 1/2."},
    {t:"Area of circle x^2+y^2=a^2:",p:"Area",o:[{l:"A",v:"pi a^2",c:true},{l:"B",v:"2pi a^2"},{l:"C",v:"pi a^2/2"},{l:"D",v:"pi a^2/4"}],s:"Area of circle = pi a^2."},
    {t:"Area bounded by y^2=4x and x=1, y>=0:",p:"Area",o:[{l:"A",v:"4/3",c:true},{l:"B",v:"8/3"},{l:"C",v:"2/3"},{l:"D",v:"16/3"}],s:"Area = int_0^1 2sqrt x dx = 4/3."},
    {t:"Area between y=x and y=x^2:",p:"Area",o:[{l:"A",v:"1/6",c:true},{l:"B",v:"1/3"},{l:"C",v:"1/2"},{l:"D",v:"1"}],s:"Intersect at x=0,1. Area=?_0^1 (x-x^2)dx = 1/6."},
    {t:"Area of region {(x,y): y=0, y=x, x=1}:",p:"Area",o:[{l:"A",v:"1/2",c:true},{l:"B",v:"1"},{l:"C",v:"1/4"},{l:"D",v:"1/3"}],s:"Area under y=x from 0 to 1 = 1/2."},
    {t:"?_0^1 x^2 dx =",p:"Area",o:[{l:"A",v:"1/3",c:true},{l:"B",v:"1/2"},{l:"C",v:"1"},{l:"D",v:"1/4"}],s:"[x^3/3]_0^1 = 1/3."},
    {t:"Area between y=1 and x-axis from x=0 to x=1:",p:"Area",o:[{l:"A",v:"1",c:true},{l:"B",v:"1/2"},{l:"C",v:"0"},{l:"D",v:"2"}],s:"?_0^1 1 dx = 1."}
  ]},
  {num:22,name:"Differential Equations",q:[
    {t:"Order of (y''')^2 + (y'')^3 + y = 0:",p:"Order",o:[{l:"A",v:"3",c:true},{l:"B",v:"2"},{l:"C",v:"1"},{l:"D",v:"6"}],s:"Highest derivative is y''', order=3."},
    {t:"Solution of dy/dx = e^x:",p:"Solution",o:[{l:"A",v:"y = e^x + C",c:true},{l:"B",v:"y = e^x"},{l:"C",v:"y = xe^x + C"},{l:"D",v:"y = ln x + C"}],s:"y = int e^x dx = e^x + C."},
    {t:"Which is NOT a DE?",p:"Basic",o:[{l:"A",v:"x^2+2x+1=0",c:true},{l:"B",v:"dy/dx = x+y"},{l:"C",v:"d^2y/dx^2 + y = 0"},{l:"D",v:"dy/dx = sin x"}],s:"x^2+2x+1=0 is algebraic, not a DE."},
    {t:"Degree of (y')^2 + y = 0:",p:"Degree",o:[{l:"A",v:"2",c:true},{l:"B",v:"1"},{l:"C",v:"0"},{l:"D",v:"3"}],s:"Power of highest derivative y' is 2."},
    {t:"dy/dx = -y/x, general solution:",p:"Solution",o:[{l:"A",v:"xy = C",c:true},{l:"B",v:"x+y = C"},{l:"C",v:"x^2+y^2=C"},{l:"D",v:"y/x = C"}],s:"Separate: dy/y = -dx/x => ln|y|=-ln|x|+C => xy=C."},
    {t:"Order of d^2y/dx^2 + dy/dx = 0:",p:"Order",o:[{l:"A",v:"2",c:true},{l:"B",v:"1"},{l:"C",v:"0"},{l:"D",v:"3"}],s:"Highest derivative is d^2y/dx^2 (order 2)."},
    {t:"Integrating factor for dy/dx + Py = Q:",p:"Linear DE",o:[{l:"A",v:"e^{?Pdx}",c:true},{l:"B",v:"e^{?Qdx}"},{l:"C",v:"?Pdx"},{l:"D",v:"e^{-?Pdx}"}],s:"IF = e^{?Pdx}."},
    {t:"y = Ce^{kx} satisfies:",p:"Solution",o:[{l:"A",v:"dy/dx = ky",c:true},{l:"B",v:"dy/dx = -ky"},{l:"C",v:"dy/dx = k"},{l:"D",v:"dy/dx = y"}],s:"d/dx(Ce^{kx}) = kCe^{kx} = ky."}
  ]},
  {num:23,name:"Vector Algebra",q:[
    {t:"a=2i+3j, b=4i-j, a.b =",p:"Dot Product",o:[{l:"A",v:"5",c:true},{l:"B",v:"8"},{l:"C",v:"11"},{l:"D",v:"3"}],s:"(2)(4)+(3)(-1)=8-3=5."},
    {t:"|i+j| =",p:"Magnitude",o:[{l:"A",v:"sqrt2",c:true},{l:"B",v:"1"},{l:"C",v:"2"},{l:"D",v:"0"}],s:"sqrt(1^2+1^2)=sqrt2."},
    {t:"a.b=0 means vectors are:",p:"Orthogonality",o:[{l:"A",v:"Perpendicular",c:true},{l:"B",v:"Parallel"},{l:"C",v:"Collinear"},{l:"D",v:"Equal"}],s:"Dot product zero => perpendicular."},
    {t:"|a|=3,|b|=4,a.b=0, |axb| =",p:"Cross Product",o:[{l:"A",v:"12",c:true},{l:"B",v:"0"},{l:"C",v:"7"},{l:"D",v:"5"}],s:"|axb| = |a||b|sin90 = 3x4x1=12."},
    {t:"If a = i+j+k, |a| =",p:"Magnitude",o:[{l:"A",v:"v3",c:true},{l:"B",v:"1"},{l:"C",v:"3"},{l:"D",v:"v2"}],s:"|a| = v(1+1+1) = v3."},
    {t:"a×b = 0 means:",p:"Cross Product",o:[{l:"A",v:"Parallel",c:true},{l:"B",v:"Perpendicular"},{l:"C",v:"Unit vectors"},{l:"D",v:"Zero vectors"}],s:"|a×b|=0 => parallel or one is zero."},
    {t:"(i×j).k =",p:"Triple Product",o:[{l:"A",v:"1",c:true},{l:"B",v:"0"},{l:"C",v:"-1"},{l:"D",v:"i"}],s:"i×j=k => k·k=1."},
    {t:"Volume of parallelepiped =",p:"Triple Product",o:[{l:"A",v:"|[abc]|",c:true},{l:"B",v:"[abc]"},{l:"C",v:"|a||b||c|"},{l:"D",v:"a·(b×c)"}],s:"Volume = |a·(b×c)| = |[abc]|."}
  ]},
  {num:24,name:"Three Dimensional Geometry",q:[
    {t:"Distance between (1,2,3) and (4,5,6):",p:"Distance",o:[{l:"A",v:"3sqrt3",c:true},{l:"B",v:"3"},{l:"C",v:"sqrt27"},{l:"D",v:"9"}],s:"d=sqrt(9+9+9)=sqrt27=3sqrt3."},
    {t:"DR of line joining (1,2,3) and (4,5,6):",p:"DR",o:[{l:"A",v:"(3,3,3)",c:true},{l:"B",v:"(1,2,3)"},{l:"C",v:"(4,5,6)"},{l:"D",v:"(5,7,9)"}],s:"DR=(4-1,5-2,6-3)=(3,3,3)."},
    {t:"Plane through origin with normal (1,2,3):",p:"Plane",o:[{l:"A",v:"x+2y+3z=0",c:true},{l:"B",v:"x+y+z=0"},{l:"C",v:"2x+3y+z=0"},{l:"D",v:"x-2y+3z=0"}],s:"1(x)+2(y)+3(z)=0 => x+2y+3z=0."},
    {t:"Angle between (1,0,0) and (0,1,0):",p:"Angle",o:[{l:"A",v:"90 deg",c:true},{l:"B",v:"0 deg"},{l:"C",v:"45 deg"},{l:"D",v:"60 deg"}],s:"x-axis and y-axis => angle = 90 deg."},
    {t:"Equation of xy-plane:",p:"Plane",o:[{l:"A",v:"z=0",c:true},{l:"B",v:"x=0"},{l:"C",v:"y=0"},{l:"D",v:"x+y=0"}],s:"xy-plane: all points have z=0."},
    {t:"DC satisfy:",p:"DC",o:[{l:"A",v:"l^2+m^2+n^2=1",c:true},{l:"B",v:"l+m+n=1"},{l:"C",v:"l^2+m^2+n^2=0"},{l:"D",v:"l+m+n=0"}],s:"Direction cosines: l²+m²+n²=1."},
    {t:"Distance from (0,0,0) to x+y+z=v3:",p:"Distance",o:[{l:"A",v:"1",c:true},{l:"B",v:"v3"},{l:"C",v:"3"},{l:"D",v:"1/v3"}],s:"|0+0+0-v3|/v(1+1+1) = v3/v3 = 1."},
    {t:"Line (x-1)/2=(y-2)/3=(z-3)/4, DR:",p:"DR",o:[{l:"A",v:"(2,3,4)",c:true},{l:"B",v:"(1,2,3)"},{l:"C",v:"(3,5,7)"},{l:"D",v:"(2,3,4)"}],s:"Direction ratios: (2,3,4) from denominators."}
  ]},
  {num:25,name:"Linear Programming",q:[
    {t:"Feasible region in LPP is:",p:"Feasible",o:[{l:"A",v:"Convex",c:true},{l:"B",v:"Concave"},{l:"C",v:"Circular"},{l:"D",v:"Square"}],s:"Feasible region is always convex."},
    {t:"Optimal solution occurs at:",p:"Optimal",o:[{l:"A",v:"A vertex of feasible region",c:true},{l:"B",v:"Interior"},{l:"C",v:"Outside"},{l:"D",v:"Midpoint of edges"}],s:"Optimal at corner points (vertices)."},
    {t:"Objective function in LPP is:",p:"Objective",o:[{l:"A",v:"Linear",c:true},{l:"B",v:"Quadratic"},{l:"C",v:"Cubic"},{l:"D",v:"Exponential"}],s:"Objective function is always linear."},
    {t:"Min Z=2x+3y s.t. x>=0,y>=0,x+y>=4:",p:"LPP",o:[{l:"A",v:"Unbounded",c:true},{l:"B",v:"Bounded"},{l:"C",v:"Empty"},{l:"D",v:"Single point"}],s:"Region goes to infinity => unbounded."},
    {t:"Feasible region for x>=0,y>=0 is:",p:"Feasible",o:[{l:"A",v:"First quadrant",c:true},{l:"B",v:"Second quadrant"},{l:"C",v:"Third quadrant"},{l:"D",v:"Fourth quadrant"}],s:"x>=0,y>=0 => first quadrant."},
    {t:"Max Z=3x+4y s.t. x=0,y=0,x+y=5, corner (0,5): Z=",p:"LPP",o:[{l:"A",v:"20",c:true},{l:"B",v:"15"},{l:"C",v:"25"},{l:"D",v:"12"}],s:"Z=3(0)+4(5)=20."},
    {t:"LPP constraints are always:",p:"Constraints",o:[{l:"A",v:"Linear",c:true},{l:"B",v:"Quadratic"},{l:"C",v:"Cubic"},{l:"D",v:"Exponential"}],s:"Constraints in LPP are linear equations/inequalities."},
    {t:"If feasible region is empty:",p:"Feasible",o:[{l:"A",v:"No solution",c:true},{l:"B",v:"Infinite solutions"},{l:"C",v:"Unique solution"},{l:"D",v:"Multiple solutions"}],s:"Empty feasible region => no solution."}
  ]},
  {num:26,name:"Probability (Class 12)",q:[
    {t:"P(A)=0.4,P(B)=0.5, independent, P(AnB)=",p:"Independent",o:[{l:"A",v:"0.2",c:true},{l:"B",v:"0.9"},{l:"C",v:"0.1"},{l:"D",v:"0.02"}],s:"Independent => P(AnB)=0.4x0.5=0.2."},
    {t:"Bayes theorem deals with:",p:"Bayes",o:[{l:"A",v:"Conditional probability",c:true},{l:"B",v:"Independent events"},{l:"C",v:"Mutually exclusive"},{l:"D",v:"Random variables"}],s:"Bayes: P(A|B)=P(B|A)P(A)/P(B)."},
    {t:"Mean of B(n,p):",p:"Binomial",o:[{l:"A",v:"np",c:true},{l:"B",v:"npq"},{l:"C",v:"sqrt(npq)"},{l:"D",v:"nq"}],s:"Mean of binomial = np."},
    {t:"E(X)=5, E(X^2)=30, Var(X)=",p:"Variance",o:[{l:"A",v:"5",c:true},{l:"B",v:"30"},{l:"C",v:"25"},{l:"D",v:"6"}],s:"Var(X)=E(X^2)-[E(X)]^2=30-25=5."},
    {t:"P(A|B) = P(AnB)/P(B) if:",p:"Conditional",o:[{l:"A",v:"P(B)>0",c:true},{l:"B",v:"P(B)<0"},{l:"C",v:"P(A)>0"},{l:"D",v:"A and B independent"}],s:"Conditional probability defined when P(B)>0."},
    {t:"Variance of B(n,p):",p:"Binomial",o:[{l:"A",v:"npq",c:true},{l:"B",v:"np"},{l:"C",v:"v(npq)"},{l:"D",v:"nq"}],s:"Variance of binomial = npq."},
    {t:"P(A?B) for mutually exclusive:",p:"Addition",o:[{l:"A",v:"P(A)+P(B)",c:true},{l:"B",v:"P(A)P(B)"},{l:"C",v:"P(A)+P(B)-P(AnB)"},{l:"D",v:"P(A)/P(B)"}],s:"Mutually exclusive => P(AnB)=0 => P(A?B)=P(A)+P(B)."},
    {t:"Three coins tossed, P(all heads):",p:"Probability",o:[{l:"A",v:"1/8",c:true},{l:"B",v:"1/4"},{l:"C",v:"1/2"},{l:"D",v:"3/8"}],s:"P(HHH) = (1/2)³ = 1/8."}
  ]}
];

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, {recursive:true});
MATH_CHAPTERS.forEach(function(ch) {
  var navItems = MATH_CHAPTERS.map(function(c) { return {num:c.num, name:c.name}; });
  var questions = ch.q.map(function(qq) {
    return {
      text: qq.t,
      topic: qq.p,
      opts: qq.o.map(function(oo) { return {l:oo.l, t:oo.v, c:oo.c||false}; }),
      sol: qq.s
    };
  });
  var html = buildPage(ch.num, ch.name, questions, navItems);
  var fileName = "maths-chapter-" + ch.num + "-" + slug(ch.name) + ".html";
  var fp = path.join(OUT, fileName);
  fs.writeFileSync(fp, html, "utf-8");
  console.log("Written: " + fp);
});
console.log("Done! Generated " + MATH_CHAPTERS.length + " Maths chapter pages.");
