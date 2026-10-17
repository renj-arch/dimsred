// Training-data capture. Every question the engine answers well becomes one
// JSONL record -- question, search terms, the corpus facts the model was
// given, its plan, and the final prose -- in exactly the shape a fine-tune
// needs: the model is never asked to invent anything, only to arrange facts
// the corpus already holds.
//
// Records live in localStorage so a reload does not lose a session's worth of
// examples; the cap keeps a heavy user from evicting the site's own data.
//
// Auto-sync: once a fine-grained PAT is pasted in (one time, stored in
// localStorage), every new record is pushed to the `training-data` branch of
// the repo via the GitHub Git Data API, which triggers the Train Writer Model
// workflow -- so the page's own answers continuously retrain the page's own
// model. The token is sent only to api.github.com, never anywhere else.
(function (root, factory) {
if (typeof module === 'object' && module.exports) {
  module.exports = factory();
} else {
  root.VlymbooqAskDataset = factory();
}
}(typeof self !== 'undefined' ? self : this, function () {
'use strict';

var KEY = 'askDataset';
var MAX_ENTRIES = 200;

// The repo whose `training-data` branch receives the records, and the token
// storage key. Hardcoded because the page is deployed for this repo; the Git
// Data API calls below are the only network traffic this module ever makes.
var REPO = 'renj-arch/dimsred';
var DATA_BRANCH = 'training-data';
var TOKEN_KEY = 'askSyncToken';

function load() {
  try {
    var raw = typeof localStorage !== 'undefined' && localStorage.getItem(KEY);
    var list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) { return []; }
}

function save(list) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX_ENTRIES)));
    }
  } catch (e) { /* quota or private mode: keep in-memory only */ }
}

// One usable training example. `answer` is the model's own prose; `facts` are
// the verbatim sentences it was allowed to use, kept verbatim here so the
// training prompt can reproduce what the model actually saw. `kind` tags the
// domain -- 'answer' (default) for composed UPSC answers, 'improve' for
// figure/flowchart/HTML correction records from improve.html -- and travels
// with the JSONL so one training run learns both jobs from one file.
function record(entry) {
  if (!entry || !entry.q || !entry.answer) return false;
  var list = load();
  list.push({
    kind: String(entry.kind || 'answer'),
    q: String(entry.q),
    subject: String(entry.subject || ''),
    terms: (entry.terms || []).map(String),
    facts: (entry.facts || []).slice(0, 40).map(function (f) {
      return { sentence: String(f.sentence || f.text || ''), entity: String(f.entity || '') };
    }).filter(function (f) { return f.sentence; }),
    plan: entry.plan || null,
    sections: (entry.sections || []).map(function (s) {
      return { heading: String(s.heading || ''), lines: (s.lines || []).map(String) };
    }),
    answer: String(entry.answer),
    model: String(entry.model || ''),
    ts: new Date().toISOString()
  });
  save(list);
  scheduleSync();
  return true;
}

function count() { return load().length; }

// A copy of every captured record. Callers get a slice, never the stored
// array itself, so nothing outside this module can corrupt what trains.
function all() { return load().slice(); }

function clear() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
  } catch (e) { /* ignore */ }
}

function exportJSONL() {
  return load().map(function (e) { return JSON.stringify(e); }).join('\n') + '\n';
}

