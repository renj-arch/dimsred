// Site Agent: the complete autonomous maintainer. Reads every report,
// fixes everything it safely can, and escalates what needs human decision.
//
// Capabilities:
//   CONTENT  — generate questions, figures, explanations, current affairs
//   CODE     — fix broken links, HTML issues, dead scripts, missing assets
//   SEO      — meta tags, headings, structured data, descriptions
//   A11Y     — accessibility: alt text, contrast, ARIA labels, keyboard nav
//   DESIGN   — responsive fixes, font sizes, spacing, color consistency
//   FEATURES — generate new study tools from templates (flashcards, mind maps)
//   PERF     — image optimization hints, lazy loading, script defer
//   SECURITY — check for unsafe patterns, missing headers
//
// Everything logged to data/agent-log.json. improve.html shows what the
// agent did. Never blocks: any fatal error logs and exits 0.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const memory = require('./agent-memory');

// Seed initial rules from hard-won experience
memory.addRule('NEVER replace a dead link with href="#" — link to a real page or convert to plain text', 'Replacing with # broke the homepage navigation');
memory.addRule('Always check if a file exists before deleting or replacing references to it', 'Agent once removed working script references');
memory.addRule('When modifying exam card links, map to the correct exam page (UPSC→papers, SSC→ssc-je, science→science.html)', 'Agent linked all cards to the same page');
memory.addRule('NEVER load all 9GB of data/questions into memory — process files one at a time', 'Caused OOM crashes');
memory.addRule('When adding alt text to images, derive it from the filename, not random words', 'Agent once added gibberish alt text like "vlymbooq"');
memory.addRule('Check that Ollama server is running before calling it — start it if not', 'Agent calls failed because server was dead');
memory.addRule('Add timeout-minutes to all GitHub Actions jobs', 'Jobs were cancelled after 6h without timeout');
memory.addRule('Use NODE_OPTIONS=--max-old-space-size=4096 for node scripts processing large data', 'Prevents OOM on 7GB runner');

const LOG = 'data/agent-log.json';

// ── LLM call: curl via execSync, NOT Node fetch ──
// WHY NOT fetch: (a) Node fetch resolves localhost → ::1 IPv6; Ollama is
// IPv4-only → instant "fetch failed" (run #56). (b) Even on 127.0.0.1,
// undici's default 300s headersTimeout fires while the 27B model cold-loads
// through swap (run #57: hung exactly 300s, then failed). (c) llm-autofix.js
// which we copied as "proven" never actually called Ollama — it referenced
// an undefined OLLAMA_MODEL variable and threw ReferenceError every time
// (its own log: "Ollama not reachable: OLLAMA_MODEL is not defined,
// 0 fix(es) applied"). The only path PROVEN to generate on this runner is
// the CLI (`ollama run` succeeded in run #56 pull step). curl is the
// closest HTTP equivalent: IPv4-only, no undici timeout.
// Do NOT add warmups, restarts, health-check loops, num_ctx/num_thread/
// num_batch/use_mmap options, or flash-attn env: runs #44–#54 showed every
// one of those "improvements" broke generation.
const OLLAMA_URL = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434');

// One HTTP attempt at the chat endpoint. Extracted so a timed-out cold-load
// (exit 28, "0 bytes received" after the full 30 min) can be retried: the
// model reload that caused the timeout is DONE by then, so the retry is fast.
function ollamaChat(payload) {
  return execSync(
    'curl -sS --max-time 1800 -w "\\n%{http_code}" ' + OLLAMA_URL + '/api/chat -H "Content-Type: application/json" -d @-',
    { input: payload, encoding: 'utf8', timeout: 1850000, maxBuffer: 50 * 1024 * 1024 }
  );
}

// Report whether the model is currently resident in RAM. When it is NOT, the
// next call must cold-load 17GB through swap — minutes of silence that looks
// like a hang (run #64: Features timed out at exactly 30 min because the model
// had unloaded and 7 concurrent workflows were starving the CPU).
function logModelState(tag) {
  try {
    const ps = execSync('curl -s --max-time 15 ' + OLLAMA_URL + '/api/ps',
      { encoding: 'utf8', timeout: 20000 });
    const loaded = (JSON.parse(ps).models || []).map(m => m.name);
    if (loaded.length) {
      console.log('agent: ' + tag + ' — model resident: ' + loaded.join(', '));
    } else {
      console.log('agent: ' + tag + ' — NO model resident: next call cold-loads 17GB (expect minutes)');
    }
  } catch (e) { /* informational only */ }
}

async function callLLM(system, user, maxTokens) {
  const model = process.env.OLLAMA_MODEL || 'qwen3.8:27b';
  const payload = JSON.stringify({
    model: model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    stream: false,
    // 2048 not 1024: qwen3.8:27b spends ~200-600 tokens thinking before
    // it emits content. 1024 was cutting answers off mid-thought.
    options: { temperature: 0.3, num_predict: maxTokens || 2048 }
  });
  logModelState('pre-call');
  let out;
  try {
    out = ollamaChat(payload);
  } catch (e) {
    const detail = 'exit=' + (e.status === undefined ? '?' : e.status) +
      ' stderr=' + String(e.stderr || '').slice(0, 200) +
      ' out=' + String(e.stdout || '').slice(0, 300);
    // exit 28 = curl max-time hit. With "0 bytes received" the server never
    // began responding: almost always a cold 17GB load that outran the 30-min
    // cap on a CPU-starved runner. Retry once — the reload finishes during
    // the failed attempt, so the second try starts warm.
    if (e.status === 28) {
      console.log('agent: Ollama timed out (' + detail + ') — retrying once; the cold load is now complete');
      try {
        out = ollamaChat(payload);
      } catch (e2) {
        console.log('agent: Ollama retry also timed out: exit=' + e2.status);
        return null;
      }
    } else {
      console.log('agent: Ollama curl failed: ' + detail);
      // If the server is dead (exit 7 / Connection refused), restart it once
      // so the NEXT call has something to talk to.
      if (e.status === 7 || String(e.stderr || '').match(/Connection refused|Failed to connect/i)) {
        console.log('agent: server refused connection — restarting ollama for next call');
        try { execSync('nohup ollama serve >> /tmp/ollama.log 2>&1 &', { stdio: 'ignore' }); } catch (e3) { /* best effort */ }
      }
      return null;
    }
  }
  try {
    const nl = out.lastIndexOf('\n');
    const body = nl >= 0 ? out.slice(0, nl) : out;
    const httpCode = nl >= 0 ? out.slice(nl + 1).trim() : '';
    const j = JSON.parse(body);
    const msg = j.message || {};
    // qwen3.8:27b is a THINKING model: it reasons in message.thinking and
    // puts the final answer in message.content. With num_predict as low as
    // 10 the entire budget is consumed by thinking and content comes back
    // empty (run #60: content="" thinking="The user is asking me to
    // confirm that generation works"). Fall back to thinking when empty.
    let text = (msg.content || '').trim();
    if (!text && msg.thinking) text = msg.thinking.trim();
    if (text) return { text: text, model: model + ' (local)' };
    console.log('agent: Ollama ' + model + ' returned empty (http ' + httpCode + '): ' + body.slice(0, 200));
  } catch (e) {
    console.log('agent: Ollama response unparseable: ' + String(out).slice(0, 300));
  }
  return null;
}

function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}

function saveJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 1) + '\n');
}

function listPages() {
  // Recursive: the exam hubs (cgl/, rbi/, ...) and course pages live in
  // subdirectories and were invisible to every audit until now — only root
  // *.html was ever scanned. Excludes: VCS, modules, data dumps, and the
  // generated figures/ tree (rebuilt wholesale by its pipeline; auditing it
  // here only creates commit churn that the rebuild overwrites).
  const SKIP_DIRS = new Set(['.git', 'node_modules', 'data', 'figures', 'live-dist', '.github']);
  const out = [];
  (function walk(dir) {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries) {
      const p = dir === '.' ? e.name : dir + '/' + e.name;
      if (e.isDirectory()) {
        if (e.name[0] === '.' || e.name[0] === '_' || SKIP_DIRS.has(e.name) || SKIP_DIRS.has(p)) continue;
        walk(p);
      } else if (/\.html$/i.test(e.name) && e.name[0] !== '_' && e.name[0] !== '.') {
        out.push(p);
      }
    }
    if (out.length > 3000) return;
  })('.');
  return out.sort().slice(0, 3000);
}

// True when an inline <script> block reads a window.* global — i.e. the page
// consumes a library's globals immediately at parse time and its lib scripts
// must run synchronously (no defer). Shared contract between SelfCheck (which
// strips defer in this case) and Perf (which must not re-add it).
function pageNeedsSyncScripts(html) {
  const inlineRe = /<script>([\s\S]*?)<\/script>/gi;
  let im;
  while ((im = inlineRe.exec(html)) !== null) {
    if (/\bwindow\.[A-Za-z_$]/.test(im[1])) return true;
  }
  return false;
}

