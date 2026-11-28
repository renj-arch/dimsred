'use strict';
// The OpenCode Zen route talks to a CLI the runner installs itself, so neither
// its flags nor its model ids are ours to choose. Two things broke it and both
// are pinned here.
//
// 1. FLAGS. A build whose `run` does not know --standalone or --format prints
//    its usage and exits non-zero. When the route only tried that one shape,
//    EVERY call failed and fell through to the next backend -- one wasted CLI
//    spawn per model call. The route now walks a ladder of shapes and stops at
//    the first that answers.
//
// 2. THE MODEL ID. `opencode/deepseek-v4.1-flash-free#max` was handed to `-m`
//    whole, so the gateway was asked for a model named "...-free#max" and
//    answered `Unexpected server error` on every call. That is a TERMINAL
//    answer, not a usage dump, so the ladder never helped: the id has to be
//    bare, and `#max` is a variant that travels in --variant or nowhere.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

var pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  -> ' + detail : '')); }
}

// A fake opencode binary. Behaviours:
//   legacy -- rejects --standalone and --format, answers prose
//   modern -- accepts every flag, answers a JSON event stream
//   strict -- accepts everything except --variant (its own usage dump), and
//             REFUSES to answer if a '#' ever reaches the model id: that is
//             what Zen's gateway does, and it must never be asked again.
function writeFakeCli(dir, mode) {
  const file = path.join(dir, 'fake-opencode.js');
  const body = [
    '#!/usr/bin/env node',
    "'use strict';",
    "const fs = require('fs');",
    "const args = process.argv.slice(2);",
    "if (process.env.ZEN_TEST_LOG) fs.appendFileSync(process.env.ZEN_TEST_LOG, JSON.stringify(args) + '\\n');",
    "if (args.includes('--version')) { process.stdout.write('2.0.0-yargs\\n'); process.exit(0); }",
    "const mode = " + JSON.stringify(mode) + ";",
    "const usage = function () {",
    "  process.stderr.write('opencode run [message..]\\n run opencode with a message\\n\\nPositionals:\\n  message  message to send [array] [default: []]\\n\\nOptions:\\n  -h, --help  show help [boolean]\\n');",
    "  process.exit(1);",
    "};",
    "if (mode === 'legacy' && (args.includes('--standalone') || args.includes('--format'))) usage();",
    "if (mode === 'strict' && args.includes('--variant')) usage();",
    // The gateway resolves the id before it looks at the key, so a suffixed id
    // is not a credential error -- it is an unknown model.
    "if (args.some(function (a) { return a.indexOf('#') !== -1; })) {",
    "  process.stdout.write(JSON.stringify({ type: 'error', timestamp: 1, error: { name: 'UnknownError', data: { message: 'Unexpected server error. Check server logs for details.', ref: 'err_deadbeef' } } }) + '\\n');",
    "  process.exit(1);",
    "}",
    "if (args.includes('json')) {",
    "  process.stdout.write(JSON.stringify({ type: 'text', part: { text: '<h2>Answer</h2>' + mode } }) + '\\n');",
    "  process.exit(0);",
    "}",
    "process.stdout.write('\\u001b[36mthinking\\u001b[0m\\n<h2>Answer</h2>' + mode + '\\n');",
    "process.exit(0);"
  ].join('\n');
  fs.writeFileSync(file, body);
  // execFile needs the executable bit; a plain write creates 0644 and the spawn
  // fails with EACCES on the runner. The shebang matters too: without it the
  // kernel answers ENOEXEC however the mode is set.
  fs.chmodSync(file, 0o755);
  return file;
}

function loadZen(bin, logFile, model) {
  delete require.cache[require.resolve('./opencode-zen.js')];
  process.env.OPENCODE_ZEN = '1';
  process.env.OPENCODE_API_KEY = 'zen-test-key';
  process.env.OPENCODE_BIN = bin;
  process.env.ZEN_TEST_LOG = logFile;
  if (model) process.env.OPENCODE_ZEN_MODEL = model;
  else delete process.env.OPENCODE_ZEN_MODEL;
  delete process.env.OPENCODE_ZEN_VARIANT;
  return require('./opencode-zen.js');
}

