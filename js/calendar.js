(function(){
  var container = document.getElementById('exam-calendar');
  if (!container) return;

  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  var papers = [];
  var currentMonth = new Date().getMonth();
  var currentYear = new Date().getFullYear();

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

    var html = '<div class="cal-header">';
    html += '<button class="cal-prev" onclick="window.__calNav(-1)">\u25C0</button>';
    html += '<span class="cal-title">' + MONTHS[currentMonth] + ' ' + currentYear + '</span>';
    html += '<button class="cal-next" onclick="window.__calNav(1)">\u25B6</button>';
    html += '</div>';

    html += '<div class="cal-days">';
    for (var d = 0; d < 7; d++) {
      html += '<div class="cal-day-label">' + DAYS[d] + '</div>';
    }

    for (var i = 0; i < firstDay; i++) {
      html += '<div class="cal-cell cal-empty"></div>';
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var match = papersForDate(currentYear, currentMonth, day);
      var extra = match.length > 0 ? ' cal-has-paper' : '';
      var title = match.length > 0 ? match.map(function(p) { return p.title; }).join('; ') : '';
      html += '<div class="cal-cell' + extra + '" title="' + title + '"';
      if (match.length > 0) {
        html += ' onclick="window.__calPaper(\'' + match[0].slug + '\')"';
      }
      html += '>' + day + '</div>';
    }

    html += '</div>';

    if (papers.length > 0) {
      html += '<div class="cal-legend"><span class="cal-dot"></span> Practice paper available</div>';
    }

    container.innerHTML = html;
  }

  window.__calNav = function(dir) {
    currentMonth += dir;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    render();
  };

  window.__calPaper = function(slug) {
    window.location.href = 'papers/' + slug + '.html';
  };

  loadData();
})();
