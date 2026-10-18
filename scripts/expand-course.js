#!/usr/bin/env node
// Course Content Expander -- the agent that fills the exam courses' gaps.
//
// Every exam in scripts/exam-configs.json declares modules and lessons; a
// lesson's body and practice MCQs come from scripts/course-data.json and
// scripts/course-practice.json, keyed "<module>/<slug>". Slots without a key
// render the generator's bare auto filler ("This lesson covers ...").
//
// This agent finds those slots, has qwen3.8:27b (Ollama, on the CI runner)
// write each one in the exact HTML dialect the course pages render, validates
// it hard, stores it, and records exactly which pages the workflow should
// regenerate. Rules that keep it safe:
//
//   - Fills never overwrite a key. A separate enrich role replaces only
//     lessons under a small size threshold (brief stubs), and the workflow's
//     diff guard restores any page whose regeneration would drop more than
//     200 lines, so hand-built page content can never be lost.
//   - A slot is only filled when EVERY exam using it currently renders the
//     generator's auto filler. A page carrying one-off enrichment (the NEET
//     biology blocks, UPSC's topic layers) is left alone, so the filtered
//     regeneration that follows can never clobber hand-built content.
//   - Incremental saves: a run that times out keeps everything written so far.
//   - Hard validation: tag/class whitelist, structure minimums, MCQ shape, and
//     the site-wide 70% word-overlap dedupe against the subject's bank.
//
// Run:  OLLAMA_HOST=http://127.0.0.1:11434 OLLAMA_MODEL=qwen3.8:27b node scripts/expand-course.js
// Dry:  EXPAND_DRY=1 node scripts/expand-course.js            (list gaps, no model)
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var CONFIGS_FILE = path.join(__dirname, 'exam-configs.json');
var DATA_FILE = path.join(__dirname, 'course-data.json');
var PRACTICE_FILE = path.join(__dirname, 'course-practice.json');
var TOUCHED_FILE = path.join(__dirname, '.course-touched.json');

var HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
var MODEL = process.env.OLLAMA_MODEL || 'qwen3.8:27b';
var PER_RUN = parseInt(process.env.EXPAND_PER_RUN || '5', 10);
var DEADLINE_MIN = parseInt(process.env.EXPAND_DEADLINE_MIN || '70', 10);
var DRY = !!process.env.EXPAND_DRY;
var SKIP_EXAMS = (process.env.EXPAND_SKIP_EXAMS || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
// Lessons shorter than this (characters of HTML) are treated as brief stubs
// and rewritten by the enrich role. 0 disables enrichment entirely.
var THIN = parseInt(process.env.EXPAND_THIN_THRESHOLD || '2500', 10);

// Transport watchdogs (see curlChat): silence before the first streamed byte
// is normal on CPU (cold load + prompt eval), mid-stream silence is wedged,
// and CALL_CAP_MIN is nobody-legitimate-needs-more. runDeadlineAt lets a
// mid-call generation stop at the run deadline instead of overshooting it.
var FIRST_BYTE_MIN = parseFloat(process.env.EXPAND_FIRST_BYTE_MIN || '25') || 25;
var STALL_MIN = parseFloat(process.env.EXPAND_STALL_MIN || '12') || 12;
var CALL_CAP_MIN = parseFloat(process.env.EXPAND_CALL_CAP_MIN || '95') || 95;
var runDeadlineAt = 0;

// The same cross-exam aliasing gen-course.js applies when it looks content up.
var ALT = { reasoning: 'reasoning', quant: 'quant', english: 'english', ga: 'ga', gk: 'ga', maths: 'quant', aptitude: 'reasoning', gs: 'ga', csat: 'quant', evs: 'ga', language: 'english', science: 'ga', cdp: 'ga' };

var configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, 'utf8'));
var courseData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
var coursePractice = JSON.parse(fs.readFileSync(PRACTICE_FILE, 'utf8'));

