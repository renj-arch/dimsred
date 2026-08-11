// ==========================================
// SUPABASE — Google OAuth via direct REST (no SDK)
// Handles: login/logout, token refresh, profile,
// user data sync, leaderboard, and quiz-progress sync
// (used by current-affairs.html to resume quizzes).
// ==========================================
var SUPABASE_URL = 'https://krvlufonfbcabgcjomvs.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_jQqqojpcRKwI3boRYfmBYg_-Kem7UyW';
var supabaseUser = null;
window.supabaseReady = false;
var _authCallbacks = [];

function sbHeaders(token) {
  var h = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

function _siteHost() {
  var host = window.location.host;
  if (host.indexOf('localhost') >= 0 || host.indexOf('127.0.0.1') >= 0) host = 'vlymbooq.qzz.io';
  return host;
}

function makeRedirectUrl(returnPath) {
  return encodeURIComponent('https://' + _siteHost() + '/login.html?redirect=' + encodeURIComponent(returnPath || window.location.pathname));
}

window.getLoginUrl = function (returnPath) {
  return SUPABASE_URL + '/auth/v1/authorize?provider=google&redirect_to=' + makeRedirectUrl(returnPath);
};

window.supabaseLogin = function (returnPath) {
  sessionStorage.setItem('login_redirect', returnPath || window.location.pathname);
  window.location.href = getLoginUrl(returnPath || window.location.pathname);
};

window.supabaseLogout = function () {
  localStorage.removeItem('sb_access_token');
  localStorage.removeItem('sb_refresh_token');
  localStorage.removeItem('sb_user');
  supabaseUser = null;
  updateAuthUI();
  _emitAuthChange();
};

// Register a callback that fires on login/logout.
window.supabaseOnAuth = function (fn) {
  if (typeof fn === 'function') _authCallbacks.push(fn);
};
function _emitAuthChange() {
  _authCallbacks.slice().forEach(function (fn) { try { fn(supabaseUser); } catch (e) {} });
}

// Parse #access_token=... after OAuth redirect
function handleAuthRedirect() {
  var hash = window.location.hash;
  if (!hash || hash.indexOf('access_token') < 0) return false;
  var params = new URLSearchParams(hash.substring(1));
  var token = params.get('access_token');
  var refresh = params.get('refresh_token');
  if (token) {
    localStorage.setItem('sb_access_token', token);
    if (refresh) localStorage.setItem('sb_refresh_token', refresh);
    try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
    var redirect = sessionStorage.getItem('login_redirect');
    sessionStorage.removeItem('login_redirect');
    if (redirect && redirect !== window.location.pathname) {
      window.location.replace(redirect);
      return true;
    }
    return true;
  }
  return false;
}

async function refreshToken() {
  var refresh = localStorage.getItem('sb_refresh_token');
  if (!refresh) return false;
  try {
    var r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: sbHeaders(), body: JSON.stringify({ refresh_token: refresh })
    });
    if (!r.ok) return false;
    var data = await r.json();
    localStorage.setItem('sb_access_token', data.access_token);
    if (data.refresh_token) localStorage.setItem('sb_refresh_token', data.refresh_token);
    if (data.user) localStorage.setItem('sb_user', JSON.stringify(data.user));
    return true;
  } catch (e) { return false; }
}

async function fetchUser() {
  var token = localStorage.getItem('sb_access_token');
  if (!token) return null;
  try {
    var r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: sbHeaders(token) });
    if (r.status === 401) {
      var refreshed = await refreshToken();
      if (refreshed) {
        var newToken = localStorage.getItem('sb_access_token');
        r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: sbHeaders(newToken) });
        if (r.ok) {
          var user = await r.json();
          localStorage.setItem('sb_user', JSON.stringify(user));
          return user;
        }
      }
      localStorage.removeItem('sb_access_token');
      localStorage.removeItem('sb_refresh_token');
      localStorage.removeItem('sb_user');
      return null;
    }
    if (!r.ok) return null;
    var user = await r.json();
    localStorage.setItem('sb_user', JSON.stringify(user));
    return user;
  } catch (e) { return null; }
}

async function initSupabase() {
  var handled = handleAuthRedirect();
  if (handled) {
    // Tokens just saved — wait a tick for the completed token bootstrap.
    supabaseUser = await fetchUser();
    if (supabaseUser) ensureProfile(supabaseUser);
    updateAuthUI();
    _emitAuthChange();
    return;
  }
  var token = localStorage.getItem('sb_access_token');
  if (token) {
    supabaseUser = await fetchUser();
    if (supabaseUser) {
      ensureProfile(supabaseUser);
    } else {
      var cached = localStorage.getItem('sb_user');
      if (cached) {
        try { supabaseUser = JSON.parse(cached); } catch (e) {}
      }
    }
  }
  updateAuthUI();
  _emitAuthChange();
  window.supabaseReady = true;
}

