(function(){
var exams = null;
var selectedExam = null;
var selectedTopic = null;
var selectedCount = 0;
var questions = [];
var currentIdx = 0;
var results = [];
var answered = false;

var examGrid = document.getElementById('examGrid');
var topicList = document.getElementById('topicList');
var countGrid = document.getElementById('countGrid');
var stepExam = document.getElementById('stepExam');
var stepTopic = document.getElementById('stepTopic');
var stepCount = document.getElementById('stepCount');
var stepQuiz = document.getElementById('stepQuiz');
var num1 = document.getElementById('num1');
var num2 = document.getElementById('num2');
var num3 = document.getElementById('num3');
var topicSummary = document.getElementById('topicSummary');
var startBtn = document.getElementById('startBtn');
var backToExamBtn = document.getElementById('backToExamBtn');
var backToTopicBtn = document.getElementById('backToTopicBtn');
var qCard = document.getElementById('qCard');
var qNumDisplay = document.getElementById('qNumDisplay');
var qProgressFill = document.getElementById('qProgressFill');
var qTopicTag = document.getElementById('qTopicTag');
var qText = document.getElementById('qText');
var qOptions = document.getElementById('qOptions');
var nextBtn = document.getElementById('nextBtn');
var resultCard = document.getElementById('resultCard');
var resultArea = document.getElementById('resultArea');
var scorePct = document.getElementById('scorePct');
var correctCount = document.getElementById('correctCount');
var wrongCount = document.getElementById('wrongCount');
var accuracyDisplay = document.getElementById('accuracyDisplay');
var reviewList = document.getElementById('reviewList');
var retryBtn = document.getElementById('retryBtn');
var homeBtn = document.getElementById('homeBtn');

var qsa = function(s) { return document.querySelectorAll(s); };

function loadScript(src, cb){
  var s = document.createElement('script');
  s.src = src + '?' + Date.now();
  s.onload = cb;
  s.onerror = function(){ if (cb) cb(new Error('Failed to load ' + src)); };
  document.head.appendChild(s);
}

function loadIndex(){
  if (location.protocol === 'file:') {
    loadScript('data/topic-index.js', function(err){
      if (!err && window.__topicIndex) { exams = window.__topicIndex.exams; renderExamGrid(); applyDeepLink(); }
    });
    return;
  }
  fetch('data/topic-index.json?' + Date.now())
    .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(d){ exams = d.exams; renderExamGrid(); applyDeepLink(); })
    .catch(function(){});
}

function applyDeepLink(){
  if (typeof URLSearchParams === 'undefined') return;
  var params = new URLSearchParams(location.search);
  var exam = params.get('exam');
  var topic = params.get('topic');
  var wanted = parseInt(params.get('n'), 10);
  if (!exam || !exams[exam]) return;
  selectExam(exam);
  if (!topic) return;
  var sections = exams[exam].sections || [];
  var found = null;
  for (var i = 0; i < sections.length; i++) {
    if (sections[i].name === topic) { found = sections[i]; break; }
  }
  if (!found) return;
  selectTopic(topic);
  if (!isFinite(wanted) || wanted <= 0) return;
  var options = [];
  qsa('.count-btn').forEach(function (b) { options.push(parseInt(b.dataset.count, 10)); });
  var pick = null;
  options.forEach(function (o) {
    if (o <= wanted && (pick === null || o > pick)) pick = o;
  });
  if (pick === null && options.length) pick = Math.min.apply(null, options);
  if (pick !== null) selectCount(pick);
}

function renderExamGrid(){
  examGrid.innerHTML = '';
  var keys = Object.keys(exams);
  keys.sort();
  for (var k of keys) {
    var e = exams[k];
    var btn = document.createElement('div');
    btn.className = 'exam-btn';
    btn.dataset.key = k;
    btn.innerHTML = e.name + '<span class="count">' + e.total + ' questions · ' + e.sections.length + ' topics</span>';
    btn.onclick = function(){ selectExam(this.dataset.key); };
    examGrid.appendChild(btn);
  }
}

function selectExam(key){
  selectedExam = key;
  selectedTopic = null;
  selectedCount = 0;
  var btns = qsa('.exam-btn');
  for (var b of btns) b.classList.remove('selected');
  var active = examGrid.querySelector('[data-key="' + key + '"]');
  if (active) active.classList.add('selected');
  num1.textContent = '✓';
  num1.className = 'num done';
  renderTopics(key);
  stepTopic.style.display = 'block';
  stepTopic.scrollIntoView({behavior:'smooth', block:'start'});
}

function renderTopics(key){
  topicList.innerHTML = '';
  var e = exams[key];
  for (var s of e.sections) {
    var btn = document.createElement('div');
    btn.className = 'topic-btn';
    btn.dataset.name = s.name;
    btn.innerHTML = s.name + '<span class="t-count">' + s.count + ' questions</span>';
    btn.onclick = function(){ selectTopic(this.dataset.name); };
    topicList.appendChild(btn);
  }
}

function selectTopic(name){
  selectedTopic = name;
  selectedCount = 0;
  startBtn.disabled = true;
  var btns = qsa('.topic-btn');
  for (var b of btns) b.classList.remove('selected');
  var active = topicList.querySelector('[data-name="' + name + '"]');
  if (active) active.classList.add('selected');
  num2.textContent = '✓';
  num2.className = 'num done';
  renderCountOptions(name);
  stepCount.style.display = 'block';
  stepCount.scrollIntoView({behavior:'smooth', block:'start'});
}

function renderCountOptions(name){
  countGrid.innerHTML = '';
  var e = exams[selectedExam];
  var section = null;
  for (var s of e.sections) { if (s.name === name) { section = s; break; } }
  var max = section ? section.count : 15;
  var opts = [];
  if (max >= 5) opts.push(5);
  if (max >= 10) opts.push(10);
  if (max >= 15) opts.push(15);
  if (max >= 20) opts.push(20);
  if (max >= 50) opts.push(50);
  if (max < 5) opts.push(max);
  opts = opts.filter(function(v,i,a){ return a.indexOf(v) === i; });
  for (var c of opts) {
    var btn = document.createElement('div');
    btn.className = 'count-btn';
    btn.textContent = c + ' questions';
    btn.dataset.count = c;
    btn.onclick = function(){
      var ci = document.getElementById('customCount');
      if (ci) ci.value = '';
      var ch = document.getElementById('customCountHint');
      if (ch) ch.textContent = '';
      selectCount(parseInt(this.dataset.count));
    };
    countGrid.appendChild(btn);
  }
  topicSummary.textContent = selectedExamName() + ' → ' + name;
  var customInput = document.getElementById('customCount');
  if(customInput) customInput.value = '';
  var customHint = document.getElementById('customCountHint');
  if(customHint) customHint.textContent = '';
}

function availableCount(){
  if (!selectedExam || !selectedTopic || !exams || !exams[selectedExam]) return 0;
  var sections = exams[selectedExam].sections || [];
  for (var i = 0; i < sections.length; i++) {
    if (sections[i].name === selectedTopic) return sections[i].count;
  }
  return 0;
}

function selectedExamName(){
  return exams[selectedExam] ? exams[selectedExam].name : selectedExam;
}

function selectCount(n){
  selectedCount = n;
  var btns = qsa('.count-btn');
  for (var b of btns) b.classList.remove('selected');
  var active = countGrid.querySelector('[data-count="' + n + '"]');
  if (active) active.classList.add('selected');
  num3.textContent = '✓';
  num3.className = 'num done';
  startBtn.disabled = false;
}

var customCountInput = document.getElementById('customCount');
var customCountHint = document.getElementById('customCountHint');
if (customCountInput) {
  customCountInput.addEventListener('input', function(){
    var raw = parseInt(this.value, 10);
    var max = availableCount();
    if (!isFinite(raw) || raw <= 0 || max <= 0) {
      if (customCountHint) customCountHint.textContent = '';
      startBtn.disabled = true;
      selectedCount = 0;
      return;
    }
    var v = Math.min(raw, max);
    selectCount(v);
    if (customCountHint) {
      customCountHint.textContent = 'Will use ' + v + ' of ' + max + ' available' + (raw > max ? ' (capped at ' + max + ')' : '');
    }
  });
}

startBtn.onclick = function(){
  if (!selectedExam || !selectedTopic || !selectedCount) return;
  startBtn.disabled = true;
  startBtn.textContent = 'Loading questions...';
  loadFullExamData();
}

function loadFullExamData(){
  if (location.protocol === 'file:') {
    loadScript('data/topics/' + selectedExam + '.js', function(err){
      if (err) { resetStartBtn(); return; }
      if (window.__examData) { buildQuestions(window.__examData); }
      else { resetStartBtn(); }
    });
    return;
  }
  fetch('data/topics/' + selectedExam + '.json?' + Date.now())
    .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(d){ buildQuestions(d); })
    .catch(function(){ resetStartBtn(); });
}