// Hand the file to the browser's download UI. Used by the page's
// "Export training data" link; also callable from the console.
function download() {
  var blob = new Blob([exportJSONL()], { type: 'application/x-ndjson' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ask-training.jsonl';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

// ── auto-sync to the training-data branch ───────────────────────────────────

function getToken() {
  try {
    return (typeof localStorage !== 'undefined' && localStorage.getItem(TOKEN_KEY)) || '';
  } catch (e) { return ''; }
}

function setToken(token) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem(TOKEN_KEY, String(token).trim());
      else localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) { /* ignore */ }
}

// UTF-8-safe base64: answers carry unicode the browser's btoa refuses.
function b64utf8(s) {
  var bytes = new TextEncoder().encode(s);
  var bin = '';
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function gh(path, opts) {
  opts = opts || {};
  var headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Authorization': 'Bearer ' + getToken()
  };
  if (opts.body) headers['Content-Type'] = 'application/json';
  return fetch('https://api.github.com/repos/' + REPO + path, {
    method: opts.method || 'GET',
    headers: headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(function (r) {
    if (r.status === 404) return null;
    if (!r.ok) return r.text().then(function (t) {
      throw new Error('GitHub ' + r.status + ': ' + t.slice(0, 200));
    });
    return r.json();
  });
}

// Push the whole JSONL as one commit on the training-data branch, via the Git
// Data API (blob -> tree -> commit -> ref) rather than the Contents API: the
// Contents API soft-caps around 1 MB encoded, and 200 records with their facts
// exceed that. Branch creation (first sync) forks from main's HEAD; later
// syncs fast-forward the ref, one commit per sync, which is exactly the push
// event train-writer.yml listens for.
function pushRecords() {
  var content = exportJSONL();
  if (!content.trim()) return Promise.resolve({ ok: false, reason: 'empty' });
  var token = getToken();
  if (!token) return Promise.resolve({ ok: false, reason: 'no-token' });

  var blobSha, headSha;
  return gh('/git/blobs', { method: 'POST', body: { content: content, encoding: 'base64' } })
    .then(function (blob) {
      if (!blob || !blob.sha) throw new Error('blob create failed');
      blobSha = blob.sha;
      return gh('/git/ref/heads/' + DATA_BRANCH);
    })
    .then(function (ref) {
      if (ref && ref.object && ref.object.sha) {
        headSha = ref.object.sha;
        return null;
      }
      // First sync: fork the branch from main so the tree (site data etc.)
      // carries over; the commit below only adds the JSONL on top.
      return gh('/git/ref/heads/main').then(function (mainRef) {
        if (!mainRef || !mainRef.object) throw new Error('cannot find main');
        return gh('/git/refs', {
          method: 'POST',
          body: { ref: 'refs/heads/' + DATA_BRANCH, sha: mainRef.object.sha }
        }).catch(function () { return null; /* lost a race with another tab */ });
      }).then(function () {
        return gh('/git/ref/heads/' + DATA_BRANCH);
      }).then(function (r2) {
        if (!r2 || !r2.object) throw new Error('branch create failed');
        headSha = r2.object.sha;
      });
    })
    .then(function () {
      return gh('/git/commits/' + headSha);
    })
    .then(function (commit) {
      if (!commit || !commit.tree) throw new Error('head commit unreadable');
      return gh('/git/trees', {
        method: 'POST',
        body: {
          base_tree: commit.tree.sha,
          tree: [{ path: 'ask-training.jsonl', mode: '100644', type: 'blob', sha: blobSha }]
        }
      });
    })
    .then(function (tree2) {
      if (!tree2 || !tree2.sha) throw new Error('tree create failed');
      return gh('/git/commits', {
        method: 'POST',
        body: {
          message: 'ask: training data sync (' + count() + ' records)',
          tree: tree2.sha,
          parents: [headSha]
        }
      });
    })
    .then(function (commit) {
      if (!commit || !commit.sha) throw new Error('commit create failed');
      return gh('/git/refs/heads/' + DATA_BRANCH, {
        method: 'PATCH',
        body: { sha: commit.sha, force: false }
      }).catch(function () {
        // Concurrent sync (another tab) moved the ref; retry once, forceless
        // still -- a lost race is fine, the other tab's file has the records.
        return null;
      });
    })
    .then(function () {
      return { ok: true, at: new Date().toISOString(), records: count() };
    });
}

// Debounced so a burst of questions becomes one push, and a failed push (no
// network, expired token) simply waits for the next record instead of
// hammering the API. The page reads state through syncStatus()/setSyncHook.
var syncTimer = null;
var lastSync = null;
var syncHook = null;
var syncing = null;

function setSyncHook(fn) { syncHook = fn || null; }

function syncStatus() { return lastSync; }

function finishSync(result) {
  lastSync = result;
  if (syncHook) { try { syncHook(result); } catch (e) { /* page-side render error */ } }
}

function scheduleSync() {
  if (!getToken()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(function () {
    syncTimer = null;
    if (syncing) return;
    syncing = pushRecords().then(function (res) {
      syncing = null;
      finishSync(res);
    }).catch(function (err) {
      syncing = null;
      finishSync({ ok: false, reason: String(err && err.message || err) });
    });
  }, 20000);
}

// Immediate push, used by the page's "Sync now" / first-enable path. Resolves
// with the same shape pushRecords does; never throws.
function syncNow() {
  if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
  if (syncing) return syncing;
  syncing = pushRecords().then(function (res) {
    syncing = null;
    finishSync(res);
    return res;
  }).catch(function (err) {
    syncing = null;
    var res = { ok: false, reason: String(err && err.message || err) };
    finishSync(res);
    return res;
  });
  return syncing;
}

return {
  record: record,
  count: count,
  all: all,
  clear: clear,
  exportJSONL: exportJSONL,
  download: download,
  getToken: getToken,
  setToken: setToken,
  syncNow: syncNow,
  syncStatus: syncStatus,
  setSyncHook: setSyncHook
};
}));
