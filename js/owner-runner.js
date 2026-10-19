// Owner runner — the owner's machine never writes; GitHub's runners do.
//
// Everywhere the site generates new content in the browser (the exam tutor's
// "Generate", the AI fresh paper, the ask pages' answer writer), this module
// adds a second route, visible ONLY to the owner (the site's admin Google
// account): the request is queued to GitHub Actions through
// functions/api/on-demand.js, the site's own model writes it on GitHub's
// machines, and the page shows the result when it lands. Nothing heavy runs
// on the owner's device and nothing is exposed to other visitors.
//
// The gate is server-side (the Cloudflare function verifies the Supabase
// login token against the owner's email and rate-limits), so a visitor who
// finds this file still cannot dispatch a single run.
//
// The pill (bottom-right, owner only) switches the route on/off and says
// whether the server side is wired up yet.
//
// Rendering contract for the writer backend: prompts that are not the final
// UPSC answer-writing prompt (the search-term expander, the planner) are
// answered with an empty string locally — never dispatched — so one ask
// costs exactly one runner run, and retrieval/planning still happen the way
// the pages already expect (expand -> null, plan -> null -> single-pass).
(function () {
  'use strict';

  var SB_URL = 'https://krvlufonfbcabgcjomvs.supabase.co';
  var SB_ANON = 'sb_publishable_jQqqojpcRKwI3boRYfmBYg_-Kem7UyW';
  var API = '/api/on-demand';
  var RESULT = '/data/on-demand/';
  // Results are committed to main by the workflow; GitHub's raw host serves
  // them within seconds of the commit, while the site copy waits for the
  // live-branch mirror (up to ~40 min). Raw is polled first, the site copy
  // second — same "proxy straight off main" pattern as the questions proxy.
  var RAW = 'https://raw.githubusercontent.com/renj-arch/dimsred/main/data/on-demand/';
  var POLL_MS = 20000;
  var DEFAULT_TIMEOUT_MS = 45 * 60 * 1000;
  var STORE_KEY = 'vlymbooqOwnerRunner';

  var state = {
    resolved: false,
    owner: false,
    configured: false,
    enabled: readEnabled()
  };
  var readyPromise = null;
  var pillEl = null;
  var activeRuns = 0;
  var activeSince = 0;
  var activeTimer = null;

  function readEnabled() {
    try { return localStorage.getItem(STORE_KEY) !== 'off'; } catch (e) { return true; }
  }
  function writeEnabled(on) {
    try { localStorage.setItem(STORE_KEY, on ? 'on' : 'off'); } catch (e) {}
  }

  function snapshot() {
    return {
      resolved: state.resolved,
      owner: state.owner,
      configured: state.configured,
      enabled: state.enabled
    };
  }

  function emit() {
    try { window.dispatchEvent(new CustomEvent('vlymbooq-owner', { detail: snapshot() })); } catch (e) {}
  }

  // ---- Supabase token (standalone: js/supabase.js may not be on this page) --

  function getToken() {
    try { return localStorage.getItem('sb_access_token') || ''; } catch (e) { return ''; }
  }
  function getRefresh() {
    try { return localStorage.getItem('sb_refresh_token') || ''; } catch (e) { return ''; }
  }
  function tokenExpired() {
    var tok = getToken();
    if (!tok) return true;
    try {
      var parts = tok.split('.');
      if (parts.length < 2) return false;
      var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload && payload.exp) return (payload.exp * 1000) - Date.now() < 60000;
      return false;
    } catch (e) { return false; }
  }
  function refreshToken() {
    var rt = getRefresh();
    if (!rt) return Promise.resolve('');
    return fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': SB_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt })
    }).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (d) {
      if (d && d.access_token) {
        try {
          localStorage.setItem('sb_access_token', d.access_token);
          if (d.refresh_token) localStorage.setItem('sb_refresh_token', d.refresh_token);
        } catch (e) {}
        return d.access_token;
      }
      return '';
    }).catch(function () { return ''; });
  }
  function freshToken() {
    var t = getToken();
    if (!t) return Promise.resolve('');
    if (!tokenExpired()) return Promise.resolve(t);
    return refreshToken();
  }

  // ---- identity ------------------------------------------------------------

  // Ask the server (never the client) whether this login is the owner and
  // whether the dispatcher is wired up. One call per page load at most.
  function resolve() {
    if (readyPromise) return readyPromise;
    readyPromise = freshToken().then(function (t) {
      if (!t) return snapshot();
      return fetch(API + '?whoami=1', { headers: { 'Authorization': 'Bearer ' + t } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (w) {
          if (w && typeof w.owner === 'boolean') {
            state.owner = !!w.owner;
            state.configured = !!w.configured;
            state.resolved = true;
            if (state.owner) {
              installWriterBackend();
              makePill();
            }
            emit();
          }
          return snapshot();
        });
    }).catch(function () { return snapshot(); });
    return readyPromise;
  }

  // ---- the pill ------------------------------------------------------------

  function pillText() {
    var t = state.enabled ? '\u2699 Runner: ON' : '\u2699 Runner: off';
    if (state.enabled && !state.configured) t = '\u2699 Runner: set up needed';
    if (activeRuns > 0) {
      var mins = Math.max(0, Math.round((Date.now() - activeSince) / 60000));
      t += ' \u00B7 writing' + (mins >= 1 ? ' \u00B7 ' + mins + ' min' : '\u2026');
    }
    return t;
  }
  function activeUp() {
    activeRuns++;
    if (activeRuns === 1) {
      activeSince = Date.now();
      if (!activeTimer) activeTimer = setInterval(refreshPill, 30000);
    }
    refreshPill();
  }
  function activeDown() {
    if (activeRuns > 0) activeRuns--;
    if (activeRuns === 0 && activeTimer) {
      clearInterval(activeTimer);
      activeTimer = null;
    }
    refreshPill();
  }
  function refreshPill() {
    if (!pillEl) return;
    pillEl.textContent = pillText();
    pillEl.title = state.enabled
      ? (state.configured
        ? 'AI generation runs on GitHub\u2019s runners, not this device. Click to switch to the on-device model.'
        : 'Not connected yet. Add GITHUB_DISPATCH_TOKEN in the Cloudflare dashboard (Pages \u2192 the site \u2192 Settings \u2192 Environment variables), then redeploy.')
      : 'Click to send AI generation to GitHub\u2019s runners instead of this device (owner only).';
    pillEl.style.borderColor = state.enabled && state.configured ? 'rgba(52,211,153,.5)' : 'rgba(255,255,255,.18)';
  }
  function makePill() {
    if (pillEl) return;
    if (!document.body) {
      setTimeout(makePill, 400);
      return;
    }
    pillEl = document.createElement('button');
    pillEl.id = 'vlymbooq-owner-pill';
    pillEl.style.cssText = [
      'position:fixed', 'right:16px', 'bottom:78px', 'z-index:9997',
      'padding:6px 12px', 'border-radius:100px', 'cursor:pointer',
      'border:1px solid rgba(255,255,255,.18)',
      'background:rgba(9,9,11,.85)', 'color:#d4d4d8',
      'font:600 11px/1.4 system-ui,sans-serif', 'letter-spacing:.02em',
      'backdrop-filter:blur(6px)', 'box-shadow:0 2px 10px rgba(0,0,0,.35)'
    ].join(';');
    pillEl.onclick = function () { setEnabled(!state.enabled); };
    refreshPill();
    document.body.appendChild(pillEl);
  }

  function setEnabled(on) {
    state.enabled = !!on;
    writeEnabled(state.enabled);
    if (state.owner) {
      if (state.enabled) installWriterBackend();
      else uninstallWriterBackend();
    }
    refreshPill();
    emit();
  }

  // ---- writer backend (ask pages) -------------------------------------------

  function writerBackend(prompt) {
    prompt = String(prompt || '');
    // Not the final answer-writing prompt? Answer locally with nothing: the
    // expander falls back to the question's own words (plus the page's
    // full-text index, when present) and the planner falls back to the
    // single-pass prompt. Never burn a runner dispatch on a probe.
    var isWriter = prompt.indexOf('You are answering a UPSC mains question') !== -1 &&
      prompt.indexOf('Plan a UPSC mains answer') === -1;
    if (!isWriter) return Promise.resolve('');
    return run('writer', {
      prompt: prompt.slice(0, 60000),
      temperature: 0.3,
      maxTokens: 2200
    }).then(function (res) {
      return (res && res.text) || '';
    });
  }

  function installWriterBackend() {
    var llm = window.VlymbooqAskLLM;
    if (!llm || typeof llm.setBackend !== 'function') return false;
    if (!(state.owner && state.enabled)) return false;
    llm.setBackend(function (prompt, opts) {
      // ask-llm's function-backend shape passes (prompt, opts); temperature
      // arrives from the prompt builders, not from our payload.
      return writerBackend(prompt, opts);
    });
    return true;
  }
  function uninstallWriterBackend() {
    var llm = window.VlymbooqAskLLM;
    if (llm && typeof llm.setBackend === 'function') llm.setBackend(null);
  }

  // Late-loaded ask-llm (defer order, slow networks): try again on load.
  if (typeof window !== 'undefined') {
    if (document.readyState === 'complete') {
      if (state.owner && state.enabled) installWriterBackend();
    } else {
      window.addEventListener('load', function () {
        if (state.owner && state.enabled) installWriterBackend();
      });
    }
  }

  // ---- submission + polling --------------------------------------------------

  function submit(kind, payload, opts) {
    opts = opts || {};
    if (!state.owner) return Promise.reject(new Error('this feature is owner-only'));
    if (!state.configured) {
      return Promise.reject(new Error('the runner is not connected yet — add GITHUB_DISPATCH_TOKEN in the Cloudflare dashboard, then redeploy'));
    }
    return freshToken().then(function (t) {
      if (!t) throw new Error('sign in with Google first (the owner account)');
      return fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t, kind: kind, payload: payload, model: opts.model })
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.id) throw new Error((j && j.error) || ('the runner refused the request (' + r.status + ')'));
        return j;
      });
    });
  }

  function poll(id, opts) {
    opts = opts || {};
    var onStatus = typeof opts.onStatus === 'function' ? opts.onStatus : function () {};
    var timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
    var started = Date.now();
    return new Promise(function (resolve, reject) {
      function schedule() {
        var mins = Math.max(1, Math.round((Date.now() - started) / 60000));
        onStatus('The GitHub runner is writing\u2026 (' + mins + ' min elapsed \u2014 usually 8\u201320 min, nothing runs on this device)');
        setTimeout(tick, POLL_MS);
      }
      function fetchResult() {
        var bust = '.json?t=' + Date.now();
        var idEnc = encodeURIComponent(id);
        return fetch(RAW + idEnc + bust, { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .catch(function () { return null; })
          .then(function (j) {
            if (j && j.status) return j;
            // Raw unreachable or not there yet (fresh 404s are not cached
            // because every request carries a new cache-buster) — try the
            // site's own copy as the fallback path.
            return fetch(RESULT + idEnc + bust, { cache: 'no-store' })
              .then(function (r) { return r.ok ? r.json() : null; })
              .catch(function () { return null; });
          });
      }
      function tick() {
        if (Date.now() - started > timeoutMs) {
          reject(new Error('the runner is taking unusually long. The run may still finish \u2014 open GitHub \u2192 renj-arch/dimsred \u2192 Actions \u2192 On-Demand to watch it, then try again.'));
          return;
        }
        fetchResult()
          .then(function (j) {
            if (j && j.status === 'done') { resolve(j); return; }
            if (j && j.status === 'failed') { reject(new Error(j.error || 'the runner reported a failure')); return; }
            schedule();
          })
          .catch(function () { schedule(); });
      }
      onStatus('Queued \u2014 the GitHub runner is picking it up\u2026 (usually 8\u201320 min)');
      setTimeout(tick, 3000);
    });
  }

  function run(kind, payload, opts) {
    opts = opts || {};
    var onStatus = typeof opts.onStatus === 'function' ? opts.onStatus : function () {};
    return resolve().then(function () {
      if (!state.owner) throw new Error('this feature is owner-only');
      if (!state.enabled) throw new Error('the GitHub runner is switched off (tap the \u2699 pill, bottom-right)');
      activeUp();
      return submit(kind, payload, opts).then(function (j) {
        return poll(j.id, { onStatus: onStatus, timeoutMs: opts.timeoutMs }).then(function (res) {
          res.run = j.run || '';
          return res;
        });
      }).finally(function () {
        activeDown();
      });
    });
  }

  // ---- public API -------------------------------------------------------------

  window.OwnerRunner = {
    ready: resolve,
    isOwner: function () { return state.owner; },
    isResolved: function () { return state.resolved; },
    // "Active" = route every browser-side generation through the runner.
    // Used by the tutor pages to choose the path; run() explains any refusal.
    isActive: function () { return state.owner && state.enabled; },
    enabled: function () { return state.enabled; },
    setEnabled: setEnabled,
    run: run,
    installWriterBackend: installWriterBackend
  };

  // Look for a session on load; stays quiet when nobody is signed in.
  resolve();
})();
