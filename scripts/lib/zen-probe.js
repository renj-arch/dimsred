'use strict';
// One real call through the OpenCode Zen route, in the shape a lane makes it.
//
// The route is invisible from the outside: hosted.js catches every failure and
// says "OpenCode Zen failed (<message>) - trying the next backend", so a route
// that has never once answered looks exactly like a route that is unlucky. This
// probe spends one call to find out which it is, and prints the pieces needed to
// tell the failure modes apart:
//
//   [cli 1.19.5]              which build the installer gave the runner
//   Invalid credential       the gateway resolved the model id (401)
//   Unexpected server error  the gateway did not  (a suffixed / invented id)
//   usage dump               the build does not know a flag in the ladder
//   no answer before 900s    the build is waiting on a TTY, not a quota
//
// Run it with .github/workflows/zen-probe.yml (workflow_dispatch only); it is a
// diagnostic, never a scheduled lane.
const { execFileSync } = require('child_process');
const zen = require('./opencode-zen');

function cliVersion() {
  try {
    return String(execFileSync(process.env.OPENCODE_BIN || 'opencode', ['--version'], {
      encoding: 'utf8', timeout: 30000
    })).trim();
  } catch (e) {
    return 'unavailable (' + String(e.message || e).split('\n')[0].slice(0, 120) + ')';
  }
}

(async function () {
  console.log('node      ' + process.version + '  ' + process.platform + '/' + process.arch);
  console.log('cli       ' + cliVersion());
  console.log('model     ' + zen.MODEL + (zen.VARIANT ? '  (variant ' + zen.VARIANT + ')' : '  (no variant)'));
  console.log('forms     ' + zen.FORMS.length + '  ' + zen.FORMS.map(function (f) { return f.join(' '); }).join('  |  '));
  console.log('key set   ' + (zen.KEY ? 'yes, ' + zen.KEY.length + ' chars' : 'NO'));
  console.log('enabled   ' + zen.ENABLED);
  console.log('auth file ' + zen.authPath());
  console.log('');

  if (!zen.ENABLED) { console.log('::error::OPENCODE_ZEN is not 1, so the route is disabled'); process.exit(1); }
  if (!zen.KEY) { console.log('::error::OPENCODE_API_KEY is not set'); process.exit(1); }

  const started = Date.now();
  let res;
  try {
    // Two sentences the model has to read: a prompt it can answer from nothing
    // is not evidence that the route works for a lesson body.
    res = await zen.run('Reply with exactly this line and nothing else: ZEN OK');
  } catch (e) {
    console.log('FAILED after ' + (Date.now() - started) + 'ms');
    console.log('  ' + e.message);
    console.log('::error::OpenCode Zen route did not answer - ' + e.message.slice(0, 200));
    process.exit(1);
  }

  const ms = Date.now() - started;
  console.log('ANSWERED in ' + ms + 'ms  (' + res.text.length + ' chars, httpCode ' + res.httpCode + ')');
  console.log('--- head ---');
  console.log(res.text.slice(0, 400));
  if (res.text.length > 400) {
    console.log('--- tail ---');
    console.log(res.text.slice(-200));
  }
  if (res.text.length >= 400 && res.text.indexOf('<h2') !== 0 && res.text.indexOf('<h3') !== 0) {
    console.log('::warning::answer does not start at a heading - parseEvents may have picked up a preamble');
  }
  if (!/ZEN OK/.test(res.text)) {
    console.log('::warning::answered, but not with the requested line - check that the prompt reaches the model');
  }
})();
