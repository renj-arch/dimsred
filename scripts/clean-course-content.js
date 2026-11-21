#!/usr/bin/env node
'use strict';
// Clean the published course content of the defects the depth lane wrote
// before the 2026-11-10 expand-course fixes (PRs #23-#25):
//   * raw LaTeX ($...$, \frac, \omega, ...) on pages that do not load MathJax
//   * endings truncated mid-sentence with unbalanced tags (</h</h3>, </li</li>)
//   * known typos and one self-contradicting sentence
// The script is idempotent: re-running it changes nothing.
//
//   node scripts/clean-course-content.js          apply fixes
//   node scripts/clean-course-content.js --check  report only; exit 1 if dirty
//
// Addons (scripts/course-addons.json) are agent-written, so they get the full
// repair pipeline (plainMath + tag repair + balance), the same one
// expand-course.js applies to fresh output. Hand-built lessons
// (scripts/course-data.json) are only touched where a string actually contains
// math LaTeX; their markup is never restructured.

var fs = require('fs');
var path = require('path');
var repair = require('./lib/html-repair');
var expand = require('./expand-course');

var ROOT = path.resolve(__dirname, '..');
var CHECK = process.argv.indexOf('--check') !== -1;
var plainMath = repair.plainMath;

// Targeted editorial fixes, applied to the raw addon HTML before math
// conversion. [key, regex, replacement]
var ADDON_FIXES = [
  ['hand/riemannian-geometry', /Chebeger-Gromoll/g, 'Cheeger-Gromoll'],
  // The generated text questioned its own correct statement ("U_3 for a
  // 4-term AP is false... No. Be precise:"). A k-term AP relies on U_{k-1};
  // the Host-Kra factor Z_k is characterised by U_{k+1}. State it once.
  ['hand/ergodic-theory', /Remember:[^<]*is false[^<]*/, 'Remember: Length 3 (AP) $\\to U_2$; Length 4 (AP) $\\to U_3$; in general a $k$-term AP relies on $U_{k-1}$.']
];

var MATHY = /\\[a-zA-Z]+|\$[^$\n]{1,200}[\\^_{}][^$\n]{0,200}\$/;

function countLatex(s) {
  return (String(s).match(/\\[a-zA-Z]+|\$[^$\n]{0,200}[\\^_{}][^$\n]{0,200}\$/g) || []).length;
}