function getToken() { return localStorage.getItem('sb_access_token'); }

async function ensureProfile(user) {
  var tok = getToken();
  try {
    var r = await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + user.id, { headers: sbHeaders(tok) });
    var data = await r.json();
    if (!data || data.length === 0) {
      await fetch(SUPABASE_URL + '/rest/v1/profiles', {
        method: 'POST', headers: sbHeaders(tok),
        body: JSON.stringify({
          id: user.id,
          name: (user.user_metadata && user.user_metadata.full_name) || (user.email ? user.email.split('@')[0] : 'User'),
          photo: (user.user_metadata && user.user_metadata.avatar_url) || '',
          email: user.email
        })
      });
    }
  } catch (e) {}
}

// ========== SYNC FUNCTIONS ==========
window.syncResult = async function (result) {
  var tok = getToken();
  if (!tok || !supabaseUser) return;
  await fetch(SUPABASE_URL + '/rest/v1/results', {
    method: 'POST', headers: sbHeaders(tok),
    body: JSON.stringify({
      user_id: supabaseUser.id, exam: result.exam, paper_id: result.paperId,
      correct: result.correct, wrong: result.wrong, total: result.total,
      answered: result.answered, pct: result.pct, time: result.time
    })
  });
};

window.syncWrongAnswer = async function (item) {
  var tok = getToken();
  if (!tok || !supabaseUser) return;
  await fetch(SUPABASE_URL + '/rest/v1/wrong_answers', {
    method: 'POST', headers: sbHeaders(tok),
    body: JSON.stringify({
      user_id: supabaseUser.id, paper_id: item.paperId, exam: item.exam,
      q_num: item.qNum, q_text: item.qText, correct: item.correct,
      chosen: item.chosen, difficulty: item.difficulty, section: item.section
    })
  });
};

window.syncBookmark = async function (item, isRemoving) {
  var tok = getToken();
  if (!tok || !supabaseUser) return;
  if (isRemoving) {
    await fetch(SUPABASE_URL + '/rest/v1/bookmarks?user_id=eq.' + supabaseUser.id + '&paper_id=eq.' + encodeURIComponent(item.paperId) + '&q_num=eq.' + encodeURIComponent(item.qNum), {
      method: 'DELETE', headers: sbHeaders(tok)
    });
  } else {
    await fetch(SUPABASE_URL + '/rest/v1/bookmarks', {
      method: 'POST', headers: sbHeaders(tok),
      body: JSON.stringify({
        user_id: supabaseUser.id, paper_id: item.paperId, exam: item.exam,
        q_num: item.qNum, q_text: item.qText, section: item.section
      })
    });
  }
};

window.syncStreak = async function (streak) {
  var tok = getToken();
  if (!tok || !supabaseUser) return;
  await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + supabaseUser.id, {
    method: 'PATCH', headers: sbHeaders(tok),
    body: JSON.stringify({ streak_current: streak.current, streak_longest: streak.longest, streak_last_date: streak.lastDate })
  });
};

window.syncXP = async function (xp) {
  var tok = getToken();
  if (!tok || !supabaseUser) return;
  await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + supabaseUser.id, {
    method: 'PATCH', headers: sbHeaders(tok),
    body: JSON.stringify({ xp: xp })
  });
};

window.syncBadges = async function (badges) {
  var tok = getToken();
  if (!tok || !supabaseUser) return;
  await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + supabaseUser.id, {
    method: 'PATCH', headers: sbHeaders(tok),
    body: JSON.stringify({ badges: JSON.stringify(badges) })
  });
};

window.syncGoals = async function (goals) {
  var tok = getToken();
  if (!tok || !supabaseUser) return;
  await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + supabaseUser.id, {
    method: 'PATCH', headers: sbHeaders(tok),
    body: JSON.stringify({ goals: JSON.stringify(goals) })
  });
};

// ========== QUIZ PROGRESS (current-affairs resume) ==========
// One row per user; payload mirrors the localStorage 'vlym_quiz_state' object.
window.syncQuizProgress = async function (quizState) {
  var tok = getToken();
  if (!tok || !supabaseUser || !quizState) return false;
  try {
    var r = await fetch(SUPABASE_URL + '/rest/v1/quiz_progress?id=eq.' + supabaseUser.id, { headers: sbHeaders(tok) });
    var rows = await r.json();
    if (rows && rows.length > 0) {
      await fetch(SUPABASE_URL + '/rest/v1/quiz_progress?id=eq.' + supabaseUser.id, {
        method: 'PATCH', headers: sbHeaders(tok),
        body: JSON.stringify({ payload: quizState, updated_at: new Date().toISOString() })
      });
    } else {
      await fetch(SUPABASE_URL + '/rest/v1/quiz_progress', {
        method: 'POST', headers: sbHeaders(tok),
        body: JSON.stringify({ id: supabaseUser.id, payload: quizState, updated_at: new Date().toISOString() })
      });
    }
    return true;
  } catch (e) { return false; }
};

