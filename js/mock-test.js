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
  // ?answers=1 turns the test into a study mode that reveals every answer.
  var ANSWERS_MODE = /(?:^|[?&])answers=1/.test(String(location.search || ''));

  // Research Team methods (data/research-invented.json) and a rule-based
  // "quick trick" so a solution shows both the full method and a fast guess.
  var RESEARCH = {};
  try {
    fetch('data/research-invented.json').then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { RESEARCH = (j && j.methods) || {}; }).catch(function () {});
  } catch (e) {}
  function _qaKey(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 160); }
  function researchFor(t) { return RESEARCH[_qaKey(t)] || null; }
  var EXPLAIN = {};
  try {
    fetch('data/question-explain.json').then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { EXPLAIN = (j && j.items) || {}; }).catch(function () {});
  } catch (e) {}
  function explainFor(t) { return EXPLAIN[_qaKey(t)] || null; }
  function quickTrick(t) {
    var s = String(t || '').toLowerCase();
    if (/average|mean/.test(s)) return 'The average must lie between the smallest and largest value, pulled toward the biggest group — reject any option outside that band.';
    if (/percentage|percent|% ?increase|% ?decrease/.test(s)) return 'Build from 10% (shift the decimal), then add multiples; pick the option nearest your estimate.';
    if (/ratio|proportion|respectively/.test(s)) return 'Add the parts for the denominator, then scale; the answer is a simple fraction of the total.';
    if (/profit|loss|cost price|selling price|marked price|discount/.test(s)) return 'Take CP = 100, apply the percentage, then convert — SP/CP gives the answer directly.';
    if (/time and work|efficiency|together|days|hours/.test(s)) return 'Convert to per-day rates, add for "together", and invert; together is always faster than the fastest alone.';
    if (/speed|distance|train|km\/|m\/s/.test(s)) return 'Speeds are in inverse ratio to times for the same distance; fix units first (×5/18 for km/h to m/s).';
    if (/interest|si\b|ci\b|compound|simple/.test(s)) return 'SI is linear (P×R×T/100); CI is slightly more — estimate and pick the nearest, not the linear value.';
    if (/data interpretation|chart|graph|pie|bar|table/.test(s)) return 'Read the axis units first; the answer is usually a clean round figure — reject odd ones.';
    if (/probability|chance/.test(s)) return 'Probability = favourable ÷ total; eliminate options above 1 or outside the obvious range.';
    if (/area|perimeter|volume|radius|diameter/.test(s)) return 'Write the formula, keep units consistent, and sanity-check the magnitude (areas scale as the square).';
    return 'Estimate first, then eliminate options far from your estimate; the paper rarely hides the answer in a messy number.';
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
    revealBtn: document.getElementById('revealBtn'),
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
    var _sb = document.getElementById('solutionBox'); if (_sb && _sb.parentNode) _sb.parentNode.removeChild(_sb);
    if (els.markBtn) {
      els.markBtn.textContent = state.marked[i] ? 'Unmark' : 'Mark';
    }
    updateChipStates();
    if (ANSWERS_MODE) revealAnswer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function revealAnswer() {
    if (!state.questions.length) return;
    var q = state.questions[state.current];
    if (!q) return;
    if (els.options) {
      var labels = els.options.querySelectorAll('label');
      for (var j = 0; j < labels.length; j++) {
        if (j === q.correct) {
          labels[j].style.borderColor = '#34d399';
          labels[j].style.background = 'rgba(52,211,153,.12)';
        }
      }
    }
    var sol = document.getElementById('solutionBox');
    if (!sol) {
      sol = document.createElement('div');
      sol.id = 'solutionBox';
      sol.style.cssText = 'margin-top:10px;padding:10px 12px;border-radius:8px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);font-size:.9em;color:#a1a1aa;line-height:1.6;text-align:left';
      if (els.options && els.options.parentNode) els.options.parentNode.insertBefore(sol, els.options.nextSibling);
    }
    var _res = researchFor(q.text);
    var _trick = quickTrick(q.text);
    var _html = '<strong style="color:#34d399">Answer: ' + String.fromCharCode(65 + q.correct) + ') ' + (q.options[q.correct] || '') + '</strong>';
    if (q.solution) _html += '<br>' + q.solution;
    var _shownTrick = (_res && _res.shortcut) ? _res.shortcut : _trick;
    if (_shownTrick) _html += '<div style="margin-top:8px;color:#f59e0b"><strong>⚡ Quick trick:</strong> ' + _shownTrick + '</div>';
    if (_res) _html += '<div style="margin-top:8px;color:#c4b5fd"><strong>🧪 Research Team — ' + (_res.name || 'method') + (_res.seconds ? ' (' + _res.seconds + 's)' : '') + ':</strong><ol style="margin:4px 0 0 18px">' + (_res.steps || []).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol></div>';
    var _ex = explainFor(q.text);
    if (_ex) {
      var _cl = String.fromCharCode(65 + q.correct);
      var _exHtml = '<div style="margin-top:8px;color:#93c5fd"><strong>Why ' + _cl + ' is right:</strong> ' + (_ex.whyCorrect || '') + '</div>';
      var _w = '';
      q.options.forEach(function (o, j) {
        if (j === q.correct) return;
        var L = String.fromCharCode(65 + j);
        var why = (_ex.wrong || {})[L];
        if (why) _w += '<li><strong>' + L + ') ' + o + '</strong> — ' + why + '</li>';
      });
      if (_w) _exHtml += '<div style="margin-top:4px;color:#fca5a5"><strong>Why the others are wrong:</strong><ul style="margin:4px 0 0 18px">' + _w + '</ul></div>';
      _html += _exHtml;
    }
    sol.innerHTML = _html;
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
      var _revRes = researchFor(q.text), _revTrick = ((_revRes && _revRes.shortcut) ? _revRes.shortcut : quickTrick(q.text));
      var _revEx = explainFor(q.text);
      var _revWrong = '';
      if (_revEx) {
        q.options.forEach(function (o, j) { if (j === q.correct) return; var L = String.fromCharCode(65 + j); var w = (_revEx.wrong || {})[L]; if (w) _revWrong += '<li><strong>' + L + ') ' + o + '</strong> — ' + w + '</li>'; });
      }
      item.innerHTML =
        '<div class="review-q">Q' + (i + 1) + '. ' + q.text + '</div>' +
        '<div class="review-ans">Your answer: <strong>' + userLetter + '</strong> ' +
        (userAns ? userAns : '') + '</div>' +
        '<div class="review-correct">Correct: <strong>' + correctLetter + '</strong> ' + q.options[q.correct] + '</div>' +
        (q.solution ? '<div class="review-sol">Solution: ' + q.solution + '</div>' : '') +
        (_revTrick ? '<div class="review-sol" style="color:#f59e0b">⚡ ' + _revTrick + '</div>' : '') +
        (_revRes ? '<div class="review-sol" style="color:#c4b5fd">🧪 ' + (_revRes.name || 'Research method') + ': ' + (_revRes.steps || []).join(' → ') + '</div>' : '') +
        (_revEx ? '<div class="review-sol" style="color:#93c5fd"><strong>Why ' + correctLetter + ' is right:</strong> ' + (_revEx.whyCorrect || '') + '</div>' : '') +
        (_revWrong ? '<div class="review-sol" style="color:#fca5a5"><strong>Why the others are wrong:</strong><ul style="margin:4px 0 0 18px">' + _revWrong + '</ul></div>' : '');
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
    if (els.revealBtn) els.revealBtn.onclick = revealAnswer;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { wire(); loadPaper(); });
  else { wire(); loadPaper(); }
})();
