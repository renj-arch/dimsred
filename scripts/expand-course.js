#!/usr/bin/env node
// Course Content Expander -- the agent that fills the exam courses' gaps.
//
// Every exam in scripts/exam-configs.json declares modules and lessons; a
// lesson's body and practice MCQs come from scripts/course-data.json and
// scripts/course-practice.json, keyed "<module>/<slug>". Slots without a key
// render the generator's bare auto filler ("This lesson covers ...").
//
// This agent finds those slots, has the CI model (qwen3.5:9b, Ollama on the runner)
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
// Run:  OLLAMA_HOST=http://127.0.0.1:11434 OLLAMA_MODEL=qwen3.5:9b node scripts/expand-course.js
// Dry:  EXPAND_DRY=1 node scripts/expand-course.js            (list gaps, no model)
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var htmlRepair = require('./lib/html-repair');

var ROOT = path.join(__dirname, '..');
var CONFIGS_FILE = path.join(__dirname, 'exam-configs.json');
var DATA_FILE = path.join(__dirname, 'course-data.json');
var PRACTICE_FILE = path.join(__dirname, 'course-practice.json');
var TOUCHED_FILE = path.join(__dirname, '.course-touched.json');

var HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
var MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:9b';
var PER_RUN = parseInt(process.env.EXPAND_PER_RUN || '5', 10);
var DEADLINE_MIN = parseInt(process.env.EXPAND_DEADLINE_MIN || '70', 10);
var DRY = !!process.env.EXPAND_DRY;
var SKIP_EXAMS = (process.env.EXPAND_SKIP_EXAMS || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
// Lessons shorter than this (characters of HTML) are treated as brief stubs
// and rewritten by the enrich role. 0 disables enrichment entirely.
var THIN = parseInt(process.env.EXPAND_THIN_THRESHOLD || '2500', 10);
// Depth lane: append NEW advanced sections to lessons that are already full,
// instead of only fixing empty/stub ones. Off unless the workflow asks for it.
var DEEPEN = /^(1|true|yes)$/i.test(process.env.EXPAND_DEEPEN || '');
var DEPTH_PASSES = Math.max(1, parseInt(process.env.EXPAND_DEPTH_PASSES || '3', 10));
var DEPTH_FILE = path.join(__dirname, 'course-depth.json');
var ADDONS_FILE = path.join(__dirname, 'course-addons.json');

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

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
// Per-lesson depth history: how many passes a key has had, and when. Kept out
// of course-data (which is a plain key -> HTML map) so it survives restores.
var depthState = loadJson(DEPTH_FILE, { keys: {} });
if (!depthState || typeof depthState !== 'object') depthState = { keys: {} };
if (!depthState.keys || typeof depthState.keys !== 'object') depthState.keys = {};
// Hand-built pages are NOT regenerated. Their extra sections live here and are
// injected at deploy time, so the page keeps every line a human wrote.
var addons = loadJson(ADDONS_FILE, { keys: {} });
if (!addons || typeof addons !== 'object') addons = { keys: {} };
if (!addons.keys || typeof addons.keys !== 'object') addons.keys = {};

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

// Depth worklist: every declared lesson that already has real content, oldest
// depth pass first, then shortest. Generated lessons get the new sections
// appended to course-data (and their page is regenerated). Hand-built pages
// (a page much larger than its source, or the six pages with no source at all)
// are never regenerated: their addenda go to scripts/course-addons.json and are
// injected at deploy time, so nothing a human wrote is lost.
function pageSize(fp) {
  try { return fs.statSync(fp).size; } catch (e) { return 0; }
}

function collectDeepen() {
  var out = [];
  var seen = {};
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
        var users = examsUsing(mk, lesson.slug);
        if (!users.length) return;
        var files = users.map(function (u) { return u.dir + '/course/' + mk + '/lesson-' + lesson.slug + '.html'; });
        var existing = files.filter(function (f) { return fs.existsSync(path.join(ROOT, f)); });
        if (!existing.length) return;
        var content = String(courseData[key] || '');
        // No source + auto filler is a fill job, not a depth job.
        var allFiller = existing.every(function (f) { return isFillerPage(path.join(ROOT, f)); });
        if (!content && allFiller) return;
        var biggest = existing.reduce(function (m, f) { return Math.max(m, pageSize(path.join(ROOT, f))); }, 0);
        // A generated page is template + content; a page several times larger
        // than its source carries hand-written material the generator cannot
        // reproduce.
        var handBuilt = !content || biggest > Math.max(60000, content.length * 4);
        var st = depthState.keys[key] || {};
        var passes = parseInt(st.passes || 0, 10) || 0;
        if (passes >= DEPTH_PASSES) return;
        out.push({
          key: key,
          mk: mk,
          slug: lesson.slug,
          role: handBuilt ? 'deepen-page' : 'deepen',
          oldLen: content.length,
          pageSize: biggest,
          passes: passes,
          lastAt: String(st.at || ''),
          lesson: users[0].lesson,
          modName: users[0].modName,
          examName: users[0].examName,
          examCount: users.length,
          files: files
        });
      });
    });
  });
  // Never-deepened first, then the least recently deepened, then shortest.
  out.sort(function (a, b) {
    if (a.lastAt !== b.lastAt) {
      if (!a.lastAt) return -1;
      if (!b.lastAt) return 1;
      return a.lastAt < b.lastAt ? -1 : 1;
    }
    return a.oldLen - b.oldLen;
  });
  return out;
}