function resetStartBtn(){
  startBtn.disabled = false;
  startBtn.textContent = 'Start Test';
}

function buildQuestions(examData){
  var section = null;
  for (var s of examData.sections) { if (s.name === selectedTopic) { section = s; break; } }
  if (!section || !section.questions.length) { resetStartBtn(); return; }
  var pool = section.questions.slice();
  shuffle(pool);
  questions = pool.slice(0, selectedCount);
  currentIdx = 0;
  results = [];
  startQuiz();
}

function shuffle(a){
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
}

function startQuiz(){
  stepExam.style.display = 'none';
  stepTopic.style.display = 'none';
  stepCount.style.display = 'none';
  stepQuiz.style.display = 'block';
  resultCard.classList.add('hidden');
  resultArea.classList.remove('hidden');
  resultArea.innerHTML = '';
  qCard.style.display = 'block';
  showQuestion();
}

function showQuestion(){
  if (currentIdx >= questions.length) {
    showResults();
    return;
  }
  answered = false;
  nextBtn.disabled = true;
  var q = questions[currentIdx];
  qNumDisplay.textContent = 'Question ' + (currentIdx + 1) + ' of ' + questions.length;
  qProgressFill.style.width = ((currentIdx / questions.length) * 100) + '%';
  qTopicTag.textContent = selectedTopic;
  qText.textContent = q.text;
  renderDiagram(q);
  qOptions.innerHTML = '';
  for (var i = 0; i < q.options.length; i++) {
    var opt = q.options[i];
    var div = document.createElement('div');
    div.className = 'q-opt';
    div.textContent = opt.label + '. ' + opt.text;
    div.dataset.idx = i;
    div.onclick = function(){ selectAnswer(parseInt(this.dataset.idx)); };
    qOptions.appendChild(div);
  }
  var explDiv = document.getElementById('qExplanation');
  if(explDiv) explDiv.style.display = 'none';
  if (currentIdx === questions.length - 1) {
    nextBtn.textContent = 'See Results';
  } else {
    nextBtn.textContent = 'Next Question';
  }
}

