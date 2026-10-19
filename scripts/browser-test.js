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
// The deployed site, checked with the same homepage contract the local tree
// gets. The 2026-10-15 regression (widget scripts moved into <head> without
// defer) broke every homepage widget but produced ZERO console errors --
// the widget IIFEs guarded their element lookups and silently skipped -- so
// every error-based check stayed green while the page visibly said "Loading..."
// for a day and a half until a user reported it. Content contracts exist so
// "the page renders its promised content" is verified, not assumed.
const PROD = process.env.PROD_URL || 'https://vlymbooq.qzz.io';
const SKIP_PROD = !!process.env.SKIP_PROD;
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
  if (type === 'content-contract') results.summary.contractFailures = (results.summary.contractFailures || 0) + 1;
  if (type === 'production-contract') results.summary.productionFailures = (results.summary.productionFailures || 0) + 1;
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
      } else if (/writer-model\/version\.json/.test(u)) {
        // Optional fine-tuned-model branch probe: a miss is the NORMAL state
        // (no model trained yet) and by design changes nothing. Classify as
        // env-missing so it never reads as a site bug.
        log(pageName, 'env-missing', 'optional writer-model probe missed (normal)', u);
      } else {
        consoleErrors.push({ text: text, url: u });
      }
    }
  });
  // Stacks, not just messages: "Unexpected string" and "reading 'classList'"
  // without a file:line are unactionable guesses. err.stack names the exact
  // script frame that threw.
  page.on('pageerror', err => pageErrors.push({ msg: err.message, stack: String(err.stack || '') }));
  page.on('requestfailed', req => {
    const u = req.url();
    if (!u.includes('chrome-extension') && !u.includes('favicon')) {
      failedRequests.push(u + ' — ' + (req.failure()?.errorText || 'failed'));
    }
  });

  const pageResult = { url, name: pageName, status: 0, consoleErrors: 0, pageErrors: 0, brokenLinks: 0, brokenButtons: 0, loadTime: 0 };

  try {
    const start = Date.now();
    // domcontentloaded + bounded network settle, NOT networkidle as the gate:
    // pages with a long-poll/CDN fetch (mental.html) never reach networkidle
    // and were marked load-error although they render fine for users.
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    pageResult.loadTime = Date.now() - start;
    pageResult.status = resp ? resp.status() : 0;

    // Kill the first-visit weekly-goal modal BEFORE its 3 s timer fires: it
    // covers every control until a goal is picked and was intercepting the
    // agent's own taps (Mental's flow read "skipped" while real clicks were
    // being swallowed). A fresh CI profile stores no goal, so pre-seed one;
    // showGoalPrompt() re-reads storage at fire time and skips the overlay.
    await page.evaluate(() => {
      try {
        if (!localStorage.getItem('studypro_goals')) {
          localStorage.setItem('studypro_goals', JSON.stringify({ papersPerWeek: 1, dismissed: true }));
        }
      } catch (e) { /* storage blocked: showGoalPrompt self-guards */ }
    }).catch(() => {});

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
      log(pageName, 'js-error', String(err.msg || '').substring(0, 200), String(err.stack || '').substring(0, 500));
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

    // Dismiss first-visit overlays (streak toast "Got it" etc.) before any
    // click sweeps — an overlay intercepts clicks and healthy tabs/buttons
    // then time out as "broken" (Homepage lost 3 tabs to this).
    try {
      const gotIt = await page.$('button:has-text("Got it"), [class*="toast"] button, [class*="popup"] button');
      if (gotIt && await gotIt.isVisible().catch(() => false)) {
        await gotIt.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(300);
      }
    } catch (e) { /* no overlay */ }

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

    // Mental trainer: its arena has no #nextBtn — the Next control is
    // [onclick="nextQuestion()"]. Exercise the real tap path (mode card →
    // technique flash → answer → Next) so this page gets flow coverage too;
    // the dead-Next class of bug must be caught by the agent, not a user.
    try {
      const skip = await page.$('#goalSkip');
      if (skip && await skip.isVisible().catch(() => false)) { await skip.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(300); }
      const mentalCard = await page.$('.mode-card[onclick*="startTraining"]');
      if (mentalCard && await mentalCard.isVisible().catch(() => false)) {
        await mentalCard.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(1300);
        const flash = await page.$('#techFlash button, #techFlash .action-btn');
        if (flash && await flash.isVisible().catch(() => false)) { await flash.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(900); }
        let advanced = 0;
        for (let step = 0; step < 3; step++) {
          const opts = await page.$$('.opt-btn:not(.disabled)');
          if (!opts.length) break;
          await opts[0].click({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(900);
          const nx = await page.$('[onclick="nextQuestion()"]');
          if (!nx || !(await nx.isVisible().catch(() => false))) break;
          await nx.click({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(1100);
          advanced++;
        }
        if (advanced > 0) {
          log(pageName, 'flow-ok', 'mental arena: answered + Next advanced through ' + advanced + ' question(s)');
        } else {
          const q = await page.$('#qText');
          const qt = q ? String(await q.textContent().catch(() => '') || '').trim() : '';
          log(pageName, 'mental-flow-stuck', qt ? ('question rendered but Next never appeared: ' + qt.substring(0, 80)) : 'startTraining rendered no question');
        }
      }
    } catch (e) { /* mental flow optional */ }

    // Invented arena levels: the four level buttons sit inside .mode-card
    // containers whose decorative ::before tint covers the whole card. If the
    // tint lacks pointer-events:none it swallows every REAL tap while
    // synthetic el.click() still fires — which is exactly how the dead-level
    // buttons hid from the click sweeps. So hit-test the top-of-stack element
    // at the button's centre instead of trusting a DOM-level click.
    try {
      const invBtns = await page.$$('button[onclick^="startInvented"]');
      if (invBtns.length) {
        const skip2 = await page.$('#goalSkip');
        if (skip2 && await skip2.isVisible().catch(() => false)) { await skip2.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(300); }
        let blocked = 0;
        for (const b of invBtns) {
          const probe = await b.evaluate((el) => {
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) return { ok: false, why: 'not rendered (size 0)' };
            const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            if (top === el || el.contains(top)) return { ok: true };
            const who = top ? (top.tagName.toLowerCase() + (top.className ? '.' + String(top.className).split(' ')[0] : '')) : 'nothing';
            return { ok: false, why: who + ' is on top' };
          }).catch(() => ({ ok: false, why: 'probe failed' }));
          if (!probe.ok) {
            blocked++;
            const oc = (await b.getAttribute('onclick').catch(() => '')) || '';
            log(pageName, 'blocked-button', 'invented level [' + oc + '] cannot receive real taps: ' + probe.why);
          }
        }
        if (!blocked) log(pageName, 'flow-ok', 'invented levels: all ' + invBtns.length + ' buttons receive real taps (hit-test)');
      }
    } catch (e) { /* hit-test optional */ }

    // Mains: the in-browser AI generator must exist and react to a click.
    // CI has no WebGPU, so the honest reaction there is the unsupported
    // notice (set at boot, button disabled); on a GPU machine the click
    // flips the status into engine progress. Either way, a silent button is
    // the dead-control class of bug and gets logged.
    try {
      const gen = await page.$('#genAI');
      if (gen && await gen.isVisible().catch(() => false)) {
        const readStat = () => page.$eval('#genStat', n => String(n.textContent || '').trim()).catch(() => '');
        const before = await readStat();
        await gen.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(1500);
        const after = await readStat();
        const disabled = await gen.isDisabled().catch(() => false);
        if (after && (after !== before || disabled)) {
          log(pageName, 'ai-ok', 'in-browser AI control reacted: ' + after.substring(0, 100));
        } else {
          log(pageName, 'ai-inert', 'genStat unchanged after click: ' + (before || '(empty)').substring(0, 100));
        }
      }
    } catch (e) { /* mains AI optional */ }

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
      let tabLabel = '';
      try {
        // Skip elements a real user cannot click: hidden duplicates (mobile
        // drawers, collapsed panels) timed out for 8s and read as broken
        // tabs even when the visible twin worked. Labels ride along so any
        // remaining timeout names the guilty element.
        const state = await tab.evaluate(el => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return {
            hidden: cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || r.height === 0,
            disabled: !!el.disabled,
            // Animated/decorative elements (homepage stat counters bounce via
            // CSS animation) never reach Playwright's "stable" check and read
            // as broken tabs after an 8s timeout. They are not tabs.
            skip: (el.classList && el.classList.contains('stat-number')) ||
                  (cs.animationName !== 'none' && cs.animationPlayState === 'running'),
            label: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ')[0] : '')
          };
        });
        tabLabel = state.label;
        if (state.hidden || state.disabled || state.skip) continue;
        const before = await page.url();
        await tab.click({ timeout: 8000 });
        await page.waitForTimeout(500);
        const errors = consoleErrors.length;
        if (errors > 0) {
          log(pageName, 'broken-tab', 'Tab click caused console error');
        }
      } catch (e) {
        log(pageName, 'broken-tab', 'Tab not clickable [' + tabLabel + ']: ' + e.message.substring(0, 100));
      }
    }

    // Content contracts: the page's own widgets' post-load state. A page whose
    // widgets never came alive fails here even though nothing threw.
    if (CONTRACTS[file]) {
      try {
        const checks = await CONTRACTS[file](page);
        pageResult.contracts = checks;
        const failed = checks.filter(c => !c.ok);
        if (failed.length) {
          pageResult.contractFailures = failed.length;
          failed.forEach(c => log(pageName, 'content-contract', c.name + (c.detail ? ' — ' + c.detail : '')));
        }
      } catch (e) {
        pageResult.contractFailures = 1;
        log(pageName, 'content-contract', 'contract run failed: ' + e.message.substring(0, 120));
      }
    }

    results.summary.total++;
    if (pageResult.consoleErrors === 0 && pageResult.pageErrors === 0 && pageResult.brokenLinks === 0 && !pageResult.contractFailures) {
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
      if (((u + ' ' + text).match(/data\/questions\//i) && /404|failed to load|failed to fetch|not found/i.test(text)) ||
          /writer-model\/?version\.json/.test(u)) {
        log(pageName + ' (mobile)', 'env-missing', text.substring(0, 200), u);
      } else {
        consoleErrors.push({ text, url: u });
      }
    }
  });
  page.on('pageerror', err => pageErrors.push({ msg: err.message, stack: String(err.stack || '') }));
  let bad = false;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    if (resp && resp.status() >= 400) {
      log(pageName + ' (mobile)', 'mobile-load-error', 'HTTP ' + resp.status());
      bad = true;
    }
    for (const err of consoleErrors.slice(0, 5)) {
      log(pageName + ' (mobile)', 'mobile-js-error', err.text.substring(0, 160), err.url);
      bad = true;
    }
    for (const err of pageErrors.slice(0, 5)) {
      log(pageName + ' (mobile)', 'mobile-js-error', String(err.msg || '').substring(0, 160), String(err.stack || '').substring(0, 300));
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

// ---- content contracts ----------------------------------------------------
//
// The rule these enforce: a page that finished loading is not the same as a
// page that WORKS. Every failure class a user can see but the console cannot
// (a widget stuck at "Loading...", a counter frozen at 0, a grid never filled
// by its fetch) shows up here as a named contract instead of silence.

async function waitFor(page, fn, timeout) {
  try {
    await page.waitForFunction(fn, null, { timeout: timeout || 8000 });
    return true;
  } catch (e) {
    return false;
  }
}

// Homepage widgets. Every selector here was verified against a healthy live
// page; each check asserts the widget's post-load state, which is exactly the
// state the defer regression destroyed.
async function homepageContract(page, opts) {
  const t = (opts && opts.timeout) || 8000;
  const checks = [];
  const add = async (name, fn, detailFn) => {
    let ok = false, detail = '';
    try {
      ok = await fn();
      if (detailFn) detail = await detailFn();
    } catch (e) { detail = e.message; }
    checks.push({ name, ok: !!ok, detail: String(detail || '').slice(0, 120) });
  };

  // Stat counters animate when scrolled into view; scroll first so the widget
  // gets its IntersectionObserver chance even in a fresh viewport.
  await page.$eval('.stat-number', el => el.scrollIntoView({ block: 'center' })).catch(() => {});
  await add('stat counters reach their targets',
    () => waitFor(page, () => {
      const els = Array.from(document.querySelectorAll('.stat-number'));
      if (els.length < 3) return false;
      return els.slice(0, 3).every(e => parseInt(String(e.textContent).replace(/\D/g, ''), 10) > 0);
    }, t),
    () => page.$$eval('.stat-number', els => els.slice(0, 3).map(e => e.textContent.trim()).join(' / ')));

  await add('fortune filled in', async () => {
    const txt = (await page.textContent('#fortuneMsg').catch(() => '')) || '';
    return txt.trim().length > 5 && !/loading/i.test(txt);
  }, () => page.textContent('#fortuneMsg').catch(() => ''));

  await add('paper of the day rendered', async () => {
    const html = (await page.innerHTML('#podContent').catch(() => '')) || '';
    return html.length > 80 && !/loading/i.test(html.replace(/<[^>]*>/g, ' '));
  }, () => page.$eval('#podContent', e => String(e.textContent).trim().slice(0, 80)).catch(() => ''));

  await add('ticker marquee built', () =>
    page.$eval('#tickerText', e => e.childElementCount > 0).catch(() => false),
    () => page.$eval('#tickerText', e => e.children.length + ' item(s)').catch(() => ''));

  await add('question of the day served', async () => {
    const q = (await page.textContent('#dailyQText').catch(() => '')) || '';
    const n = await page.$eval('#dailyQOptions', e => e.children.length).catch(() => 0);
    return q.trim().startsWith('Q:') && n >= 4;
  }, () => page.$eval('#dailyQText', e => e.textContent.trim().slice(0, 70)).catch(() => ''));

  await add('vibe panel options built', () =>
    page.$eval('#vibePanel', e => e.querySelectorAll('.vibe-opt').length >= 4).catch(() => false),
    () => page.$eval('#vibePanel', e => e.querySelectorAll('.vibe-opt').length + ' option(s)').catch(() => ''));

  return checks;
}

// Lecture hall: the grid fills from data/lectures.json. A fetch path that
// silently dies leaves the grid empty with no console error, the same class
// of silent failure as the homepage widgets.
async function lectureContract(page, opts) {
  const t = (opts && opts.timeout) || 10000;
  const ok = await waitFor(page, () => {
    const g = document.getElementById('lecGrid');
    return g && g.children.length >= 20;
  }, t);
  let detail = '';
  try { detail = (await page.$eval('#lecGrid', e => e.children.length)) + ' card(s)'; } catch (e) {}
  return [{ name: 'lecture grid filled from lectures.json', ok, detail }];
}

const CONTRACTS = {
  'index.html': homepageContract,
  'lecture.html': lectureContract
};

// Production contract run: same homepage contract, against the deployed site.
// A failed deploy (or a bad push that CF served) is invisible to the local
// run; this closes that gap. One retry covers CF swapping a deploy underneath.
async function runProductionContracts(browser) {
  const prod = { url: PROD, contracts: [], ok: null };
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(PROD + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    prod.status = resp ? resp.status() : 0;
    let checks = await homepageContract(page, { timeout: 12000 });
    if (checks.some(c => !c.ok)) {
      await page.waitForTimeout(15000);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      checks = await homepageContract(page, { timeout: 12000 });
    }
    prod.contracts = checks;
    prod.ok = checks.every(c => c.ok);
    checks.filter(c => !c.ok).forEach(c =>
      log('Homepage (production)', 'production-contract', c.name + (c.detail ? ' — ' + c.detail : '')));
    console.log('  ' + (prod.ok ? '✅' : '❌') + ' Homepage (production)');
  } catch (e) {
    prod.error = e.message;
    log('Homepage (production)', 'production-contract', 'load failed: ' + e.message.substring(0, 120));
    console.log('  ❌ Homepage (production) — ' + e.message.substring(0, 60));
  } finally {
    await ctx.close().catch(() => {});
  }
  results.production = prod;
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

  // Production pass — catches silent deploy drift the local tree cannot.
  if (!SKIP_PROD) {
    console.log('\nProduction contract (deployed homepage):');
    await runProductionContracts(browser);
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
  console.log('Content contract failures: ' + (results.summary.contractFailures || 0));
  if (results.production) {
    console.log('Production homepage contract: ' + (results.production.ok ? 'OK' : 'FAILED'));
  }
  console.log('Total issues: ' + results.issues.length);
  console.log('Mobile issues: ' + results.issues.filter(i => String(i.type).indexOf('mobile-') === 0).length);
  console.log('Output: data/browser-test.json');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
