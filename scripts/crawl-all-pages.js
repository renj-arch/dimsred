#!/usr/bin/env node
'use strict';
// Full-site runtime crawl. The audit proves every page parses and every link
// resolves; this proves every page actually loads, runs its scripts, and does
// not open with an overlay covering the content.
//
// The 20-page browser-test suite is the deep interaction pass. This crawl is
// the breadth pass: all tracked HTML files, one navigation each, with
// pageerror / console / HTTP / image / blank-content / blocking-overlay
// checks. It is deliberately cheaper per page (no clicking) so 1,250 pages
// finish in minutes, not hours.
//
//   node scripts/crawl-all-pages.js
//   CRAWL_CONCURRENCY=6 CRAWL_STRICT=1 node scripts/crawl-all-pages.js
//
// Output: data/all-pages-crawl.json
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASE = process.env.SITE_URL || 'http://127.0.0.1:8080';
const CONCURRENCY = Math.max(1, parseInt(process.env.CRAWL_CONCURRENCY || '5', 10));
const PAGE_TIMEOUT = Math.max(5000, parseInt(process.env.CRAWL_TIMEOUT || '25000', 10));
const STRICT = process.env.CRAWL_STRICT === '1';

// Assets a page may request without the deployment being broken: optional
// relation stores and the 9 GB question corpus excluded from the CI tree.
const OPTIONAL = [
  /\/data\/relations\.json(\?|$)/,
  /\/data\/questions\//,
  /\/data\/ask-qb\/(?:bucket|phrase)\//
];

function optional(url) {
  return OPTIONAL.some(function (re) { return re.test(url); });
}

function local(url) {
  return url.indexOf(BASE) === 0 || url.indexOf('http://127.0.0.1:8080') === 0;
}

const files = cp.execFileSync('git', ['ls-files', '*.html'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split(/\r?\n/).filter(Boolean).sort();

function emptyResult(file) {
  return {
    file: file,
    status: 0,
    ok: false,
    errors: [],
    console: [],
    requests: [],
    images: [],
    overlay: null,
    textLength: 0,
    durationMs: 0
  };
}

async function diagnose(page, result) {
  return page.evaluate(function () {
    var out = { overlay: null, images: [], textLength: 0, overflow: 0 };

    var text = (document.body && document.body.innerText ? document.body.innerText : '').trim();
    out.textLength = text.length;
    out.overflow = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);

    Array.prototype.forEach.call(document.images || [], function (img) {
      if (img.complete && img.naturalWidth === 0 && !/^data:/i.test(img.currentSrc || img.src || '')) {
        out.images.push(String(img.currentSrc || img.src || '').slice(0, 180));
      }
    });

    // A modal that forgot display:none covers the centre of the viewport from
    // first paint. Look at the top element at three points, then walk up to
    // the largest positioned ancestor and require it to cover half the screen.
    var w = window.innerWidth, h = window.innerHeight;
    var points = [[w / 2, h / 2], [w / 4, h / 4], [w * 3 / 4, h * 3 / 4]];
    for (var i = 0; i < points.length && !out.overlay; i++) {
      var stack = document.elementsFromPoint(points[i][0], points[i][1]);
      for (var j = 0; j < stack.length; j++) {
        var el = stack[j];
        if (!el || el === document.body || el === document.documentElement) continue;
        if (el.closest && el.closest('nav, header, footer')) continue;
        var s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) continue;
        if (s.position !== 'fixed' && s.position !== 'absolute') continue;
        var r = el.getBoundingClientRect();
        if (r.width < w * 0.5 || r.height < h * 0.5) continue;
        if (r.bottom < h * 0.5 || r.top > h * 0.5) continue;
        var z = parseInt(s.zIndex, 10);
        if (!(z >= 50)) continue;
        out.overlay = {
          tag: el.tagName,
          id: el.id || '',
          cls: String(el.className || '').slice(0, 160),
          z: z,
          rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]
        };
        break;
      }
    }
    return out;
  });
}

