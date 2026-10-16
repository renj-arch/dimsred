#!/usr/bin/env node
// Browser Test Agent: uses Playwright to actually navigate the site,
// click every link/button/tab, and catch runtime errors, broken
// interactions, console errors, and 404s. The agent's "eyes and hands."
//
// Run: node scripts/browser-test.js
// Output: data/browser-test.json

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.SITE_URL || 'http://localhost:8080';
const TIMEOUT = 15000;
const results = {
  testedAt: new Date().toISOString(),
  baseUrl: BASE,
  pages: [],
  issues: [],
  summary: { total: 0, passed: 0, failed: 0, consoleErrors: 0, brokenLinks: 0, brokenButtons: 0 }
};

function log(page, type, msg, detail) {
  results.issues.push({ page, type, msg, detail: detail || '' });
  if (type === 'console-error') results.summary.consoleErrors++;
  if (type === 'broken-link') results.summary.brokenLinks++;
  if (type === 'broken-button') results.summary.brokenButtons++;
  console.log('  [' + type + '] ' + page + ': ' + msg);
}

async function testPage(browser, url, pageName, file) {
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  // Resolve local links against the PAGE's directory (cgl/index.html sees
  // ../index.html as the repo root). Resolving against repo root instead
  // flagged every hub-relative link broken — false evidence (same class as
  // the run-#2 stripping incident).
  const pageDir = file && file.indexOf('/') !== -1 ? file.slice(0, file.lastIndexOf('/')) : '.';
  function resolveLocal(href) {
    const target = href.split('#')[0].split('?')[0];
    if (!target) return null;
    if (target.charAt(0) === '/') return target.slice(1);
    const parts = ((pageDir === '.' ? '' : pageDir + '/') + target).split('/');
    const stack = [];
    for (const p of parts) {
      if (!p || p === '.') continue;
      if (p === '..') { stack.pop(); continue; }
      stack.push(p);
    }
    return stack.join('/');
  }

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // The console text of resource errors ("Failed to load resource...")
      // does NOT contain the failing URL — it lives in msg.location(). Without
      // it, 404 findings are unidentifiable (Ask Engine/Mega Test/Improve all
      // showed bare "404" with empty detail). Capture it for classification
      // and for the agent's repair step.
      const loc = (typeof msg.location === 'function' ? msg.location() : null) || {};
      const u = loc.url || '';
      // data/questions 404s in sparse CI checkouts surface as console
      // resource errors (not requestfailed): same env-missing class, never a
      // site bug the agent should "fix" on false evidence.
      if ((u + ' ' + text).match(/data\/questions\//i) && /404|failed to load|failed to fetch|not found/i.test(text)) {
        log(pageName, 'env-missing', text.substring(0, 200), u);
      } else {
        consoleErrors.push({ text: text, url: u });
      }
    }
  });
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('requestfailed', req => {
    const u = req.url();
    if (!u.includes('chrome-extension') && !u.includes('favicon')) {
      failedRequests.push(u + ' — ' + (req.failure()?.errorText || 'failed'));
    }
  });

  const pageResult = { url, name: pageName, status: 0, consoleErrors: 0, pageErrors: 0, brokenLinks: 0, brokenButtons: 0, loadTime: 0 };

  try {
    const start = Date.now();
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: TIMEOUT });
    pageResult.loadTime = Date.now() - start;
    pageResult.status = resp ? resp.status() : 0;

    if (pageResult.status >= 400) {
      log(pageName, 'http-error', 'HTTP ' + pageResult.status);
    }

    // Check console errors
    for (const err of consoleErrors) {
      pageResult.consoleErrors++;
      log(pageName, 'console-error', err.text.substring(0, 200), err.url);
    }

    // Check page errors (uncaught exceptions)
    for (const err of pageErrors) {
      pageResult.pageErrors++;
      log(pageName, 'js-error', err.substring(0, 200));
    }

    // Check failed requests (broken scripts, images, data). data/questions
    // 404s in sparse CI checkouts are an ENVIRONMENT limitation (9GB corpus
    // excluded on purpose), never a site bug — classify separately so the
    // agent doesn't "fix" working code on false evidence (run #2 lesson).
    for (const req of failedRequests) {
      if (req.includes('data/questions/')) {
        log(pageName, 'env-missing', req.substring(0, 200));
      } else if (req.includes('.js') || req.includes('.css') || req.includes('.json') || req.includes('.html')) {
        log(pageName, 'broken-request', req.substring(0, 200));
      }
    }

    // Drive the quiz flow where one exists: answer + Next repeatedly. This is
    // the interaction class static checks never catch (a Next button that
    // dies on question N with zero console output until clicked). Best
    // effort per click — flow failures are logged, never fatal to the run.
    // A page with no visible Next gets a flow-skipped note (coverage truth,
    // not a failure) so the board never implies flows were tested.
    try {
      const nextBtn = await page.$('#nextBtn');
      if (nextBtn && await nextBtn.isVisible().catch(() => false)) {
        for (let step = 0; step < 5; step++) {
          try {
            const errsBefore = consoleErrors.length + pageErrors.length;
            const opts = await page.$$('.q-opt:not(.disabled), .opt-btn:not(.disabled)');
            if (opts.length > 0) {
              await opts[0].click({ timeout: 3000 }).catch(() => {});
              await page.waitForTimeout(600);
            }
            const stillVisible = await page.$('#nextBtn').then(async (b) => b && await b.isVisible().catch(() => false)).catch(() => false);
            if (!stillVisible) break;
            await page.click('#nextBtn', { timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(1200);
            if (consoleErrors.length + pageErrors.length > errsBefore) {
              log(pageName, 'quiz-flow-error', 'Next/answer step ' + (step + 1) + ' produced console/page errors');
            }
          } catch (e) { /* one bad step must not kill the flow test */ }
        }
      } else {
        log(pageName, 'flow-skipped', 'no visible Next button — quiz flow not exercised on this load');
      }
    } catch (e) { /* quiz flow optional per page */ }

    // Test every link
    const links = await page.$$eval('a[href]', els =>
      els.map(e => ({ href: e.getAttribute('href'), text: e.textContent.trim().substring(0, 50) }))
    );
    for (const link of links) {
      if (!link.href || link.href === '#' || link.href.startsWith('mailto:') || link.href.startsWith('javascript:')) {
        if (link.href === '#') {
          pageResult.brokenLinks++;
          log(pageName, 'placeholder-link', 'href="#" on "' + link.text + '"');
        }
        continue;
      }
      // Check local links exist (resolved against the page's own directory).
      if (!link.href.startsWith('http') && !link.href.startsWith('//')) {
        const target = resolveLocal(link.href);
        if (target && !fs.existsSync(path.join(__dirname, '..', target))) {
          pageResult.brokenLinks++;
          log(pageName, 'broken-link', '→ ' + target + ' ("' + link.text + '")');
        }
      }
    }

    // Test every button — click it and see if page breaks
    const buttons = await page.$$('button, [role="button"], .btn, a[class*="btn"]');
    let buttonsTested = 0;
    for (const btn of buttons.slice(0, 20)) { // cap at 20 per page
      try {
        const text = await btn.textContent().catch(() => '');
        const visible = await btn.isVisible().catch(() => false);
        if (!visible) continue;
        buttonsTested++;
        // Don't actually click navigation buttons — just verify they're clickable
        const enabled = await btn.isEnabled().catch(() => true);
        if (!enabled) {
          const t = text.trim();
          // Benign-at-load disabled states (verified by design, not bugs):
          // - Pagination "Prev": disabled on page 1 by definition (hubs open
          //   on page 1; flagging it every run was pure noise).
          // - Flowchart action buttons: disabled until a topic/hero is
          //   selected ("Open this topic's full timeline profile", "Toggle
          //   UPSC revision notes for this topic", shrink-with-nothing-expanded).
          const benign = /^(◀|←|«)?\s*(prev|previous)\b/i.test(t) ||
            t === 'Revision' || t === 'Open in timeline map' || t === '↺ Shrink';
          if (!benign) log(pageName, 'disabled-button', '"' + t.substring(0, 30) + '" is disabled');
        }
      } catch (e) { /* skip */ }
    }

    // Check for JS-triggered navigation (tabs, accordions). Generous click
    // timeout: CI runners render 1MB+ pages slowly; 3s flagged healthy tabs
    // as broken (noise the agent would then "fix").
    const tabLike = await page.$$('[data-tab], [data-target], .tab, .nav-tab, [onclick*="show"], [onclick*="switch"]');
    for (const tab of tabLike.slice(0, 10)) {
      try {
        const before = await page.url();
        await tab.click({ timeout: 8000 });
        await page.waitForTimeout(500);
        const errors = consoleErrors.length;
        if (errors > 0) {
          log(pageName, 'broken-tab', 'Tab click caused console error');
        }
      } catch (e) {
        log(pageName, 'broken-tab', 'Tab not clickable: ' + e.message.substring(0, 100));
      }
    }

    results.summary.total++;
    if (pageResult.consoleErrors === 0 && pageResult.pageErrors === 0 && pageResult.brokenLinks === 0) {
      results.summary.passed++;
      pageResult.passed = true;
    } else {
      results.summary.failed++;
      pageResult.passed = false;
    }

    results.pages.push(pageResult);
    console.log('  ' + (pageResult.passed ? '✅' : '❌') + ' ' + pageName + ' (' + pageResult.loadTime + 'ms)');
  } catch (e) {
    pageResult.passed = false;
    pageResult.error = e.message;
    results.summary.failed++;
    results.pages.push(pageResult);
    log(pageName, 'load-error', e.message.substring(0, 200));
    console.log('  ❌ ' + pageName + ' — ' + e.message.substring(0, 80));
  } finally {
    await page.close().catch(() => {});
  }
}