function args(logFile) {
  return fs.readFileSync(logFile, 'utf8').trim().split('\n').map(function (l) { return JSON.parse(l); });
}

function modelArg(argv) {
  return argv[argv.indexOf('-m') + 1];
}

const CLEAN = ['OPENCODE_ZEN', 'OPENCODE_API_KEY', 'OPENCODE_BIN', 'OPENCODE_DATA_DIR', 'ZEN_TEST_LOG',
  'OPENCODE_ZEN_MODEL', 'OPENCODE_ZEN_VARIANT'];

(async function () {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-test-'));
  process.env.OPENCODE_DATA_DIR = path.join(tmp, 'data');

  console.log('CASE 0: the usage text from the failing CI run is recognised');
  {
    // Copied from the Expand Course Lane D log: this is what a yargs-era build
    // prints when it does not know --standalone or --format.
    const fromLog = 'opencode CLI: opencode run [message..] run opencode with a message Positionals: message message to send [array] [default: []] Options: -h, --help show help [boolean] -v, --version show version number [boolean]';
    const mod = require('./opencode-zen.js');
    ok('usage dump detected', mod.isUsageDump(fromLog) === true, 'not detected');
    ok('a quota error is NOT a usage dump', mod.isUsageDump('opencode CLI: HTTP 429 free slots at capacity') === false);
    ok('a network error is NOT a usage dump', mod.isUsageDump('opencode CLI: connect ETIMEDOUT') === false);
    ok('a server refusal is NOT a usage dump', mod.isUsageDump('opencode CLI: UnknownError: Unexpected server error') === false);
    ok('plateau of empty output is not a usage dump', mod.isUsageDump('opencode CLI returned no text') === false);
    const prose = '\u001b[36;1mthinking\u001b[0m\n\u001b[0m<h2>Answer</h2>body text';
    ok('ANSI prose is cleaned and starts at the heading', mod.plainText(prose) === '<h2>Answer</h2>body text', JSON.stringify(mod.plainText(prose)));
  }

  console.log('CASE 0b: the model id is bare and the variant rides in --variant');
  {
    const mod = require('./opencode-zen.js');
    const bare = mod.splitModel('opencode/deepseek-v4.1-flash-free#max');
    ok('splits the suffix off', bare.model === 'opencode/deepseek-v4.1-flash-free' && bare.variant === 'max', JSON.stringify(bare));
    ok('leaves a plain id alone', JSON.stringify(mod.splitModel('opencode/deepseek-v4.1-flash-free')) === JSON.stringify({ model: 'opencode/deepseek-v4.1-flash-free', variant: '' }));
    ok('trims the spaces people paste', JSON.stringify(mod.splitModel('  opencode/x# max ')) === JSON.stringify({ model: 'opencode/x', variant: 'max' }), JSON.stringify(mod.splitModel('  opencode/x# max ')));
    ok('an id starting with # is not a variant', mod.splitModel('#max').model === '#max' && mod.splitModel('#max').variant === '');
    ok('a trailing # is not a variant', mod.splitModel('opencode/x#').variant === '');
    ok('no form carries a # in the model id', mod.FORMS.every(function (f) { return modelArg(f).indexOf('#') === -1; }), JSON.stringify(mod.FORMS));
    ok('every form ends in -m <model> (prompt is appended)', mod.FORMS.every(function (f) { return modelArg(f) === mod.MODEL; }), JSON.stringify(mod.FORMS));
    ok('the default build has a two-form ladder', mod.FORMS.length === 2, String(mod.FORMS.length));
  }

  if (process.platform === 'win32') {
    // execFile cannot run a shebang script on Windows, so the spawn cases run in
    // CI (Linux) only. The decision logic above is platform-independent.
    console.log('CASE 1-6: skipped on win32 (shebang binaries need POSIX)');
    fs.rmSync(tmp, { recursive: true, force: true });
    CLEAN.forEach(function (k) { delete process.env[k]; });
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }

  console.log('CASE 1: a build that rejects --standalone and --format still answers');
  {
    const log = path.join(tmp, 'legacy.log');
    const bin = writeFakeCli(tmp, 'legacy');
    const zen = loadZen(bin, log);
    const res = await zen.run('write a lesson');
    const attempts = args(log);
    ok('returns the CLI answer', /modern|legacy/.test(res.text) && res.text.indexOf('<h2>Answer</h2>') !== -1, res.text.slice(0, 80));
    ok('fell back to the flag-less form', attempts.length >= 2 && attempts[attempts.length - 1].indexOf('--standalone') === -1 && attempts[attempts.length - 1].indexOf('--format') === -1,
      JSON.stringify(attempts));
    ok('the prompt survived every attempt', attempts.every(function (a) { return a.indexOf('write a lesson') !== -1; }), JSON.stringify(attempts));
  }

  console.log('CASE 2: the build the installer ships today is answered first try');
  {
    const log = path.join(tmp, 'modern.log');
    const bin = writeFakeCli(tmp, 'modern');
    const zen = loadZen(bin, log);
    const res = await zen.run('write a lesson');
    const attempts = args(log);
    ok('returns the CLI answer', res.text.indexOf('modern') !== -1, res.text.slice(0, 60));
    ok('exactly one attempt', attempts.length === 1, JSON.stringify(attempts));
    ok('used --format json', attempts[0].indexOf('--format') !== -1 && attempts[0].indexOf('json') !== -1, JSON.stringify(attempts[0]));
    ok('did not ask for --standalone', attempts[0].indexOf('--standalone') === -1, JSON.stringify(attempts[0]));
    ok('sent the bare model id', modelArg(attempts[0]) === 'opencode/deepseek-v4.1-flash-free', JSON.stringify(attempts[0]));
  }

  console.log('CASE 3: a real error is not retried');
  {
    const dir = path.join(tmp, 'quota');
    fs.mkdirSync(dir, { recursive: true });
    const bin = path.join(dir, 'quota-cli.js');
    fs.writeFileSync(bin, [
      '#!/usr/bin/env node',
      "'use strict';",
      "const fs = require('fs');",
      "if (process.env.ZEN_TEST_LOG) fs.appendFileSync(process.env.ZEN_TEST_LOG, JSON.stringify(process.argv.slice(2)) + '\\n');",
      "if (process.argv.slice(2).includes('--version')) { process.stdout.write('2.0.0\\n'); process.exit(0); }",
      "process.stderr.write('HTTP 429 free slots at capacity\\n');",
      "process.exit(1);"
    ].join('\n'));
    fs.chmodSync(bin, 0o755);
    const log = path.join(dir, 'quota.log');
    const zen = loadZen(bin, log);
    let msg = '';
    try { await zen.run('x'); } catch (e) { msg = e.message; }
    const attempts = fs.existsSync(log) ? args(log) : [];
    ok('surfaces the quota error', /429/.test(msg), msg);
    // Terminal means terminal: one spawn, no version probe, no retry storm. The
    // route must not spend the ladder's spawns on an outage.
    ok('one attempt only, no version probe', attempts.length === 1, String(attempts.length));
  }

  console.log('CASE 4: a build that rejects every form names its version and its model');
  {
    const dir = path.join(tmp, 'allforms');
    fs.mkdirSync(dir, { recursive: true });
    const bin = path.join(dir, 'yargs-cli.js');
    fs.writeFileSync(bin, [
      '#!/usr/bin/env node',
      "'use strict';",
      "const fs = require('fs');",
      "const args = process.argv.slice(2);",
      "if (process.env.ZEN_TEST_LOG) fs.appendFileSync(process.env.ZEN_TEST_LOG, JSON.stringify(args) + '\\n');",
      "if (args.includes('--version')) { process.stdout.write('0.9.9-yargs\\n'); process.exit(0); }",
      "process.stderr.write('run opencode with a message Positionals: message [array] [default: []] Options: -h, --help show help [boolean]\\n');",
      "process.exit(1);"
    ].join('\n'));
    fs.chmodSync(bin, 0o755);
    const log = path.join(dir, 'allforms.log');
    const zen = loadZen(bin, log);
    let msg = '';
    try { await zen.run('x'); } catch (e) { msg = e.message; }
    const attempts = args(log);
    // Every form once, then one --version probe to say which build this was.
    ok('walked every form exactly once, then asked the version', attempts.length === zen.FORMS.length + 1, String(attempts.length));
    ok('in the order forms() builds them', zen.FORMS.every(function (f, i) {
      return f.concat(['x']).join(' ') === attempts[i].join(' ');
    }), JSON.stringify(attempts));
    ok('named the model it asked for', /\[model opencode\/deepseek-v4\.1-flash-free\]/.test(msg), msg);
    ok('named the CLI version', /\[cli 0\.9\.9-yargs\]/.test(msg), msg);
    ok('kept the opening error', /Positionals|show help/.test(msg), msg);
  }

  console.log('CASE 5: model#variant becomes --variant, never part of the id');
  {
    const log = path.join(tmp, 'strict.log');
    const bin = writeFakeCli(tmp, 'strict');
    // The build the installer ships does not know --variant, so this also pins
    // the fallback: an unknown variant flag must not cost the call.
    const zen = loadZen(bin, log, 'opencode/deepseek-v4.1-flash-free#max');
    ok('variant split off the id', zen.MODEL === 'opencode/deepseek-v4.1-flash-free' && zen.VARIANT === 'max', zen.MODEL + ' / ' + zen.VARIANT);
    const res = await zen.run('write a lesson');
    const attempts = args(log);
    ok('still answers without --variant', /strict/.test(res.text), res.text.slice(0, 60));
    ok('tried --variant first', attempts.length > 1 && attempts[0].indexOf('--variant') !== -1, JSON.stringify(attempts[0]));
    ok('never sent a # in the model id', attempts.every(function (a) { return modelArg(a).indexOf('#') === -1; }), JSON.stringify(attempts));
    ok('the prompt survived the variant-flag rejection', res.text.indexOf('<h2>Answer</h2>') === 0, res.text.slice(0, 40));
  }

  console.log('CASE 6: a refusal from the gateway says why, not "Command failed"');
  {
    const dir = path.join(tmp, 'refusal');
    fs.mkdirSync(dir, { recursive: true });
    const bin = path.join(dir, 'refusing-cli.js');
    fs.writeFileSync(bin, [
      '#!/usr/bin/env node',
      "'use strict';",
      "const fs = require('fs');",
      "if (process.env.ZEN_TEST_LOG) fs.appendFileSync(process.env.ZEN_TEST_LOG, 'attempt\\n');",
      "if (process.argv.slice(2).includes('--version')) { process.stdout.write('2.0.0\\n'); process.exit(0); }",
      "process.stdout.write(JSON.stringify({ type: 'error', timestamp: 1, error: { name: 'UnknownError', data: { message: 'Unexpected server error. Check server logs for details.', ref: 'err_deadbeef' } } }) + '\\n');",
      "process.exit(1);"
    ].join('\n'));
    fs.chmodSync(bin, 0o755);
    const log = path.join(dir, 'refusal.log');
    const zen = loadZen(bin, log);
    let msg = '';
    try { await zen.run('x'); } catch (e) { msg = e.message; }
    const attempts = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').length : 0;
    ok('surfaces the event message', /Unexpected server error/.test(msg), msg);
    ok('keeps the error ref', /err_deadbeef/.test(msg), msg);
    // An answer from the server is not a shape complaint; the ladder must not
    // spend more spawns on it.
    ok('does not walk the ladder', attempts === 1, String(attempts));
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  CLEAN.forEach(function (k) { delete process.env[k]; });

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
