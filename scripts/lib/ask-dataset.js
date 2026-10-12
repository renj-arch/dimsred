// Training-data capture. Every question the engine answers well becomes one
// JSONL record -- question, search terms, the corpus facts the model was
// given, its plan, and the final prose -- in exactly the shape a fine-tune
// needs: the model is never asked to invent anything, only to arrange facts
// the corpus already holds. Collect a few hundred of these by using the page
// normally, export, and train (see train/finetune.py).
//
// Records live in localStorage so a reload does not lose a session's worth of
// examples; the cap keeps a heavy user from evicting the site's own data.
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
// training prompt can reproduce what the model actually saw.
function record(entry) {
  if (!entry || !entry.q || !entry.answer) return false;
  var list = load();
  list.push({
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
  return true;
}

function count() { return load().length; }

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

return {
  record: record,
  count: count,
  clear: clear,
  exportJSONL: exportJSONL,
  download: download
};
}));
