'use strict';
// Mock test engine: timer, scoring, review, percentile simulation.
// Usage: data-exam="upsc" data-paper="upsc-prelims-2023-gs1" on the page body.

(function () {
  // Read data attributes lazily — they are set by the inline config script
  // which runs after this IIFE. Use getters so values are always current.
  function cfg() {
    return {
      exam: document.body.getAttribute('data-exam') || '',
      paper: document.body.getAttribute('data-paper') || ''
    };
  }
  function paperDataPath() {
    return 'papers-data/' + cfg().paper + '.json';
  }

  var state = {
    questions: [],
    current: 0,
    answers: {},        // qIndex -> option index
    marked: {},         // qIndex -> true
    timeLeft: 0,        // seconds
    timerId: null,
    started: false,
    submitted: false,
    totalTime: 0
  };

  var els = {
    grid: document.getElementById('questionGrid'),
    timer: document.getElementById('timerDisplay'),
    currentQ: document.getElementById('currentQuestion'),
    qText: document.getElementById('qText'),
    options: document.getElementById('options'),
    markBtn: document.getElementById('markBtn'),
    nextBtn: document.getElementById('nextBtn'),
    prevBtn: document.getElementById('prevBtn'),
    submitBtn: document.getElementById('submitBtn'),
    resultPanel: document.getElementById('resultPanel'),
    scoreDisplay: document.getElementById('scoreDisplay'),
    percentileDisplay: document.getElementById('percentileDisplay'),
    accuracyDisplay: document.getElementById('accuracyDisplay'),
    reviewList: document.getElementById('reviewList'),
    testWrapper: document.getElementById('testWrapper'),
    introPanel: document.getElementById('introPanel'),
    startBtn: document.getElementById('startBtn'),
    paperTitle: document.getElementById('paperTitle'),
    paperMeta: document.getElementById('paperMeta')
  };

  function loadPaper() {
    fetch(paperDataPath())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var meta = d;
        var arr = Array.isArray(d) ? d : (d.questions || []);
        state.questions = arr.map(function (q, i) {
          var opts = (q.options || []).map(function (o) {
            return typeof o === 'string' ? o : (o && (o.text || o.t || o.label)) || '';
          });
          var correct = 0;
          if (Array.isArray(q.options)) {
            var ci = q.options.findIndex(function (o) { return o && o.correct === true; });
            if (ci >= 0) correct = ci;
          }
          if (q.correct != null) correct = q.correct;
          else if (q.answer != null) correct = q.answer;
          return {
            index: i,
            text: q.text || q.question || '',
            options: opts,
            correct: correct,
            section: q.section || '',
            solution: q.solution || q.explain || ''
          };
        });
        state.totalQuestions = state.questions.length;
        // Determine timer minutes from meta or default 60
        var mins = 60;
        if (d.timerMinutes) mins = d.timerMinutes;
        else if (d.meta && d.meta.timerMinutes) mins = d.meta.timerMinutes;
        else if (state.totalQuestions) mins = Math.max(5, Math.round(state.totalQuestions / 1.5));
        state.totalTime = mins * 60;
        state.timeLeft = state.totalTime;

        if (els.paperTitle) els.paperTitle.textContent = (meta.pageTitle || meta.paper || cfg().paper);
        if (els.paperMeta) {
          els.paperMeta.textContent =
            (meta.exam || '') + ' · ' + state.totalQuestions + ' Q · ' +
            mins + ' min · ' + (d.pageDesc || '');
        }
        var mq = document.getElementById('metaQuestions'); if (mq) mq.textContent = state.totalQuestions;
        var me = document.getElementById('metaExam'); if (me) me.textContent = (meta.exam || cfg().exam || 'Paper');
        var mt = document.getElementById('metaTime'); if (mt) mt.textContent = mins + ' min';
        if (els.testWrapper) els.testWrapper.style.display = 'block';
        if (!state.questions.length) {
          if (els.qText) els.qText.innerHTML = 'This paper has no questions. <a href="papers.html">Choose another paper →</a>';
          return;
        }
        renderGrid();
        startTimer();
        showQuestion(0);
      })
      .catch(function (e) {
        console.error('Mock test: failed to load paper', e);
        if (els.qText) els.qText.innerHTML = 'Could not load this paper. <a href="papers.html">Browse papers →</a>';
      });
  }

  function renderGrid() {
    if (!els.grid) return;
    els.grid.innerHTML = '';
    state.questions.forEach(function (q, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'q-chip';
      btn.textContent = i + 1;
      btn.onclick = function () { showQuestion(i); };
      els.grid.appendChild(btn);
    });
    updateChipStates();
  }

  function updateChipStates() {
    if (!els.grid) return;
    var chips = els.grid.querySelectorAll('.q-chip');
    chips.forEach(function (chip, i) {
      chip.className = 'q-chip';
      if (state.marked[i]) chip.classList.add('marked');
      if (state.answers[i] != null) chip.classList.add('answered');
      if (i === state.current) chip.classList.add('current');
    });
  }

  function showQuestion(i) {
    if (i < 0 || i >= state.questions.length) return;
    state.current = i;
    var q = state.questions[i];
    if (els.qText) els.qText.textContent = 'Q' + (i + 1) + '. ' + q.text;
    if (els.currentQ) els.currentQ.textContent = 'Question ' + (i + 1) + ' of ' + state.questions.length;
    if (els.options) {
      els.options.innerHTML = '';
      q.options.forEach(function (opt, j) {
        var label = document.createElement('label');
        label.className = 'q-option';
        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'q' + i;
        radio.value = j;
        radio.checked = state.answers[i] === j;
        radio.onchange = function () { selectOption(i, j); };
        var span = document.createElement('span');
        span.textContent = String.fromCharCode(65 + j) + ') ' + opt;
        label.appendChild(radio);
        label.appendChild(span);
        els.options.appendChild(label);
      });
    }
    if (els.markBtn) {
      els.markBtn.textContent = state.marked[i] ? 'Unmark' : 'Mark';
    }
    updateChipStates();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectOption(qIndex, optIndex) {
    state.answers[qIndex] = optIndex;
    updateChipStates();
  }

  function toggleMark() {
    state.marked[state.current] = !state.marked[state.current];
    if (els.markBtn) els.markBtn.textContent = state.marked[state.current] ? 'Unmark' : 'Mark';
    updateChipStates();
  }

  function next() { if (state.current < state.questions.length - 1) showQuestion(state.current + 1); }
  function prev() { if (state.current > 0) showQuestion(state.current - 1); }

  function startTimer() {
    if (state.timerId) return;
    state.timerId = setInterval(function () {
      state.timeLeft--;
      updateTimerDisplay();
      if (state.timeLeft <= 0) autoSubmit();
    }, 1000);
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    if (!els.timer) return;
    var m = Math.floor(state.timeLeft / 60);
    var s = state.timeLeft % 60;
    els.timer.textContent =
      (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    if (state.timeLeft < 300) els.timer.style.color = '#ef4444';
  }

  function autoSubmit() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
    submitTest();
  }

  function submitTest() {
    state.submitted = true;
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }

    var correct = 0, attempted = 0, wrong = 0;
    state.questions.forEach(function (q, i) {
      if (state.answers[i] != null) {
        attempted++;
        if (state.answers[i] === q.correct) correct++;
        else wrong++;
      }
    });
    var accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;

    // Percentile simulation: based on accuracy + speed
    var timeTaken = state.totalTime - state.timeLeft;
    var speedScore = timeTaken > 0 ? Math.round((attempted / timeTaken) * 60) : 0;
    var percentile = Math.min(99, Math.max(1, Math.round(accuracy * 0.6 + speedScore * 0.4)));

    // Save to performance dashboard
    var perfKey = 'perf_' + cfg().exam + '_' + cfg().paper;
    var perf = JSON.parse(localStorage.getItem(perfKey) || '{}');
    perf.lastAttempt = {
      date: new Date().toISOString(),
      correct: correct,
      attempted: attempted,
      wrong: wrong,
      accuracy: accuracy,
      percentile: percentile,
      timeTaken: timeTaken,
      totalTime: state.totalTime
    };
    var history = perf.history || [];
    history.push(perf.lastAttempt);
    if (history.length > 50) history = history.slice(-50);
    perf.history = history;
    perf.bestAccuracy = Math.max(perf.bestAccuracy || 0, accuracy);
    perf.bestPercentile = Math.max(perf.bestPercentile || 0, percentile);
    localStorage.setItem(perfKey, JSON.stringify(perf));

    // Show results
    if (els.testWrapper) els.testWrapper.style.display = 'none';
    if (els.introPanel) els.introPanel.style.display = 'none';
    if (els.resultPanel) {
      els.resultPanel.style.display = 'block';
      if (els.scoreDisplay) els.scoreDisplay.textContent = correct + ' / ' + state.questions.length;
      if (els.percentileDisplay) els.percentileDisplay.textContent = percentile + ' percentile';
      if (els.accuracyDisplay) els.accuracyDisplay.textContent = accuracy + '% accuracy';
      renderReview();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderReview() {
    if (!els.reviewList) return;
    els.reviewList.innerHTML = '';
    state.questions.forEach(function (q, i) {
      var userAns = state.answers[i] != null ? q.options[state.answers[i]] : null;
      var isCorrect = state.answers[i] === q.correct;
      var item = document.createElement('div');
      item.className = 'review-item ' + (isCorrect ? 'correct' : 'incorrect');
      var optLetters = q.options.map(function (_, j) { return String.fromCharCode(65 + j); });
      var userLetter = state.answers[i] != null ? optLetters[state.answers[i]] : '--';
      var correctLetter = optLetters[q.correct];
      item.innerHTML =
        '<div class="review-q">Q' + (i + 1) + '. ' + q.text + '</div>' +
        '<div class="review-ans">Your answer: <strong>' + userLetter + '</strong> ' +
        (userAns ? userAns : '') + '</div>' +
        '<div class="review-correct">Correct: <strong>' + correctLetter + '</strong> ' + q.options[q.correct] + '</div>' +
        (q.solution ? '<div class="review-sol">Solution: ' + q.solution + '</div>' : '');
      els.reviewList.appendChild(item);
    });
  }

  // Wire up buttons
  function wire() {
    if (els.startBtn) els.startBtn.onclick = function () {
      if (els.introPanel) els.introPanel.style.display = 'none';
      if (els.testWrapper) els.testWrapper.style.display = 'block';
      startTimer();
      showQuestion(0);
    };
    if (els.markBtn) els.markBtn.onclick = toggleMark;
    if (els.nextBtn) els.nextBtn.onclick = next;
    if (els.prevBtn) els.prevBtn.onclick = prev;
    if (els.submitBtn) els.submitBtn.onclick = submitTest;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { wire(); loadPaper(); });
  else { wire(); loadPaper(); }
})();
