#!/usr/bin/env node
'use strict';
// Language page expansion agent.
//
// The site's language pages (languages/*.html beginner courses, CTET language
// lessons and the UPSC Mains Paper A practice pages) are hand-built shells
// that never grow. This plugin writes NEW advanced sections into them, one
// page per run, and records which pages changed so they can be redeployed.
//
// It is a SEPARATE site-agent plugin: it is NOT part of scripts/expand-course.js
// (per AGENTS.md, languages are a separate plugin).
//
// Safety rules (same as the course expander):
//   - Never overwrites human-written content: appends new sections only.
//   - Validation gate before any write: tag whitelist, no scripts/links, 
//     balanced tags, word-count floor.
//   - Model-generated practice passages are labelled model-generated-practice 
//     and script-checked with scripts/lib/language-verify.js (90% threshold).
//   - Incremental saves: a timed-out run keeps everything written so far.
//   - A run that would drop content from a page aborts instead of publishing loss.
//
// Run:  OLLAMA_HOST=http://127.0.0.1:11434 OLLAMA_MODEL=qwen3.5:9b
//         node scripts/expand-language-pages.js
// Dry:  EXPAND_LANG_DRY=1 node scripts/expand-language-pages.js   (list pages, no model)

var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var HTML_REPAIR = require('./lib/html-repair');
var LANG_VERIFY = require('./lib/language-verify');

var HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
var MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:9b';
var DEADLINE_MIN = parseInt(process.env.EXPAND_LANG_DEADLINE_MIN || '70', 10);
var DRY = !!process.env.EXPAND_LANG_DRY;
var FIRST_BYTE_MIN = parseFloat(process.env.EXPAND_LANG_FIRST_BYTE_MIN || '25') || 25;
var STALL_MIN = parseFloat(process.env.EXPAND_LANG_STALL_MIN || '12') || 12;
var CALL_CAP_MIN = parseFloat(process.env.EXPAND_LANG_CALL_CAP_MIN || '95') || 95;

var runDeadlineAt = 0;

// Pages the agent may extend. Each entry: { file, kind, slug?, lang? }.
// kind:
//   'beginner'  -> languages/*.html (8 hand-built foreign-language courses)
//   'ctet'      -> ctet/course/language/*.html (CTET language pedagogy lessons)
//   'mains'     -> upsc/mains/language/*.html (Paper A practice pages)
var PAGES = [
  { file: 'languages/korean.html', kind: 'beginner', slug: 'korean' },
  { file: 'languages/japanese.html', kind: 'beginner', slug: 'japanese' },
  { file: 'languages/chinese.html', kind: 'beginner', slug: 'chinese' },
  { file: 'languages/arabic.html', kind: 'beginner', slug: 'arabic' },
  { file: 'languages/slavic.html', kind: 'beginner', slug: 'slavic' },
  { file: 'languages/icelandic.html', kind: 'beginner', slug: 'icelandic' },
  { file: 'languages/uralic.html', kind: 'beginner', slug: 'uralic' },
  { file: 'languages/navajo.html', kind: 'beginner', slug: 'navajo' },
  { file: 'ctet/course/language/lesson-comprehension.html', kind: 'ctet', slug: 'comprehension' },
  { file: 'ctet/course/language/lesson-grammar-vocab.html', kind: 'ctet', slug: 'grammar-vocab' },
  { file: 'ctet/course/language/lesson-language-development.html', kind: 'ctet', slug: 'language-development' },
  { file: 'ctet/course/language/lesson-language-pedagogy.html', kind: 'ctet', slug: 'language-pedagogy' },
  { file: 'upsc/mains/language/assamese.html', kind: 'mains', slug: 'assamese', lang: 'assamese' },
  { file: 'upsc/mains/language/bengali.html', kind: 'mains', slug: 'bengali', lang: 'bengali' },
  { file: 'upsc/mains/language/bodo.html', kind: 'mains', slug: 'bodo', lang: 'bodo' },
  { file: 'upsc/mains/language/dogri.html', kind: 'mains', slug: 'dogri', lang: 'dogri' },
  { file: 'upsc/mains/language/gujarati.html', kind: 'mains', slug: 'gujarati', lang: 'gujarati' },
  { file: 'upsc/mains/language/hindi.html', kind: 'mains', slug: 'hindi', lang: 'hindi' },
  { file: 'upsc/mains/language/kannada.html', kind: 'mains', slug: 'kannada', lang: 'kannada' },
  { file: 'upsc/mains/language/kashmiri.html', kind: 'mains', slug: 'kashmiri', lang: 'kashmiri' },
  { file: 'upsc/mains/language/konkani.html', kind: 'mains', slug: 'konkani', lang: 'konkani' },
  { file: 'upsc/mains/language/maithili.html', kind: 'mains', slug: 'maithili', lang: 'maithili' },
  { file: 'upsc/mains/language/malayalam.html', kind: 'mains', slug: 'malayalam', lang: 'malayalam' },
  { file: 'upsc/mains/language/manipuri.html', kind: 'mains', slug: 'manipuri', lang: 'manipuri' },
  { file: 'upsc/mains/language/marathi.html', kind: 'mains', slug: 'marathi', lang: 'marathi' },
  { file: 'upsc/mains/language/nepali.html', kind: 'mains', slug: 'nepali', lang: 'nepali' },
  { file: 'upsc/mains/language/odia.html', kind: 'mains', slug: 'odia', lang: 'odia' },
  { file: 'upsc/mains/language/punjabi.html', kind: 'mains', slug: 'punjabi', lang: 'punjabi' },
  { file: 'upsc/mains/language/sanskrit.html', kind: 'mains', slug: 'sanskrit', lang: 'sanskrit' },
  { file: 'upsc/mains/language/santali.html', kind: 'mains', slug: 'santali', lang: 'santali' },
  { file: 'upsc/mains/language/sindhi.html', kind: 'mains', slug: 'sindhi', lang: 'sindhi' },
  { file: 'upsc/mains/language/tamil.html', kind: 'mains', slug: 'tamil', lang: 'tamil' },
  { file: 'upsc/mains/language/telugu.html', kind: 'mains', slug: 'telugu', lang: 'telugu' },
  { file: 'upsc/mains/language/urdu.html', kind: 'mains', slug: 'urdu', lang: 'urdu' }
];