function renderDiagram(q){
  var qCard = document.getElementById('qCard');
  var existing = qCard.querySelector('.diagram-wrap');
  if(existing) existing.remove();
  if(!q) return;
  var wrap = document.createElement('div');
  wrap.className = 'diagram-wrap';
  var html = '';
  if(q.imageUrl){
    html += '<div class="diagram-img"><img src="' + q.imageUrl + '" alt="Diagram" style="max-width:100%;height:auto;border:1px solid rgba(255,255,255,.08);border-radius:8px;margin-bottom:8px"></div>';
  }
  if(q.tableData && q.tableData.headers && q.tableData.rows){
    html += '<div class="diagram-table"><table style="width:100%;border-collapse:collapse;font-size:.85em;margin-bottom:8px"><thead>';
    q.tableData.headers.forEach(function(h){ html += '<th style="padding:8px 10px;border:1px solid rgba(255,255,255,.08);text-align:left;background:rgba(167,139,250,.1);color:var(--purple);font-weight:600">' + h + '</th>'; });
    html += '</thead><tbody>';
    q.tableData.rows.forEach(function(row){
      html += '<tr>';
      row.forEach(function(cell){ html += '<td style="padding:8px 10px;border:1px solid rgba(255,255,255,.08);text-align:left;background:rgba(255,255,255,.02)">' + cell + '</td>'; });
      html += '</tr>';
    });
    html += '</tbody></table>';
  }
  if(q.chartData && q.chartData.type && q.chartData.labels){
    html += '<div class="diagram-chart"><canvas id="diagCanvas" width="400" height="200"></canvas></div>';
  }
  wrap.innerHTML = html;
  qCard.insertBefore(wrap, qCard.firstChild);
  if(q.chartData && q.chartData.labels){
    renderChart(q.chartData);
  }
}

