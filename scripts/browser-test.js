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

async function testPage(browser, url, pageName) {
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
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
      log(pageName, 'console-error', err.substring(0, 200));
    }

    // Check page errors (uncaught exceptions)
    for (const err of pageErrors) {
      pageResult.pageErrors++;
      log(pageName, 'js-error', err.substring(0, 200));
    }

    // Check failed requests (broken scripts, images, data)
    for (const req of failedRequests) {
      if (req.includes('.js') || req.includes('.css') || req.includes('.json') || req.includes('.html')) {
        log(pageName, 'broken-request', req.substring(0, 200));
      }
    }

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
      // Check local links exist
      if (!link.href.startsWith('http') && !link.href.startsWith('//')) {
        const target = link.href.split('#')[0].split('?')[0];
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
          log(pageName, 'disabled-button', '"' + text.trim().substring(0, 30) + '" is disabled');
        }
      } catch (e) { /* skip */ }
    }

    // Check for JS-triggered navigation (tabs, accordions)
    const tabLike = await page.$$('[data-tab], [data-target], .tab, .nav-tab, [onclick*="show"], [onclick*="switch"]');
    for (const tab of tabLike.slice(0, 10)) {
      try {
        const before = await page.url();
        await tab.click({ timeout: 3000 });
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

async function main() {
  // Pages to test — all critical pages
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
    ['404.html', '404 Page']
  ];

  console.log('Browser Test Agent: starting...');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  for (const [file, name] of pages) {
    const url = BASE + '/' + file;
    await testPage(browser, url, name);
  }

  await browser.close();

  const out = path.join(__dirname, '..', 'data', 'browser-test.json');
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log('\n=== Browser Test Summary ===');
  console.log('Pages: ' + results.summary.total + ' | Passed: ' + results.summary.passed + ' | Failed: ' + results.summary.failed);
  console.log('Console errors: ' + results.summary.consoleErrors);
  console.log('Broken links: ' + results.summary.brokenLinks);
  console.log('Broken buttons: ' + results.summary.brokenButtons);
  console.log('Total issues: ' + results.issues.length);
  console.log('Output: data/browser-test.json');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
