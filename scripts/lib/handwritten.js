// Protection for hand-written lessons.
//
// The course has two machine lanes that rewrite lesson pages:
//   - scripts/deep-rewrite.js  splices model sections straight into the HTML
//   - scripts/expand-course.js regenerates pages / injects model addons
//
// A hand-written lesson must never be touched by either. Splicing a machine
// section into authored prose despoils it, and the owner explicitly rejected
// model-expanded content for these pages (the learning merit comes from the
// authored argument, not from a 27B model padding it).
//
// data/handwritten-lessons.json is the single source of truth. Add a path there
// the moment a lesson is hand-written.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', '..', 'data', 'handwritten-lessons.json');

function norm(p) {
  // Compare on a repo-relative path with forward slashes, so callers may pass
  // an absolute path, a backslash path or a leading "./" and still match.
  let s = String(p == null ? '' : p).replace(/\\/g, '/').replace(/^\.\//, '');
  const i = s.indexOf('upsc/course/');
  if (i > 0) s = s.slice(i);
  return s;
}

var _set = null;
function protectedSet() {
  if (_set) return _set;
  var list = [];
  try {
    var j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    list = Array.isArray(j) ? j : (j && Array.isArray(j.lessons) ? j.lessons : []);
  } catch (e) {
    // Fail open, not closed: a missing manifest must not stop every lane.
    // But make the miss loud so it is noticed.
    console.log('handwritten: WARNING - could not read ' + FILE + ': ' + e.message);
    list = [];
  }
  _set = Object.create(null);
  list.forEach(function (p) { _set[norm(p)] = true; });
  return _set;
}

function isProtected(p) {
  return protectedSet()[norm(p)] === true;
}

// Count, for logs and tests.
function protectedCount() {
  return Object.keys(protectedSet()).length;
}

module.exports = { isProtected: isProtected, protectedSet: protectedSet, protectedCount: protectedCount, norm: norm, FILE: FILE };