function hasContent(mk, slug) {
  if (courseData[mk + '/' + slug]) return true;
  return !!(ALT[mk] && courseData[ALT[mk] + '/' + slug]);
}

// A page is "filler" when it carries the auto-generated lesson body. Both
// strings come from generateAutoContent() in gen-course.js and appear in no
// other content, so their co-presence is a reliable test.
function isFillerPage(fp) {
  if (!fs.existsSync(fp)) return true;
  var html = fs.readFileSync(fp, 'utf8');
  return html.indexOf('This lesson covers <strong>') !== -1 &&
    html.indexOf('<h3>Common Question Types</h3>') !== -1;
}

function pagePath(dir, mk, slug) {
  return path.join(ROOT, dir, 'course', mk, 'lesson-' + slug + '.html');
}

// Every exam whose configs use this module+slug (shared keys are one lesson
// serving several exams -- one generation fills all of them).
function examsUsing(mk, slug) {
  var out = [];
  Object.keys(configs).forEach(function (ek) {
    if (SKIP_EXAMS.indexOf(ek) !== -1) return;
    var cfg = configs[ek];
    var mod = cfg.modules && cfg.modules[mk];
    if (!mod) return;
    var lesson = null;
    (mod.lessons || []).forEach(function (l) { if (l.slug === slug) lesson = l; });
    if (lesson) out.push({ examKey: ek, dir: cfg.dir, examName: cfg.examName, lesson: lesson, modName: mod.name });
  });
  return out;
}

