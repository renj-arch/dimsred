// ==========================================
// SUPABASE — Direct REST API (no SDK needed)
// ==========================================
var SUPABASE_URL = 'https://krvlufonfbcabgcjomvs.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_jQqqojpcRKwI3boRYfmBYg_-Kem7UyW';
var supabaseUser = null;

// Headers for Supabase REST API
function sbHeaders(token) {
  var h = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

// ========== AUTH — Google Login ==========
function makeRedirectUrl() {
  var host = window.location.host;
  // If on localhost, use the live domain instead for the redirect
  if (host.indexOf('localhost') >= 0 || host.indexOf('127.0.0.1') >= 0) {
    host = 'vlymbooq.qzz.io';
  }
  return encodeURIComponent('https://' + host + window.location.pathname);
}
window.supabaseLogin = function () {
  window.location.href = SUPABASE_URL + '/auth/v1/authorize?provider=google&redirect_to=' + makeRedirectUrl();
};

window.supabaseLogout = function () {
  localStorage.removeItem('sb_access_token');
  localStorage.removeItem('sb_refresh_token');
  localStorage.removeItem('sb_user');
  supabaseUser = null;
  updateAuthUI();
};

// Check for auth tokens in URL hash (after OAuth redirect)
function handleAuthRedirect() {
  var hash = window.location.hash;
  if (hash && hash.indexOf('access_token') >= 0) {
    var params = new URLSearchParams(hash.substring(1));
    var token = params.get('access_token');
    var refresh = params.get('refresh_token');
    if (token) {
      localStorage.setItem('sb_access_token', token);
      if (refresh) localStorage.setItem('sb_refresh_token', refresh);
      window.location.hash = '';
      window.history.replaceState(null, '', window.location.pathname);
      return true;
    }
  }
  return false;
}

// Get user from saved token
async function fetchUser() {
  var token = localStorage.getItem('sb_access_token');
  if (!token) return null;
  try {
    var r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: sbHeaders(token) });
    if (!r.ok) { localStorage.removeItem('sb_access_token'); return null; }
    var user = await r.json();
    localStorage.setItem('sb_user', JSON.stringify(user));
    return user;
  } catch (e) { return null; }
}

// Init: handle redirect, then set user
async function initSupabase() {
  handleAuthRedirect();
  var token = localStorage.getItem('sb_access_token');
  if (token) {
    supabaseUser = await fetchUser();
    if (supabaseUser) ensureProfile(supabaseUser);
  }
  updateAuthUI();
}

function getToken() {
  return localStorage.getItem('sb_access_token');
}

async function ensureProfile(user) {
  var tok = getToken();
  try {
    var r = await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + user.id, { headers: sbHeaders(tok) });
    var data = await r.json();
    if (!data || data.length === 0) {
      await fetch(SUPABASE_URL + '/rest/v1/profiles', {
        method: 'POST',
        headers: sbHeaders(tok),
        body: JSON.stringify({
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          photo: user.user_metadata?.avatar_url || '',
          email: user.email
        })
      });
    }
  } catch (e) {}
}

// ========== SYNC FUNCTIONS ==========
window.syncResult = async function (result) {
  var tok = getToken();
  if (!tok) return;
  await fetch(SUPABASE_URL + '/rest/v1/results', {
    method: 'POST', headers: sbHeaders(tok),
    body: JSON.stringify({
      user_id: supabaseUser.id, exam: result.exam, paper_id: result.paperId,
      correct: result.correct, wrong: result.wrong, total: result.total,
      answered: result.answered, pct: result.pct, time: result.time
    })
  });
  await fetch(SUPABASE_URL + '/rest/v1/leaderboard', {
    method: 'POST', headers: sbHeaders(tok),
    body: JSON.stringify({
      user_id: supabaseUser.id,
      name: supabaseUser.user_metadata?.full_name || 'User',
      photo: supabaseUser.user_metadata?.avatar_url || '',
      exam: result.exam, score: result.correct, total: result.total, pct: result.pct
    })
  });
};

