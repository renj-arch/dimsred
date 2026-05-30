(function(){
  var container = document.getElementById('exam-calendar');
  if (!container) return;

  var STORAGE_KEY = 'vlymbooq_practice_log';
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  var papers = [];
  var currentMonth = new Date().getMonth();
  var currentYear = new Date().getFullYear();

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
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
    var d = new Date();
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

  function loadData() {
    var scriptTag = document.getElementById('papers-manifest');
    if (scriptTag) {
      try { papers = JSON.parse(scriptTag.textContent); } catch(e) {}
      render();
      return;
    }
    var dataUrl = container.getAttribute('data-src') || 'papers/calendar-data.json';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', dataUrl, true);
    xhr.onload = function() {
      try { papers = JSON.parse(xhr.responseText); } catch(e) {}
      render();
    };
    xhr.send();
  }

  function papersForDate(year, month, day) {
    var ds = year + '-' + String(month + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
    return papers.filter(function(p) { return p.date === ds; });
  }

  function render() {
    var firstDay = new Date(currentYear, currentMonth, 1).getDay();
    var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    var ts = todayStr();
    var log = getLog();
    var streak = calcStreak();
    var practicedToday = log.indexOf(ts) >= 0;

    var html = '';

    // Streak banner
    if (streak > 1 || practicedToday) {
      html += '<div class="cal-streak">';
      html += '<span class="cal-streak-fire">🔥</span>';
      html += '<span class="cal-streak-count">' + streak + '-day streak!</span>';
      html += '</div>';
    }

    if (!practicedToday) {
      html += '<div class="cal-prompt">';
      html += '<span class="cal-prompt-icon">📅</span>';
      html += '<span class="cal-prompt-text">Complete 1 paper today to keep your streak alive!</span>';
      html += '<button class="cal-gotit" onclick="window.__calGotIt()">Got it!</button>';
      html += '</div>';
    } else {
      html += '<div class="cal-prompt cal-prompt-done">';
      html += '<span class="cal-prompt-icon">✅</span>';
      html += '<span class="cal-prompt-text">Today\'s practice done! Come back tomorrow.</span>';
      html += '</div>';
    }

    // Calendar header
    html += '<div class="cal-header">';
    html += '<button class="cal-prev" onclick="window.__calNav(-1)">\u25C0</button>';
    html += '<span class="cal-title">' + MONTHS[currentMonth] + ' ' + currentYear + '</span>';
    html += '<button class="cal-next" onclick="window.__calNav(1)">\u25B6</button>';
    html += '</div>';

    // Day labels
    html += '<div class="cal-days">';
    for (var d = 0; d < 7; d++) {
      html += '<div class="cal-day-label">' + DAYS[d] + '</div>';
    }

    // Empty cells before first day
    for (var i = 0; i < firstDay; i++) {
      html += '<div class="cal-cell cal-empty"></div>';
    }

    // Day cells
    for (var day = 1; day <= daysInMonth; day++) {
      var ds = currentYear + '-' + String(currentMonth + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
      var match = papersForDate(currentYear, currentMonth, day);
      var done = log.indexOf(ds) >= 0;
      var extra = '';
      if (match.length > 0) extra += ' cal-has-paper';
      if (done) extra += ' cal-done';
      if (ds === ts) extra += ' cal-today';
      var title = match.length > 0 ? match.map(function(p) { return p.title; }).join('; ') : '';
      html += '<div class="cal-cell' + extra + '" title="' + title.replace(/"/g, '&quot;') + '"';
      if (match.length > 0) {
        var slugs = match.map(function(p) { return p.slug; }).join(',');
        html += ' data-slugs="' + slugs.replace(/"/g, '&quot;') + '" onclick="window.__calPick(\'' + slugs.replace(/'/g, "\\'") + '\')"';
      }
      html += '>' + day + '</div>';
    }

    html += '</div>';

    // Legend
    html += '<div class="cal-legend">';
    html += '<span><span class="cal-dot" style="background:rgba(139,92,246,.5)"></span> Paper available</span>';
    html += '<span><span class="cal-dot" style="background:rgba(52,211,153,.5)"></span> Completed</span>';
    html += '</div>';

    container.innerHTML = html;
  }

  function openModal(slugs) {
    var list = slugs.split(',');
    if (list.length === 1) {
      window.location.href = 'papers/' + list[0] + '.html';
      return;
    }
    var items = list.map(function(s) {
      var p = papers.filter(function(x) { return x.slug === s; })[0];
      if (!p) return '<div class="cal-modal-item">' + s + '</div>';
      return '<a href="papers/' + s + '.html" class="cal-modal-item">' +
        '<span class="cal-modal-title">' + p.title + '</span>' +
        '<span class="cal-modal-meta">' + (p.questions || '?') + ' Q</span>' +
        '</a>';
    }).join('');
    var overlay = document.createElement('div');
    overlay.className = 'cal-overlay';
    overlay.innerHTML = '<div class="cal-modal"><div class="cal-modal-header">' +
      '<span>Papers available</span>' +
      '<button class="cal-modal-close" onclick="this.closest(\'.cal-overlay\').remove()">✕</button>' +
      '</div><div class="cal-modal-body">' + items + '</div></div>';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  window.__calNav = function(dir) {
    currentMonth += dir;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    render();
  };

  window.__calPick = function(slugs) {
    openModal(slugs);
  };

  window.__calGotIt = function() {
    markToday();
  };

  loadData();
})();
