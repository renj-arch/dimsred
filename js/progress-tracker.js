// progress-tracker.js — Study Progress Tracking for vlymbooq
// Tracks page visits, computes progress per subject, recommends next topics.
// Works entirely in localStorage (offline-capable, no backend required).
(function () {
  'use strict';

  var STORAGE_KEY = 'vlymbooq_progress';

  // Single source of truth: the subject, the path fragment that identifies it,
  // and where to send the user. Exam directories are checked before root pages
  // because every exam URL also contains a slash-delimited path.
  //
  // `study: false` marks utility pages (dashboard, progress) so they are
  // recorded but do not inflate "subjects explored" or recommendations.
  var SUBJECTS = [
    { name: 'SSC CGL', match: '/cgl/', href: '/cgl/' },
    { name: 'RBI Grade B', match: '/rbi/', href: '/rbi/' },
    { name: 'JEE', match: '/jee/', href: '/jee/' },
    { name: 'NEET', match: '/neet/', href: '/neet/' },
    { name: 'GATE', match: '/gate/', href: '/gate/' },
    { name: 'UPSC', match: '/upsc/', href: '/upsc/' },
    { name: 'Agniveer', match: '/agniveer/', href: '/agniveer/' },
    { name: 'IBPS PO', match: '/ibps-po/', href: '/ibps-po/' },
    { name: 'SBI Clerk', match: '/sbi-clerk/', href: '/sbi-clerk/' },
    { name: 'SSC GD', match: '/ssc-gd/', href: '/ssc-gd/' },
    { name: 'CTET', match: '/ctet/', href: '/ctet/' },
    { name: 'Kerala PSC', match: '/kerala-psc/', href: '/kerala-psc/' },
    { name: 'NDA', match: '/nda/', href: '/nda/' },
    { name: 'CDS', match: '/cds/', href: '/cds/' },
    { name: 'CLAT', match: '/clat/', href: '/clat/' },
    { name: 'SSC JE', match: 'ssc-je.html', href: 'ssc-je.html' },
    { name: 'Mathematics', match: 'math.html', href: 'math.html' },
    { name: 'Physics', match: 'physics.html', href: 'physics.html' },
    { name: 'Chemistry', match: 'chemistry.html', href: 'chemistry.html' },
    { name: 'Science', match: 'science.html', href: 'science.html' },
    { name: 'Current Affairs', match: 'current-affairs.html', href: 'current-affairs.html' },
    { name: 'Mental Training', match: 'mental.html', href: 'mental.html' },
    { name: 'Educational Films', match: 'films.html', href: 'films.html' },
    { name: 'Lectures', match: 'lecture.html', href: 'lecture.html' },
    { name: 'Lab', match: 'lab.html', href: 'lab.html' },
    { name: 'Ask Vlymbooq', match: 'ask.html', href: 'ask.html' },
    { name: 'Knowledge Map', match: 'map.html', href: 'map.html' },
    { name: 'Knowledge Graph', match: 'knowledge-graph.html', href: 'knowledge-graph.html' },
    { name: 'Flowchart', match: 'flowchart.html', href: 'flowchart.html' },
    { name: 'Mains', match: 'mains.html', href: 'mains.html' },
    { name: 'Papers', match: 'papers.html', href: 'papers.html' },
    { name: 'Revision', match: 'revision.html', href: 'revision.html' },
    { name: 'Mistake Review', match: 'mistakes.html', href: 'mistakes.html' },
    { name: 'Dashboard', match: 'dashboard.html', href: 'dashboard.html', study: false },
    { name: 'Progress', match: 'progress.html', href: 'progress.html', study: false }
  ];

  function detectSubject() {
    var path = window.location.pathname.toLowerCase();
    for (var i = 0; i < SUBJECTS.length; i++) {
      if (path.indexOf(SUBJECTS[i].match) !== -1) return SUBJECTS[i].name;
    }
    return 'General';
  }

  function subjectEntry(name) {
    for (var i = 0; i < SUBJECTS.length; i++) {
      if (SUBJECTS[i].name === name) return SUBJECTS[i];
    }
    return null;
  }

  function isStudySubject(name) {
    var entry = subjectEntry(name);
    return !entry || entry.study !== false;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
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

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* quota exceeded or private mode; tracking is best-effort */ }
  }

  // Record a page visit. Called synchronously at script load: this script sits
  // at the end of the body, the DOM is already parsed, and callers that render
  // a dashboard immediately after must be able to read today's visit.
  function recordVisit() {
    var data = getData();
    // Use the site-relative path, not the last segment. Every exam landing page
    // ends in a slash (/cgl/, /rbi/), so `.pop()` returned '' and they all
    // collapsed into one 'index.html' entry, undercounting pages visited.
    var page = window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '') || 'index.html';
    var subject = detectSubject();
    var now = new Date().toISOString();

    if (!data.pages[page]) {
      data.pages[page] = { firstVisit: now, visits: 0, subject: subject };
    }
    // Monotonic counter: two visits can land in the same millisecond, which
    // makes a timestamp-only "recent pages" sort ambiguous.
    data.visitSeq = (data.visitSeq || 0) + 1;
    data.pages[page].seq = data.visitSeq;
    data.pages[page].visits++;
    data.pages[page].lastVisit = now;

    if (!data.subjects[subject]) {
      data.subjects[subject] = { pages: {}, totalVisits: 0, firstVisit: now };
    }
    data.subjects[subject].pages[page] = true;
    data.subjects[subject].totalVisits++;
    data.subjects[subject].lastVisit = now;

    // Streak counts consecutive calendar days with at least one visit.
    var today = now.slice(0, 10);
    if (data.lastVisit) {
      var lastDay = data.lastVisit.slice(0, 10);
      if (lastDay !== today) {
        var diffDays = Math.round((new Date(today) - new Date(lastDay)) / 86400000);
        data.streak = diffDays === 1 ? (data.streak || 0) + 1 : 1;
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
        lastVisit: s.lastVisit,
        study: isStudySubject(name)
      });
    }
    subjects.sort(function (a, b) { return b.totalVisits - a.totalVisits; });
    return {
      subjects: subjects,
      studySubjects: subjects.filter(function (s) { return s.study; }),
      totalPages: Object.keys(data.pages).length,
      totalVisits: Object.keys(data.pages).reduce(function (sum, p) { return sum + data.pages[p].visits; }, 0),
      streak: data.streak || 0,
      lastVisit: data.lastVisit
    };
  }

  // Most recently visited pages, newest first
  function getRecentPages(count) {
    var data = getData();
    return Object.keys(data.pages).map(function (page) {
      return {
        page: page,
        visits: data.pages[page].visits,
        subject: data.pages[page].subject,
        seq: data.pages[page].seq || 0,
        lastVisit: data.pages[page].lastVisit
      };
    }).sort(function (a, b) {
      return (b.seq - a.seq) || (new Date(b.lastVisit) - new Date(a.lastVisit));
    }).slice(0, count || 10);
  }

  // Recommended next topics as { name, href }: unvisited study subjects first,
  // then lightly-explored ones, each with a real destination.
  function getRecommendations(count) {
    count = count || 5;
    var visited = {};
    getSummary().studySubjects.forEach(function (s) { visited[s.name] = s.pagesVisited; });

    var pool = SUBJECTS.filter(function (s) { return s.study !== false; });
    var unvisited = pool.filter(function (s) { return !visited[s.name]; });
    var lessVisited = pool
      .filter(function (s) { return visited[s.name] && visited[s.name] < 3; })
      .sort(function (a, b) { return visited[a.name] - visited[b.name]; });

    return unvisited.concat(lessVisited).slice(0, count).map(function (s) {
      return { name: s.name, href: s.href };
    });
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
    html += '<div class="stat"><span class="stat-value">' + summary.studySubjects.length + '</span><span class="stat-label">Subjects</span></div>';
    html += '</div>';

    if (summary.studySubjects.length > 0) {
      html += '<div class="progress-bars">';
      summary.studySubjects.slice(0, 8).forEach(function (s) {
        var pct = Math.min(100, Math.round((s.pagesVisited / 5) * 100));
        html += '<div class="progress-bar-row">';
        html += '<span class="progress-bar-label">' + escapeHtml(s.name) + '</span>';
        html += '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>';
        html += '<span class="progress-bar-count">' + s.pagesVisited + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    if (recs.length > 0) {
      html += '<div class="progress-recs">';
      html += '<h4>Recommended Next</h4><ul>';
      recs.forEach(function (r) {
        html += '<li><a href="' + escapeHtml(r.href) + '">' + escapeHtml(r.name) + '</a></li>';
      });
      html += '</ul></div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  recordVisit();

  window.ProgressTracker = {
    recordVisit: recordVisit,
    getSummary: getSummary,
    getRecommendations: getRecommendations,
    getRecentPages: getRecentPages,
    renderWidget: renderWidget,
    getData: getData,
    subjects: SUBJECTS
  };
})();
