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

  function papersForDate(year, month, day) {
    var ds = year + '-' + String(month + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
    return papers.filter(function(p) { return p.date === ds; });
  }

  function openModal(list) {
    if (list.length === 1) {
      window.location.href = 'papers/' + list[0] + '.html';
      return;
    }
    var items = list.map(function(s) {
      var p = papers.filter(function(x) { return x.slug === s; })[0];
      if (!p) return '<div class="cal-modal-item">' + escapeHtml(s) + '</div>';
      return '<a href="papers/' + encodeURIComponent(s) + '.html" class="cal-modal-item">' +
        '<span class="cal-modal-title">' + escapeHtml(p.title) + '</span>' +
        '<span class="cal-modal-meta">' + (p.questions || '?') + ' Q</span>' +
        '</a>';
    }).join('');
    var overlay = document.createElement('div');
    overlay.className = 'cal-overlay';
    overlay.innerHTML =
      '<div class="cal-modal"><div class="cal-modal-header">' +
      '<span>Papers available</span>' +
      '<button class="cal-modal-close" data-close-overlay>&#10005;</button>' +
      '</div><div class="cal-modal-body">' + items + '</div></div>';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Event delegation: one listener on container for all clicks
  container.addEventListener('click', function(e) {
    var cell = e.target.closest('.cal-cell');
    if (cell && cell.dataset.slugs) {
      openModal(cell.dataset.slugs.split(','));
      return;
    }
    if (e.target.classList.contains('cal-gotit')) {
      markToday();
      return;
    }
    if (e.target.classList.contains('cal-prev')) {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      render();
      return;
    }
    if (e.target.classList.contains('cal-next')) {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      render();
      return;
    }
    // Modal close button
    if (e.target.hasAttribute('data-close-overlay')) {
      var overlay = e.target.closest('.cal-overlay');
      if (overlay) overlay.remove();
    }
  });

  function loadData() {
    var scriptTag = document.getElementById('papers-manifest');
    if (scriptTag) {
      try { papers = JSON.parse(scriptTag.textContent); } catch(e) { console.warn('Calendar: invalid manifest JSON'); }
      if (papers.length) { render(); return; }
    }
    var dataUrl = container.getAttribute('data-src') || 'papers/calendar-data.json';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', dataUrl, true);
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { papers = JSON.parse(xhr.responseText); } catch(e) { console.warn('Calendar: invalid JSON from ' + dataUrl); }
      } else {
        console.warn('Calendar: HTTP ' + xhr.status + ' loading ' + dataUrl);
      }
      render();
    };
    xhr.onerror = function() {
      console.warn('Calendar: network error loading ' + dataUrl);
      render();
    };
    try { xhr.send(); } catch(e) { console.warn('Calendar: send failed', e); render(); }
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
      html += '<span class="cal-streak-fire">&#x1F525;</span>';
      html += '<span class="cal-streak-count">' + streak + '-day streak!</span>';
      html += '</div>';
    }

    if (!practicedToday) {
      html += '<div class="cal-prompt">';
      html += '<span class="cal-prompt-icon">&#x1F4C5;</span>';
      html += '<span class="cal-prompt-text">Complete 1 paper today to keep your streak alive!</span>';
      html += '<button class="cal-gotit">Got it!</button>';
      html += '</div>';
    } else {
      html += '<div class="cal-prompt cal-prompt-done">';
      html += '<span class="cal-prompt-icon">&#x2705;</span>';
      html += '<span class="cal-prompt-text">Today\'s practice done! Come back tomorrow.</span>';
      html += '</div>';
    }

    // Calendar header
    html += '<div class="cal-header">';
    html += '<button class="cal-prev">&#x25C0;</button>';
    html += '<span class="cal-title">' + MONTHS[currentMonth] + ' ' + currentYear + '</span>';
    html += '<button class="cal-next">&#x25B6;</button>';
    html += '</div>';

    html += '<div class="cal-days">';
    for (var d = 0; d < 7; d++) {
      html += '<div class="cal-day-label">' + DAYS[d] + '</div>';
    }

    for (var i = 0; i < firstDay; i++) {
      html += '<div class="cal-cell cal-empty"></div>';
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var ds = currentYear + '-' + String(currentMonth + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
      var match = papersForDate(currentYear, currentMonth, day);
      var done = log.indexOf(ds) >= 0;
      var extra = '';
      if (match.length > 0) extra += ' cal-has-paper';
      if (done) extra += ' cal-done';
      if (ds === ts) extra += ' cal-today';
      var slugs = match.map(function(p) { return p.slug; }).join(',');
      html += '<div class="cal-cell' + extra + '"';
      if (match.length > 0) {
        html += ' data-slugs="' + slugs.replace(/"/g, '&quot;') + '"';
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

  loadData();
})();