// Gap collection. A key qualifies only when it has no content anywhere AND
// every using exam's page is still the auto filler.
function collectGaps() {
  var seen = {};
  var gaps = [];
  Object.keys(configs).forEach(function (ek) {
    if (SKIP_EXAMS.indexOf(ek) !== -1) return;
    var cfg = configs[ek];
    (cfg.moduleOrder || []).forEach(function (mk) {
      var mod = cfg.modules[mk];
      if (!mod) return;
      (mod.lessons || []).forEach(function (lesson) {
        var key = mk + '/' + lesson.slug;
        if (seen[key]) return;
        seen[key] = 1;
        if (hasContent(mk, lesson.slug)) return;
        var users = examsUsing(mk, lesson.slug);
        if (!users.length) return;
        var allFiller = users.every(function (u) {
          return isFillerPage(pagePath(u.dir, mk, lesson.slug));
        });
        if (!allFiller) return;
        gaps.push({
          key: key,
          mk: mk,
          slug: lesson.slug,
          role: 'fill',
          lesson: lesson,
          modName: mod.name,
          examName: users[0].examName,
          users: users,
          examCount: users.length,
          files: users.map(function (u) { return u.dir + '/course/' + mk + '/lesson-' + lesson.slug + '.html'; })
        });
      });
    });
  });
  // Widest coverage first: a key shared by five exams is five pages for one
  // generation. Ties break alphabetically for deterministic runs.
  gaps.sort(function (a, b) {
    if (b.examCount !== a.examCount) return b.examCount - a.examCount;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
  return gaps;
}

// Thin lessons: content exists but is a brief stub. The enrich role rewrites
// these as full lessons. Ordering is shortest-first so the most visible stubs
// get served first.
function collectThins() {
  var out = [];
  Object.keys(courseData).forEach(function (key) {
    var len = String(courseData[key] || '').length;
    if (len >= THIN) return;
    var parts = key.split('/');
    var mk = parts[0];
    var slug = parts.slice(1).join('/');
    var users = examsUsing(mk, slug);
    if (!users.length) return;
    out.push({
      key: key,
      mk: mk,
      slug: slug,
      role: 'enrich',
      oldLen: len,
      lesson: users[0].lesson,
      modName: users[0].modName,
      examName: users[0].examName,
      users: users,
      examCount: users.length,
      files: users.map(function (u) { return u.dir + '/course/' + mk + '/lesson-' + slug + '.html'; })
    });
  });
  out.sort(function (a, b) { return a.oldLen - b.oldLen; });
  return out;
}

// ---- generation ------------------------------------------------------------

function theoryPrompt(gap) {
  var lines = [
    'You are a senior ' + gap.examName + ' ' + gap.modName + ' teacher writing one lesson for a free study site.',
    'Lesson: "' + gap.lesson.title + '" (' + gap.mk + ' module).',
    'What it covers: ' + gap.lesson.desc,
    'Key topics: ' + gap.lesson.topics + '.',
    '',
    'Write the lesson as an HTML fragment (no <html>/<head>), using ONLY these tags:',
    '<h3> <h4> <p> <ul> <ol> <li> <strong> <em> <br> <div> <span>.',
    '<div> elements may only carry these classes: example-box (with children',
    'div.ex-title, div.ex-text, div.ex-soln) and tip-box (with children',
    'div.tip-title, div.tip-text). No attributes on any other tag.',
    '',
    'Structure (a full lesson, 900-1400 words of visible text):',
    '- open with a 3-4 sentence overview <p>',
    '- one <h3> section per key topic above: definitions, the exact formulas /',
    '  rules / patterns in text, and what the examiner typically asks',
    '- two solved examples, each a <div class="example-box"> with the question',
    '  in div.ex-text, the full worked solution in div.ex-soln, and the',
    '  technique to reuse in div.ex-title',
    '- a "Common Traps" <h3> with a <ul> of mistakes students make',
    '- a "Memory Tricks" <h3> with shortcuts, mnemonics or comparisons in <ul>',
    '- close with a tip-box carrying exam-day strategy for this lesson',
    '',
    'Rules:',
    '- Be specific and correct. This must survive an examiner reading it.',
    '- Plain text inside tags; no markdown, no images, no links, no scripts.',
    '- Do not invent statistics; classic textbook facts are welcome.',
    '- Clarity first: this student has no mentor. Define every term the first',
    '  time it appears in one plain sentence; build each rule from first',
    '  principles (say WHY it works); short sentences, one idea each; open each',
    '  section by connecting it to the previous one.',
    '',
    'After the HTML output exactly this line:',
    '===QUESTIONS===',
    'Then a JSON array of exactly 5 exam-style MCQs on this lesson shaped like:',
    '[{"text":"question","options":["A","B","C","D"],"correct":0,"sol":"worked solution"}]',
    'Rules: 4 plausible options, exactly one correct (0-3 index), solutions',
    'that explain the reasoning, never "all of the above", each question tests',
    'a DIFFERENT aspect of the lesson.'
  ];
  if (gap.role === 'enrich') {
    lines.push('');
    lines.push('The lesson currently on the site is only ' + gap.oldLen + ' characters -- far too brief.');
    lines.push('Here it is for continuity; rewrite it as the complete lesson described above:');
    lines.push(String(courseData[gap.key] || '').slice(0, 2000));
  }
  return lines.join('\n');
}

// ---- transport -------------------------------------------------------------
// One HTTP attempt at the chat endpoint, STREAMING via spawn + watchdogs.
// The old fetch transport carried undici's hidden ~5-min headers timeout: a
// 3400-token lesson needs 15-40+ min on the 4 vCPU runner, so every call
// died "fetch failed" before it could finish — the same wall that burned
// invent run #5 in a restart loop. curl via spawn has no hidden wall; the
// watchdogs are the only time policy. Killing curl does NOT stop the
// server-side generation (it keeps holding the model lock), so a wedge-kill
// restarts serve via restartServe() before the next gap is attempted.
function curlChat(payload) {
  return new Promise(function (resolve, reject) {
    var args = [
      '-sS', '--max-time', '5400', '-w', '\\n%{http_code}',
      HOST + '/api/chat',
      '-H', 'Content-Type: application/json',
      '-d', '@-'
    ];
    var child = cp.spawn('curl', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    var out = '';
    var stderr = '';
    var settled = false;
    var startedAt = Date.now();
    var firstByteAt = 0;
    var lastByteAt = Date.now();

    function fail(why, status) {
      if (settled) return;
      settled = true;
      clearInterval(mon);
      try { child.kill('SIGKILL'); } catch (e) { /* ignore */ }
      var err = new Error('stream monitor: ' + why);
      err.status = status === undefined ? 28 : status;
      if (err.status !== 'DEADLINE') { err.restart = true; err.transport = true; }
      err.stdout = out.slice(0, 2000);
      err.stderr = stderr.slice(0, 400);
      reject(err);
    }

    var mon = setInterval(function () {
      var now = Date.now();
      if (runDeadlineAt && now > runDeadlineAt) return fail('run deadline reached mid-call', 'DEADLINE');
      if (now - startedAt > CALL_CAP_MIN * 60000) return fail('hard cap ' + CALL_CAP_MIN + 'min');
      if (!firstByteAt) {
        if (now - startedAt > FIRST_BYTE_MIN * 60000) return fail('no first byte in ' + FIRST_BYTE_MIN + 'min (cold load/prompt eval over budget)');
      } else if (now - lastByteAt > STALL_MIN * 60000) {
        return fail('no byte for ' + STALL_MIN + 'min mid-stream (wedged)');
      }
    }, 5000);

    child.stdout.on('data', function (d) {
      if (!firstByteAt) {
        firstByteAt = Date.now();
        console.log('expand: LLM first byte at ' + Math.round((firstByteAt - startedAt) / 1000) + 's');
      }
      lastByteAt = Date.now();
      out += d.toString('utf8');
      if (out.length > 32 * 1024 * 1024) fail('buffer cap 32MB');
    });
    child.stderr.on('data', function (d) { stderr += d.toString('utf8'); });
    child.on('error', function (e) { if (!settled) { settled = true; clearInterval(mon); reject(e); } });
    child.on('close', function (code) {
      if (settled) return;
      settled = true;
      clearInterval(mon);
      if (code === 0) resolve(out);
      else {
        var err = new Error('curl exit ' + code);
        err.status = code;
        if (code === 28) { err.restart = true; err.transport = true; }
        else if (code === 7 || code === 52 || code === 56) err.transport = true;
        err.stdout = out.slice(0, 2000);
        err.stderr = stderr.slice(0, 400);
        reject(err);
      }
    });
    child.stdin.on('error', function () { /* curl died before reading stdin */ });
    child.stdin.write(payload);
    child.stdin.end();
  });
}

// Parse an NDJSON chat stream: accumulate message.content deltas (thinking
// may arrive per-chunk or at the end), plus the legacy response field; curl
// appends the HTTP code as a final line via -w.
function parseChatStream(out) {
  var lines = String(out || '').split('\n');
  var httpCode = '';
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  if (lines.length && /^\d{3}$/.test(lines[lines.length - 1].trim())) httpCode = lines.pop().trim();
  var content = '', thinking = '';
  lines.forEach(function (line) {
    var t = line.trim();
    if (!t || t.charAt(0) !== '{') return;
    try {
      var j = JSON.parse(t);
      if (j.message) {
        if (typeof j.message.content === 'string') content += j.message.content;
        if (typeof j.message.thinking === 'string') thinking += j.message.thinking;
      }
      if (typeof j.response === 'string') content += j.response;
    } catch (e) { /* partial line; ignore */ }
  });
  return { text: content.trim() || thinking.trim(), httpCode: httpCode };
}

function restartServe() {
  console.log('expand: restarting ollama serve to clear wedged work');
  try {
    cp.execSync('pkill -f "ollama serve"; sleep 2; OLLAMA_KEEP_ALIVE=60m nohup ollama serve >> /tmp/ollama.log 2>&1 &', { stdio: 'ignore', timeout: 20000 });
  } catch (e) { /* the probe below decides */ }
  return new Promise(function (resolve) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var up = false;
      try { cp.execSync('curl -sf --max-time 5 ' + HOST + '/api/tags', { stdio: 'pipe', timeout: 10000 }); up = true; } catch (e) { up = false; }
      if (up || tries >= 45) {
        clearInterval(iv);
        console.log('expand: serve ' + (up ? 'back up — next call cold-loads' : 'STILL DOWN after restart') + ' (' + tries + ' probes)');
        resolve(up);
      }
    }, 2000);
  });
}