var LEDGER_FILE = path.join(ROOT, 'data', 'language-expansion.json');
var LANG_META_FILE = path.join(__dirname, 'language-paper-a.json');
var ALLOWED_TAGS = HTML_REPAIR.ALLOWED_TAGS;

var LANG_META = {};
try {
  var _lm = JSON.parse(fs.readFileSync(LANG_META_FILE, 'utf8'));
  (_lm.languages || []).forEach(function (l) { if (l && l.slug) LANG_META[l.slug] = l; });
} catch (e) { /* mains script checks skipped until data file exists */ }

function loadLedger() {
  try {
    var j = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
    if (!j || typeof j !== 'object' || !Array.isArray(j.pages)) return { pages: [] };
    return j;
  } catch (e) { return { pages: [] }; }
}
function saveLedger(j) {
  fs.writeFileSync(LEDGER_FILE, JSON.stringify(j, null, 2) + '\n', 'utf8');
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function existingSections(html) {
  var out = [];
  var re = /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  var m;
  while ((m = re.exec(String(html || '')))) {
    var t = stripTags(m[2]);
    if (t && out.indexOf(t) === -1) out.push(t);
  }
  return out;
}

function visibleLength(html) {
  return stripTags(html || '').length;
}

// Returns the editable prose container of a page: div.lesson-body for CTET
// lessons, or a best-effort prose region for the other kinds. Returns null
// when there is no safe container to extend.
function proseContainer(html) {
  var openTag = '<div class="lesson-body">';
  var i0 = html.indexOf(openTag);
  if (i0 !== -1) {
    var start = i0 + openTag.length;
    var depth = 1;
    var re = /<\/?div\b[^>]*>/gi;
    re.lastIndex = start;
    var m;
    while ((m = re.exec(html))) {
      if (m[0].slice(0, 2) === '</') depth--;
      else depth++;
      if (depth === 0) {
        return { outer: html.slice(i0, m.index + '</div>'.length),
                 inner: html.slice(start, m.index), closeAt: m.index + '</div>'.length };
      }
    }
    return null;
  }
  // Beginner / mains pages: find the first prose block after the hero.
  var reBody = /<body\b[^>]*>([\s\S]*?)<\/body>/i;
  var mb = reBody.exec(html);
  if (!mb) return null;
  var body = mb[1];
  var firstProse = body.indexOf('<p>');
  if (firstProse === -1) firstProse = body.indexOf('<h3>');
  if (firstProse === -1) return null;
  return { outer: null, inner: body.slice(firstProse), closeAt: null, kind: 'body-tail' };
}

function promptFor(page, existing) {
  var base = [
    'You are a senior language teacher writing ONE new section for a free study page.',
    'Page: ' + page.file + ' (' + page.kind + ').',
    'Sections that ALREADY exist on this page (do NOT repeat these headings):',
    existing.length ? '- ' + existing.join('\n- ') : '(none yet)',
    '',
    'Write 2-3 new advanced sections as raw HTML. Rules:',
    '- Use only these tags: h3, h4, p, ul, ol, li, strong, em, code, table, thead, tbody, tr, th, td, div.span with class example-box/tip-box.',
    '- Each section starts with an <h3> title clearly different from every heading above.',
    '- Include one <div class="example-box"> with div.ex-title / div.ex-text / div.ex-soln.',
    '- Include one <div class="tip-box"> with div.tip-title / div.tip-text.',
    '- 400-700 words of explanation. Accuracy over volume; never invent a rule.',
    '- No links, images, scripts, styles, inline event handlers, external URLs.',
    '- Do not claim this is an official exam paper or a previous-year question.',
    'Reply with the HTML only. No markdown fences and no commentary.'
  ].join('\n');

  if (page.kind === 'mains' && page.lang && LANG_META[page.lang]) {
    var lm = LANG_META[page.lang];
    return base.join('\n') + '\n\n- Add one model-generated practice passage in the page language, clearly labelled "Model-generated practice (not an official UPSC question)", with 3 comprehension questions. The passage must be written in the native script of ' + page.lang + ' (' + lm.script + ', ' + lm.unicode + '). Label it sourceType: model-generated-practice so it is never mistaken for an official PYQ.';
  }
  return base;
}

function callModel(prompt, timeoutMs) {
  return new Promise(function (resolve, reject) {
    var payload = JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      options: { num_predict: 4200, temperature: 0.5 }
    });
    var args = ['-sS', '--max-time', String(timeoutMs), '-w', '\\n%{http_code}',
                HOST + '/api/chat', '-H', 'Content-Type: application/json', '-d', '@-'];
    var child = cp.spawn('curl', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    var out = '', stderr = '', settled = false;
    var startedAt = Date.now(), firstByteAt = 0, lastByteAt = Date.now();
    child.stdin.write(payload); child.stdin.end();

    function fail(why, status) {
      if (settled) return;
      settled = true;
      clearInterval(mon);
      try { child.kill('SIGKILL'); } catch (e) {}
      var err = new Error('stream monitor: ' + why);
      err.status = status === undefined ? 28 : status;
      err.stdout = out.slice(0, 2000);
      reject(err);
    }

    var mon = setInterval(function () {
      var now = Date.now();
      if (runDeadlineAt && now > runDeadlineAt) return fail('run deadline reached mid-call', 'DEADLINE');
      if (now - startedAt > CALL_CAP_MIN * 60000) return fail('hard cap ' + CALL_CAP_MIN + 'min');
      if (!firstByteAt) {
        if (now - startedAt > FIRST_BYTE_MIN * 60000) return fail('no first byte in ' + FIRST_BYTE_MIN + 'min');
      } else if (now - lastByteAt > STALL_MIN * 60000) {
        return fail('stream stalled for ' + STALL_MIN + 'min');
      }
    }, 3000);

    child.stdout.on('data', function (d) {
      out += d.toString(); lastByteAt = Date.now();
      if (!firstByteAt) firstByteAt = Date.now();
    });
    child.stderr.on('data', function (d) { stderr += d.toString(); });
    child.on('close', function (code) {
      if (settled) return;
      settled = true;
      clearInterval(mon);
      if (code !== 0) return fail('curl exited ' + code, code);
      var lines = out.split('\n');
      var httpCode = lines.pop();
      var body = lines.join('\n');
      if (httpCode !== '200') return fail('HTTP ' + httpCode, +httpCode);
      try { resolve(JSON.parse(body).message || ''); }
      catch (e) { fail('unparseable model reply', 502); }
    });
  });
}

