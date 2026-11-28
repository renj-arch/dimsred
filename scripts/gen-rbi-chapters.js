const fs = require('fs');
const path = require('path');

var ROOT = path.resolve(__dirname, '..');
var bank = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'question-bank', 'rbi.json'), 'utf-8'));

var sections = [
  { key:'Reasoning', file:'reasoning-important-questions.html', title:'RBI Grade B Reasoning Important Questions with Answers',
    desc:'Top 30 RBI Grade B Reasoning important questions covering Puzzles, Seating Arrangement, Syllogism, Coding-Decoding, Inequality, and more.',
    color:'#60a5fa', topicLabel:'Reasoning' },
  { key:'Quantitative Aptitude', file:'quantitative-aptitude-important-questions.html', title:'RBI Grade B Quantitative Aptitude Important Questions',
    desc:'Top 30 RBI Grade B Quantitative Aptitude important questions covering Data Interpretation, Number Series, Quadratic Equations, Simplification, and more.',
    color:'#34d399', topicLabel:'Quant' },
  { key:'English Language', file:'english-important-questions.html', title:'RBI Grade B English Important Questions with Answers',
    desc:'Top 30 RBI Grade B English important questions covering Reading Comprehension, Cloze Test, Error Detection, Vocabulary, and Para Jumbles.',
    color:'#a78bfa', topicLabel:'English' },
  { key:'General Awareness', file:'general-awareness-important-questions.html', title:'RBI Grade B General Awareness Important Questions',
    desc:'Top 30 RBI Grade B General Awareness important questions covering Banking Awareness, Economy, Current Affairs, Static GK, and Financial Awareness.',
    color:'#f59e0b', topicLabel:'GA' }
];

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function genPage(section) {
  var secQs = bank.questions.filter(function(q){ return q.section === section.key; }).slice(0, 30);
  if (secQs.length < 30) { console.log('Warning: only ' + secQs.length + ' questions for ' + section.key); }
  var h = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
  h += '    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  h += '    <title>' + esc(section.title) + '</title>\n';
  h += '    <style>\n';
  h += '        :root{--accent:#8b5cf6;--bg:#0a0a10;--card:#12121c;--border:#1e1e30;--text:#e8e8f0;--text-sec:#9898b0;--text-muted:#6666a0;--emerald:#34d399;--radius:12px}\n';
  h += '        *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}\n';
  h += '        body{background:var(--bg);color:var(--text);min-height:100vh}\n';
  h += '        .container{max-width:820px;margin:0 auto;padding:20px}\n';
  h += '        .nav{background:rgba(0,0,0,.6);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100}\n';
  h += '        .nav-inner{max-width:1100px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:24px}\n';
  h += '        .brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text)}\n';
  h += '        .brand-icon{width:28px;height:28px;border-radius:8px}\n';
  h += '        .brand-text{font-weight:700;font-size:1.1em;letter-spacing:-.3px}\n';
  h += '        .nav-links{margin-left:auto;display:flex;gap:18px}\n';
  h += '        .nav-links a{color:var(--text-sec);text-decoration:none;font-size:.88em;transition:color .2s}\n';
  h += '        .nav-links a:hover{color:var(--text)}\n';
  h += '        .chapter-header{text-align:center;padding:40px 0 30px}\n';
  h += '        .badge{display:inline-block;padding:4px 14px;border-radius:100px;font-size:.72em;font-weight:600;letter-spacing:.5px;text-transform:uppercase;background:rgba(139,92,246,.12);color:var(--accent);margin-bottom:12px}\n';
  h += '        .chapter-header h1{font-size:1.8em;font-weight:800;line-height:1.2;margin-bottom:10px}\n';
  h += '        .chapter-header .sub{color:var(--text-sec);font-size:.92em;max-width:600px;margin:0 auto 14px}\n';
  h += '        .chapter-header .meta{display:flex;justify-content:center;gap:20px;font-size:.78em;color:var(--text-muted)}\n';
  h += '        .chapter-header .meta span{padding:4px 12px;border-radius:100px;border:1px solid var(--border)}\n';
  h += '        .q-card{border:1px solid var(--border);border-radius:var(--radius);padding:22px;margin-bottom:16px;background:var(--card)}\n';
  h += '        .q-num{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font-size:.78em;color:var(--text-muted)}\n';
  h += '        .q-num .q-topic{padding:3px 10px;border-radius:100px;background:rgba(139,92,246,.08);color:var(--accent)}\n';
  h += '        .q-text{font-size:1em;line-height:1.6;margin-bottom:16px;font-weight:500}\n';
  h += '        .q-opts{display:flex;flex-direction:column;gap:8px}\n';
  h += '        .q-opt{padding:12px 16px;border-radius:8px;border:1px solid var(--border);cursor:pointer;transition:all .2s;font-size:.9em}\n';
  h += '        .q-opt:hover{background:rgba(139,92,246,.04);border-color:rgba(139,92,246,.2)}\n';
  h += '        .q-opt.correct{background:rgba(52,211,153,.08);border-color:var(--emerald);color:var(--emerald)}\n';
  h += '        .q-opt.wrong{background:rgba(239,68,68,.08);border-color:#ef4444;color:#ef4444}\n';
  h += '        .q-opt.disabled{pointer-events:none;opacity:.6}\n';
  h += '        .q-soln{display:none;margin-top:16px;padding:14px;border-radius:8px;background:rgba(52,211,153,.04);border:1px solid rgba(52,211,153,.1);font-size:.85em;line-height:1.5;color:var(--text-sec)}\n';
  h += '        .q-soln.show{display:block}\n';
  h += '        .q-soln strong{color:var(--emerald)}\n';
  h += '        .q-result{font-size:.82em;font-weight:700;margin-top:10px}\n';
  h += '        .q-result.correct{color:var(--emerald)}\n';
  h += '        .q-result.wrong{color:#ef4444}\n';
  h += '        .score-bar{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}\n';
  h += '        .score-bar .score{font-size:1.3em;font-weight:800;color:var(--accent)}\n';
  h += '        .score-bar .score .denom{color:var(--text-muted);font-weight:400}\n';
  h += '        .score-bar .btn-reset{padding:7px 18px;border-radius:100px;background:rgba(255,255,255,.04);color:var(--text-sec);border:1px solid var(--border);cursor:pointer;font-size:.78em}\n';
  h += '        .score-bar .btn-reset:hover{background:rgba(255,255,255,.08)}\n';
  h += '        @media print{.nav,.score-bar{display:none}.q-card .q-soln{display:block!important}}\n';
  h += '    </style>\n</head>\n<body>\n';
  h += '    <nav class="nav"><div class="nav-inner"><a href="../index.html" class="brand"><img src="/logo.png" alt="" class="brand-icon"><span class="brand-text">vlymbooq</span></a><div class="nav-links"><a href="../index.html">Home</a><a href="../dashboard.html">Dashboard</a><a href="../community.html">Community</a><a href="../rbi/index.html">RBI</a></div></div></nav>\n';
  h += '    <div class="container">\n';
  h += '        <div class="chapter-header">\n';
  h += '            <div class="badge">RBI Grade B</div>\n';
  h += '            <h1>' + esc(section.title) + '</h1>\n';
  h += '            <div class="sub">' + esc(section.desc) + '</div>\n';
  h += '            <div class="meta"><span>' + secQs.length + ' Questions</span><span>Exam Pattern</span></div>\n';
  h += '        </div>\n';
  h += '        <div class="score-bar"><div><span class="score" id="correct-count">0</span><span class="denom"> / ' + secQs.length + '</span></div><div><span id="accuracy-pct" style="font-weight:700;color:var(--emerald)">0%</span></div><button class="btn-reset" onclick="resetQuiz()">Reset</button></div>\n';
  h += '        <div id="questions-container"></div>\n';
  h += '    </div>\n';
  h += '    <script>\n';
  h += '    var questions = ' + JSON.stringify(secQs.map(function(q, i) {
    return {
      id: i + 1,
      text: q.text,
      topic: section.topicLabel,
      options: q.options.map(function(o, j) {
        return { l: String.fromCharCode(65 + j), t: o.text, c: o.correct };
      }),
      sol: q.solution + (q.explanation ? ' ' + q.explanation : '')
    };
  })) + ';\n';
  h += '    var answered={},correctCount=0;\n';
  h += '    function renderQuestions(){var c=document.getElementById("questions-container"),h="";for(var i=0;i<questions.length;i++){var q=questions[i],o="";for(var j=0;j<q.options.length;j++){o+="<div class=\\"q-opt\\" data-qid=\\""+q.id+"\\" data-idx=\\""+j+"\\" onclick=\\"selectOpt("+q.id+","+j+")\\">"+q.options[j].l+". "+q.options[j].t+"</div>"}h+="<div class=\\"q-card\\" id=\\"q-"+q.id+"\\"><div class=\\"q-num\\"><span>Question "+(i+1)+" of "+questions.length+"</span><span class=\\"q-topic\\">"+q.topic+"</span></div><div class=\\"q-text\\">"+q.text+"</div><div class=\\"q-opts\\">"+o+"</div><div class=\\"q-soln\\" id=\\"soln-"+q.id+"\\"><strong>Correct: "+getCorrectLabel(q)+"</strong><br>"+q.sol+"</div><div class=\\"q-result\\" id=\\"result-"+q.id+"\\"></div></div>"}c.innerHTML=h;updateScore()}\n';
  h += '    function getCorrectLabel(q){for(var i=0;i<q.options.length;i++){if(q.options[i].c)return q.options[i].l+". "+q.options[i].t}return""}\n';
  h += '    function selectOpt(qId,idx){if(answered[qId])return;answered[qId]=true;var q=questions.filter(function(x){return x.id===qId})[0];var opts=document.querySelectorAll("#q-"+qId+" .q-opt");var isCorrect=q.options[idx].c;for(var i=0;i<opts.length;i++)opts[i].classList.add("disabled");if(isCorrect){opts[idx].classList.add("correct");document.getElementById("result-"+qId).textContent="Correct!";document.getElementById("result-"+qId).className="q-result correct";correctCount++}else{opts[idx].classList.add("wrong");document.getElementById("result-"+qId).textContent="Wrong";document.getElementById("result-"+qId).className="q-result wrong";for(var i=0;i<q.options.length;i++){if(q.options[i].c)opts[i].classList.add("correct")}}document.getElementById("soln-"+qId).classList.add("show");updateScore()}\n';
  h += '    function updateScore(){document.getElementById("correct-count").textContent=correctCount;var t=Object.keys(answered).length;document.getElementById("accuracy-pct").textContent=(t>0?Math.round(correctCount/t*100):0)+"%"}\n';
  h += '    function resetQuiz(){if(!confirm("Reset all answers?"))return;answered={};correctCount=0;var cards=document.querySelectorAll(".q-card");for(var i=0;i<cards.length;i++){cards[i].querySelectorAll(".q-opt").forEach(function(e){e.className="q-opt"});cards[i].querySelector(".q-soln").classList.remove("show");cards[i].querySelector(".q-result").className="q-result";cards[i].querySelector(".q-result").textContent=""}updateScore()}\n';
  h += '    renderQuestions();\n';
  h += '    </script>\n</body>\n</html>';

  var fp = path.resolve(ROOT, 'rbi', 'chapters', section.file);
  if (!fs.existsSync(path.dirname(fp))) fs.mkdirSync(path.dirname(fp), {recursive:true});
  fs.writeFileSync(fp, h, 'utf-8');
  console.log('Wrote: ' + fp);
}

for (var i = 0; i < sections.length; i++) {
  genPage(sections[i]);
}

console.log('\nDone! Generated RBI chapter pages.');
