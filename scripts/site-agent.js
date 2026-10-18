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
const { execSync, spawn } = require('child_process');
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
// undici's default 300s headersTimeout fires while a model cold-loads
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

// ── Wall-clock deadline (AGENT_DEADLINE_MIN) ──
// A run killed by its GitHub job timeout publishes NOTHING — every fix is
// lost, which is worse than doing less work. Past this many minutes (counted
// from the true run start in main()), callLLM refuses new prompts so agents
// unwind, their saves flush, and the workflow still reaches its publish
// step. Skipped work simply rotates in on the next run. Rule-based agents
// (SEO/Perf/A11Y/…) never call the model and always run. 0/unset disables.
const DEADLINE_MIN = parseFloat(process.env.AGENT_DEADLINE_MIN || '0') || 0;
let deadlineAnchor = Date.now();
function pastDeadline() {
  return DEADLINE_MIN > 0 && Date.now() - deadlineAnchor > DEADLINE_MIN * 60000;
}

// One HTTP attempt at the chat endpoint, STREAMING via spawn + monitor.
// History of this transport (each failure taught one clause):
// - stream:false returns zero bytes until all ~2048 tokens finish (15-35 min
//   on CPU), so total-time caps murdered healthy generations; curl abandoning
//   does NOT stop the server (zombie retries queued for hours: runs #64/#71).
// - Streaming fixed that, but curl's --speed-limit then aborted at 180s of
//   ZERO bytes during prompt-processing / cold-load (observed live: the
//   cold-start ping streamed OK, then the big planner prompt died "too slow"
//   at exactly 180s). Zero bytes before the first token is NORMAL on CPU.
// Correct policy: allow up to 25 min with NO first byte (cold load + prompt
// eval), then watch REAL stalls: no byte for 12 min mid-stream = wedged.
// That needs incremental visibility, which execSync cannot give — spawn can.
// The server is NOT stopped by killing curl; callLLM's exit-28 path restarts
// it. Hard cap 95 min: nothing legitimate needs more.
function ollamaChat(payload) {
  const body = JSON.parse(payload);
  body.stream = true;
  const args = [
    '-sS', '--max-time', '5400', '-w', '\\n%{http_code}',
    OLLAMA_URL + '/api/chat',
    '-H', 'Content-Type: application/json',
    '-d', '@-'
  ];
  return new Promise((resolve, reject) => {
    const child = spawn('curl', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let stderr = '';
    const started = Date.now();
    let firstByteAt = 0;
    let lastByteAt = Date.now();
    let settled = false;

    function fail(why, status) {
      if (settled) return;
      settled = true;
      clearInterval(mon);
      try { child.kill('SIGKILL'); } catch (e) { /* ignore */ }
      const err = new Error('stream monitor: ' + why);
      err.status = status === undefined ? 28 : status; // 28 = curl-timeout class (restart+retry); other = plain fail
      err.stdout = out.slice(0, 2000);
      err.stderr = stderr.slice(0, 400);
      reject(err);
    }

    const mon = setInterval(() => {
      const now = Date.now();
      // Deadline abort: when AGENT_DEADLINE_MIN is set and reached while a
      // call is in flight, end the stream NOW with a custom status so
      // callLLM does NOT do the exit-28 restart+retry dance. The abandoned
      // server-side generation finishes on its own; nothing new starts.
      if (pastDeadline()) return fail('agent deadline reached mid-call', 'DEADLINE');
      if (now - started > 95 * 60 * 1000) return fail('hard cap 95min');
      if (!firstByteAt) {
        if (now - started > 25 * 60 * 1000) return fail('no first byte in 25min (cold load/prompt eval over budget)');
      } else if (now - lastByteAt > 12 * 60 * 1000) {
        return fail('no byte for 12min mid-stream (wedged)');
      }
    }, 5000);

    child.stdout.on('data', d => {
      if (!firstByteAt) firstByteAt = Date.now();
      lastByteAt = Date.now();
      out += d.toString('utf8');
      if (out.length > 100 * 1024 * 1024) fail('buffer cap 100MB');
      // Progress beacon: first byte observed means prompt eval finished —
      // log once so workflow logs distinguish cold-load silence from a stall.
      if (firstByteAt && !ollamaChat._firstByteLogged) {
        ollamaChat._firstByteLogged = true;
        console.log('agent: LLM stream first bytes at ' + Math.round((firstByteAt - started) / 1000) + 's');
      }
    });
    child.stderr.on('data', d => { stderr += d.toString('utf8'); });
    child.on('error', err => { if (!settled) { settled = true; clearInterval(mon); reject(err); } });
    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearInterval(mon);
      ollamaChat._firstByteLogged = false;
      if (code === 0) resolve(out);
      else {
        const err = new Error('curl exit ' + code);
        err.status = code;
        err.stdout = out.slice(0, 2000);
        err.stderr = stderr.slice(0, 400);
        reject(err);
      }
    });
    child.stdin.on('error', () => { /* curl died before reading stdin */ });
    child.stdin.write(payload);
    child.stdin.end();
  });
}

// Parse an NDJSON chat stream: accumulate message.content deltas (and
// message.thinking for think models, which may arrive per-chunk or at end),
// plus legacy response field. Returns {text, httpCode}.
function parseChatStream(out) {
  const lines = String(out || '').split('\n');
  let httpCode = '';
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  if (lines.length && /^\d{3}$/.test(lines[lines.length - 1].trim())) {
    httpCode = lines.pop().trim();
  }
  let content = '', thinking = '';
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.charAt(0) !== '{') continue;
    try {
      const j = JSON.parse(t);
      if (j.message) {
        if (typeof j.message.content === 'string') content += j.message.content;
        if (typeof j.message.thinking === 'string') thinking += j.message.thinking;
      }
      if (typeof j.response === 'string') content += j.response;
    } catch (e) { /* partial line; ignore */ }
  }
  const text = content.trim() || thinking.trim();
  return { text: text, httpCode: httpCode };
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
      console.log('agent: ' + tag + ' — NO model resident: next call cold-loads the model (expect minutes)');
    }
  } catch (e) { /* informational only */ }
}