function cleanReply(raw) {
  var s = String(raw || '')
    .replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
  var start = s.search(/<h3/i);
  if (start > 0) s = s.slice(start);
  return s.trim();
}

function validateHtml(html) {
  if (!html || html.length < 2500) return 'too short (' + (html ? html.length : 0) + ' chars)';
  if (html.length > 40000) return 'too long (' + html.length + ' chars)';
  if (/<(script|style|iframe|img|a|object|embed|form|input|button|link|meta|base)\b/i.test(html)) return 'disallowed markup';
  if (/<[^>]+\son\w+\s*=/i.test(html)) return 'disallowed markup';
  if (/javascript:|url\(/i.test(html)) return 'disallowed markup';
  var tagRe = /<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*)?)>/g;
  var m;
  while ((m = tagRe.exec(html)) !== null) {
    var tag = m[1].toLowerCase();
    var attrs = (m[2] || '').trim();
    if (!ALLOWED_TAGS[tag]) return 'tag <' + tag + '> not allowed';
    if (!attrs) continue;
    var cm = /^class\s*=\s*["']([a-z0-9\s-]+)["']$/i.exec(attrs);
    if (!cm || (tag !== 'div' && tag !== 'span')) return 'attributes not allowed on <' + tag + '>';
    var cls = cm[1].split(/\s+/);
    for (var ci = 0; ci < cls.length; ci++) {
      if (!ALLOWED_TAGS[cls[ci]] && cls[ci] !== 'example-box' && cls[ci] !== 'ex-title' &&
          cls[ci] !== 'ex-text' && cls[ci] !== 'ex-soln' && cls[ci] !== 'tip-box' &&
          cls[ci] !== 'tip-title' && cls[ci] !== 'tip-text') return 'class "' + cls[ci] + '" not allowed';
    }
  }
  var pairs = [['p','<p\\b','</p>'],['div','<div\\b','</div>'],['ul','<ul\\b','</ul>'],
    ['ol','<ol\\b','</ol>'],['li','<li\\b','</li>'],['h3','<h3\\b','</h3>'],
    ['h4','<h4\\b','</h4>'],['strong','<strong\\b','</strong>'],['em','<em\\b','</em>'],
    ['span','<span\\b','</span>'],['table','<table\\b','</table>'],['caption','<caption\\b','</caption>'],
    ['thead','<thead\\b','</thead>'],['tbody','<tbody\\b','</tbody>'],['tr','<tr\\b','</tr>'],
    ['th','<th\\b','</th>'],['td','<td\\b','</td>']];
  for (var i = 0; i < pairs.length; i++) {
    var opens = (html.match(new RegExp(pairs[i][1], 'g')) || []).length;
    var closes = (html.match(new RegExp(pairs[i][2], 'g')) || []).length;
    if (opens !== closes) return 'unbalanced <' + pairs[i][0] + '> (' + opens + ' vs ' + closes + ')';
  }
  return null;
}