// Hand-built root pages are not in exam-configs.json at all: 204 lesson-*.html
// pages plus the concept-map and paper hubs linked from the home page. They have
// no course-data key, so the generator can never rewrite them; their depth goes
// to course-addons.json and is injected at deploy time. Hubs have no
// .lesson-body wrapper, so their entries target the document body instead.
var HAND_HUBS = [
  { file: 'papers.html', subject: 'Exam Papers' },
  { file: 'physics.html', subject: 'Physics' },
  { file: 'chemistry.html', subject: 'Chemistry' },
  { file: 'math.html', subject: 'Mathematics' }
];

function metaContent(html, name) {
  var tags = String(html || '').match(/<meta\b[^>]*>/gi) || [];
  for (var i = 0; i < tags.length; i++) {
    var nm = /name=["']([^"']+)["']/i.exec(tags[i]);
    if (!nm || nm[1].toLowerCase() !== String(name).toLowerCase()) continue;
    var cm = /content=["']([^"']*)["']/i.exec(tags[i]);
    if (cm) return stripTags(cm[1]);
  }
  return '';
}

function pageTitle(html) {
  var m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(html || ''));
  if (!m) return '';
  return stripTags(m[1])
    .replace(/\s*[|\u2014\u2013-]\s*(?:vlymbooq|dimsred)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// The concept maps keep their node labels in a JS array; the object literal has
// title/label/name before href, so pair them to recover the full topic list.
function hubTopics(html) {
  var s = String(html || '');
  var names = [];
  var re = /(?:name|title|label)\s*:\s*['"]([^'"]+)['"][^{}]{0,600}?href\s*:\s*['"](?:\.\/)?lesson-/gi;
  var m;
  while ((m = re.exec(s))) {
    var t = stripTags(m[1]).trim();
    if (t && names.indexOf(t) === -1) names.push(t);
  }
  if (!names.length) {
    var tabRe = /<div class="tab\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    while ((m = tabRe.exec(s))) {
      var tab = stripTags(m[1]).trim();
      if (tab && names.indexOf(tab) === -1) names.push(tab);
    }
  }
  if (!names.length) names = headingsIn(html);
  return names.slice(0, 20).join(', ');
}

function handTopics(html, title) {
  var heads = headingsIn(html).filter(function (h) {
    return h.toLowerCase() !== String(title || '').toLowerCase();
  });
  return heads.slice(0, 14).join(', ') || title;
}

// A root lesson is linked from exactly one concept map (203 of 204); that link
// is the most reliable subject label available without editing the pages.
function hubSubjectMap() {
  var map = {};
  [['math.html', 'Mathematics'], ['physics.html', 'Physics'], ['chemistry.html', 'Chemistry']].forEach(function (pair) {
    var fp = path.join(ROOT, pair[0]);
    if (!fs.existsSync(fp)) return;
    var s = fs.readFileSync(fp, 'utf8');
    var re = /href\s*:\s*['"](?:\.\/)?lesson-([^'"#]+)\.html['"]/gi;
    var m;
    while ((m = re.exec(s))) {
      if (!map[m[1]]) map[m[1]] = pair[1];
    }
  });
  return map;
}

function collectHandPages() {
  var out = [];
  var seen = {};
  var subjectOf = hubSubjectMap();

  function add(rel, slug, target, subject, title, desc, topics, priority) {
    if (seen[rel]) return;
    seen[rel] = 1;
    var key = 'hand/' + slug;
    var st = depthState.keys[key] || {};
    var passes = parseInt(st.passes || 0, 10) || 0;
    if (passes >= DEPTH_PASSES) return;
    out.push({
      key: key,
      mk: 'hand',
      slug: slug,
      role: 'deepen-page',
      target: target,
      oldLen: 0,
      pageSize: pageSize(path.join(ROOT, rel)),
      passes: passes,
      lastAt: String(st.at || ''),
      lesson: { title: title, desc: desc, topics: topics },
      modName: subject,
      examName: 'competitive exam',
      examCount: 1,
      files: [rel],
      priority: priority
    });
  }

  // Hubs first so the pages the user actually lands on get depth immediately.
  HAND_HUBS.forEach(function (h) {
    var fp = path.join(ROOT, h.file);
    if (!fs.existsSync(fp)) return;
    var html = fs.readFileSync(fp, 'utf8');
    var title = pageTitle(html) || h.subject;
    var desc = metaContent(html, 'description') || title;
    var topics = hubTopics(html) || title;
    add(h.file, h.file.replace(/\.html$/, ''), 'body', h.subject, title, desc, topics, 0);
  });

  fs.readdirSync(ROOT).filter(function (f) {
    return /^lesson-.*\.html$/.test(f);
  }).sort().forEach(function (f) {
    var slug = f.replace(/^lesson-/, '').replace(/\.html$/, '');
    var html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    var title = pageTitle(html) || slug.replace(/-/g, ' ');
    var desc = metaContent(html, 'description') || title;
    add(f, slug, 'lesson-body', subjectOf[slug] || 'General Studies', title, desc, handTopics(html, title), 1);
  });

  out.sort(function (a, b) {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.lastAt !== b.lastAt) {
      if (!a.lastAt) return -1;
      if (!b.lastAt) return 1;
      return a.lastAt < b.lastAt ? -1 : 1;
    }
    return a.pageSize - b.pageSize;
  });
  return out;
}

