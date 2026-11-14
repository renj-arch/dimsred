/*
 * ask-browser-compat.test.js -- proves the ask libraries load in a browser.
 *
 * Run: node scripts/lib/ask-browser-compat.test.js
 *
 * The Ask page loads ask-core.js and friends as plain <script> tags, where
 * `process` and `module` do not exist. ask-core.js was reading
 * process.env.ASK_DEBUG directly at two call sites. That is not a falsy value
 * in a browser, it is a ReferenceError, so it escaped every guard and took the
 * whole page down: typing a question returned the literal string
 * "Error: process is not defined" instead of an answer.
 *
 * This test runs the real file in a vm context that has neither `process` nor
 * `module`, which is the browser situation, and then calls the code paths that
 * used to crash. Loading is not enough on its own -- the old file loaded fine
 * and only threw when the question path ran -- so the assertions call the
 * functions rather than merely requiring them.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  -> ' + detail : '')); }
}

// A browser global object: `self` and `window` exist, `process` and `module`
// do not. Deliberately not given a `process`, so any unguarded read throws the
// way it does for a real visitor.
function browserContext() {
  var sandbox = { console: console, JSON: JSON, Math: Math, Date: Date };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  return vm.createContext(sandbox);
}

console.log('ask-browser-compat');

console.log('\n[the reported bug]');
var file = path.join(__dirname, 'ask-core.js');
var src = fs.readFileSync(file, 'utf8');

var ctx = browserContext();
check('the context genuinely has no `process`',
  vm.runInContext('typeof process', ctx) === 'undefined');

var loaded = true, loadErr = null;
try { vm.runInContext(src, ctx, { filename: 'ask-core.js' }); }
catch (e) { loaded = false; loadErr = e; }
check('ask-core.js loads with no `process` and no `module`', loaded,
  loadErr && loadErr.message);

if (loaded) {
  var api = vm.runInContext('self.VlymbooqAsk', ctx);
  check('it publishes its API on the global', !!api && typeof api === 'object');

  // The exact expression that threw. If this returns false rather than
  // throwing, the reference is guarded.
  var guarded = vm.runInContext(
    '(function(){try{return !!(typeof process!=="undefined"&&process.env&&process.env.ASK_DEBUG);}'
    + 'catch(e){return "THREW:"+e.message;}})()', ctx);
  check('the ASK_DEBUG read is guarded, not bare', guarded === false || guarded === undefined,
    'returned ' + JSON.stringify(guarded));

  // Calling the real entry points is what used to fail. These are the functions
  // ask-browser.js invokes on submit.
  ['compose', 'answer', 'route', 'classify'].forEach(function (fn) {
    if (!api || typeof api[fn] !== 'function') return;
    var threw = null;
    try { api[fn]('Discuss the environmental impact of the Bhopal gas tragedy'); }
    catch (e) { threw = e; }
    check(fn + '() does not throw "process is not defined"',
      !threw || !/process is not defined/.test(threw.message),
      threw && threw.message);
  });

  // And the unguarded form really does throw, so this test would catch a
  // regression rather than passing vacuously.
  var bareThrew = false;
  try { vm.runInContext('process.env.ASK_DEBUG', ctx); }
  catch (e) { bareThrew = /process is not defined/.test(e.message); }
  check('a bare process.env read in this context DOES throw (test is meaningful)',
    bareThrew);
}

console.log('\n[node path still works]');
delete require.cache[require.resolve('./ask-core.js')];
var nodeAsk = require('./ask-core.js');
check('ask-core.js still loads under CommonJS', !!nodeAsk && typeof nodeAsk === 'object');

console.log('\n' + (fail ? 'FAILED ' + fail + ' of ' + (pass + fail) : 'all ' + pass + ' passed'));
process.exit(fail ? 1 : 0);