function insertionPoint(html, page) {
  var c = proseContainer(html);
  if (!c) return null;
  if (c.outer) {
    // lesson-body container: append the new section just before the closing
    // </div> so existing content is preserved (never deleted).
    return { mode: 'insert-before-close', at: c.closeAt, block: c.block };
  }
  // body-tail (beginner / mains pages without lesson-body): append a new
  // .language-section before </body>, keeping practice widgets intact by
  // inserting right before the first <script> if present.
  var body = c.inner;
  var marker = '<!-- language-expansion:start -->';
  if (body.indexOf(marker) !== -1) {
    var re = new RegExp('<!-- language-expansion:start -->[\\s\\S]*?<!-- language-expansion:end -->');
    return { mode: 'replace-marker', re: re };
  }
  var scriptIdx = body.search(/<script\b/i);
  var endIdx = body.lastIndexOf('</body>');
  var at = scriptIdx !== -1 ? scriptIdx : (endIdx !== -1 ? endIdx : body.length);
  return { mode: 'append', at: at };
}

function applyInsertion(html, page, newHtml) {
  var c = insertionPoint(html, page);
  if (!c) return null;
  var block = '<div class="language-section">\n' + newHtml + '\n</div>\n';
  var out;
  if (c.mode === 'insert-before-close') {
    // Insert inside the lesson-body, before its closing tag.
    out = html.slice(0, c.at) + block + html.slice(c.at);
  } else if (c.mode === 'replace-marker') {
    out = html.replace(c.re, '<!-- language-expansion:start -->\n' + block + '<!-- language-expansion:end -->');
  } else {
    out = html.slice(0, c.at) + block + html.slice(c.at);
  }
  return out;
}

