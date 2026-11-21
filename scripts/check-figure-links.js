// Liveness check for the hotlinked figure images.
//
// WHY THIS EXISTS:
// geography-figures.html does not vendor its images. All 40 are <img src> links
// to commons.wikimedia.org (37) and www.pmel.noaa.gov (3), and the file has no
// onerror handler, so a renamed or deleted Commons file renders as a broken image
// with no visible fallback and no build-time complaint.
//
// Nothing caught that. resolve-all-figures.js repairs the SEPARATE subject-figure
// pipeline (data/figure-topics-curated.json -> data/figure-files-auto.json), and
// the geography pack's figure list is inline in build-geography-figures.js, so no
// existing script ever asked whether those URLs still resolve. This one does.
//
// It checks the GENERATED html rather than the builder's source list on purpose:
// the html is what ships, so this reports what a reader actually gets.
//
// FAILURE POLICY (deliberately narrow):
//   404 / 410        -> dead, exits nonzero. Someone must fix the url.
//   403 / 429        -> reported, NOT a failure. Wikimedia returns these to
//                       clients it dislikes, so they usually mean we were
//                       throttled or our UA was rejected, not that the file is
//                       gone. Failing here would make the job flap nightly.
//   timeout / socket -> reported, NOT a failure on its own, because an incomplete
//                       run must not be mistaken for a broken corpus.
//   budget exhausted -> reported as unchecked, exits 0.
//
// So the check fails only on a confirmed dead file, and a flaky network cannot
// turn into a red build.
//
// Usage:
//   node scripts/check-figure-links.js [htmlFile ...] [--json out.json] [--timeout ms]
//
// Exit: 0 all good, 1 at least one confirmed dead file, 2 bad usage.

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var DEFAULT_FILES = ['geography-figures.html', 'geography-diagrams.html'];
var UA = 'dimsred-figure-link-check/1.0 (https://github.com/renj-arch/dimsred; educational build)';
var PER_REQUEST_MS = 12000;
var CONCURRENCY = 4;
var TOTAL_BUDGET_MS = 10 * 60 * 1000;

function parseArgs(argv) {
  var files = [], jsonOut = null, timeout = PER_REQUEST_MS;
  for (var i = 0; i < argv.length; i++) {
    var a = argv[i];
    if (a === '--json') jsonOut = argv[++i];
    else if (a === '--timeout') timeout = parseInt(argv[++i], 10) || PER_REQUEST_MS;
    else if (a === '--help' || a === '-h') return { help: true };
    else files.push(a);
  }
  return { files: files.length ? files : DEFAULT_FILES, jsonOut: jsonOut, timeout: timeout };
}

// Match only real image URLs. The html is minified onto few long lines, so a
// line-oriented grep is useless here.
var IMG_RE = /https?:\/\/[^"'()<>\s\\]+\.(?:jpg|jpeg|png|svg|webp|gif)(?:\?[^"'()<>\s\\]*)?/gi;

function extract(urls, html) {
  var m = html.match(IMG_RE) || [];
  m.forEach(function (u) { urls[u.replace(/[.,;]+$/, '')] = 1; });
}

async function checkOne(url, timeoutMs) {
  var ctl = new AbortController();
  var timer = setTimeout(function () { ctl.abort(); }, timeoutMs);
  var t0 = Date.now();
  try {
    var r = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA, 'Accept': 'image/*,*/*;q=0.8' }
    });
    return { url: url, status: r.status, state: classify(r.status), ms: Date.now() - t0, finalUrl: r.url };
  } catch (e) {
    var aborted = e && (e.name === 'AbortError' || e.name === 'TimeoutError');
    return {
      url: url, status: 0, ms: Date.now() - t0,
      state: aborted ? 'timeout' : 'error',
      error: (e && e.message) || String(e)
    };
  } finally {
    clearTimeout(timer);
  }
}

