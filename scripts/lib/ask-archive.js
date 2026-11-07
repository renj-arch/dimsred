(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VlymbooqAskArchive = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
// Archive FAQ match for the Ask engine.
//
// The archive (data/archive-answers.json, written by the CI model) holds
// finished model answers — full explanations, not raw sentences. When a user
// question strongly matches an archived question, the archived answer IS the
// answer (with provenance), and the page shows it directly instead of asking
// the small in-browser model to compose from fragments.
//
// Matching is deliberately strict: token overlap on significant words with a
// high bar, so near-misses fall through to the normal pipeline untouched.
// Returns null on no strong match — never a least-bad guess.

var URL = 'data/archive-answers.json';
var cache = null;
var loading = null;

var STOP = {};
('what,when,where,which,who,whom,whose,why,how,does,do,did,is,are,was,were,has,have,had,can,could,should,would,will,the,a,an,and,or,of,in,on,for,to,with,by,from,as,at,about,into,analyse,analyze,examine,discuss,explain,comment,critically,whether,indias,india,indian').split(',').forEach(function (w) { STOP[w] = 1; });

function tokens(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(function (w) { return w.length > 2 && !STOP[w]; });
}

function load() {
  if (cache) return Promise.resolve(cache);
  if (loading) return loading;
  loading = fetch(URL).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status + ' on ' + URL);
    return r.json();
  }).then(function (d) {
    cache = d && d.answers ? d.answers : {};
    return cache;
  }).catch(function () { loading = null; cache = {}; return cache; });
  return loading;
}

// Strong match only: >=60% of the SMALLER side's significant tokens shared,
// minimum 3 shared tokens. Archive questions are full sentences; user
// questions are too — weak overlaps fall through silently.
function match(question) {
  return load().then(function (answers) {
    var ids = Object.keys(answers);
    if (!ids.length) return null;
    var qt = tokens(question);
    if (qt.length < 3) return null;
    var qset = {};
    qt.forEach(function (w) { qset[w] = 1; });
    var best = null, bestScore = 0;
    ids.forEach(function (id) {
      var a = answers[id];
      if (!a || !a.question || !a.modelAnswer) return;
      var at = tokens(a.question);
      if (!at.length) return;
      var shared = 0;
      at.forEach(function (w) { if (qset[w]) shared++; });
      var score = shared / Math.min(qt.length, at.length);
      if (shared >= 3 && score > bestScore) { bestScore = score; best = a; }
    });
    if (!best || bestScore < 0.6) return null;
    best._score = bestScore;
    best._id = null;
    for (var i = 0; i < ids.length; i++) { if (answers[ids[i]] === best) { best._id = ids[i]; break; } }
    return best;
  });
}

function renderHtml(entry) {
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // Exam-relevance chip (importance + importantFor, writer-assessed). Honest
  // label: it is the site AI's assessment, not an official syllabus list.
  function yieldTag(e) {
    var imp = e && e.importance;
    if (!imp) return '';
    var exams = (e.importantFor && e.importantFor.length) ? ' · ' + esc(e.importantFor.join(', ')) : '';
    var label = imp === 'high' ? 'high-yield' : (imp === 'medium' ? 'exam-relevant' : 'low priority');
    var color = imp === 'high' ? 'background:rgba(239,68,68,.14);color:#ef4444'
      : imp === 'medium' ? 'background:rgba(245,158,11,.14);color:#f59e0b'
      : 'background:rgba(148,163,184,.14);color:#94a3b8';
    return ' · <span class="arch-tag" style="' + color + '" title="AI-assessed exam relevance — not an official syllabus list">' + label + exams + '</span>';
  }
  var facts = (entry.keyFacts || []).map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');
  return '<div class="arch-answer">'
    + '<div class="arch-badge">Archive answer · written by ' + (entry.writtenBy ? esc(entry.writtenBy) + ' (local LLM)' : 'the local LLM') + ' · '
    + (entry.origin === 'agent-made'
      ? '<span class="arch-tag" style="background:rgba(167,139,250,.14);color:#a78bfa">agent-made</span>'
      : '<span class="arch-tag">auto gen</span>')
    + yieldTag(entry)
    + (entry.category ? ' · ' + esc(entry.category) + (entry.subject ? ' / ' + esc(entry.subject) : '') : '') + '</div>'
    + '<div class="arch-q">Q: ' + esc(entry.question) + '</div>'
    + '<div class="arch-a">' + esc(entry.modelAnswer).replace(/\n/g, '<br>') + '</div>'
    + (facts ? '<ul class="arch-facts">' + facts + '</ul>' : '')
    + '<div class="arch-src">Source: site archive (<a href="archive.html">browse</a>) · answer id ' + esc(entry._id || '') + '</div>'
    + '</div>';
}

return {
  load: load,
  match: match,
  renderHtml: renderHtml
};
}));