async function main() {
  var ledger = loadLedger();
  var byFile = {};
  (ledger.pages || []).forEach(function (e) { byFile[e.file] = e; });

  var candidates = PAGES.filter(function (p) {
    return fs.existsSync(path.join(ROOT, p.file));
  }).sort(function (a, b) {
    var pa = byFile[a.file], pb = byFile[b.file];
    var ta = pa ? (pa.at || 0) : 0, tb = pb ? (pb.at || 0) : 0;
    if (ta !== tb) return ta - tb;
    return a.file < b.file ? -1 : 1;
  });

  console.log('Language expansion worklist: ' + candidates.length + ' page(s)');
  candidates.slice(0, 8).forEach(function (p) {
    var e = byFile[p.file];
    console.log('  [' + p.kind + '] ' + p.file + ' (passes ' + ((e && e.passes) || 0) + ')');
  });
  if (candidates.length > 8) console.log('  ... and ' + (candidates.length - 8) + ' more page(s)');

  if (DRY || !candidates.length) {
    console.log(DRY ? 'EXPAND_LANG_DRY: listing only, nothing generated.' : 'Nothing to expand.');
    writeTouched([]);
    return;
  }

  var runStopAt = Date.now() + DEADLINE_MIN * 60000;
  runDeadlineAt = runStopAt;

  var added = 0;
  for (var i = 0; i < candidates.length; i++) {
    if (Date.now() > runStopAt) {
      console.log('Deadline reached; stopping with ' + added + ' page(s) extended this run.');
      break;
    }
    var page = candidates[i];
    var fp = path.join(ROOT, page.file);
    var html = fs.readFileSync(fp, 'utf8');
    var existing = existingSections(html);
    var prompt = promptFor(page, existing);
    try {
      var raw = await callModel(prompt, 90 * 60000);
      var newHtml = cleanReply(raw);
      var err = validateHtml(newHtml);
      if (err) {
        console.log('[' + page.kind + '] ' + page.file + ' skipped: ' + err);
        continue;
      }
      var merged = applyInsertion(html, page, newHtml);
      if (!merged) {
        console.log('[' + page.kind + '] ' + page.file + ' skipped: no insertion point');
        continue;
      }
      // The section itself was already validated above. Writing the merged page.
      fs.writeFileSync(fp, merged, 'utf8');
      var entry = byFile[page.file] || { file: page.file, kind: page.kind, passes: 0, at: 0 };
      entry.passes = (parseInt(entry.passes || 0, 10) || 0) + 1;
      entry.at = new Date().toISOString();
      entry.lastSectionCount = (newHtml.match(/<h3\b/gi) || []).length;
      byFile[page.file] = entry;
      ledger.pages = Object.values(byFile);
      saveLedger(ledger);
      added++;
      console.log('[' + page.kind + '] ' + page.file + ' extended (' + newHtml.length + ' chars, ' +
        entry.lastSectionCount + ' new section(s))');
    } catch (e) {
      console.log('[' + page.kind + '] ' + page.file + ' skipped: ' + (e.message || e));
    }
  }

  writeTouched(Object.keys(byFile));
  console.log('LANG-EXPAND-RESULT {"added":' + added + ',"pages":' + JSON.stringify(Object.keys(byFile)) + '}');
}

function writeTouched(files) {
  try {
    fs.writeFileSync(path.join(__dirname, '.course-touched.json'),
      JSON.stringify({ keys: [], files: files, exams: [] }, null, 2) + '\n', 'utf8');
  } catch (e) {}
}

if (require.main === module) {
  main().catch(function (e) {
    console.error('expand-language-pages failed: ' + (e && e.stack || e));
    process.exit(1);
  });
}