// Remove a trailing fragment the generator cut off mid-sentence when it hit
// its output budget. Keeps the last complete sentence; the caller re-balances
// the tags afterwards.
function trimDangling(html) {
  var s = String(html || '').trim();
  for (var iter = 0; iter < 4; iter++) {
    var suffix = '';
    var m;
    var closeRe = /<\/[a-zA-Z][a-zA-Z0-9]*>\s*$/;
    while ((m = closeRe.exec(s)) !== null) {
      suffix = m[0].trim() + suffix;
      s = s.slice(0, s.length - m[0].length).replace(/\s+$/, '');
    }
    if (!s) break;
    var gt = s.lastIndexOf('>');
    // A section heading is a title, not a sentence: never trim inside <h3>/<h4>.
    if (/<h[34][^>]*>[^<]*$/.test(s)) { s = s + suffix; break; }
    var tail = gt === -1 ? s : s.slice(gt + 1);
    var off = tail.search(/\S/); // leading whitespace skipped by trim()
    if (off === -1) off = tail.length;
    var frag = tail.replace(/&[a-zA-Z#0-9]+;/g, 'x').trim();
    if (!frag) { s = s + suffix; break; }
    var last = frag.charAt(frag.length - 1);
    // A trailing ")" only counts as a clean ending when the fragment is not a
    // cut-off formula (unbalanced parens or an unmatched $).
    var dollars = (frag.match(/\$/g) || []).length;
    var parens = (frag.match(/\(/g) || []).length - (frag.match(/\)/g) || []).length;
    // Only a sentence end is a clean ending. A trailing comma, semicolon or
    // colon is usually the middle of a clause the model never finished; the
    // old code accepted it and published pages ending in "...quadratic costs,".
    // A bare list marker ("3.") is also a truncated item, not a sentence, and
    // a number ending in a bare decimal ("Silver is +0.") was cut mid-value.
    var marker = /^(?:\d{1,3}|[a-zA-Z])\.$/.test(frag);
    if (marker) {
      var li = s.lastIndexOf('<li');
      if (li !== -1) { s = s.slice(0, li).replace(/\s+$/, ''); continue; }
      s = s.slice(0, (gt === -1 ? 0 : gt + 1 + off)).replace(/\s+$/, '');
      continue;
    }
    var bare = /[+\-−]?\d+\.$/.exec(frag);
    var punctOk = !marker && !bare && /[.!?…]["'”’)\]]?$/.test(frag);
    var parenOk = (last === ')' || last === ']') && parens === 0 && dollars % 2 === 0;
    if (punctOk || parenOk) { s = s + suffix; break; }
    // Dangling fragment: cut back to the last sentence end inside it. If there
    // is no sentence boundary, drop the whole fragment rather than keep a
    // clause that stops at a comma.
    var cut = -1;
    var res = /[.!?…]/g;
    var mm; var lastIdx = -1;
    // Do not treat the period in a bare decimal ("+0.") as a sentence end.
    var searchEnd = bare ? frag.length - bare[0].length : frag.length;
    res.lastIndex = 0;
    while ((mm = res.exec(frag)) !== null) {
      if (mm.index >= searchEnd) break;
      lastIdx = mm.index;
    }
    if (lastIdx !== -1 && searchEnd - lastIdx <= 160) cut = lastIdx + 1;
    if (cut === -1) cut = 0; // no boundary: drop the whole fragment
    s = s.slice(0, (gt === -1 ? 0 : gt + 1 + off) + cut).replace(/<br\s*\/?>\s*$/, '');
  }
  return s;
}

// The lesson prompt bans emoji, but the model still decorates headings and tip
// titles with them. A pictograph in a published lesson reads as a bug, not a
// style. Extended_Pictographic deliberately excludes arrows and maths symbols.
var PICTO = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu;
function stripEmoji(html) {
  return String(html || '')
    .replace(PICTO, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/(<(?:p|h[34]|div|li)\b[^>]*>)[ \t]+/gi, '$1')
    .replace(/[ \t]+(<\/(?:p|h[34]|div|li)>)/gi, '$1');
}

function cleanAddonPass(key, html) {
  var s = String(html || '');
  ADDON_FIXES.forEach(function (f) {
    if (f[0] === key) s = s.replace(f[1], f[2]);
  });
  // Malformed nested closers the model writes when cut off: </h</h3>, </li</li>
  s = s.replace(/<\/([a-zA-Z][a-zA-Z0-9]*)<\/([a-zA-Z][a-zA-Z0-9]*)>/g, '</$2>');
  s = plainMath(s);
  // A tip box with a title but no body is a section the model never wrote.
  // Remove it before the tail trim: its title has no full stop, so the trim
  // would otherwise cut back through the finished paragraph above it.
  s = s.replace(/<div class="tip-box">\s*(?:<div class="tip-title">[^<]{0,200}<\/div>\s*)?<div class="tip-text">\s*<\/div>\s*<\/div>\s*$/gi, '');
  // Cut a reply that stopped mid-sentence at the last complete sentence, then
  // let trimDangling handle tag-level leftovers (a bare <li>, a label).
  var tail = repair.trimIncompleteTail(s);
  if (tail.trimmed) s = tail.html;
  s = trimDangling(s);
  // Balance first: trimDangling can leave a bare opening <p>, and the dangling
  // label cleanup below needs the tag closed to match.
  s = repair.balance(repair.stripAttrs(s)).trim();
  // A trailing label with no body is a heading the model never explained;
  // keep the complete prose before it rather than publish a dangling title.
  s = s.replace(/(?:<p[^>]*>\s*<\/p>\s*)+$/gi, '');
  s = s.replace(/<(p|h[34])[^>]*>\s*<strong>[^<]{3,140}<\/strong>\s*<\/\1>\s*$/i, '');
  // A heading at the very end has no body: the model stopped before writing
  // the section. Drop the orphan title, keep the finished prose above it.
  s = s.replace(/<h[34][^>]*>[^<]{3,160}<\/h[34]>\s*$/i, '');
  // A worked example whose solution was cut off leaves an empty slot.
  s = s.replace(/<div class="ex-soln">\s*(?:<strong>Solution:<\/strong>\s*(?:<br\s*\/?>)?)?\s*<\/div>/gi, '');
  s = stripEmoji(s);
  s = repair.balance(s).trim();
  return s;
}

// One pass can expose a second defect (stripping an emoji reveals a truncated
// sentence underneath), so iterate to a fixed point. The workflow runs this
// once; a single invocation must leave the file clean.
function cleanAddonHtml(key, html) {
  var prev = String(html || '');
  for (var pass = 0; pass < 3; pass++) {
    var next = cleanAddonPass(key, prev);
    if (next === prev) return next;
    prev = next;
  }
  return prev;
}

function writeJson(file, obj) {
  // The repo stores these files with CRLF and 2-space indent; keep that.
  var out = JSON.stringify(obj, null, 2).replace(/\n/g, '\r\n') + '\r\n';
  fs.writeFileSync(file, out, 'utf8');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

// The expand workflow regenerates only the pages listed in .course-touched.json.
// A cleaned addon must be added to that list or the JSON and the published page
// drift apart, so record every key this run actually changed.
function mergeTouched(keys, files) {
  var touchedFile = path.join(__dirname, '.course-touched.json');
  var prev = {};
  try { prev = readJson(touchedFile); } catch (e) { prev = {}; }
  var uniq = function (a, b) { return Array.from(new Set([].concat(a || [], b || []))); };
  fs.writeFileSync(touchedFile, JSON.stringify({
    keys: uniq(prev.keys, keys),
    files: uniq(prev.files, files),
    exams: uniq(prev.exams, [])
  }), 'utf8');
}

var dirty = 0;
var touchedKeys = [];
var touchedFiles = [];

// --- addons -------------------------------------------------------------
var addonsFile = path.join(ROOT, 'scripts', 'course-addons.json');
var addons = readJson(addonsFile);
var keys = addons.keys || {};
Object.keys(keys).forEach(function (key) {
  var entry = keys[key] || {};
  var html = String(entry.html || '');
  if (!html) return;
  var clean = cleanAddonHtml(key, html);
  if (clean === html) return;
  dirty++;
  var v = expand.validateHtml(clean, { minH3: 1 });
  console.log('addon ' + key + ': ' + html.length + ' -> ' + clean.length + ' chars, latex ' +
    countLatex(html) + ' -> ' + countLatex(clean) + (v ? '  [validateHtml: ' + v + ']' : ''));
  console.log('  tail: ...' + clean.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(-110));
  if (!CHECK) {
    entry.html = clean;
    touchedKeys.push(key);
    (entry.files || []).forEach(function (f) { touchedFiles.push(f); });
  }
});
if (!CHECK && dirty) {
  writeJson(addonsFile, addons);
  mergeTouched(touchedKeys, touchedFiles);
}

// --- hand-built course data: math LaTeX only, never restructure ----------
var dataFile = path.join(ROOT, 'scripts', 'course-data.json');
var cdata = readJson(dataFile);
var dataHits = { n: 0 };
function walkData(value) {
  if (typeof value === 'string') {
    if (!MATHY.test(value)) return value;
    var next = plainMath(value);
    if (next !== value) dataHits.n++;
    return next;
  }
  if (Array.isArray(value)) return value.map(walkData);
  if (value && typeof value === 'object') {
    var out = {};
    Object.keys(value).forEach(function (k) { out[k] = walkData(value[k]); });
    return out;
  }
  return value;
}
var cdataClean = walkData(cdata);
Object.keys(cdata).forEach(function (k) {
  if (String(cdata[k]) !== String(cdataClean[k])) {
    dirty++;
    console.log('course-data ' + k + ': latex ' + countLatex(String(cdata[k])) + ' -> ' + countLatex(String(cdataClean[k])));
  }
});
if (!CHECK && dataHits.n) writeJson(dataFile, cdataClean);

// --- practice MCQs: duplicate options ------------------------------------
// The model occasionally emits two identical options ("accomodation",
// "accomodation"), which turns the MCQ into a coin flip.
// normalizeQuestions now rejects these at generation time; this pass removes
// the ones already published — both from course-practice.json and from the
// practiceQs array embedded in every lesson page, so the JSON and the pages
// stay in sync without a page regeneration (a regen could revert hand-built
// sections; the embedded array is the only stale part).
function normOptText(o) {
  // Only case, whitespace and dash style are normalised: "(x-3)", "x<2"
  // and "x>2" must stay distinct from their lookalikes.
  return String(o && o.t != null ? o.t : o)
    .toLowerCase()
    .replace(/−|–|—/g, '-')
    .replace(/\s+/g, '');
}
function dupOptions(q) {
  var seen = {};
  var dup = false;
  (q.options || []).forEach(function (o) {
    var n = normOptText(o);
    if (n) { if (seen[n]) dup = true; seen[n] = 1; }
  });
  return dup;
}

var practiceFile = path.join(__dirname, 'course-practice.json');
var cpractice = readJson(practiceFile);
var practiceDirty = false;
Object.keys(cpractice).forEach(function (key) {
  var arr = cpractice[key] || [];
  var kept = arr.filter(function (q) { return !dupOptions(q); });
  if (kept.length !== arr.length) {
    practiceDirty = true;
    dirty++;
    console.log('course-practice ' + key + ': dropped ' + (arr.length - kept.length) + ' duplicate-option question(s)');
    cpractice[key] = kept;
  }
});
if (!CHECK && practiceDirty) writeJson(practiceFile, cpractice);

// Pages embed their questions as `var practiceQs = [...]`; patch any array
// that still carries a duplicate-option question. Every config lesson page is
// scanned because a page may embed questions through a module alias, and the
// JSON may already be clean while an old page still carries the defect.
var examConfigs = readJson(path.join(__dirname, 'exam-configs.json'));
var pagesPatched = 0;
Object.keys(examConfigs).forEach(function (ek) {
  var cfg = examConfigs[ek];
  (cfg.moduleOrder || []).forEach(function (mk) {
    var mod = cfg.modules && cfg.modules[mk];
    if (!mod) return;
    (mod.lessons || []).forEach(function (l) {
      var fp = path.join(ROOT, cfg.dir, 'course', mk, 'lesson-' + l.slug + '.html');
      if (!fs.existsSync(fp)) return;
      var html = fs.readFileSync(fp, 'utf8');
      var m = /var practiceQs = (\[.*\]);/.exec(html);
      if (!m) return;
      var qs;
      try { qs = JSON.parse(m[1]); } catch (e) { return; }
      var keptQs = qs.filter(function (q) { return !dupOptions(q); });
      if (keptQs.length === qs.length) return;
      pagesPatched++;
      dirty++;
      console.log('practiceQs ' + cfg.dir + '/course/' + mk + '/lesson-' + l.slug + '.html: dropped ' + (qs.length - keptQs.length));
      if (!CHECK) {
        var next = html.slice(0, m.index) + 'var practiceQs = ' + JSON.stringify(keptQs) + ';' + html.slice(m.index + m[0].length);
        fs.writeFileSync(fp, next, 'utf8');
      }
    });
  });
});
if (pagesPatched) console.log('course-practice: ' + pagesPatched + ' page(s) ' + (CHECK ? 'need' : 'had') + ' embedded questions patched');

console.log((CHECK ? '[check] ' : '') + 'clean-course-content: ' + dirty + ' entr' + (dirty === 1 ? 'y' : 'ies') +
  (dataHits.n ? ', ' + dataHits.n + ' data string(s)' : '') + (dirty ? ' would change' : ' clean') + (CHECK && dirty ? ' (dirty)' : ''));
if (CHECK && dirty) process.exit(1);