function callModel(prompt, numPredict, timeoutMs) { // timeoutMs kept for callers; the watchdogs own the time policy
  var payload = JSON.stringify({
    model: MODEL,
    stream: true,
    think: false,
    options: { temperature: 0.4, top_p: 0.9, num_predict: numPredict || 3400 },
    messages: [{ role: 'user', content: prompt }]
  });
  function one(p) {
    return curlChat(p).then(function (out) {
      var parsed = parseChatStream(out);
      if (!parsed.text && parsed.httpCode === '400') {
        console.log('expand: Ollama rejected think:false (HTTP 400) — retrying without the parameter');
        return one(JSON.stringify(Object.assign(JSON.parse(p), { think: undefined })));
      }
      if (parsed.httpCode && parsed.httpCode !== '200') throw new Error('ollama HTTP ' + parsed.httpCode);
      if (!parsed.text) throw new Error('empty model reply');
      return parsed.text;
    });
  }
  return one(payload).catch(function (e) {
    if (e && e.restart) return restartServe().then(function () { throw e; });
    throw e;
  });
}

// ---- validation ------------------------------------------------------------

var ALLOWED_TAGS = { h3: 1, h4: 1, p: 1, ul: 1, ol: 1, li: 1, strong: 1, em: 1, br: 1, div: 1, span: 1 };
var ALLOWED_CLASSES = { 'example-box': 1, 'ex-title': 1, 'ex-text': 1, 'ex-soln': 1, 'tip-box': 1, 'tip-title': 1, 'tip-text': 1 };

