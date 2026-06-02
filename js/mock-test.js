(function(){
var MOCK = window._mockTestData;
if (!MOCK) return;

var state = {
  answers: {},
  markedForReview: [],
  currentSection: 0,
  currentQ: 0,
  timeLeft: MOCK.duration * 60,
  isActive: true,
  startTime: Date.now()
};

var sections = MOCK.sections;
var questions = MOCK.questions;
var flatQs = [];
sections.forEach(function(s, si){
  s.qStart = flatQs.length;
  questions.forEach(function(q){
    if (q.section === s.name) flatQs.push(q);
  });
  s.qEnd = flatQs.length - 1;
});

var sectionBounds = [];
var idx = 0;
sections.forEach(function(s){
  var start = idx;
  while (idx < flatQs.length && flatQs[idx].section === s.name) idx++;
  sectionBounds.push({start: start, end: idx - 1});
});

function init() {
  renderUI();
  startTimer();
  renderQuestion();
  renderPalette();
}

function formatTime(sec) {
  var m = Math.floor(sec / 60);
  var s = sec % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function startTimer() {
  var timerEl = document.getElementById('mt-timer');
  if (!timerEl) return;
  var interval = setInterval(function(){
    if (!state.isActive) { clearInterval(interval); return; }
    state.timeLeft--;
    timerEl.textContent = formatTime(state.timeLeft);
    if (state.timeLeft <= 300) timerEl.style.color = '#ef4444';
    if (state.timeLeft <= 60) timerEl.style.color = '#ef4444';
    if (state.timeLeft <= 0) {
      clearInterval(interval);
      submitTest();
    }
  }, 1000);
}

function renderUI() {
  var root = document.getElementById('mt-root');
  if (!root) return;
  var h = '';
  h += '<div id="mt-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:var(--bg,#09090b);display:flex;flex-direction:column;overflow:hidden">';

  // Top bar
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:var(--bg-card,#111113);border-bottom:1px solid var(--border,rgba(255,255,255,.06));flex-shrink:0">';
  h += '<div style="display:flex;align-items:center;gap:10px">';
  h += '<span style="font-weight:700;font-size:.9em">' + MOCK.examName + ' Mock Test</span>';
  h += '<span class="mt-badge mt-badge-primary">' + MOCK.totalQuestions + ' Q</span>';
  h += '<span class="mt-badge mt-badge-secondary">' + MOCK.totalMarks + ' Marks</span>';
  h += '</div>';
  h += '<div style="display:flex;align-items:center;gap:12px">';
  h += '<span id="mt-timer" style="font-size:1.1em;font-weight:700;font-family:monospace">' + formatTime(state.timeLeft) + '</span>';
  h += '<button onclick="window._mockTest.submitTest()" class="mt-btn mt-btn-danger" style="padding:6px 14px;font-size:.82em">Submit</button>';
  h += '</div>';
  h += '</div>';

  // Main layout
  h += '<div style="display:flex;flex:1;overflow:hidden">';

  // Left: section tabs + question list
  h += '<div style="width:200px;flex-shrink:0;border-right:1px solid var(--border,rgba(255,255,255,.06));display:flex;flex-direction:column;background:var(--bg-card,#111113)">';
  // Section tabs
  h += '<div id="mt-section-tabs" style="display:flex;flex-direction:column;gap:2px;padding:8px">';
  sections.forEach(function(s, i){
    h += '<button class="mt-section-tab' + (i === 0 ? ' mt-section-tab-active' : '') + '" data-si="' + i + '" onclick="window._mockTest.switchSection(' + i + ')">';
    h += '<span class="mt-section-dot" style="background:' + (s.color || '#a78bfa') + '"></span>';
    h += s.name;
    h += '<span style="font-size:.7em;opacity:.6;margin-left:auto">' + s.count + 'Q</span>';
    h += '</button>';
  });
  h += '</div>';
  // Question grid palette
  h += '<div id="mt-palette" style="flex:1;overflow-y:auto;padding:8px"></div>';
  h += '</div>';

  // Right: question area
  h += '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden">';
  // Question nav
  h += '<div id="mt-qnav" style="display:flex;gap:4px;padding:8px 12px;border-bottom:1px solid var(--border,rgba(255,255,255,.06));flex-wrap:wrap;flex-shrink:0"></div>';
  // Question display
  h += '<div id="mt-question" style="flex:1;overflow-y:auto;padding:16px 20px"></div>';
  // Bottom nav
  h += '<div style="display:flex;justify-content:space-between;padding:10px 16px;border-top:1px solid var(--border,rgba(255,255,255,.06));flex-shrink:0">';
  h += '<button onclick="window._mockTest.prevQuestion()" class="mt-btn mt-btn-secondary" id="mt-prev">&#x2190; Previous</button>';
  h += '<div style="display:flex;gap:8px">';
  h += '<button onclick="window._mockTest.markForReview()" class="mt-btn mt-btn-warning" id="mt-review">Mark for Review</button>';
  h += '<button onclick="window._mockTest.nextQuestion()" class="mt-btn mt-btn-primary" id="mt-next">Save & Next &#x2192;</button>';
  h += '</div>';
  h += '</div>';

  h += '</div>'; // end question area
  h += '</div>'; // end main layout
  h += '</div>'; // end overlay

  // Results overlay (hidden)
  h += '<div id="mt-results" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;background:var(--bg,#09090b);overflow-y:auto;padding:24px"></div>';

  root.innerHTML = h;
}

function renderQuestion() {
  var si = state.currentSection;
  var qi = state.currentQ;
  var bounds = sectionBounds[si];
  var qIdx = bounds.start + qi;
  var q = flatQs[qIdx];
  if (!q) return;

  var qEl = document.getElementById('mt-question');
  var navEl = document.getElementById('mt-qnav');
  if (!qEl) return;

  // Navigation numbers
  var nav = '';
  for (var i = bounds.start; i <= bounds.end; i++) {
    var qq = flatQs[i];
    var cls = 'mt-qnum';
    if (state.answers[qq.id] !== undefined) cls += ' mt-qnum-answered';
    if (state.markedForReview.indexOf(qq.id) !== -1) cls += ' mt-qnum-reviewed';
    if (i === qIdx + bounds.start) cls += ' mt-qnum-active';
    nav += '<div class="' + cls + '" onclick="window._mockTest.goToQuestion(' + i + ')">' + (i - bounds.start + 1) + '</div>';
  }
  navEl.innerHTML = nav;

  // Question
  var h = '';
  h += '<div class="mt-section-badge" style="background:' + (sections[si].color || '#a78bfa') + ';display:inline-block;padding:3px 10px;border-radius:100px;font-size:.72em;font-weight:600;margin-bottom:10px">' + sections[si].name + '</div>';
  h += '<div class="mt-qtext" style="font-size:1em;line-height:1.7;margin-bottom:16px;font-weight:500">Q' + (qIdx + 1) + '. ' + q.text + '</div>';
  h += '<div class="mt-opts" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  q.options.forEach(function(o, oi){
    var selected = state.answers[q.id] === oi;
    var cls = 'mt-opt';
    if (selected) cls += ' mt-opt-selected';
    h += '<div class="' + cls + '" onclick="window._mockTest.selectOption(' + q.id + ',' + oi + ')"><span class="mt-opt-label">' + o.label + '.</span> ' + o.text + '</div>';
  });
  h += '</div>';
  if (state.markedForReview.indexOf(q.id) !== -1) {
    h += '<div style="margin-top:10px;font-size:.8em;color:#f59e0b">&#9873; Marked for Review</div>';
  }
  qEl.innerHTML = h;

  // Update palette
  renderPalette();

  // Update nav buttons
  document.getElementById('mt-prev').style.display = (qi > 0 || si > 0) ? '' : 'none';
  var isLast = (si === sections.length - 1 && qi >= sectionBounds[si].end - sectionBounds[si].start);
  var nextBtn = document.getElementById('mt-next');
  if (isLast) {
    nextBtn.textContent = 'Submit';
    nextBtn.onclick = function(){ window._mockTest.submitTest(); };
  } else {
    nextBtn.textContent = 'Save & Next \u2192';
    nextBtn.onclick = function(){ window._mockTest.nextQuestion(); };
  }
}

function renderPalette() {
  var el = document.getElementById('mt-palette');
  if (!el) return;
  var h = '<div style="font-size:.72em;text-transform:uppercase;color:var(--text-muted,#52525b);margin-bottom:6px;padding:0 4px">Question Palette</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px">';
  flatQs.forEach(function(q, i){
    var cls = 'mt-palette-num';
    if (state.answers[q.id] !== undefined) cls += ' mt-palette-answered';
    else if (state.markedForReview.indexOf(q.id) !== -1) cls += ' mt-palette-reviewed';
    else cls += ' mt-palette-unanswered';
    h += '<div class="' + cls + '" onclick="window._mockTest.goToQuestion(' + i + ')" title="Q' + (i+1) + '">' + (i+1) + '</div>';
  });
  h += '</div>';
  h += '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;font-size:.68em">';
  h += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(52,211,153,.3);margin-right:3px;vertical-align:middle"></span>Answered</span>';
  h += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(245,158,11,.3);margin-right:3px;vertical-align:middle"></span>Reviewed</span>';
  h += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(255,255,255,.08);margin-right:3px;vertical-align:middle"></span>Unanswered</span>';
  h += '</div>';
  el.innerHTML = h;
}

function selectOption(qId, oi) {
  if (!state.isActive) return;
  state.answers[qId] = oi;
  // Remove from review if answered
  var ri = state.markedForReview.indexOf(qId);
  if (ri !== -1) state.markedForReview.splice(ri, 1);
  renderQuestion();
}

function markForReview() {
  if (!state.isActive) return;
  var si = state.currentSection;
  var qi = state.currentQ;
  var bounds = sectionBounds[si];
  var qIdx = bounds.start + qi;
  var q = flatQs[qIdx];
  if (!q) return;
  var ri = state.markedForReview.indexOf(q.id);
  if (ri === -1) state.markedForReview.push(q.id);
  else state.markedForReview.splice(ri, 1);
  renderQuestion();
}

function switchSection(si) {
  if (si < 0 || si >= sections.length) return;
  state.currentSection = si;
  state.currentQ = 0;
  // Update tab active
  document.querySelectorAll('.mt-section-tab').forEach(function(el, i){
    el.classList.toggle('mt-section-tab-active', i === si);
  });
  renderQuestion();
}

function goToQuestion(globalIdx) {
  for (var si = 0; si < sectionBounds.length; si++) {
    var b = sectionBounds[si];
    if (globalIdx >= b.start && globalIdx <= b.end) {
      state.currentSection = si;
      state.currentQ = globalIdx - b.start;
      document.querySelectorAll('.mt-section-tab').forEach(function(el, i){
        el.classList.toggle('mt-section-tab-active', i === si);
      });
      renderQuestion();
      return;
    }
  }
}

function prevQuestion() {
  var si = state.currentSection;
  var qi = state.currentQ;
  if (qi > 0) {
    state.currentQ = qi - 1;
  } else if (si > 0) {
    state.currentSection = si - 1;
    state.currentQ = sectionBounds[state.currentSection].end - sectionBounds[state.currentSection].start;
    document.querySelectorAll('.mt-section-tab').forEach(function(el, i){
      el.classList.toggle('mt-section-tab-active', i === state.currentSection);
    });
  }
  renderQuestion();
}

function nextQuestion() {
  var si = state.currentSection;
  var qi = state.currentQ;
  var bounds = sectionBounds[si];
  if (qi < bounds.end - bounds.start) {
    state.currentQ = qi + 1;
  } else if (si < sections.length - 1) {
    state.currentSection = si + 1;
    state.currentQ = 0;
    document.querySelectorAll('.mt-section-tab').forEach(function(el, i){
      el.classList.toggle('mt-section-tab-active', i === state.currentSection);
    });
  }
  renderQuestion();
}

function submitTest() {
  if (!confirm('Are you sure you want to submit the test?')) return;
  state.isActive = false;

  var results = [];
  var total = 0, correct = 0, wrong = 0, unattempted = 0;
  var sectionStats = {};

  flatQs.forEach(function(q){
    var ans = state.answers[q.id];
    var isCorrect = false;
    if (ans === undefined) {
      unattempted++;
    } else {
      total++;
      var isCorrect = q.options[ans].correct;
      if (isCorrect) {
        correct++;
      } else {
        wrong++;
      }
    }
    if (!sectionStats[q.section]) sectionStats[q.section] = {total:0, correct:0, wrong:0, unattempted:0};
    sectionStats[q.section].total++;
    if (ans === undefined) sectionStats[q.section].unattempted++;
    else if (q.options[ans].correct) sectionStats[q.section].correct++;
    else sectionStats[q.section].wrong++;
  });

  var score = correct * MOCK.perQuestionMarks;
  if (MOCK.hasNegative) score -= wrong * parseFloat(MOCK.negativeMarking);
  var accuracy = total > 0 ? Math.round(correct / total * 100) : 0;

  // Render results
  var root = document.getElementById('mt-results');
  if (!root) return;
  document.getElementById('mt-overlay').style.display = 'none';
  root.style.display = 'block';

  var h = '';
  h += '<div style="max-width:800px;margin:0 auto">';
  h += '<h1 style="font-size:1.5em;font-weight:900;margin-bottom:4px">Test Results</h1>';
  h += '<p style="color:var(--text-sec,#a1a1aa);font-size:.85em;margin-bottom:20px">' + MOCK.examName + ' Mock Test</p>';

  // Score card
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px">';
  h += '<div class="mt-stat-card"><div class="mt-stat-value" style="color:#34d399">' + score.toFixed(1) + '</div><div class="mt-stat-label">Score (' + MOCK.totalMarks + ')</div></div>';
  h += '<div class="mt-stat-card"><div class="mt-stat-value" style="color:#a78bfa">' + accuracy + '%</div><div class="mt-stat-label">Accuracy</div></div>';
  h += '<div class="mt-stat-card"><div class="mt-stat-value" style="color:#34d399">' + correct + '</div><div class="mt-stat-label">Correct</div></div>';
  h += '<div class="mt-stat-card"><div class="mt-stat-value" style="color:#ef4444">' + wrong + '</div><div class="mt-stat-label">Wrong</div></div>';
  h += '<div class="mt-stat-card"><div class="mt-stat-value" style="color:#52525b">' + unattempted + '</div><div class="mt-stat-label">Skipped</div></div>';
  h += '<div class="mt-stat-card"><div class="mt-stat-value" style="color:#f59e0b">' + formatTime(MOCK.duration * 60 - state.timeLeft) + '</div><div class="mt-stat-label">Time Taken</div></div>';
  h += '</div>';

  // Section breakdown
  h += '<h2 style="font-size:1em;font-weight:700;margin:20px 0 10px">Section-wise Performance</h2>';
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:24px">';
  sections.forEach(function(s){
    var st = sectionStats[s.name] || {total:0, correct:0, wrong:0, unattempted:0};
    var secScore = st.correct * MOCK.perQuestionMarks;
    if (MOCK.hasNegative) secScore -= st.wrong * parseFloat(MOCK.negativeMarking);
    var secAcc = st.total > 0 ? Math.round(st.correct / (st.correct + st.wrong) * 100) : 0;
    h += '<div style="background:var(--bg-card,#111113);border:1px solid var(--border,rgba(255,255,255,.06));border-radius:10px;padding:12px">';
    h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="width:8px;height:8px;border-radius:50%;background:' + (s.color||'#a78bfa') + '"></span><span style="font-size:.82em;font-weight:600">' + s.name + '</span></div>';
    h += '<div style="display:flex;gap:8px;font-size:.78em;color:var(--text-sec,#a1a1aa)">';
    h += '<span>Score: <strong style="color:#34d399">' + secScore.toFixed(1) + '</strong></span>';
    h += '<span>Acc: <strong>' + (st.correct + st.wrong > 0 ? secAcc + '%' : 'N/A') + '</strong></span>';
    h += '<span>Correct: <strong style="color:#34d399">' + st.correct + '</strong>/' + st.total + '</span>';
    h += '</div>';
    h += '<div style="margin-top:6px;height:4px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden">';
    var pct = st.total > 0 ? (st.correct / st.total * 100) : 0;
    h += '<div style="height:100%;width:' + pct + '%;background:' + (s.color||'#a78bfa') + ';border-radius:4px"></div>';
    h += '</div>';
    h += '</div>';
  });
  h += '</div>';

  // Review button
  h += '<h2 style="font-size:1em;font-weight:700;margin:20px 0 10px">Review All Questions</h2>';
  h += '<div style="display:flex;gap:8px;margin-bottom:20px">';
  h += '<button onclick="window._mockTest.showReview()" class="mt-btn mt-btn-primary">View Detailed Review</button>';
  h += '<button onclick="window._mockTest.closeResults()" class="mt-btn mt-btn-secondary">Close</button>';
  h += '</div>';

  h += '</div>'; // end container

  root.innerHTML = h;
}

function showReview() {
  var root = document.getElementById('mt-results');
  if (!root) return;
  var h = '<div style="max-width:800px;margin:0 auto">';
  h += '<h1 style="font-size:1.3em;font-weight:900;margin-bottom:4px">Answer Review</h1>';
  h += '<p style="color:var(--text-sec,#a1a1aa);font-size:.85em;margin-bottom:20px">Review all questions with correct answers and solutions</p>';
  h += '<button onclick="window._mockTest.showResults()" class="mt-btn mt-btn-secondary" style="margin-bottom:16px">&#x2190; Back to Results</button>';

  flatQs.forEach(function(q, i){
    var ans = state.answers[q.id];
    var isCorrect = ans !== undefined && q.options[ans].correct;
    var isWrong = ans !== undefined && !q.options[ans].correct;
    var isUnattempted = ans === undefined;
    var borderColor = isCorrect ? '#34d399' : (isWrong ? '#ef4444' : '#52525b');

    h += '<div style="background:var(--bg-card,#111113);border:1px solid var(--border,rgba(255,255,255,.06));border-left:3px solid ' + borderColor + ';border-radius:0 10px 10px 0;padding:14px;margin-bottom:12px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">';
    h += '<span style="font-weight:600;font-size:.82em">Q' + (i+1) + ' <span style="font-weight:400;color:var(--text-sec,#a1a1aa)">[' + q.section + ']</span></span>';
    if (isCorrect) h += '<span style="font-size:.75em;padding:2px 8px;border-radius:100px;background:rgba(52,211,153,.15);color:#34d399">Correct</span>';
    else if (isWrong) h += '<span style="font-size:.75em;padding:2px 8px;border-radius:100px;background:rgba(239,68,68,.15);color:#ef4444">Wrong</span>';
    else h += '<span style="font-size:.75em;padding:2px 8px;border-radius:100px;background:rgba(82,82,91,.15);color:#52525b">Skipped</span>';
    h += '</div>';
    h += '<div style="font-size:.88em;margin-bottom:8px">' + q.text + '</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">';
    q.options.forEach(function(o, oi){
      var cls = '';
      if (o.correct) cls += ' style="color:#34d399;font-weight:600"';
      else if (oi === ans) cls += ' style="color:#ef4444"';
      h += '<div' + cls + ' style="font-size:.82em;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,.03)">' + o.label + '. ' + o.text + (o.correct ? ' &#10003;' : '') + '</div>';
    });
    h += '</div>';
    if (q.solution) {
      h += '<div style="margin-top:8px;padding:8px;background:rgba(167,139,250,.06);border-radius:6px;font-size:.8em;color:var(--text-sec,#a1a1aa)"><strong style="color:#a78bfa">Solution:</strong> ' + q.solution + '</div>';
    }
    h += '</div>';
  });

  h += '<button onclick="window._mockTest.showResults()" class="mt-btn mt-btn-secondary" style="margin-top:8px">&#x2190; Back to Results</button>';
  h += '</div>';
  root.innerHTML = h;
}

function showResults() {
  submitTest();
}

function closeResults() {
  document.getElementById('mt-results').style.display = 'none';
}

// Styles
var style = document.createElement('style');
style.textContent = `
#mt-overlay *{box-sizing:border-box}
.mt-badge{display:inline-block;padding:2px 8px;border-radius:100px;font-size:.7em;font-weight:600;vertical-align:middle}
.mt-badge-primary{background:rgba(167,139,250,.15);color:#a78bfa}
.mt-badge-secondary{background:rgba(255,255,255,.06);color:#a1a1aa}
.mt-btn{padding:8px 18px;border-radius:100px;font-weight:600;font-size:.82em;border:none;cursor:pointer;transition:all .15s;white-space:nowrap}
.mt-btn-primary{background:rgba(167,139,250,.15);color:#a78bfa}
.mt-btn-primary:hover{background:rgba(167,139,250,.25)}
.mt-btn-secondary{background:rgba(255,255,255,.06);color:#a1a1aa}
.mt-btn-secondary:hover{background:rgba(255,255,255,.1)}
.mt-btn-danger{background:rgba(239,68,68,.15);color:#ef4444}
.mt-btn-danger:hover{background:rgba(239,68,68,.25)}
.mt-btn-warning{background:rgba(245,158,11,.15);color:#f59e0b}
.mt-btn-warning:hover{background:rgba(245,158,11,.25)}
.mt-section-tab{display:flex;align-items:center;gap:6px;padding:7px 10px;border:none;border-radius:6px;font-size:.78em;font-weight:500;background:transparent;color:#a1a1aa;cursor:pointer;text-align:left;transition:all .15s;width:100%}
.mt-section-tab:hover{background:rgba(255,255,255,.04);color:#fafafa}
.mt-section-tab-active{background:rgba(167,139,250,.1);color:#a78bfa}
.mt-section-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.mt-qnum{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:.72em;font-weight:600;cursor:pointer;background:rgba(255,255,255,.06);color:#a1a1aa;transition:all .15s}
.mt-qnum:hover{background:rgba(255,255,255,.1);color:#fafafa}
.mt-qnum-active{border:1px solid #a78bfa;color:#a78bfa}
.mt-qnum-answered{background:rgba(52,211,153,.2);color:#34d399}
.mt-qnum-reviewed{background:rgba(245,158,11,.2);color:#f59e0b}
.mt-opt{padding:10px 14px;border-radius:8px;border:1px solid var(--border,rgba(255,255,255,.06));cursor:pointer;font-size:.88em;transition:all .15s;color:var(--text-sec,#a1a1aa)}
.mt-opt:hover{border-color:rgba(255,255,255,.15)}
.mt-opt-selected{border-color:#a78bfa;background:rgba(167,139,250,.1);color:#fafafa}
.mt-opt-label{font-weight:600;color:var(--text-muted,#52525b)}
.mt-palette-num{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:.68em;font-weight:600;cursor:pointer;transition:all .15s}
.mt-palette-num:hover{opacity:.8}
.mt-palette-answered{background:rgba(52,211,153,.25);color:#34d399}
.mt-palette-reviewed{background:rgba(245,158,11,.25);color:#f59e0b}
.mt-palette-unanswered{background:rgba(255,255,255,.06);color:#52525b}
.mt-stat-card{background:var(--bg-card,#111113);border:1px solid var(--border,rgba(255,255,255,.06));border-radius:10px;padding:14px;text-align:center}
.mt-stat-value{font-size:1.3em;font-weight:800}
.mt-stat-label{font-size:.72em;color:var(--text-muted,#52525b);margin-top:2px;text-transform:uppercase}
`;
document.head.appendChild(style);

// Export public API
window._mockTest = {
  init: init,
  selectOption: selectOption,
  markForReview: markForReview,
  switchSection: switchSection,
  goToQuestion: goToQuestion,
  prevQuestion: prevQuestion,
  nextQuestion: nextQuestion,
  submitTest: submitTest,
  showReview: showReview,
  showResults: showResults,
  closeResults: closeResults
};

})();
