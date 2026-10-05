(function () {
  var ALL = {};
  var BY_ID = {};

  function merge(dest, src) {
    if (!src) return;
    var k;
    for (k in src) {
      if (Object.prototype.hasOwnProperty.call(src, k)) {
        dest[k] = (dest[k] || []).concat(src[k]);
      }
    }
  }

  if (typeof window !== 'undefined') {
    merge(ALL, window.SSC_JE_MECHANICAL);
    merge(ALL, window.SSC_JE_TF);
    merge(ALL, window.SSC_JE_EXTRA);
    merge(ALL, window.SSC_JE_EXTRA2);
    merge(ALL, window.SSC_JE_EXTRA3);
    merge(ALL, window.SSC_JE_EXTRA4);
    merge(ALL, window.SSC_JE_EXTRA5);
    merge(ALL, window.SSC_JE_ENC_SOMTOM);
    merge(ALL, window.SSC_JE_ENC_THERMO);
    merge(ALL, window.SSC_JE_ENC_FLUIDS);
    merge(ALL, window.SSC_JE_ENC_DESIGN);
    merge(ALL, window.SSC_JE_ENC_EMECH);
    merge(ALL, window.SSC_JE_ENC_RACMAT);
    merge(ALL, window.SSC_JE_ENC_MATHS);
    merge(ALL, window.SSC_JE_ENC2_SOMDES);
    merge(ALL, window.SSC_JE_ENC2_TOMFLUIDS);
    merge(ALL, window.SSC_JE_ENC2_PROD);
    merge(ALL, window.SSC_JE_ENC2_INDMATHS);
    merge(ALL, window.SSC_JE_ENC2_EMECHMAT);
    merge(ALL, window.SSC_JE_ENC2_ICE);
    merge(ALL, window.SSC_JE_ENC2_RACHYD);
    merge(ALL, window.SSC_JE_ENC3_SOMDES);
    merge(ALL, window.SSC_JE_ENC3_TOMFLUIDS);
    merge(ALL, window.SSC_JE_ENC3_PROD);
    merge(ALL, window.SSC_JE_ENC3_INDMATHS);
    merge(ALL, window.SSC_JE_ENC3_EMECHMAT);
    merge(ALL, window.SSC_JE_ENC3_ICETHERMO);
    merge(ALL, window.SSC_JE_ENC3_RACHYD);
    merge(ALL, window.SSC_JE_ENC4_AIRCOMP);
    merge(ALL, window.SSC_JE_ENC4_STEAMT);
    merge(ALL, window.SSC_JE_ENC4_STEAMN);
    merge(ALL, window.SSC_JE_ENC4_BOILERS);
    merge(ALL, window.SSC_JE_ENC4_HEATT);
  merge(ALL, window.SSC_JE_ENC5_GASTURB);
  merge(ALL, window.SSC_JE_ENC5_POWERPLANT);
  merge(ALL, window.SSC_JE_ENC5_NUCLEAR);
  merge(ALL, window.SSC_JE_ENC5_RENEW);
  merge(ALL, window.SSC_JE_GAPS);
    merge(ALL, window.SSC_JE_MECHENG);
  merge(ALL, window.SSC_JE_ESEMAINS);
  merge(ALL, window.SSC_JE_PYG);
  }

  var SUBJECTS = {
    som:        { name: "Strength of Materials",      icon: "\u2206", color: "#3b82f6" },
    tom:        { name: "Theory of Machines",          icon: "\u2699", color: "#8b5cf6" },
    thermo:     { name: "Thermodynamics",              icon: "\u0394", color: "#ef4444" },
    fluids:     { name: "Fluid Mechanics",             icon: "\u223F", color: "#06b6d4" },
    design:     { name: "Machine Design",              icon: "\u2318", color: "#f59e0b" },
    production: { name: "Production Technology",       icon: "\u2302", color: "#10b981" },
    workshop:   { name: "Workshop Technology",         icon: "\u2692", color: "#6366f1" },
    industrial: { name: "Industrial Engineering",      icon: "\u23F1", color: "#84cc16" },
    maths:      { name: "Engineering Mathematics",     icon: "\u2211", color: "#ec4899" },
    emech:      { name: "Engineering Mechanics",       icon: "\u21C4", color: "#f97316" },
    materials:  { name: "Materials & Metallurgy",       icon: "\u25C6", color: "#14b8a6" },
    rac:        { name: "Refrigeration & Air Conditioning", icon: "\u2744", color: "#0ea5e9" },
    ice:        { name: "IC Engines",                  icon: "\u21BB", color: "#e11d48" },
    hydmach:    { name: "Hydraulic Machines",          icon: "\u2668", color: "#475569" },
    aircomp:    { name: "Air Compressors",             icon: "\u26A1", color: "#0891b2" },
    steamturb:  { name: "Steam Turbines & Condensers", icon: "\u2601", color: "#7c3aed" },
    steamnozz:  { name: "Steam Nozzles",               icon: "\u25B6", color: "#0f766e" },
    boilers:    { name: "Boilers",                     icon: "\u2600", color: "#dc2626" },
    heatt:      { name: "Heat Transfer",               icon: "\u21E8", color: "#ea580c" },
    gasturb:    { name: "Gas Turbines & Jet Propulsion",   icon: "\u2708", color: "#f472b6" },
    powerplant: { name: "Power Plant Practice",            icon: "\u269B", color: "#38bdf8" },
    nuclear:    { name: "Nuclear Power Stations",          icon: "\u2622", color: "#a855f7" },
    renew:      { name: "Renewable Energy Sources",        icon: "\u2600", color: "#22c55e" },
    mechatronics: { name: "Mechatronics & Robotics",          icon: "\u25B3", color: "#facc15" },
    maintenance: { name: "Maintenance Engineering",           icon: "\u25C7", color: "#34d399" },
    imor:       { name: "Industrial Management & OR",         icon: "\u2234", color: "#fb7185" },
    esepre:     { name: "UPSC ESE: Prelims",                  icon: "\u2630", color: "#a78bfa" },
    esemain:    { name: "UPSC ESE: Mains",                    icon: "\u2637", color: "#fbbf24" }
  };

  var Q_COUNTS = [10, 25, 50, 0];
  var TIME_CHOICES = [0, 5, 10, 15, 20];

  var state = {
    questions: [], idx: 0, score: 0, total: 0, subject: "Menu",
    revealed: {}, mode: "practice", minutes: 0,
    timeLeft: 0, elapsed: 0, timerId: null, recorded: false,
    pick: 25, bookmarks: storageGet("sscJeBm") || {}, history: storageGet("sscJeHist") || [],
    revealAll: false
  };

  function storageGet(key) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function storageSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  // Sessions persist to Supabase (quiz_progress, key 'sscje') so you can resume on any
  // device — mirrors current-affairs.html. Signed-out users simply don't get resume.
  var _saved = null;          // confirmed unfinished remote session (with .qs rebuilt)
  var _sessionsReady = false; // resume payload loaded for this page load
  var _resumePrompted = false;

  function buildResumeQuestions(raw) {
    if (!raw || !raw.ids || !raw.ids.length) return null;
    var qs = [];
    for (var i = 0; i < raw.ids.length; i++) {
      var q = BY_ID[raw.ids[i]];
      if (q) qs.push(q);
    }
    if (qs.length === 0) return null;
    if ((raw.idx || 0) >= qs.length) return null; // completed session
    raw.qs = qs;
    return raw;
  }
  function updateSyncStatus() {
    var el = $("#ssc-sync-status");
    if (!el) return;
    var s = typeof window !== 'undefined' ? window.__quizSync : null;
    if (!s || !s.last) { el.textContent = ""; el.style.color = ""; return; }
    if (s.last === "ok") {
      el.textContent = "saved \u2713";
      el.style.color = "var(--green)";
    } else if (s.last === "noauth") {
      el.textContent = "not signed in \u2014 progress not saved";
      el.style.color = "var(--text3)";
    } else {
      var d = "";
      if (s.status) d += " HTTP " + s.status;
      if (s.msg) d += " \u2014 " + String(s.msg).slice(0, 60);
      el.textContent = "sync failed" + d;
      el.style.color = "var(--amber)";
      if (typeof window !== 'undefined' && window.console) window.console.warn("ssc-je sync failed:", s);
    }
  }
  function saveSession() {
    if (!state.questions || state.questions.length === 0) return;
    if (state.subject === "Menu") return;
    var ids = [];
    for (var i = 0; i < state.questions.length; i++) ids.push(state.questions[i]._id || (i + "_" + state.questions[i].q.slice(0, 30)));
    if (typeof window.syncQuizProgress === 'function') {
      var p = window.syncQuizProgress({
        sscje: {
          subject: state.subject, mode: state.mode, minutes: state.minutes, pick: state.pick,
          idx: state.idx, score: state.score, elapsed: state.elapsed, timeLeft: state.timeLeft,
          revealAll: state.revealAll, total: state.total, answeredCount: state.idx,
          savedAt: Date.now(), ids: ids
        }
      });
      if (p && p.then) p.then(function () { updateSyncStatus(); }).catch(function () { updateSyncStatus(); });
    }
  }
  function clearSavedSession() {
    if (typeof window.syncQuizProgress === 'function') window.syncQuizProgress({ sscje: null });
  }
  function ensureResumeLoaded(cb) {
    if (_sessionsReady) { if (cb) cb(); return; }
    function attempt() {
      if (typeof window.supabaseUser === 'undefined' || !window.supabaseUser || typeof window.loadQuizProgress !== 'function') {
        _sessionsReady = true;
        if (cb) cb();
        return;
      }
      window.loadQuizProgress().then(function (saved) {
        _sessionsReady = true;
        _saved = (saved && saved.sscje) ? buildResumeQuestions(saved.sscje) : null;
        if (cb) cb();
      }).catch(function () { _sessionsReady = true; _saved = null; if (cb) cb(); });
    }
    // Wait for supabase.js to settle auth (supabaseReady) before loading, but cap the
    // wait so a rejected token refresh -- where supabaseReady never flips -- falls
    // through to a clean "no session"/"not signed in" state instead of hanging.
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if ((typeof window.supabaseReady !== 'undefined' && window.supabaseReady === true) || tries > 32) { clearInterval(timer); attempt(); }
    }, 250);
    if (typeof window.supabaseReady !== 'undefined' && window.supabaseReady === true) { clearInterval(timer); attempt(); }
  }
  function loadRemoteResume() {
    ensureResumeLoaded(function () {
      if (state.subject === "Menu") renderMenu();
      if (_saved && !_resumePrompted && state.subject === "Menu") {
        _resumePrompted = true;
        var msg = 'You have an unfinished SSC-JE session: ' + _saved.subject + ' \u2014 resume at question ' + (_saved.idx + 1) + ' of ' + _saved.qs.length + ' (' + (_saved.score || 0) + ' correct).\n\nPress OK to resume, Cancel to start fresh.';
        if (confirm(msg)) resumeSession();
      }
    });
  }
  function resumeSession() {
    if (!_saved) return;
    stopTimer();
    state.mode = _saved.mode || "practice";
    state.minutes = _saved.minutes || 0;
    state.pick = _saved.pick || 25;
    state.subject = _saved.subject;
    state.idx = Math.max(0, _saved.idx || 0);
    state.score = _saved.score || 0;
    state.elapsed = _saved.elapsed || 0;
    state.timeLeft = _saved.timeLeft || 0;
    state.recorded = false;
    state.revealAll = !!_saved.revealAll;
    state.revealed = {};
    state.questions = _saved.qs;
    state.total = _saved.total || _saved.qs.length;
    if (state.idx >= state.questions.length || (state.mode === "timed" && state.timeLeft <= 0)) { renderResult(); return; }
    renderQ();
    startTimer();
    saveSession();
  }
  function navigateToMenu() {
    _sessionsReady = false;
    _saved = null;
    state.subject = "Menu";
    renderMenu();
    loadRemoteResume();
  }

  function $(sel) { return document.querySelector(sel); }
  function show(el, html) { el.innerHTML = html; }

  function buildIndex() {
    var k, i;
    for (k in ALL) {
      if (!Object.prototype.hasOwnProperty.call(ALL, k)) continue;
      for (i = 0; i < ALL[k].length; i++) {
        var id = k + ":" + i;
        ALL[k][i]._id = id;
        BY_ID[id] = ALL[k][i];
      }
    }
  }

  function totalCount() {
    var n = 0, k;
    for (k in ALL) n += ALL[k].length;
    return n;
  }

  function bmCount() {
    var n = 0, k;
    for (k in state.bookmarks) if (state.bookmarks[k]) n++;
    return n;
  }

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function stopTimer() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  }

  function startTimer() {
    stopTimer();
    if (state.mode === "timed" && state.timeLeft <= 0) state.timeLeft = Math.max(1, state.minutes) * 60;
    state.timerId = setInterval(function () {
      if (state.mode === "timed") {
        state.timeLeft = Math.max(0, state.timeLeft - 1);
      } else {
        state.elapsed++;
      }
      var clk = $("#ssc-clock");
      if (clk) clk.textContent = state.mode === "timed" ? fmt(state.timeLeft) : fmt(state.elapsed);
      if (state.mode === "timed" && state.timeLeft <= 0) {
        stopTimer();
        if (state.idx < state.questions.length) renderResult();
      }
    }, 1000);
  }

  function sessionTime() {
    return state.mode === "timed"
      ? fmt(Math.max(0, state.minutes * 60 - state.timeLeft))
      : fmt(state.elapsed);
  }

  function recordHistory() {
    if (state.recorded || !state.total) return;
    state.recorded = true;
    state.history.push({
      d: new Date().toLocaleString(),
      s: state.subject,
      sc: state.score,
      t: state.total,
      p: state.total ? Math.round(state.score / state.total * 100) : 0,
      tm: sessionTime()
    });
    if (state.history.length > 20) state.history = state.history.slice(-20);
    storageSet("sscJeHist", state.history);
  }

  function renderHistory(el) {
    if (!state.history.length) { el.innerHTML = '<div class="ssc-mini">No sessions yet. Complete a session and it will appear here.</div>'; return; }
    var h = '<table class="ssc-hist"><tr><th>When</th><th>Set</th><th>Score</th><th>%</th><th>Time</th></tr>';
    state.history.slice().reverse().forEach(function (r) {
      h += '<tr><td>' + r.d + '</td><td>' + r.s + '</td><td>' + r.sc + "/" + r.t + '</td><td>' + r.p + '%</td><td>' + r.tm + '</td></tr>';
    });
    h += '</table>';
    h += '<button class="ssc-ghost" id="ssc-hist-clear">Clear History</button>';
    el.innerHTML = h;
    var clr = el.querySelector("#ssc-hist-clear");
    if (clr) clr.onclick = function () { state.history = []; storageSet("sscJeHist", state.history); renderMenu(); };
  }


  function optChip(val, label, active) {
    return '<button class="ssc-opt' + (active ? " on" : "") + '" data-val="' + val + '">' + label + '</button>';
  }

  function wireChips(rowId, currentKey, save) {
    var c = $("#ssc-je-container");
    var row = c.querySelector("#" + rowId);
    if (!row) return;
    row.querySelectorAll(".ssc-opt").forEach(function (b) {
      b.onclick = function () {
        row.querySelectorAll(".ssc-opt").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        save(b.dataset.val);
      };
    });
  }

  function renderMenu() {
    stopTimer();
    state.subject = "Menu";
    var c = $("#ssc-je-container");
    var h = '<div class="ssc-menu">';
    h += '<div class="ssc-title">SSC-JE Mechanical Engineering</div>';
    h += '<div class="ssc-stats">' + totalCount() + " questions across " + Object.keys(SUBJECTS).length + " subjects</div>";
    h += '<div class="ssc-stat-note">* Engineering Mathematics, Gas Turbines, Power Plant, Nuclear, Renewable, Mechatronics, Maintenance, IM &amp; OR and the UPSC ESE Prelims/Mains sets are bonus topics beyond the official SSC-JE syllabus \u2014 added for GATE/ESE preparation.</div>';
    if (_saved) {
      h += '<div class="ssc-resume">';
      h += '<div class="ssc-resume-info">';
      h += '<div class="ssc-resume-title">\u25B6 Resume ' + _saved.subject + '</div>';
      h += '<div class="ssc-resume-sub">At question ' + (_saved.idx + 1) + ' of ' + _saved.qs.length + ' \u00B7 ' + (_saved.score || 0) + ' correct so far</div>';
      h += '</div>';
      h += '<button class="ssc-resume-btn" id="ssc-resume-btn">Resume</button>';
      h += '</div>';
    }
    h += '<div class="ssc-grid">';
    for (var k in SUBJECTS) {
      var s = SUBJECTS[k];
      var cnt = ALL[k] ? ALL[k].length : 0;
      h += '<button class="ssc-chip" data-sub="' + k + '" style="border-color:' + s.color + '">';
      h += '<span class="ssc-icon" style="color:' + s.color + '">' + s.icon + '</span> ';
      h += s.name + ' <span class="ssc-cnt">(' + cnt + ')</span></button>';
    }
    h += '</div>';

    h += '<div class="ssc-sub-head">Mixed Practice</div>';
    h += '<div class="ssc-opt-row" id="ssc-count-row" style="margin-bottom:6px">';
    Q_COUNTS.forEach(function (v) {
      h += optChip(v, v === 0 ? "All" : v + " Q", state.pick === v);
    });
    h += '</div>';
    h += '<div class="ssc-opt-row" id="ssc-time-row">';
    TIME_CHOICES.forEach(function (v) {
      h += optChip(v, v === 0 ? "No timer" : v + " min", state.minutes === v);
    });
    h += '</div>';
    h += '<button class="ssc-mix-btn" id="ssc-mix">Start Mixed Session</button>';

    h += '<div class="ssc-action-row">';
    h += '<button class="ssc-ghost" id="ssc-bm-btn">\u2606 Bookmarked (' + bmCount() + ')</button>';
    h += '<button class="ssc-ghost" id="ssc-hist-btn">History (' + state.history.length + ')</button>';
    h += '</div>';
    h += '<div id="ssc-hist-body"></div>';
    h += '</div>';
    show(c, h);

    c.querySelectorAll(".ssc-chip").forEach(function (b) {
      b.onclick = function () { start(b.dataset.sub, "practice", 0); };
    });
    wireChips("ssc-count-row", "pick", function (val) { state.pick = parseInt(val); state.pick = isNaN(state.pick) ? 25 : state.pick; });
    wireChips("ssc-time-row", "minutes", function (val) { state.minutes = parseInt(val); state.minutes = isNaN(state.minutes) ? 0 : state.minutes; });

    $("#ssc-mix").onclick = function () {
      start("all", state.minutes > 0 ? "timed" : "practice", state.minutes);
    };

    var bmBtn = $("#ssc-bm-btn");
    bmBtn.disabled = bmCount() === 0;
    if (bmBtn.disabled) {
      bmBtn.onclick = null;
    } else {
      bmBtn.onclick = function () { start("bookmarks", "practice", 0); };
    }

    var histEl = $("#ssc-hist-body");
    histEl.style.display = "none";
    $("#ssc-hist-btn").onclick = function () {
      renderHistory(histEl);
      histEl.style.display = histEl.style.display === "none" ? "block" : "none";
    };

    var resumeBtn = $("#ssc-resume-btn");
    if (resumeBtn) resumeBtn.onclick = resumeSession;
  }

  // Deterministic seeded shuffle so the same user + subject always get the SAME
  // question order (stable across devices and fresh sessions). No Math.random()
  // wobble means resume/jump positions stay meaningful.
  function shuffleSeeded(a, seed) {
    seed = (seed >>> 0) || 1;
    var rng = function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function seedFor(sub) {
    var u = (typeof window !== 'undefined' && window.supabaseUser && window.supabaseUser.id) || 'anon';
    var key = 'sscje::' + sub + '::' + u;
    var h = 2166136261;
    for (var i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function start(sub, mode, minutes) {
    if (_saved) {
      var msg = 'You have an unfinished SSC-JE session: ' + _saved.subject + ' \u2014 at question ' + (_saved.idx + 1) + ' of ' + _saved.qs.length + ' (' + (_saved.score || 0) + ' correct).\n\nPress OK to start a new session and replace it, Cancel to go back and resume the unfinished one.';
      if (!confirm(msg)) { renderMenu(); return; }
      clearSavedSession();
      _saved = null;
    }
    state.mode = mode || "practice";
    state.minutes = minutes || 0;
    state.elapsed = 0;
    state.timeLeft = 0;
    state.recorded = false;
    state.score = 0;
    state.idx = 0;
    state.revealed = {};
    var qs;
    if (sub === "all") {
      qs = [];
      for (var k in ALL) qs = qs.concat(ALL[k]);
      shuffleSeeded(qs, seedFor("all"));
      if (state.pick > 0) qs = qs.slice(0, state.pick);
      state.subject = "Mixed (" + qs.length + ")";
    } else if (sub === "bookmarks") {
      qs = [];
      Object.keys(state.bookmarks).forEach(function (id) {
        if (state.bookmarks[id] && BY_ID[id]) qs.push(BY_ID[id]);
      });
      shuffleSeeded(qs, seedFor("bookmarks"));
      state.subject = "Bookmarked (" + qs.length + ")";
    } else {
      qs = ALL[sub] ? ALL[sub].slice() : [];
      shuffleSeeded(qs, seedFor(sub));
      state.subject = SUBJECTS[sub] ? SUBJECTS[sub].name : sub;
    }
    state.questions = qs;
    state.total = qs.length;
    if (state.total === 0) { renderMenu(); return; }
    if (state.mode === "timed") state.timeLeft = Math.max(1, state.minutes) * 60;
    renderQ();
    startTimer();
  }

  function renderQ() {
    var c = $("#ssc-je-container");
    if (state.idx >= state.questions.length) { renderResult(); return; }
    var q = state.questions[state.idx];
    var k = q._id || (state.idx + "_" + q.q.slice(0, 30));
    var isRevealed = state.revealAll || state.revealed[k];
    var isBm = !!state.bookmarks[k];
    var pct = state.total > 0 ? Math.round((state.idx / state.total) * 100) : 0;

    var h = '<div class="ssc-top">';
    h += '<button class="ssc-back" id="ssc-back-btn">\u2190 Menu</button>';
    h += '<span class="ssc-subj">' + state.subject + '</span>';
    h += '<span class="ssc-clock" id="ssc-clock"></span>';
    h += '<span class="ssc-sc">' + state.score + '/' + state.total + '</span>';
    h += '<button class="ssc-rall' + (state.revealAll ? " on" : "") + '" id="ssc-reveal-all-btn">' + (state.revealAll ? "Hide All" : "Reveal All") + '</button>';
    h += '<button class="ssc-bm" id="ssc-bm-btn" title="Bookmark">' + (isBm ? '\u2605' : '\u2606') + '</button>';
    h += '</div>';
    h += '<div class="ssc-bar-wrap"><div class="ssc-bar-fill" style="width:' + pct + '%"></div></div>';
    h += '<div class="ssc-card">';
    h += '<div class="ssc-qnum">Q' + (state.idx + 1) + ' / ' + state.total + (q.exam ? ' <span style="color:var(--amber)">' + q.exam + '</span>' : '') + '</div>';
    h += '<div class="ssc-qtext">' + q.q + '</div>';

    h += '<div class="ssc-section">';
    h += '<button class="ssc-toggle" data-t="hint">Show Hint</button>';
    h += '<div class="ssc-body" id="ssc-hint">' + q.h + '</div></div>';

    h += '<div class="ssc-section">';
    h += '<button class="ssc-toggle" data-t="ans">Show Answer</button>';
    h += '<div class="ssc-body" id="ssc-ans">' + q.a + '</div></div>';

    if (q.s) {
      h += '<div class="ssc-section">';
      h += '<button class="ssc-toggle" data-t="sol">Show Solution</button>';
      h += '<div class="ssc-body" id="ssc-sol">' + q.s + '</div></div>';
    }

    h += '<div class="ssc-nav">';
    h += '<button class="ssc-prev" id="ssc-prev-btn"' + (state.idx === 0 ? ' disabled' : '') + '>\u2190 Prev</button>';
    h += '<button class="ssc-know-btn" id="ssc-know-btn">Got it \u2713</button>';
    h += '<button class="ssc-next-btn" id="ssc-next-btn">Next \u2192</button>';
    h += '</div>';
    h += '<div class="ssc-jump" style="display:flex;align-items:center;gap:8px;margin-top:10px;justify-content:center">';
    h += '<span class="ssc-mini">Jump to Q</span>';
    h += '<input type="number" id="ssc-jump-input" min="1" max="' + state.total + '" value="' + (state.idx + 1) + '" style="width:72px;padding:4px 6px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text)">';
    h += '<button id="ssc-jump-go" style="padding:5px 12px;border-radius:6px;border:1px solid var(--border2);background:var(--bg4);color:var(--text);cursor:pointer;font-weight:600">Go</button>';
    h += '</div></div>';
    h += '<div class="ssc-mini" style="text-align:center;margin-top:10px">';
    h += 'Press <kbd style="padding:1px 5px;border-radius:3px;border:1px solid var(--border);font-size:.85em">Enter</kbd> for next question';
    h += ' <span class="ssc-sync" id="ssc-sync-status"></span>';
    h += '</div>';

    show(c, h);
    updateSyncStatus();

    var clk = $("#ssc-clock");
    if (clk) clk.textContent = state.mode === "timed" ? fmt(state.timeLeft) : fmt(state.elapsed);

    if (isRevealed) {
      document.querySelectorAll('.ssc-body').forEach(function (el) { el.classList.add('show'); });
      document.querySelectorAll('.ssc-toggle').forEach(function (el) { el.textContent = el.textContent.replace('Show', 'Hide'); });
    }

    c.querySelectorAll('.ssc-toggle').forEach(function (btn) {
      btn.onclick = function () {
        var t = btn.dataset.t;
        var el = (t === 'hint') ? $('#ssc-hint') : (t === 'ans') ? $('#ssc-ans') : $('#ssc-sol');
        if (el) {
          el.classList.toggle('show');
          btn.textContent = el.classList.contains('show') ? btn.textContent.replace('Show', 'Hide') : btn.textContent.replace('Hide', 'Show');
        }
        state.revealed[k] = true;
      };
    });

    $("#ssc-reveal-all-btn").onclick = function () {
      state.revealAll = !state.revealAll;
      renderQ();
    };

    $("#ssc-back-btn").onclick = navigateToMenu;
    $("#ssc-prev-btn").onclick = function () { if (state.idx > 0) { state.idx--; renderQ(); } };
    $("#ssc-next-btn").onclick = function () { state.idx++; renderQ(); };
    $("#ssc-know-btn").onclick = function () { state.score++; state.idx++; renderQ(); };
    var jumpTo = function () {
      var inp = $("#ssc-jump-input");
      var n = parseInt(inp ? inp.value : "", 10);
      if (isNaN(n)) return;
      if (n < 1) n = 1;
      if (n > state.questions.length) n = state.questions.length;
      state.idx = n - 1;
      renderQ();
    };
    var jumpGo = $("#ssc-jump-go");
    if (jumpGo) jumpGo.onclick = jumpTo;
    var jumpInp = $("#ssc-jump-input");
    if (jumpInp) jumpInp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); jumpTo(); }
    });
    $("#ssc-bm-btn").onclick = function () {
      if (state.bookmarks[k]) { delete state.bookmarks[k]; }
      else { state.bookmarks[k] = true; }
      storageSet("sscJeBm", state.bookmarks);
      renderQ();
    };
    saveSession();
  }

  function renderResult() {
    stopTimer();
    recordHistory();
    clearSavedSession();
    _saved = null;
    var c = $("#ssc-je-container");
    var pct = state.total > 0 ? Math.round(state.score / state.total * 100) : 0;
    var h = '<div class="ssc-result">';
    h += '<div class="ssc-result-title">Session Complete</div>';
    h += '<div class="ssc-result-score">' + state.score + ' / ' + state.total + '</div>';
    h += '<div class="ssc-result-pct">' + pct + '%</div>';
    h += '<div class="ssc-result-subj">' + state.subject + '</div>';
    h += '<div class="ssc-mini">Time used: ' + sessionTime() + (state.mode === "timed" ? ' \u00B7 timed session' : ' \u00B7 practice session') + '</div>';
    h += '<button class="ssc-mix-btn" id="ssc-retry">Back to Menu</button>';
    h += '</div>';
    show(c, h);
    $("#ssc-retry").onclick = navigateToMenu;
  }

  buildIndex();

  if (typeof document !== 'undefined') {
    document.addEventListener("DOMContentLoaded", function () {
      var el = document.getElementById("ssc-je-container");
      if (el) renderMenu();
      initResume();
    });
    // Enter advances to the next question (or reveals via the focused control).
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      if (e.target && (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      var nextBtn = $("#ssc-next-btn");
      if (nextBtn) { nextBtn.click(); e.preventDefault(); }
    });
  }

  function initResume() {
    // Reload the saved session once auth settles, then refresh the menu banner + prompt
    // and re-pull after login/logout so a fresh account's progress is offered.
    window.addEventListener("pagehide", function () { saveSession(); });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") saveSession();
    });
    if (typeof window.supabaseOnAuth === 'function') {
      window.supabaseOnAuth(function () {
        _sessionsReady = false;
        _saved = null;
        loadRemoteResume();
      });
    }
    loadRemoteResume();
  }

  if (typeof window !== 'undefined') {
    window._sscRender = renderMenu;
  }
})();