function validateHtml(html) {
  if (!html || html.length < 2500) return 'too short (' + (html ? html.length : 0) + ' chars)';
  if (html.length > 40000) return 'too long (' + html.length + ' chars)';
  if (/<script|<style|<iframe|<img|<a\b|on\w+\s*=|javascript:|url\(/i.test(html)) return 'disallowed markup';

  var tagRe = /<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*)?)>/g;
  var m;
  while ((m = tagRe.exec(html)) !== null) {
    var tag = m[1].toLowerCase();
    var attrs = (m[2] || '').trim();
    if (!ALLOWED_TAGS[tag]) return 'tag <' + tag + '> not allowed';
    if (!attrs) continue;
    var cm = /^class="([a-z0-9\s-]+)"$/.exec(attrs);
    if (!cm || (tag !== 'div' && tag !== 'span')) return 'attributes not allowed on <' + tag + '>';
    var cls = cm[1].split(/\s+/);
    for (var ci = 0; ci < cls.length; ci++) {
      if (!ALLOWED_CLASSES[cls[ci]]) return 'class "' + cls[ci] + '" not allowed';
    }
  }

  var pairs = [['p', '<p\\b', '</p>'], ['div', '<div\\b', '</div>'], ['ul', '<ul\\b', '</ul>'],
    ['ol', '<ol\\b', '</ol>'], ['li', '<li\\b', '</li>'], ['h3', '<h3\\b', '</h3>']];
  for (var i = 0; i < pairs.length; i++) {
    var opens = (html.match(new RegExp(pairs[i][1], 'g')) || []).length;
    var closes = (html.match(new RegExp(pairs[i][2], 'g')) || []).length;
    if (opens !== closes) return 'unbalanced <' + pairs[i][0] + '> (' + opens + '/' + closes + ')';
  }

  var h3s = (html.match(/<h3\b/g) || []).length;
  if (h3s < 3) return 'needs at least 3 <h3> sections (found ' + h3s + ')';
  if ((html.match(/<p\b/g) || []).length < 5) return 'needs at least 5 <p> paragraphs';
  if (html.indexOf('class="example-box"') === -1) return 'needs an example-box';
  if (html.indexOf('class="tip-box"') === -1) return 'needs a tip-box';
  return null;
}