async function callLLM(system, user, maxTokens) {
  if (pastDeadline()) {
    throw new Error('AGENT_DEADLINE_REACHED (' + DEADLINE_MIN + 'min) — refusing new LLM work so the run can publish; skipped work rotates in next run');
  }
  const model = process.env.OLLAMA_MODEL || 'qwen3.5:9b';
  // Recall: the agent records lessons/addRules/addWins every run but long
  // ago stopped READING them (amnesia — same mistakes repeated). For
  // generation-sized calls, prepend the distilled lessons so experience
  // compounds instead of evaporating. Pings and small calls skip it.
  let sysOut = system;
  if ((maxTokens || 0) >= 800) {
    try {
      const lessons = (memory.getLessonsPrompt() || '').slice(0, 1200);
      if (lessons.trim()) sysOut = lessons + '\n\n' + system;
    } catch (e) { /* memory unreadable — proceed without */ }
  }
  const payload = JSON.stringify({
    model: model,
    messages: [
      { role: 'system', content: sysOut },
      { role: 'user', content: user }
    ],
    // Streaming is forced by ollamaChat regardless; set here for clarity.
    stream: true,
    // THINKING OFF. qwen3.8:27b reasons in message.thinking by default, and on
    // a 4-vCPU CPU runner that reasoning streams at a fraction of a token per
    // second: a generation call then spends the whole 90-minute curl budget
    // inside thinking and dies with content still empty (Question Quality #15
    // and the Site Agent run of 2026-10-17 both wedged exactly there — 48 KB
    // of thinking after 5400 s, then the restart retry lost another 90 min the
    // same way). think:false makes the model answer directly, which is 3-5x
    // fewer tokens for the same result. Rollback hatch: OLLAMA_THINK=true.
    think: process.env.OLLAMA_THINK === 'true',
    // 2048 not 1024: even without thinking, batched JSON answers (question
    // generation) are long; 1024 cut them off mid-array.
    options: { temperature: 0.3, num_predict: maxTokens || 2048 }
  });
  logModelState('pre-call');
  let out;
  try {
    out = await ollamaChat(payload);
  } catch (e) {
    const detail = 'exit=' + (e.status === undefined ? '?' : e.status) +
      ' stderr=' + String(e.stderr || '').slice(0, 200) +
      ' out=' + String(e.stdout || '').slice(0, 300);
    // exit 28 = curl max-time hit with 0 bytes: the server never began
    // responding. DO NOT blindly retry — curl abandoning the client does NOT
    // stop the server: Ollama keeps grinding the abandoned request while
    // holding the model lock, so a naive retry queues behind its own zombie
    // and times out too (run #4: two 60-min cascades). Instead restart the
    // server (clears wedged/zombie generations), then ONE retry on a clean
    // server. If that also fails, give up this call — never burn the job.
    if (e.status === 28) {
      console.log('agent: Ollama timed out (' + detail + ') — restarting server to clear wedged work, then one retry');
      try { execSync('pkill -f "ollama serve"; sleep 2; OLLAMA_KEEP_ALIVE=60m nohup ollama serve >> /tmp/ollama.log 2>&1 &', { stdio: 'ignore', timeout: 15000 }); } catch (e0) { /* ignore */ }
      try {
        for (let i = 0; i < 60; i++) {
          try {
            execSync('curl -sf --max-time 5 ' + OLLAMA_URL + '/api/tags', { stdio: 'pipe', timeout: 10000 });
            break;
          } catch (e1) { execSync('sleep 2', { stdio: 'ignore' }); }
        }
        out = await ollamaChat(payload);
      } catch (e2) {
        console.log('agent: Ollama retry failed after restart: exit=' + e2.status);
        return null;
      }
    } else {
      console.log('agent: Ollama curl failed: ' + detail);
      // If the server is dead (exit 7 / Connection refused), restart it once
      // so the NEXT call has something to talk to.
      if (e.status === 7 || String(e.stderr || '').match(/Connection refused|Failed to connect/i)) {
        console.log('agent: server refused connection — restarting ollama for next call');
        try { execSync('OLLAMA_KEEP_ALIVE=60m nohup ollama serve >> /tmp/ollama.log 2>&1 &', { stdio: 'ignore' }); } catch (e3) { /* best effort */ }
      }
      return null;
    }
  }
  try {
    let parsed = parseChatStream(out);
    // Older Ollama daemons or template-only thinkers reject the think field
    // with HTTP 400. Drop it and give the call one clean retry — this keeps
    // the fix safe across model/daemon combinations.
    if (!parsed.text && parsed.httpCode === '400' && process.env.OLLAMA_THINK !== 'true') {
      console.log('agent: Ollama rejected think:false (HTTP 400) — retrying without the parameter');
      try {
        out = await ollamaChat(JSON.stringify(Object.assign(JSON.parse(payload), { think: undefined })));
        parsed = parseChatStream(out);
      } catch (e4) {
        console.log('agent: Ollama no-think retry failed: exit=' + (e4 && e4.status));
        return null;
      }
    }
    // qwen3.8:27b is a THINKING model: it reasons in message.thinking and
    // puts the final answer in message.content. The think:false request above
    // normally skips reasoning outright; the thinking fallback stays for the
    // no-think-flag retry path and for old daemons that ignore the field.
    const text = parsed.text;
    if (!text) {
      console.log('agent: Ollama ' + model + ' returned empty (http ' + parsed.httpCode + ')');
      return null;
    }
    // Detailed log: WHAT the model wrote (preview), not just that it did.
    console.log('agent: LLM ← ' + model + ' (' + text.length + ' chars): ' + text.slice(0, 400).replace(/\s+/g, ' '));
    return { text: text, model: model + ' (local)' };
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
//
// Native browser properties are NOT library consumers. The first version of
// this check flagged any window.X, so index.html's inline AdSense snippet
// ((adsbygoogle = window.adsbygoogle || [])...) read as "the page consumes a
// deferred lib's globals" and selfcheck stripped defer from the head-loaded
// widget scripts — which run before <body> exists without it and silently
// no-op, re-creating the 2026-10-15 homepage outage. Native/third-party names
// are ignored so only real lib globals trigger the rule.
var NATIVE_WINDOW = {
  addEventListener: 1, removeEventListener: 1, dispatchEvent: 1,
  location: 1, history: 1, navigator: 1, screen: 1, performance: 1,
  localStorage: 1, sessionStorage: 1, crypto: 1, console: 1, document: 1,
  scrollTo: 1, scrollBy: 1, scroll: 1, scrollY: 1, scrollX: 1, pageYOffset: 1,
  innerWidth: 1, innerHeight: 1, devicePixelRatio: 1, isSecureContext: 1,
  open: 1, close: 1, alert: 1, confirm: 1, prompt: 1, print: 1, postMessage: 1,
  matchMedia: 1, getComputedStyle: 1, requestAnimationFrame: 1,
  setTimeout: 1, setInterval: 1, clearTimeout: 1, clearInterval: 1,
  speechSynthesis: 1, SpeechSynthesisUtterance: 1, adsbygoogle: 1,
  fetch: 1, XMLHttpRequest: 1, WebSocket: 1, URL: 1, URLSearchParams: 1,
  Image: 1, Audio: 1, Blob: 1, FileReader: 1, AbortController: 1,
  MutationObserver: 1, IntersectionObserver: 1, ResizeObserver: 1,
  CustomEvent: 1, Event: 1, frameElement: 1, frames: 1, parent: 1, top: 1,
  self: 1, name: 1, status: 1, origin: 1
};
function pageNeedsSyncScripts(html) {
  const inlineRe = /<script>([\s\S]*?)<\/script>/gi;
  let im;
  while ((im = inlineRe.exec(html)) !== null) {
    const winRe = /\bwindow\.([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let wm;
    while ((wm = winRe.exec(im[1])) !== null) {
      if (!NATIVE_WINDOW[wm[1]]) return true;
    }
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
// Shared gap reader: figure-gaps.json is {bySubject: {subject: [topics]}}.
// All three visual agents once read it as an array and silently produced
// nothing for months — this helper serves all of them, all shapes.
function flattenGaps(gaps) {
  const out = [];
  if (!gaps) return out;
  if (Array.isArray(gaps)) {
    gaps.forEach(g => {
      if (typeof g === 'string') out.push({ subject: '', topic: g });
      else (g.topics || []).forEach(t => out.push({ subject: g.subject || '', topic: typeof t === 'string' ? t : (t.topic || '') }));
    });
  } else if (gaps.bySubject && typeof gaps.bySubject === 'object') {
    Object.entries(gaps.bySubject).forEach(([subj, topics]) => {
      (Array.isArray(topics) ? topics : []).forEach(t => out.push({ subject: subj, topic: typeof t === 'string' ? t : (t.topic || t.name || '') }));
    });
  } else if (gaps.subjects && typeof gaps.subjects === 'object') {
    Object.entries(gaps.subjects).forEach(([subj, data]) => {
      ((data && (data.topics || data.missing)) || []).forEach(t => out.push({ subject: subj, topic: typeof t === 'string' ? t : (t.topic || '') }));
    });
  }
  return out.filter(g => g.topic);
}
async function agentFigures() {
  const fixes = [];
  const gaps = loadJson('data/figure-gaps.json', null);
  if (!gaps) return { agent: 'figures', fixes: fixes };

  const flatGaps = flattenGaps(gaps);

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
      fixes.push({ page: figFile, kind: 'figure', fix: 'Created figure: ' + gap.topic, model: result.model, text: ('Caption: ' + (parsed.caption || '')).slice(0, 400) });
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

  // Look for process/procedure topics that suit flowcharts.
  // Plus a standing seed list of classic UPSC processes, so the agent produces
  // from run one instead of waiting for a gap file to name a process topic.
  const processKeywords = /procedure|process|how|steps|formation|structure|system|mechanism|cycle|chain/i;
  const flatGaps = flattenGaps(gaps);
  const SEED_PROCESSES = [
    { subject: 'Polity', topic: 'How a Bill becomes Law in India' },
    { subject: 'Polity', topic: 'Constitutional amendment procedure Article 368' },
    { subject: 'Polity', topic: 'Election process of the President of India' },
    { subject: 'Economy', topic: 'Union Budget preparation and passage cycle' },
    { subject: 'Geography', topic: 'Formation of monsoon in India' },
    { subject: 'Environment', topic: 'EIA clearance process in India' },
    { subject: 'Polity', topic: 'Criminal trial stages in India' },
    { subject: 'Governance', topic: 'How an ordinance is promulgated and replaced' }
  ];
  const processTopics = flatGaps.filter(g => processKeywords.test(g.topic)).slice(0, 2);
  for (const s of SEED_PROCESSES) {
    if (processTopics.length >= 2) break;
    const slug = s.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    if (fs.existsSync('figures/' + slug + '-flowchart.html')) continue;
    if (processTopics.some(g => g.topic === s.topic)) continue;
    processTopics.push(s);
  }

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
      fixes.push({ page: fcFile, kind: 'flowchart', fix: 'Created flowchart: ' + gap.topic, model: result.model, text: ('Steps: ' + ((parsed.steps || []).join(' → ')) + '\n' + (parsed.caption || '')).slice(0, 500) });
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

  const flatGaps = flattenGaps(gaps);

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
      fixes.push({ page: mmFile, kind: 'mindmap', fix: 'Created mind map: ' + gap.topic, model: result.model, text: ('Branches: ' + ((parsed.branches || []).join(', ')) + '\n' + (parsed.caption || '')).slice(0, 500) });
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

  // ── Platform drift self-repair: read run ANNOTATIONS, not just code ──
  // GitHub announces hard breakage as check annotations (action version no
  // longer supported, runner image removed). Static rules cannot see these;
  // the annotations can. Conservative policy: migrate ONLY on hard-breakage
  // language (removed/unsupported/no-longer-available) from FAILED checks —
  // NEVER on deprecation warnings (those are informational; mass-editing 20
  // workflows on a warning is how incidents happen).
  try {
    const { execSync: _ex } = require('child_process');
    const repo = process.env.GITHUB_REPOSITORY || '';
    const annoTexts = [];
    if (repo) {
      try {
        const checks = JSON.parse(_ex('gh api repos/' + repo + '/commits/' + (process.env.GITHUB_SHA || 'HEAD') + '/check-runs --paginate -q "[.check_runs[] | select(.conclusion==\\"failure\\") | {name, output: (.output.annotations // [])}]"',
          { encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'] }));
        for (const c of (Array.isArray(checks) ? checks : [])) {
          for (const a of (c.output || [])) {
            const t = (((a && (a.message || '')) + ' ' + (a && (a.title || ''))) || '').slice(0, 300);
            if (t.trim()) annoTexts.push({ run: c.name, text: t });
          }
        }
      } catch (e) { /* annotations unavailable offline */ }
    }
    const HARD_BREAK = /no longer supported|has been removed|not supported|no longer available|end of life|unsupported runner|invalid workflow|workflow file issue/i;
    for (const n of annoTexts) {
      if (!HARD_BREAK.test(n.text)) continue;
      // actions/checkout major bump, only on hard breakage.
      if (/actions\/checkout@v4/i.test(n.text)) {
        for (const wf of wfFiles) {
          const wfPath = path.join(wfDir, wf);
          let content = fs.readFileSync(wfPath, 'utf8');
          if (content.indexOf('actions/checkout@v4') !== -1) {
            content = content.split('actions/checkout@v4').join('actions/checkout@v5');
            fs.writeFileSync(wfPath, content);
            fixes.push({ page: wfPath, fix: 'Bumped actions/checkout v4→v5 (hard breakage: ' + n.text.slice(0, 80) + ')' });
          }
        }
      }
      // setup-node version end-of-life, only on hard breakage.
      const nd = n.text.match(/node\.js\s*(\d+)[^.]{0,60}?(end of life|no longer supported|has been removed|not supported)/i);
      if (nd) {
        const dead = nd[1];
        for (const wf of wfFiles) {
          const wfPath = path.join(wfDir, wf);
          let content = fs.readFileSync(wfPath, 'utf8');
          const re = new RegExp('(node-version:\\s*[\'"]?)' + dead + '([\'"]?)');
          if (re.test(content)) {
            content = content.replace(re, '$122');
            fs.writeFileSync(wfPath, content);
            fixes.push({ page: wfPath, fix: 'Bumped node-version ' + dead + '→22 (hard breakage)' });
          }
        }
      }
    }
  } catch (e) { /* annotation self-repair is best-effort */ }

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

    // Duplicate `with:` blocks under one step: YAML parsers take the last one
    // silently, but GitHub refuses to load the workflow at all ("workflow file
    // issue", whole run dead). A hardening script created these once by
    // inserting a second `with:` where one existed. Merge them.
    {
      const lines = content.split('\n');
      const out = [];
      let stepWithIdx = -1; // index in `out` of this step's first `with:`
      let stepIndent = '';
      let mergedAny = false;
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const stepM = /^(\s*)-(\s+)(uses:|name:|run:|id:)/.exec(line);
        if (stepM) { stepWithIdx = -1; stepIndent = stepM[1]; out.push(line); continue; }
        const withM = /^(\s*)with:\s*$/.exec(line);
        if (withM && stepIndent && line.indexOf(stepIndent + '  ') === 0 && line.slice(stepIndent.length + 2).indexOf(' ') === -1) {
          // A `with:` directly under the current step (exactly step indent + 2).
          if (stepWithIdx === -1) { stepWithIdx = out.length; out.push(line); continue; }
          // Duplicate: skip the `with:` line itself; its children stay (they
          // belong to the same mapping — deeper indent keeps them attached to
          // the first `with:` above).
          mergedAny = true;
          continue;
        }
        // Leaving a step body (dedent to job level or `jobs:`) resets tracking.
        if (/^(\S|  \S)/.test(line) && stepWithIdx !== -1 && out.length && !/^\s/.test(line)) stepWithIdx = -1;
        out.push(line);
      }
      if (mergedAny) {
        const merged = out.join('\n');
        // Self-verify: exactly one `with:` per step block now.
        let dupLeft = false;
        const blocks = merged.split(/(?=^\s*-\s+(?:uses:|name:))/m);
        for (const b of blocks) {
          const n = (b.match(/^\s+with:\s*$/gm) || []).length;
          if (n > 1) { dupLeft = true; break; }
        }
        if (!dupLeft) {
          content = merged;
          changed = true;
          fixes.push({ page: wfPath, fix: 'Merged duplicate with: blocks (GitHub refuses to load such files)' });
        } else {
          fixes.push({ page: wfPath, fix: 'WARNING: duplicate with: detected but auto-merge unsafe — needs review', kind: 'warn' });
        }
      }
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

  // ── Incremental sweep cursor: every run re-parsed all 1310 files from zero
  // (fresh runner, no memory) — hours of re-reading unchanged JSON. Now: stat
  // everything (milliseconds, no parse), parse ONLY changed files + a rotating
  // slice for continuous full coverage. Tallies accumulate in the cursor so
  // the thin/empty audit stays global without re-reading the world.
  const CURSOR = 'data/questions-cursor.json';
  const cursor = loadJson(CURSOR, { files: {}, rot: 0, tallies: {} });
  if (!cursor.files) cursor.files = {};
  if (!cursor.tallies) cursor.tallies = {};
  const statOf = {};
  for (const f of files) {
    try {
      const st = fs.statSync(path.join(DIR, f));
      statOf[f] = { mtime: st.mtimeMs, size: st.size };
    } catch (e) { /* unreadable */ }
  }
  const sweep = [];
  const seen = new Set();
  for (const f of files) {
    const prev = cursor.files[f], cur = statOf[f];
    if (!cur) continue;
    if (!prev || prev.mtime !== cur.mtime || prev.size !== cur.size) { sweep.push(f); seen.add(f); }
  }
  // Rotating slice guarantees every file is re-swept periodically even when
  // untouched (catches rule changes like new MERGE/RULES entries). Rotation
  // advances a fixed SLICE per run → full coverage every ~9 runs (~2 days).
  const SLICE = 150;
  const rotStart = files.length ? (cursor.rot || 0) % files.length : 0;
  let sliceAdded = 0;
  for (let i = 0; i < files.length && sliceAdded < SLICE && sweep.length < 400; i++) {
    const f = files[(rotStart + i) % files.length];
    if (!seen.has(f) && statOf[f]) { sweep.push(f); seen.add(f); sliceAdded++; }
  }
  cursor.rot = files.length ? (rotStart + SLICE) % files.length : 0;
  console.log('agent: Questions — incremental sweep: ' + sweep.length + '/' + files.length + ' files (' +
    Object.keys(cursor.tallies).length + ' tallied from prior runs)');

  // ── Self-audit collectors (filled inline in the SAME single pass below —
  // a second full sweep of 9GB doubled this agent's runtime past 2 hours) ──
  const thinSubtopics = [];
  const emptySubtopics = [];
  const misplaced = [];
  const MISPLACED = [
    { re: /\bodi?yan\b/i, correct: 'Indian Folk Traditions', wrong: /classical.*language/i },
    { re: /\b(hitopadesha|panchatantra|jataka)\b/i, correct: 'Indian Literature', wrong: /classical.*language/i },
    { re: /\b(adhyatma|yoga|vedanta|sankhya)\b/i, correct: 'Indian Philosophy', wrong: /classical.*language/i },
  ];

  for (let fi = 0; fi < sweep.length; fi++) {
    const file = sweep[fi];
    if ((fi + 1) % 50 === 0 || fi === sweep.length - 1) {
      console.log('agent: Questions — sweeping ' + (fi + 1) + '/' + sweep.length + ' files (' + processedFiles + ' changed, ' + fixedQuestions + ' fixed)');
    }
    const fp = path.join(DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      let fileChanged = false;
      // Fresh tallies for this file (replaces stale accumulated ones below).
      const fileTallies = {};

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

        // Record fresh tallies for this file (replaces stale accumulated
        // ones below). The global audit is derived from ALL tallies after
        // the loop — full-corpus view without re-reading the world.
        const ft = [];
        for (const sub of Object.keys(newSubs)) {
          ft.push({ sk: sk, sub: sub, count: (newSubs[sub] || []).length });
        }
        if (!cursor._tallyBuf) cursor._tallyBuf = {};
        if (!cursor._tallyBuf[file]) cursor._tallyBuf[file] = [];
        cursor._tallyBuf[file].push(...ft);
      }

      if (fileChanged) {
        fs.writeFileSync(fp, JSON.stringify(data), 'utf8');
        processedFiles++;
      }
      if (statOf[file]) cursor.files[file] = statOf[file];
    } catch (e) { /* skip unreadable */ }
  }

  // Commit this run's tallies, then audit GLOBALLY from accumulation.
  for (const [f, arr] of Object.entries(cursor._tallyBuf || {})) cursor.tallies[f] = arr;
  delete cursor._tallyBuf;
  for (const [f, arr] of Object.entries(cursor.tallies)) {
    for (const t of (arr || [])) {
      for (const mp of MISPLACED) {
        if (mp.re.test(t.sub) && mp.wrong.test(t.sk)) {
          misplaced.push(f + ': "' + t.sub + '" belongs in "' + mp.correct + '"');
        }
      }
      if (t.count === 0 && t.sub.length > 3) {
        emptySubtopics.push({ file: f, subject: t.sk, sub: t.sub });
      } else if (t.count < 15 && t.sub.length > 3) {
        thinSubtopics.push({ file: f, subject: t.sk, sub: t.sub, count: t.count });
      }
    }
  }
  try { saveJson(CURSOR, cursor); } catch (e) { console.log('agent: Questions — cursor save failed'); }

  thinSubtopics.sort((a, b) => a.count - b.count);

  // Report problems found (audit is global via accumulated tallies; the file
  // sweep itself was incremental — counts below note tallied coverage).
  const tallyFiles = Object.keys(cursor.tallies).length;
  if (thinSubtopics.length > 0) fixes.push({ page: 'data/questions', fix: 'Found ' + thinSubtopics.length + ' thin subtopics (< 15 questions)' });
  if (emptySubtopics.length > 0) fixes.push({ page: 'data/questions', fix: 'Found ' + emptySubtopics.length + ' empty subtopics' });
  if (misplaced.length > 0) fixes.push({ page: 'data/questions', fix: 'Misplaced: ' + misplaced.slice(0, 3).join('; ') });
  console.log('agent: Questions — swept ' + sweep.length + '/' + files.length + ' files this run, tallies cover ' + tallyFiles + '/' + files.length);

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
    console.log('agent: Questions — generating for "' + target.sub + '" (' + target.subject + ')');
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
        EXAMINER_STYLE + '\n' +
        'STRICT RULES:\n' +
        '1. Each question tests a DIFFERENT fact — no duplicates even if worded differently\n' +
        '2. Do NOT rephrase existing questions — cover NEW facts only\n' +
        '3. Explanations follow the examiner voice above (verdict + why + traps + hook)\n' +
        '4. Mix difficulty: easy (30%), medium (50%), hard (20%)\n' +
        '5. Questions must be specific and factual, not vague\n' +
        '6. Judge importance: "high" if PYQ-grade/core, "medium" if solid syllabus, "low" if trivia; list up to 5 exams from [UPSC, SSC CGL, SSC CHSL, SSC GD, SSC JE, IBPS PO, IBPS Clerk, SBI PO, SBI Clerk, RBI Grade B, RRB NTPC, NDA, CDS, CTET, GATE, NEET, JEE, Agniveer, UP Police, State PSC]\n' +
        '7. Return strict JSON: [{"question":"...","answer":"...","explanation":"...","difficulty":"easy|medium|hard","importance":"high|medium|low","importantFor":["EXAM"]}]',
        'Topic: ' + target.sub + ' (subject: ' + target.subject + ')\n' +
        'Existing questions (' + existingQs.length + '):\n' +
        existingQs.slice(0, 10).map(q => '- ' + (q.question || '').substring(0, 80)).join('\n') + '\n\n' +
        'Other topics in this file (DO NOT DUPLICATE):\n' +
        allCovered.slice(0, 20).join('\n') + '\n\n' +
        'Generate 6 NEW exam questions covering DIFFERENT facts.',
        1500,
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
          importance: ['high', 'medium', 'low'].indexOf(String(nq.importance || '').toLowerCase()) !== -1 ? String(nq.importance).toLowerCase() : 'medium',
          importantFor: Array.isArray(nq.importantFor) ? nq.importantFor.map(String).slice(0, 5) : [],
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

// ── Shared voice for ALL study-content generation ──
// Creative + intelligent + engaging is not a vibe, it is a structure: every
// explanation teaches the fact, defuses each trap, and leaves a memory hook.
// Used by the papers agent and the archive writer alike.
const EXAMINER_STYLE = 'Voice: a beloved examiner coaching a serious aspirant — sharp, warm, precise. ' +
  'Structure every explanation in 4 short parts: 1) VERDICT (the answer, plainly), 2) WHY (the core fact/principle), ' +
  '3) TRAPS (why each wrong option fails — name the specific error), 4) HOOK (one vivid memory hook + one exam-day trap alert). ' +
  'Plain text only. Stay consistent with the given answer; invent no dates, numbers, or names.';

// ── AGENT: Papers — real govt-exam papers with detailed model explanations ──
// Standing goal (pursued every rotation without being asked): papers.json
// covers the major govt exams with COMPLETE papers. papers.json held 1 paper
// (UPSC 2023, 39/100) while the nav promises 16 exams — this agent closes that
// gap progressively: complete partial papers first, then the next missing
// exam slot, enriching up to 8 explanations per run.
//
// HONESTY RULES (hard, official-only): papers.html carries ONLY real official
// papers. Corpus-assembled filler is FORBIDDEN - the old subject-matching
// path is deleted, not skipped. A question enters papers.json ONLY with
// official provenance (pyqExam + pyqYear set by the official-paper ingestor
// from QP + answer-key PDFs). Text-sniffing "pyq"/"previous year" is proven
// noise (matches game-sales trivia) and must never qualify anything.
// officialPdf/cutoff stay null unless the exact official values are known
// (the page renders them as absent). Explanations are model-derived and tagged.
// A partial honest paper beats a complete fake one, always.
const PAPERS_WANT = [
  // Official-pipeline exams ONLY: papers.html carries real official papers,
  // which need a stable official QP + answer-key PDF pair. CBT exams
  // (SSC/IBPS/SBI/RRB) publish no such pair - their PDFs are candidate
  // response sheets, never official keys - so they are DELIBERATELY absent
  // here (see excluded[] in official-paper-sources.json). Their practice
  // needs are served by hubs, mocks and practice sets, not papers.html.
  { id: 'upsc-prelims-2023-gs1', exam: 'UPSC', year: 2023, paper: 'GS Paper 1', target: 100, duration: 120, marks: 200 },
  { id: 'upsc-prelims-2024-gs1', exam: 'UPSC', year: 2024, paper: 'GS Paper 1', target: 100, duration: 120, marks: 200 },
  { id: 'upsc-cds-2024-gs', exam: 'CDS', year: 2024, paper: 'GS', target: 120, duration: 120, marks: 100 },
  { id: 'upsc-nda-2024-gat', exam: 'NDA', year: 2024, paper: 'GAT', target: 150, duration: 150, marks: 600 },
];
function paperOverlap(a, b) {
  const wa = String(a || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (!wa.length) return 0;
  const sb = new Set(String(b || '').toLowerCase().split(/\s+/));
  return wa.filter(w => sb.has(w)).length / wa.length;
}
async function agentPapers() {
  const fixes = [];
  if (!fs.existsSync('data/questions')) return { agent: 'papers', fixes: fixes };
  const papers = loadJson('data/papers.json', { papers: [] });
  if (!Array.isArray(papers.papers)) papers.papers = [];
  const haveIds = new Set();
  for (const p of papers.papers) for (const q of (p.questions || [])) if (q && q.id) haveIds.add(q.id);

  // Target: first incomplete paper. Explanations for its verified
  // questions are progress that needs no new questions. Question INTAKE is
  // the official-paper ingestor's job exclusively - this agent NEVER adds
  // questions (no mining, no filler, official-only).
  const target = papers.papers.find(p => (p.questions || []).length < (p.totalQuestions || 100));

  // Coverage report vs WANT (informational only). Missing slots await the
  // ingestor; this agent enriches whatever exists.
  {
    const havePapers = new Set(papers.papers.map(p => p.id));
    const missing = PAPERS_WANT.filter(s => !havePapers.has(s.id)).map(s => s.id);
    const partial = papers.papers
      .filter(p => (p.questions || []).length < (p.totalQuestions || 100))
      .map(p => p.id + ' ' + (p.questions || []).length + '/' + (p.totalQuestions || 100));
    console.log('agent: Papers - ' + papers.papers.length + '/' + PAPERS_WANT.length + ' slots present' +
      (partial.length ? '; partial: ' + partial.join(', ') : '; all complete') +
      (missing.length ? '; missing (awaiting ingestion): ' + missing.slice(0, 6).join(', ') + (missing.length > 6 ? ',...' : '') : ''));
  }
  if (!target) {
    console.log('agent: Papers - all known papers complete, nothing to enrich');
    return { agent: 'papers', fixes: fixes };
  }

  // Enrich: detailed model explanations for questions lacking them (cap 8/run).
  let enriched = 0;
  for (const q of target.questions) {
    if (enriched >= 8) break;
    if (q.explain && q.explain.length >= 150) continue;
    const sys = 'You are an expert govt-exam coach. Return STRICT JSON only: {"explain": "..."}. No markdown fences.';
    const user = EXAMINER_STYLE + '\nQuestion: ' + (q.q || '') + '\nAnswer: ' + (q.answer || '') + '\n' +
      (q.options ? 'Options: ' + JSON.stringify(q.options) + '\n' : '') +
      'Subject: ' + (q.subject || '') + ' | Exam: ' + (target.exam || '') + '\n' +
      'Keep the explanation 120-500 chars. Stay consistent with the given answer.';
    let done = false;
    for (let attempt = 1; attempt <= 2 && !done; attempt++) {
      const r = await callLLM(sys, user, 1024);
      if (!r || !r.text) continue;
      const txt = r.text.replace(/```[a-z]*|```/gi, '').trim();
      const s = txt.indexOf('{'), e = txt.lastIndexOf('}');
      if (s < 0 || e <= s) continue;
      try {
        const j = JSON.parse(txt.slice(s, e + 1));
        const ex = String(j.explain || '').trim();
        if (ex.length >= 100 && ex.length <= 1200) { q.explain = ex; enriched++; done = true; }
      } catch (e) { /* retry */ }
    }
  }
  if (enriched) {
    const exPreview = target.questions.filter(q => q.explain && q.explain.length >= 150).slice(-2).map(q => 'Q: ' + (q.q || '').slice(0, 100) + '\n→ ' + q.explain.slice(0, 220)).join('\n');
    fixes.push({ page: 'data/papers.json', fix: 'Wrote ' + enriched + ' detailed model explanation(s) in ' + target.id, text: exPreview.slice(0, 800) });
  }
  saveJson('data/papers.json', papers);
  console.log('agent: Papers — +' + enriched + ' explanations in ' + target.id + ' (official-only intake)');
  return { agent: 'papers', fixes: fixes };
}

// ── AGENT: WikiSyllabus — exam syllabus coverage that never stops ──
// Standing goal: every exam-relevant subject exists as a fetchable wiki
// category group. The plan (data/wiki-syllabus-plan.json) lists pending
// subjects; each run appends up to 2 missing groups to CATEGORIES in
// scripts/wiki-fill-all.cjs and marks them added. The nightly fill
// (WIKI_FILL_ALL=1) mines appended groups automatically; a DAY_GROUPS entry
// is added too so manual group runs cover them as well. Already-covered
// entries are marked done for free. When the plan empties, the agent keeps
// verifying every run (continuous coverage, never stops).
// The edit is append-only (existing indices never shift) and verified with
// node --check — on syntax failure the file is restored untouched.
const SYLLABUS_PLAN = 'data/wiki-syllabus-plan.json';
const FILL_PATH = 'scripts/wiki-fill-all.cjs';
async function agentWikiSyllabus() {
  const fixes = [];
  if (!fs.existsSync(SYLLABUS_PLAN) || !fs.existsSync(FILL_PATH)) return { agent: 'wikisyllabus', fixes: fixes };
  const plan = loadJson(SYLLABUS_PLAN, { entries: [] });
  if (!Array.isArray(plan.entries) || !plan.entries.length) return { agent: 'wikisyllabus', fixes: fixes };
  let fillSrc;
  try { fillSrc = fs.readFileSync(FILL_PATH, 'utf8'); }
  catch (e) { return { agent: 'wikisyllabus', fixes: fixes }; }

  const isCovered = (e) => {
    if (fillSrc.indexOf("wikiCat:'" + (e.wikiCat || '') + "'") !== -1) return true;
    const topics = Array.isArray(e.topics) ? e.topics : [];
    if (!topics.length) return false;
    let hits = 0;
    for (const t of topics) if (fillSrc.indexOf("'" + t + "'") !== -1) hits++;
    return hits >= Math.ceil(topics.length / 2);
  };

  let added = 0, checked = 0;
  const pendingBlocks = [];
  // Cap 5/run: group blocks are just text (the heavy mining happens in the
  // nightly fill, not here), so 15 optionals complete in ~3 runs (~1 day).
  const CAP = 5;
  for (const e of plan.entries) {
    if (e.status === 'added') continue;
    checked++;
    if (isCovered(e)) { e.status = 'added'; e.addedAt = e.addedAt || 'pre-existing'; continue; }
    if (pendingBlocks.length >= CAP) continue;
    // Format a group block matching the file's style.
    const topics = (Array.isArray(e.topics) ? e.topics : []).filter(t => t && t.length > 1);
    if (!topics.length) continue;
    pendingBlocks.push({ subject: e.subject, exam: e.exam || 'UPSC', wikiCat: e.wikiCat || '', topics: topics, entry: e });
  }

  for (const b of pendingBlocks) {
    const lines = [];
    for (let i = 0; i < b.topics.length; i += 5) {
      lines.push("    '" + b.topics.slice(i, i + 5).join("','") + "',");
    }
    // Anchor without assuming line endings (fill file is CRLF): find the
    // Rotation-groups marker, then the nearest preceding '];' — the
    // CATEGORIES close. Newline style follows the file.
    const eol = fillSrc.indexOf('\r\n') !== -1 ? '\r\n' : '\n';
    const rgIdx = fillSrc.indexOf('// Rotation groups');
    if (rgIdx === -1) { console.log('agent: WikiSyllabus — CATEGORIES anchor not found, skipping'); continue; }
    const catEnd = fillSrc.lastIndexOf('];', rgIdx);
    if (catEnd === -1) { console.log('agent: WikiSyllabus — CATEGORIES close not found, skipping'); continue; }
    const block = '  // ── AUTO: ' + b.subject + ' (' + b.exam + ' optional — agent-managed) ──' + eol +
      "  { name:'" + b.subject.replace(/'/g, '') + "', wikiCat:'" + b.wikiCat.replace(/'/g, '') + "', topics:[" + eol +
      lines.join(eol) + eol + '  ]},' + eol;
    fillSrc = fillSrc.slice(0, catEnd) + block + fillSrc.slice(catEnd);
    b.entry.status = 'added';
    b.entry.addedAt = new Date().toISOString().slice(0, 10);
    added++;
    fixes.push({ page: FILL_PATH, fix: 'Added wiki category group "' + b.subject + '" (' + b.topics.length + ' topics) for ' + b.exam });
  }

  if (added) {
    // Extend DAY_GROUPS so manual group runs cover the new indices too.
    // New groups appended above occupy the tail indices; recompute them.
    const countGroups = (fillSrc.match(/\{ name:'/g) || []).length;
    // DAY_GROUPS bookkeeping is index-based; rather than renumber anything,
    // append one group entry per new category at the tail.
    const dgAnchor = '\n];\n\nasync function main() {';
    const dgIdx = fillSrc.indexOf(dgAnchor);
    if (dgIdx !== -1) {
      // Find current max index referenced to place new tail indices safely:
      // appended CATEGORIES entries sit at positions (countGroups - added .. countGroups-1).
      const tail = [];
      for (let i = countGroups - added; i < countGroups; i++) tail.push(i);
      const dgBlock = '  [' + tail.join(',') + '], // Group AUTO: agent-added syllabus cats (' + new Date().toISOString().slice(0, 10) + ')\n';
      fillSrc = fillSrc.slice(0, dgIdx) + dgBlock + fillSrc.slice(dgIdx);
    }
    // Self-verify: syntax-check the NEW content in a temp file first; the
    // original is only replaced after the check passes. Never break the
    // 4MB fill pipeline with a bad edit.
    const tmpCheck = FILL_PATH + '.agentcheck.tmp';
    try {
      fs.writeFileSync(tmpCheck, fillSrc);
      execSync('node --check ' + tmpCheck, { stdio: 'pipe' });
    } catch (e) {
      try { fs.unlinkSync(tmpCheck); } catch (e2) { /* ignore */ }
      console.log('agent: WikiSyllabus — syntax check failed, original untouched; ' + String((e.stderr || e.message || e)).slice(0, 120));
      return { agent: 'wikisyllabus', fixes: [] };
    }
    try { fs.unlinkSync(tmpCheck); } catch (e) { /* ignore */ }
    try { fs.writeFileSync(FILL_PATH, fillSrc); }
    catch (e) { console.log('agent: WikiSyllabus — write failed'); return { agent: 'wikisyllabus', fixes: [] }; }
    plan.updatedAt = new Date().toISOString().slice(0, 10);
    saveJson(SYLLABUS_PLAN, plan);
  } else if (checked) {
    // Nothing to add but entries were verified — persist any status flips.
    saveJson(SYLLABUS_PLAN, plan);
  }
  const total = plan.entries.length, done = plan.entries.filter(e => e.status === 'added').length;
  console.log('agent: WikiSyllabus — plan ' + done + '/' + total + ' added (checked ' + checked + ', +' + added + ' this run)');
  if (done === total) fixes.push({ page: SYLLABUS_PLAN, fix: 'Syllabus plan COMPLETE — all ' + total + ' exam subjects have wiki categories; verifying continuously' });
  return { agent: 'wikisyllabus', fixes: fixes };
}

// ── AGENT: PracticeSets — fresh exam sets, single-click served ──
// Exam tabs (hubs) get single-click practice: mega-test.html?exam=<slug>
// serves data/practice-sets/<slug>.json instantly — pre-generated here, no
// live generation, no quality compromise. Standing goal: every exam hub has
// a set fresher than 7 days. One set per run (1 LLM call).
// Exam slugs discovered dynamically (hub dirs with index.html) + RRB (asked
// for, no hub dir yet) so new hubs are covered without code changes.
//
// SSC-JE special case: it is the biggest bank on the site (7000+ items,
// 26 subjects) and its page tutor serves these sets on a single click. The
// tutor only uses a set when >=3 of its items match the asked subject, so
// the exam-level mixed set alone never covered a subject. The four core
// subjects therefore get whole subject-scoped sets; priority order below
// puts the exam set first, then the subject sets, then everything else.
// Sets may carry validated SVG figures ("fig") for diagram-worthy items.
const PRACTICE_DIR = 'data/practice-sets';
const PRACTICE_EXTRA_SLUGS = ['rrb', 'ssc-je'];
const PRACTICE_EXAM_NAMES = {
  cgl: 'SSC CGL', rbi: 'RBI Grade B', jee: 'JEE', neet: 'NEET', gate: 'GATE',
  agniveer: 'Agniveer', upsc: 'UPSC', 'ibps-po': 'IBPS PO', 'sbi-clerk': 'SBI Clerk',
  'ssc-gd': 'SSC GD', ctet: 'CTET', nda: 'NDA', cds: 'CDS', clat: 'CLAT',
  ldc: 'LDC', 'kerala-psc': 'Kerala PSC', rrb: 'RRB NTPC', 'ssc-je': 'SSC JE'
};
const PRACTICE_SSC_JE_SETS = [
  { slug: 'ssc-je', subj: null },
  { slug: 'ssc-je-som', subj: 'Strength of Materials' },
  { slug: 'ssc-je-tom', subj: 'Theory of Machines' },
  { slug: 'ssc-je-thermo', subj: 'Thermodynamics' },
  { slug: 'ssc-je-fluids', subj: 'Fluid Mechanics' }
];
function practicePriority(slug) {
  if (slug === 'ssc-je') return 0;
  const i = PRACTICE_SSC_JE_SETS.findIndex(s => s.slug === slug);
  if (i !== -1) return i; // 1..4, in listed order
  if (slug === 'rrb') return 9;
  return 10;
}
function practiceExamName(slug) {
  const s = PRACTICE_SSC_JE_SETS.find(x => x.slug === slug);
  if (s) return s.subj ? 'SSC JE — ' + s.subj : 'SSC JE';
  return PRACTICE_EXAM_NAMES[slug] || slug.toUpperCase();
}
// Server-side gate for item figures. The client re-checks (js/fig-svg.js),
// but nothing questionable is ever stored: a figure must be a single <svg>
// with a viewBox and no script/handlers/external refs — or it is dropped and
// the item stays text-only.
function cleanFigSvg(raw) {
  if (!raw) return '';
  const s = String(raw).replace(/```[a-z]*|```/gi, '').trim();
  const m = s.match(/<svg[\s\S]*?<\/svg>/i);
  if (!m) return '';
  const svg = m[0];
  if (svg.length > 4000) return '';
  if (!/^<svg/i.test(svg)) return '';
  if (!/viewBox\s*=\s*["']?[-\d.]/.test(svg)) return '';
  if (/<script|on[a-z]+\s*=|javascript:|<image|href\s*=|xlink|data:|<foreignObject|<!\[CDATA|<iframe|<use|<animate/i.test(svg)) return '';
  return svg;
}
function practiceSlugs() {
  const slugs = [];
  try {
    for (const e of fs.readdirSync('.', { withFileTypes: true })) {
      if (!e.isDirectory() || e.name[0] === '.' || e.name === 'node_modules' || e.name === 'data' || e.name === 'figures') continue;
      try {
        if (fs.existsSync(e.name + '/index.html')) slugs.push(e.name);
      } catch (err) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }
  for (const s of PRACTICE_EXTRA_SLUGS) if (slugs.indexOf(s) === -1) slugs.push(s);
  // Only exam-like hubs (skip tooling dirs that happen to have index.html).
  const keep = slugs.filter(s => PRACTICE_EXAM_NAMES[s] || /^(cgl|rbi|jee|neet|gate|upsc|nda|cds|ctet|clat|ldc)/.test(s));
  // Subject-scoped SSC-JE sets are added after the exam-like filter (they are
  // not hubs, but the tutor serves them by subject name).
  for (const s of PRACTICE_SSC_JE_SETS) if (keep.indexOf(s.slug) === -1) keep.push(s.slug);
  return keep;
}
async function agentPracticeSets() {
  const fixes = [];
  const slugs = practiceSlugs();
  if (!slugs.length) return { agent: 'practicesets', fixes: fixes };
  // Stalest first: missing file = stalest; else by updatedAt age.
  const scored = [];
  for (const slug of slugs) {
    const fp = PRACTICE_DIR + '/' + slug + '.json';
    let age = Infinity;
    try {
      const d = loadJson(fp, null);
      if (d && d.updatedAt) age = Date.now() - new Date(d.updatedAt).getTime();
      else if (d && Array.isArray(d.questions) && d.questions.length >= 8) age = 8 * 86400000; // legacy set, refresh
      else if (fs.existsSync(fp)) age = 8 * 86400000;
    } catch (e) { /* treat as missing */ }
    scored.push({ slug: slug, age: age });
  }
  scored.sort((a, b) => (b.age - a.age) || (practicePriority(a.slug) - practicePriority(b.slug)));
  const target = scored[0];
  if (target.age < 7 * 86400000) {
    console.log('agent: PracticeSets — all sets fresh (stalest ' + Math.round(target.age / 86400000) + 'd)');
    return { agent: 'practicesets', fixes: fixes };
  }
  const examName = practiceExamName(target.slug);
  const targetSubj = (PRACTICE_SSC_JE_SETS.find(s => s.slug === target.slug) || {}).subj || null;
  const want = targetSubj ? 12 : 10;
  console.log('agent: PracticeSets — writing fresh set for ' + examName + ' (age ' + (target.age === Infinity ? 'missing' : Math.round(target.age / 86400000) + 'd') + ')');
  const figRule = 'FIGURES: only when a question genuinely needs a diagram (curve, cycle, sketch, geometry, chart), add "fig": a SMALL monochrome outline SVG string — viewBox="0 0 400 260", black strokes (#111) on white, font-family="serif", only <svg> <g> <path> <line> <circle> <rect> <polygon> <polyline> <text> elements, no scripts, no images, no external references, under 3500 characters. At most 2 items in the whole set get a fig. No diagram needed -> no "fig" key at all.';
  const sys = 'You are an expert govt-exam setter writing a rapid-fire practice set. ' +
    'Return STRICT JSON only: {"questions": [{"q": "...", "a": "...", "sub": "...", "fact": "...", "hint": "..."}]} — each item may optionally add a "fig" key (SVG, see the FIGURES rule in the brief). No markdown. ' +
    'FORMAT: short exact-answer items for a type-the-answer quiz (q = crisp question under 140 chars, a = exact short answer under 40 chars, ' +
    'sub = subject area, fact = 2-3 sentence solution with the working/shortcut, hint = one-line trap alert or speed tip). ' +
    'The optional "fig" is governed by the FIGURES rule in the brief. ' +
    EXAMINER_STYLE;
  const user = targetSubj
    ? 'Write ' + want + ' exam-real practice items for ' + examName + ' (SSC JE Mechanical paper difficulty: multi-step where apt, ' +
      'realistic numbers, standard SSC patterns). EVERY item must be from ' + targetSubj + ' and "sub" must be exactly "' + targetSubj + '". ' +
      'Every answer exact and checkable. Stay factual; invent no dates/numbers/names. ' + figRule
    : 'Write ' + want + ' exam-real practice items for ' + examName + ' (real paper difficulty: multi-step where apt, ' +
      'realistic numbers, standard exam patterns — SSC CGL Tier-1 / Banking / NDA style as applicable). ' +
      (target.slug === 'ssc-je'
        ? 'Spread items across the official SSC JE Mechanical subjects (Strength of Materials, Theory of Machines, Thermodynamics, Fluid Mechanics, Machine Design, Production Technology, Workshop Technology, Engineering Mechanics, Materials & Metallurgy, IC Engines, Heat Transfer, Boilers, Steam Turbines, Refrigeration & AC, Industrial Engineering, Engineering Mathematics) and set "sub" to the exact subject name. '
        : 'Mix subjects across the exam syllabus. ') +
      'Every answer exact and checkable. Stay factual; invent no dates/numbers/names. ' + figRule;
  const r = await callLLM(sys, user, 3072);
  if (!r || !r.text) return { agent: 'practicesets', fixes: fixes };
  let items = [];
  try {
    const txt = r.text.replace(/```[a-z]*|```/gi, '').trim();
    const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    items = Array.isArray(j.questions) ? j.questions : [];
  } catch (e) { console.log('agent: PracticeSets — unparseable response'); return { agent: 'practicesets', fixes: fixes }; }
  const clean = [];
  const seenQ = [];
  let figCount = 0;
  for (const it of items) {
    const q = String((it && it.q) || '').trim(), a = String((it && it.a) || '').trim();
    const fact = String((it && it.fact) || '').trim();
    if (q.length < 15 || q.length > 220 || !a || a.length > 60 || fact.length < 40) continue;
    if (seenQ.concat(loadJson(PRACTICE_DIR + '/' + target.slug + '.json', { questions: [] }).questions.map(x => x.q)).some(t => paperOverlap(q, t) > 0.7)) continue;
    seenQ.push(q);
    const item = {
      q: q, a: a, sub: String((it && it.sub) || 'General').slice(0, 60),
      fact: fact.slice(0, 600), hint: String((it && it.hint) || '').slice(0, 160),
      autoGen: true, writtenBy: process.env.OLLAMA_MODEL || 'qwen3.5:9b'
    };
    const fig = figCount < 2 ? cleanFigSvg(it && it.fig) : '';
    if (fig) { item.fig = fig; figCount++; }
    clean.push(item);
    if (clean.length >= want) break;
  }
  if (clean.length < 5) { console.log('agent: PracticeSets — only ' + clean.length + ' valid items, discarding set'); return { agent: 'practicesets', fixes: fixes }; }
  try { fs.mkdirSync(PRACTICE_DIR, { recursive: true }); } catch (e) { /* ignore */ }
  saveJson(PRACTICE_DIR + '/' + target.slug + '.json', {
    exam: examName, slug: target.slug, updatedAt: new Date().toISOString(),
    writtenBy: process.env.OLLAMA_MODEL || 'qwen3.5:9b', questions: clean
  });
  // Registry index: the on-page tutor reads this (one tiny fetch) to find
  // which agent-made sets cover a subject, instead of probing every exam file.
  try {
    const idxPath = PRACTICE_DIR + '/index.json';
    const idx = loadJson(idxPath, { updatedAt: null, sets: {} });
    if (!idx.sets) idx.sets = {};
    const subjects = {};
    clean.forEach(c => { subjects[c.sub || 'General'] = (subjects[c.sub || 'General'] || 0) + 1; });
    idx.sets[target.slug] = {
      exam: examName, updatedAt: new Date().toISOString(),
      count: clean.length, subjects: Object.keys(subjects)
    };
    idx.updatedAt = new Date().toISOString();
    saveJson(idxPath, idx);
  } catch (e) { /* registry best-effort */ }
  fixes.push({
    page: PRACTICE_DIR + '/' + target.slug + '.json',
    fix: 'Fresh practice set for ' + examName + ' (' + clean.length + ' exam-real items)',
    text: clean.slice(0, 3).map(c => 'Q: ' + c.q.slice(0, 100) + ' | A: ' + c.a).join('\n')
  });
  return { agent: 'practicesets', fixes: fixes };
}

// ── AGENT: MainsUpdates — dated "what changed after the answer" rail ──
// The mains bank is hand-authored and deliberately stable; the world it
// answers questions about is not. When a genuinely important development
// lands (a new law, a landmark judgment, a committee report, a scheme
// milestone), a candidate needs it ON the model answer, dated and sourced —
// not buried in a news feed. This agent checks ONE question per run (oldest
// checked first), reads a few free, working English news feeds (no API keys —
// PIB's RSS serves Hindi at every documented endpoint, and LiveLaw, Down To
// Earth and ThePrint refused the fetcher, all verified 2026-10-18; the desk
// is: The Hindu, Indian Express news + explained, Hindustan Times), and asks
// the model to pick at most two items that are BOTH major and directly
// relevant.
// The model may only pick by NUMBER from the fetched list; the URL is
// attached from the feed itself, never typed by the model, so an invented
// link cannot ship. The update TEXT is likewise the model's own writing:
// nothing is copied from the article or the headline, and a title-overlap
// gate rejects near-copies before anything is saved. Nothing relevant ->
// nothing is written: on a reviewed bank, silence beats noise. The whole bank
// rotates for free via the checked stamps kept in data/mains-updates.json.
const MAINS_BANK = 'data/mains-questions.json';
const MAINS_UPDATES = 'data/mains-updates.json';
const MAINS_FEEDS = [
  ['The Hindu', 'https://www.thehindu.com/news/national/feeder/default.rss'],
  ['Indian Express', 'https://indianexpress.com/section/india/feed/'],
  ['IE Explained', 'https://indianexpress.com/section/explained/feed/'],
  ['Hindustan Times', 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml']
];
function curlText(url, maxSeconds) {
  try {
    return execSync('curl -sfL --max-time ' + (maxSeconds || 25) + ' ' + JSON.stringify(url),
      { encoding: 'utf8', timeout: (maxSeconds + 8) * 1000, maxBuffer: 4 * 1024 * 1024 });
  } catch (e) { return ''; }
}
function rssDecode(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(+n); })
    .replace(/&#x([0-9a-f]+);/gi, function (m, n) { return String.fromCharCode(parseInt(n, 16)); })
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function rssItems(xml, source, maxItems) {
  const out = [];
  const parts = String(xml || '').split(/<item[\s>]/i).slice(1);
  for (const b of parts) {
    const t = rssDecode((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
    const l = rssDecode((b.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1]);
    const d = rssDecode((b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1]);
    if (!t || !/^https?:\/\//.test(l)) continue;
    const dt = d ? new Date(d) : null;
    out.push({
      source: source, title: t, link: l,
      date: (dt && !isNaN(dt.getTime())) ? dt.toISOString().slice(0, 10) : ''
    });
    if (out.length >= (maxItems || 15)) break;
  }
  return out;
}
async function agentMainsUpdates() {
  const fixes = [];
  const bank = loadJson(MAINS_BANK, null);
  if (!bank || !Array.isArray(bank.questions) || !bank.questions.length) return { agent: 'mainsupdates', fixes: fixes };
  let upd = loadJson(MAINS_UPDATES, null);
  if (!upd || typeof upd !== 'object') upd = {};
  if (!upd.meta || typeof upd.meta !== 'object') upd.meta = {};
  if (!upd.meta.checked || typeof upd.meta.checked !== 'object') upd.meta.checked = {};
  if (!upd.items || typeof upd.items !== 'object') upd.items = {};

  // Stalest checked first: never-checked questions come up before re-checks.
  const ranked = bank.questions.slice().sort(function (a, b) {
    const ca = Date.parse(upd.meta.checked[a.id] || '') || 0;
    const cb = Date.parse(upd.meta.checked[b.id] || '') || 0;
    return ca - cb;
  });
  const q = ranked[0];
  upd.meta.checked[q.id] = new Date().toISOString();

  // Gather: last ~14 months only, deduped by link, capped hard.
  const items = [];
  const seen = {};
  for (const f of MAINS_FEEDS) {
    for (const it of rssItems(curlText(f[1], 25), f[0], 15)) {
      const age = it.date ? (Date.now() - Date.parse(it.date)) : Infinity;
      if (!it.date || age > 430 * 86400000 || age < 0) continue;
      if (seen[it.link]) continue;
      seen[it.link] = 1;
      items.push(it);
      if (items.length >= 40) break;
    }
    if (items.length >= 40) break;
  }
  if (!items.length) {
    console.log('agent: MainsUpdates — feeds empty/unreachable; ' + q.id + ' checked with nothing to judge');
    saveJson(MAINS_UPDATES, upd);
    return { agent: 'mainsupdates', fixes: fixes };
  }
  const list = items.map(function (it, i) { return (i + 1) + '. [' + it.source + ' ' + it.date + '] ' + it.title; }).join('\n');
  const sys = 'You maintain a reviewed UPSC Mains model-answer bank. You get ONE exam question and a numbered list of recent news items. Pick an item ONLY if it is both (a) a major, citable development — a new law, a landmark court judgment, a committee report or a scheme milestone — and (b) directly relevant to that question\u2019s subject: an examiner would award marks for citing it. Ignore crime reports, obituaries, sports, routine politics and awareness days. Write the update ENTIRELY in your own words: never copy or lightly rephrase the headline — state the event and what it changes for the answer. Reply with STRICT JSON only: {"updates":[{"n":<item number>,"text":"one factual exam-register sentence under 260 characters, no URLs, in original wording, saying specifically what changed"}]} — or {"updates":[]} if nothing qualifies. At most 2 items. Never invent: use only what the title states as the underlying fact. No prose outside the JSON.';
  const user = 'Question: ' + q.question + '\nTopic: ' + (q.topic || '') + '\nPaper: ' + (q.paper || '') + '\n\nRecent items:\n' + list;
  const r = await callLLM(sys, user, 1024);
  let picks = [];
  try {
    const txt = String((r && r.text) || '').replace(/```[a-z]*|```/gi, '').trim();
    const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    picks = Array.isArray(j.updates) ? j.updates : [];
  } catch (e) { picks = []; }

  const have = Array.isArray(upd.items[q.id]) ? upd.items[q.id] : [];
  let added = 0;
  for (const p of picks) {
    if (added >= 2) break;
    const n = parseInt(p && p.n, 10);
    if (!(n >= 1 && n <= items.length)) continue;
    const it = items[n - 1];
    const text = rssDecode(String((p && p.text) || ''));
    if (text.length < 60 || text.length > 300) continue;
    if (/https?:\/\/|www\./i.test(text)) continue;
    if (have.some(function (u) { return u.src === it.link; })) continue;
    if (have.some(function (u) { return paperOverlap(u.text, text) > 0.6; })) continue;
    // Originality gate: the sentence must be the model's own wording. A high
    // word-overlap with the source headline means it parroted the feed — drop
    // it. Nothing copied ever ships; the link is attribution, not the text.
    if (paperOverlap(it.title, text) > 0.75) continue;
    have.push({ date: it.date, text: text, src: it.link, source: it.source });
    added++;
  }
  if (added) {
    upd.items[q.id] = have.slice(-3); // newest three; older ones roll off
    upd.meta.updatedAt = new Date().toISOString();
    saveJson(MAINS_UPDATES, upd);
    fixes.push({
      page: MAINS_UPDATES,
      fix: added + ' dated update(s) added to the model answer "' + q.id + '"',
      text: upd.items[q.id].map(function (u) { return u.date + ' — ' + u.text.slice(0, 120); }).join('\n')
    });
    console.log('agent: MainsUpdates — added ' + added + ' update(s) to ' + q.id);
  } else {
    saveJson(MAINS_UPDATES, upd); // persist the checked stamp; add nothing
    console.log('agent: MainsUpdates — nothing worth adding for ' + q.id);
  }
  return { agent: 'mainsupdates', fixes: fixes };
}

// ── AGENT: BankFigures — figures for the pre-inline static SSC-JE bank ──
// The ~7,000-question SSC-JE quiz bank predates inline figures, and its 42 JS
// files should not be rewritten to add them. Instead this agent draws small,
// labeled SVGs and stores them in data/ssc-je-qfig.json keyed by a hash of the
// normalized question text; js/ssc-je-training.js applies them at render time
// (and re-checks a stored text prefix, so a hash collision can never show the
// wrong diagram). Every figure passes the same server gate as practice-set
// figures (cleanFigSvg) and the client gate (js/fig-svg.js) — junk is dropped
// silently, and when a diagram would not genuinely help, the model must skip.
// Three questions per run; the cursor in the sidecar sweeps the whole bank.
const BANK_FIGS = 'data/ssc-je-qfig.json';
function readBankText(p) {
  const b = fs.readFileSync(p);
  if (b[0] === 0xFF && b[1] === 0xFE) return b.slice(2).toString('utf16le'); // some bank files are UTF-16LE
  if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) return b.slice(3).toString('utf8');
  return b.toString('utf8');
}
function qfigHash(t) {
  const s = String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
function loadBankQuestions() {
  const out = [];
  let files = [];
  try { files = fs.readdirSync('js').filter(f => /^ssc-je-.*\.js$/.test(f) && f !== 'ssc-je-training.js'); } catch (e) { return out; }
  for (const f of files) {
    let code = '';
    try { code = readBankText('js/' + f); } catch (e) { continue; }
    const sandbox = {};
    try { new Function('window', 'self', 'document', code)(sandbox, sandbox, { querySelector: function () { return null; } }); } catch (e) { continue; }
    for (const k of Object.keys(sandbox)) {
      const v = sandbox[k];
      if (!v || typeof v !== 'object') continue;
      for (const sub in v) {
        if (!Array.isArray(v[sub])) continue;
        for (const q of v[sub]) {
          if (q && q.q && !q.f) out.push({ sub: sub, q: String(q.q), h: String(q.h || ''), a: String(q.a || '') });
        }
      }
    }
  }
  return out;
}
async function agentBankFigures() {
  const fixes = [];
  let side = loadJson(BANK_FIGS, null);
  if (!side || typeof side !== 'object') side = {};
  if (!side.meta || typeof side.meta !== 'object') side.meta = {};
  if (!side.figs || typeof side.figs !== 'object') side.figs = {};
  if (typeof side.meta.cursor !== 'number') side.meta.cursor = 0;
  const all = loadBankQuestions();
  if (!all.length) return { agent: 'bankfigures', fixes: fixes };
  const start = side.meta.cursor % all.length;
  const rotated = all.slice(start).concat(all.slice(0, start));
  const picks = [];
  let lastIdx = 0;
  for (let i = 0; i < rotated.length && picks.length < 3; i++) {
    const item = rotated[i];
    if (!side.figs[qfigHash(item.q)]) { picks.push(item); lastIdx = i; }
  }
  if (!picks.length) {
    console.log('agent: BankFigures — bank fully covered (' + Object.keys(side.figs).length + ' figures)');
    return { agent: 'bankfigures', fixes: fixes };
  }
  let added = 0;
  for (const item of picks) {
    let r = null;
    try {
      r = await callLLM(
        'You write tiny inline SVG diagrams for an SSC-JE mechanical-engineering question bank. Draw ONE labeled monochrome diagram that explains the concept the question tests: a free-body or section sketch, a stress/strain or cycle curve on labeled axes, a velocity diagram, a mechanism outline. Style rules: exactly one <svg> element, viewBox="0 0 360 220", stroke #222, fill none, stroke-width 1.5, font-size 12, short labels (at most 4 words), transparent background, at most 40 shapes, no colors, no scripts, no images, no <style>. If a diagram would NOT genuinely help this question, do not force one. Reply STRICT JSON only: {"svg":"<svg ...>...</svg>"} or {"skip":true}.',
        'Subject: ' + item.sub + '\nQuestion: ' + item.q + '\nHint: ' + item.h + '\nAnswer: ' + item.a,
        2000
      );
    } catch (e) { r = null; }
    let ok = false;
    if (r && r.text) {
      try {
        const txt = String(r.text).replace(/```[a-z]*|```/gi, '').trim();
        const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
        if (j && j.svg) {
          const svg = cleanFigSvg(String(j.svg));
          if (svg && /<text/i.test(svg)) {
            side.figs[qfigHash(item.q)] = {
              svg: svg,
              n: String(item.q).toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120),
              sub: item.sub,
              at: new Date().toISOString().slice(0, 10)
            };
            added++;
            ok = true;
          }
        }
      } catch (e) { /* unparseable — nothing ships */ }
    }
    if (!ok) console.log('agent: BankFigures — skipped "' + item.q.slice(0, 50) + '" (' + (r ? 'no usable svg' : 'llm unavailable') + ')');
  }
  side.meta.cursor = (start + lastIdx + 1) % all.length;
  side.meta.built = Object.keys(side.figs).length;
  if (added) side.meta.updatedAt = new Date().toISOString();
  saveJson(BANK_FIGS, side);
  if (added) {
    fixes.push({
      page: BANK_FIGS,
      kind: 'figure',
      fix: added + ' bank figure(s) added (' + side.meta.built + ' total)',
      text: picks.map(function (p) { return p.q.slice(0, 80); }).join(' | ').slice(0, 400)
    });
  }
  console.log('agent: BankFigures — ' + added + '/' + picks.length + ' added this run, ' + side.meta.built + ' total');
  return { agent: 'bankfigures', fixes: fixes };
}

// ── AGENT: MockPapers — fresh questions for the unlimited mock tests ──
// The mock engine on /ssc-je blends a fresh pool (data/mock-fresh.json) ahead
// of the static bank. This agent writes one subject batch per run in the
// model's own words (nothing copied), validates strictly, and skips anything
// that duplicates the bank or the pool. Subject rotation lives in the file
// cursor, so the pool sweeps the whole technical syllabus over time.
const MOCK_FRESH = 'data/mock-fresh.json';
const MOCK_SUBJECT_ROT = [
  ['som', 'Strength of Materials'], ['tom', 'Theory of Machines'],
  ['thermo', 'Thermodynamics'], ['fluids', 'Fluid Mechanics'],
  ['design', 'Machine Design'], ['production', 'Production Technology'],
  ['emech', 'Engineering Mechanics'], ['materials', 'Materials & Metallurgy'],
  ['rac', 'Refrigeration & Air Conditioning'], ['ice', 'IC Engines'],
  ['hydmach', 'Hydraulic Machines'], ['heatt', 'Heat Transfer'],
  ['maths', 'Engineering Mathematics'], ['industrial', 'Industrial Engineering'],
  ['workshop', 'Workshop Technology'], ['steamturb', 'Steam Turbines'],
  ['boilers', 'Boilers'], ['aircomp', 'Air Compressors'],
  ['gasturb', 'Gas Turbines'], ['powerplant', 'Power Plant Engineering']
];
async function agentMockPapers() {
  const fixes = [];
  let pool = loadJson(MOCK_FRESH, null);
  if (!pool || typeof pool !== 'object') pool = {};
  if (!pool.meta || typeof pool.meta !== 'object') pool.meta = {};
  if (!Array.isArray(pool.items)) pool.items = [];
  if (typeof pool.meta.cursor !== 'number') pool.meta.cursor = 0;
  const pick = MOCK_SUBJECT_ROT[pool.meta.cursor % MOCK_SUBJECT_ROT.length];

  const r = await callLLM(
    'You are an exam question setter for Indian junior-engineer exams (SSC JE, RRB JE). Write NEW practice questions in your own words \u2014 direct-answer style (the app reveals hint, answer and solution, so no multiple-choice options; for numericals, state the given data inside the question). Use only standard textbook physics/engineering facts; never invent data.',
    'Generate 10 new exam-style questions on: ' + pick[1] + '.\n' +
    'Mix definition, numerical and applied-conceptual questions; each on a DIFFERENT sub-topic. Difficulty: SSC JE / RRB JE level.\n' +
    'Reply STRICT JSON array only: [{"q":"\u2026","h":"one-line hint","a":"direct answer (value+unit where numerical)","s":"2-3 sentence solution/why"}].',
    2400
  );
  let added = 0;
  if (r && r.text) {
    try {
      const txt = String(r.text).replace(/```[a-z]*|```/gi, '').trim();
      const arr = JSON.parse(txt.slice(txt.indexOf('['), txt.lastIndexOf(']') + 1));
      if (Array.isArray(arr)) {
        // Dedupe keys: the static bank + everything already in the pool.
        const seen = {};
        loadBankQuestions().forEach(function (x) { seen[qfigHash(x.q)] = 1; });
        pool.items.forEach(function (x) { if (x && x.q) seen[qfigHash(x.q)] = 1; });
        for (const x of arr) {
          if (!x || !x.q || !x.a) continue;
          const q = String(x.q).trim(), a = String(x.a).trim();
          const h = String(x.h || '').trim(), s = String(x.s || '').trim();
          if (q.length < 12 || q.length > 500 || a.length < 1 || a.length > 300) continue;
          const hk = qfigHash(q);
          if (seen[hk]) continue;
          seen[hk] = 1;
          pool.items.push({ ex: 'ssc-je', sub: pick[1], q: q, a: a, h: h, s: s, at: new Date().toISOString().slice(0, 10) });
          added++;
        }
      }
    } catch (e) { /* unparseable — nothing ships */ }
  }
  const CAP = 360;
  if (pool.items.length > CAP) pool.items = pool.items.slice(-CAP);
  pool.meta.cursor = (pool.meta.cursor + 1) % MOCK_SUBJECT_ROT.length;
  pool.meta.count = pool.items.length;
  if (added) pool.meta.updatedAt = new Date().toISOString();
  saveJson(MOCK_FRESH, pool);
  if (added) fixes.push({ page: MOCK_FRESH, kind: 'content', fix: added + ' fresh mock questions on ' + pick[1] + ' (' + pool.meta.count + ' in pool)', text: pick[1] });
  console.log('agent: MockPapers — ' + added + ' questions on ' + pick[1] + ' (' + pool.meta.count + ' in pool)');
  return { agent: 'mockpapers', fixes: fixes };
}

// ── AGENT: ExamPatterns — keeps the mock-test pattern registry current ──
// Mock tests follow data/exam-patterns.json. This agent watches news signals
// for JE-exam pattern/notification events and updates the registry ONLY when
// the model points at one of the fetched signal links as its source and the
// numbers pass sanity bounds; otherwise it records a dated, unverified watch
// note. Numbers are never invented without a source, and a pattern's verified
// date moves only on a real, sourced update. One model call, only when
// signals exist; feeds are used as event titles only, never article text.
const EXAM_PATTERNS = 'data/exam-patterns.json';
function patternDay() { return new Date().toISOString().slice(0, 10); }
async function agentExamPatterns() {
  const fixes = [];
  const conf = loadJson(EXAM_PATTERNS, null);
  if (!conf || !Array.isArray(conf.patterns) || !conf.patterns.length) return { agent: 'exampatterns', fixes: fixes };
  if (!conf.meta || typeof conf.meta !== 'object') conf.meta = {};
  if (!Array.isArray(conf.meta.changelog)) conf.meta.changelog = [];

  // Event signals: JE-exam stories that talk about pattern/notification and
  // could carry a change. Headlines only — feeds are never article text.
  const signals = [];
  for (const [name, url] of MAINS_FEEDS) {
    const items = rssItems(curlText(url), name, 12);
    for (const it of items) {
      if (!/SSC|RRB|Staff Selection|Railway/i.test(it.title)) continue;
      if (!/JE|Junior Engineer|pattern|syllabus|negative|marking|paper/i.test(it.title)) continue;
      signals.push(it);
    }
  }
  const sig = signals.slice(0, 8);
  if (!sig.length) {
    conf.meta.lastChecked = patternDay();
    saveJson(EXAM_PATTERNS, conf);
    console.log('agent: ExamPatterns — no pattern signals in feeds');
    return { agent: 'exampatterns', fixes: fixes };
  }
  const current = conf.patterns.map(function (p) { return p.id + ' | ' + p.name + ' | qs=' + p.qs + ' min=' + p.min + ' neg=' + p.neg; }).join('\n');
  const r = await callLLM(
    'You audit exam-pattern news for Indian junior-engineer exams. You are given CURRENT mock-pattern numbers and recent headlines. Decide if any headline reports an actual pattern change (question count, duration, negative marking, sections). Reply STRICT JSON: {"changed":false} OR {"changed":true,"id":"<one of the given pattern ids>","updates":{"qs":N?, "min":N?, "neg":N?},"note":"one line","source":"<the exact link>"} \u2014 include only fields that genuinely changed, and only when the headline text supports it. If unsure, reply {"changed":false}.',
    'CURRENT PATTERNS:\n' + current + '\n\nHEADLINES:\n' + sig.map(function (s, i) { return '[' + (i + 1) + '] ' + s.title + ' (' + s.source + ', ' + s.date + ') ' + s.link; }).join('\n'),
    800
  );
  let applied = false;
  if (r && r.text) {
    try {
      const txt = String(r.text).replace(/```[a-z]*|```/gi, '').trim();
      const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
      if (j && j.changed && j.id && j.updates && j.source) {
        const linkOk = sig.some(function (s) { return s.link === j.source; });
        const p = conf.patterns.filter(function (x) { return x.id === j.id; })[0];
        if (linkOk && p) {
          let touched = false;
          if (typeof j.updates.qs === 'number' && j.updates.qs >= 10 && j.updates.qs <= 300) { p.qs = Math.round(j.updates.qs); touched = true; }
          if (typeof j.updates.min === 'number' && j.updates.min >= 20 && j.updates.min <= 300) { p.min = Math.round(j.updates.min); touched = true; }
          if (typeof j.updates.neg === 'number' && j.updates.neg >= 0 && j.updates.neg <= 0.5) { p.neg = Math.round(j.updates.neg * 100) / 100; touched = true; }
          if (touched) {
            p.verifiedAt = patternDay();
            p.source = (j.note ? String(j.note).slice(0, 160) + ' \u2014 ' : '') + j.source;
            conf.meta.updatedAt = patternDay();
            conf.meta.changelog.push({ at: patternDay(), id: p.id, note: String(j.note || '').slice(0, 200), source: j.source, verified: true });
            applied = true;
          }
        }
        if (!applied) {
          conf.meta.changelog.push({ at: patternDay(), id: String(j.id).slice(0, 40), note: String(j.note || 'reported change could not be confirmed with a source').slice(0, 200), source: String(j.source).slice(0, 300), verified: false });
        }
      }
    } catch (e) { /* unparseable — nothing changes */ }
  }
  if (conf.meta.changelog.length > 40) conf.meta.changelog = conf.meta.changelog.slice(-40);
  conf.meta.lastChecked = patternDay();
  saveJson(EXAM_PATTERNS, conf);
  if (applied) fixes.push({ page: EXAM_PATTERNS, kind: 'content', fix: 'mock pattern updated from a news signal (see changelog)', text: sig[0].title });
  console.log('agent: ExamPatterns — ' + (applied ? 'pattern updated' : 'signals seen, no verified change') + ' (' + sig.length + ' signals)');
  return { agent: 'exampatterns', fixes: fixes };
}

// ── AGENT: Invention — the site invents a new tool for itself ──
// Once per qualifying run this agent CONCEIVES a new interactive study tool
// (never a text page, never a fix), writes its code, and ships it only after
// automated verification. The inventory of existing features is fed in so it
// invents something genuinely new; the registry (data/inventions.json) is
// surfaced live on lab.html, so every shipped invention is visible to users.
// Nothing ships on failure — the idea waits, with the reason logged.
const INVENTIONS = 'data/inventions.json';
// ── invention-gate (pure; test harness extracts this block) ──
const INVENTION_BANNED = /(fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|\beval\s*\(|new\s+Function|import\s*\(|localStorage|sessionStorage|document\.cookie|window\.open|https?:\/\/)/;
function buildInventionPage(d) {
  const reject = (why) => ({ ok: false, reason: why });
  if (!d || typeof d !== 'object') return reject('no payload');
  const title = String(d.title || '').trim();
  const slug = String(d.slug || '').trim().toLowerCase();
  const concept = String(d.concept || '').trim();
  const why = String(d.why || '').trim();
  const body = String(d.body_html || '').trim();
  const script = String(d.script || '').trim();
  if (title.length < 8 || title.length > 90) return reject('title length');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 4 || slug.length > 40) return reject('slug shape');
  if (concept.length < 40 || concept.length > 600) return reject('concept length');
  if (why.length < 10 || why.length > 300) return reject('why length');
  if (body.length < 200 || body.length > 10000) return reject('body length');
  if (script.length < 200 || script.length > 9000) return reject('script length');
  const joined = body + '\n' + script;
  if (/<\s*\/?\s*(script|style|html|head|body)\b/i.test(joined)) return reject('markup breakout');
  if (/<(iframe|object|embed|link)\b/i.test(joined)) return reject('external/embedding tag');
  if (/href\s*=\s*["']#/i.test(joined)) return reject('href="#" present');
  if (INVENTION_BANNED.test(joined)) return reject('banned API or external URL');
  if (!/(addEventListener|onclick|oninput|onchange)/.test(script)) return reject('no interaction loop');
  try { new Function(script); } catch (e) { return reject('script syntax: ' + String(e.message).slice(0, 120)); }
  const descAttr = esc(concept.slice(0, 150)).replace(/"/g, '&quot;');
  const html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + esc(title) + ' \u2014 invented by the site agent</title>\n<meta name="description" content="' + descAttr + '">\n<style>body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,-apple-system,sans-serif;padding:20px;max-width:920px;margin:0 auto;line-height:1.55}h1{font-size:22px;margin:0 0 4px}.crumb{color:#71717a;font-size:12px;margin-bottom:16px}.crumb a{color:#60a5fa;text-decoration:none}.lead{color:#a1a1aa;font-size:13px;margin:0 0 18px}button{font-family:inherit;background:#1a1a2e;color:#e5e5e5;border:1px solid #3b82f6;border-radius:8px;padding:8px 14px;font-size:13.5px;cursor:pointer;font-weight:600}button:hover{border-color:#60a5fa;color:#fff}input,select{font-family:inherit;background:#111;color:#e5e5e5;border:1px solid #333;border-radius:8px;padding:7px 10px;font-size:13.5px}table{border-collapse:collapse}td,th{padding:6px 10px;border-bottom:1px solid #27272a;font-size:13.5px}</style>\n</head>\n<body>\n<div class="crumb"><a href="lab.html">Invention Lab</a> / ' + esc(title) + '</div>\n<h1>' + esc(title) + '</h1>\n<div class="lead">' + esc(concept) + '</div>\n' + body + '\n<script>\n' + script + '\n</script>\n<div style="margin-top:26px;font-size:11.5px;color:#52525b">Invented and built by the site agent on ' + new Date().toISOString().slice(0, 10) + '. No human asked for this.</div>\n</body>\n</html>';
  return { ok: true, slug: slug, title: title, concept: concept, why: why, html: html };
}
// ── /invention-gate ──
function inventionInventory() {
  const pages = listPages().filter(p => p.endsWith('.html')).slice(0, 70);
  const inv = loadJson(INVENTIONS, { items: [] });
  const titles = ((inv && inv.items) || []).map(x => x && x.title).filter(Boolean);
  return { pages: pages.join(', '), titles: titles.join(' | ') || '(none yet)' };
}
async function agentInvention() {
  const fixes = [];
  let reg = loadJson(INVENTIONS, null);
  if (!reg || typeof reg !== 'object') reg = {};
  if (!reg.meta || typeof reg.meta !== 'object') reg.meta = {};
  if (!Array.isArray(reg.items)) reg.items = [];
  const inv = inventionInventory();
  const existing = new Set(listPages());
  reg.items.forEach(x => { if (x && x.slug) existing.add(x.slug + '.html'); });

  const r = await callLLM(
    'You invent interactive study tools for Indian engineering-exam aspirants (SSC JE / RRB JE, mechanical). Invent ONE genuinely NEW tool — never a static text page, never a copy of an existing feature. It must be a single self-contained page: interactive (input, choices, generated practice, scoring or visualisation), usable offline, no network, no storage, no external assets, no eval. Think: practice generators for a single tricky unit, calculators that drill you afterwards, visualisers (SFD/BMD, gear trains, cycles), formula trainers, small timed sprints.',
    'EXISTING SITE FEATURES (do not duplicate or rephrase): timed mock tests with negative marking; subject-wise reveal-style practice quiz with bookmarks and history; AI exam tutor; practice-set generator; mains exams section; mental math arena; figures/visual packs; comparison/revision/mnemonic pages; wiki; lessons.\n' +
    'ALREADY-INVENTED TOOLS (do not repeat): ' + inv.titles + '\n' +
    'EXISTING PAGES (slug must not collide): ' + inv.pages + '\n\n' +
    'Reply STRICT JSON only: {"title":"<=90 chars","slug":"kebab-case-unique","concept":"2-3 sentences: the new idea and the study gap it fills","why":"one sentence: the value it adds","body_html":"inner HTML of the tool (controls + output areas; classes are fine; no <script>)","script":"JavaScript for the tool: wire handlers with addEventListener to ids/classes present in body_html; fully self-contained; <=9000 chars"}',
    3200, 'high'
  );
  if (r && r.text) {
    try {
      const txt = String(r.text).replace(/```[a-z]*|```/gi, '').trim();
      const d = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
      const built = buildInventionPage(d);
      if (!built.ok) {
        reg.meta.lastAttempt = { at: new Date().toISOString(), reason: built.reason };
        console.log('agent: Invention — rejected (' + built.reason + ')');
      } else if (existing.has(built.slug + '.html') || fs.existsSync(built.slug + '.html')) {
        reg.meta.lastAttempt = { at: new Date().toISOString(), reason: 'slug already exists: ' + built.slug };
        console.log('agent: Invention — rejected (slug exists)');
      } else {
        // Final gate: the script must also pass the same standalone syntax
        // check the CI deploy stack uses.
        const tmp = 'scripts/.invention-check.js';
        let syntaxOk = true;
        try {
          fs.writeFileSync(tmp, String(d.script));
          execSync('node --check ' + tmp, { stdio: 'pipe' });
        } catch (e) { syntaxOk = false; }
        try { fs.unlinkSync(tmp); } catch (e2) { /* ignore */ }
        if (!syntaxOk) {
          reg.meta.lastAttempt = { at: new Date().toISOString(), reason: 'node --check failed' };
          console.log('agent: Invention — rejected (node --check)');
        } else {
          fs.writeFileSync(built.slug + '.html', built.html);
          reg.items.push({ slug: built.slug, title: built.title, concept: built.concept, why: built.why, at: new Date().toISOString().slice(0, 10), model: r.model || '' });
          if (reg.items.length > 60) reg.items = reg.items.slice(-60);
          reg.meta.count = reg.items.length;
          reg.meta.updatedAt = new Date().toISOString();
          reg.meta.lastAttempt = { at: new Date().toISOString(), reason: 'shipped' };
          fixes.push({ page: built.slug + '.html', kind: 'invention', fix: 'INVENTED + shipped: ' + built.title + ' — ' + built.concept.slice(0, 140), model: r.model || '' });
          console.log('agent: Invention — shipped ' + built.slug + '.html :: ' + built.title);
        }
      }
    } catch (e) {
      reg.meta.lastAttempt = { at: new Date().toISOString(), reason: 'unparseable output' };
      console.log('agent: Invention — unparseable model output');
    }
  } else {
    reg.meta.lastAttempt = { at: new Date().toISOString(), reason: 'model returned nothing' };
  }
  saveJson(INVENTIONS, reg);
  return { agent: 'invention', fixes: fixes };
}

// ── AGENT: MainsFresh — frozen mains practice questions for the page button ──
// mains.html's "Generate one more question + model answer" used to compile a
// 1-2 GB language model in the VISITOR's browser and run it on their GPU --
// the hottest thing on the site, and visitors reported machines heating up.
// This agent writes the same kind of item here, on the build runners, once per
// run, into data/mains-fresh.json; the page then serves from that frozen batch
// instantly and only falls back to on-device generation (behind an explicit
// permission card) when the batch is empty.
const MAINS_FRESH = 'data/mains-fresh.json';
const MAINS_FRESH_CAP = 40;
const MAINS_PAPERS = ['gs1', 'gs2', 'gs3', 'gs4', 'essay'];
const MAINS_MARKS = [10, 15, 20, 125, 250];
function mainsNorm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function mainsItemOk(o) {
  if (!o || typeof o !== 'object') return 'not an object';
  const q = String(o.question || '').trim();
  if (q.length < 40 || q.length > 700) return 'question length';
  if (/[<>]/.test(q)) return 'question markup';
  const paper = String(o.paper);
  if (MAINS_PAPERS.indexOf(paper) === -1) return 'paper';
  const marks = Number(o.marks);
  if (MAINS_MARKS.indexOf(marks) === -1) return 'marks';
  if (paper === 'essay' && marks !== 125 && marks !== 250) return 'essay marks';
  if (paper !== 'essay' && marks > 20) return 'gs marks';
  if (['easy', 'medium', 'high'].indexOf(String(o.difficulty)) === -1) return 'difficulty';
  const ans = Array.isArray(o.answer) ? o.answer.filter(s => s && (s.h || s.p)) : [];
  if (ans.length < 4 || ans.length > 6) return 'answer sections';
  for (const s of ans) {
    if (String(s.h || '').length < 2 || String(s.h || '').length > 90) return 'section heading';
    if (String(s.p || '').length < 120 || String(s.p || '').length > 1500) return 'section paragraph';
  }
  if (!Array.isArray(o.marksGuide) || o.marksGuide.length < 3 || o.marksGuide.length > 6) return 'marksGuide';
  if (!Array.isArray(o.pitfalls) || o.pitfalls.length < 3 || o.pitfalls.length > 6) return 'pitfalls';
  if (!Array.isArray(o.keywords) || o.keywords.length < 5 || o.keywords.length > 8) return 'keywords';
  if (!Array.isArray(o.laws) || o.laws.length > 8) return 'laws';
  return null;
}
async function agentMainsFresh() {
  const fixes = [];
  let pool = loadJson(MAINS_FRESH, null);
  if (!pool || typeof pool !== 'object') pool = {};
  if (!pool.meta || typeof pool.meta !== 'object') pool.meta = {};
  if (!Array.isArray(pool.items)) pool.items = [];

  // Dedupe against the hand-authored bank and the pool itself, by normalized
  // full text and by opening signature (a reworded opener is still a repeat).
  const bank = loadJson(MAINS_BANK, null);
  const known = new Set();
  const sigs = new Set();
  function addKnown(question) {
    const n = mainsNorm(question);
    if (!n) return;
    known.add(n);
    sigs.add(n.slice(0, 80));
  }
  if (bank && Array.isArray(bank.questions)) bank.questions.forEach(q => addKnown(q.question));
  pool.items.forEach(x => { if (x && x.question) addKnown(x.question); });

  const sys = 'You write UPSC Civil Services Mains practice questions with model-answer skeletons for Indian aspirants. ' +
    'Reply with ONE valid JSON object and nothing else: no markdown fences, no commentary before or after. ' +
    'Shape: {"paper":"gs3","topic":"short topic label","marks":15,"difficulty":"medium",' +
    '"question":"full question text including the marking note, e.g. (15 marks, 250 words)",' +
    '"answer":[{"h":"short heading","p":"2-4 sentence paragraph"}],' +
    '"marksGuide":["what the examiner rewards"],"pitfalls":["how this is answered badly"],' +
    '"keywords":["term"],"laws":["law, case or scheme, only if certain"]}. ' +
    'Constraints: "paper" is one of gs1,gs2,gs3,gs4,essay; marks 10, 15 or 20 for GS papers, 125 or 250 only for the essay; ' +
    '4 to 6 objects in "answer"; 3 to 5 strings each in marksGuide and pitfalls; 5 to 8 keywords; "laws" may be []. ' +
    'Keep every "p" paragraph to 2-4 sentences. Never invent a scheme, case, article or statistic: name a reform only when certain of it, with its year; ' +
    'a verified older example beats an uncertain new one. Prefer safe, verifiable general knowledge. Stay exam-safe and neutral. ' +
    'Do not reason step by step; reply with ONLY the JSON object.';
  const avoid = Array.from(sigs).slice(0, 60).map((s, i) => (i + 1) + '. ' + s).join('\n');
  const user = 'Create ONE practice question, choosing the paper and a topic where aspirants are weakest, avoiding the most over-used questions ' +
    'and never repeating any question below (already covered).\n\nALREADY COVERED (do not repeat, do not reword):\n' + (avoid || '(none)');

  let r = null;
  try { r = await callLLM(sys, user, 2600); }
  catch (e) { console.log('agent: MainsFresh — call failed: ' + String(e.message || e).slice(0, 160)); }

  let reason = 'no model output';
  let shipped = null;
  if (r && r.text) {
    try {
      const t = String(r.text)
        .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, ' ')
        .replace(/```[a-z]*|```/gi, '').trim();
      const obj = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
      const bad = mainsItemOk(obj);
      const nq = mainsNorm(obj && obj.question);
      if (bad) reason = 'validation: ' + bad;
      else if (known.has(nq) || sigs.has(nq.slice(0, 80))) reason = 'duplicate question';
      else {
        const item = {
          id: 'ci-' + Date.now().toString(36),
          at: new Date().toISOString().slice(0, 10),
          paper: String(obj.paper),
          topic: String(obj.topic || 'AI practice').slice(0, 160),
          marks: Number(obj.marks),
          difficulty: String(obj.difficulty),
          years: [],
          question: String(obj.question).trim(),
          answer: obj.answer.filter(s => s && (s.h || s.p)).slice(0, 6)
            .map(s => ({ h: String(s.h || 'Section').slice(0, 120), p: String(s.p || '').slice(0, 1400) })),
          marksGuide: obj.marksGuide.filter(Boolean).map(String).slice(0, 6),
          pitfalls: obj.pitfalls.filter(Boolean).map(String).slice(0, 6),
          laws: (obj.laws || []).filter(Boolean).map(String).slice(0, 8),
          keywords: obj.keywords.filter(Boolean).map(String).slice(0, 8),
          origin: 'ci',
          ai: 1,
          model: r.model || ''
        };
        pool.items.push(item);
        if (pool.items.length > MAINS_FRESH_CAP) pool.items = pool.items.slice(-MAINS_FRESH_CAP);
        shipped = item;
        fixes.push({ page: MAINS_FRESH, kind: 'mainsfresh', fix: 'Shipped practice question ' + item.id + ' (' + item.paper + ', ' + item.marks + ' marks): ' + item.question.slice(0, 120), model: r.model || '' });
      }
    } catch (e) { reason = 'unparseable output'; }
  }
  pool.meta.about = "Frozen AI practice questions for the mains page button. Written by the site's own model " +
    "(scripts/site-agent.js, agent MainsFresh) on the GitHub build runners, in its own words. Unreviewed practice " +
    'material, badged on the page, and kept out of the hand-authored bank in data/mains-questions.json.';
  pool.meta.updated = new Date().toISOString().slice(0, 10);
  pool.meta.count = pool.items.length;
  pool.meta.lastAttempt = { at: new Date().toISOString(), reason: shipped ? 'shipped ' + shipped.id : reason };
  saveJson(MAINS_FRESH, pool);
  console.log('MAINS-FRESH-RESULT shipped=' + (shipped ? shipped.id : 'none') + ' pool=' + pool.items.length + ' reason=' + (shipped ? 'ok' : reason));
  return { agent: 'mainsfresh', fixes: fixes };
}

// ── AGENT: GraphNotes — proper relationship explanations on flowchart cards ──
// Clicking Gandhi showed generic (sometimes wrong-entity) descriptions and
// "mentioned with" everywhere, plus junk cards (TV sitcoms, absurd spans).
// The page already renders per-link evidence (REL_EV), authored briefs
// (NOTES/CUR_DESC) and typed rels — it just has none for mined topics.
// This agent upgrades one focus topic per run: junk out, every kept card
// gets a verified-correct description + a HOW-it-relates note + a real verb.
// When an entry is fully upgraded, its _gen flag is dropped (promoted to
// curated authority on the page). Starts with Gandhi (most visible).
const GRAPH_LAYERS = 'data/topic-layers.json';
// Deterministic junk: not entities at all, or never a real relation.
const GRAPH_JUNK_NAMES = ['friends', 'television', 'the bill', 'sports', 'empire',
  '19th century', 'york', 'chelmsford', 'jews', 'theatre', 'poetry', 'cinema'];
const GRAPH_VERBS = ['led', 'participated-in', 'founded', 'assassinated-by', 'assassinated',
  'imprisoned-at', 'born-in', 'died-in', 'wrote', 'opposed', 'influenced', 'influenced-by',
  'contemporary-of', 'member-of', 'took-place-in', 'lived-in', 'visited', 'worked-in',
  'protested-against', 'negotiated-with', 'mentor-of', 'follower-of'];
function graphJunk(item) {
  const n = String((item && item.name) || '').toLowerCase().trim();
  if (!n) return 'empty name';
  if (GRAPH_JUNK_NAMES.indexOf(n) !== -1) return 'denylisted non-entity';
  const d = String((item && (item.desc || item.note)) || '');
  if (d.indexOf('_____') !== -1) return null; // bad note, entity may be fine
  return null;
}
async function agentGraphNotes() {
  const fixes = [];
  if (!fs.existsSync(GRAPH_LAYERS)) return { agent: 'graphnotes', fixes: fixes };
  let layers;
  try { layers = JSON.parse(fs.readFileSync(GRAPH_LAYERS, 'utf8')); } catch (e) { return { agent: 'graphnotes', fixes: fixes }; }
  const keys = Object.keys(layers);
  // Priority: Gandhi first (user-named), then heaviest _gen entries.
  const scored = [];
  for (const k of keys) {
    const e = layers[k];
    if (!e || !e.branches) continue;
    if (!e._gen) continue; // already curated
    let w = 0, n = 0, bad = 0;
    for (const b of (e.branches || [])) {
      for (const it of (b.items || [])) {
        n++;
        w += (it && it.w) || 0;
        const note = String((it && it.note) || '');
        if (!note || note.indexOf('_____') !== -1) bad++;
      }
    }
    if (!n) continue;
    scored.push({ key: k, weight: (k.toLowerCase().indexOf('gandhi') !== -1 ? 1e12 : 0) + w, items: n, bad: bad });
  }
  scored.sort((a, b) => b.weight - a.weight);
  const focus = scored[0];
  if (!focus) { console.log('agent: GraphNotes — all layers curated, nothing to upgrade'); return { agent: 'graphnotes', fixes: fixes }; }
  console.log('agent: GraphNotes — upgrading "' + focus.key + '" (' + focus.items + ' items, ' + focus.bad + ' bad notes)');
  const entry = layers[focus.key];
  const flat = [];
  for (const b of (entry.branches || [])) {
    for (const it of (b.items || [])) flat.push({ branch: b, item: it });
  }
  // Deterministic junk removal first (no LLM spent on non-entities).
  let removed = 0;
  for (const b of (entry.branches || [])) {
    const keep = [];
    for (const it of (b.items || [])) {
      const why = graphJunk(it);
      if (why && why !== null && GRAPH_JUNK_NAMES.indexOf(String(it.name || '').toLowerCase().trim()) !== -1) {
        removed++;
        fixes.push({ page: GRAPH_LAYERS, fix: 'GraphNotes dropped junk card "' + it.name + '" from ' + focus.key + ' (' + why + ')' });
        continue;
      }
      keep.push(it);
    }
    b.items = keep;
  }
  // LLM upgrade in batches of 8: proper desc + relationship note + real verb,
  // or drop:true with a reason for junk the rules cannot see.
  let upgraded = 0, droppedLLM = 0;
  for (let i = 0; i < flat.length; i += 8) {
    const batch = flat.slice(i, i + 8).filter(x => (entry.branches || []).some(b => (b.items || []).indexOf(x.item) !== -1));
    if (!batch.length) continue;
    const spec = batch.map((x, j) => (j + 1) + '. "' + x.item.name + '" (' + (x.item.type || '?') + ') current desc: "' + String(x.item.desc || '').slice(0, 120) + '"').join('\n');
    const sys = 'You curate knowledge-graph cards for Indian exam prep. Return STRICT JSON only: ' +
      '{"items": [{"n": 1, "keep": true, "desc": "...", "note": "...", "rel": "verb"}]}. No markdown. ' +
      'FOCUS TOPIC: ' + focus.key + '. For each numbered card: desc = one correct line ABOUT THE CARD ITSELF ' +
      '(fix it if the current one belongs to another entity); note = 1-2 sentences explaining HOW THIS CARD ' +
      'RELATES TO ' + focus.key + ' specifically (events, dates, places, roles — factual, verifiable, no invention); ' +
      'rel = one verb from [' + GRAPH_VERBS.join(', ') + '] (never "mentioned with"). ' +
      'If the card has NO real relationship to ' + focus.key + ', use {"n": N, "keep": false, "why": "..."} instead. ' +
      EXAMINER_STYLE;
    const r = await callLLM(sys, 'Cards for ' + focus.key + ':\n' + spec, 2048);
    if (!r || !r.text) continue;
    try {
      const txt = r.text.replace(/```[a-z]*|```/gi, '').trim();
      const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
      for (const out of (j.items || [])) {
        const b = batch[(out.n || 1) - 1];
        if (!b) continue;
        if (out.keep === false) {
          const arr = b.branch.items;
          const at = arr.indexOf(b.item);
          if (at !== -1) arr.splice(at, 1);
          droppedLLM++;
          fixes.push({ page: GRAPH_LAYERS, fix: 'GraphNotes dropped "' + b.item.name + '" from ' + focus.key + ' (LLM: ' + String(out.why || 'no real relation').slice(0, 100) + ')' });
          continue;
        }
        const note = String(out.note || '').trim(), desc = String(out.desc || '').trim();
        const rel = String(out.rel || '').trim();
        if (note.length < 40 || note.length > 600 || note.indexOf('_____') !== -1) continue;
        if (desc.length < 10 || desc.length > 300) continue;
        if (GRAPH_VERBS.indexOf(rel) === -1) continue;
        b.item.note = note;
        b.item.desc = desc;
        b.item.rel = rel;
        b.item.src = 'curated';
        upgraded++;
      }
    } catch (e) { console.log('agent: GraphNotes — batch unparseable, skipped'); }
    if (upgraded + droppedLLM >= 24) break; // budget: ~3 LLM calls per run
  }
  // Promotion check: fully upgraded (no junk, every item has a real note) →
  // drop _gen so the page grants curated authority.
  let remaining = 0, badNotes = 0;
  for (const b of (entry.branches || [])) {
    for (const it of (b.items || [])) {
      remaining++;
      const note = String(it.note || '');
      if (!note || note.indexOf('_____') !== -1 || it.rel === 'mentioned with') badNotes++;
    }
  }
  if (remaining > 0 && badNotes === 0 && entry._gen) {
    delete entry._gen;
    fixes.push({ page: GRAPH_LAYERS, fix: 'GraphNotes PROMOTED "' + focus.key + '" to curated (' + remaining + ' verified cards)' });
  }
  if (upgraded || removed || droppedLLM || !entry._gen) {
    try { fs.writeFileSync(GRAPH_LAYERS, JSON.stringify(layers)); } catch (e) { return { agent: 'graphnotes', fixes: fixes }; }
  }
  if (upgraded) fixes.push({
    page: GRAPH_LAYERS,
    fix: 'GraphNotes wrote ' + upgraded + ' relationship note(s) for ' + focus.key,
    text: 'Sample: ' + String((flat.find(x => x.item.note) || {}).item?.note || '').slice(0, 300)
  });
  console.log('agent: GraphNotes — ' + focus.key + ': +' + upgraded + ' notes, -' + (removed + droppedLLM) + ' junk');
  return { agent: 'graphnotes', fixes: fixes };
}

// ── Main ──
async function agentSelfCheck() {
  const fixes = [];
  const pages = listPages();

  const criticalFiles = [
    'index.html', 'ask.html', 'papers.html', 'mega-test.html',
    'improve.html', 'science.html', 'polytechnic.html', 'mental.html', 'ssc-je.html',
    'js/mental-training.js', 'scripts/lib/ask-core.js', 'scripts/lib/ask-llm.js',
    'data/papers.json', 'data/ask-index.json', 'data/mega-quiz.json'
  ];
  for (const f of criticalFiles) {
    // fileExistsAnywhere: fs.existsSync alone reports false for tracked
    // files that a sparse checkout did not materialize.
    if (!fileExistsAnywhere(f)) {
      fixes.push({ page: f, fix: 'CRITICAL FILE MISSING', kind: 'critical' });
    }
  }
  // Content sanity for the mega quiz bank (presence is not enough — a stale
  // 4-subject build once shipped while the page 404d on missing data).
  // Degraded bank = critical: mega-test has nothing to serve.
  try {
    if (fileExistsAnywhere('data/mega-quiz.json') && fs.existsSync('data/mega-quiz.json')) {
      const mq = JSON.parse(fs.readFileSync('data/mega-quiz.json', 'utf8'));
      const nq = ((mq && mq.questions) || []).length;
      const ns = Object.keys((mq && mq.subjects) || {}).length;
      if (nq < 1000 || ns < 20) {
        fixes.push({ page: 'data/mega-quiz.json', fix: 'DEGRADED bank: ' + nq + ' questions across ' + ns + ' subjects (need 1000+/20+) — rebuild required', kind: 'critical' });
      }
    }
  } catch (e) { /* unreadable treated as missing above when absent */ }

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
        // Bare resource-404 console errors duplicate broken-request entries
        // (which carry the URL needed to judge env-vs-real) — skip them to
        // keep the board signal-clean. All other console/js errors stay.
        if (issue.type === 'js-error' || (issue.type === 'console-error' &&
            !/failed to load resource|404 \(|status of 404/i.test(issue.msg || ''))) {
          fixes.push({ page: issue.page || 'unknown', fix: 'Runtime: ' + issue.msg.substring(0, 100), kind: 'runtime' });
        }
        // Interaction + load failures from the browser test (quiz flows,
        // tabs, HTTP errors): logged visibly so the board shows them and
        // MetaLearn can synthesize detectors. env-missing (sparse-checkout
        // corpus gaps) and disabled-button are noise by design — ignored.
        if (issue.type === 'quiz-flow-error' || issue.type === 'broken-tab' ||
            issue.type === 'http-error' || issue.type === 'load-error' ||
            issue.type === 'broken-request') {
          fixes.push({ page: issue.page || 'unknown', fix: 'Browser: ' + issue.type + ' — ' + (issue.msg || issue.detail || '').substring(0, 120), kind: 'runtime' });
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

    // ── Fresh practice-set button on exam hub indexes ──
    // Each exam hub gets single-click access to its model-written set via
    // mega-test.html?exam=<slug> (served instantly, no live generation).
    // Guarded: hub index only, skip when any such link exists, anchor on the
    // page's first </h1> (universal on hub indexes), skip silently otherwise.
    // Never touches existing content — one additive block.
    (function () {
      const m = /^([A-Za-z0-9][A-Za-z0-9\-]*)\/index\.html$/i.exec(page);
      if (!m) return;
      const slug = m[1].toLowerCase();
      if (!PRACTICE_EXAM_NAMES[slug] && ['rrb'].indexOf(slug) === -1) return;
      if (/mega-test\.html\?exam=/i.test(html)) return;
      const h1 = /<\/h1\s*>/i.exec(html);
      if (!h1) return;
      const btn =
        '<div class="fresh-practice" style="margin:14px 0;padding:12px 16px;border:1px solid rgba(52,211,153,.35);border-radius:12px;background:rgba(52,211,153,.06)">\n' +
        '<a class="btn" href="../mega-test.html?exam=' + slug + '" style="display:inline-block;padding:9px 20px;border-radius:100px;background:rgba(52,211,153,.15);color:#34d399;font-weight:700;text-decoration:none">⚡ Fresh Practice Set — exam-real questions</a>\n' +
        '<div style="font-size:.75em;color:#8a8a93;margin-top:6px">Single click → instant quiz. New set written weekly.</div>\n' +
        '</div>';
      const at = h1.index + h1[0].length;
      html = html.slice(0, at) + '\n' + btn + html.slice(at);
      changed = true;
      fixes.push({ page: page, fix: 'Added Fresh Practice Set button (mega-test.html?exam=' + slug + ')' });
    })();

    // ── CSP vs inline-script mismatch (dead interactivity) ──
    // A Content-Security-Policy meta WITHOUT 'unsafe-inline' in script-src
    // silently kills every inline <script> block and onclick handler, while
    // the page looks perfectly fine statically. The hub pages shipped exactly
    // this: all JS dead, every button inert. Fix: add 'unsafe-inline' to
    // script-src (matches the rest of the site, which carries no script CSP
    // at all). Only when the page actually has inline scripts/handlers.
    // NOTE: the content value itself contains single quotes, so it must be
    // captured respecting the OUTER quote character.
    const cspM = html.match(/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*content=("([^"]*)"|'([^']*)')/i);
    if (cspM) {
      const csp = cspM[2] !== undefined ? cspM[2] : cspM[3];
      const scriptSrc = (csp.match(/script-src[^;]*/i) || [''])[0];
      const hasInlineJs = /<script(?![^>]*src=)[^>]*>/i.test(html) || / onclick=/i.test(html);
      if (hasInlineJs && scriptSrc && scriptSrc.indexOf('unsafe-inline') === -1) {
        const fixed = csp.replace(/(script-src[^;]*)/i, '$1 \'unsafe-inline\'');
        html = html.split(csp).join(fixed);
        changed = true;
        fixes.push({ page: page, fix: 'CSP script-src lacked unsafe-inline while page uses inline scripts — all page JS was dead; added it' });
      }
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

// ── PLANNER: the agent thinks before acting ──
// Rotation picks agents blindly (next slice, no judgment). The planner reads
// live state — intake counts, standing-goal progress, what recent runs
// actually produced — REASONS about what matters most right now, and emits
// this run's action list. Rotation stays as the fallback when the planner
// fails, returns garbage, or the model is unreachable.
function collectRunState() {
  const st = { queue: {}, goals: {}, lastRuns: [], filesPresent: {} };
  try {
    const intact = loadJson('data/faults.json', { faults: [] });
    st.queue.openFaults = (intact.faults || []).length;
    st.queue.criticalFaults = (intact.faults || []).filter(f => f.severity === 'critical').length;
  } catch (e) { /* ignore */ }
  try {
    const figGaps = loadJson('data/figure-gaps.json', {});
    st.queue.figureGaps = figGaps.totalGaps != null ? figGaps.totalGaps : Object.keys(figGaps.bySubject || {}).length;
  } catch (e) { /* ignore */ }
  try {
    const ideasJ = loadJson('data/ideas.json', { ideas: [] });
    st.queue.pendingIdeas = (ideasJ.ideas || []).length;
  } catch (e) { /* ignore */ }
  // Standing goals — present only where checked out; ABSENT means unknown,
  // never zero (a sparse checkout without data/questions must not read as
  // "no papers" and trigger pointless work).
  const have = (p) => { try { return fs.existsSync(p); } catch (e) { return false; } };
  st.filesPresent.papers = have('data/papers.json');
  st.filesPresent.questions = have('data/questions');
  st.filesPresent.sidecar = have('data/archive-answers.json');
  st.filesPresent.syllabus = have('data/wiki-syllabus-plan.json');
  if (st.filesPresent.papers) {
    try {
      const papers = loadJson('data/papers.json', { papers: [] });
      const list = Array.isArray(papers.papers) ? papers.papers : [];
      st.goals.papers = {
        count: list.length,
        incomplete: list.filter(p => (p.questions || []).length < (p.totalQuestions || 100))
          .map(p => p.id + ' ' + (p.questions || []).length + '/' + (p.totalQuestions || 100))
      };
    } catch (e) { /* ignore */ }
  }
  if (st.filesPresent.syllabus) {
    try {
      const plan = loadJson(SYLLABUS_PLAN, { entries: [] });
      const total = (plan.entries || []).length;
      st.goals.syllabus = { done: (plan.entries || []).filter(e => e.status === 'added').length, total: total };
    } catch (e) { /* ignore */ }
  }
  if (st.filesPresent.sidecar) {
    try {
      const sc = loadJson('data/archive-answers.json', { answers: {} });
      st.goals.archiveAnswers = Object.keys(sc.answers || {}).length;
    } catch (e) { /* ignore */ }
  }
  try {
    const log = loadJson(LOG, { runs: [] });
    st.lastRuns = (log.runs || []).slice(-3).map(r => ({
      at: r.at, totalFixes: r.totalFixes,
      byAgent: (r.byAgent || []).map(b => b.agent + ':' + b.count)
    }));
  } catch (e) { /* ignore */ }
  return st;
}

async function agentPlanner(state, availableNames) {
  // availableNames: LLM agent names to choose from (rule agents always run).
  // Returns ordered names subset, or null → caller falls back to rotation.
  const sys = 'You are the planner for an autonomous site-maintenance agent. ' +
    'Think like the OWNER of the site, not a janitor: your job is to make this ' +
    'the best exam-prep site among all others — deepest correct content, zero ' +
    'broken pages, fresh material every day. Spend this run where it moves that ' +
    'mission most. ' +
    'Return STRICT JSON only: {"reasoning": "...", "actions": ["AgentName", ...]}. No markdown. ' +
    'RULES: actions must be a subset of [' + availableNames.join(', ') + '], in execution order, ' +
    '3-6 items. Prefer: unfinished standing goals (incomplete papers, syllabus gaps) over new ventures; ' +
    'agents that produced 0 for 2+ runs go LAST (they may be starved of inputs, not broken — say so in reasoning); ' +
    'a run that just completed a goal should move to the next gap. ' +
    'Reasoning: 2-3 sentences a human can audit on the improve board.';
  const user = 'STATE:\n' + JSON.stringify(state).slice(0, 2500) + '\nBudget: one run, CPU inference ~5-15 min per LLM call.';
  const r = await callLLM(sys, user, 600);
  if (!r || !r.text) return null;
  try {
    const txt = r.text.replace(/```[a-z]*|```/gi, '').trim();
    const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    if (!j || typeof j.reasoning !== 'string' || !Array.isArray(j.actions)) return null;
    const valid = j.actions.map(String).filter(n => availableNames.indexOf(n) !== -1);
    // Dedupe, cap, require at least 2.
    const seen = {};
    const ordered = valid.filter(n => { if (seen[n]) return false; seen[n] = 1; return true; }).slice(0, 6);
    if (ordered.length < 2) return null;
    console.log('agent: PLAN reasoning — ' + j.reasoning.slice(0, 300));
    console.log('agent: PLAN actions — ' + ordered.join(' → '));
    return { reasoning: j.reasoning.slice(0, 500), actions: ordered };
  } catch (e) { return null; }
}

async function main() {
  const log = loadJson(LOG, { runs: [], lastRun: null, model: null });
  const model = process.env.OLLAMA_MODEL || 'qwen3.5:9b';
  log.model = model;
  console.log('agent: using model ' + model);
  const runStart = Date.now();
  deadlineAnchor = runStart; // deadline counts from the real run start, not module load

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
  let mainPlan = null; // planner reasoning, attached to the run log entry
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
    ['Papers', agentPapers],
    ['WikiSyllabus', agentWikiSyllabus],
    ['PracticeSets', agentPracticeSets],
    ['MainsUpdates', agentMainsUpdates],
    ['BankFigures', agentBankFigures],
    ['MockPapers', agentMockPapers],
    ['ExamPatterns', agentExamPatterns],
    ['Invention', agentInvention],
    ['GraphNotes', agentGraphNotes],
    ['MetaLearn', agentMetaLearn],
    ['MainsFresh', agentMainsFresh]
  ];
  const alwaysAgents = [
    ['Workflows', agentWorkflows],
    ['SelfCheck', agentSelfCheck],
    ['SEO', agentSEO],
    ['Perf', agentPerf],
    ['A11Y', agentA11Y],
    ['Code', agentCode]
  ];
  // ── Plugins: agents the site has built for itself ────────────────────
  // Every non-dot file in scripts/agents/*.js exporting { name, run } is an
  // agent. The Architect agent writes them; they load automatically on the
  // NEXT run — the system extends its own toolbox with no core edits. A
  // broken plugin is skipped loudly and can never crash a run
  // (see scripts/lib/agent-registry.js).
  try {
    const registry = require('./lib/agent-registry').loadPlugins({
      root: path.resolve(__dirname, '..'),
      callLLM: callLLM,
      loadJson: loadJson,
      saveJson: saveJson,
      listPages: listPages
    });
    for (const p of registry) {
      if (rotateAgents.concat(alwaysAgents).some(([n]) => n === p.name)) {
        console.log('registry: plugin ' + p.name + ' shadows a built-in — skipped');
        continue;
      }
      (p.kind === 'always' ? alwaysAgents : rotateAgents).push([p.name, p.run]);
    }
  } catch (e) { console.log('registry: loader failed: ' + e.message); }
  let agents = rotateAgents.concat(alwaysAgents);
  // AGENT_ONLY=questions: dedicated question-quality workflow (questions data
  // checked out, site pages are not). Run only the agents that touch questions.
  // AGENT_ONLY=<comma list>: manual dispatch pinning (e.g. practicesets for a
  // one-off practice-set run). Empty/absent on normal runs -> full rotation.
  if (process.env.AGENT_ONLY === 'questions') {
    agents = agents.filter(([name]) => name === 'Foresight' || name === 'Questions' || name === 'Content' || name === 'Papers' || name === 'WikiSyllabus');
  } else if (process.env.AGENT_ONLY && process.env.AGENT_ONLY.trim()) {
    const want = process.env.AGENT_ONLY.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const keep = agents.filter(([name]) => want.indexOf(name.toLowerCase()) !== -1);
    if (keep.length) agents = keep;
    else console.log('agent: AGENT_ONLY=' + process.env.AGENT_ONLY + ' matched no agents in rotation');
  }

  // ── Model tier gate ──────────────────────────────────────────────────
  // The fleet default is the FAST tier (qwen3:4b — ~3GB, fully in RAM on the
  // 4 vCPU/16GB runner, and cached in the Actions model cache; see
  // .github/workflows/site-agent.yml). Heavy agents (MainsFresh) need a
  // STRONGER model, but the 17GB 27B proved un-runnable here (2026-10-18
  // post-mortem: cold load + prompt eval blew every first-byte budget, and
  // each restart re-paid the cold load). Any NON-fast tag can host them —
  // the intended mid tier is qwen3.5:9b (6.6GB, fully in RAM). They run in
  // their own dispatches (agent_only=mainsfresh, model=qwen3.5:9b) instead
  // of slowing every normal pass. AGENT_HEAVY overrides the heavy list;
  // AGENT_FAST_TAGS overrides the fast tag list — no code change needed.
  const heavyNames = (process.env.AGENT_HEAVY || 'mainsfresh').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  const modelTag = process.env.OLLAMA_MODEL || 'qwen3.5:9b';
  const fastTags = (process.env.AGENT_FAST_TAGS || 'qwen3:4b,qwen3.5:4b,qwen3.5:2b,qwen3.5:0.8b,qwen3:1.7b,qwen3:0.6b,lfm2.5:1.2b').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  const heavyTier = fastTags.indexOf(modelTag.toLowerCase()) === -1;
  const pinned = !!(process.env.AGENT_ONLY && process.env.AGENT_ONLY.trim());
  if (!heavyTier) {
    const skippedHeavy = agents.filter(([name]) => heavyNames.indexOf(name.toLowerCase()) !== -1);
    if (skippedHeavy.length) {
      agents = agents.filter(([name]) => heavyNames.indexOf(name.toLowerCase()) === -1);
      console.log('agent: tier fast (' + modelTag + ') — skipped heavy agent(s): ' + skippedHeavy.map(([n]) => n).join(', ') + '; dispatch with a mid/heavy model (e.g. qwen3.5:9b) to run them');
    }
  } else if (!pinned) {
    const heavyOnly = agents.filter(([name]) => heavyNames.indexOf(name.toLowerCase()) !== -1);
    if (heavyOnly.length) { agents = heavyOnly; console.log('agent: tier heavy (' + modelTag + ') — heavy agents only: ' + heavyOnly.map(([n]) => n).join(', ')); }
    else console.log('agent: tier heavy but no heavy agent registered — keeping the normal rotation');
  }
  if (!agents.length) console.log('agent: WARNING — no agents selected after tier/AGENT_ONLY filtering; nothing will run this pass');

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
  // No rotation for dedicated workflows (AGENT_ONLY): their filtered scope IS
  // the job — slicing it would randomly drop capabilities run to run.
  // Planner first (site-agent full runs with a live model only): reason over
  // state and emit this run's actions. Rotation is the fallback.
  let planned = null;
  if (!process.env.AGENT_ONLY && ping) {
    try {
      const state = collectRunState();
      planned = await agentPlanner(state, llmAgents.map(([n]) => n));
    } catch (e) { console.log('agent: planner failed, falling back to rotation'); planned = null; }
  }
  if (planned && planned.actions && planned.actions.length) {
    const byName = {};
    llmAgents.forEach(([n, f]) => { byName[n] = f; });
    agents = planned.actions.map(n => [n, byName[n]]).filter(([, f]) => typeof f === 'function').concat(ruleAgents);
    // Record the reasoning on the run entry so the improve board shows WHY.
    mainPlan = { reasoning: planned.reasoning, actions: planned.actions.slice() };
  } else {
    const sliceSize = process.env.AGENT_ONLY
      ? llmAgents.length
      : Math.max(1, parseInt(process.env.AGENT_ROTATE || '4', 10));
  if (sliceSize < llmAgents.length) {
    const runNo = parseInt(process.env.GITHUB_RUN_NUMBER || '0', 10) || (Math.floor(Date.now() / 3600000) % 997);
    const offset = (runNo * sliceSize) % llmAgents.length;
    const rotated = [];
    for (let i = 0; i < sliceSize; i++) rotated.push(llmAgents[(offset + i) % llmAgents.length]);
    console.log('agent: rotation ' + sliceSize + '/' + llmAgents.length + ' LLM agents (offset ' + offset + ', run #' + runNo + ') — ' + rotated.map(([n]) => n).join(', '));
    agents = rotated.concat(ruleAgents);
  }
  } // end else (rotation fallback)
  console.log('agent: will run ' + agents.length + ' agent(s): ' + agents.map(([n]) => n).join(', '));
  if (DEADLINE_MIN > 0) console.log('agent: deadline ' + DEADLINE_MIN + 'min from run start — LLM agents skipped past it, rule agents still run');

  for (const [name, fn] of agents) {
    if (pastDeadline() && !ruleAgents.some(([n]) => n === name)) {
      console.log('agent: SKIP ' + name + ' — ' + DEADLINE_MIN + 'min deadline reached; publishing what is done (rotates next run)');
      results.push({ agent: name.toLowerCase(), fixes: [], skipped: 'deadline' });
      continue;
    }
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
    plan: mainPlan || undefined,
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

if (require.main === module) {
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
}
// Shared LLM transport (proven: curl, IPv4, 30-min ceiling, thinking-model
// aware). Required by writer scripts (archive answers, …) so transport fixes
// propagate instead of being duplicated per script.
module.exports = { callLLM: callLLM, loadJson: loadJson, saveJson: saveJson, OLLAMA_URL: OLLAMA_URL, EXAMINER_STYLE: EXAMINER_STYLE };