async function crawlOne(browser, file) {
  const result = emptyResult(file);
  const url = BASE + '/' + file;
  const started = Date.now();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  page.on('pageerror', function (err) {
    result.errors.push(String(err && err.message || err).slice(0, 300));
  });
  page.on('console', function (msg) {
    if (msg.type() !== 'error') return;
    const loc = msg.location && msg.location();
    if (loc && loc.url && !local(loc.url) && !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(loc.url)) return;
    result.console.push(String(msg.text() || '').slice(0, 300));
  });
  page.on('requestfailed', function (req) {
    const u = req.url();
    if (!local(u) || optional(u)) return;
    result.requests.push({ url: u, error: String(req.failure() && req.failure().errorText || 'failed').slice(0, 120) });
  });
  page.on('response', function (res) {
    const u = res.url();
    if (!local(u) || optional(u)) return;
    if (res.status() >= 400) result.requests.push({ url: u, status: res.status() });
  });

  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    result.status = resp ? resp.status() : 0;
    // Let deferred loaders finish; data-driven pages fetch after DOMContentLoaded.
    await page.waitForTimeout(700);
    const d = await diagnose(page, result);
    result.overlay = d.overlay;
    result.images = d.images;
    result.textLength = d.textLength;
    result.overflow = d.overflow;
  } catch (e) {
    result.errors.push('navigation: ' + String(e && e.message || e).slice(0, 300));
  } finally {
    await context.close().catch(function () {});
  }

  result.durationMs = Date.now() - started;
  result.ok = result.status === 200 && result.errors.length === 0 &&
    result.console.length === 0 && result.requests.length === 0 &&
    result.images.length === 0 && !result.overlay && result.textLength >= 40;
  return result;
}

(async function main() {
  if (!files.length) {
    console.error('No HTML files found.');
    process.exit(2);
  }
  console.log('Crawling ' + files.length + ' pages with concurrency ' + CONCURRENCY + ' against ' + BASE);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const results = new Array(files.length);
  let next = 0, done = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= files.length) return;
      results[i] = await crawlOne(browser, files[i]);
      done++;
      if (done % 25 === 0 || done === files.length) {
        console.log('  ' + done + '/' + files.length + ' pages');
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await browser.close();

  const failed = results.filter(function (r) { return !r.ok; });
  const summary = {
    crawledAt: new Date().toISOString(),
    base: BASE,
    pages: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    pageErrors: results.reduce(function (n, r) { return n + r.errors.length; }, 0),
    consoleErrors: results.reduce(function (n, r) { return n + r.console.length; }, 0),
    failedRequests: results.reduce(function (n, r) { return n + r.requests.length; }, 0),
    brokenImages: results.reduce(function (n, r) { return n + r.images.length; }, 0),
    overlays: results.filter(function (r) { return r.overlay; }).length,
    blankPages: results.filter(function (r) { return r.textLength < 40; }).length
  };

  const out = { summary: summary, failures: failed, pages: results };
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'all-pages-crawl.json'), JSON.stringify(out, null, 2));

  console.log('\n=== All-page crawl ===');
  console.log('Pages: ' + results.length + ' | Passed: ' + summary.passed + ' | Failed: ' + summary.failed);
  console.log('Page errors: ' + summary.pageErrors + ' | Console errors: ' + summary.consoleErrors +
    ' | Failed requests: ' + summary.failedRequests + ' | Broken images: ' + summary.brokenImages +
    ' | Overlays: ' + summary.overlays + ' | Blank: ' + summary.blankPages);
  console.log('Output: data/all-pages-crawl.json');

  const byFile = failed.slice(0, 40);
  if (byFile.length) {
    console.log('\nFirst failures:');
    byFile.forEach(function (r) {
      const why = r.errors[0] || r.console[0] || (r.requests[0] && (r.requests[0].status || r.requests[0].error)) ||
        (r.overlay && ('overlay ' + (r.overlay.id || r.overlay.cls || r.overlay.tag))) ||
        (r.textLength < 40 && 'blank') || ('HTTP ' + r.status);
      console.log('  ' + r.file + ' — ' + String(why).slice(0, 140));
    });
    if (failed.length > byFile.length) console.log('  ... ' + (failed.length - byFile.length) + ' more in the JSON');
  }

  process.exit(STRICT && failed.length ? 1 : 0);
})().catch(function (e) {
  console.error(e && e.stack || e);
  process.exit(2);
});
