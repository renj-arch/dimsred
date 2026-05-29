(function () {
  var STORAGE_KEY = 'studypro_wrong';
  var RESULTS_KEY = 'studypro_results';
  var PROGRESS_KEY = 'studypro_progress';
  var BOOKMARKS_KEY = 'studypro_bookmarks';
  var STREAK_KEY = 'studypro_streak';
  var BADGES_KEY = 'studypro_badges';
  var GOALS_KEY = 'studypro_goals';
  var examName = document.title.replace(/[^a-zA-Z0-9]/g, '_');
  var paperId = window.location.pathname.split('/').pop().replace('.html', '');

  // ========== 1. DIFFICULTY TAGS ==========
  var difficulties = ['Easy', 'Medium', 'Hard'];
  function assignDifficulty() {
    document.querySelectorAll('.question').forEach(function (q, i) {
      if (q.getAttribute('data-difficulty')) return;
      var idx = i % 3;
      q.setAttribute('data-difficulty', difficulties[idx].toLowerCase());
    });
  }
  assignDifficulty();
  document.querySelectorAll('.question').forEach(function (q) {
    var d = q.getAttribute('data-difficulty');
    if (!d) return;
    var dot = document.createElement('span');
    dot.className = 'diff-dot diff-' + d;
    dot.textContent = d.charAt(0).toUpperCase() + d.slice(1);
    var num = q.querySelector('.q-number');
    if (num) num.appendChild(dot);
  });

  // ========== 2. KEYBOARD SHORTCUTS ==========
  document.addEventListener('keydown', function (e) {
    var key = parseInt(e.key);
    if (key >= 1 && key <= 4) {
      var unanswered = document.querySelectorAll('.question:not(.answered)');
      if (unanswered.length === 0) return;
      var opts = unanswered[0].querySelectorAll('.q-option');
      if (opts[key - 1]) opts[key - 1].click();
    }
    if (e.key === 's' || e.key === 'S') {
      var unanswered = document.querySelectorAll('.question:not(.answered)');
      if (unanswered.length > 0) {
        var btn = unanswered[0].querySelector('.show-soln');
        if (btn) btn.click();
      }
    }
    if (e.key === 'f' || e.key === 'F') { toggleFlashcard(); }
    if (e.key === 'b' || e.key === 'B') {
      var firstUnanswered = document.querySelector('.question:not(.answered)');
      if (firstUnanswered) {
        var bmBtn = firstUnanswered.querySelector('.bookmark-btn');
        if (bmBtn) bmBtn.click();
      }
    }
  });

  // ========== 3. WRONG ANSWER BANK ==========
  function saveWrong(qEl) {
    var qNum = qEl.querySelector('.q-number') ? qEl.querySelector('.q-number').textContent.trim() : 'Q?';
    var qText = qEl.querySelector('.q-text') ? qEl.querySelector('.q-text').textContent.trim() : '';
    var correctEl = qEl.querySelector('.q-option[data-correct]');
    var correct = correctEl ? correctEl.textContent.trim() : '';
    var wrongEl = qEl.querySelector('.q-option.wrong');
    var chosen = wrongEl ? wrongEl.textContent.trim() : '';
    var diff = qEl.getAttribute('data-difficulty') || 'medium';
    var section = qEl.querySelector('.section-badge') ? qEl.querySelector('.section-badge').textContent.trim() : 'General';
    var item = {
      id: STORAGE_KEY + '_' + examName + '_' + Date.now(),
      exam: document.title,
      paperId: paperId,
      qNum: qNum,
      qText: qText,
      correct: correct,
      chosen: chosen,
      difficulty: diff,
      section: section,
      date: new Date().toISOString(),
      reviewCount: 0,
      nextReview: new Date().toISOString()
    };
    var list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    list.unshift(item);
    if (list.length > 200) list = list.slice(0, 200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    if (typeof window.syncWrongAnswer === 'function') window.syncWrongAnswer(item);
  }

  document.addEventListener('click', function (e) {
    var opt = e.target.closest('.q-option');
    if (!opt) return;
    var q = opt.closest('.question');
    if (!q || q.classList.contains('answered')) return;
    setTimeout(function () {
      if (q.classList.contains('answered') && q.querySelector('.q-option.wrong')) {
        saveWrong(q);
      }
    }, 50);
  });

  // ========== 3b. BOOKMARK QUESTIONS ==========
  function getBookmarks() {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
  }

  function saveBookmarks(list) {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
  }

  function toggleBookmark(qEl) {
    var qNum = qEl.querySelector('.q-number') ? qEl.querySelector('.q-number').textContent.trim() : 'Q?';
    var qText = qEl.querySelector('.q-text') ? qEl.querySelector('.q-text').textContent.trim() : '';
    var section = qEl.querySelector('.section-badge') ? qEl.querySelector('.section-badge').textContent.trim() : 'General';
    var bm = getBookmarks();
    var item = { paperId: paperId, exam: document.title, qNum: qNum, qText: qText, section: section, date: new Date().toISOString() };
    var existing = bm.findIndex(function (b) { return b.paperId === paperId && b.qNum === qNum; });
    if (existing >= 0) {
      bm.splice(existing, 1);
      qEl.classList.remove('bookmarked');
      updateBookmarkBtn(qEl, false);
      if (typeof window.syncBookmark === 'function') window.syncBookmark(item, true);
    } else {
      bm.push(item);
      qEl.classList.add('bookmarked');
      updateBookmarkBtn(qEl, true);
      if (typeof window.syncBookmark === 'function') window.syncBookmark(item, false);
    }
    saveBookmarks(bm);
  }

  function updateBookmarkBtn(qEl, isBookmarked) {
    var btn = qEl.querySelector('.bookmark-btn');
    if (btn) {
      btn.textContent = '🔖';
      btn.classList.toggle('bm-active', isBookmarked);
    }
  }

  function addBookmarkButtons() {
    document.querySelectorAll('.question').forEach(function (q) {
      if (q.querySelector('.bookmark-btn')) return;
      var num = q.querySelector('.q-number');
      if (!num) return;
      var btn = document.createElement('span');
      btn.className = 'bookmark-btn';
      btn.textContent = '🔖';
      btn.title = 'Bookmark (B)';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleBookmark(q);
      });
      num.appendChild(btn);
      var qNum = q.querySelector('.q-number') ? q.querySelector('.q-number').textContent.trim() : 'Q?';
      var bm = getBookmarks();
      if (bm.some(function (b) { return b.paperId === paperId && b.qNum === qNum; })) {
        q.classList.add('bookmarked');
        btn.classList.add('bm-active');
      }
    });
  }
  addBookmarkButtons();

  // ========== 3c. SAVE & RESUME PROGRESS ==========
  function saveProgress() {
    var data = [];
    document.querySelectorAll('.question').forEach(function (q) {
      var qNum = q.getAttribute('data-q');
      var isAnswered = q.classList.contains('answered');
      var selected = null;
      if (isAnswered) {
        q.querySelectorAll('.q-option').forEach(function (o, i) {
          if (o.classList.contains('correct') || o.classList.contains('wrong')) {
            selected = i;
          }
        });
      }
      data.push({ qNum: qNum, answered: isAnswered, selected: selected });
    });
    var progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    progress[paperId] = { data: data, savedAt: new Date().toISOString() };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function restoreProgress() {
    var progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    var paper = progress[paperId];
    if (!paper || !paper.data) return;
    var questions = document.querySelectorAll('.question');
    paper.data.forEach(function (saved) {
      var q = questions[saved.qNum - 1];
      if (!q || q.classList.contains('answered')) return;
      if (saved.answered && saved.selected !== null) {
        var opts = q.querySelectorAll('.q-option');
        var target = opts[saved.selected];
        if (target) target.click();
      }
    });
  }

  setInterval(saveProgress, 10000);
  document.addEventListener('click', function () {
    clearTimeout(window._saveTimer);
    window._saveTimer = setTimeout(saveProgress, 2000);
  });

  // ========== 4. STREAK TRACKING ==========
  function updateStreak() {
    var streak = JSON.parse(localStorage.getItem(STREAK_KEY) || '{"current":0,"longest":0,"lastDate":null}');
    var today = new Date().toISOString().slice(0, 10);
    if (streak.lastDate === today) return streak;
    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (streak.lastDate === yesterday) {
      streak.current++;
    } else if (streak.lastDate !== today) {
      streak.current = 1;
    }
    if (streak.current > streak.longest) streak.longest = streak.current;
    streak.lastDate = today;
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
    if (typeof window.syncStreak === 'function') window.syncStreak(streak);
    return streak;
  }

  // ========== 5. ACHIEVEMENT BADGES ==========
  function checkBadges() {
    var badges = JSON.parse(localStorage.getItem(BADGES_KEY) || '[]');
    var results = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
    var wrongList = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    var newBadges = [];

    function award(id, name, icon) {
      if (!badges.some(function (b) { return b.id === id; })) {
        var b = { id: id, name: name, icon: icon, date: new Date().toISOString() };
        badges.push(b);
        newBadges.push(b);
      }
    }

    var totalCorrect = 0;
    results.forEach(function (r) { totalCorrect += r.correct || 0; });

    if (results.length >= 1) award('first_paper', 'First Paper', '📝');
    if (results.length >= 5) award('five_papers', 'Practice Machine', '📚');
    if (results.length >= 10) award('ten_papers', 'Dedicated Scholar', '🎓');
    if (totalCorrect >= 50) award('fifty_correct', 'Getting There', '✅');
    if (totalCorrect >= 200) award('two_hundred_correct', 'Answer Master', '🎯');
    if (totalCorrect >= 500) award('five_hundred_correct', 'Quiz Legend', '🏅');
    var streak = JSON.parse(localStorage.getItem(STREAK_KEY) || '{"current":0,"longest":0,"lastDate":null}');
    if (streak.current >= 3) award('three_streak', '3-Day Streak', '🔥');
    if (streak.current >= 7) award('seven_streak', 'Week Warrior', '⭐');
    if (streak.current >= 30) award('thirty_streak', 'Monthly Master', '💪');
    if (wrongList.length > 0 && results.some(function (r) { return r.pct === 100; })) award('perfect_score', 'Perfect Score', '🌟');

    localStorage.setItem(BADGES_KEY, JSON.stringify(badges));
    if (typeof window.syncBadges === 'function') window.syncBadges(badges);
    return newBadges;
  }

  // ========== 6. GOAL SETTING ==========
  function showGoalPrompt() {
    var goals = JSON.parse(localStorage.getItem(GOALS_KEY) || '{}');
    if (goals.papersPerWeek) return;
    var html = '<div class="goal-overlay" id="goalOverlay"><div class="goal-modal">';
    html += '<h3 style="margin:0 0 12px">🎯 Set Your Weekly Goal</h3>';
    html += '<p style="font-size:.85em;color:#a1a1aa;margin-bottom:16px">How many papers do you want to complete this week?</p>';
    html += '<select id="goalSelect" style="width:100%;padding:10px;border-radius:8px;background:#27272a;color:#fafafa;border:1px solid rgba(255,255,255,.1);margin-bottom:16px;font-size:.9em">';
    for (var i = 1; i <= 10; i++) { html += '<option value="' + i + '">' + i + ' paper' + (i > 1 ? 's' : '') + ' per week</option>'; }
    html += '</select>';
    html += '<button class="pc-btn" id="goalSave" style="width:100%">Save Goal</button>';
    html += '</div></div>';
    var div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);
    document.getElementById('goalSave').addEventListener('click', function () {
      var val = parseInt(document.getElementById('goalSelect').value);
      goals.papersPerWeek = val;
      goals.weekStart = new Date().toISOString().slice(0, 10);
      goals.completed = 0;
      localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
      document.getElementById('goalOverlay').remove();
    });
  }

  function updateGoalProgress() {
    var goals = JSON.parse(localStorage.getItem(GOALS_KEY) || '{}');
    if (!goals.papersPerWeek) return;
    var weekStart = new Date(goals.weekStart);
    var now = new Date();
    var diffDays = Math.floor((now - weekStart) / 86400000);
    if (diffDays >= 7) {
      goals.weekStart = now.toISOString().slice(0, 10);
      goals.completed = 0;
      localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    }
    var results = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
    var thisWeek = results.filter(function (r) {
      return r.date.slice(0, 10) >= goals.weekStart;
    }).length;
    goals.completed = thisWeek;
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    if (typeof window.syncGoals === 'function') window.syncGoals(goals);
  }

  // ========== 7. PERFORMANCE DASHBOARD ==========
  var timerEl = document.getElementById('timer');
  var totalQs = document.querySelectorAll('.question').length;
  var startTime = Date.now();

  function showDashboard(forced) {
    var answered = document.querySelectorAll('.question.answered').length;
    var correct = 0;
    var wrong = 0;
    var sectionData = {};
    document.querySelectorAll('.question.answered').forEach(function (q) {
      var hasWrong = q.querySelector('.q-option.wrong');
      var sec = q.querySelector('.section-badge') ? q.querySelector('.section-badge').textContent.trim() : 'General';
      if (!sectionData[sec]) sectionData[sec] = { correct: 0, wrong: 0, total: 0 };
      sectionData[sec].total++;
      if (hasWrong) { wrong++; sectionData[sec].wrong++; }
      else { correct++; sectionData[sec].correct++; }
    });

    var elapsed = Math.floor((Date.now() - startTime) / 1000);
    var em = Math.floor(elapsed / 60);
    var es = elapsed % 60;
    var timeStr = (em < 10 ? '0' : '') + em + ':' + (es < 10 ? '0' : '') + es;
    var pct = answered > 0 ? Math.round(correct / answered * 100) : 0;

    var result = { exam: document.title, paperId: paperId, date: new Date().toISOString(), correct: correct, wrong: wrong, total: totalQs, answered: answered, time: timeStr, pct: pct };
    var hist = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
    // Deduplicate existing entries
    var seen = {}; hist = hist.filter(function(r){ var k = r.paperId + '|' + r.correct + '|' + r.wrong + '|' + r.pct; if (seen[k]) return false; seen[k] = true; return true; });
    // Avoid adding another duplicate
    var isDuplicate = hist.some(function(r){ return r.paperId === paperId && r.correct === correct && r.wrong === wrong && r.pct === pct; });
    if (!isDuplicate) {
      hist.unshift(result);
      if (hist.length > 50) hist = hist.slice(0, 50);
      localStorage.setItem(RESULTS_KEY, JSON.stringify(hist));
      updateStreak();
      var newBadges = checkBadges();
      updateGoalProgress();
      if (typeof window.syncResult === 'function') window.syncResult(result);
    } else {
      localStorage.setItem(RESULTS_KEY, JSON.stringify(hist));
    }

    var weakTopics = [];
    for (var s in sectionData) {
      var sp = sectionData[s].total > 0 ? Math.round(sectionData[s].correct / sectionData[s].total * 100) : 0;
      if (sp < 60 && sectionData[s].total >= 2) weakTopics.push(s);
    }

    var streak = JSON.parse(localStorage.getItem(STREAK_KEY) || '{"current":0,"longest":0,"lastDate":null}');
    var badges = JSON.parse(localStorage.getItem(BADGES_KEY) || '[]');
    var goals = JSON.parse(localStorage.getItem(GOALS_KEY) || '{}');

    var html = '<div class="dash-overlay"><div class="dash-modal">';
    html += '<h2 style="margin:0 0 8px;font-size:1.2em">📊 Performance</h2>';
    html += '<div style="font-size:.78em;color:#52525b;margin-bottom:12px">' + document.title + '</div>';
    html += '<div class="dash-grid">';
    html += '<div class="dash-stat"><span class="dash-num" style="color:#a78bfa">' + correct + '/' + answered + '</span><span class="dash-label">Correct</span></div>';
    html += '<div class="dash-stat"><span class="dash-num" style="color:' + (pct >= 60 ? '#34d399' : '#ef4444') + '">' + pct + '%</span><span class="dash-label">Accuracy</span></div>';
    html += '<div class="dash-stat"><span class="dash-num" style="color:#ef4444">' + wrong + '</span><span class="dash-label">Wrong</span></div>';
    html += '<div class="dash-stat"><span class="dash-num">' + timeStr + '</span><span class="dash-label">Time</span></div>';
    html += '</div>';

    if (streak.current > 0) {
      html += '<div style="display:flex;gap:16px;justify-content:center;margin-top:12px;font-size:.85em">';
      html += '<span>🔥 Streak: <strong>' + streak.current + '</strong> days</span>';
      html += '<span>🏆 Best: <strong>' + streak.longest + '</strong> days</span>';
      html += '</div>';
    }

    if (goals.papersPerWeek) {
      var goalPct = Math.min(100, Math.round(goals.completed / goals.papersPerWeek * 100));
      html += '<div style="margin-top:12px;font-size:.82em">';
      html += '<div style="display:flex;justify-content:space-between;color:#a1a1aa;margin-bottom:4px">';
      html += '<span>🎯 Weekly Goal: ' + goals.completed + '/' + goals.papersPerWeek + ' papers</span><span>' + goalPct + '%</span></div>';
      html += '<div style="height:6px;background:rgba(255,255,255,.06);border-radius:100px;overflow:hidden">';
      html += '<div style="height:100%;width:' + goalPct + '%;background:linear-gradient(90deg,#a78bfa,#34d399);border-radius:100px;transition:width .5s"></div></div></div>';
    }

    if (newBadges.length > 0) {
      html += '<div style="margin-top:12px;padding:10px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.15);border-radius:8px;text-align:center">';
      newBadges.forEach(function (b) { html += '<span style="font-size:1.5em;margin:0 4px" title="' + b.name + '">' + b.icon + '</span> '; });
      html += '<span style="font-size:.8em;color:#34d399;font-weight:600;margin-left:4px">New badge' + (newBadges.length > 1 ? 's' : '') + ' unlocked!</span></div>';
    }

    if (badges.length > 0) {
      html += '<div style="margin-top:12px;font-size:.78em;color:#71717a;text-align:center">Badges: ';
      badges.forEach(function (b) { html += '<span title="' + b.name + '">' + b.icon + '</span> '; });
      html += '</div>';
    }

    if (weakTopics.length > 0) {
      html += '<div style="margin-top:12px;padding:10px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.12);border-radius:8px">';
      html += '<div style="font-size:.82em;font-weight:600;color:#ef4444;margin-bottom:4px">⚠ Topics to Improve</div>';
      html += '<div style="font-size:.82em;color:#a1a1aa">' + weakTopics.join(', ') + '</div>';
      html += '</div>';
    }

    if (Object.keys(sectionData).length > 1) {
      html += '<div style="margin-top:16px;font-size:.85em;font-weight:600;color:#a1a1aa">By Topic</div>';
      html += '<div class="dash-topics">';
      for (var s2 in sectionData) {
        var sp2 = sectionData[s2].total > 0 ? Math.round(sectionData[s2].correct / sectionData[s2].total * 100) : 0;
        html += '<div class="dash-topic"><span>' + s2 + '</span><span class="dash-topic-pct" style="color:' + (sp2 >= 60 ? '#34d399' : '#ef4444') + '">' + sp2 + '%</span></div>';
      }
      html += '</div>';
    }

    html += '<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">';
    html += '<a href="/mistakes.html" class="pc-btn" style="text-decoration:none">❌ Review Mistakes</a>';
    html += '<a href="/dashboard.html" class="pc-btn" style="text-decoration:none">📊 Dashboard</a>';
    html += '<button class="pc-btn dash-close" style="background:#52525b">Close</button>';
    html += '</div></div></div>';

    var div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);
    div.querySelector('.dash-close').addEventListener('click', function () { div.remove(); });
  }

  document.addEventListener('click', function checkAllAnswered() {
    var all = document.querySelectorAll('.question');
    var answered = document.querySelectorAll('.question.answered');
    if (all.length > 0 && answered.length === all.length) {
      setTimeout(showDashboard, 600);
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(restoreProgress, 500);
  });

  if (timerEl) {
    var checkTimer = setInterval(function () {
      if (timerEl.textContent === '00:00' || timerEl.textContent === '0:00') {
        clearInterval(checkTimer);
        setTimeout(showDashboard, 800);
      }
    }, 1000);
  }

  // ========== 8. FLASHCARD MODE ==========
  var flashActive = false;
  function toggleFlashcard() {
    flashActive = !flashActive;
    var all = document.querySelectorAll('.question');
    var hint = document.getElementById('flash-hint');
    if (flashActive) {
      all.forEach(function (q, i) { if (i > 0) q.style.display = 'none'; q.style.cursor = 'pointer'; var sol = q.querySelector('.solution-box'); if (sol) sol.style.display = 'none'; });
      if (!hint) {
        hint = document.createElement('div');
        hint.id = 'flash-hint';
        hint.style.cssText = 'text-align:center;padding:12px;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.2);border-radius:10px;margin-bottom:16px;font-size:.9em;color:#a78bfa';
        hint.innerHTML = '🃏 Flashcard Mode: Tap to reveal answer &nbsp;|&nbsp; <b>F</b> to exit &nbsp;|&nbsp; ← → arrows to navigate';
        var paper = document.querySelector('.paper-page');
        if (paper) paper.insertBefore(hint, paper.firstChild);
      }
      hint.style.display = 'block';
      if (document.querySelector('.question')) showFlashcard(0);
    } else {
      all.forEach(function (q) { q.style.display = ''; q.style.cursor = ''; });
      if (hint) hint.style.display = 'none';
      document.querySelectorAll('.solution-box').forEach(function (s) { s.classList.remove('show'); });
    }
  }

  var flashIdx = 0;
  function showFlashcard(idx) {
    var all = document.querySelectorAll('.question');
    all.forEach(function (q, i) { q.style.display = i === idx ? '' : 'none'; });
    var q = all[idx];
    if (!q) return;
    q.style.cursor = flashActive ? 'pointer' : '';
    var sol = q.querySelector('.solution-box');
    if (sol) sol.style.display = 'none';
    q.onclick = function (e) {
      if (!flashActive) return;
      if (e.target.closest('.q-option') || e.target.closest('.show-soln') || e.target.closest('.bookmark-btn')) return;
      var sol = q.querySelector('.solution-box');
      if (sol) {
        sol.style.display = 'block';
        q.querySelectorAll('.q-option').forEach(function (o) { o.style.pointerEvents = 'none'; });
        var correct = q.querySelector('.q-option[data-correct]');
        if (correct) correct.classList.add('correct');
        q.classList.add('answered');
      }
    };
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      if (flashActive) { e.preventDefault(); var all = document.querySelectorAll('.question'); flashIdx = Math.min(flashIdx + 1, all.length - 1); showFlashcard(flashIdx); }
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (flashActive) { e.preventDefault(); flashIdx = Math.max(flashIdx - 1, 0); showFlashcard(flashIdx); }
    }
  });

  // ========== 9. DASHBOARD ACCESS BUTTON ==========
  var timerWrap = document.querySelector('.timer-bar');
  if (timerWrap) {
    var dbBtn = document.createElement('span');
    dbBtn.textContent = '📊 Stats';
    dbBtn.style.cssText = 'cursor:pointer;font-size:.85em;color:#a78bfa;font-weight:600';
    dbBtn.onclick = showDashboard;
    timerWrap.appendChild(document.createTextNode(' '));
    timerWrap.appendChild(dbBtn);
  }

  // ========== 10. REVIEW BADGE ON NAV ==========
  var wrongCount = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').length;
  if (wrongCount > 0) {
    document.querySelectorAll('.site-nav a, .nav-links a').forEach(function (a) {
      if (a.getAttribute('href') && a.getAttribute('href').includes('mistakes')) {
        var badge = document.createElement('sup');
        badge.textContent = wrongCount;
        badge.style.cssText = 'background:#ef4444;color:#fff;font-size:.65em;padding:1px 6px;border-radius:100px;margin-left:4px';
        a.appendChild(badge);
      }
    });
  }

  // ========== 11. AUTH BUTTON FOR PAPER PAGES ==========
  if (!document.querySelector('.auth-btn')) {
    var nav = document.querySelector('.nav-links, .site-nav');
    if (nav) {
      var authBtn = document.createElement('a');
      authBtn.className = 'auth-btn';
      var authHost = window.location.host;
      if (authHost.indexOf('localhost') >= 0 || authHost.indexOf('127.0.0.1') >= 0) authHost = 'vlymbooq.qzz.io';
      authBtn.href = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : 'https://krvlufonfbcabgcjomvs.supabase.co') + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent('https://' + authHost + '/lab.html');
      authBtn.textContent = '🚀 Unlock Lab';
      authBtn.style.cssText = 'background:rgba(255,255,255,.06);color:#fff;border:1px solid rgba(255,255,255,.1);padding:6px 14px;border-radius:100px;font-size:.78em;font-weight:500;cursor:pointer;white-space:nowrap;text-decoration:none;transition:all .2s';
      nav.appendChild(authBtn);
      // Apply current auth state to the newly created button
      if (typeof updateAuthUI === 'function') setTimeout(updateAuthUI, 10);
    }
  }

  // ========== 13. GOAL PROMPT ON FIRST VISIT ==========
  if (!localStorage.getItem(GOALS_KEY)) {
    setTimeout(showGoalPrompt, 3000);
  }

  // ========== 14. DAILY REMINDER ==========
  var dailyKey = 'studypro_daily_visit_' + new Date().toISOString().slice(0, 10);
  if (!localStorage.getItem(dailyKey)) {
    var dailyReminder = document.createElement('div');
    dailyReminder.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#18181b;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px 20px;z-index:999;max-width:280px;box-shadow:0 8px 32px rgba(0,0,0,.4)';
    dailyReminder.innerHTML = '<div style="font-size:.85em;margin-bottom:8px">📅 <strong>Daily Practice</strong></div><div style="font-size:.82em;color:#a1a1aa;margin-bottom:12px">Complete 1 paper today to keep your streak alive!</div><button onclick="this.parentElement.remove();localStorage.setItem(\'' + dailyKey + '\',\'1\')" class="pc-btn" style="font-size:.8em;padding:6px 14px">Got it!</button>';
    setTimeout(function () { document.body.appendChild(dailyReminder); }, 5000);
    localStorage.setItem(dailyKey, '1');
  }
})();