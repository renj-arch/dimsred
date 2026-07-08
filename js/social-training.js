(function () {
  var STORAGE_KEY = 'social_training_data';
  var MISTAKE_KEY = 'social_mistakes';
  var SESSION_CACHE_KEY = 'social_session_cache';
  var activeHardMode = false;
  var session = null;
  var timerId = null;
  var currentQuestion = null;
  var _recentQuestions = [];
  var _RECENT_MAX = 30;
  var _loadedCache = {};

  function _isRecent(qtext) { for (var i = 0; i < _recentQuestions.length; i++) { if (_recentQuestions[i] === qtext) return true; } return false; }
  function _addRecent(qtext) { _recentQuestions.push(qtext); if (_recentQuestions.length > _RECENT_MAX) _recentQuestions.shift(); }

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[rand(0, arr.length - 1)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rand(0, i); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var RANKS = [
    { name: 'Bronze Brains', minPoints: 0, icon: '🥉' },
    { name: 'Silver Thinker', minPoints: 50, icon: '🥈' },
    { name: 'Gold Mind', minPoints: 150, icon: '🥇' },
    { name: 'Platinum Processor', minPoints: 300, icon: '💎' },
    { name: 'Diamond Calculator', minPoints: 500, icon: '🔷' },
    { name: 'Master Genius', minPoints: 800, icon: '🏆' }
  ];

  var defaultState = {
    totalPoints: 0, rank: 0, sessions: [],
    streaks: { current: 0, best: 0 },
    stats: {}
  };

  var SOCIAL_SUBJECTS = {
    geography: {
      name: 'Geography',
      icon: '🌍',
      files: ['data/questions/geography.json', 'data/questions/world-geography.json', 'data/questions/indian-geography.json']
    },
    history: {
      name: 'History',
      icon: '🏛️',
      files: ['data/questions/ancient-india.json', 'data/questions/medieval-modern-india.json', 'data/questions/indian-history.json', 'data/questions/world-history.json', 'data/questions/world-history-2.json']
    },
    polity: {
      name: 'Polity & Governance',
      icon: '⚖️',
      files: ['data/questions/constitution.json', 'data/questions/polity-governance.json', 'data/questions/polity.json']
    },
    economy: {
      name: 'Economy & Commerce',
      icon: '📊',
      files: ['data/questions/indian-economy.json', 'data/questions/business-economy.json', 'data/questions/rbi-banking.json']
    },
    society: {
      name: 'Society & Culture',
      icon: '👥',
      files: ['data/questions/art-culture.json', 'data/questions/indian-society.json', 'data/questions/society.json']
    },
    static_gk: {
      name: 'Static GK',
      icon: '📚',
      files: ['data/questions/general.json', 'data/questions/general-science.json', 'data/questions/important-days.json', 'data/questions/indian-national-symbols.json', 'data/questions/indian-states.json', 'data/questions/awards-honours.json', 'data/questions/books-authors.json', 'data/questions/personalities.json']
    },
    current_affairs: {
      name: 'Current Affairs',
      icon: '📰',
      files: ['data/questions/announcements.json', 'data/questions/rbi-press-releases.json', 'data/questions/defence.json']
    },
    environment: {
      name: 'Environment & Ecology',
      icon: '🌿',
      files: ['data/questions/environment-ecology.json', 'data/questions/disaster-management.json']
    },
    defence: {
      name: 'Defence & Security',
      icon: '🛡️',
      files: ['data/questions/defence-security.json', 'data/questions/isro-space.json']
    },
    science_tech: {
      name: 'Science & Tech',
      icon: '🔭',
      files: ['data/questions/science-technology.json', 'data/questions/tech-science.json', 'data/questions/computer-it.json', 'data/questions/health-medicine.json']
    },
    ethics: {
      name: 'Ethics & Integrity',
      icon: '🎯',
      files: ['data/questions/ethics.json', 'data/questions/ethics-integrity.json']
    },
    international: {
      name: 'International Relations',
      icon: '🌐',
      files: ['data/questions/international-relations.json', 'data/questions/sports.json', 'data/questions/govt-schemes.json']
    }
  };

  var SUBJECT_ORDER = ['geography', 'history', 'polity', 'economy', 'society', 'static_gk', 'current_affairs', 'environment', 'defence', 'science_tech', 'ethics', 'international'];

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || JSON.parse(JSON.stringify(defaultState)); }
    catch (e) { return JSON.parse(JSON.stringify(defaultState)); }
  }
  function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  function loadMistakes() {
    try { return JSON.parse(localStorage.getItem(MISTAKE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveMistakes(arr) { localStorage.setItem(MISTAKE_KEY, JSON.stringify(arr)); }

  function cacheSession(sess) {
    if (!sess) return;
    try { sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ active: true, mode: sess.mode, subject: sess.subject, questionIndex: sess.questionIndex, totalQuestions: sess.totalQuestions, questions: sess.questions.slice(0, 100), correctCount: sess.correctCount, wrongCount: sess.wrongCount, pointsEarned: sess.pointsEarned, startTime: sess.startTime })); }
    catch (e) {}
  }
  function restoreCachedSession() {
    try { var d = JSON.parse(sessionStorage.getItem(SESSION_CACHE_KEY)); if (d && d.active) { sessionStorage.removeItem(SESSION_CACHE_KEY); return d; } } catch (e) {}
    return null;
  }
  function clearSessionCache() { try { sessionStorage.removeItem(SESSION_CACHE_KEY); } catch (e) {} }

  function getRank(points) {
    var r = RANKS[0];
    for (var i = RANKS.length - 1; i >= 0; i--) { if (points >= RANKS[i].minPoints) { r = RANKS[i]; break; } }
    return r;
  }

  function updateStreak(state) {
    var today = new Date().toISOString().slice(0, 10);
    var s = state.streaks;
    if (s.lastDate === today) return;
    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (s.lastDate === yesterday) { s.current++; } else { s.current = 1; }
    if (s.current > s.best) s.best = s.current;
    s.lastDate = today;
  }

  function addMistake(q, mode) {
    var arr = loadMistakes();
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].question === q.q) { arr[i].attempts = (arr[i].attempts || 0) + 1; arr[i].lastWrong = Date.now(); saveMistakes(arr); return; }
    }
    arr.push({ question: q.q, answer: q.a, options: q.options, solution: q.solution || '', hint: q.hint || '', topic: q.subject || '', mode: mode, attempts: 1, lastWrong: Date.now() });
    saveMistakes(arr);
  }

  function getMistakesForRetry(count) {
    var arr = loadMistakes();
    if (arr.length === 0) return [];
    var now = Date.now();
    for (var i = 0; i < arr.length; i++) {
      var m = arr[i];
      var hoursSince = (now - (m.lastWrong || 0)) / 3600000;
      var ideal = m.attempts === 1 ? 4 : (m.attempts === 2 ? 24 : 72);
      var urgency = Math.min(hoursSince / ideal, 3);
      m._score = urgency * (1 + (m.attempts - 1) * 0.5);
    }
    arr.sort(function (a, b) { return (b._score || 0) - (a._score || 0); });
    return arr.slice(0, Math.min(count, arr.length));
  }

  // ==================== DATA LOADING ====================

  function loadAllQuestions(subjectKey, callback) {
    var subj = SOCIAL_SUBJECTS[subjectKey];
    if (!subj) { callback([]); return; }

    var allQuestions = [];
    var files = subj.files;
    var loaded = 0;

    if (_loadedCache[subjectKey]) {
      callback(_loadedCache[subjectKey]);
      return;
    }

    files.forEach(function (url) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            for (var sk in data) {
              var ss = data[sk].subSubjects;
              for (var ssk in ss) {
                ss[ssk].forEach(function (q) {
                  var actualQ = (q.question || '').replace(/[_\s]+$/g, '').trim();
                  allQuestions.push({
                    q: actualQ,
                    a: q.answer || '',
                    options: q.options || [],
                    hint: q.hint || '',
                    solution: q.fact || '',
                    subject: subj.name,
                    subTopic: ssk
                  });
                });
              }
            }
          } catch (e) {}
        }
        loaded++;
        if (loaded === files.length) {
          shuffle(allQuestions);
          _loadedCache[subjectKey] = allQuestions;
          callback(allQuestions);
        }
      };
      xhr.onerror = function () { loaded++; if (loaded === files.length) { shuffle(allQuestions); _loadedCache[subjectKey] = allQuestions; callback(allQuestions); } };
      xhr.open('GET', url, true);
      xhr.send();
    });
  }

  function pickOptions(q, subjectPool) {
    if (q.options && q.options.length >= 4) return q.options;
    var ans = (q.a || '').toString();
    if (!ans) return ['Option A', 'Option B', 'Option C', 'Option D'];
    var candidates = [ans];
    if (subjectPool) {
      var shuffled = shuffle(subjectPool.slice());
      for (var i = 0; i < shuffled.length && candidates.length < 4; i++) {
        var otherAns = (shuffled[i].a || '').toString();
        if (otherAns && otherAns !== ans && candidates.indexOf(otherAns) < 0) candidates.push(otherAns);
      }
    }
    while (candidates.length < 4) {
      var fallbacks = ['None of the above', 'All of the above', 'Only 1', 'Only 2'];
      for (var i = 0; i < fallbacks.length && candidates.length < 4; i++) {
        if (candidates.indexOf(fallbacks[i]) < 0) candidates.push(fallbacks[i]);
      }
    }
    return shuffle(candidates);
  }

  // ==================== QUIZ ENGINE ====================

  function generateSessionQuestions(mode, count, subjectKey) {
    var pool = _loadedCache[subjectKey] || [];
    if (pool.length === 0) return [];

    var questions = [];
    var attempts = 0;
    while (questions.length < count && attempts < 300) {
      attempts++;
      var q = pick(pool);
      if (q && q.q && !_isRecent(q.q)) {
        q.timeLimit = getTimeLimit(mode);
        q.options = pickOptions(q);
        questions.push(q);
        _addRecent(q.q);
      }
    }
    return questions;
  }

  function generateWeakspotQuestions(count) {
    var mistakes = loadMistakes();
    if (mistakes.length === 0) return generateSessionQuestions('instinct', count, pick(SUBJECT_ORDER));
    var questions = [];
    var urgent = getMistakesForRetry(count);
    for (var i = 0; i < urgent.length && questions.length < count; i++) {
      var m = urgent[i];
      var q = {
        q: m.question,
        a: m.answer,
        options: m.options && m.options.length >= 4 ? m.options : pickOptions({ a: m.answer, options: m.options }),
        solution: m.solution || '',
        hint: m.hint || '',
        subject: m.topic || 'Social',
        timeLimit: 15
      };
      questions.push(q);
    }
    while (questions.length < count) {
      var sk = pick(SUBJECT_ORDER);
      var extra = generateSessionQuestions('instinct', 1, sk);
      if (extra.length) { questions.push(extra[0]); }
    }
    return questions;
  }

  function getTimeLimit(mode) {
    if (mode === 'quicksolve') return rand(5, 8);
    if (mode === 'instinct') return rand(5, 15);
    if (mode === 'fivesec') return 5;
    if (mode === 'examrush') return 30;
    if (mode === 'weakspot') return 15;
    return 20;
  }

  function startTraining(mode, opts) {
    var state = loadState();
    updateStreak(state);

    var count = opts && opts.count ? opts.count : 10;
    var subjectKey = opts && opts.subject ? opts.subject : null;

    var questions;
    if (mode === 'weakspot') {
      questions = generateWeakspotQuestions(count);
    } else {
      questions = generateSessionQuestions(mode, count, subjectKey);
    }

    if (questions.length === 0) {
      var container = document.getElementById('social-training-container');
      if (container) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#6d5f53">No questions loaded. Please select a subject first.</div><div style="text-align:center;margin-top:12px"><button onclick="window.backToSocialMenu()" style="padding:12px 24px;border-radius:10px;background:linear-gradient(135deg,#c9a04a,#d47a3a);color:#fff;border:none;font-size:.95em;font-weight:600;cursor:pointer">← Back to Menu</button></div>';
      }
      return;
    }

    session = {
      mode: mode,
      hardMode: activeHardMode,
      questions: questions,
      questionIndex: 0,
      totalQuestions: questions.length,
      correctCount: 0,
      wrongCount: 0,
      pointsEarned: 0,
      startTime: Date.now(),
      subject: subjectKey,
      mistakes: []
    };

    cacheSession(session);
    renderFullUI();
    showQuestion();
  }

  window.backToSocialMenu = function () { backToMenu(); };

  // ==================== QUIZ UI ====================

  function showQuestion() {
    if (!session || session.questionIndex >= session.questions.length) {
      endTraining();
      return;
    }
    var q = session.questions[session.questionIndex];
    currentQuestion = q;
    renderQuestion(q);
    startTimer(q.timeLimit || 15);
    cacheSession(session);
  }

  function submitAnswer(selected) {
    if (!session || !currentQuestion) return;
    clearTimer();
    var q = currentQuestion;
    var correct = false;
    var ansStr = typeof q.a === 'number' ? q.a + '' : q.a;

    if (selected === ansStr || selected.trim().toLowerCase() === ansStr.trim().toLowerCase()) {
      correct = true;
      session.correctCount++;
      var points = 10;
      if (session.hardMode) points *= 2;
      if (session.mode === 'fivesec') points += 5;
      if (session.mode === 'quicksolve') points += 3;
      session.pointsEarned += points;
    } else {
      correct = false;
      session.wrongCount++;
      addMistake(q, session.mode);
      session.mistakes.push(q);
    }

    showResult(correct, q);
  }

  function nextQuestion() {
    hideResult();
    session.questionIndex++;
    if (session.questionIndex >= session.totalQuestions) {
      var container = document.getElementById('social-training-container');
      if (container) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#6d5f53">Loading more questions...</div>';
      }
      loadAllQuestions(session.subject, function (allQ) {
        var pool = allQ.filter(function (q) { return !_isRecent(q.q); });
        if (pool.length === 0) pool = allQ;
        var more = [];
        for (var i = 0; i < 10 && pool.length > 0; i++) {
          var idx = rand(0, pool.length - 1);
          var q = pool.splice(idx, 1)[0];
          q.timeLimit = getTimeLimit(session.mode);
        q.options = pickOptions(q, _loadedCache[subjectKey] || []);
          more.push(q);
          _addRecent(q.q);
        }
        session.questions = session.questions.concat(more);
        session.totalQuestions = session.questions.length;
        showQuestion();
      });
      return;
    }
    showQuestion();
  }

  function endTraining() {
    clearTimer();
    if (!session) return;
    var state = loadState();
    state.totalPoints += session.pointsEarned;
    state.sessions.push({
      mode: session.mode,
      date: new Date().toISOString(),
      correct: session.correctCount,
      wrong: session.wrongCount,
      total: session.totalQuestions,
      points: session.pointsEarned,
      subject: session.subject
    });
    if (state.sessions.length > 200) state.sessions = state.sessions.slice(-200);

    var modeStats = state.stats[session.mode] || { attempts: 0, correct: 0 };
    modeStats.attempts += session.totalQuestions;
    modeStats.correct += session.correctCount;
    state.stats[session.mode] = modeStats;

    updateStreak(state);
    saveState(state);
    clearSessionCache();

    var subj = SOCIAL_SUBJECTS[session.subject];
    var subjName = subj ? subj.name : 'Social Sciences';

    var container = document.getElementById('social-training-container');
    if (!container) return;

    var pct = session.totalQuestions > 0 ? Math.round(session.correctCount / session.totalQuestions * 100) : 0;
    var rank = getRank(session.pointsEarned);
    var overallRank = getRank(state.totalPoints);

    var html =
      "<div style='text-align:center;padding:24px 0 16px'>" +
      "<div style='font-size:2.8em;margin-bottom:4px'>🏆</div>" +
      "<h2 style=\"font-family:'Cormorant Garamond',serif;margin:0 0 2px;color:#ede4d7;font-size:1.6em;font-weight:700\">Session Complete</h2>" +
      "<div style='color:#6d5f53;font-size:.85em;letter-spacing:.5px'>" + subjName + ' &middot; ' + session.mode + '</div>' +
      "</div>" +
      "<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:20px 0'>" +
      "<div style='text-align:center;padding:18px 12px;background:rgba(201,160,74,.04);border:1px solid rgba(201,160,74,.06);border-radius:12px'><div style='font-size:1.6em;font-weight:700;color:#3da88a'>" + session.correctCount + "<span style='color:#6d5f53;font-size:.5em;font-weight:400'>/" + session.totalQuestions + "</span></div><div style='color:#6d5f53;font-size:.72em;text-transform:uppercase;letter-spacing:1px;margin-top:2px'>Correct</div></div>" +
      "<div style='text-align:center;padding:18px 12px;background:rgba(201,160,74,.04);border:1px solid rgba(201,160,74,.06);border-radius:12px'><div style='font-size:1.6em;font-weight:700;color:" + (pct >= 60 ? '#3da88a' : '#c94a4a') + "'>" + pct + "<span style='color:#6d5f53;font-size:.5em;font-weight:400'>%</span></div><div style='color:#6d5f53;font-size:.72em;text-transform:uppercase;letter-spacing:1px;margin-top:2px'>Accuracy</div></div>" +
      "<div style='text-align:center;padding:18px 12px;background:rgba(201,160,74,.04);border:1px solid rgba(201,160,74,.06);border-radius:12px'><div style='font-size:1.6em;font-weight:700;color:#c9a04a'>+" + session.pointsEarned + "</div><div style='color:#6d5f53;font-size:.72em;text-transform:uppercase;letter-spacing:1px;margin-top:2px'>Points</div></div>" +
      '</div>' +
      "<div style='text-align:center;margin:16px 0;padding:10px;background:rgba(201,160,74,.04);border:1px solid rgba(201,160,74,.06);border-radius:100px'>" +
      "<span style='font-size:.82em;color:#c9a04a;font-weight:600'>" + overallRank.name + '</span>' +
      "<span style='color:#6d5f53;margin:0 8px'>·</span>" +
      "<span style='font-size:.78em;color:#6d5f53'>" + state.totalPoints + ' total pts</span>' +
      "</div>" +
      "<div style='margin-top:8px;padding:10px 14px;background:rgba(212,122,58,.04);border:1px solid rgba(212,122,58,.06);border-radius:10px;font-size:.82em;color:#d47a3a;text-align:center'>🔥 " + state.streaks.current + ' day streak <span style="color:#6d5f53">(best: ' + state.streaks.best + ")</span></div>" +
      "<div style='display:flex;gap:10px;margin-top:20px'>" +
      "<button id='st-retry-btn' style='flex:1;padding:14px;border-radius:10px;border:none;font-size:.95em;font-weight:600;cursor:pointer;color:#fff'>🔄 Retry</button>" +
      "<button id='st-close-btn' style='flex:1;padding:14px;border-radius:10px;font-size:.95em;font-weight:600;cursor:pointer'>📋 Menu</button>" +
      '</div>';

    container.innerHTML = html;

    document.getElementById('st-retry-btn').addEventListener('click', function () {
      startTraining(session.mode, { count: session.totalQuestions, subject: session.subject });
    });
    document.getElementById('st-close-btn').addEventListener('click', function () {
      backToMenu();
    });

    session = null;
    currentQuestion = null;
  }

  // ==================== UI RENDERING ====================

  function renderFullUI() {
    var container = document.getElementById('social-training-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'social-training-container';
      container.style.cssText = 'max-width:800px;margin:20px auto;padding:24px;background:rgba(26,21,18,.9);border-radius:16px;border:1px solid rgba(200,170,140,.06)';
      var main = document.querySelector('.paper-page, main, .content') || document.body;
      main.appendChild(container);
    }
    container.innerHTML =
      "<div id='st-header' style='display:flex;justify-content:space-between;align-items:center;margin-bottom:20px'>" +
      "<div style='display:flex;align-items:center;gap:10px'><span id='st-mode-badge' style='padding:4px 10px;border-radius:6px;font-size:.72em;font-weight:600;color:#6d5f53;background:rgba(201,160,74,.06);border:1px solid rgba(201,160,74,.08)'></span>" +
      "<span id='st-progress' style='color:#6d5f53;font-size:.8em'></span></div>" +
      "<div style='display:flex;align-items:center;gap:10px'>" +
      "<span id='st-timer' style=\"font-family:'JetBrains Mono',monospace;font-size:1.1em;font-weight:700;font-variant-numeric:tabular-nums;color:#ede4d7\"></span>" +
      "<span id='st-score' style='color:#c9a04a;font-size:.82em'></span>" +
      "<button id='st-exit-btn' style='padding:2px 8px;border-radius:6px;background:rgba(168,28,28,.08);color:#8a3a3a;border:1px solid rgba(168,28,28,.1);font-size:.65em;cursor:pointer'>✕</button></div></div>" +
      "<div id='st-question-area' class='st-card' style='padding:0;background:transparent;border:none'></div>" +
      "<div id='st-result-overlay' style='display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);z-index:1000;align-items:center;justify-content:center'>" +
      "<div style='padding:32px;max-width:500px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.4)'></div></div>";
    document.getElementById('st-result-overlay').style.display = 'none';
    document.getElementById('st-exit-btn').addEventListener('click', function () {
      if (confirm('End current session?')) {
        clearTimer();
        session = null;
        currentQuestion = null;
        clearSessionCache();
        backToMenu();
      }
    });
  }

  function renderQuestion(q) {
    var area = document.getElementById('st-question-area');
    if (!area) return;

    var subj = SOCIAL_SUBJECTS[session.subject];
    var subjectLabel = subj ? subj.icon + ' ' + subj.name : 'Social Sciences';
    document.getElementById('st-mode-badge').textContent = subjectLabel;
    document.getElementById('st-progress').textContent = (session.questionIndex + 1) + ' / ' + session.totalQuestions;
    document.getElementById('st-score').textContent = '⭐ ' + session.pointsEarned + ' pts';

    var html = "<div style='margin-bottom:16px'>";
    if (q.hint) html += "<div style='font-size:.8em;color:#b8a89a;margin-bottom:8px'>💡 " + q.hint + '</div>';
    html += "<div style='font-size:1.05em;line-height:1.7;color:#ede4d7;font-weight:500'>" + q.q + '</div></div>';

    var opts = q.options || [];
    html += "<div id='st-options' style='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px'>";
    for (var i = 0; i < opts.length && i < 4; i++) {
      html += "<button class='st-opt' data-value='" + opts[i].replace(/'/g, "&apos;") + "' style='padding:14px 16px;border-radius:10px;background:rgba(40,34,30,.5);border:1px solid rgba(200,170,140,.06);color:#ede4d7;font-size:.95em;cursor:pointer;text-align:left;transition:all .2s'>" +
        String.fromCharCode(65 + i) + '. ' + opts[i] + '</button>';
    }
    html += '</div>';

    if (q.solution) {
      html += "<div id='st-solution-box' style='display:none;margin-top:16px;padding:14px;background:rgba(42,125,100,.04);border:1px solid rgba(42,125,100,.1);border-radius:10px;color:#3da88a;font-size:.85em;line-height:1.6'>📖 " + q.solution + '</div>';
    }

    area.classList.remove('answered');
    area.innerHTML = html;

    var btns = area.querySelectorAll('.st-opt');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (area.classList.contains('answered')) return;
        area.classList.add('answered');
        submitAnswer(btn.getAttribute('data-value'));
      });
      btn.addEventListener('mouseenter', function () { this.style.borderColor = 'rgba(201,160,74,.25)'; this.style.background = 'rgba(50,44,38,.6)'; });
      btn.addEventListener('mouseleave', function () { if (!this.classList.contains('selected')) { this.style.borderColor = 'rgba(200,170,140,.06)'; this.style.background = 'rgba(40,34,30,.5)'; } });
    });
  }

  function showResult(correct, q) {
    var overlay = document.getElementById('st-result-overlay');
    if (!overlay) return;
    var content = overlay.querySelector('div');

    var ansStr = typeof q.a === 'number' ? q.a + '' : q.a;
    content.innerHTML =
      "<div style='text-align:center;margin-bottom:20px'>" +
      "<div style='font-size:3em;margin-bottom:6px'>" + (correct ? '✅' : '❌') + '</div>' +
      "<div style='font-size:1.15em;font-weight:700;color:" + (correct ? '#3da88a' : '#c94a4a') + "'>" + (correct ? 'Correct!' : 'Wrong!') + '</div>' +
      "<div style='color:#6d5f53;margin-top:6px;font-size:.9em'>" +
      (correct ? '+' + (session.hardMode ? 20 : 10) + ' points' : 'Answer: ' + ansStr) +
      '</div></div>';

    if (q.solution) {
      content.innerHTML += "<div style='padding:14px;background:rgba(42,125,100,.04);border:1px solid rgba(42,125,100,.1);border-radius:10px;color:#3da88a;font-size:.82em;line-height:1.6;margin-bottom:16px;text-align:left'>📖 " + q.solution + '</div>';
    }

    content.innerHTML += "<button id='st-next-btn' style='width:100%;padding:14px;border-radius:10px;border:none;font-size:1em;font-weight:700;cursor:pointer;letter-spacing:.3px'>Next →</button>";

    overlay.style.display = 'flex';
    document.getElementById('st-next-btn').addEventListener('click', function () {
      overlay.style.display = 'none';
      nextQuestion();
    });
  }

  function hideResult() {
    var overlay = document.getElementById('st-result-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function backToMenu() {
    clearTimer();
    var container = document.getElementById('social-training-container');
    if (container) container.innerHTML = renderMenu();
    session = null;
    currentQuestion = null;
    clearSessionCache();
  }

  // ==================== MENU ====================

  function renderMenu() {
    var state = loadState();
    var rank = getRank(state.totalPoints);
    var html =
      "<div style='text-align:center;padding:24px 0 16px;position:relative'>" +
      "<div style=\"font-family:'Cormorant Garamond',serif;font-size:2.2em;font-weight:700;background:linear-gradient(135deg,#ede4d7,#c9a04a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:2px\">Social Sciences</div>" +
      "<div style='color:#6d5f53;font-size:.82em;letter-spacing:1px;text-transform:uppercase'>History · Polity · Geography · Economy · GK</div>" +
      "<div style='margin:14px auto 0;max-width:400px;padding:10px 16px;background:rgba(201,160,74,.06);border:1px solid rgba(201,160,74,.08);border-radius:100px'>" +
       "<span style='color:#c9a04a;font-size:.82em'>🏅 " + rank.name + '</span>' +
      "<span style='color:#6d5f53;margin:0 8px'>·</span>" +
      "<span style='color:#c9a04a;font-size:.82em'>⭐ " + state.totalPoints + '</span>' +
      "<span style='color:#6d5f53;margin:0 8px'>·</span>" +
      "<span style='color:#d47a3a;font-size:.82em'>🔥 " + state.streaks.current + "d</span>" +
      "<span style='color:#6d5f53;margin:0 8px'>·</span>" +
      "<span style='color:#6d5f53;font-size:.78em'>📝 " + state.sessions.length + ' sessions</span>' +
      '</div></div>' +
      "<div style='margin:4px 0 16px;padding:10px 16px;background:rgba(42,125,100,.04);border:1px solid rgba(42,125,100,.06);border-radius:10px;font-size:.78em;color:#3da88a;text-align:center'>🔄 Click any subject to start. Questions reshuffle infinitely. Mistakes get retried automatically.</div>" +
      "<div id='st-subject-grid' style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:16px 0'>";
    SUBJECT_ORDER.forEach(function (key) {
      var s = SOCIAL_SUBJECTS[key];
      html += "<button class='st-subject-btn' data-subject='" + key + "' style='padding:16px 12px;border-radius:12px;background:rgba(40,34,30,.5);border:1px solid rgba(200,170,140,.06);color:#ede4d7;cursor:pointer;font-size:.9em;text-align:center;transition:all .2s'>" +
        "<div style='font-size:1.6em;margin-bottom:4px'>" + s.icon + "</div>" +
        "<div style='font-weight:600'>" + s.name + "</div>" +
        "<div style='font-size:.7em;color:#6d5f53;margin-top:4px'>" + s.files.length + " question banks</div></button>";
    });
    html += '</div>';
    if (loadMistakes().length > 0) {
      html +=
        "<div style='margin:16px 0;padding:14px 16px;background:rgba(212,122,58,.04);border:1px solid rgba(212,122,58,.06);border-radius:12px;text-align:center'>" +
        "<button id='st-review-mistakes' style='background:none;border:none;color:#d47a3a;font-size:.85em;font-weight:600;cursor:pointer'>🎯 Review " + loadMistakes().length + " mistakes</button></div>";
    }
    html += "<div style='text-align:center;margin-top:8px'>" +
      "<span style='font-size:.75em;color:#6d5f53'>Streak: " + state.streaks.current + 'd · Best: ' + state.streaks.best + 'd</span>' +
      '</div>';
    if (!_loadedCache[SUBJECT_ORDER[0]]) {
      loadAllQuestions(SUBJECT_ORDER[0], function () {});
    }
    return html;
  }

  // ==================== TIMER ====================

  function startTimer(seconds) {
    clearTimer();
    var timerEl = document.getElementById('st-timer');
    if (!timerEl) return;

    if (session && session.hardMode) {
      seconds = Math.max(3, Math.round(seconds * 0.55));
    }

    var remaining = seconds;
    timerEl.textContent = formatTime(remaining);
    timerEl.className = remaining <= 3 ? 'urgent' : (remaining <= 5 ? 'warning' : '');

    timerId = setInterval(function () {
      remaining--;
      if (timerEl) {
        timerEl.textContent = formatTime(remaining);
        timerEl.className = remaining <= 3 ? 'urgent' : (remaining <= 5 ? 'warning' : '');
      }
      if (remaining <= 0) {
        clearTimer();
        if (currentQuestion && session) {
          submitAnswer('');
        }
      }
    }, 1000);
  }

  function clearTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    var timerEl = document.getElementById('st-timer');
    if (timerEl) timerEl.className = '';
  }

  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ==================== EVENT BINDING ====================

  function startSession(subjKey) {
    if (_loadedCache[subjKey]) {
      startTraining('instinct', { count: 10, subject: subjKey });
    } else {
      var container = document.getElementById('social-training-container');
      if (container) container.innerHTML = '<div class="loading" style="text-align:center;padding:40px;color:#6d5f53">Loading questions...</div>';
      loadAllQuestions(subjKey, function () {
        startTraining('instinct', { count: 10, subject: subjKey });
      });
    }
  }

  function bindEvents() {
    document.addEventListener('click', function (e) {
      var subBtn = e.target.closest('.st-subject-btn');
      if (subBtn) {
        var subjKey = subBtn.getAttribute('data-subject');
        document.querySelectorAll('.st-subject-btn').forEach(function (b) {
          b.style.borderColor = 'rgba(200,170,140,.06)';
          b.style.background = 'rgba(40,34,30,.5)';
          b.style.transform = '';
        });
        subBtn.style.borderColor = 'rgba(201,160,74,.4)';
        subBtn.style.background = 'rgba(201,160,74,.08)';
        subBtn.style.transform = 'scale(0.97)';
        startSession(subjKey);
        return;
      }

      if (e.target.id === 'st-review-mistakes') {
        startTraining('weakspot', { count: 10 });
      }
    });
  }

  // ==================== INITIALIZATION ====================

  function initSocialTraining() {
    var cached = restoreCachedSession();
    if (cached && cached.questions && cached.questions.length > 0) {
      session = cached;
      renderFullUI();
      showQuestion();
      return;
    }

    var container = document.getElementById('social-training-container');
    if (container) {
      container.innerHTML = renderMenu();
    }
    bindEvents();
  }

  window.initSocialTraining = initSocialTraining;
  window.startSocialTraining = startTraining;
  window.getSocialState = loadState;
  window.getSocialMistakes = loadMistakes;
  window.getSocialSubjects = function () { return SOCIAL_SUBJECTS; };
  window.getSocialRank = function () { return getRank(loadState().totalPoints); };
  window.preloadSocialSubject = function (key) {
    if (key && SOCIAL_SUBJECTS[key] && !_loadedCache[key]) loadAllQuestions(key, function () {});
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (document.getElementById('social-training-container')) initSocialTraining();
    });
  } else {
    if (document.getElementById('social-training-container')) initSocialTraining();
  }
})();