// Load the user's last saved quiz session (returns parsed object or null).
window.loadQuizProgress = async function () {
  var tok = getToken();
  if (!tok || !supabaseUser) return null;
  try {
    var r = await fetch(SUPABASE_URL + '/rest/v1/quiz_progress?id=eq.' + supabaseUser.id, { headers: sbHeaders(tok) });
    var rows = await r.json();
    if (!rows || rows.length === 0) return null;
    var payload = rows[0].payload;
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch (e) {} }
    return payload || null;
  } catch (e) { return null; }
};

// ========== LOAD USER DATA ==========
window.loadUserData = async function (callback) {
  var tok = getToken();
  if (!tok || !supabaseUser) { if (callback) callback(null); return; }
  var uid = supabaseUser.id;
  try {
    var profR = await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + uid, { headers: sbHeaders(tok) });
    var resR = await fetch(SUPABASE_URL + '/rest/v1/results?user_id=eq.' + uid + '&order=date.desc&limit=50', { headers: sbHeaders(tok) });
    var wrongR = await fetch(SUPABASE_URL + '/rest/v1/wrong_answers?user_id=eq.' + uid + '&order=created_at.desc&limit=200', { headers: sbHeaders(tok) });
    var bmR = await fetch(SUPABASE_URL + '/rest/v1/bookmarks?user_id=eq.' + uid, { headers: sbHeaders(tok) });

    var data = {};
    var p = await profR.json();
    if (p && p.length > 0) {
      data.profile = p[0];
      data.profile.badges = typeof data.profile.badges === 'string' ? JSON.parse(data.profile.badges || '[]') : (data.profile.badges || []);
      data.profile.goals = typeof data.profile.goals === 'string' ? JSON.parse(data.profile.goals || '{}') : (data.profile.goals || {});
    }
    var r = await resR.json(); if (r) data.results = r;
    var w = await wrongR.json(); if (w) data.wrongAnswers = w;
    var b = await bmR.json(); if (b) data.bookmarks = b;
    if (callback) callback(data);
  } catch (e) { if (callback) callback(null); }
};

// ========== LEADERBOARD ==========
window.getLeaderboard = async function (examFilter, callback) {
  var url = SUPABASE_URL + '/rest/v1/leaderboard?order=pct.desc&limit=50';
  if (examFilter && examFilter !== 'all') url += '&exam=eq.' + encodeURIComponent(examFilter);
  try {
    var r = await fetch(url, { headers: sbHeaders() });
    if (!r.ok) { if (callback) callback([], new Error('API error')); return; }
    var data = await r.json();
    if (callback) callback(data || [], null);
  } catch (e) { if (callback) callback([], e); }
};

// ========== UI UPDATE ==========
function updateAuthUI() {
  var els = document.querySelectorAll('.auth-btn, [data-auth-btn]');
  els.forEach(function (el) {
    if (supabaseUser) {
      var nm = (supabaseUser.user_metadata && supabaseUser.user_metadata.full_name) || (supabaseUser.email ? supabaseUser.email.split('@')[0] : 'User');
      var photo = (supabaseUser.user_metadata && supabaseUser.user_metadata.avatar_url) || '';
      el.innerHTML = photo
        ? '<img src="' + photo + '" alt="" style="width:20px;height:20px;border-radius:50%;flex-shrink:0">'
        : '<span style="width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">' + nm[0] + '</span>';
      el.innerHTML += '<span>' + nm.split(' ')[0] + '</span>';
      el.onclick = function (e) { e.preventDefault(); if (confirm('Sign out of vlymbooq?')) window.supabaseLogout(); };
      if (el.tagName === 'A') el.removeAttribute('href');
      el.style.cssText = 'padding:3px 12px 3px 3px;background:var(--btn-bg,rgba(255,255,255,.06));color:var(--btn-text,#fff);border:1px solid var(--btn-border,rgba(255,255,255,.08));border-radius:100px;font-size:.78em;font-weight:500;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;transition:all .2s';
    } else {
      el.innerHTML = '🚀 Sign in';
      el.onclick = function (e) { e.preventDefault(); window.supabaseLogin(el.getAttribute('data-return') || window.location.pathname); };
      if (el.tagName === 'A') el.removeAttribute('href');
      el.style.cssText = 'background:var(--btn-bg,rgba(255,255,255,.06));color:var(--btn-text,#fff);border:1px solid var(--btn-border,rgba(255,255,255,.1));padding:6px 14px;border-radius:100px;font-size:.78em;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .2s';
    }
  });
}

// ========== INIT ==========
document.querySelectorAll('script[src*="supabase-js"]').forEach(function (s) { s.remove(); });

initSupabase();

// Re-run after dynamic DOM changes create auth buttons
setTimeout(updateAuthUI, 50);