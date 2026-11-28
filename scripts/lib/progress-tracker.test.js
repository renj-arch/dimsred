'use strict';
// Regression suite for js/progress-tracker.js.
//
// The tracker is a browser IIFE, so the test runs it in a vm sandbox with a
// minimal localStorage/window shim. Every case below is a bug that shipped in
// the first cut, or a property the progress page depends on:
//
//   * visits were deferred to DOMContentLoaded, so progress.html rendered 0
//   * the subject map pointed at /lda/ (no such page) and /ssc-je/ (it is a
//     file, ssc-je.html), creating subjects the user could never open
//   * recommendations were inert text instead of links
//   * dashboard/progress inflated "subjects explored"
//
//   node scripts/lib/progress-tracker.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const CODE = fs.readFileSync(path.join(ROOT, 'js', 'progress-tracker.js'), 'utf8');

function boot(opts) {
  opts = opts || {};
  const store = Object.assign({}, opts.store || {});
  const localStorage = {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
    },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  const window = { location: { pathname: opts.path || '/' } };
  const ctx = {
    window: window,
    localStorage: localStorage,
    document: { getElementById: function () { return null; } },
    console: console,
    Date: Date,
    JSON: JSON,
    Math: Math
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx);
  return { window: window, store: store, tracker: window.ProgressTracker };
}

function today() {
  // Same formatting the tracker uses, so the test is timezone-stable.
  return new Date().toISOString().slice(0, 10);
}

let pass = 0, fail = 0;
function assert(ok, label, detail) {
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok || !detail ? '' : '\n        ' + detail));
}

console.log('--- the visit is recorded before the page can render ---');
(function () {
  const b = boot({ path: '/cgl/practice-sets.html' });
  const s = b.tracker.getSummary();
  assert(s.totalPages === 1, 'first load records the current page synchronously',
    'totalPages=' + s.totalPages);
  assert(s.streak === 1, 'first ever visit starts a 1-day streak', 'streak=' + s.streak);
  const subject = s.studySubjects.map(function (x) { return x.name; });
  assert(subject.indexOf('SSC CGL') !== -1, 'exam path maps to SSC CGL', JSON.stringify(subject));
})();

console.log('\n--- repeated visits on the same day ---');
(function () {
  const b = boot({ path: '/cgl/practice-sets.html' });
  b.tracker.recordVisit();
  const s = b.tracker.getSummary();
  assert(s.totalVisits === 2, 'two loads count two visits', 'totalVisits=' + s.totalVisits);
  assert(s.streak === 1, 'same-day reload does not inflate the streak', 'streak=' + s.streak);
  assert(s.totalPages === 1, 'same page is counted once', 'totalPages=' + s.totalPages);
})();

console.log('\n--- streak arithmetic ---');
(function () {
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const b = boot({
    path: '/neet/',
    store: {
      vlymbooq_progress: JSON.stringify({
        subjects: {}, pages: {}, streak: 3, lastVisit: yesterday
      })
    }
  });
  assert(b.tracker.getSummary().streak === 4, 'consecutive day increments the streak',
    'streak=' + b.tracker.getSummary().streak);
})();

(function () {
  const old = new Date(Date.now() - 3 * 86400000).toISOString();
  const b = boot({
    path: '/neet/',
    store: {
      vlymbooq_progress: JSON.stringify({
        subjects: {}, pages: {}, streak: 9, lastVisit: old
      })
    }
  });
  assert(b.tracker.getSummary().streak === 1, 'a missed day resets the streak to 1',
    'streak=' + b.tracker.getSummary().streak);
})();

console.log('\n--- subject registry points at real destinations ---');
(function () {
  const b = boot();
  const subjects = b.tracker.subjects;
  const names = {};
  const matches = {};
  let badHref = null;
  let duplicateName = null;
  let duplicateMatch = null;

  subjects.forEach(function (s) {
    if (names[s.name]) duplicateName = s.name;
    names[s.name] = true;
    if (matches[s.match]) duplicateMatch = s.match;
    matches[s.match] = true;

    const target = s.href.charAt(0) === '/'
      ? path.join(ROOT, s.href)
      : path.join(ROOT, s.href);
    if (!fs.existsSync(target)) badHref = s.name + ' -> ' + s.href;
  });

  assert(!badHref, 'every subject href resolves to a file or directory', badHref);
  assert(!duplicateName, 'subject names are unique', duplicateName);
  assert(!duplicateMatch, 'match fragments are unique', duplicateMatch);
  assert(subjects.every(function (s) { return s.href && s.href.length; }),
    'every subject has a href');
})();

console.log('\n--- recommendations are actionable and skip utility pages ---');
(function () {
  const b = boot({ path: '/dashboard.html' });
  const recs = b.tracker.getRecommendations(8);
  assert(recs.length === 8, 'returns the requested number', 'got ' + recs.length);
  assert(recs.every(function (r) { return r.name && r.href; }),
    'every recommendation carries a name and href');
  assert(!recs.some(function (r) { return r.name === 'Dashboard' || r.name === 'Progress'; }),
    'dashboard and progress are never recommended',
    JSON.stringify(recs.map(function (r) { return r.name; })));

  const s = b.tracker.getSummary();
  assert(!s.studySubjects.some(function (x) { return x.name === 'Dashboard'; }),
    'dashboard is excluded from subjects explored',
    JSON.stringify(s.studySubjects.map(function (x) { return x.name; })));
})();

console.log('\n--- recent pages are newest first ---');
(function () {
  const b = boot({ path: '/jee/' });
  b.window.location.pathname = '/gate/';
  b.tracker.recordVisit();
  const recent = b.tracker.getRecentPages(2);
  assert(recent.length === 2, 'returns two entries', 'got ' + recent.length);
  assert(recent[0].subject === 'GATE', 'newest visit is first', recent[0].subject);
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