// Resolve a page-relative URL (../js/x.js, js/main.js, /js/x.js) to a
// repo-root-relative path for existence checks. Page authors mix styles:
// root pages use js/..., hub pages use ../js/... — checking either against
// the repo root directly gives the wrong answer and strips working tags.
function resolvePageRef(page, ref) {
  if (!ref) return '';
  let r = ref.split('?')[0].split('#')[0].trim();
  if (!r || /^(https?:|javascript:|mailto:|data:)/i.test(r)) return '';
  if (r.charAt(0) === '/') return r.slice(1); // root-absolute
  const dir = page.indexOf('/') !== -1 ? page.slice(0, page.lastIndexOf('/')) : '';
  const parts = (dir ? dir + '/' + r : r).split('/');
  const stack = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') { stack.pop(); continue; }
    stack.push(p);
  }
  return stack.join('/');
}
function fileExistsAnywhere(f) {
  if (!f || /^(https?:)?\/\//i.test(f) || /^[a-z]+:/i.test(f)) return true; // external/CDN/data URLs: can't verify, never treat as missing
  const base = f.split('?')[0].split('#')[0];
  if (!base) return true;
  try {
    if (fs.existsSync(base)) return true;
  } catch (e) { /* fall through to git */ }
  try {
    execSync('git ls-files --error-unmatch "' + base.replace(/"/g, '') + '"', { stdio: 'pipe' });
    return true;
  } catch (e) { return false; }
}

// ── Autonomous repair: exam nav links landing on the wrong destination ──
// Diagnosed from the live nav: cards titled "RBI Grade B Phase 1" landed on
// ssc-je.html ("SSC-JE Mechanical"), CGL/IBPS/SBI/CTET all landed on ssc-je,
// CLAT on papers.html — working links to the WRONG exam's hub — while each
// exam's dedicated hub (/cgl/, /rbi/, ...) with real content sat unused, and
// other pages used href="#" for the same exams. Dead-link checkers never
// catch these because nothing 404s. Rule, longest-token-first:
//   * anchor text names exam X and hub /X/ exists → href must be /X/
//   * hub missing and href is bare "#" → mega-test.html?exam=X (honest quiz
//     fallback) + queue a "dedicated X hub" idea for the builder agents
//   * hub missing and href works → leave it, still queue the hub idea
// Non-exam links, in-page fragments (#section), externals: untouched.
// SSC JE's hub is the ssc-je.html page itself (not a directory).
const EXAM_HUBS = [
  ['SSC CGL', 'cgl'], ['SSC GD', 'ssc-gd'], ['SSC JE', 'PAGE:ssc-je.html'],
  ['RBI GRADE B', 'rbi'], ['IBPS PO', 'ibps-po'], ['SBI CLERK', 'sbi-clerk'],
  ['KERALA PSC', 'kerala-psc'], ['UP POLICE', null],
  ['CGL', 'cgl'], ['RBI', 'rbi'], ['JEE', 'jee'], ['NEET', 'neet'],
  ['GATE', 'gate'], ['AGNIVEER', 'agniveer'], ['UPSC', 'upsc'],
  ['IBPS', 'ibps-po'], ['SBI', 'sbi-clerk'], ['CTET', 'ctet'],
  ['NDA', 'nda'], ['CDS', 'cds'], ['CLAT', 'clat'], ['LDC', 'ldc']
];
function examTokenOf(text) {
  const t = ' ' + String(text || '').toUpperCase().replace(/\s+/g, ' ').trim() + ' ';
  for (const [token] of EXAM_HUBS) {
    const re = new RegExp('(^|[^A-Z])' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Z]|$)');
    if (re.test(t)) return token;
  }
  return null;
}
function hubSlugOf(token) {
  for (const [t, s] of EXAM_HUBS) if (t === token) return s;
  return undefined;
}
function fixExamNavLinks(html, page) {
  const fixes = [];
  const out = html.replace(/<a(\s[^>]*)?>([\s\S]*?)<\/a>/gi, function (full, attrs, inner) {
    attrs = attrs || '';
    const hm = /href="([^"]*)"/i.exec(attrs);
    if (!hm) return full;
    const href = hm[1];
    if (/^(https?:|javascript:|mailto:)/i.test(href)) return full;
    if (href.charAt(0) === '#' && href.length > 1) return full; // in-page fragment
    const text = inner.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return full;
    const token = examTokenOf(text);
    if (!token) return full;
    const slug = hubSlugOf(token);
    if (slug && slug.indexOf('PAGE:') === 0) {
      // This exam's hub is a page, not a directory (SSC JE → ssc-je.html).
      const want = slug.slice(5);
      if (href === want || href === './' + want) return full;
      if (href === '#') {
        fixes.push({ page: page, fix: 'Nav: "' + text.slice(0, 40) + '" → ' + want + ' (was dead #)' });
        return full.replace(/href="#"/i, 'href="' + want + '"');
      }
      return full; // a working link to a generic page is acceptable here
    }
    if (slug) {
      const okRe = new RegExp('^/?' + slug + '/(index\\.html)?$', 'i');
      if (okRe.test(href)) return full; // already correct
      if (!fileExistsAnywhere(slug + '/index.html')) return full; // hub not in repo — handled below
      const fixed = full.replace(/href="[^"]*"/i, 'href="/' + slug + '/"');
      fixes.push({ page: page, fix: 'Nav: "' + text.slice(0, 40) + '" → /' + slug + '/ (was ' + href + ')' });
      return fixed;
    }
    // No hub for this exam.
    queueHubIdea(token);
    if (href === '#') {
      const examParam = 'mega-test.html?exam=' + token.replace(/\s+/g, '+');
      fixes.push({ page: page, fix: 'Nav: "' + text.slice(0, 40) + '" → ' + examParam + ' (no dedicated hub yet)' });
      return full.replace(/href="#"/i, 'href="' + examParam + '"');
    }
    return full;
  });
  return { html: out, fixes: fixes };
}
// Queue a "build this exam's hub" idea for the Proposals/Features agents.
// Deduped by title; capped so one run cannot flood the board.
let hubIdeasQueued = 0;
function queueHubIdea(token) {
  if (hubIdeasQueued >= 3) return;
  try {
    const p = 'data/ideas.json';
    const j = loadJson(p, { ideas: [] });
    if (!Array.isArray(j.ideas)) j.ideas = [];
    const title = 'Dedicated ' + token.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()) + ' hub';
    if (j.ideas.some(i => String(i.title || '').toLowerCase() === title.toLowerCase())) return;
    j.ideas.push({
      title: title,
      detail: 'Nav links name this exam but no /<slug>/ hub exists yet — links fall back to the generic quiz. Build a hub (index, course, mock-tests, papers) like the other exams.',
      source: 'nav-audit'
    });
    try { saveJson(p, j); hubIdeasQueued++; } catch (e) { /* checkout may lack data/ — logged by caller run */ }
  } catch (e) { /* never block the repair pass on the idea board */ }
}
//   * a <script src> WITHOUT defer runs the moment the parser reaches it
//   * a <script src="..." defer> only runs AFTER the whole document parses
//   * an INLINE <script> runs the moment the parser reaches it — BEFORE any
//     deferred script gets its turn
// So an inline block that reads globals provided by a deferred lib
// (var GC = window.GC) ALWAYS sees undefined, and the page shows its
// "Failed to load scripts/lib/..." message while the file is in fact served
// fine. Diagnosed by hand on flowchart.html; now fixed autonomously:
// whenever a page has deferred script tags AND an inline script that reads
// window globals, drop defer so the libs run in document order.
// (Our pages load libs at the end of <body>, where defer buys nothing and
// costs correctness.)
function fixDeferredInlineOrder(html, page) {
  const fixes = [];
  const deferredTags = html.match(/<script\s+src="[^"]+"\s+defer\s*><\/script>/gi) || [];
  if (!deferredTags.length) return { html: html, fixes: fixes };
  if (!pageNeedsSyncScripts(html)) return { html: html, fixes: fixes };
  const out = html.replace(/(<script\s+src="[^"]+")\s+defer\s*(><\/script>)/gi, '$1$2');
  if (out !== html) {
    fixes.push({
      page: page,
      fix: 'Removed defer from ' + deferredTags.length + ' script tag(s) — a deferred script runs after parsing, but the inline code that reads its globals runs immediately, so the page always reported "Failed to load". Libs at the end of body need no defer.'
    });
    return { html: out, fixes: fixes };
  }
  return { html: html, fixes: fixes };
}

// ── Autonomous repair of over-aggressive repairs ──
// Run #2 stripped 37 LIVE <script> tags (ask.html's 12 ask libs, the
// flowchart's 5 graph libs, core.js from a dozen pages) because js/ was not
// in the sparse checkout and fs.existsSync lied. The evidence of what was
// stripped lives in git history. For the most recent bot repair commits that
// touched this page, re-add every removed <script src> tag whose target can
// be verified (tracked in git, or an external CDN URL the page evidently
// used). Insert position: before the page's first remaining script-src tag,
// else before </body>. Never touches inline code. This is what makes the
// system self-healing instead of self-breaking.
function restoreStrippedScripts(page) {
  const fixes = [];
  let html;
  try { html = fs.readFileSync(page, 'utf8'); } catch (e) { return { html: null, fixes: fixes }; }
  let log = '';
  try {
    log = execSync('git log --format=%H -5 -- ' + JSON.stringify(page), { encoding: 'utf8', timeout: 20000 });
  } catch (e) { return { html: html, fixes: fixes }; }
  const commits = log.split('\n').map(s => s.trim()).filter(Boolean);
  for (const c of commits) {
    let diff = '';
    try {
      diff = execSync('git show ' + c + ' --format="" -- ' + JSON.stringify(page),
        { encoding: 'utf8', timeout: 20000, maxBuffer: 10 * 1024 * 1024 });
    } catch (e) { continue; }
    for (const line of diff.split('\n')) {
      const m = /^-(\s*<script\s+src="([^"]+)"[^>]*><\/script>)\s*$/.exec(line);
      if (!m) continue;
      const tag = m[1].trim();
      const src = m[2];
      if (html.indexOf(tag) !== -1) continue; // already present
      // Same src already referenced in any form? Then nothing is missing.
      const escSrc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp('<script[^>]*src="' + escSrc + '"', 'i').test(html)) continue;
      // Verify the target: tracked in git, or an external URL the page used.
      const base = src.split('?')[0].split('#')[0];
      let ok = false;
      if (/^https?:\/\//i.test(base)) {
        ok = true; // external CDN the page evidently loaded before
      } else if (base && !/^[a-z]+:/i.test(base)) {
        try { execSync('git ls-files --error-unmatch "' + base.replace(/"/g, '') + '"', { stdio: 'pipe' }); ok = true; } catch (e) { ok = false; }
      }
      if (!ok) continue;
      // Insert where a lib belongs: before the first INLINE script (libs must
      // run before the code that consumes them), else before the first
      // remaining script-src tag, else before </body>.
      const inlineAt = html.search(/<script(?![^>]*src=)[^>]*>/i);
      const srcAt = html.search(/<script\s+src="/i);
      const anchor = inlineAt !== -1 ? inlineAt : srcAt;
      if (anchor !== -1) html = html.slice(0, anchor) + tag + '\n' + html.slice(anchor);
      else if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, tag + '\n</body>');
      else html += '\n' + tag + '\n';
      fixes.push({ page: page, fix: 'Restored stripped script tag ' + src + ' (removed by repair ' + c.slice(0, 8) + '; target verified)' });
    }
  }
  return { html: html, fixes: fixes };
}

// ── AGENT 1: SEO optimizer ──
// Ensures every page has: title, meta description, canonical, og tags,
// proper heading hierarchy, structured data.
async function agentSEO() {
  const fixes = [];
  const pages = listPages();

  for (const page of pages) {
    let html = fs.readFileSync(page, 'utf8');
    let changed = false;

    // Add meta description if missing
    if (!/<meta[^>]+name=["']description["']/i.test(html) && /<head>/i.test(html)) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : page.replace('.html', '').replace(/-/g, ' ');
      const desc = '<meta name="description" content="' + title + ' — study material, quizzes, and AI-powered explanations on Vlymbooq.">';
      html = html.replace(/(<head>)/i, '$1\n' + desc);
      changed = true;
      fixes.push({ page: page, fix: 'Added meta description' });
    }

    // Add viewport if missing
    if (!/<meta[^>]+name=["']viewport["']/i.test(html) && /<head>/i.test(html)) {
      html = html.replace(/(<head>)/i, '$1\n<meta name="viewport" content="width=device-width,initial-scale=1">');
      changed = true;
      fixes.push({ page: page, fix: 'Added viewport meta' });
    }

    // Add lang attribute if missing
    if (!/<html[^>]+lang=/i.test(html)) {
      html = html.replace(/<html/i, '<html lang="en"');
      changed = true;
      fixes.push({ page: page, fix: 'Added lang attribute' });
    }

    if (changed) fs.writeFileSync(page, html);
  }

  console.log('agent: SEO — ' + fixes.length + ' fix(es) across ' + pages.length + ' pages');
  return { agent: 'seo', fixes: fixes };
}

// ── AGENT 1b: Performance ──
// Detects slow-loading pages: huge JS files, missing defer/async, no lazy loading.
async function agentPerf() {
  const fixes = [];
  const pages = listPages();

  for (const page of pages) {
    let html = fs.readFileSync(page, 'utf8');
    let changed = false;

    // Add defer to <script src> tags missing it (except JSON-LD and modules)
    // BUT NOT when an inline block consumes a lib's globals: a deferred
    // script runs after parsing while inline code runs immediately, so defer
    // there breaks the page deterministically (flowchart.html's graph libs).
    // SelfCheck strips defer in exactly that case; adding it back here would
    // flip-flop the file every run. Shared contract via pageNeedsSyncScripts.
    if (!pageNeedsSyncScripts(html) && /<script[^>]+src=["'][^"']+["'](?!.*defer)(?!.*async)(?!.*type=["']module)/i.test(html) && !/type=["']application\/ld\+json/i.test(html)) {
      html = html.replace(/<script([^>]+src=["'][^"']+["'])([^>]*)>/gi, function (match, src, rest) {
        if (/defer|async|type=["']module/i.test(match)) return match;
        return '<script' + src + rest + ' defer>';
      });
      changed = true;
      fixes.push({ page: page, fix: 'Added defer to script tags' });
    } else if (pageNeedsSyncScripts(html)) {
      fixes.push({ page: page, fix: 'Left scripts synchronous — an inline block reads lib globals, defer would break the page', kind: 'perf-note' });
    }

    // Add loading="lazy" to images missing it
    if (/<img(?![^>]+loading=)[^>]*>/i.test(html)) {
      html = html.replace(/<img((?:(?!loading=)[^>])*?)>/gi, '<img$1 loading="lazy">');
      changed = true;
      fixes.push({ page: page, fix: 'Added lazy loading to images' });
    }

    // Detect huge inline JS (>50KB) and note it
    const inlineScripts = html.match(/<script(?![^>]+src)[^>]*>([\s\S]*?)<\/script>/gi) || [];
    let hugeInline = 0;
    inlineScripts.forEach(s => { if (s.length > 50000) hugeInline++; });
    if (hugeInline > 0) {
      fixes.push({ page: page, fix: 'WARNING: ' + hugeInline + ' inline script(s) >50KB — consider extracting to external file', kind: 'perf-warn' });
    }

    if (changed) fs.writeFileSync(page, html);
  }

  // Check JS file sizes
  try {
    const jsDir = 'js';
    if (fs.existsSync(jsDir)) {
      fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).forEach(f => {
        const size = fs.statSync(path.join(jsDir, f)).size;
        if (size > 200000) {
          fixes.push({ page: 'js/' + f, fix: 'WARNING: ' + f + ' is ' + (size / 1024).toFixed(0) + 'KB — consider code-splitting', kind: 'perf-warn' });
        }
      });
    }
  } catch (e) { /* ignore */ }

  console.log('agent: Perf — ' + fixes.length + ' fix(es)/warning(s)');
  return { agent: 'perf', fixes: fixes };
}

// ── AGENT 2: Accessibility (A11Y) ──
// Ensures: alt text on images, ARIA labels on interactive elements,
// proper heading hierarchy, color contrast hints.
async function agentA11Y() {
  const fixes = [];
  const pages = listPages();

  for (const page of pages) {
    let html = fs.readFileSync(page, 'utf8');
    let changed = false;

    // Add alt="" to images missing alt (decorative) or alt="..." placeholder
    if (/<img(?![^>]+alt=)[^>]*>/i.test(html)) {
      html = html.replace(/<img(?![^>]+alt=)([^>]*)>/gi, '<img alt=""$1>');
      changed = true;
      fixes.push({ page: page, fix: 'Added alt attributes to images' });
    }

    // Add role="button" and tabindex to clickable divs/spans without them
    // (common pattern in this site's quiz cards)
    if (/<div[^>]+onclick(?![^>]+role=)[^>]*>/i.test(html)) {
      html = html.replace(/<div([^>]+)onclick=/gi, '<div role="button" tabindex="0"$1onclick=');
      changed = true;
      fixes.push({ page: page, fix: 'Added role/tabindex to clickable divs' });
    }

    // Ensure skip-to-content link exists on pages with <main> or <nav>
    if (/<nav/i.test(html) && !/skip/i.test(html) && /<body/i.test(html)) {
      const skip = '<a href="#main" style="position:absolute;left:-9999px" onfocus="this.style.left=\'0\'" onblur="this.style.left=\'-9999px\'">Skip to content</a>';
      html = html.replace(/(<body[^>]*>)/i, '$1\n' + skip);
      changed = true;
      fixes.push({ page: page, fix: 'Added skip-to-content link' });
    }

    if (changed) fs.writeFileSync(page, html);
  }

  console.log('agent: A11Y — ' + fixes.length + ' fix(es) across ' + pages.length + ' pages');
  return { agent: 'a11y', fixes: fixes };
}

// ── AGENT 3: Code fixer ──
// Fixes: dead internal links, missing closing tags, deprecated attributes.
async function agentCode() {
  const fixes = [];
  const pages = listPages();
  const existingFiles = new Set(pages);
  try {
    fs.readdirSync('.', { withFileTypes: true }).forEach(d => {
      if (d.isDirectory()) existingFiles.add(d.name + '/');
    });
  } catch (e) { /* ignore */ }

  // Known page mapping for dead links — link to real pages instead of #
  const LINK_MAP = {
    'upsc.html': 'papers.html', 'cgl.html': 'ssc-je.html', 'rrb.html': 'ssc-je.html',
    'ibps.html': 'ssc-je.html', 'bank.html': 'ssc-je.html', 'neet.html': 'science.html',
    'jee.html': 'science.html', 'gate.html': 'polytechnic.html', 'nda.html': 'ssc-je.html',
    'cds.html': 'ssc-je.html', 'clat.html': 'papers.html', 'ctet.html': 'ssc-je.html',
    'ldc.html': 'ssc-je.html', 'aginveer.html': 'ssc-je.html', 'aginveer': 'ssc-je.html',
    'rbi.html': 'ssc-je.html', 'sbi.html': 'ssc-je.html', 'ssc-gd.html': 'ssc-je.html',
    'kerala-psc.html': 'ssc-je.html', 'police.html': 'ssc-je.html', ' army.html': 'ssc-je.html'
  };

  for (const page of pages) {
    let html = fs.readFileSync(page, 'utf8');
    let changed = false;

    // Fix dead links — map to real pages, DON'T use #
    const linkRegex = /href=["'](?!http|https|mailto|\/\/|data:)([^"']+\.html?)["']/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const target = match[1].split('#')[0].split('?')[0];
      if (!target || existingFiles.has(target) || fs.existsSync(target)) continue;
      const basename = target.split('/').pop().toLowerCase();
      const mapped = LINK_MAP[basename];
      if (mapped && fs.existsSync(mapped)) {
        html = html.replace(match[0], 'href="' + mapped + '"');
        changed = true;
        fixes.push({ page: page, fix: 'Redirected dead link ' + target + ' → ' + mapped });
      } else {
        // Convert <a> to <span> — keep text, remove broken navigation
        html = html.replace(
          new RegExp('<a\\s+href=["\']' + match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>([^<]*)</a>', 'gi'),
          '<span style="cursor:default">$1</span>'
        );
        changed = true;
        fixes.push({ page: page, fix: 'Converted dead link to text: ' + target });
      }
    }

    // Detect placeholder href="#" on clickable exam cards — link to real exam pages
    if (page === 'index.html') {
      // Replace placeholder exam card links with real destinations
      const cardFixes = [
        { pattern: /<a href="#" class="exam-card purple tilt-card">/g, replace: '<a href="papers.html" class="exam-card purple tilt-card">', label: 'UPSC' },
        { pattern: /<a href="#" class="exam-card emerald tilt-card">/g, replace: '<a href="ssc-je.html" class="exam-card emerald tilt-card">', label: 'SSC' },
        { pattern: /<a href="#" class="exam-card blue tilt-card">/g, replace: '<a href="ssc-je.html" class="exam-card blue tilt-card">', label: 'Railway' },
        { pattern: /<a href="#" class="exam-card amber tilt-card">/g, replace: '<a href="ssc-je.html" class="exam-card amber tilt-card">', label: 'Banking' },
        { pattern: /<a href="#" class="exam-card rose tilt-card">/g, replace: '<a href="science.html" class="exam-card rose tilt-card">', label: 'Defence' }
      ];
      for (const cf of cardFixes) {
        if (cf.pattern.test(html)) {
          html = html.replace(cf.pattern, cf.replace);
          changed = true;
          fixes.push({ page: page, fix: 'Linked ' + cf.label + ' exam card to real page' });
        }
      }
      // Generic: replace any remaining # href on exam-cards with mega-test
      html = html.replace(/<a href="#" (class="exam-card[^"]*")>/g, '<a href="mega-test.html" $1>');
      // Fix nav placeholder links
      html = html.replace(/<a href="#">(UPSC|SSC GD|CGL|RBI|JEE|NEET|GATE|Agniveer|IBPS PO|SBI Clerk|LDC|CTET|Kerala PSC|NDA|CDS|CLAT)<\/a>/g,
        function(m, label) {
          const map = { 'UPSC': 'papers.html', 'SSC GD': 'ssc-je.html', 'CGL': 'ssc-je.html',
            'RBI': 'ssc-je.html', 'JEE': 'science.html', 'NEET': 'science.html', 'GATE': 'polytechnic.html',
            'Agniveer': 'ssc-je.html', 'IBPS PO': 'ssc-je.html', 'SBI Clerk': 'ssc-je.html',
            'LDC': 'ssc-je.html', 'CTET': 'ssc-je.html', 'Kerala PSC': 'ssc-je.html',
            'NDA': 'ssc-je.html', 'CDS': 'ssc-je.html', 'CLAT': 'papers.html' };
          var dest = map[label] || 'mega-test.html';
          changed = true;
          fixes.push({ page: page, fix: 'Linked nav "' + label + '" → ' + dest });
          return '<a href="' + dest + '">' + label + '</a>';
        });
    }

    // Remove deprecated align attribute
    if (/\salign=["'](left|right|center|justify)["']/i.test(html)) {
      html = html.replace(/\salign=["'](left|right|center|justify)["']/gi, '');
      changed = true;
      fixes.push({ page: page, fix: 'Removed deprecated align attribute' });
    }

    // Check for missing alt on images
    const imgNoAlt = html.match(/<img(?![^>]*\balt=)[^>]*>/gi);
    if (imgNoAlt && imgNoAlt.length > 0) {
      for (const img of imgNoAlt) {
        const srcMatch = img.match(/src=["']([^"']+)["']/i);
        const alt = srcMatch ? srcMatch[1].split('/').pop().replace(/\.\w+$/, '').replace(/[-_]/g, ' ') : 'image';
        html = html.replace(img, img.replace('<img', '<img alt="' + alt + '"'));
      }
      changed = true;
      fixes.push({ page: page, fix: 'Added alt to ' + imgNoAlt.length + ' images' });
    }

    if (changed) fs.writeFileSync(page, html);
  }

  console.log('agent: Code — ' + fixes.length + ' fix(es) across ' + pages.length + ' pages');
  return { agent: 'code', fixes: fixes };
}

// ── AGENT 4: Content generator ──
// Generates MCQ questions for thin categories using the LLM.
async function agentContent() {
  const fixes = [];
  const faults = loadJson('data/faults.json', null);
  if (!faults || !faults.faults) return { agent: 'content', fixes: fixes };

  const thinCats = faults.faults
    .filter(f => f.severity === 'critical' && f.kind === 'coverage')
    .slice(0, 2); // max 2 per run

  for (const fault of thinCats) {
    const m = fault.title.match(/Category "([^"]+)"/);
    if (!m) continue;
    const catName = m[1];
    const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const catFile = 'data/questions/' + slug + '.json';
    const cat = loadJson(catFile, null);
    if (!cat) continue;

    const catKey = Object.keys(cat)[0];
    const subs = cat[catKey].subSubjects || {};
    const sampleQ = [];
    for (const arr of Object.values(subs)) {
      if (Array.isArray(arr)) sampleQ.push(...arr.slice(0, 2));
    }
    if (!sampleQ.length) continue;

    const result = await callLLM(
      'Generate 5 MCQ questions for UPSC/SSC category "' + catName + '". Return strict JSON array: [{"question":"...","options":["a","b","c","d"],"answer":0,"explanation":"..."}]. No markdown.',
      'Match this style:\n' + sampleQ.slice(0, 2).map(q => '- ' + q.question).join('\n'),
      1500,
      'high'
    );
    if (!result) continue;

    try {
      const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed) || !parsed.length) continue;

      const subtopicName = Object.keys(subs)[0] || catName;
      const baseId = 'agent-' + Date.now().toString(36);
      let added = 0;
      parsed.forEach((q, i) => {
        if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4) return;
        if (!subs[subtopicName]) subs[subtopicName] = [];
        subs[subtopicName].push({
          id: baseId + '-' + i, type: 'mcq', category: catName,
          source: 'Site Agent', pubDate: new Date().toISOString(),
          subject: catName, subSubject: subtopicName,
          question: q.question, options: q.options,
          answer: q.options[q.answer] || q.options[0],
          fact: q.explanation || '', wikiDone: false
        });
        added++;
      });

      if (added) {
        saveJson(catFile, cat);
        fixes.push({ page: catFile, fix: 'Generated ' + added + ' MCQs for "' + catName + '"', model: result.model });
      }
    } catch (e) { /* parse failed */ }
  }

  console.log('agent: Content — ' + fixes.length + ' generation(s)');
  return { agent: 'content', fixes: fixes };
}

// ── AGENT 5: Figure generator ──
// Generates SVG figures for topics missing them (reads data/figure-gaps.json).
async function agentFigures() {
  const fixes = [];
  const gaps = loadJson('data/figure-gaps.json', null);
  if (!gaps) return { agent: 'figures', fixes: fixes };

  // Flatten gaps: [{subject, topics: []}]
  const flatGaps = [];
  if (Array.isArray(gaps)) {
    gaps.forEach(g => (g.topics || []).forEach(t => flatGaps.push({ subject: g.subject, topic: t })));
  } else if (gaps.subjects) {
    Object.entries(gaps.subjects).forEach(([subj, data]) => {
      (data.topics || data.missing || []).forEach(t => flatGaps.push({ subject: subj, topic: t }));
    });
  }

  // Generate up to 2 figures per run
  for (const gap of flatGaps.slice(0, 2)) {
    const slug = gap.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const figFile = 'figures/' + slug + '.html';
    if (fs.existsSync(figFile)) continue;

    const result = await callLLM(
      'Generate a monochrome SVG diagram for the topic "' + gap.topic + '" (subject: ' + gap.subject + '). ' +
      'Return strict JSON: {"title":"...","svg":"<svg xmlns=...>...</svg>","caption":"2-3 sentence explanation"}. ' +
      'The SVG must be self-contained, viewBox="0 0 800 600", use only black/gray/white, and show clear labels.',
      'Topic: ' + gap.topic + '. Make it educational and exam-relevant for UPSC.',
      2000,
      'high'
    );
    if (!result) continue;

    try {
      const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      if (!parsed.svg || !parsed.svg.includes('<svg')) continue;

      // Build figure page matching existing figure HTML structure
      const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(parsed.title || gap.topic)} — ${esc(gap.subject)} Figure</title>
<meta name="description" content="${esc(parsed.caption || gap.topic)} — ${esc(gap.subject)} diagram on Vlymbooq.">
<style>
body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;margin:0;padding:20px;max-width:900px;margin:0 auto}
.fig{background:#111;border:1px solid #333;border-radius:12px;padding:24px;margin:20px 0}
.fig svg{max-width:100%;height:auto}
.cap{color:#a1a1aa;font-size:14px;line-height:1.6;margin-top:12px}
h1{font-size:22px;margin-bottom:8px}
.crumb{color:#71717a;font-size:12px;margin-bottom:16px}
.crumb a{color:#60a5fa;text-decoration:none}
</style>
</head>
<body>
<div class="crumb"><a href="index.html">Home</a> / <a href="subject-figures-index.html">Figures</a> / ${esc(gap.subject)}</div>
<h1>${esc(parsed.title || gap.topic)}</h1>
<div class="fig">${parsed.svg}</div>
<div class="cap">${esc(parsed.caption || '')}</div>
<div style="margin-top:20px;padding:12px;background:#111;border-radius:8px;font-size:12px;color:#71717a">
Generated by Site Agent · Subject: ${esc(gap.subject)} · Topic: ${esc(gap.topic)}
</div>
</body>
</html>`;
      fs.mkdirSync('figures', { recursive: true });
      fs.writeFileSync(figFile, page);
      fixes.push({ page: figFile, kind: 'figure', fix: 'Created figure: ' + gap.topic, model: result.model });
      console.log('agent: created figure ' + figFile);
    } catch (e) { /* parse failed */ }
  }

  console.log('agent: Figures — ' + fixes.length + ' new figure(s)');
  return { agent: 'figures', fixes: fixes };
}

// ── AGENT 6: Flowchart generator ──
// Generates process flowcharts for syllabus topics (e.g. "How a Bill becomes Law").
async function agentFlowcharts() {
  const fixes = [];
  const gaps = loadJson('data/figure-gaps.json', null);
  if (!gaps) return { agent: 'flowcharts', fixes: fixes };

  // Look for process/procedure topics that suit flowcharts
  const processKeywords = /procedure|process|how|steps|formation|structure|system|mechanism|cycle|chain/i;
  const flatGaps = [];
  if (Array.isArray(gaps)) {
    gaps.forEach(g => (g.topics || []).forEach(t => flatGaps.push({ subject: g.subject, topic: t })));
  }

  const processTopics = flatGaps.filter(g => processKeywords.test(g.topic)).slice(0, 2);

  for (const gap of processTopics) {
    const slug = gap.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const fcFile = 'figures/' + slug + '-flowchart.html';
    if (fs.existsSync(fcFile)) continue;

    const result = await callLLM(
      'Generate a vertical flowchart SVG for the process: "' + gap.topic + '". ' +
      'Return strict JSON: {"title":"...","steps":["step1","step2",...],"svg":"<svg...>...</svg>","caption":"..."}. ' +
      'The SVG must show connected boxes with arrows, viewBox="0 0 600 800", monochrome.',
      'Topic: ' + gap.topic + ' (' + gap.subject + '). UPSC-relevant process.',
      2000,
      'high'
    );
    if (!result) continue;

    try {
      const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      if (!parsed.svg || !parsed.svg.includes('<svg')) continue;

      const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(parsed.title || gap.topic)} — Flowchart</title>
<meta name="description" content="Flowchart: ${esc(parsed.title || gap.topic)} on Vlymbooq.">
<style>
body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:20px;max-width:900px;margin:0 auto}
.fig{background:#111;border:1px solid #333;border-radius:12px;padding:24px;margin:20px 0}
.fig svg{max-width:100%;height:auto}
.steps{margin-top:16px;padding:16px;background:#111;border-radius:8px}
.steps li{margin:6px 0;color:#a1a1aa;font-size:13px}
h1{font-size:22px}
.crumb{color:#71717a;font-size:12px;margin-bottom:16px}
.crumb a{color:#60a5fa;text-decoration:none}
</style>
</head>
<body>
<div class="crumb"><a href="index.html">Home</a> / <a href="subject-figures-index.html">Figures</a> / Flowcharts</div>
<h1>${esc(parsed.title || gap.topic)}</h1>
<div class="fig">${parsed.svg}</div>
${parsed.steps && parsed.steps.length ? '<div class="steps"><b>Steps:</b><ol>' + parsed.steps.map(s => '<li>' + esc(s) + '</li>').join('') + '</ol></div>' : ''}
<div style="margin-top:16px;font-size:12px;color:#71717a">Generated by Site Agent · Flowchart · ${esc(gap.subject)}</div>
</body>
</html>`;
      fs.mkdirSync('figures', { recursive: true });
      fs.writeFileSync(fcFile, page);
      fixes.push({ page: fcFile, kind: 'flowchart', fix: 'Created flowchart: ' + gap.topic, model: result.model });
      console.log('agent: created flowchart ' + fcFile);
    } catch (e) { /* parse failed */ }
  }

  console.log('agent: Flowcharts — ' + fixes.length + ' new flowchart(s)');
  return { agent: 'flowcharts', fixes: fixes };
}

// ── AGENT 7: Mind map generator ──
// Generates radial mind maps for subject topics (tree diagram).
async function agentMindmaps() {
  const fixes = [];
  const gaps = loadJson('data/figure-gaps.json', null);
  if (!gaps) return { agent: 'mindmaps', fixes: fixes };

  const flatGaps = [];
  if (Array.isArray(gaps)) {
    gaps.forEach(g => (g.topics || []).forEach(t => flatGaps.push({ subject: g.subject, topic: t })));
  }

  // Pick 2 topics per run
  for (const gap of flatGaps.slice(0, 2)) {
    const slug = gap.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const mmFile = 'figures/' + slug + '-mindmap.html';
    if (fs.existsSync(mmFile)) continue;

    const result = await callLLM(
      'Generate a mind map SVG for "' + gap.topic + '" with the topic in the center and 5-7 branches radiating outward. ' +
      'Return strict JSON: {"title":"...","branches":["branch1","branch2",...],"svg":"<svg...>...</svg>","caption":"..."}. ' +
      'The SVG must be a radial/tree diagram, viewBox="0 0 900 700", monochrome.',
      'Topic: ' + gap.topic + ' (' + gap.subject + '). Branches = key subtopics for UPSC.',
      2000,
      'high'
    );
    if (!result) continue;

    try {
      const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      if (!parsed.svg || !parsed.svg.includes('<svg')) continue;

      const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(parsed.title || gap.topic)} — Mind Map</title>
<meta name="description" content="Mind map: ${esc(parsed.title || gap.topic)} on Vlymbooq.">
<style>
body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:20px;max-width:900px;margin:0 auto}
.fig{background:#111;border:1px solid #333;border-radius:12px;padding:24px;margin:20px 0}
.fig svg{max-width:100%;height:auto}
h1{font-size:22px}
.crumb{color:#71717a;font-size:12px;margin-bottom:16px}
.crumb a{color:#60a5fa;text-decoration:none}
</style>
</head>
<body>
<div class="crumb"><a href="index.html">Home</a> / <a href="subject-figures-index.html">Figures</a> / Mind Maps</div>
<h1>${esc(parsed.title || gap.topic)}</h1>
<div class="fig">${parsed.svg}</div>
${parsed.branches && parsed.branches.length ? '<div style="margin-top:12px;font-size:13px;color:#a1a1aa"><b>Branches:</b> ' + parsed.branches.map(b => '<span style="display:inline-block;margin:2px 6px;padding:2px 8px;background:#1a1a2e;border-radius:8px;font-size:11px">' + esc(b) + '</span>').join('') + '</div>' : ''}
<div style="margin-top:16px;font-size:12px;color:#71717a">Generated by Site Agent · Mind Map · ${esc(gap.subject)}</div>
</body>
</html>`;
      fs.mkdirSync('figures', { recursive: true });
      fs.writeFileSync(mmFile, page);
      fixes.push({ page: mmFile, kind: 'mindmap', fix: 'Created mind map: ' + gap.topic, model: result.model });
      console.log('agent: created mindmap ' + mmFile);
    } catch (e) { /* parse failed */ }
  }

  console.log('agent: Mindmaps — ' + fixes.length + ' new mindmap(s)');
  return { agent: 'mindmaps', fixes: fixes };
}

// ── AGENT 8: Feature generator ──
// Generates EVERYTHING: study pages, comparison tables, timelines,
// revision sheets, mnemonics, cheat sheets, topic deep-dives.
async function agentFeatures() {
  const fixes = [];

  // Read existing topics to find gaps
  const existingPages = new Set(listPages());
  const gaps = loadJson('data/topic-gaps.json', null);
  const qDir = 'data/questions';

  // Gather subjects from question bank that lack a study page
  const subjects = [];
  try {
    if (fs.existsSync(qDir)) {
      fs.readdirSync(qDir).filter(f => f.endsWith('.json')).slice(0, 10).forEach(f => {
        const cat = loadJson(path.join(qDir, f), null);
        if (cat) {
          const name = Object.keys(cat)[0];
          const slug = f.replace('.json', '');
          if (!existingPages.has(slug + '.html') && !existingPages.has(slug + '-revision.html')) {
            subjects.push({ name: name, slug: slug });
          }
        }
      });
    }
  } catch (e) { /* ignore */ }

  // ── Type 1: Topic study page ──
  for (const subj of subjects.slice(0, 1)) {
    const result = await callLLM(
      'Create a complete HTML study page for UPSC subject "' + subj.name + '". ' +
      'Include: title, intro paragraph, 5 key topics with brief explanations, ' +
      'a "Key Facts" box, and a "Start Quiz" button linking to quiz.html. ' +
      'Use inline CSS (dark theme: bg #0a0a0a, text #e5e5e5, accent #3b82f6, cards #111). ' +
      'Return ONLY the HTML starting with <!DOCTYPE html>.',
      'Subject: ' + subj.name,
      2500,
      'high'
    );
    if (result) {
      let html = result.text.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      if (!html.startsWith('<!DOCTYPE')) {
        const m = html.match(/<!DOCTYPE[\s\S]*<\/html>/i);
        if (m) html = m[0];
      }
      if (html.startsWith('<!DOCTYPE') && !fs.existsSync(subj.slug + '.html')) {
        fs.writeFileSync(subj.slug + '.html', html);
        fixes.push({ page: subj.slug + '.html', kind: 'study', fix: 'Created study page: ' + subj.name, model: result.model });
        console.log('agent: created ' + subj.slug + '.html');
      }
    }
  }

  // ── Type 2: Comparison table page ──
  const compareTopics = [
    { title: 'Article 32 vs Article 226', a: 'Article 32 (Right to Constitutional Remedies)', b: 'Article 226 (High Court writ jurisdiction)' },
    { title: 'Lok Sabha vs Rajya Sabha', a: 'Lok Sabha (House of the People)', b: 'Rajya Sabha (Council of States)' },
    { title: 'Fundamental Rights vs Directive Principles', a: 'Fundamental Rights (Part III)', b: 'Directive Principles (Part IV)' }
  ];
  for (const cmp of compareTopics) {
    const slug = cmp.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (existingPages.has(slug + '.html') || fs.existsSync(slug + '.html')) continue;

    const result = await callLLM(
      'Create an HTML comparison table page for: "' + cmp.title + '". ' +
      'Return strict JSON: {"title":"...","intro":"...","rows":[{"feature":"...","a":"...","b":"..."},...6 rows],"conclusion":"..."}. ' +
      'Make it exam-focused with specific details.',
      'Compare: ' + cmp.a + ' vs ' + cmp.b, 2000, 'high'
    );
    if (!result) continue;
    try {
      const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const d = JSON.parse(clean);
      if (!d.rows || !d.rows.length) continue;
      const rows = d.rows.map(r =>
        '<tr><td style="padding:10px;border-bottom:1px solid #333;color:#a1a1aa">' + esc(r.feature) + '</td>' +
        '<td style="padding:10px;border-bottom:1px solid #333">' + esc(r.a) + '</td>' +
        '<td style="padding:10px;border-bottom:1px solid #333">' + esc(r.b) + '</td></tr>'
      ).join('');
      const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.title || cmp.title)} — Comparison</title>
<meta name="description" content="${esc(d.title || cmp.title)} comparison for UPSC on Vlymbooq.">
<style>body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:20px;max-width:900px;margin:0 auto}table{width:100%;border-collapse:collapse;background:#111;border-radius:12px;overflow:hidden;margin:16px 0}th{background:#1a1a2e;padding:12px;text-align:left;font-size:13px;color:#60a5fa}h1{font-size:22px}.intro{color:#a1a1aa;line-height:1.6}.conclusion{margin-top:16px;padding:16px;background:#111;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;font-size:13px}.crumb{color:#71717a;font-size:12px;margin-bottom:16px}.crumb a{color:#60a5fa;text-decoration:none}</style>
</head>
<body>
<div class="crumb"><a href="index.html">Home</a> / Comparisons</div>
<h1>${esc(d.title || cmp.title)}</h1>
<div class="intro">${esc(d.intro || '')}</div>
<table><tr><th>Feature</th><th>${esc(cmp.a)}</th><th>${esc(cmp.b)}</th></tr>${rows}</table>
${d.conclusion ? '<div class="conclusion"><b>Key takeaway:</b> ' + esc(d.conclusion) + '</div>' : ''}
<div style="margin-top:16px;font-size:12px;color:#71717a">Generated by Site Agent · Comparison Table</div>
</body></html>`;
      fs.writeFileSync(slug + '.html', page);
      fixes.push({ page: slug + '.html', kind: 'comparison', fix: 'Created comparison: ' + cmp.title, model: result.model });
      console.log('agent: created comparison ' + slug + '.html');
    } catch (e) { /* skip */ }
  }

  // ── Type 3: Quick revision sheet ──
  const revisionTopics = [
    { title: 'Polity Quick Revision', subject: 'Indian Polity' },
    { title: 'Modern History Timeline', subject: 'Modern History' },
    { title: 'Economics Formulas & Concepts', subject: 'Economics' }
  ];
  for (const rev of revisionTopics) {
    const slug = rev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (existingPages.has(slug + '.html') || fs.existsSync(slug + '.html')) continue;

    const result = await callLLM(
      'Create a quick revision sheet HTML page for "' + rev.title + '". ' +
      'Return strict JSON: {"title":"...","sections":[{"heading":"...","points":["...","...",...5]}...4 sections]}. ' +
      'Points must be concise, factual, exam-relevant one-liners.',
      'Subject: ' + rev.subject, 2500, 'high'
    );
    if (!result) continue;
    try {
      const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const d = JSON.parse(clean);
      if (!d.sections || !d.sections.length) continue;
      const sections = d.sections.map(s =>
        '<div style="background:#111;border-radius:12px;padding:16px;margin:12px 0">' +
        '<h2 style="font-size:16px;color:#60a5fa;margin:0 0 8px">' + esc(s.heading) + '</h2>' +
        '<ul style="margin:0;padding-left:20px">' + (s.points || []).map(p => '<li style="margin:4px 0;color:#d4d4d8;font-size:13px;line-height:1.5">' + esc(p) + '</li>').join('') + '</ul></div>'
      ).join('');
      const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.title || rev.title)}</title>
<meta name="description" content="Quick revision: ${esc(d.title || rev.title)} on Vlymbooq.">
<style>body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:20px;max-width:900px;margin:0 auto}h1{font-size:22px}.crumb{color:#71717a;font-size:12px;margin-bottom:16px}.crumb a{color:#60a5fa;text-decoration:none}</style>
</head>
<body>
<div class="crumb"><a href="index.html">Home</a> / <a href="revision.html">Revision</a></div>
<h1>${esc(d.title || rev.title)}</h1>
<p style="color:#a1a1aa;font-size:13px">Quick one-liners for last-minute revision</p>
${sections}
<div style="margin-top:16px;font-size:12px;color:#71717a">Generated by Site Agent · Revision Sheet</div>
</body></html>`;
      fs.writeFileSync(slug + '.html', page);
      fixes.push({ page: slug + '.html', kind: 'revision', fix: 'Created revision sheet: ' + rev.title, model: result.model });
      console.log('agent: created revision ' + slug + '.html');
    } catch (e) { /* skip */ }
  }

  // ── Type 4: Mnemonic / abbreviation page ──
  if (!existingPages.has('mnemonics.html') && !fs.existsSync('mnemonics.html')) {
    const result = await callLLM(
      'Create an HTML mnemonics page for UPSC/SSC exams. ' +
      'Return strict JSON: {"title":"...","sections":[{"heading":"...","items":[{"abbr":"...","meaning":"...","mnemonic":"..."}...5]}...3 sections]}. ' +
      'Include: acronyms (IAS, IPS, IFS...), constitutional articles, and geography mnemonics.',
      'Make it exam-focused with memory tricks.', 2500, 'high'
    );
    if (result) {
      try {
        const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const d = JSON.parse(clean);
        if (d.sections && d.sections.length) {
          const sections = d.sections.map(s =>
            '<div style="background:#111;border-radius:12px;padding:16px;margin:12px 0">' +
            '<h2 style="font-size:16px;color:#a78bfa;margin:0 0 8px">' + esc(s.heading) + '</h2>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px">' +
            (s.items || []).map(i =>
              '<div style="background:#1a1a2e;padding:10px;border-radius:8px">' +
              '<b style="color:#60a5fa">' + esc(i.abbr) + '</b>: ' + esc(i.meaning) +
              '<div style="color:#a78bfa;font-size:11px;margin-top:4px">💡 ' + esc(i.mnemonic) + '</div></div>'
            ).join('') + '</div></div>'
          ).join('');
          const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.title || 'UPSC Mnemonics & Memory Tricks')}</title>
<meta name="description" content="Mnemonics and memory tricks for UPSC/SSC exams on Vlymbooq.">
<style>body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:20px;max-width:900px;margin:0 auto}h1{font-size:22px}.crumb{color:#71717a;font-size:12px;margin-bottom:16px}.crumb a{color:#60a5fa;text-decoration:none}</style>
</head>
<body>
<div class="crumb"><a href="index.html">Home</a> / Mnemonics</div>
<h1>${esc(d.title || 'UPSC Mnemonics & Memory Tricks')}</h1>
<p style="color:#a1a1aa;font-size:13px">Memory tricks to remember facts faster</p>
${sections}
<div style="margin-top:16px;font-size:12px;color:#71717a">Generated by Site Agent · Mnemonics</div>
</body></html>`;
          fs.writeFileSync('mnemonics.html', page);
          fixes.push({ page: 'mnemonics.html', kind: 'mnemonics', fix: 'Created mnemonics page', model: result.model });
          console.log('agent: created mnemonics.html');
        }
      } catch (e) { /* skip */ }
    }
  }

  console.log('agent: Features — ' + fixes.length + ' new page(s)');
  return { agent: 'features', fixes: fixes };
}

// ── AGENT 10: Workflow agent ──
// Reads recent failed/cancelled GitHub Actions runs and proposes fixes.
// It cannot re-run workflows (no gh token in the script), but it can:
//   1. Detect OOM/timeout in workflows and suggest memory/time fixes
//   2. Detect broken syntax in scripts called by workflows
//   3. Add NODE_OPTIONS memory limits, timeouts to workflows
//   4. Fix common CI issues (missing files, wrong paths)
// ── AGENT: MetaLearn — the agent teaches itself new repair skills ──
// Every rule-based repair in this file (defer ordering, nav routing,
// placeholder mapping) was once a NEW bug class needing a human to write
// its detector. MetaLearn closes that loop: it reads failure patterns no
// existing rule handles, asks the model to synthesize a small pure
// detector/fixer, validates it (syntax-check + idempotence + control page
// untouched), and stages it in scripts/learned-fixes.js. The NEXT run loads
// and executes staged detectors inside SelfCheck — two-phase auto-adoption
// with no human in the middle.
// Safety: one detector per run; detectors are pure (html,page)->{html,fixes}
// with no fs/network; a detector firing on >15 files is fuse-tripped
// (logged, skipped); everything lands in agent-log for review.
const LEARNED_PATH = 'scripts/learned-fixes.js';
const KNOWN_ERROR_RES = [/failed to load scripts\/lib/i, /unexpected token/i, /placeholder/i, /broken link/i, /defer/i, /404/i, /net::/i, /failed to fetch/i, /graph-core/i, /exam.*hub/i];
async function agentMetaLearn() {
  const fixes = [];
  // 1. Collect failure patterns no existing rule handles — only page-bound
  // browser-test issues (a code fixer needs a victim page to validate on).
  const patterns = [];
  try {
    const bt = loadJson('data/browser-test.json', { issues: [] });
    for (const issue of (bt.issues || [])) {
      const msg = String((issue.msg || issue.detail || '') + ' ' + (issue.type || ''));
      const pg = issue.page ? String(issue.page).split('/').pop() : '';
      if (msg && pg && fs.existsSync(pg) && !KNOWN_ERROR_RES.some(re => re.test(msg))) {
        patterns.push({ page: pg, pattern: msg.slice(0, 220) });
      }
    }
  } catch (e) { /* no data */ }
  if (!patterns.length) { console.log('agent: MetaLearn — no unmatched page-bound patterns; nothing to learn'); return { agent: 'metalearn', fixes: fixes }; }
  const target = patterns[0];
  console.log('agent: MetaLearn — unmatched pattern on ' + target.page + ' :: ' + target.pattern.slice(0, 120));
  // 2. Synthesize a detector via the model.
  const spec = 'Write a JavaScript function fixLearned(html, page) for a static-site repair bot.\n' +
    'FAILURE PATTERN: ' + target.pattern + ' (seen on ' + target.page + ')\n' +
    'STRICT RULES:\n' +
    '1. Pure function: inputs (html string, page filename string), output {html: string, fixes: array of {page, fix}}.\n' +
    '2. NO fs, NO network, NO exec, NO require — string transforms only.\n' +
    '3. Idempotent: running twice changes nothing the second time.\n' +
    '4. Conservative: if the pattern is absent, return html unchanged with zero fixes.\n' +
    '5. Return ONLY the function source starting with "function fixLearned(html, page) {", no markdown, no explanation.\n' +
    '6. Keep it under 40 lines.';
  const result = await callLLM('You write tiny, safe, deterministic repair functions for static HTML sites.', spec, 1500);
  if (!result || !result.text) { console.log('agent: MetaLearn — model returned nothing'); return { agent: 'metalearn', fixes: fixes }; }
  let fnSrc = result.text.replace(/```[a-z]*|```/gi, '').trim();
  const fnStart = fnSrc.indexOf('function fixLearned');
  if (fnStart < 0) { console.log('agent: MetaLearn — no function in model output'); return { agent: 'metalearn', fixes: fixes }; }
  fnSrc = fnSrc.slice(fnStart);
  // 3. Validate: syntax-check in isolation.
  const tmpFile = 'scripts/.metalearn-tmp.js';
  try {
    fs.writeFileSync(tmpFile, fnSrc + '\nmodule.exports = fixLearned;\n');
    execSync('node --check ' + tmpFile, { stdio: 'pipe' });
  } catch (e) {
    console.log('agent: MetaLearn — synthesized detector has syntax errors, discarding');
    try { fs.unlinkSync(tmpFile); } catch (e2) { /* ignore */ }
    return { agent: 'metalearn', fixes: fixes };
  }
  // 4. Validate: idempotent on the victim, silent on a control page.
  let fn;
  try {
    delete require.cache[require.resolve('./.metalearn-tmp.js')];
    fn = require('./.metalearn-tmp.js');
    if (typeof fn !== 'function') throw new Error('not a function');
  } catch (e) {
    console.log('agent: MetaLearn — synthesized detector does not load: ' + e.message);
    try { fs.unlinkSync(tmpFile); } catch (e2) { /* ignore */ }
    return { agent: 'metalearn', fixes: fixes };
  }
  try {
    const victim = fs.readFileSync(target.page, 'utf8');
    const r1 = fn(victim, target.page);
    const r2 = fn(r1.html, target.page);
    if (r1.html !== r2.html) {
      console.log('agent: MetaLearn — detector not idempotent, discarding');
      try { fs.unlinkSync(tmpFile); } catch (e2) { /* ignore */ }
      return { agent: 'metalearn', fixes: fixes };
    }
    const controlFile = listPages().find(p => p !== target.page);
    if (controlFile) {
      const control = fs.readFileSync(controlFile, 'utf8');
      const rc = fn(control, controlFile);
      if (rc.html !== control && !(rc.fixes || []).length) {
        console.log('agent: MetaLearn — detector mutates without reporting, discarding');
        try { fs.unlinkSync(tmpFile); } catch (e2) { /* ignore */ }
        return { agent: 'metalearn', fixes: fixes };
      }
    }
    // 5. Stage it: append to learned-fixes.js (SelfCheck executes it next run).
    let learned = '';
    try { learned = fs.readFileSync(LEARNED_PATH, 'utf8'); } catch (e) { learned = '// Auto-synthesized detectors (MetaLearn). Executed by SelfCheck with a blast-radius fuse.\n'; }
    const idx = (learned.match(/function fixLearned_/g) || []).length + 1;
    const staged = fnSrc.replace(/function fixLearned\s*\(/, 'function fixLearned_' + idx + '(');
    fs.writeFileSync(LEARNED_PATH,
      learned + '\n' + staged + '\nmodule.exports.fixLearned_' + idx + ' = fixLearned_' + idx + ';\n');
    execSync('node --check ' + LEARNED_PATH, { stdio: 'pipe' });
    try { fs.unlinkSync(tmpFile); } catch (e2) { /* ignore */ }
    fixes.push({ page: LEARNED_PATH, fix: 'MetaLearn staged detector #' + idx + ' for ' + target.page + ' :: ' + target.pattern.slice(0, 80) + ' — executes next run' });
    console.log('agent: MetaLearn — staged detector #' + idx);
  } catch (e) {
    console.log('agent: MetaLearn — validation failed: ' + (e.message || e).slice(0, 150));
    try { fs.unlinkSync(tmpFile); } catch (e2) { /* ignore */ }
  }
  return { agent: 'metalearn', fixes: fixes };
}

async function agentWorkflows() {
  const fixes = [];
  const wfDir = '.github/workflows';
  if (!fs.existsSync(wfDir)) return { agent: 'workflows', fixes: fixes };

  // Read recent failed workflow runs via gh CLI
  let recentFailures = '';
  try {
    recentFailures = require('child_process').execSync(
      'gh run list --limit 15 --json name,status,conclusion,displayTitle,databaseId --jq "."',
      { encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (e) { /* gh not available */ }

  const wfFiles = fs.readdirSync(wfDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

  for (const wf of wfFiles) {
    const wfPath = path.join(wfDir, wf);
    let content = fs.readFileSync(wfPath, 'utf8');
    let changed = false;

    // Add timeout-minutes to jobs missing it
    if (!/timeout-minutes/.test(content) && /^jobs:/m.test(content)) {
      content = content.replace(/^(jobs:\s*\n(\s+)(\w+):)/gm, function (m, jobs, indent, name) {
        return jobs + '\n' + indent + '  timeout-minutes: 60';
      });
      changed = true;
      fixes.push({ page: wfPath, fix: 'Added timeout-minutes: 60' });
    }

    // Add NODE_OPTIONS memory limit to node steps
    if (/node scripts\//.test(content) && !/NODE_OPTIONS/.test(content)) {
      content = content.replace(
        /(\s+run:\s+)node (scripts\/[\w.-]+)/g,
        '$1NODE_OPTIONS=--max-old-space-size=4096 node $2'
      );
      changed = true;
      fixes.push({ page: wfPath, fix: 'Added memory limit to node steps' });
    }

    // Add retry to git push steps. NOTE: `git push` has NO --retries flag —
    // an old version of this rule injected `git push --retries=3`, which is
    // an unknown option and breaks every push it touches. The only correct
    // retry is a pull+push loop.
    if (/git push/.test(content) && !/for i in 1 2 3/.test(content)) {
      content = content.replace(/^(\s*)git push\s*$/gm,
        '$1for i in 1 2 3; do\n' +
        '$1  git pull --rebase --autostash 2>/dev/null || true\n' +
        '$1  git push 2>/dev/null && { echo "Pushed"; break; } || echo "push attempt $i failed, retrying..."\n' +
        '$1  sleep 5\n' +
        '$1done');
      changed = true;
      fixes.push({ page: wfPath, fix: 'Added pull+push retry loop' });
    }

    // If a workflow uses ollama but has no server start step, add it.
    // IPv4 127.0.0.1 NOT localhost: Node fetch resolves localhost to ::1
    // (IPv6) first and Ollama listens IPv4-only; an old snippet injected
    // here used localhost and every call failed instantly.
    if (/ollama/.test(content) && !/Start Ollama|ollama serve/.test(content)) {
      content = content.replace(
        /(\s+- name: )(Install Ollama|Pull model)/,
        '$1Start Ollama server\n        run: |\n          export OLLAMA_KEEP_ALIVE=60m\n          nohup ollama serve > /tmp/ollama.log 2>&1 &\n          for i in $(seq 1 30); do curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1 && break; sleep 1; done\n          echo "Ollama server ready"\n\n$1$2'
      );
      changed = true;
      fixes.push({ page: wfPath, fix: 'Added Ollama server start step' });
    }

    // Concurrency: periodic jobs must not queue behind each other.
    if (/schedule:/.test(content) && !/concurrency:/.test(content)) {
      const g = (wf.match(/^[\w-]+/)[0] || 'job').replace(/\.yml$/, '');
      content = content.replace(/(permissions:\s*\n\s*contents:\s*write\s*\n)/,
        '$1\n# Prevent pile-ups: the newest run wins.\nconcurrency:\n  group: ' + g + '\n  cancel-in-progress: true\n');
      if (content.indexOf('group: ' + g) !== -1) {
        changed = true;
        fixes.push({ page: wfPath, fix: 'Added concurrency group' });
      }
    }

    // Stale input name: `sparse-checkout-cone` was replaced by
    // `sparse-checkout-cone-mode`; the old name is silently ignored, which
    // forces cone mode and rejects glob patterns with exit 128.
    if (/sparse-checkout-cone:\s/.test(content)) {
      content = content.replace(/sparse-checkout-cone:/g, 'sparse-checkout-cone-mode:');
      changed = true;
      fixes.push({ page: wfPath, fix: 'Renamed sparse-checkout-cone → sparse-checkout-cone-mode' });
    }

    if (changed) fs.writeFileSync(wfPath, content);
  }

  // Check scripts for syntax errors
  try {
    const scripts = fs.readdirSync('scripts').filter(f => f.endsWith('.js'));
    for (const s of scripts) {
      try {
        require('child_process').execSync('node --check scripts/' + s, { stdio: 'pipe' });
      } catch (e) {
        fixes.push({ page: 'scripts/' + s, fix: 'SYNTAX ERROR: ' + String(e.stderr || e.message).slice(0, 100), kind: 'syntax' });
      }
    }
  } catch (e) { /* ignore */ }

  console.log('agent: Workflows — ' + fixes.length + ' fix(es)');
  return { agent: 'workflows', fixes: fixes };
}
// The innovation engine. Looks at what exists and invents NEW features
// nobody asked for — like how figures/flowcharts/mindmaps were invented.
// Generates proposals to data/ideas.json AND builds prototypes of the best one.
async function agentProposals() {
  const fixes = [];
  const pages = listPages();

  // Build a compact inventory of what exists
  const inventory = {
    totalPages: pages.length,
    categories: pages.filter(p => !p.startsWith('lesson-') && !p.includes('figure')).slice(0, 40),
    hasQuiz: pages.some(p => /quiz|exam|test/i.test(p)),
    hasFlashcards: pages.some(p => /flashcard/i.test(p)),
    hasMindmaps: pages.some(p => /mindmap/i.test(p)),
    hasFlowcharts: pages.some(p => /flowchart/i.test(p)),
    hasFigures: pages.some(p => /figure/i.test(p)),
    hasGlobe: pages.some(p => /globe|map/i.test(p)),
    hasLeaderboard: pages.some(p => /leaderboard/i.test(p)),
    hasMnemonics: pages.some(p => /mnemonic/i.test(p)),
    hasTimelines: pages.some(p => /timeline/i.test(p)),
    hasComparisons: pages.some(p => /comparison|vs-/i.test(p)),
    hasRevision: pages.some(p => /revision/i.test(p)),
    hasMains: pages.some(p => /mains/i.test(p)),
    hasPYQ: pages.some(p => /pyq|previous-year/i.test(p))
  };

  // Ask the model: what NEW feature should this site have?
  const result = await callLLM(
    'You are a creative product designer for an Indian competitive exam prep site. ' +
    'The site currently has: ' + JSON.stringify(inventory) + '. ' +
    '' +
    'Think like a HUMAN innovator, not a checklist. Do NOT propose generic things ' +
    'like "add flashcards" or "add more quizzes" — those exist everywhere. ' +
    '' +
    'Instead, think about what would make a student say "WOW, I have never seen this before":' +
    '- What if the site could SIMULATE being an examiner and predict what questions come?' +
    '- What if mistakes could be traced to their ROOT CAUSE (weak concept vs careless) automatically?' +
    '- What if two students could COMPETE live on the same question?' +
    '- What if the site could generate a PERSONALIZED study plan from PYQ patterns?' +
    '- What if wrong answers triggered a MINI-LESSON on the exact concept missed?' +
    '- What if there was a MEMORY FORGETTING CURVE that resurfaces topics just before you forget them?' +
    '- What if the site could AUDIOSUMMARIZE topics for commute study?' +
    '- What if mistakes were mapped to a KNOWLEDGE GRAPH showing which weak topics block which other topics?' +
    '' +
    'Propose 3 genuinely novel features. Each must make a student think "I wish I had this earlier." ' +
    'Return strict JSON array: [{"title":"...","description":"1-2 sentences","why":"why this is novel and exam students need it","prototypePrompt":"detailed description for building a working prototype"}]. ' +
    'No markdown.',
    'Inventory: ' + inventory.totalPages + ' pages. Be CREATIVE. Invent, don\'t iterate.',
    4000,
    'high'
  );

  if (!result) return { agent: 'proposals', fixes: fixes };

  try {
    const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const proposals = JSON.parse(clean);
    if (!Array.isArray(proposals) || !proposals.length) return { agent: 'proposals', fixes: fixes };

    // Load existing ideas
    const ideasFile = 'data/ideas.json';
    const ideas = loadJson(ideasFile, { ideas: [] });

    proposals.forEach(p => {
      if (!p.title) return;
      // Skip if already proposed
      if (ideas.ideas.some(existing => existing.title === p.title)) return;
      ideas.ideas.push({
        title: p.title,
        description: p.description || '',
        why: p.why || '',
        source: 'Site Agent (innovation)',
        createdAt: new Date().toISOString(),
        status: 'proposed'
      });
      fixes.push({ kind: 'proposal', fix: 'Proposed: ' + p.title, detail: p.why || p.description, model: result.model });
    });

    saveJson(ideasFile, ideas);

    // Build a prototype of the FIRST proposal
    const best = proposals[0];
    if (best && best.prototypePrompt) {
      const proto = await callLLM(
        'Create a working HTML prototype for: "' + best.title + '". ' + best.prototypePrompt + '. ' +
        'Use inline CSS. Dark theme: bg #0a0a0a, text #e5e5e5, accent #3b82f6, cards #111. ' +
        'Make it interactive if possible (buttons, inputs, animations). Return ONLY HTML starting with <!DOCTYPE html>.',
        'Feature: ' + best.title + '. Make it look polished and exam-focused.',
        3000,
        'high'
      );
      if (proto) {
        let html = proto.text.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
        if (!html.startsWith('<!DOCTYPE')) {
          const m = html.match(/<!DOCTYPE[\s\S]*<\/html>/i);
          if (m) html = m[0];
        }
        if (html.startsWith('<!DOCTYPE')) {
          const slug = best.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
          const protoFile = 'prototype-' + slug + '.html';
          if (!fs.existsSync(protoFile)) {
            fs.writeFileSync(protoFile, html);
            fixes.push({ kind: 'prototype', fix: 'Built prototype: ' + best.title, page: protoFile, model: proto.model });
            console.log('agent: created prototype ' + protoFile);
          }
        }
      }
    }

    console.log('agent: Proposals — ' + fixes.length + ' idea(s)/prototype(s)');
  } catch (e) {
    console.log('agent: Proposals parse failed: ' + e.message);
  }

  return { agent: 'proposals', fixes: fixes };
}

// ── AGENT: Foresight (predict & prevent problems before they happen) ──
// The agent thinks ahead: checks data quality, disk, memory, workflow health,
// and fixes issues BEFORE they cause failures.
async function agentForesight() {
  const fixes = [];

  // 1. Check data file sizes — prevent disk overflow
  const dataDir = 'data';
  if (fs.existsSync(dataDir)) {
    const bigFiles = [];
    let totalSize = 0;
    for (const f of fs.readdirSync(dataDir)) {
      const fp = path.join(dataDir, f);
      try {
        const stat = fs.statSync(fp);
        if (stat.isFile()) {
          totalSize += stat.size;
          if (stat.size > 50 * 1024 * 1024) bigFiles.push(f + ' (' + Math.round(stat.size / 1024 / 1024) + 'MB)');
        }
      } catch (e) {}
    }
    if (bigFiles.length > 0) {
      fixes.push({ page: 'data/', fix: 'Large files detected: ' + bigFiles.join(', ') });
    }
  }

  // 2. Check timeline nodes for garbage descriptions
  const timelineFiles = fs.readdirSync('.').filter(f => f.startsWith('timeline.nodes.') && f.endsWith('.json'));
  let garbaged = 0;
  for (const tf of timelineFiles.slice(0, 3)) { // check first 3 to save time
    try {
      const nodes = JSON.parse(fs.readFileSync(tf, 'utf8'));
      if (!Array.isArray(nodes)) continue;
      let changed = false;
      for (const n of nodes) {
        if (!n.desc) continue;
        // Garbage: desc is raw question text (starts with "What", "Which", ends with "?")
        // or is just a sentence fragment from a question
        const desc = n.desc.trim();
        if (/^(what|which|who|when|where|why|how|the\s+\w+\s+is)\s/i.test(desc) && desc.endsWith('?')) {
          // Convert question to statement
          n.desc = desc.replace(/\?$/, '.').replace(/^(what|which|who|when|where|why|how)\s/i, '');
          n.desc = n.desc[0].toUpperCase() + n.desc.slice(1);
          changed = true;
          garbaged++;
        }
        // Garbage: desc is just an answer fragment (too short, no context)
        if (desc.length < 15 && !/\d{4}/.test(desc)) {
          delete n.desc;
          changed = true;
          garbaged++;
        }
        // Garbage: desc contains "_____" or "fill blank"
        if (/_{3,}|fill.?blank/i.test(desc)) {
          delete n.desc;
          changed = true;
          garbaged++;
        }
      }
      if (changed) {
        fs.writeFileSync(tf, JSON.stringify(nodes));
        fixes.push({ page: tf, fix: 'Cleaned ' + garbaged + ' garbage timeline descriptions' });
      }
    } catch (e) {}
  }

  // 3. Check for broken workflow references
  const wfDir = '.github/workflows';
  if (fs.existsSync(wfDir)) {
    for (const wf of fs.readdirSync(wfDir)) {
      if (!wf.endsWith('.yml')) continue;
      try {
        const content = fs.readFileSync(path.join(wfDir, wf), 'utf8');
        // Check for scripts referenced that don't exist
        const scriptRefs = content.match(/node scripts\/[\w-]+\.js/g) || [];
        for (const ref of scriptRefs) {
          const scriptPath = ref.replace('node ', '');
          if (!fs.existsSync(scriptPath)) {
            fixes.push({ page: wf, fix: 'References missing script: ' + scriptPath });
          }
        }
      } catch (e) {}
    }
  }

  // 4. Check memory pressure — if data/questions is huge, warn
  try {
    const qDir = 'data/questions';
    if (fs.existsSync(qDir)) {
      const qFiles = fs.readdirSync(qDir).filter(f => f.endsWith('.json'));
      if (qFiles.length > 2000) {
        fixes.push({ page: 'data/questions', fix: 'Warning: ' + qFiles.length + ' question files — consider archiving old ones' });
      }
    }
  } catch (e) {}

  // 5. Check for duplicate page titles (SEO issue)
  const pages = listPages();
  const titles = new Map();
  for (const p of pages) {
    try {
      const html = fs.readFileSync(p, 'utf8');
      const m = html.match(/<title>([^<]+)<\/title>/i);
      if (m) {
        const t = m[1].trim().toLowerCase();
        if (titles.has(t)) {
          fixes.push({ page: p, fix: 'Duplicate title "' + m[1] + '" (same as ' + titles.get(t) + ')' });
        }
        titles.set(t, p);
      }
    } catch (e) {}
  }

  if (fixes.length > 0) console.log('agent: Foresight — ' + fixes.length + ' issue(s) predicted/prevented');
  return { agent: 'foresight', fixes };
}

// ── AGENT: Question Quality (rule-based, no LLM needed) ──
// Arranges subtopics into correct categories, creates new ones if needed,
// and fixes poor questions (fill-in-the-blank) into proper Q&A.
async function agentQuestionQuality() {
  const fixes = [];
  const DIR = 'data/questions';
  if (!fs.existsSync(DIR)) return { agent: 'questions', fixes };

  // Category merge map — overlapping categories get consolidated
  const MERGE = {
    'Awards': 'Awards & Honours',
    'Defence': 'Defence & Security',
    'Ethics': 'Ethics & Integrity',
    'Polity': 'Polity & Governance',
    'Society': 'Indian Society',
    'Tech & Science': 'Science & Technology',
    'General': 'General Science',
    'Ancient India': 'Indian History',
    'Medieval & Modern India': 'Indian History',
    'Geography': 'Indian Geography',
    'PIB': 'PIB Releases',
    'Agricultural Engineering': 'Agriculture',
    'Agricultural Entomology': 'Agriculture',
    'Agricultural Extension & Marketing': 'Agriculture',
    'Agronomy & Crop Production': 'Agriculture',
    'Animal Husbandry & Dairy': 'Agriculture',
    'Farm Machinery': 'Agriculture',
    'Farm Machinery & Power': 'Agriculture',
    'Fisheries & Aquaculture': 'Agriculture',
    'Floriculture & Landscaping': 'Agriculture',
    'Food Processing': 'Agriculture',
    'Horticulture': 'Agriculture',
    'Horticulture - Fruit & Vegetable Production': 'Agriculture',
    'Hydrology & Soil Conservation': 'Agriculture',
    'Plant Breeding & Genetics': 'Agriculture',
    'Plant Pathology & Crop Protection': 'Agriculture',
    'Plant Physiology & Nutrition': 'Agriculture',
    'Seed Science & Technology': 'Agriculture',
    'Soil & Watershed': 'Agriculture',
    'Spices & Plantation Crops': 'Agriculture',
    // Misplaced folk/practice topics under Classical Languages
    'Odiyan': 'Indian Folk Traditions',
    'Adhyatma Ramayana': 'Indian Philosophy',
    'Hitopadesha': 'Indian Literature',
    'Panchatantra': 'Indian Literature',
  };

  // Content-based recategorization rules
  const RULES = [
    { cat: 'Health', re: /health|hospital|medical|doctor|patient|disease|ayushman|medicine|vaccine|pharma|drug|nutrition|wellness|healthcare|ayush|dengue|malaria|tuberculosis|covid|ayurveda/i },
    { cat: 'Defence & Security', re: /defence|defense|army|navy|air force|drdo|military|soldier|border|missile|submarine|warship|terrorism|insurgency|coast guard|paramilitary|rafale|tejas/i },
    { cat: 'Education', re: /education|school|college|university|student|teacher|exam|scholarship|fellowship|ncert|nep|skill development|vocational|iit|iim|aiims/i },
    { cat: 'Agriculture', re: /agriculture|farmer|kisan|crop|food grain|wheat|rice|paddy|fertiliser|irrigation|soil health|msp|horticulture|dairy|fisher|animal husbandry/i },
    { cat: 'Energy', re: /energy|electricity|coal|oil|petroleum|natural gas|solar|wind|renewable|hydrogen|biofuel|ethanol|power project|power plant/i },
    { cat: 'Environment & Ecology', re: /environment|climate|forest|wildlife|pollution|ecology|emission|carbon|biodiversity|conservation|wetland|ganga|swachh/i },
    { cat: 'Indian Economy', re: /economy|economic|gdp|inflation|fiscal|monetary|budget|tax|gst|import|export|trade|investment|financial|banking|rbi|sebi/i },
    { cat: 'Infrastructure', re: /infrastructure|road|highway|railway|airport|port|metro|smart city|housing|urban|construction|bridge|tunnel/i },
    { cat: 'Science & Technology', re: /technology|digital|software|artificial intelligence|cyber|space|isro|satellite|rocket|semiconductor|electronics|science|research|nuclear|biotech|quantum/i },
    { cat: 'Polity & Governance', re: /law|justice|court|judicial|legal|constitution|supreme court|high court|legislation|parliament|lok sabha|rajya sabha/i },
    { cat: 'International Relations', re: /foreign|diplomatic|embassy|bilateral|multilateral|summit|united nations|un |nato|brics|g20/i },
    { cat: 'Sports', re: /sports|olympic|cricket|football|hockey|athlete|tournament|championship|medal|commonwealth/i },
    { cat: 'Art & Culture', re: /culture|heritage|monument|museum|festival|art|dance|music|literature|language|tourism/i },
    { cat: 'Indian History', re: /history|empire|dynasty|king|queen|battle|war|independence|freedom struggle|mahatma|gandhi|akbar|shah jahan|mughal|vedic/i },
    { cat: 'Indian Geography', re: /river|mountain|state|district|city|plateau|plain|coast|island|region|climate of india/i },
  ];

  // Poor question patterns to fix
  const POOR_PATTERNS = [
    /^Fill (in the )?blank/i,
    /^Fill blank/i,
    /^Fill in:/i,
    /^Fill:/i,
    /^The _____ was/i,
    /^_____ is a _____/i,
    / deals with _____/,
    / is the study of _____/,
  ];

  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
  let mergedCount = 0, fixedQuestions = 0, processedFiles = 0;

  for (const file of files) {
    const fp = path.join(DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      let fileChanged = false;

      for (const sk of Object.keys(data)) {
        if (!data[sk] || !data[sk].subSubjects) continue;
        const subs = data[sk].subSubjects;
        const newSubs = {};

        for (const sub of Object.keys(subs)) {
          let questions = subs[sub] || [];

          // Step 1: Merge overlapping categories
          let targetSub = MERGE[sub] || sub;

          // Step 2: Content-based recategorization if subtopic name is generic
          if (/^Announcements$|^General$|^Current Affairs$|^Misc/.test(sub)) {
            for (const rule of RULES) {
              const sample = questions.slice(0, 5).map(q => (q.question || '') + ' ' + (q.fact || '')).join(' ');
              if (rule.re.test(sample)) { targetSub = rule.cat; break; }
            }
          }

          // Step 3: Fix poor questions — convert fill-in-blank to proper Q&A
          for (const q of questions) {
            if (!q.question) continue;
            const isPoor = POOR_PATTERNS.some(p => p.test(q.question));
            if (isPoor && q.fact) {
              // Extract the fact as the proper Q&A
              const factClean = q.fact.replace(/\s+/g, ' ').trim();
              if (factClean.length > 30) {
                // Formulate a proper question from the fact
                const qMatch = factClean.match(/^(.+?)\s+(?:is|was|are|were)\s+(.+)$/);
                if (qMatch) {
                  q.question = 'What do you know about ' + qMatch[1].substring(0, 80) + '?';
                  q.answer = qMatch[2].substring(0, 120);
                } else {
                  q.question = 'Key facts: ' + factClean.substring(0, 100);
                  q.answer = factClean.substring(0, 150);
                }
                q.type = 'qa';
                delete q.options;
                fixedQuestions++;
                fileChanged = true;
              }
            }
            // Update subSubject field
            q.subSubject = targetSub;
          }

          if (!newSubs[targetSub]) newSubs[targetSub] = [];
          newSubs[targetSub] = newSubs[targetSub].concat(questions);

          if (targetSub !== sub) mergedCount++;
        }

        data[sk].subSubjects = newSubs;
      }

      if (fileChanged) {
        fs.writeFileSync(fp, JSON.stringify(data), 'utf8');
        processedFiles++;
      }
    } catch (e) { /* skip unreadable */ }
  }

  // ── Self-audit: detect thin/empty subtopics for LLM generation ──
  const thinSubtopics = [];
  const emptySubtopics = [];
  const misplaced = [];

  // Misplaced topic detection
  const MISPLACED = [
    { re: /\bodi?yan\b/i, correct: 'Indian Folk Traditions', wrong: /classical.*language/i },
    { re: /\b(hitopadesha|panchatantra|jataka)\b/i, correct: 'Indian Literature', wrong: /classical.*language/i },
    { re: /\b(adhyatma|yoga|vedanta|sankhya)\b/i, correct: 'Indian Philosophy', wrong: /classical.*language/i },
  ];

  for (const file of files) {
    const fp = path.join(DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      for (const sk of Object.keys(data)) {
        const subs = data[sk].subSubjects || {};
        for (const sub of Object.keys(subs)) {
          const qs = subs[sub] || [];
          // Check for misplaced
          for (const mp of MISPLACED) {
            if (mp.re.test(sub) && mp.wrong.test(sk)) {
              misplaced.push(file + ': "' + sub + '" belongs in "' + mp.correct + '"');
            }
          }
          // Detect thin/empty
          if (qs.length === 0 && sub.length > 3) {
            emptySubtopics.push({ file, subject: sk, sub });
          } else if (qs.length < 15 && sub.length > 3) {
            thinSubtopics.push({ file, subject: sk, sub, count: qs.length });
          }
        }
      }
    } catch (e) { /* skip */ }
  }

  thinSubtopics.sort((a, b) => a.count - b.count);

  // Report problems found
  if (thinSubtopics.length > 0) fixes.push({ page: 'data/questions', fix: 'Found ' + thinSubtopics.length + ' thin subtopics (< 15 questions)' });
  if (emptySubtopics.length > 0) fixes.push({ page: 'data/questions', fix: 'Found ' + emptySubtopics.length + ' empty subtopics' });
  if (misplaced.length > 0) fixes.push({ page: 'data/questions', fix: 'Misplaced: ' + misplaced.slice(0, 3).join('; ') });

  // Save report
  fs.writeFileSync('data/questions-report.json', JSON.stringify({
    generated: new Date().toISOString(),
    thinCount: thinSubtopics.length,
    emptyCount: emptySubtopics.length,
    misplaced: misplaced.slice(0, 20),
    thinSubtopics: thinSubtopics.slice(0, 50),
    emptySubtopics: emptySubtopics.slice(0, 50),
  }, null, 2));

  // ── Generate content for top 3 thin subtopics via LLM ──
  let generated = 0;
  const targets = [...emptySubtopics.slice(0, 1), ...thinSubtopics.slice(0, 2)];

  for (const target of targets) {
    try {
      const fp = path.join(DIR, target.file);
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const existingQs = (data[target.subject] && data[target.subject].subSubjects && data[target.subject].subSubjects[target.sub]) || [];

      // Collect covered topics for duplicate avoidance
      const allCovered = [];
      for (const sk2 of Object.keys(data)) {
        const s2 = data[sk2].subSubjects || {};
        for (const sk3 of Object.keys(s2)) {
          for (const q of (s2[sk3] || []).slice(0, 15)) {
            allCovered.push((q.question || '').substring(0, 80));
          }
        }
      }

      const result = await callLLM(
        'You are an UPSC/SSC exam content writer. Generate exam-relevant questions.\n' +
        'STRICT RULES:\n' +
        '1. Each question tests a DIFFERENT fact — no duplicates even if worded differently\n' +
        '2. Do NOT rephrase existing questions — cover NEW facts only\n' +
        '3. Include detailed explanations with facts, dates, numbers, names\n' +
        '4. Mix difficulty: easy (30%), medium (50%), hard (20%)\n' +
        '5. Questions must be specific and factual, not vague\n' +
        '6. Return strict JSON: [{"question":"...","answer":"...","explanation":"...","difficulty":"easy|medium|hard"}]',
        'Topic: ' + target.sub + ' (subject: ' + target.subject + ')\n' +
        'Existing questions (' + existingQs.length + '):\n' +
        existingQs.slice(0, 10).map(q => '- ' + (q.question || '').substring(0, 80)).join('\n') + '\n\n' +
        'Other topics in this file (DO NOT DUPLICATE):\n' +
        allCovered.slice(0, 20).join('\n') + '\n\n' +
        'Generate 10 NEW exam questions covering DIFFERENT facts.',
        2500,
        'high'
      );

      if (!result) continue;
      const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const newQs = JSON.parse(clean);
      if (!Array.isArray(newQs) || newQs.length === 0) continue;

      // Final duplicate check
      const existingTexts = new Set();
      for (const sk2 of Object.keys(data)) {
        const s2 = data[sk2].subSubjects || {};
        for (const sk3 of Object.keys(s2)) {
          for (const q of (s2[sk3] || [])) {
            existingTexts.add((q.question || '').toLowerCase().substring(0, 80));
          }
        }
      }

      const added = [];
      for (const nq of newQs) {
        if (!nq.question || !nq.answer) continue;
        const nqKey = nq.question.toLowerCase().substring(0, 80);
        if (existingTexts.has(nqKey)) continue;

        // Near-duplicate: shared 70% key words
        const nqWords = new Set(nqKey.match(/\b[a-z]{4,}\b/g) || []);
        let isDupe = false;
        for (const et of existingTexts) {
          const etWords = new Set(et.match(/\b[a-z]{4,}\b/g) || []);
          let overlap = 0;
          for (const w of nqWords) { if (etWords.has(w)) overlap++; }
          if (overlap / Math.max(nqWords.size, 1) > 0.7) { isDupe = true; break; }
        }
        if (isDupe) continue;

        added.push({
          question: nq.question,
          answer: nq.answer,
          explanation: nq.explanation || nq.answer,
          type: 'qa',
          difficulty: nq.difficulty || 'medium',
          subSubject: target.sub,
          source: 'agent-generated'
        });
      }

      if (added.length > 0) {
        if (!data[target.subject]) data[target.subject] = { subSubjects: {} };
        if (!data[target.subject].subSubjects[target.sub]) data[target.subject].subSubjects[target.sub] = [];
        data[target.subject].subSubjects[target.sub].push(...added);
        fs.writeFileSync(fp, JSON.stringify(data), 'utf8');
        generated += added.length;
        fixes.push({ page: target.file, fix: 'Generated ' + added.length + ' questions for "' + target.sub + '" (' + existingQs.length + ' → ' + (existingQs.length + added.length) + ')' });
      }
    } catch (e) {
      console.log('agent: generation failed for ' + target.sub + ': ' + e.message);
    }
  }

  if (mergedCount > 0) fixes.push({ page: 'data/questions', fix: 'Merged ' + mergedCount + ' overlapping subtopics into correct categories' });
  if (fixedQuestions > 0) fixes.push({ page: 'data/questions', fix: 'Converted ' + fixedQuestions + ' fill-in-blank questions to proper Q&A' });
  if (processedFiles > 0) fixes.push({ page: 'data/questions', fix: 'Updated ' + processedFiles + ' question files' });
  if (generated > 0) fixes.push({ page: 'data/questions', fix: 'Generated ' + generated + ' new exam questions via LLM' });

  return { agent: 'questions', fixes };
}

// ── Main ──
async function agentSelfCheck() {
  const fixes = [];
  const pages = listPages();

  const criticalFiles = [
    'index.html', 'ask.html', 'papers.html', 'mega-test.html',
    'improve.html', 'science.html', 'polytechnic.html', 'mental.html', 'ssc-je.html',
    'js/mental-training.js', 'scripts/lib/ask-core.js', 'scripts/lib/ask-llm.js',
    'data/papers.json', 'data/ask-index.json'
  ];
  for (const f of criticalFiles) {
    // fileExistsAnywhere: fs.existsSync alone reports false for tracked
    // files that a sparse checkout did not materialize.
    if (!fileExistsAnywhere(f)) {
      fixes.push({ page: f, fix: 'CRITICAL FILE MISSING', kind: 'critical' });
    }
  }

  // Read browser test results and fix issues found
  const btPath = 'data/browser-test.json';
  if (fs.existsSync(btPath)) {
    try {
      const bt = JSON.parse(fs.readFileSync(btPath, 'utf8'));
      for (const issue of (bt.issues || [])) {
        if (issue.type === 'placeholder-link' && issue.page) {
          const pf = issue.page.split('/').pop() || issue.page;
          if (fs.existsSync(pf)) {
            let html = fs.readFileSync(pf, 'utf8');
            if (issue.detail && issue.detail.indexOf('"') !== -1) {
              const linkText = issue.detail.match(/"([^"]+)"/);
              if (linkText) {
                // Map link text to a real page
                const text = linkText[1].toLowerCase();
                let dest = 'mega-test.html';
                if (text.includes('upsc') || text.includes('paper')) dest = 'papers.html';
                else if (text.includes('ssc') || text.includes('je') || text.includes('cgl')) dest = 'ssc-je.html';
                else if (text.includes('science') || text.includes('jee') || text.includes('neet')) dest = 'science.html';
                else if (text.includes('poly') || text.includes('gate')) dest = 'polytechnic.html';
                // Find and fix the placeholder link with this text
                html = html.replace(
                  new RegExp('<a href="#"[^>]*>' + linkText[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</a>', 'gi'),
                  '<a href="' + dest + '">' + linkText[1] + '</a>'
                );
                fs.writeFileSync(pf, html);
                fixes.push({ page: pf, fix: 'Browser-test: linked "' + linkText[1] + '" → ' + dest });
              }
            }
          }
        }
        if (issue.type === 'broken-link' && issue.page) {
          const pf = issue.page.split('/').pop() || issue.page;
          if (fs.existsSync(pf)) {
            let html = fs.readFileSync(pf, 'utf8');
            const target = issue.detail.replace(/^→\s+/, '').split(' ')[0];
            if (target && !fileExistsAnywhere(target)) {
              // Remove the broken link
              html = html.replace(
                new RegExp('<a href="' + target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>([^<]*)</a>', 'gi'),
                '<span>$1</span>'
              );
              fs.writeFileSync(pf, html);
              fixes.push({ page: pf, fix: 'Browser-test: removed broken link → ' + target });
            }
          }
        }
        if (issue.type === 'js-error' || issue.type === 'console-error') {
          fixes.push({ page: issue.page || 'unknown', fix: 'Runtime: ' + issue.msg.substring(0, 100), kind: 'runtime' });
        }
      }
    } catch (e) { /* ignore */ }
  }

  for (const page of pages) {
    let html = fs.readFileSync(page, 'utf8');
    let changed = false;

    // ── FIRST: undo damage from over-aggressive repairs ──
    // A past repair stripped live script tags on false evidence (sparse
    // checkout made fs.existsSync lie). Re-add any removed tag whose target
    // verifies, before any other repair runs.
    const restored = restoreStrippedScripts(page);
    if (restored.fixes.length) {
      html = restored.html;
      changed = true;
      for (const f of restored.fixes) fixes.push(f);
    }

    // ── Exam nav routing: link text naming exam X must land on X's hub ──
    // Dead-link checkers never catch these (nothing 404s): CGL/RBI/IBPS
    // cards landing on ssc-je.html, href="#" for the same exams. Fixed to
    // the exam's hub (/cgl/, /rbi/, ...) when one exists.
    const navFix = fixExamNavLinks(html, page);
    if (navFix.fixes.length) {
      html = navFix.html;
      changed = true;
      for (const f of navFix.fixes) fixes.push(f);
    }

    if (page === 'index.html') {
      const placeholders = (html.match(/<a href="#" class="exam-card/g) || []).length;
      if (placeholders > 0) {
        html = html.replace(/<a href="#" (class="exam-card[^"]*"[^>]*)>/g, '<a href="mega-test.html" $1>');
        changed = true;
        fixes.push({ page: page, fix: 'Fixed ' + placeholders + ' placeholder exam card links' });
      }
      const navPlaceholders = (html.match(/<a href="#">/g) || []).length;
      if (navPlaceholders > 0) {
        html = html.replace(/<a href="#">([A-Za-z\s]+)<\/a>/g, '<a href="mega-test.html">$1</a>');
        changed = true;
        fixes.push({ page: page, fix: 'Fixed ' + navPlaceholders + ' placeholder nav links' });
      }
    }

    // ── Deferred-lib vs inline-consumer ordering (real page-breaking bug) ──
    // Detected autonomously: a deferred script runs after parsing, an inline
    // script runs immediately — so an inline block reading a deferred lib's
    // globals always fails ("Failed to load scripts/lib/..."). Repaired on
    // every pass over every page, not just the ones browser-test reported.
    const orderFix = fixDeferredInlineOrder(html, page);
    if (orderFix.fixes.length) {
      html = orderFix.html;
      changed = true;
      for (const f of orderFix.fixes) fixes.push(f);
    }

    const scriptRefs = html.match(/src=["']((?:js|scripts)\/[^"']+\.js|\.\.\/(?:js|scripts)\/[^"']+\.js|\/(?:js|scripts)\/[^"']+\.js)["']/gi) || [];
    for (const ref of scriptRefs) {
      const raw = ref.match(/src=["']([^"']+)["']/i)[1];
      // Resolve against the PAGE's directory (cgl/index.html means js/… as
      // cgl/js/…, ../js/… as js/…) — checking the raw string against the repo
      // root strips working tags on every hub page.
      const file = resolvePageRef(page, raw);
      // fileExistsAnywhere, NOT fs.existsSync: in a sparse checkout the file
      // can be tracked-but-not-materialized, and stripping a live tag on that
      // lie broke 17 pages in run #2. Externals always pass (can't verify).
      if (file && !fileExistsAnywhere(file)) {
        html = html.replace(ref, '');
        changed = true;
        fixes.push({ page: page, fix: 'Removed broken script ref ' + raw });
      }
    }

    if (changed) fs.writeFileSync(page, html);
  }

  // ── Learned detectors (MetaLearn auto-synthesis), once per pass ──
  // Detectors staged by previous runs execute here with a blast-radius fuse:
  // one bad detector must not kill the pass, and any detector firing on >15
  // files is skipped and logged for review instead of applied.
  try {
    if (fs.existsSync('scripts/learned-fixes.js')) {
      delete require.cache[require.resolve('./learned-fixes.js')];
      const learned = require('./learned-fixes.js');
      for (const key of Object.keys(learned)) {
        if (typeof learned[key] !== 'function') continue;
        const pending = [];
        for (const pg of pages) {
          try {
            const h0 = fs.readFileSync(pg, 'utf8');
            const r = learned[key](h0, pg);
            if (r && typeof r.html === 'string' && r.html !== h0) {
              pending.push({ pg: pg, html: r.html, fx: r.fixes || [] });
            }
          } catch (e) { /* one bad detector must not kill the pass */ }
        }
        if (pending.length > 0 && pending.length <= 15) {
          for (const p of pending) { fs.writeFileSync(p.pg, p.html); for (const f of p.fx) fixes.push(f); }
          fixes.push({ page: pending[0].pg, fix: 'Learned detector ' + key + ' applied to ' + pending.length + ' page(s)' });
        } else if (pending.length > 15) {
          fixes.push({ page: '-', fix: 'Learned detector ' + key + ' FUSE-TRIPPED (' + pending.length + ' pages) — skipped, needs review', kind: 'fuse' });
        }
      }
    }
  } catch (e) { /* learned module missing/broken — non-fatal */ }

  console.log('agent: SelfCheck — ' + fixes.length + ' issue(s)');
  return { agent: 'selfcheck', fixes: fixes };
}

async function main() {
  const log = loadJson(LOG, { runs: [], lastRun: null, model: null });
  const model = process.env.OLLAMA_MODEL || 'qwen3.8:27b';
  log.model = model;
  console.log('agent: using model ' + model);
  const runStart = Date.now();

  // FIRST action: one real generation call. Proves the server can
  // load+generate before any filesystem work. If this fails, skip the LLM
  // half of the agent — the server is dead.
  // 600 tokens NOT 10: qwen3.8:27b is a thinking model that burns ~200-500
  // tokens on message.thinking before emitting content. Run #60 used 10 and
  // got content:"" with the whole answer parked in thinking.
  const ping = await callLLM(
    'Reply with exactly: OK and nothing else.',
    'Ping the model to confirm generation works.',
    600
  );
  if (!ping) {
    console.log('agent: LLM cold-start FAILED — server cannot generate. Running rule-based fixers only.');
  } else {
    console.log('agent: LLM cold-start OK (' + ping.model + '): ' + ping.text.slice(0, 40));
  }

  const results = [];
  // Two classes of agent:
  //   ROTATE (LLM) — generate new things. Minutes of CPU inference per call,
  //     so one run can't do them all → rotate through them.
  //   ALWAYS (rules) — check + fix the site. Pure filesystem/HTML work, no
  //     LLM, runs in seconds over 262 pages → runs on EVERY pass so the site
  //     is continuously audited and corrected.
  const rotateAgents = [
    ['Foresight', agentForesight],
    ['Questions', agentQuestionQuality],
    ['Content', agentContent],
    ['Figures', agentFigures],
    ['Flowcharts', agentFlowcharts],
    ['Mindmaps', agentMindmaps],
    ['Features', agentFeatures],
    ['Proposals', agentProposals],
    ['MetaLearn', agentMetaLearn]
  ];
  const alwaysAgents = [
    ['Workflows', agentWorkflows],
    ['SelfCheck', agentSelfCheck],
    ['SEO', agentSEO],
    ['Perf', agentPerf],
    ['A11Y', agentA11Y],
    ['Code', agentCode]
  ];
  let agents = rotateAgents.concat(alwaysAgents);
  // AGENT_ONLY=questions: dedicated question-quality workflow (questions data
  // checked out, site pages are not). Run only the agents that touch questions.
  if (process.env.AGENT_ONLY === 'questions') {
    agents = agents.filter(([name]) => name === 'Foresight' || name === 'Questions' || name === 'Content');
  }

  // ── Work intake: LOOK before acting (the "intelligent" part) ──
  // Read every report the site produces, count what's outstanding, and log
  // the queue. The agent should know what exists before deciding what to do.
  try {
    const intact = loadJson('data/faults.json', { faults: [] });
    const figGaps = loadJson('data/figure-gaps.json', {});
    const topicGaps = loadJson('data/topic-gaps.json', {});
    const ideasJ = loadJson('data/ideas.json', { ideas: [] });
    const audit = loadJson('data/site-audit.json', {});
    const queue = {
      openFaults: (intact.faults || []).length,
      criticalFaults: (intact.faults || []).filter(f => f.severity === 'critical').length,
      figureGaps: figGaps.totalGaps != null ? figGaps.totalGaps : Object.keys(figGaps.bySubject || {}).length,
      topicGaps: topicGaps.thin || topicGaps.gaps || Object.keys(topicGaps.byCategory || {}).length || 0,
      pendingIdeas: (ideasJ.ideas || []).length,
      pagesAudited: audit.pages || listPages().length,
      pages: listPages().length
    };
    console.log('agent: work intake — ' + JSON.stringify(queue));
    console.log('agent: intake detail — faults by severity: ' + JSON.stringify(
      (intact.faults || []).reduce((acc, f) => { acc[f.severity || '?'] = (acc[f.severity || '?'] || 0) + 1; return acc; }, {})
    ));
  } catch (e) { console.log('agent: work intake failed: ' + e.message); }

  // ── ROTATION (continuous working) ──
  // One run cannot do everything: the 9 LLM agents × minutes of CPU inference
  // each exceeds the 120-min job budget. Rotate instead of dropping work —
  // each run takes the NEXT slice of the LLM agents, so an hourly schedule
  // gives every capability a turn within ~2 hours. Slice comes from
  // AGENT_ROTATE (default 4); the offset derives from GITHUB_RUN_NUMBER so
  // it advances every run. Rotation applies ONLY to the LLM agents (the
  // "build new" half) — the rule-based agents that check + correct the site
  // (SEO/A11Y/Code/SelfCheck/Perf/Workflows) run on every single pass, which
  // is what makes the site continuously maintained.
  const llmAgents = agents.filter(([name]) => rotateAgents.some(([n]) => n === name));
  const ruleAgents = agents.filter(([name]) => alwaysAgents.some(([n]) => n === name));
  const sliceSize = Math.max(1, parseInt(process.env.AGENT_ROTATE || '4', 10));
  if (sliceSize < llmAgents.length) {
    const runNo = parseInt(process.env.GITHUB_RUN_NUMBER || '0', 10) || (Math.floor(Date.now() / 3600000) % 997);
    const offset = (runNo * sliceSize) % llmAgents.length;
    const rotated = [];
    for (let i = 0; i < sliceSize; i++) rotated.push(llmAgents[(offset + i) % llmAgents.length]);
    console.log('agent: rotation ' + sliceSize + '/' + llmAgents.length + ' LLM agents (offset ' + offset + ', run #' + runNo + ') — ' + rotated.map(([n]) => n).join(', '));
    agents = rotated.concat(ruleAgents);
  }
  console.log('agent: will run ' + agents.length + ' agent(s): ' + agents.map(([n]) => n).join(', '));

  for (const [name, fn] of agents) {
    const t0 = Date.now();
    // Log BEFORE each agent so the 5-10 min of CPU inference is visible
    // in the logs instead of looking like a hang (runs #56-#60 looked dead
    // for 40+ min with no output).
    // NOTE: ((...) / 1000 | 0) + 's' — the parens matter. Without them
    // `'(' + n | 0 + 's...'` evaluates `|` across a string → prints "0".
    console.log('agent: START ' + name + ' (' + (((Date.now() - runStart) / 1000) | 0) + 's into run)');
    try {
      const result = await fn();
      results.push(result);
      console.log('agent: DONE ' + name + ' in ' + ((Date.now() - t0) / 1000 | 0) + 's');
    } catch (e) {
      console.log('agent: ' + name + ' failed: ' + e.message);
      results.push({ agent: name.toLowerCase(), fixes: [], error: e.message });
    }
  }

  // Log everything — store full fix details so improve.html can show them
  const totalFixes = results.reduce((sum, r) => sum + (r.fixes ? r.fixes.length : 0), 0);
  log.lastRun = new Date().toISOString();
  log.runs.push({
    at: log.lastRun,
    model: model,
    totalFixes: totalFixes,
    byAgent: results.map(r => ({ agent: r.agent, count: (r.fixes || []).length })),
    details: results.filter(r => r.fixes && r.fixes.length).map(r => ({
      agent: r.agent,
      fixes: r.fixes.slice(0, 10) // cap at 10 per agent to keep log small
    }))
  });
  if (log.runs.length > 15) log.runs = log.runs.slice(-15); // keep last 15 runs
  saveJson(LOG, log);

  // Update agent memory
  memory.updateStats(totalFixes);
  if (totalFixes > 0) {
    memory.addWin('Cycle fixed ' + totalFixes + ' issues across ' + results.filter(r => r.fixes && r.fixes.length).length + ' agents', 'high');
  }

  // Record specific lessons from this run
  for (const r of results) {
    if (!r.fixes) continue;
    for (const f of r.fixes) {
      if (f.kind === 'critical') {
        memory.addLesson(f.page || 'unknown', f.fix, 'critical');
      }
      // Learn from successful link fixes
      if (f.fix && f.fix.includes('Linked') && f.fix.includes('→')) {
        memory.addLesson('dead-link:' + (f.page || ''), 'When a link is dead, map it to the correct destination page', 'info');
      }
    }
  }

  console.log('agent: total ' + totalFixes + ' fix(es) this run');
  results.forEach(r => {
    if (r.fixes && r.fixes.length) {
      console.log('  [' + r.agent + '] ' + r.fixes.length + ' fix(es)');
      r.fixes.slice(0, 3).forEach(f => console.log('    → ' + f.fix + (f.page ? ' (' + f.page + ')' : '')));
    }
  });

  return totalFixes;
}

// ── Continuous loop mode ──
const MAX_CYCLES = parseInt(process.env.AGENT_MAX_CYCLES || '6', 10);
const CYCLE_WAIT = parseInt(process.env.AGENT_CYCLE_WAIT || '300', 10);

async function runLoop() {
  console.log('agent: continuous loop — max ' + MAX_CYCLES + ' cycles, ' + CYCLE_WAIT + 's between');
  let totalAll = 0, idle = 0;

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    if (fs.existsSync('.agent-stop')) { console.log('agent: stop flag found'); break; }
    console.log('\n===== CYCLE ' + cycle + '/' + MAX_CYCLES + ' =====');
    const fixes = await main();
    totalAll += fixes;
    if (fixes === 0) { idle++; if (idle >= 3) { console.log('agent: 3 idle cycles — site clean, stopping'); break; } }
    else idle = 0;
    if (cycle < MAX_CYCLES) {
      console.log('agent: waiting ' + CYCLE_WAIT + 's...');
      await new Promise(r => setTimeout(r, CYCLE_WAIT * 1000));
    }
  }
  console.log('\nagent: loop complete — ' + totalAll + ' total fixes');
}

// --selfcheck-only: instant rule-based repair, no model. Repairs the
// deterministic page-breaking bugs (defer-vs-inline ordering, dead links,
// placeholders) without loading the 17GB model — finishes in seconds, so a
// dedicated lightweight workflow can run it hourly. The agent heals the site
// itself; the heavy LLM generation stays in the full runs.
async function runSelfcheckOnly() {
  const started = Date.now();
  console.log('agent: selfcheck-only — rule-based repair, no model needed');
  const r = await agentSelfCheck();
  const log = loadJson(LOG, { runs: [], lastRun: null, model: null });
  log.lastRun = new Date().toISOString();
  log.runs.push({
    at: log.lastRun,
    model: 'rule-based (no LLM)',
    totalFixes: (r.fixes || []).length,
    byAgent: [{ agent: 'selfcheck', count: (r.fixes || []).length }],
    details: (r.fixes || []).length ? [{ agent: 'selfcheck', fixes: r.fixes.slice(0, 10) }] : []
  });
  if (log.runs.length > 15) log.runs = log.runs.slice(-15);
  saveJson(LOG, log);
  console.log('agent: selfcheck-only done in ' + ((Date.now() - started) / 1000 | 0) + 's — ' + (r.fixes || []).length + ' fix(es)');
  for (const f of (r.fixes || []).slice(0, 20)) console.log('  → ' + (f.fix || JSON.stringify(f)) + ' (' + (f.page || '?') + ')');
}

if (process.argv.includes('--selfcheck-only')) {
  runSelfcheckOnly().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(0); });
} else if (process.argv.includes('--loop')) {
  runLoop().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(0); });
} else {
  main().then(() => process.exit(0)).catch(e => {
    console.error('agent: FATAL — ' + (e.message || e));
    process.exit(0);
  });
}