function renderChart(data){
  var canvas = document.getElementById('diagCanvas');
  if(!canvas || !window.Chart) return;
  var ctx = canvas.getContext('2d');
  new Chart(ctx, {
    type: data.type || 'bar',
    data: {
      labels: data.labels,
      datasets: data.datasets.map(function(d){ return { label: d.label||'Series', data: d.data, backgroundColor: d.color||'rgba(167,139,250,.6)', borderColor: d.border||'rgba(167,139,250,1)', borderWidth: 1 }; })
    },
    options: { responsive: true, plugins: { legend: { display: true, position: 'top' }, title: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

function selectAnswer(idx){
  if (answered) return;
  answered = true;
  var q = questions[currentIdx];
  var opts = qOptions.querySelectorAll('.q-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].onclick = null;
    opts[i].classList.remove('selected');
    if (i === q.answer) opts[i].classList.add('correct');
    if (i === idx && idx !== q.answer) opts[i].classList.add('wrong');
    opts[i].style.cursor = 'default';
  }
  results.push({ question: q, chosen: idx, correct: idx === q.answer });
  nextBtn.disabled = false;
  var explDiv = document.getElementById('qExplanation');
  if(explDiv){
    explDiv.innerHTML = '<div class="rev-sol">' + (q.solution || 'Correct answer: ' + q.options[q.answer].label + '. ' + q.options[q.answer].text) + '</div>';
    explDiv.style.display = 'block';
  }
}

nextBtn.onclick = function(){
  if (nextBtn.disabled) return;
  currentIdx++;
  showQuestion();
};

function showResults(){
  qCard.style.display = 'none';
  resultCard.classList.remove('hidden');
  var correct = 0;
  var wrong = 0;
  for (var r of results) {
    if (r.correct) correct++;
    else wrong++;
  }
  var total = results.length;
  var pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  scorePct.textContent = pct + '%';
  correctCount.textContent = correct;
  wrongCount.textContent = wrong;
  accuracyDisplay.textContent = pct + '%';
  reviewList.innerHTML = '';
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var q = r.question;
    var div = document.createElement('div');
    div.className = 'rev-item';
    var chosenText = q.options[r.chosen] ? q.options[r.chosen].label + '. ' + q.options[r.chosen].text : '—';
    var answerText = q.options[q.answer] ? q.options[q.answer].label + '. ' + q.options[q.answer].text : '—';
    div.innerHTML =
      '<div class="rev-q">Q' + (i + 1) + '. ' + q.text + '</div>' +
      '<div class="rev-ans"><span class="ck">✔ Correct: ' + answerText + '</span></div>' +
      (r.correct ? '' : '<div class="rev-ans"><span class="cr">✘ You chose: ' + chosenText + '</span></div>') +
      (q.solution ? '<div class="rev-sol">' + q.solution + '</div>' : '');
    reviewList.appendChild(div);
  }
  saveResult(selectedExam, selectedTopic, correct, wrong, total);
  resultCard.scrollIntoView({behavior:'smooth', block:'start'});
  startBtn.disabled = false;
  startBtn.textContent = 'Start Test';
}

function saveResult(examKey, topic, correct, wrong, total){
  var key = 'microtest_results';
  var existing = [];
  try { var raw = localStorage.getItem(key); if (raw) existing = JSON.parse(raw); } catch(e) {}
  existing.push({
    exam: examKey,
    examName: exams[examKey] ? exams[examKey].name : examKey,
    topic: topic,
    correct: correct,
    wrong: wrong,
    total: total,
    pct: Math.round((correct / total) * 100),
    date: new Date().toISOString()
  });
  if (existing.length > 200) existing = existing.slice(-200);
  try { localStorage.setItem(key, JSON.stringify(existing)); } catch(e) {}
}

retryBtn.onclick = function(){ resetToTopics(); };
homeBtn.onclick = function(){ resetToTopics(); };

function resetToTopics(){
  stepExam.style.display = 'block';
  stepTopic.style.display = 'block';
  stepCount.style.display = 'none';
  stepQuiz.style.display = 'none';
  selectedExam = null;
  selectedTopic = null;
  selectedCount = 0;
  num1.textContent = '1'; num1.className = 'num';
  num2.textContent = '2'; num2.className = 'num';
  num3.textContent = '3'; num3.className = 'num';
  var btns = qsa('.exam-btn');
  for (var b of btns) b.classList.remove('selected');
  stepExam.scrollIntoView({behavior:'smooth', block:'start'});
}

backToExamBtn.onclick = function(){
  stepTopic.style.display = 'none';
  stepCount.style.display = 'none';
  selectedExam = null;
  selectedTopic = null;
  selectedCount = 0;
  num1.textContent = '1'; num1.className = 'num';
  num2.textContent = '2'; num2.className = 'num';
  num3.textContent = '3'; num3.className = 'num';
  var btns = qsa('.exam-btn');
  for (var b of btns) b.classList.remove('selected');
  stepExam.scrollIntoView({behavior:'smooth', block:'start'});
};

backToTopicBtn.onclick = function(){
  stepCount.style.display = 'none';
  selectedTopic = null;
  selectedCount = 0;
  startBtn.disabled = true;
  num2.textContent = '2'; num2.className = 'num';
  num3.textContent = '3'; num3.className = 'num';
  var btns = qsa('.topic-btn');
  for (var b of btns) b.classList.remove('selected');
  stepTopic.scrollIntoView({behavior:'smooth', block:'start'});
};

loadIndex();

})();