window.syncWrongAnswer = async function (item) {
  var tok = getToken();
  if (!tok) return;
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
  if (!tok) return;
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
  if (!tok) return;
  await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + supabaseUser.id, {
    method: 'PATCH', headers: sbHeaders(tok),
    body: JSON.stringify({ streak_current: streak.current, streak_longest: streak.longest, streak_last_date: streak.lastDate })
  });
};

window.syncBadges = async function (badges) {
  var tok = getToken();
  if (!tok) return;
  await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + supabaseUser.id, {
    method: 'PATCH', headers: sbHeaders(tok),
    body: JSON.stringify({ badges: JSON.stringify(badges) })
  });
};

window.syncGoals = async function (goals) {
  var tok = getToken();
  if (!tok) return;
  await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + supabaseUser.id, {
    method: 'PATCH', headers: sbHeaders(tok),
    body: JSON.stringify({ goals: JSON.stringify(goals) })
  });
};

// ========== LOAD USER DATA ==========
window.loadUserData = async function (callback) {
  var tok = getToken();
  if (!tok || !supabaseUser) { if (callback) callback(null); return; }
  var uid = supabaseUser.id;

  try {
    var [profR, resR, wrongR, bmR] = await Promise.all([
      fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + uid, { headers: sbHeaders(tok) }),
      fetch(SUPABASE_URL + '/rest/v1/results?user_id=eq.' + uid + '&order=date.desc&limit=50', { headers: sbHeaders(tok) }),
      fetch(SUPABASE_URL + '/rest/v1/wrong_answers?user_id=eq.' + uid + '&order=created_at.desc&limit=200', { headers: sbHeaders(tok) }),
      fetch(SUPABASE_URL + '/rest/v1/bookmarks?user_id=eq.' + uid, { headers: sbHeaders(tok) })
    ]);

    var data = {};
    var p = await profR.json(); if (p && p.length > 0) {
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
    var r = await fetch(url, { headers: sbHeaders(getToken()) });
    var data = await r.json();
    if (callback) callback(data || [], null);
  } catch (e) { if (callback) callback([], e); }
};

// ========== UI UPDATE ==========
function updateAuthUI() {
  var loginUrl = SUPABASE_URL + '/auth/v1/authorize?provider=google&redirect_to=' + makeRedirectUrl();
  document.querySelectorAll('.auth-btn').forEach(function (el) {
    if (supabaseUser) {
      var name = supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User';
      var photo = supabaseUser.user_metadata?.avatar_url || '';
      el.innerHTML = photo ? '<img src="' + photo + '" style="width:22px;height:22px;border-radius:50%;vertical-align:middle;margin-right:6px">' + name : name;
      el.onclick = function (e) { e.preventDefault(); if (confirm('Logout?')) window.supabaseLogout(); };
      if (el.tagName === 'A') el.removeAttribute('href');
      el.style.cssText = 'padding:4px 12px 4px 4px;background:linear-gradient(135deg,#a78bfa,#8b5cf6);color:#fff;border:none;border-radius:100px;font-size:.78em;font-weight:600;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center';
    } else {
      el.innerHTML = 'Login';
      if (el.tagName === 'A') {
        el.href = loginUrl;
        el.onclick = null;
      } else {
        el.onclick = function (e) { e.preventDefault(); window.location.href = loginUrl; };
      }
      el.style.cssText = 'background:linear-gradient(135deg,#a78bfa,#8b5cf6);color:#fff;border:none;padding:6px 14px;border-radius:100px;font-size:.78em;font-weight:600;cursor:pointer;white-space:nowrap';
    }
  });
}

// ========== INIT ==========
// Remove old Supabase SDK scripts from page (cleanup)
document.querySelectorAll('script[src*="supabase-js"]').forEach(function(s) { s.remove(); });

// Initialize
initSupabase();

// Re-run after shared.js creates the auth button (deferred)
setTimeout(updateAuthUI, 50);