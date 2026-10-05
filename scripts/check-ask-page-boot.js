// Executes ask.html's real inline script and its boot() against DOM stubs.
//
// `node --check` only proves the file parses. It cannot see a ReferenceError from
// an undeclared variable, which is how `askHay = null` survived review: the two
// lines were left behind in boot() when the haystack cache they belonged to was
// removed, the file parsed cleanly, every suite passed, and the live Ask page
// served "Could not load data/ask-index.json (askHay is not defined)" until it
// was noticed in the browser. A syntax pass will never catch that class of bug,
// so the page is actually run here.
//
// boot() is invoked explicitly because the page only calls it from inside the
// fetch callback, which this harness rejects -- without that call the buggy body
// never executes and this check passes on a broken page.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const LIBS = [
  'ask-core', 'ask-qb', 'ask-answer', 'ask-entity-evidence',
  'ask-compose', 'build-ask-qb-buckets-hash', 'ask-browser'
];

const store = {};
function mkEl(id) {
  return {
    id: id, innerHTML: '', textContent: '', value: '', disabled: false,
    addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute() { return null; },
    appendChild() {}, removeChild() {},
    querySelector() { return mkEl(id + '-q'); },
    querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    focus() {}, scrollIntoView() {}
  };
}
function el(id) { return (store[id] = store[id] || mkEl(id)); }

const sandbox = {
  console: console, setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: setInterval, clearInterval: clearInterval,
  fetch: function () { return Promise.reject(new Error('offline in this harness')); },
  requestAnimationFrame: function (fn) { return setTimeout(fn, 0); },
  Promise: Promise, JSON: JSON, Math: Math, Date: Date,
  Object: Object, Array: Array, String: String, Number: Number,
  Boolean: Boolean, Error: Error, RegExp: RegExp, Map: Map, Set: Set,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
  isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat,
  localStorage: { getItem: function () { return null; }, setItem() {}, removeItem() {} },
  location: { href: '', search: '', pathname: '', hash: '' },
  navigator: { userAgent: 'node' }
  // No module/exports on purpose: the UMD wrappers only attach their browser
  // globals when `module` is absent, which is the browser's actual situation.
};
sandbox.document = {
  getElementById: el,
  querySelector: function (s) { return mkEl(String(s)); },
  querySelectorAll: function () { return []; },
  addEventListener() {}, removeEventListener() {},
  createElement: function (t) { return mkEl('new-' + t); },
  createTextNode: function (t) { return { textContent: t }; },
  body: mkEl('body'), head: mkEl('head'), documentElement: mkEl('html')
};
sandbox.window = sandbox;
sandbox.self = sandbox;

const ctx = vm.createContext(sandbox);
vm.runInContext('"use strict";', ctx);

let failures = 0;
function ok(cond, label, detail) {
  if (cond) console.log('  ok    ' + label);
  else { failures++; console.log('  FAIL  ' + label + (detail ? ' -- ' + detail : '')); }
  return cond;
}
function load(src, name) {
  try { vm.runInContext(src, ctx, { filename: name }); return null; }
  catch (e) { return e; }
}

console.log('=== ask.html executes and boots ===');

for (const lib of LIBS) {
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'lib', lib + '.js'), 'utf8');
  // build-ask-qb-buckets-hash.js is CommonJS-only yet ask.html loads it with a
  // plain <script src>, so in a browser that tag throws. It is wrapped in an IIFE
  // so its `module` does not leak into the shared context and flip every later
  // UMD library onto its CommonJS branch.
  const wrapped = lib === 'build-ask-qb-buckets-hash'
    ? '(function(){ var module = { exports: {} };\n' + src + '\n})();'
    : src;
  const e = load(wrapped, lib + '.js');
  if (e) { failures++; console.log('  FAIL  ' + lib + '.js threw on load -- ' + e.message); break; }
}
ok(failures === 0, 'all seven ask libraries load and attach their globals');

const html = fs.readFileSync(path.join(ROOT, 'ask.html'), 'utf8');
const m = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/);
if (!ok(!!m, 'ask.html has an inline script block')) {
  process.exit(1);
}

const inlineErr = load(m[1], 'ask.html:inline');
ok(!inlineErr, 'the inline script runs top to bottom',
  inlineErr ? inlineErr.constructor.name + ': ' + inlineErr.message : '');

if (typeof sandbox.boot === 'function') {
  let bootErr = null;
  try {
    sandbox.boot({ N: 214405, nodes: [], df: {}, titleDf: {}, nodeById: {} },
      { nodesKept: 214405, nodesScanned: 556808, builtAt: '2026-10-02T00:00:00.000Z' });
  } catch (e) { bootErr = e; }
  ok(!bootErr, 'boot() completes without a ReferenceError',
    bootErr ? bootErr.constructor.name + ': ' + bootErr.message : '');
} else {
  ok(false, 'boot() is defined');
}

ok(typeof sandbox.VlymbooqAskBrowser === 'object' ||
   typeof sandbox.VlymbooqAskBrowser === 'function',
   'the retrieval engine reached the page as a global');
ok(typeof sandbox.IDX === 'object' && sandbox.IDX !== null, 'boot() installed the index');

console.log('');
console.log(failures === 0 ? '=== all checks passed ===' : '=== ' + failures + ' FAILURE(S) ===');
process.exit(failures === 0 ? 0 : 1);