function normalizeQuestions(arr) {
  if (!Array.isArray(arr)) return [];
  var keep = [];
  arr.forEach(function (q) {
    if (!q || typeof q.text !== 'string') return;
    var text = q.text.trim();
    if (text.length < 15 || text.length > 400) return;
    if (!Array.isArray(q.options) || q.options.length !== 4) return;
    var opts = q.options.map(function (o) { return String(o == null ? '' : o).trim(); });
    for (var i = 0; i < 4; i++) if (!opts[i] || opts[i].length > 160) return;
    var correct = parseInt(q.correct, 10);
    if (!(correct >= 0 && correct <= 3)) return;
    var sol = String(q.sol || '').trim();
    if (sol.length < 30 || sol.length > 600) return;
    if (/all of the above/i.test(text + ' ' + opts.join(' '))) return;
    keep.push({ text: text, options: opts, correct: correct, sol: sol });
  });
  return keep;
}

function parseQuestions(raw) {
  var s = String(raw || '');
  var i = s.indexOf('[');
  var j = s.lastIndexOf(']');
  if (i === -1 || j <= i) return [];
  var arr;
  try { arr = JSON.parse(s.slice(i, j + 1)); } catch (e) { return []; }
  return normalizeQuestions(arr);
}

// ---- novelty (the site-wide 70% word-overlap rule) -------------------------

function wordSet(s) {
  var out = {};
  String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).forEach(function (w) {
    if (w.length > 2) out[w] = 1;
  });
  return out;
}

function overlap(a, b) {
  var A = wordSet(a), B = wordSet(b);
  var ka = Object.keys(A), kb = Object.keys(B);
  if (!ka.length || !kb.length) return 0;
  var inter = 0;
  ka.forEach(function (w) { if (B[w]) inter++; });
  return inter / Math.min(ka.length, kb.length);
}

var subjectTextCache = {};
function subjectTexts(mk) {
  if (subjectTextCache[mk]) return subjectTextCache[mk];
  var out = [];
  Object.keys(coursePractice).forEach(function (k) {
    if (k.indexOf(mk + '/') !== 0 && (!ALT[mk] || k.indexOf(ALT[mk] + '/') !== 0)) return;
    (coursePractice[k] || []).forEach(function (q) { if (q && q.text) out.push(q.text); });
  });
  subjectTextCache[mk] = out;
  return out;
}

function filterFresh(qs, mk) {
  var existing = subjectTexts(mk);
  var kept = [];
  qs.forEach(function (q) {
    for (var i = 0; i < existing.length; i++) if (overlap(q.text, existing[i]) >= 0.7) return;
    for (var j = 0; j < kept.length; j++) if (overlap(q.text, kept[j].text) >= 0.7) return;
    kept.push(q);
  });
  return kept;
}

function toPractice(qs) {
  var letters = ['a', 'b', 'c', 'd'];
  return qs.map(function (q, i) {
    return {
      id: 101 + i,
      text: q.text,
      options: q.options.map(function (o, j) { return { l: letters[j], t: o, c: j === q.correct }; }),
      sol: q.sol
    };
  });
}

// ---- generation per gap ----------------------------------------------------