function classify(status) {
  if (status >= 200 && status < 400) return 'ok';
  if (status === 404 || status === 410) return 'dead';
  if (status === 403 || status === 429) return 'blocked';
  return 'error';
}

async function main() {
  var args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('usage: node scripts/check-figure-links.js [htmlFile ...] [--json out.json] [--timeout ms]');
    return 0;
  }

  var urls = {};
  var scanned = [];
  args.files.forEach(function (f) {
    var p = path.isAbsolute(f) ? f : path.join(ROOT, f);
    if (!fs.existsSync(p)) {
      console.log('skip (not found): ' + f);
      return;
    }
    var before = Object.keys(urls).length;
    extract(urls, fs.readFileSync(p, 'utf8'));
    var found = Object.keys(urls).length - before;
    scanned.push(f + ' (' + found + ' urls)');
    console.log('scanned ' + f + ': ' + found + ' external image urls');
  });
  var list = Object.keys(urls).sort();
  console.log('');
  console.log('distinct external image urls: ' + list.length);
  console.log('');

  if (!list.length) {
    console.log('nothing external to check (fully self-contained pack)');
    return 0;
  }

  var results = [];
  var unchecked = [];
  var deadline = Date.now() + TOTAL_BUDGET_MS;
  var next = 0;

  async function worker() {
    while (next < list.length) {
      if (Date.now() > deadline) { unchecked = list.slice(next); return; }
      var i = next++;
      results[i] = await checkOne(list[i], args.timeout);
      await new Promise(function (r) { setTimeout(r, 60); });
    }
  }

  var workers = [];
  for (var w = 0; w < Math.min(CONCURRENCY, list.length); w++) workers.push(worker());
  await Promise.all(workers);

  var by = { ok: [], dead: [], blocked: [], error: [], timeout: [] };
  results.forEach(function (r) { if (r) by[r.state].push(r); });

  Object.keys(by).forEach(function (k) {
    if (!by[k].length) return;
    console.log('--- ' + k.toUpperCase() + ' (' + by[k].length + ')');
    by[k].forEach(function (r) {
      console.log('   [' + (r.status || '-') + '] ' + r.url + (r.error ? '  (' + r.error + ')' : ''));
    });
    console.log('');
  });
  if (unchecked.length) {
    console.log('--- UNCHECKED (' + unchecked.length + ') -- total budget exhausted, no verdict claimed');
    console.log('');
  }

  var summary = {
    total: list.length,
    ok: by.ok.length,
    dead: by.dead.length,
    blocked: by.blocked.length,
    error: by.error.length,
    timeout: by.timeout.length,
    unchecked: unchecked.length,
    deadUrls: by.dead.map(function (r) { return r.url; }),
    scanned: scanned
  };

  if (args.jsonOut) {
    var jp = path.isAbsolute(args.jsonOut) ? args.jsonOut : path.join(ROOT, args.jsonOut);
    fs.writeFileSync(jp, JSON.stringify(summary, null, 2));
    console.log('wrote ' + jp);
  }

  console.log('summary: ' + JSON.stringify(summary, function (k, v) {
    return k === 'deadUrls' || k === 'scanned' ? undefined : v;
  }));

  if (summary.dead > 0) {
    console.log('');
    console.log('FAILED: ' + summary.dead + ' confirmed dead image url(s). These render as broken');
    console.log('images because geography-figures.html has no onerror fallback. Fix the url in');
    console.log('the FIGURES list in scripts/build-geography-figures.js.');
    return 1;
  }
  if (summary.blocked || summary.error || summary.timeout) {
    console.log('');
    console.log('NOTE: some urls were blocked or unreachable. Not counted as failures -- that is');
    console.log('usually throttling or a blocked user agent, not a missing file. Re-run to confirm.');
  }
  return 0;
}

main().then(function (code) {
  process.exitCode = code;
  if (code === 2) process.exit(2);
}).catch(function (e) {
  console.error('check-figure-links failed: ' + ((e && e.stack) || e));
  process.exitCode = 2;
});