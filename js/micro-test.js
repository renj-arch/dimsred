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

function qsa(s) { return document.querySelectorAll(s); }

function loadIndex(){
  var x = new XMLHttpRequest();
  x.open('GET', 'data/topic-index.json?' + Date.now(), true);
  x.onload = function(){
    if (x.status === 200) {
      try {
        var d = JSON.parse(x.responseText);
        exams = d.exams;
        renderExamGrid();
      } catch(e) { console.error('Parse error:', e); }
    }
  };
  x.onerror = function(){ console.error('Failed to load topic index'); };
  x.send();
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
  if (max < 5) opts.push(max);
  opts = opts.filter(function(v,i,a){ return a.indexOf(v) === i; });
  for (var c of opts) {
    var btn = document.createElement('div');
    btn.className = 'count-btn';
    btn.textContent = c + ' questions';
    btn.dataset.count = c;
    btn.onclick = function(){ selectCount(parseInt(this.dataset.count)); };
    countGrid.appendChild(btn);
  }
  topicSummary.textContent = selectedExamName() + ' → ' + name;
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

startBtn.onclick = function(){
  if (!selectedExam || !selectedTopic || !selectedCount) return;
  startBtn.disabled = true;
  startBtn.textContent = 'Loading questions...';
  loadFullExamData();
};

function loadFullExamData(){
  var x = new XMLHttpRequest();
  x.open('GET', 'data/topics/' + selectedExam + '.json?' + Date.now(), true);
  x.onload = function(){
    if (x.status === 200) {
      try {
        var d = JSON.parse(x.responseText);
        buildQuestions(d);
      } catch(e) { console.error('Parse error:', e); resetStartBtn(); }
    } else { resetStartBtn(); }
  };
  x.onerror = function(){ resetStartBtn(); };
  x.send();
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
  if (currentIdx === questions.length - 1) {
    nextBtn.textContent = 'See Results';
  } else {
    nextBtn.textContent = 'Next Question';
  }
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
