(function () {
  var SUPABASE_URL = 'https://krvlufonfbcabgcjomvs.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_jQqqojpcRKwI3boRYfmBYg_-Kem7UyW';
  var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var REMEMBER_KEY = 'vlym_remember_email';

  var _client = null;
  var _user = null;
  var _store = null;
  var _storeKey = null;
  var _ctl = null;
  var _modal = null;
  var _uiReady = false;
  var _syncTimer = null;
  var _onUpdate = [];

  function configured() {
    return SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.indexOf('PASTE_') !== 0;
  }

  function hashStr(s) {
    var h = 0;
    if (!s) return '';
    s = String(s);
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return 'h' + Math.abs(h).toString(36);
  }

  function qHash(q) {
    return hashStr((q && (q.q || q.question)) || '');
  }

  function loadStore() {
    try {
      var d = JSON.parse(localStorage.getItem(_storeKey) || '{}');
      if (!d.records) d.records = {};
      if (typeof d.correct !== 'number') d.correct = 0;
      if (typeof d.serverQuiz !== 'number') d.serverQuiz = 0;
      if (typeof d.serverRead !== 'number') d.serverRead = 0;
      return d;
    } catch (e) {
      return { records: {}, correct: 0, serverQuiz: 0, serverRead: 0 };
    }
  }

  function saveStore() {
    try { localStorage.setItem(_storeKey, JSON.stringify(_store)); } catch (e) {}
  }

  function rememberedEmail() {
    try { return localStorage.getItem(REMEMBER_KEY) || ''; } catch (e) { return ''; }
  }

  function saveRememberedEmail(email) {
    try {
      if (email) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch (e) {}
  }

  function countRecords(src) {
    var n = 0;
    for (var h in _store.records) {
      if (_store.records[h].s === src) n++;
    }
    return n;
  }

  function getStats() {
    if (!_user) return { loggedIn: false, quiz: 0, read: 0, correct: 0, total: 0 };
    var quizLocal = countRecords('quiz');
    var readLocal = countRecords('read');
    var quiz = Math.max(quizLocal, _store.serverQuiz);
    var read = Math.max(readLocal, _store.serverRead);
    return { loggedIn: true, quiz: quiz, read: read, correct: _store.correct || 0, total: quiz + read };
  }

  function emit() {
    for (var i = 0; i < _onUpdate.length; i++) {
      try { _onUpdate[i](getStats()); } catch (e) {}
    }
  }

  function track(opts) {
    if (!_user || !opts) return;
    var h = opts.hash || qHash(opts.q);
    if (!h) return;
    var src = opts.src === 'quiz' ? 'quiz' : 'read';
    var wasNew = false;
    if (!_store.records[h]) {
      _store.records[h] = { s: src, c: opts.correct ? 1 : 0 };
      wasNew = true;
    } else if (_store.records[h].s === 'read' && src === 'quiz') {
      _store.records[h].s = 'quiz';
      if (opts.correct) _store.records[h].c = 1;
      wasNew = true;
    } else if (src === 'quiz' && opts.correct && !_store.records[h].c) {
      _store.records[h].c = 1;
    }
    _store.correct = 0;
    for (var hh in _store.records) { if (_store.records[hh].c) _store.correct++; }
    _store.updatedAt = Date.now();
    saveStore();
    scheduleSync();
    if (wasNew) emit();
    render();
  }

  function scheduleSync() {
    if (!configured() || !_client || !_user) return;
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(syncProgress, 2500);
  }

  function flushSync() {
    if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null; }
    if (!configured() || !_client || !_user) return;
    syncProgress();
  }

  function syncProgress() {
    if (!_client || !_user) return;
    var st = getStats();
    var rows = [
      { user_id: _user.id, source: 'quiz', covered: st.quiz, correct: st.correct, updated_at: new Date().toISOString() },
      { user_id: _user.id, source: 'read', covered: st.read, correct: 0, updated_at: new Date().toISOString() }
    ];
    _client.from('quiz_progress').upsert(rows, { onConflict: 'user_id,source' }).then(function (res) {
      if (res.error) return;
      _store.serverQuiz = st.quiz;
      _store.serverRead = st.read;
      saveStore();
    }).catch(function () {});
  }

  function loadServerProgress() {
    if (!configured() || !_client || !_user) return Promise.resolve();
    return _client.from('quiz_progress').select('source,covered').eq('user_id', _user.id).then(function (res) {
      if (res.error || !res.data) return;
      for (var i = 0; i < res.data.length; i++) {
        if (res.data[i].source === 'quiz') _store.serverQuiz = res.data[i].covered;
        else if (res.data[i].source === 'read') _store.serverRead = res.data[i].covered;
      }
      saveStore();
      emit();
      render();
    }).catch(function () {});
  }

  function applyUser(u) {
    _user = u || null;
    _storeKey = _user ? 'vlym_progress_' + _user.id : null;
    _store = _user ? loadStore() : null;
    render();
    if (_user) loadServerProgress();
  }

  function signup(email, password, name) {
    return _client.auth.signUp({ email: email, password: password, options: { data: { name: name } } }).then(function (res) {
      if (res.error) throw res.error;
      if (res.data && res.data.session && res.data.session.user) {
        applyUser(res.data.session.user);
        return { ok: true };
      }
      return { ok: true, confirm: true };
    });
  }

  function login(email, password) {
    return _client.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
      if (res.error) throw res.error;
      if (res.data && res.data.user) applyUser(res.data.user);
      return { ok: true };
    });
  }

  function logout() {
    flushSync();
    return _client.auth.signOut().then(function () {
      applyUser(null);
      closeModal();
    }).catch(function () { applyUser(null); closeModal(); });
  }

  function render() {
    if (!_uiReady) return;
    if (_user) {
      _ctl.innerHTML = '<span class="pt-user" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:100px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.25);color:var(--emerald,#34d399);font-size:.78em;font-weight:600;white-space:nowrap">✅ <span class="pt-email">' + esc(_user.email) + '</span> · <span class="pt-total">0</span></span>';
      _ctl.onclick = openModal;
      var t = _ctl.querySelector('.pt-total');
      if (t) t.textContent = getStats().total;
    } else {
      _ctl.innerHTML = '<span style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:100px;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.25);color:var(--purple,#a78bfa);font-size:.78em;font-weight:600;white-space:nowrap">🔐 Login</span>';
      _ctl.onclick = openModal;
    }
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function openModal() {
    if (!configured()) {
      showMsg('⚠️ Login is not configured yet.<br><span style="font-size:.8em">Paste your Supabase anon key into <b>js/progress-tracker.js</b> (SUPABASE_ANON_KEY) and run the SQL in <b>supabase-setup.sql</b>.</span>');
      return;
    }
    if (_modal) _modal.style.display = 'flex';
    renderModalBody();
  }

  function closeModal() { if (_modal) _modal.style.display = 'none'; }

  function renderModalBody() {
    var body = _modal.querySelector('.pt-modal-body');
    if (_user) {
      var st = getStats();
      body.innerHTML = '<div style="text-align:center;margin-bottom:14px">'
        + '<div style="font-size:1em;font-weight:800">' + esc(_user.email) + '</div>'
        + '<div style="font-size:.72em;color:var(--text-muted,#52525b)">' + (_user.user_metadata && _user.user_metadata.name ? esc(_user.user_metadata.name) : '') + '</div></div>'
        + '<div style="display:flex;gap:8px;margin-bottom:14px">'
        + '<div style="flex:1;padding:12px;border-radius:10px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.15);text-align:center"><div style="font-size:1.5em;font-weight:900;color:var(--emerald,#34d399)">' + st.total + '</div><div style="font-size:.68em;color:var(--text-muted,#52525b)">Covered</div></div>'
        + '<div style="flex:1;padding:12px;border-radius:10px;background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.15);text-align:center"><div style="font-size:1.5em;font-weight:900;color:var(--purple,#a78bfa)">' + st.quiz + '</div><div style="font-size:.68em;color:var(--text-muted,#52525b)">Quiz answered</div></div>'
        + '<div style="flex:1;padding:12px;border-radius:10px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.15);text-align:center"><div style="font-size:1.5em;font-weight:900;color:var(--cyan,#22d3ee)">' + st.read + '</div><div style="font-size:.68em;color:var(--text-muted,#52525b)">Archive viewed</div></div>'
        + '</div>'
        + '<div style="display:flex;gap:8px">'
        + '<button class="pt-btn" style="flex:1" onclick="ProgressTracker.logout()">Sign out</button>'
        + '<button class="pt-btn" style="flex:1;background:rgba(255,255,255,.06)" onclick="closeProgressModal()">Close</button>'
        + '</div>';
    } else {
      body.innerHTML = ''
        + '<div style="text-align:center;font-weight:800;font-size:1em;margin-bottom:4px">Login to track progress</div>'
        + '<div style="text-align:center;font-size:.72em;color:var(--text-muted,#52525b);margin-bottom:14px">Questions you answer or view are counted per account.</div>'
        + '<div class="pt-tabs" style="display:flex;gap:4px;padding:3px;border-radius:100px;background:rgba(255,255,255,.05);margin-bottom:14px">'
        + '<button class="pt-tab pt-tab-login" style="flex:1" onclick="setProgressTab(\'login\')">Login</button>'
        + '<button class="pt-tab" onclick="setProgressTab(\'signup\')">Sign up</button>'
        + '</div>'
        + '<div class="pt-fields">'
        + '<input id="pt-name" type="text" placeholder="Name (for signup)" style="display:none">'
        + '<input id="pt-email" type="email" placeholder="Email" value="' + esc(rememberedEmail()) + '">'
        + '<input id="pt-pass" type="password" placeholder="Password">'
        + '<label style="display:flex;align-items:center;gap:6px;font-size:.75em;color:var(--text-muted,#52525b);margin:2px 0 10px;cursor:pointer"><input id="pt-remember" type="checkbox" style="width:auto;margin:0;cursor:pointer"> Remember my email on this device</label>'
        + '</div>'
        + '<div class="pt-msg" style="display:none;font-size:.75em;text-align:center;margin:8px 0;padding:8px;border-radius:8px;background:rgba(245,158,11,.08);color:var(--amber,#f59e0b)"></div>'
        + '<button class="pt-btn pt-submit" style="width:100%" onclick="submitProgressAuth()">Login</button>';
    }
  }

  function setProgressTab(tab) {
    var isLogin = tab === 'login';
    var tabs = _modal.querySelectorAll('.pt-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].style.background = tabs[i].classList.contains('pt-tab-' + tab) ? 'rgba(167,139,250,.15)' : 'transparent';
      tabs[i].style.color = tabs[i].classList.contains('pt-tab-' + tab) ? 'var(--purple,#a78bfa)' : 'var(--text-sec,#a1a1aa)';
    }
    var nameEl = _modal.querySelector('#pt-name');
    var submitEl = _modal.querySelector('.pt-submit');
    if (nameEl) nameEl.style.display = isLogin ? 'none' : 'block';
    if (submitEl) submitEl.textContent = isLogin ? 'Login' : 'Create account';
  }

  function showMsg(text) {
    var msg = _modal && _modal.querySelector('.pt-msg');
    if (!msg) { alert(text); return; }
    msg.innerHTML = text;
    msg.style.display = 'block';
  }

  function submitProgressAuth() {
    var email = _modal.querySelector('#pt-email').value.trim();
    var pass = _modal.querySelector('#pt-pass').value;
    if (!email || !pass) { showMsg('Enter email and password.'); return; }
    var isLogin = _modal.querySelector('.pt-submit').textContent === 'Login';
    var name = _modal.querySelector('#pt-name').value.trim();
    var btn = _modal.querySelector('.pt-submit');
    btn.disabled = true;
    btn.textContent = 'Please wait...';
    var p = isLogin ? login(email, pass) : signup(email, pass, name);
    p.then(function (res) {
      if (res.confirm) { showMsg('Account created! Check your email to confirm, then log in.'); }
      else {
        var remember = _modal.querySelector('#pt-remember');
        if (remember && remember.checked) saveRememberedEmail(email);
        else if (remember) saveRememberedEmail('');
        closeModal();
      }
    }).catch(function (err) {
      showMsg(esc((err && err.message) || 'Something went wrong.'));
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = isLogin ? 'Login' : 'Create account';
    });
  }

  function buildUI() {
    if (_ctl) return;
    _ctl = document.createElement('div');
    _ctl.id = 'progressCtl';
    _ctl.style.cssText = 'flex-shrink:0';
    render();
    var nav = document.querySelector('.nav-inner');
    if (nav) nav.appendChild(_ctl);
    else {
      _ctl.style.cssText = 'position:fixed;top:70px;right:16px;z-index:200;flex-shrink:0';
      document.body.appendChild(_ctl);
    }

    var overlay = document.createElement('div');
    overlay.id = 'progressModal';
    overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:1000;align-items:flex-start;justify-content:center;padding:80px 16px 16px';
    overlay.innerHTML = '<div class="pt-modal" style="background:#12121c;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px;max-width:340px;width:100%;box-shadow:0 16px 48px rgba(0,0,0,.5)">'
      + '<div class="pt-modal-body"></div>'
      + '</div>';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
    _modal = overlay;

    var style = document.createElement('style');
    style.id = 'ptStyle';
    style.textContent = '#progressModal input{width:100%;padding:10px 12px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#fafafa;font-size:.85em;font-family:inherit;margin-bottom:8px;outline:none}#progressModal input:focus{border-color:var(--purple,#a78bfa)}.pt-btn{padding:11px;border-radius:100px;border:none;cursor:pointer;font-size:.85em;font-weight:700;background:linear-gradient(135deg,#a78bfa,#34d399);color:#fff}.pt-tab{padding:7px;border-radius:100px;border:none;background:transparent;color:#a1a1aa;font-size:.78em;font-weight:600;cursor:pointer}';
    document.head.appendChild(style);
    _uiReady = true;
    render();
  }

  function loadSupabaseJS(cb) {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) { cb(); return; }
    var s = document.createElement('script');
    s.src = SUPABASE_CDN;
    s.onload = cb;
    s.onerror = function () { cb(); };
    document.head.appendChild(s);
  }

  function init() {
    buildUI();
    loadSupabaseJS(function () {
      if (!configured() || !window.supabase || !window.supabase.createClient) {
        _uiReady = true;
        render();
        return;
      }
      try {
        _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } catch (e) { _client = null; }
      if (!_client) { render(); return; }
      _client.auth.getSession().then(function (res) {
        var u = res && res.data && res.data.session && res.data.session.user ? res.data.session.user : null;
        applyUser(u);
      }).catch(function () {});
      _client.auth.onAuthStateChange(function (event, session) {
        var u = session && session.user ? session.user : null;
        applyUser(u);
      });
    });
  }

  window.ProgressTracker = {
    init: init,
    track: track,
    getStats: getStats,
    login: login,
    signup: signup,
    logout: logout,
    onUpdate: function (cb) { _onUpdate.push(cb); },
    isConfigured: configured
  };

  window.openProgressModal = openModal;
  window.closeProgressModal = closeModal;
  window.submitProgressAuth = submitProgressAuth;
  window.setProgressTab = setProgressTab;

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushSync();
  });
  window.addEventListener('pagehide', function () { flushSync(); });
  window.addEventListener('beforeunload', function () { flushSync(); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
