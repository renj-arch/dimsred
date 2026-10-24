(function(){
  var container = document.getElementById('exam-calendar');
  if (!container) return;

  var STORAGE_KEY = 'vlymbooq_practice_log';
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  var papers = [];
  var currentMonth = new Date().getMonth();
  var currentYear = new Date().getFullYear();
  var today = new Date();

  function todayStr() {
    return today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
  }

  function getLog() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(e) { return []; }
  }

  function saveLog(log) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  }

  function markToday() {
    var log = getLog();
    var ts = todayStr();
    if (log.indexOf(ts) === -1) {
      log.push(ts);
      saveLog(log);
    }
    render();
  }

  function calcStreak() {
    var log = getLog();
    if (log.length === 0) return 0;
    var sorted = log.slice().sort().reverse();
    var streak = 0;
    var d = new Date(today);
    for (var i = 0; i < sorted.length; i++) {
      var expected = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      if (sorted[i] === expected) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  function papersForDate(year, month, day) {
    var ds = year + '-' + String(month + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
    return papers.filter(function(p) { return p.date === ds; });
  }

  function loadData() {
    // Try inline data first
    var scriptTag = document.getElementById('papers-manifest');
    if (scriptTag) {
      try { papers = JSON.parse(scriptTag.textContent); } catch(e) {}
      if (papers.length) { render(); return; }
    }
    // XHR fallback
    var dataUrl = container.getAttribute('data-src') || 'papers/calendar-data.json';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', dataUrl, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { papers = JSON.parse(xhr.responseText); } catch(e) {}
        }
        render();
      }
    };
    xhr.send();
  }

  function render() {
    var firstDay = new Date(currentYear, currentMonth, 1).getDay();
    var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    var ts = todayStr();
    var log = getLog();
    var streak = calcStreak();
    var practicedToday = log.indexOf(ts) >= 0;

    container.innerHTML = '';

    // Streak
    if (streak > 1 || practicedToday) {
      var streakEl = document.createElement('div');
      streakEl.className = 'cal-streak';
      streakEl.innerHTML = '<span class="cal-streak-fire">🔥</span><span class="cal-streak-count">' + streak + '-day streak!</span>';
      container.appendChild(streakEl);
    }

    // Prompt
    var promptEl = document.createElement('div');
    promptEl.className = practicedToday ? 'cal-prompt cal-prompt-done' : 'cal-prompt';
    if (!practicedToday) {
      promptEl.innerHTML = '<span class="cal-prompt-icon">📅</span><span class="cal-prompt-text">Complete 1 paper today to keep your streak alive!</span><button class="cal-gotit">Got it!</button>';
      promptEl.querySelector('.cal-gotit').addEventListener('click', markToday);
    } else {
      promptEl.innerHTML = '<span class="cal-prompt-icon">✅</span><span class="cal-prompt-text">Today\'s practice done! Come back tomorrow.</span>';
    }
    container.appendChild(promptEl);

    // Header
    var headerEl = document.createElement('div');
    headerEl.className = 'cal-header';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'cal-prev';
    prevBtn.textContent = '\u25C0';
    prevBtn.addEventListener('click', function() {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      render();
    });
    headerEl.appendChild(prevBtn);

    var titleEl = document.createElement('span');
    titleEl.className = 'cal-title';
    titleEl.textContent = MONTHS[currentMonth] + ' ' + currentYear;
    headerEl.appendChild(titleEl);

    var nextBtn = document.createElement('button');
    nextBtn.className = 'cal-next';
    nextBtn.textContent = '\u25B6';
    nextBtn.addEventListener('click', function() {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      render();
    });
    headerEl.appendChild(nextBtn);

    // Today button (only if not on current month)
    if (currentMonth !== today.getMonth() || currentYear !== today.getFullYear()) {
      var todayBtn = document.createElement('button');
      todayBtn.className = 'cal-today-btn';
      todayBtn.textContent = 'Today';
      todayBtn.addEventListener('click', function() {
        currentMonth = today.getMonth();
        currentYear = today.getFullYear();
        render();
      });
      headerEl.appendChild(todayBtn);
    }

    container.appendChild(headerEl);

    // Day labels
    var daysGrid = document.createElement('div');
    daysGrid.className = 'cal-days';

    for (var d = 0; d < 7; d++) {
      var label = document.createElement('div');
      label.className = 'cal-day-label';
      label.textContent = DAYS[d];
      daysGrid.appendChild(label);
    }

    // Empty cells
    for (var i = 0; i < firstDay; i++) {
      var empty = document.createElement('div');
      empty.className = 'cal-cell cal-empty';
      daysGrid.appendChild(empty);
    }

    // Day cells
    for (var day = 1; day <= daysInMonth; day++) {
      var ds = currentYear + '-' + String(currentMonth + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
      var match = papersForDate(currentYear, currentMonth, day);
      var done = log.indexOf(ds) >= 0;

      var cell = document.createElement('div');
      var cls = 'cal-cell';
      if (match.length > 0) cls += ' cal-has-paper';
      if (done) cls += ' cal-done';
      if (ds === ts) cls += ' cal-today';
      cell.className = cls;
      cell.textContent = day;

      if (match.length > 0) {
        (function(papersList) {
          cell.addEventListener('click', function() {
            if (papersList.length === 1) {
              window.location.href = 'papers/' + papersList[0].slug + '.html';
            } else {
              showModal(papersList);
            }
          });
        })(match);
      }

      daysGrid.appendChild(cell);
    }

    container.appendChild(daysGrid);

    // Legend
    var legend = document.createElement('div');
    legend.className = 'cal-legend';
    legend.innerHTML = '<span><span class="cal-dot" style="background:rgba(139,92,246,.5)"></span> Paper available</span><span><span class="cal-dot" style="background:rgba(52,211,153,.5)"></span> Completed</span>';
    container.appendChild(legend);
  }

  function showModal(papersList) {
    var overlay = document.createElement('div');
    overlay.className = 'cal-overlay';

    var modal = document.createElement('div');
    modal.className = 'cal-modal';

    var header = document.createElement('div');
    header.className = 'cal-modal-header';
    header.innerHTML = '<span>Papers available</span><button class="cal-modal-close">✕</button>';
    header.querySelector('.cal-modal-close').addEventListener('click', function() { overlay.remove(); });
    modal.appendChild(header);

    var body = document.createElement('div');
    body.className = 'cal-modal-body';

    papersList.forEach(function(p) {
      var link = document.createElement('a');
      link.className = 'cal-modal-item';
      link.href = 'papers/' + p.slug + '.html';
      link.innerHTML = '<span class="cal-modal-title">' + p.title + '</span><span class="cal-modal-meta">' + (p.questions || '?') + ' Q</span>';
      body.appendChild(link);
    });

    modal.appendChild(body);
    overlay.appendChild(modal);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  loadData();
})();