// Fair-share the two lanes: one hand page, one generated lesson, so neither
// starves while both still have depth passes left.
function interleave(a, b) {
  var out = [];
  var i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length) out.push(a[i++]);
    if (j < b.length) out.push(b[j++]);
  }
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

// ---- depth prompts ---------------------------------------------------------

function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function headingsIn(html) {
  var out = [];
  var re = /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  var m;
  while ((m = re.exec(String(html || '')))) {
    var t = stripTags(m[2]);
    if (t && out.indexOf(t) === -1) out.push(t);
  }
  return out;
}

function closingDiv(html, openEnd) {
  var re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = openEnd;
  var depth = 1;
  var m;
  while ((m = re.exec(html))) {
    if (m[0].slice(0, 2) === '</') depth--;
    else depth++;
    if (depth === 0) return m.index;
  }
  return -1;
}

function bodyInner(html) {
  var m = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(String(html || ''));
  return m ? m[1] : String(html || '');
}

// Scripts and styles are the bulk of a hand-built page; they carry no lesson
// prose and would swamp both the prompt and the overlap check.
function cleanPageSource(html) {
  return String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function pageSource(gap) {
  for (var i = 0; i < gap.files.length; i++) {
    var fp = path.join(ROOT, gap.files[i]);
    if (!fs.existsSync(fp)) continue;
    var s = fs.readFileSync(fp, 'utf8');
    var inner;
    if (gap.target === 'body') {
      inner = cleanPageSource(bodyInner(s));
    } else {
      var openTag = '<div class="lesson-body">';
      var i0 = s.indexOf(openTag);
      if (i0 !== -1) {
        var start = i0 + openTag.length;
        var close = closingDiv(s, start);
        inner = cleanPageSource(close === -1 ? s.slice(start) : s.slice(start, close));
      } else {
        inner = cleanPageSource(bodyInner(s));
      }
    }
    return inner.slice(-120000);
  }
  return '';
}

function addonSource(key) {
  var entry = addons.keys[key];
  return entry && entry.html ? String(entry.html) : '';
}

function deepenPrompt(gap) {
  var source = gap.role === 'deepen' ? String(courseData[gap.key] || '') : pageSource(gap);
  // Pass 2 and 3 must see what pass 1 already added, or the model repeats it.
  if (gap.role === 'deepen-page') {
    var prior = addonSource(gap.key);
    if (prior) source = source + '\n' + prior;
  }
  var headings = headingsIn(source).slice(0, 90);
  var digest = stripTags(source).slice(-4500);
  var lines = [
    'You are a senior ' + gap.examName + ' ' + gap.modName + ' teacher. The lesson "' + gap.lesson.title + '" already exists; write the NEXT LEVEL, not a rewrite.',
    'What the lesson covers: ' + gap.lesson.desc,
    'Key topics: ' + gap.lesson.topics + '.',
    '',
    'Sections that ALREADY exist (do NOT repeat these):',
    headings.length ? '- ' + headings.join('\n- ') : '(none yet)',
    '',
    'End of the existing lesson for tone and continuity:',
    digest || '(no text available)',
    '',
    'Write 3 NEW advanced sections that a serious aspirant needs but the list above does not cover:',
    '- go deeper than the basics: mechanisms, exceptions, comparisons, landmark cases/data where textbook-standard, applied scenarios, and how the examiner twists the concept',
    '- each section starts with an <h3> title that is clearly different from every existing heading',
    '- include one <div class="example-box"> with div.ex-title (technique), div.ex-text (question), div.ex-soln (full worked answer)',
    '- include one <div class="tip-box"> with div.tip-title and div.tip-text for exam-day strategy',
    '- finish with a "Common Traps" <ul> specific to these advanced sections',
    '',
    'Format: HTML fragment only, tags <h3> <h4> <p> <ul> <ol> <li> <strong> <em> <br> <div> <span>.',
    'div classes allowed: example-box/ex-title/ex-text/ex-soln and tip-box/tip-title/tip-text. No other attributes, no links, images, scripts or markdown.',
    '700-1000 words of visible text. Be specific and correct; never invent statistics or sources; classic textbook facts only.',
    '',
    'After the HTML output exactly this line:',
    '===QUESTIONS===',
    'Then a JSON array of exactly 5 NEW exam-style MCQs on only these advanced sections, shaped like:',
    '[{"text":"question","options":["A","B","C","D"],"correct":0,"sol":"worked solution"}]',
    '4 plausible options, exactly one correct (0-3), solutions explaining the reasoning, each question tests a different advanced idea.'
  ];
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

// Append new MCQs without reusing ids or dropping the earlier set.
function mergePractice(key, qs) {
  var arr = (coursePractice[key] || []).slice();
  var next = 101;
  arr.forEach(function (q) { if (q && q.id >= next) next = q.id + 1; });
  qs.forEach(function (q) {
    arr.push({
      id: next++,
      text: q.text,
      options: q.options.map(function (o, j) { return { l: ['a', 'b', 'c', 'd'][j], t: o, c: j === q.correct }; }),
      sol: q.sol
    });
  });
  coursePractice[key] = arr.slice(0, 30);
}

// ---- generation per gap ----------------------------------------------------

function generateOne(gap, timeoutMs) {
  var prompt = (gap.role === 'deepen' || gap.role === 'deepen-page') ? deepenPrompt(gap) : theoryPrompt(gap);
  var source = '';
  if (gap.role === 'deepen') source = String(courseData[gap.key] || '');
  else if (gap.role === 'deepen-page') source = pageSource(gap);
  return callModel(prompt, 3400, timeoutMs).then(function (raw) {
    var html = raw;
    var rest = '';
    var qi = raw.indexOf('===QUESTIONS===');
    if (qi !== -1) {
      html = raw.slice(0, qi);
      rest = raw.slice(qi + 15);
    }
    html = html.replace(/^\s*```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
    // Close missing tags and drop attributes the validator would reject. The
    // model's prose is kept; only malformed markup is repaired.
    html = htmlRepair.sanitize(html);
    var err = validateHtml(html);
    if (err) throw new Error('html rejected: ' + err);
    if (gap.role === 'enrich' && html.length < gap.oldLen + 1500) {
      throw new Error('not a real expansion (' + html.length + ' vs ' + gap.oldLen + ' chars)');
    }
    if (gap.role === 'deepen' || gap.role === 'deepen-page') {
      if (html.length < 3000) throw new Error('depth section too short (' + html.length + ' chars)');
      var old = {};
      headingsIn(source).forEach(function (h) { old[h.toLowerCase()] = 1; });
      var repeated = headingsIn(html).filter(function (h) { return old[h.toLowerCase()]; });
      if (repeated.length) throw new Error('repeats existing section(s): ' + repeated.slice(0, 2).join('; '));
      if (source && overlap(stripTags(html), stripTags(source)) >= 0.5) {
        throw new Error('deep section overlaps the existing lesson too closely');
      }
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
  var deeps = DEEPEN ? interleave(collectHandPages(), collectDeepen()) : [];
  console.log('Course worklist: ' + fills.length + ' empty slot(s), ' + thins.length + ' thin lesson(s) (<' + THIN + ' chars), ' + deeps.length + ' depth candidate(s)');
  if (DRY && process.env.EXPAND_DRY_JSON) {
    fs.writeFileSync(path.resolve(process.env.EXPAND_DRY_JSON), JSON.stringify(deeps, null, 2) + '\n', 'utf8');
  }
  fills.slice(0, 10).forEach(function (g) {
    console.log('  [fill]   ' + g.key + '  (' + g.examCount + ' exam' + (g.examCount > 1 ? 's' : '') + ')');
  });
  if (fills.length > 10) console.log('  ... and ' + (fills.length - 10) + ' more empty slot(s)');
  thins.slice(0, 10).forEach(function (g) {
    console.log('  [enrich] ' + g.key + '  (' + g.oldLen + ' chars, ' + g.examCount + ' exam' + (g.examCount > 1 ? 's' : '') + ')');
  });
  if (thins.length > 10) console.log('  ... and ' + (thins.length - 10) + ' more thin lesson(s)');
  deeps.slice(0, 10).forEach(function (g) {
    console.log('  [' + (g.role === 'deepen-page' ? 'depth-page' : 'depth') + '] ' + g.key + '  (pass ' + (g.passes + 1) + '/' + DEPTH_PASSES + ', ' + g.oldLen + ' chars)');
  });
  if (deeps.length > 10) console.log('  ... and ' + (deeps.length - 10) + ' more depth candidate(s)');

  if (DRY || (!fills.length && !thins.length && !deeps.length)) {
    writeTouched([], [], []);
    console.log(DRY ? 'EXPAND_DRY: listing only, nothing generated or written.' : 'Nothing to fill.');
    return;
  }

  // Empty slots first (a lesson that says nothing at all), then the
  // shortest thin lessons (the most visible gain per generation), then depth.
  var queue = fills.concat(thins).concat(deeps);

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
      if (gap.role === 'deepen') {
        // Append, never rewrite: the existing lesson survives verbatim.
        courseData[gap.key] = String(courseData[gap.key] || '').trim() + '\n' + res.html;
        mergePractice(gap.key, res.questions);
        saveJson(DATA_FILE, courseData);
        saveJson(PRACTICE_FILE, coursePractice);
        gap.users.forEach(function (u) { touchedExams[u.examKey] = 1; });
        addedKeys.push(gap.key);
        addedFiles = addedFiles.concat(gap.files);
      } else if (gap.role === 'deepen-page') {
        // Hand-built page: keep the addendum out of the generator's reach.
        var entry = addons.keys[gap.key] || {};
        entry.html = String(entry.html || '').trim() + (entry.html ? '\n' : '') + res.html;
        entry.passes = (parseInt(entry.passes || 0, 10) || 0) + 1;
        entry.at = new Date().toISOString();
        entry.title = gap.lesson.title;
        entry.files = gap.files;
        addons.keys[gap.key] = entry;
        mergePractice(gap.key, res.questions);
        saveJson(ADDONS_FILE, addons);
        saveJson(PRACTICE_FILE, coursePractice);
      } else {
        courseData[gap.key] = res.html;
        if (res.questions.length >= 3) coursePractice[gap.key] = toPractice(res.questions);
        saveJson(DATA_FILE, courseData);
        saveJson(PRACTICE_FILE, coursePractice);
        gap.users.forEach(function (u) { touchedExams[u.examKey] = 1; });
        addedKeys.push(gap.key);
        addedFiles = addedFiles.concat(gap.files);
      }
      if (gap.role === 'deepen' || gap.role === 'deepen-page') {
        depthState.keys[gap.key] = {
          passes: gap.passes + 1,
          at: new Date().toISOString(),
          role: gap.role
        };
        saveJson(DEPTH_FILE, depthState);
      }
      added++;
      var verb = gap.role === 'enrich' ? ' expanded ' : (gap.role === 'deepen' ? ' deepened ' : (gap.role === 'deepen-page' ? ' deepened (hand-built) ' : ' written '));
      console.log('[' + gap.examName + '] ' + gap.key + verb +
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
