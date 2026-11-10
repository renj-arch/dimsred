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
    var punctOk = /[.!?…:;,>"'’”]/.test(last);
    var parenOk = (last === ')' || last === ']') && parens === 0 && dollars % 2 === 0;
    if (punctOk || parenOk) { s = s + suffix; break; }
    // Dangling fragment: cut back to the last sentence end inside it.
    var cut = -1;
    var res = [/[.!?…]/g, /[,;:]/g];
    for (var r = 0; r < res.length; r++) {
      var mm; var lastIdx = -1;
      res[r].lastIndex = 0;
      while ((mm = res[r].exec(frag)) !== null) lastIdx = mm.index;
      if (lastIdx !== -1 && frag.length - lastIdx <= 160) { cut = lastIdx + 1; break; }
    }
    if (cut === -1) cut = 0; // no boundary: drop the whole fragment
    s = s.slice(0, (gt === -1 ? 0 : gt + 1 + off) + cut).replace(/<br\s*\/?>\s*$/, '');
  }
  return s;
}

function cleanAddonHtml(key, html) {
  var s = String(html || '');
  ADDON_FIXES.forEach(function (f) {
    if (f[0] === key) s = s.replace(f[1], f[2]);
  });
  // Malformed nested closers the model writes when cut off: </h</h3>, </li</li>
  s = s.replace(/<\/([a-zA-Z][a-zA-Z0-9]*)<\/([a-zA-Z][a-zA-Z0-9]*)>/g, '</$2>');
  s = plainMath(s);
  s = trimDangling(s);
  s = repair.balance(repair.stripAttrs(s)).trim();
  return s;
}

function writeJson(file, obj) {
  // The repo stores these files with CRLF and 2-space indent; keep that.
  var out = JSON.stringify(obj, null, 2).replace(/\n/g, '\r\n') + '\r\n';
  fs.writeFileSync(file, out, 'utf8');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

var dirty = 0;

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
  if (!CHECK) entry.html = clean;
});
if (!CHECK && dirty) writeJson(addonsFile, addons);

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

console.log((CHECK ? '[check] ' : '') + 'clean-course-content: ' + dirty + ' entr' + (dirty === 1 ? 'y' : 'ies') +
  (dataHits.n ? ', ' + dataHits.n + ' data string(s)' : '') + (dirty ? ' would change' : ' clean') + (CHECK && dirty ? ' (dirty)' : ''));
if (CHECK && dirty) process.exit(1);
