'use strict';
// The OpenCode Zen route talks to a CLI the runner installs itself, so its
// flags are not ours to choose. A build whose `run` does not know --standalone
// or --format prints its usage and exits non-zero; when the route only tried
// that one form, EVERY call failed and fell through to the next backend, one
// wasted CLI spawn per model call. These tests pin the fallback.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

var pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  -> ' + detail : '')); }
}

// A fake opencode binary. Behaves like the yargs-era build unless ASKED to
// behave like a modern one.
function writeFakeCli(dir, mode) {
  const file = path.join(dir, 'fake-opencode.js');
  const body = [
    "'use strict';",
    "const fs = require('fs');",
    "const args = process.argv.slice(2);",
    "if (process.env.ZEN_TEST_LOG) fs.appendFileSync(process.env.ZEN_TEST_LOG, JSON.stringify(args) + '\\n');",
    "if (args.includes('--version')) { process.stdout.write('2.0.0-yargs\\n'); process.exit(0); }",
    "const modern = " + JSON.stringify(mode === 'modern') + ";",
    "if (!modern && (args.includes('--standalone') || args.includes('--format'))) {",
    "  process.stderr.write('run opencode with a message\\n\\nPositionals:\\n  message  message to send [array] [default: []]\\n\\nOptions:\\n  -h, --help  show help [boolean]\\n');",
    "  process.exit(1);",
    "}",
    // A yargs build has no --format json, so it answers with prose.
    "if (modern) { process.stdout.write(JSON.stringify({ type: 'text', part: { text: '<h2>Answer</h2>modern' } }) + '\\n'); }",
    "else { process.stdout.write('\\u001b[36mthinking\\u001b[0m\\n<h2>Answer</h2>legacy\\n'); }",
    "process.exit(0);"
  ].join('\n');
  fs.writeFileSync(file, body);
  return file;
}

function loadZen(bin, logFile) {
  delete require.cache[require.resolve('./opencode-zen.js')];
  process.env.OPENCODE_ZEN = '1';
  process.env.OPENCODE_API_KEY = 'zen-test-key';
  process.env.OPENCODE_BIN = bin;
  process.env.ZEN_TEST_LOG = logFile;
  return require('./opencode-zen.js');
}

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
    ok('plateau of empty output is not a usage dump', mod.isUsageDump('opencode CLI returned no text') === false);
    const prose = '\u001b[36;1mthinking\u001b[0m\n\u001b[0m<h2>Answer</h2>body text';
    ok('ANSI prose is cleaned and starts at the heading', mod.plainText(prose) === '<h2>Answer</h2>body text', JSON.stringify(mod.plainText(prose)));
  }

  if (process.platform === 'win32') {
    // execFile cannot run a shebang script on Windows, so the spawn cases run in
    // CI (Linux) only. The decision logic above is platform-independent.
    console.log('CASE 1-3: skipped on win32 (shebang binaries need POSIX)');
    fs.rmSync(tmp, { recursive: true, force: true });
    ['OPENCODE_ZEN', 'OPENCODE_API_KEY', 'OPENCODE_BIN', 'OPENCODE_DATA_DIR', 'ZEN_TEST_LOG'].forEach(function (k) { delete process.env[k]; });
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }

  console.log('CASE 1: a build that rejects --standalone and --format still answers');
  {
    const log = path.join(tmp, 'legacy.log');
    const bin = writeFakeCli(tmp, 'legacy');
    const zen = loadZen(bin, log);
    const res = await zen.run('write a lesson');
    const attempts = fs.readFileSync(log, 'utf8').trim().split('\n').map(function (l) { return JSON.parse(l); });
    ok('returns the CLI answer', /modern|legacy/.test(res.text) && res.text.indexOf('<h2>Answer</h2>') !== -1, res.text.slice(0, 80));
    ok('fell back to the flag-less form', attempts.length >= 2 && attempts[attempts.length - 1].indexOf('--standalone') === -1 && attempts[attempts.length - 1].indexOf('--format') === -1,
      JSON.stringify(attempts));
    ok('the prompt survived every attempt', attempts.every(function (a) { return a.indexOf('write a lesson') !== -1; }), JSON.stringify(attempts));
  }

  console.log('CASE 2: a modern build is answered on the first attempt');
  {
    const log = path.join(tmp, 'modern.log');
    const bin = writeFakeCli(tmp, 'modern');
    const zen = loadZen(bin, log);
    const res = await zen.run('write a lesson');
    const attempts = fs.readFileSync(log, 'utf8').trim().split('\n').map(function (l) { return JSON.parse(l); });
    ok('returns the CLI answer', res.text.indexOf('modern') !== -1, res.text.slice(0, 60));
    ok('exactly one attempt', attempts.length === 1, JSON.stringify(attempts));
    ok('used --standalone --format json', attempts[0].indexOf('--standalone') !== -1 && attempts[0].indexOf('json') !== -1, JSON.stringify(attempts[0]));
  }

  console.log('CASE 3: a real error is not retried');
  {
    const dir = path.join(tmp, 'quota');
    fs.mkdirSync(dir, { recursive: true });
    const bin = path.join(dir, 'quota-cli.js');
    fs.writeFileSync(bin, [
      "'use strict';",
      "const fs = require('fs');",
      "if (process.env.ZEN_TEST_LOG) fs.appendFileSync(process.env.ZEN_TEST_LOG, 'attempt\\n');",
      "if (process.argv.slice(2).includes('--version')) { process.stdout.write('2.0.0\\n'); process.exit(0); }",
      "process.stderr.write('HTTP 429 free slots at capacity\\n');",
      "process.exit(1);"
    ].join('\n'));
    const log = path.join(dir, 'quota.log');
    const zen = loadZen(bin, log);
    let msg = '';
    try { await zen.run('x'); } catch (e) { msg = e.message; }
    const attempts = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').length : 0;
    ok('surfaces the quota error', /429/.test(msg), msg);
    ok('tried the form once, then asked for the version', attempts === 2, String(attempts));
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  ['OPENCODE_ZEN', 'OPENCODE_API_KEY', 'OPENCODE_BIN', 'OPENCODE_DATA_DIR', 'ZEN_TEST_LOG'].forEach(function (k) { delete process.env[k]; });

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();