function generateOne(gap, timeoutMs) {
  return callModel(theoryPrompt(gap), 3400, timeoutMs).then(function (raw) {
    var html = raw;
    var rest = '';
    var qi = raw.indexOf('===QUESTIONS===');
    if (qi !== -1) {
      html = raw.slice(0, qi);
      rest = raw.slice(qi + 15);
    }
    html = html.replace(/^\s*```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
    var err = validateHtml(html);
    if (err) throw new Error('html rejected: ' + err);
    if (gap.role === 'enrich' && html.length < gap.oldLen + 1500) {
      throw new Error('not a real expansion (' + html.length + ' vs ' + gap.oldLen + ' chars)');
    }
    var qs = filterFresh(parseQuestions(rest), gap.mk);
    return { html: html, questions: qs };
  });
}

function saveJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function writeTouched(keys, files, exams) {
  fs.writeFileSync(TOUCHED_FILE, JSON.stringify({ keys: keys, files: files, exams: exams }), 'utf8');
}

// ---- main ------------------------------------------------------------------

async function main() {
  var fills = collectGaps();
  var thins = THIN > 0 ? collectThins() : [];
  console.log('Course worklist: ' + fills.length + ' empty slot(s), ' + thins.length + ' thin lesson(s) (<' + THIN + ' chars)');
  fills.slice(0, 10).forEach(function (g) {
    console.log('  [fill]   ' + g.key + '  (' + g.examCount + ' exam' + (g.examCount > 1 ? 's' : '') + ')');
  });
  if (fills.length > 10) console.log('  ... and ' + (fills.length - 10) + ' more empty slot(s)');
  thins.slice(0, 10).forEach(function (g) {
    console.log('  [enrich] ' + g.key + '  (' + g.oldLen + ' chars, ' + g.examCount + ' exam' + (g.examCount > 1 ? 's' : '') + ')');
  });
  if (thins.length > 10) console.log('  ... and ' + (thins.length - 10) + ' more thin lesson(s)');

  if (DRY || (!fills.length && !thins.length)) {
    writeTouched([], [], []);
    console.log(DRY ? 'EXPAND_DRY: listing only, nothing generated or written.' : 'Nothing to fill.');
    return;
  }

  // Empty slots first (a lesson that says nothing at all), then the
  // shortest thin lessons (the most visible gain per generation).
  var queue = fills.concat(thins);

  var deadline = Date.now() + DEADLINE_MIN * 60000;
  runDeadlineAt = deadline;
  var added = 0;
  var addedKeys = [];
  var addedFiles = [];
  var touchedExams = {};

  for (var gi = 0; gi < queue.length && added < PER_RUN; gi++) {
    if (Date.now() > deadline) {
      console.log('Deadline reached; stopping with ' + added + ' lesson(s) written this run.');
      break;
    }
    var gap = queue[gi];
    var remaining = deadline - Date.now();
    try {
      var res = await generateOne(gap, Math.min(remaining, 900000));
      courseData[gap.key] = res.html;
      if (res.questions.length >= 3) coursePractice[gap.key] = toPractice(res.questions);
      saveJson(DATA_FILE, courseData);
      saveJson(PRACTICE_FILE, coursePractice);
      gap.users.forEach(function (u) { touchedExams[u.examKey] = 1; });
      addedKeys.push(gap.key);
      addedFiles = addedFiles.concat(gap.files);
      added++;
      console.log('[' + gap.examName + '] ' + gap.key + (gap.role === 'enrich' ? ' expanded ' : ' written ') +
        '(' + res.html.length + ' chars, ' + res.questions.length + ' validated MCQs)');
    } catch (e) {
      console.log('[' + gap.examName + '] ' + gap.key + ' skipped: ' + e.message);
    }
  }

  writeTouched(addedKeys, addedFiles, Object.keys(touchedExams));
  console.log('EXPAND-RESULT {"added":' + added + ',"keys":' + JSON.stringify(addedKeys) + '}');
}

main().catch(function (e) {
  console.error('expand-course failed: ' + (e && e.stack || e));
  // A failed run must not leave a touched-file a workflow would act on.
  try { writeTouched([], [], []); } catch (e2) { /* nothing */ }
  process.exit(1);
});
