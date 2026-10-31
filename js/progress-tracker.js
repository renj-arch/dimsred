// progress-tracker.js — Study Progress Tracking for vlymbooq
// Tracks page visits, computes progress per subject, recommends next topics.
// Works entirely in localStorage (offline-capable, no backend required).
(function () {
  'use strict';

  var STORAGE_KEY = 'vlymbooq_progress';
  var VISIT_KEY = 'vlymbooq_visits';

  // Subject detection from URL path
  function detectSubject() {
    var path = window.location.pathname.toLowerCase();
    var subjects = {
      '/cgl/': 'SSC CGL',
      '/rbi/': 'RBI Grade B',
      '/jee/': 'JEE',
      '/neet/': 'NEET',
      '/gate/': 'GATE',
      '/upsc/': 'UPSC',
      '/ssc-je': 'SSC JE',
      '/agniveer/': 'Agniveer',
      '/ibps-po/': 'IBPS PO',
      '/sbi-clerk/': 'SBI Clerk',
      '/ssc-gd/': 'SSC GD',
      '/lda/': 'LDC',
      '/ctet/': 'CTET',
      '/kerala-psc/': 'Kerala PSC',
      '/nda/': 'NDA',
      '/cds/': 'CDS',
      '/clat/': 'CLAT',
      'math.html': 'Mathematics',
      'physics.html': 'Physics',
      'chemistry.html': 'Chemistry',
      'science.html': 'Science',
      'current-affairs.html': 'Current Affairs',
      'mental.html': 'Mental Training',
      'films.html': 'Educational Films',
      'lecture.html': 'Lectures',
      'lab.html': 'Lab',
      'ask.html': 'Ask Vlymbooq',
      'map.html': 'Knowledge Map',
      'flowchart.html': 'Flowchart',
      'mains.html': 'Mains',
      'papers.html': 'Papers',
      'revision.html': 'Revision',
      'mistakes.html': 'Mistake Review',
      'dashboard.html': 'Dashboard'
    };
    for (var key in subjects) {
      if (path.indexOf(key) !== -1) return subjects[key];
    }
    return 'General';
  }

  // Get stored progress data
  function getData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { subjects: {}, pages: {}, streak: 0, lastVisit: null };
    } catch (e) {
      return { subjects: {}, pages: {}, streak: 0, lastVisit: null };
    }
  }

  // Save progress data
  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* quota exceeded, silently fail */ }
  }

  // Record a page visit
  function recordVisit() {
    var data = getData();
    var page = window.location.pathname.split('/').pop() || 'index.html';
    var subject = detectSubject();
    var now = new Date().toISOString();

    // Record page visit
    if (!data.pages[page]) {
      data.pages[page] = { firstVisit: now, visits: 0, subject: subject };
    }
    data.pages[page].visits++;
    data.pages[page].lastVisit = now;

    // Update subject stats
    if (!data.subjects[subject]) {
      data.subjects[subject] = { pages: {}, totalVisits: 0, firstVisit: now };
    }
    data.subjects[subject].pages[page] = true;
    data.subjects[subject].totalVisits++;
    data.subjects[subject].lastVisit = now;

    // Update streak
    var today = now.slice(0, 10);
    if (data.lastVisit) {
      var lastDay = data.lastVisit.slice(0, 10);
      if (lastDay !== today) {
        var lastDate = new Date(lastDay);
        var todayDate = new Date(today);
        var diffDays = Math.round((todayDate - lastDate) / 86400000);
        if (diffDays === 1) {
          data.streak = (data.streak || 0) + 1;
        } else if (diffDays > 1) {
          data.streak = 1;
        }
      }
    } else {
      data.streak = 1;
    }
    data.lastVisit = now;

    saveData(data);
    return data;
  }

  // Get progress summary
  function getSummary() {
    var data = getData();
    var subjects = [];
    for (var name in data.subjects) {
      var s = data.subjects[name];
      subjects.push({
        name: name,
        pagesVisited: Object.keys(s.pages).length,
        totalVisits: s.totalVisits,
        lastVisit: s.lastVisit
      });
    }
    subjects.sort(function (a, b) { return b.totalVisits - a.totalVisits; });
    return {
      subjects: subjects,
      totalPages: Object.keys(data.pages).length,
      totalVisits: Object.keys(data.pages).reduce(function (sum, p) { return sum + data.pages[p].visits; }, 0),
      streak: data.streak || 0,
      lastVisit: data.lastVisit
    };
  }

  // Get recommended next topics (subjects with fewest visits)
  function getRecommendations(count) {
    count = count || 5;
    var summary = getSummary();
    var allSubjects = [
      'SSC CGL', 'RBI Grade B', 'JEE', 'NEET', 'GATE', 'UPSC',
      'SSC JE', 'IBPS PO', 'SBI Clerk', 'NDA', 'CDS', 'CTET',
      'Mathematics', 'Physics', 'Chemistry', 'Science',
      'Current Affairs', 'Mental Training', 'Educational Films',
      'Lectures', 'Lab', 'Ask Vlymbooq', 'Knowledge Map',
      'Flowchart', 'Mains', 'Papers', 'Revision', 'Mistake Review'
    ];
    var visited = {};
    summary.subjects.forEach(function (s) { visited[s.name] = s.pagesVisited; });

    var unvisited = allSubjects.filter(function (s) { return !visited[s] || visited[s] === 0; });
    var lessVisited = allSubjects
      .filter(function (s) { return visited[s] && visited[s] < 3; })
      .sort(function (a, b) { return (visited[a] || 0) - (visited[b] || 0); });

    var recs = unvisited.slice(0, count);
    if (recs.length < count) {
      recs = recs.concat(lessVisited.slice(0, count - recs.length));
    }
    return recs.slice(0, count);
  }

  // Render a progress widget into a container
  function renderWidget(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var summary = getSummary();
    var recs = getRecommendations(5);

    var html = '<div class="progress-widget">';
    html += '<h3>📊 Study Progress</h3>';
    html += '<div class="progress-stats">';
    html += '<div class="stat"><span class="stat-value">' + summary.totalPages + '</span><span class="stat-label">Pages Visited</span></div>';
    html += '<div class="stat"><span class="stat-value">' + summary.streak + '</span><span class="stat-label">Day Streak</span></div>';
    html += '<div class="stat"><span class="stat-value">' + summary.subjects.length + '</span><span class="stat-label">Subjects</span></div>';
    html += '</div>';

    if (summary.subjects.length > 0) {
      html += '<div class="progress-bars">';
      summary.subjects.slice(0, 8).forEach(function (s) {
        var pct = Math.min(100, Math.round((s.pagesVisited / 5) * 100));
        html += '<div class="progress-bar-row">';
        html += '<span class="progress-bar-label">' + s.name + '</span>';
        html += '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>';
        html += '<span class="progress-bar-count">' + s.pagesVisited + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    if (recs.length > 0) {
      html += '<div class="progress-recs">';
      html += '<h4>Recommended Next</h4>';
      html += '<ul>';
      recs.forEach(function (r) {
        html += '<li>' + r + '</li>';
      });
      html += '</ul>';
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  // Auto-record visit on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', recordVisit);
  } else {
    recordVisit();
  }

  // Expose API
  window.ProgressTracker = {
    recordVisit: recordVisit,
    getSummary: getSummary,
    getRecommendations: getRecommendations,
    renderWidget: renderWidget,
    getData: getData
  };
})();