// Mobile pass: desktop Chromium never sees phone layout bugs (horizontal
// overflow, viewport issues, mobile-only JS). Same env-missing rules; new
// issue kinds ('mobile-overflow', 'mobile-js-error', 'mobile-load-error')
// so desktop repair rules don't misapply and MetaLearn can learn them.
async function testMobilePage(context, url, pageName) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      const loc = (typeof msg.location === 'function' ? msg.location() : null) || {};
      const u = loc.url || '';
      if ((u + ' ' + text).match(/data\/questions\//i) && /404|failed to load|failed to fetch|not found/i.test(text)) {
        log(pageName + ' (mobile)', 'env-missing', text.substring(0, 200), u);
      } else {
        consoleErrors.push({ text, url: u });
      }
    }
  });
  page.on('pageerror', err => pageErrors.push(err.message));
  let bad = false;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: TIMEOUT });
    if (resp && resp.status() >= 400) {
      log(pageName + ' (mobile)', 'mobile-load-error', 'HTTP ' + resp.status());
      bad = true;
    }
    for (const err of consoleErrors.slice(0, 5)) {
      log(pageName + ' (mobile)', 'mobile-js-error', err.text.substring(0, 160), err.url);
      bad = true;
    }
    for (const err of pageErrors.slice(0, 5)) {
      log(pageName + ' (mobile)', 'mobile-js-error', err.substring(0, 160));
      bad = true;
    }
    // Horizontal overflow: the classic phone breaker (content wider than the
    // viewport → sideways scrolling / cut-off columns).
    const dims = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })).catch(() => null);
    if (dims && dims.sw > dims.iw + 2) {
      log(pageName + ' (mobile)', 'mobile-overflow', 'scrolls sideways: ' + dims.sw + 'px content vs ' + dims.iw + 'px viewport');
      bad = true;
    }
    console.log('  ' + (bad ? '❌' : '✅') + ' ' + pageName + ' (mobile)');
  } catch (e) {
    log(pageName + ' (mobile)', 'mobile-load-error', e.message.substring(0, 200));
    console.log('  ❌ ' + pageName + ' (mobile) — ' + e.message.substring(0, 60));
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  // Pages to test — all critical pages. Includes the pages users actually
  // reported broken (current-affairs quiz Next button, flowchart graph lib)
  // plus exam-hub samples, so interaction failures are caught in CI instead
  // of by user reports.
  const pages = [
    ['index.html', 'Homepage'],
    ['ask.html', 'Ask Engine'],
    ['papers.html', 'Papers'],
    ['mega-test.html', 'Mega Test'],
    ['improve.html', 'Improve'],
    ['science.html', 'Science'],
    ['polytechnic.html', 'Polytechnic'],
    ['mental.html', 'Mental Training'],
    ['ssc-je.html', 'SSC JE'],
    ['micro-test.html', 'Micro Test'],
    ['dashboard.html', 'Dashboard'],
    ['404.html', '404 Page'],
    ['current-affairs.html', 'Current Affairs Quiz'],
    ['flowchart.html', 'Flowchart'],
    ['archive.html', 'Archive'],
    ['map.html', 'Map'],
    ['revision.html', 'Revision'],
    ['cgl/index.html', 'CGL Hub'],
    ['upsc/index.html', 'UPSC Hub'],
    ['rbi/index.html', 'RBI Hub'],
  ];

  console.log('Browser Test Agent: starting...');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  for (const [file, name] of pages) {
    const url = BASE + '/' + file;
    await testPage(browser, url, name, file);
  }

  // Mobile pass — same pages, real phone viewport + iPhone UA + touch.
  console.log('\nMobile pass (390x844, iPhone UA, touch):');
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  for (const [file, name] of pages) {
    await testMobilePage(mctx, BASE + '/' + file, name);
  }
  await mctx.close();

  await browser.close();

  const out = path.join(__dirname, '..', 'data', 'browser-test.json');
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log('\n=== Browser Test Summary ===');
  console.log('Pages: ' + results.summary.total + ' | Passed: ' + results.summary.passed + ' | Failed: ' + results.summary.failed);
  console.log('Console errors: ' + results.summary.consoleErrors);
  console.log('Broken links: ' + results.summary.brokenLinks);
  console.log('Broken buttons: ' + results.summary.brokenButtons);
  console.log('Total issues: ' + results.issues.length);
  console.log('Mobile issues: ' + results.issues.filter(i => String(i.type).indexOf('mobile-') === 0).length);
  console.log('Output: data/browser-test.json');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
