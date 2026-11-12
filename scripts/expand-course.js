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
// Comma-separated "module/slug" keys restrict every lane to just those
// lessons — the workflow's "keys" input, for targeted fix runs.
var ONLY_KEYS = {};
String(process.env.EXPAND_ONLY_KEYS || '').split(',').forEach(function (k) {
  k = k.trim();
  if (k) ONLY_KEYS[k] = 1;
});
function onlyAllowed(key) {
  var n = Object.keys(ONLY_KEYS).length;
  return !n || !!ONLY_KEYS[key];
}
// Depth lane: append NEW advanced sections to lessons that are already full,
// instead of only fixing empty/stub ones. Off unless the workflow asks for it.
var DEEPEN = /^(1|true|yes)$/i.test(process.env.EXPAND_DEEPEN || '');
// Depth convergence targets WORDS, not passes.
//
// A fixed pass count cannot reach hand-built density. The eight hand-built UPSC
// GS lessons average 58,278 words of prose each; one depth pass adds 2,000-3,500.
// Five passes is ~15,000 words — a quarter of the way — and the old code then
// stopped forever. So the lane now measures the lesson and keeps returning to it
// on later scheduled runs until it reaches the target. DEPTH_PASS_MAX is only a
// backstop for a page that can never converge.
var DEPTH_TARGET_WORDS = Math.max(1000, parseInt(process.env.EXPAND_DEPTH_TARGET_WORDS || '20000', 10));
var DEPTH_TARGET_WORDS_BUILT = Math.max(1000, parseInt(process.env.EXPAND_DEPTH_TARGET_WORDS_BUILT || '45000', 10));
var DEPTH_PASS_MAX = Math.max(1, parseInt(process.env.EXPAND_DEPTH_PASS_MAX || '60', 10));
var DEPTH_FILE = path.join(__dirname, 'course-depth.json');
var ADDONS_FILE = path.join(__dirname, 'course-addons.json');
// Full rewrite mode: rewrites ALL lessons (including hand-built ones) with
// high-quality model-generated content. No gap-filling, no protection of
// hand-written pages — every lesson gets a complete rewrite.
var FULL_REWRITE = /^(1|true|yes)$/i.test(process.env.EXPAND_FULL_REWRITE || '');

// Transport watchdogs (see curlChat): silence before the first streamed byte
// is normal on CPU (cold load + prompt eval), mid-stream silence is wedged,
// and CALL_CAP_MIN is nobody-legitimate-needs-more. runDeadlineAt lets a
// mid-call generation stop at the run deadline instead of overshooting it.
var FIRST_BYTE_MIN = parseFloat(process.env.EXPAND_FIRST_BYTE_MIN || '10') || 10;
var STALL_MIN = parseFloat(process.env.EXPAND_STALL_MIN || '10') || 10;
var CALL_CAP_MIN = parseFloat(process.env.EXPAND_CALL_CAP_MIN || '90') || 90;
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
// In FULL_REWRITE mode, EVERY declared lesson qualifies — we rewrite
// everything, including hand-built pages, with model-generated content.
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

        // In full-rewrite mode, every lesson qualifies — skip the content check.
        if (!FULL_REWRITE) {
          if (hasContent(mk, lesson.slug)) return;
          var users = examsUsing(mk, lesson.slug);
          if (!users.length) return;
          var allFiller = users.every(function (u) {
            return isFillerPage(pagePath(u.dir, mk, lesson.slug));
          });
          if (!allFiller) return;
        } else {
          var users = examsUsing(mk, lesson.slug);
          if (!users.length) return;
        }

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
    // A page much larger than its source carries hand-written material the
    // generator cannot reproduce (same test collectDeepen uses). Enriching
    // the source would drift the JSON away from the committed page, so those
    // keys belong to the deepen-page lane, never to a rewrite.
    var biggest = users.reduce(function (m, u) {
      return Math.max(m, pageSize(pagePath(u.dir, mk, slug)));
    }, 0);
    if (biggest > Math.max(60000, len * 4)) return;
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

// Visible words in a page, cached per run. pageSize() counts CSS, scripts and
// inline SVG, which on a hand-built lesson is most of the file, so it cannot be
// used to decide whether the PROSE is deep enough. cleanPageSource() strips
// exactly those, then this drops the remaining tags.
var _wordCache = {};
function pageWords(fp) {
  if (_wordCache[fp] !== undefined) return _wordCache[fp];
  var n = 0;
  try {
    var text = cleanPageSource(fs.readFileSync(fp, 'utf8'))
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ');
    n = text.split(/\s+/).filter(function (w) { return w.length > 1; }).length;
  } catch (e) { n = 0; }
  _wordCache[fp] = n;
  return n;
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
        // A thin/stub lesson belongs to the enrich lane, not depth — unless it
        // is hand-built, in which case enrich refuses it (the rewrite would
        // drift the JSON away from the committed page) and depth-page is the
        // only lane left that can still add to it.
        if (content && content.length < THIN && !handBuilt) return;
        var st = depthState.keys[key] || {};
        var passes = parseInt(st.passes || 0, 10) || 0;
        if (passes >= DEPTH_PASS_MAX) return;
        var words = existing.reduce(function (m, f) { return Math.max(m, pageWords(path.join(ROOT, f))); }, 0);
        var target = handBuilt ? DEPTH_TARGET_WORDS_BUILT : DEPTH_TARGET_WORDS;
        if (words >= target) return;
        out.push({
          key: key,
          mk: mk,
          slug: lesson.slug,
          role: handBuilt ? 'deepen-page' : 'deepen',
          oldLen: content.length,
          pageSize: biggest,
          words: words,
          targetWords: target,
          deficit: target - words,
          passes: passes,
          lastAt: String(st.at || ''),
          lesson: users[0].lesson,
          modName: users[0].modName,
          examName: users[0].examName,
          examCount: users.length,
          users: users,
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
    if (passes >= DEPTH_PASS_MAX) return;
    var abs = path.join(ROOT, rel);
    var words = pageWords(abs);
    if (words >= DEPTH_TARGET_WORDS_BUILT) return;
    out.push({
      key: key,
      mk: 'hand',
      slug: slug,
      role: 'deepen-page',
      target: target,
      oldLen: pageSize(abs),
      pageSize: pageSize(abs),
      words: words,
      targetWords: DEPTH_TARGET_WORDS_BUILT,
      deficit: DEPTH_TARGET_WORDS_BUILT - words,
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

function examQuestionRules(gap) {
  var mk = gap.mk;
  var exam = gap.examName;
  var mod = gap.modName;

  var base = [
    'Write exactly 5 exam-style MCQs on this lesson. Return ONLY a JSON array, no prose and no markdown fences, shaped like:',
    '[{"text":"question","options":["A","B","C","D"],"correct":0,"sol":"worked solution"}]',
    'Rules:',
    '- 4 plausible options, exactly one correct (0-3 index).',
    '- Solutions explain the reasoning step by step (40-200 words).',
    '- NEVER use "all of the above" / "none of the above" / "cannot be determined" as an option.',
    '- Each question tests a DIFFERENT sub-aspect of the lesson.',
    '- Questions must match the difficulty and style of the real ' + exam + ' exam.',
    '- No generic filler like "which step is most critical for accurate problem-solving".',
    '- Write mathematics in plain text with Unicode symbols; do not use LaTeX, $...$ delimiters, or emojis.',
    '- Every question must have a definite, verifiable answer from the lesson content.'
  ];

  var quantRules = [
    'QUANT question patterns for ' + exam + ':',
    '- Mix concepts in single questions (e.g., percentage + profit-loss, time-work + ratio).',
    '- Include calculation-heavy and approximation-style questions.',
    '- Use realistic numbers (prices, populations, distances, interest rates) not round trivial ones.',
    '- For ' + exam + ': watch for recent pattern shifts — statement-based questions, quantity comparison, caselet DI with 2-3 interlinked tables.',
    '- Options should be close enough to require real calculation, not guessable by elimination.',
  ];

  var reasoningRules = [
    'REASONING question patterns for ' + exam + ':',
    '- Puzzles: multiple conditions, uncertain arrangements, floor-based or box-based setups.',
    '- Inequalities: coded symbols, chained comparisons, either-or conclusions.',
    '- Syllogism: possibility cases, complementary pairs, direct + indirect conclusions.',
    '- Data sufficiency: 2-3 statements, mark whether each is sufficient alone or together.',
    '- For ' + exam + ': recent pattern changes include input-output with new operations, and box/uncertain puzzles replacing linear seating.',
    '- Options must be logically distinct; no two options can both be correct.',
  ];

  var englishRules = [
    'ENGLISH question patterns for ' + exam + ':',
    '- Reading comprehension: inference-based, tone, title, and phrase replacement questions.',
    '- Grammar: error spotting with multiple errors in one sentence, not just single-word fixes.',
    '- Vocabulary: word usage in context (same word, different meaning), antonyms with tricky distractors.',
    '- Fillers: single and double blank, phrase connectors, starters.',
    '- For ' + exam + ': recent shifts include paragraph jumble with 6+ sentences, and cloze with context-dependent options.',
    '- Options must test real language discrimination, not obscure vocabulary.',
  ];

  if (mk === 'quant' || mk === 'maths' || /quant|aptitude|maths/i.test(mod)) {
    base = base.concat(quantRules);
  } else if (mk === 'reasoning' || /reasoning|logical|aptitude/i.test(mod)) {
    base = base.concat(reasoningRules);
  } else if (mk === 'english' || /english|verbal|language/i.test(mod)) {
    base = base.concat(englishRules);
  }

  return base.join('\n');
}

function theoryPrompt(gap) {
  var lines = [
    'You are a senior ' + gap.examName + ' ' + gap.modName + ' teacher writing one lesson for a free study site.',
    'Lesson: "' + gap.lesson.title + '" (' + gap.mk + ' module).',
    'What it covers: ' + gap.lesson.desc,
    'Key topics: ' + gap.lesson.topics + '.',
    '',
    'WRITE LIKE A TEXTBOOK, NOT LIKE NOTES:',
    '- Every section is continuous prose: full sentences in <p> paragraphs that explain, connect and give reasons.',
    '- REJECTED as note-form: "GDP vs GNP: GDP = domestic production; GNP = GDP + NFIA. Real vs Nominal: deflator = (Nominal / Real) x 100."',
    '- ACCEPTED: "Gross domestic product measures output produced inside the country, so it ignores what residents earn abroad. Gross national product adds net factor income from abroad, which is why the two diverge sharply in a country with large remittances."',
    '- Explain cause and consequence, not only definition. Say why something happens and what follows from it.',
    '- Name the specifics a student can be examined on: people, places, dates, Acts, articles, cases, formulae, units.',
    '- Never invent a quotation, statistic, casualty figure, date or citation. If you are not certain of a specific, describe the concept without it.',
    '- Do not write "similar to SSC CGL 2022 Slot 2 Q45" or any other past-paper reference. You cannot verify it, and a wrong one is worse than none.',
    '',
    'STRUCTURE -- two levels, like a textbook chapter:',
    '- 4-7 <h2> topic groups that cover the whole subject in teaching order. Title each with the actual topic (for example "3. Preamble and Key Features").',
    '- Under each <h2>, 3-6 numbered <h3> sub-sections (for example "3.1 The Preamble", "3.2 Nature of the Constitution"). Number them continuously through the lesson.',
    '- Every heading must fit THIS lesson only, never a generic label.',
    '- Do NOT use the headings "Common Traps", "Memory Tricks", "Exam Day Checklist", "Quick Formulas", "Exam Pattern", "Standard Sources", "Periods at a Glance", "Key Concepts", or any "Advanced Section" prefix. They appeared in hundreds of lessons and made every page identical.',
    '- Include at least two <table> elements comparing things genuinely comparable in this topic (two theories, two periods, two methods, two organisms), each with a <caption>.',
    '- Include one <div class="example-box"> with div.ex-title, div.ex-text and div.ex-soln: an exam-style question with a full worked solution.',
    '- Include one <div class="tip-box"> with div.tip-title and div.tip-text: a specific exam-day insight, not generic advice.',
    '',
    'LENGTH: 2500-4000 words of visible text. A thin lesson on a large topic is a failed lesson. Never pad with repetition to reach the length.',
    '',
    'HTML FORMAT (use ONLY these tags):',
    '<h2> <h3> <h4> <p> <ul> <ol> <li> <strong> <em> <br> <div> <span> <sup> <sub> <table> <caption> <thead> <tbody> <tr> <th> <td>.',
    '<div> elements may only carry these classes: example-box (div.ex-title, div.ex-text, div.ex-soln) and tip-box (div.tip-title, div.tip-text).',
    'No attributes on any tag except class on div.example-box, div.ex-title, div.ex-text, div.ex-soln, div.tip-title, div.tip-text.',
    'No markdown, no images, no links, no scripts, no inline styles.',
    'Write mathematics in plain text with Unicode symbols (×, ÷, ≤, ≥, π, √). Do not use LaTeX or $...$ delimiters. Do not use emojis.',
    '',
    'Do not append a practice-question JSON or a ===QUESTIONS=== marker; practice questions are generated in a separate pass.'
  ];

  if (gap.role === 'enrich') {
    lines.push('');
    lines.push('The lesson currently on the site is only ' + gap.oldLen + ' characters -- far too brief.');
    lines.push('Here it is for continuity; rewrite it as the complete lesson described above:');
    lines.push(String(courseData[gap.key] || '').slice(0, 4000));
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
    gap.targetWords
      ? ('Progress: the lesson currently has about ' + gap.words + ' words of prose; the depth target is ' +
         gap.targetWords + ' (' + gap.deficit + ' words still to come across future passes). This pass still has to ' +
         'stand on its own as a complete, exam-ready set of sections.')
      : '',
    'Write 4-5 NEW advanced sections that a serious aspirant needs but the list above does not cover (at least 3 if a later one would repeat an existing heading):',
    '- go deeper than the basics: mechanisms, exceptions, comparisons, landmark cases/data where textbook-standard, applied scenarios, chronology, cause and effect, and how the examiner twists the concept',
    '- each section starts with an <h3> title that is clearly different from every existing heading',
    '- the title must name the actual content ("The Pashupati Seal and What It Shows"), never a label. Do NOT prefix titles with "Advanced Section"; do NOT use "Common Traps", "Memory Tricks", "Exam Day Checklist", "Quick Formulas", "Periods at a Glance", "Standard Sources" or "Key Concepts" -- those were used in hundreds of lessons and made every page look the same',
    '- each section must be substantial: 400-700 words of specific, correct detail (dates, names, events, statutes, judgments, movements), not generic statements',
    '- include one <div class="example-box"> with div.ex-title (technique), div.ex-text (question), div.ex-soln (full worked answer)',
    '- include one <div class="tip-box"> with div.tip-title and div.tip-text for exam-day strategy',
    '- finish with a "Common Traps" <ul> specific to these advanced sections (5-7 traps)',
    '',
    'Format: HTML fragment only, tags <h3> <h4> <p> <ul> <ol> <li> <strong> <em> <br> <div> <span> <sup> <sub> <table> <caption> <thead> <tbody> <tr> <th> <td>.',
    'div classes allowed: example-box/ex-title/ex-text/ex-soln and tip-box/tip-title/tip-text. No other attributes, no links, images, scripts or markdown.',
    'Write mathematics in plain text with Unicode symbols (×, ÷, ≤, ≥, π, √). Do not use LaTeX or $...$ delimiters. Do not use emojis.',
    '2000-3500 words of visible text across all sections. Be specific and correct; never invent statistics or sources; classic textbook facts only.',
    '',
    'Do not append a practice-question JSON or a ===QUESTIONS=== marker; practice questions are generated in a separate pass.'
  ];
  return lines.join('\n');
}

// Practice questions are a separate, short completion. Asking for a
// 700-1000-word lesson and five solved MCQs in one 3400-token reply was the
// main cause of "0 validated MCQs": the HTML used the budget and the JSON was
// truncated. This prompt only sees the finished lesson, so it cannot truncate
// the lesson it is supposed to test.
function questionsPrompt(gap, html) {
  var text = stripTags(html);
  var heads = headingsIn(html);
  var digest = text.length > 7000
    ? text.slice(0, 3500) + '\n[...]\n' + text.slice(-3500)
    : text;
  return [
    'You are a senior ' + gap.examName + ' ' + gap.modName + ' examiner.',
    'Lesson: "' + gap.lesson.title + '".',
    'Sections: ' + (heads.length ? heads.join('; ') : gap.lesson.topics) + '.',
    '',
    'Lesson text (use only facts stated here; do not invent statistics or quotations):',
    digest,
    '',
    examQuestionRules(gap)
  ].join('\n');
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
      '-sS', '--max-time', String(CALL_CAP_MIN * 60), '-w', '\\n%{http_code}',
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

function callModel(prompt, numPredict, timeoutMs, temp) { // timeoutMs kept for callers; the watchdogs own the time policy
  var payload = JSON.stringify({
    model: MODEL,
    stream: true,
    think: false,
    options: { temperature: temp == null ? 0.4 : temp, top_p: 0.9, num_predict: numPredict || 3400 },
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

var ALLOWED_TAGS = {
  h2: 1, h3: 1, h4: 1, p: 1, ul: 1, ol: 1, li: 1, strong: 1, em: 1, br: 1,
  div: 1, span: 1, sup: 1, sub: 1,
  table: 1, caption: 1, thead: 1, tbody: 1, tr: 1, th: 1, td: 1
};
var ALLOWED_CLASSES = { 'example-box': 1, 'ex-title': 1, 'ex-text': 1, 'ex-soln': 1, 'tip-box': 1, 'tip-title': 1, 'tip-text': 1 };

// The old fixed template produced these headings in every lesson: "Common
// Traps" appeared in 90 lessons and "Memory Tricks" in 60, so the corpus read as
// one template filled in 356 times. A new lesson may not reach for them again.
// Thresholds are calibrated on the two pages that bracket the quality range:
// upsc/course/gs/lesson-indian-polity.html (44,485 words, 2.4 marks per 100
// words, 20 h2, 33 tables) versus
// upsc/course/opt-sanskrit/lesson-overview.html (1,580 words, 5.4 marks per 100
// words, 0 h2, 0 tables).
var TEMPLATE_HEADINGS = [
  'common traps', 'common traps & how to avoid', 'common traps and how to avoid',
  'memory tricks', 'exam day checklist', 'quick formulas', 'quick formulas/shortcuts',
  'exam pattern', 'standard sources', 'periods at a glance', 'key concepts',
  'advanced section'
];
var NOTE_DENSITY_MAX = 4.2;   // good prose 2.4, template notes 5.4

function headingList(html) {
  var out = [];
  var re = /<h3\b[^>]*>([\s\S]*?)<\/h3>/gi;
  var m;
  while ((m = re.exec(html))) out.push(stripTags(m[1]).toLowerCase().trim());
  return out;
}

// Marks per 100 words. Textbook prose runs 1-4 colons/semicolons; the note-form
// the old prompt asked for runs far higher ("Term: x; Term: y; Term: z").
function punctuationDensity(text) {
  var words = String(text).split(/\s+/).filter(function (w) { return w.length > 1; }).length;
  if (words < 40) return 0;
  return ((String(text).match(/[:;]/g) || []).length / words) * 100;
}

function validateHtml(html, opts) {
  opts = opts || {};
  var minH3 = opts.minH3 || 3;
  if (!html || html.length < 2500) return 'too short (' + (html ? html.length : 0) + ' chars)';
  if (html.length > 60000) return 'too long (' + html.length + ' chars)';
  // Tag-aware checks: a text line such as "one = 1" is not an event handler.
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
      if (!ALLOWED_CLASSES[cls[ci]]) return 'class "' + cls[ci] + '" not allowed';
    }
  }

  var pairs = [['p', '<p\\b', '</p>'], ['div', '<div\\b', '</div>'], ['ul', '<ul\\b', '</ul>'],
    ['ol', '<ol\\b', '</ol>'], ['li', '<li\\b', '</li>'],
    ['h2', '<h2\\b', '</h2>'], ['h3', '<h3\\b', '</h3>'],
    ['h4', '<h4\\b', '</h4>'], ['strong', '<strong\\b', '</strong>'],
    ['em', '<em\\b', '</em>'], ['span', '<span\\b', '</span>'],
    ['sup', '<sup\\b', '</sup>'], ['sub', '<sub\\b', '</sub>'],
    ['table', '<table\\b', '</table>'], ['caption', '<caption\\b', '</caption>'],
    ['thead', '<thead\\b', '</thead>'], ['tbody', '<tbody\\b', '</tbody>'],
    ['tr', '<tr\\b', '</tr>'], ['th', '<th\\b', '</th>'], ['td', '<td\\b', '</td>']];
  for (var i = 0; i < pairs.length; i++) {
    var opens = (html.match(new RegExp(pairs[i][1], 'g')) || []).length;
    var closes = (html.match(new RegExp(pairs[i][2], 'g')) || []).length;
    if (opens !== closes) return 'unbalanced <' + pairs[i][0] + '> (' + opens + '/' + closes + ')';
  }

  var h3s = (html.match(/<h3\b/g) || []).length;
  if (h3s < minH3) return 'needs at least ' + minH3 + ' <h3> sections (found ' + h3s + ')';
  if ((html.match(/<p\b/g) || []).length < 5) return 'needs at least 5 <p> paragraphs';
  if (html.indexOf('class="example-box"') === -1) return 'needs an example-box';
  if (html.indexOf('class="tip-box"') === -1) return 'needs a tip-box';

  // Quality floor for a whole lesson. Without it a 900-word note dump with three
  // thin sections passed every structural check, which is how the corpus ended
  // up at a 902-word average against 58,278 for the hand-built lessons.
  // The reference page (lesson-indian-polity.html) has 44,485 words, 20 <h2>
  // groups, 99 <h3> sub-sections and 33 tables.
  if (opts.fullLesson) {
    var text = stripTags(html);
    var wc = text.split(/\s+/).filter(function (w) { return w.length > 1; }).length;
    if (wc < (opts.minWords || 2000)) return 'too thin for a full lesson (' + wc + ' words)';
    var heads = headingList(html);
    var banned = heads.filter(function (h) {
      return TEMPLATE_HEADINGS.indexOf(h) !== -1 || h.indexOf('advanced section') === 0;
    });
    if (banned.length) return 'template heading reused ("' + banned[0] + '") -- give this lesson its own section titles';
    var density = punctuationDensity(text);
    if (density > NOTE_DENSITY_MAX) return 'note-form, not prose (' + density.toFixed(1) + ' colons/semicolons per 100 words)';
    if (!/<table\b/i.test(html)) return 'needs at least one <table> comparison';
    // Two-level outline. The reference lesson groups 99 sub-sections under 20
    // <h2> topics, which is what makes it navigable; a flat run of <h3> is what
    // made the generated pages unreadable. <h2> was not even an allowed tag.
    var h2s = (html.match(/<h2\b/g) || []).length;
    if (h2s < 3) return 'needs a two-level outline: at least 3 <h2> topic groups (found ' + h2s + ')';
    if (h3s < 6) return 'needs at least 6 <h3> sub-sections under those groups (found ' + h3s + ')';
  }
  return null;
}

function normalizeQuestions(arr) {
  if (!Array.isArray(arr)) return [];
  var keep = [];
  arr.forEach(function (q) {
    if (!q || typeof q.text !== 'string') return;
    var text = q.text.trim();
    if (text.length < 15 || text.length > 500) return;
    if (!Array.isArray(q.options) || q.options.length !== 4) return;
    var opts = q.options.map(function (o) { return String(o == null ? '' : o).trim(); });
    for (var i = 0; i < 4; i++) if (!opts[i] || opts[i].length > 200) return;
    // Two identical options make the question a coin flip — the model's
    // "accomodation"/"accomodation" defect. Reject the whole question.
    // Only case, whitespace and dash style are normalised: "(x-3)", "x<2"
    // and "x>2" must stay distinct from their lookalikes.
    var seenOpt = {};
    for (var oi = 0; oi < 4; oi++) {
      var on = opts[oi].toLowerCase()
        .replace(/−|–|—/g, '-')
        .replace(/\s+/g, '');
      if (seenOpt[on]) return;
      seenOpt[on] = 1;
    }
    var correct = parseInt(q.correct, 10);
    if (!(correct >= 0 && correct <= 3)) return;
    var sol = String(q.sol || '').trim();
    if (sol.length < 30 || sol.length > 1200) return;
    if (/all of the above|none of the above|cannot be determined/i.test(text + ' ' + opts.join(' '))) return;
    keep.push({ text: text, options: opts, correct: correct, sol: sol });
  });
  return keep;
}

function parseQuestions(raw) {
  var s = String(raw || '').replace(/```(?:json)?/gi, '').trim();
  var i = s.indexOf('[');
  var j = s.lastIndexOf(']');
  if (i === -1 || j <= i) return [];
  var arr;
  try {
    arr = JSON.parse(s.slice(i, j + 1));
  } catch (e) {
    // A truncated or chatty reply can still contain one complete array.
    var start = s.indexOf('[{');
    if (start === -1) return [];
    var depth = 0, inStr = false, esc = false;
    for (var k = start; k < s.length; k++) {
      var ch = s[k];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
      } else if (ch === '"') {
        inStr = true;
      } else if (ch === '[') {
        depth++;
      } else if (ch === ']') {
        depth--;
        if (depth === 0) {
          try { arr = JSON.parse(s.slice(start, k + 1)); } catch (e2) { return []; }
          break;
        }
      }
    }
    if (!arr) return [];
  }
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

// How much of the new section is already present in the old lesson. Using the
// larger vocabulary as the denominator (instead of min) avoids punishing a
// genuinely new section for sharing topic words with the lesson it extends.
function overlapMax(a, b) {
  var A = wordSet(a), B = wordSet(b);
  var ka = Object.keys(A), kb = Object.keys(B);
  if (!ka.length || !kb.length) return 0;
  var inter = 0;
  ka.forEach(function (w) { if (B[w]) inter++; });
  return inter / Math.max(ka.length, kb.length);
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

function isStructuralReject(msg) {
  return /^html rejected: (needs at least|needs an example-box|needs a tip-box|too short|too thin for a full lesson|template heading reused|note-form, not prose|needs at least one <table>)/.test(msg);
}

function generateQuestions(gap, html, timeoutMs) {
  var prompt = questionsPrompt(gap, html);
  function attempt(extra, n) {
    return callModel(prompt + (extra || ''), 2600, timeoutMs, 0.25).then(function (raw) {
      var rawQs = parseQuestions(raw);
      var qs = filterFresh(rawQs, gap.mk);
      console.log('expand: ' + gap.key + ' questions raw ' + rawQs.length + ', kept ' + qs.length + (n > 1 ? ' (retry)' : ''));
      if (qs.length >= 3 || n >= 2) return qs;
      return attempt('\n\nYour previous reply had only ' + qs.length + ' valid question(s). Return exactly 5 valid questions as a JSON array.', n + 1);
    });
  }
  return attempt('', 1);
}

function generateOne(gap, timeoutMs) {
  var isDepth = gap.role === 'deepen' || gap.role === 'deepen-page';
  var prompt = isDepth ? deepenPrompt(gap) : theoryPrompt(gap);
  var source = '';
  if (gap.role === 'deepen') source = String(courseData[gap.key] || '');
  else if (gap.role === 'deepen-page') source = pageSource(gap);

  function attempt(extra, n) {
    return callModel(prompt + (extra || ''), isDepth ? 8000 : 8000, timeoutMs).then(function (raw) {
      var html = raw;
      var qi = raw.indexOf('===QUESTIONS===');
      if (qi !== -1) html = raw.slice(0, qi);
      html = html.replace(/^\s*```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
      // Close missing tags and drop attributes the validator would reject. The
      // model's prose is kept; only malformed markup is repaired.
      html = htmlRepair.sanitize(html);
      // A reply that hit the token limit is structurally balanced by sanitize
      // but can still end mid-sentence. Keep the complete prose and drop only
      // the unfinished tail before the validator sees it.
      var trimmed = htmlRepair.trimIncompleteTail(html);
      if (trimmed.trimmed) {
        console.log('expand: ' + gap.key + ' trimmed an incomplete final sentence (' + trimmed.removed + ' chars)');
        html = trimmed.html;
      }
      var err = validateHtml(html, {
        minH3: isDepth ? 2 : 3,
        fullLesson: !isDepth,
        minWords: isDepth ? 0 : 1500
      });
      if (err) {
        var e = new Error('html rejected: ' + err);
        if (n < 2 && isStructuralReject(e.message)) {
          console.log('expand: ' + gap.key + ' structural reject (' + err + '); retrying once');
          return attempt('\n\nYour previous reply was rejected by the validator: ' + err + '. Return the COMPLETE corrected HTML fragment again. Keep every valid section and fix the structure.', n + 1);
        }
        throw e;
      }
      if (gap.role === 'enrich' && html.length < gap.oldLen + 1500) {
        throw new Error('not a real expansion (' + html.length + ' vs ' + gap.oldLen + ' chars)');
      }
      if (isDepth) {
        if (html.length < 3000) throw new Error('depth section too short (' + html.length + ' chars)');
        var old = {};
        headingsIn(source).forEach(function (h) { old[h.toLowerCase()] = 1; });
        var repeated = headingsIn(html).filter(function (h) { return old[h.toLowerCase()]; });
        if (repeated.length) throw new Error('repeats existing section(s): ' + repeated.slice(0, 2).join('; '));
        // A new section on the same topic shares vocabulary with the lesson it
        // extends (successful addons sit at 0.21-0.31 containment). Only a
        // section that is mostly copied from the existing lesson is rejected.
        if (source && overlapMax(stripTags(html), stripTags(source)) >= 0.7) {
          throw new Error('deep section overlaps the existing lesson too closely');
        }
      }
      if (gap.role === 'deepen-page') {
        // Hand-built pages have no practice block; their addon is injected
        // into static HTML. Do not spend tokens on MCQs no page renders.
        return { html: html, questions: [] };
      }
      return generateQuestions(gap, html, timeoutMs).then(function (qs) {
        return { html: html, questions: qs };
      });
    });
  }
  return attempt('', 1);
}

function saveJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function writeTouched(keys, files, exams) {
  // The cleaner may have recorded addon keys before this run started; keep
  // them so their pages regenerate in the same commit.
  var prev = {};
  try { prev = JSON.parse(fs.readFileSync(TOUCHED_FILE, 'utf8')); } catch (e) { prev = {}; }
  var uniq = function (a, b) { return Array.from(new Set([].concat(a || [], b || []))); };
  fs.writeFileSync(TOUCHED_FILE, JSON.stringify({
    keys: uniq(prev.keys, keys),
    files: uniq(prev.files, files),
    exams: uniq(prev.exams, exams)
  }), 'utf8');
}

// ---- main ------------------------------------------------------------------

async function main() {
  var fills = collectGaps();
  var thins = THIN > 0 ? collectThins() : [];
  // Hubs first, then fair-share the hand and generated depth lanes. The hubs
  // are the pages readers land on, so they must not wait behind a generated
  // lesson in the interleave.
  var handPages = DEEPEN ? collectHandPages() : [];
  var hubs = handPages.filter(function (g) { return g.priority === 0; });
  var handRest = handPages.filter(function (g) { return g.priority !== 0; });
  var deeps = DEEPEN ? hubs.concat(interleave(handRest, collectDeepen())) : [];
  if (Object.keys(ONLY_KEYS).length) {
    fills = fills.filter(function (g) { return onlyAllowed(g.key); });
    thins = thins.filter(function (g) { return onlyAllowed(g.key); });
    deeps = deeps.filter(function (g) { return onlyAllowed(g.key); });
  }
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
    console.log('  [' + (g.role === 'deepen-page' ? 'depth-page' : 'depth') + '] ' + g.key +
      '  (pass ' + (g.passes + 1) + '/' + DEPTH_PASS_MAX +
      (g.targetWords ? ', ' + g.words + '/' + g.targetWords + ' words, ' + g.deficit + ' to go' : ', ' + g.oldLen + ' chars') + ')');
  });
  if (deeps.length > 10) console.log('  ... and ' + (deeps.length - 10) + ' more depth candidate(s)');

  if (DRY || (!fills.length && !thins.length && !deeps.length)) {
    writeTouched([], [], []);
    console.log(DRY ? 'EXPAND_DRY: listing only, nothing generated or written.' : 'Nothing to fill.');
    return;
  }

  // Fill and depth must share every run. When all empty slots go first, a
  // scheduled run spends its whole deadline filling and the depth lane never
  // starts (observed: 12 fills, 0 depth pages). Alternate depth and fill so the
  // hub pages (priority 0) land in the first run and the Mains slots still fill
  // at the same time. Once the fill queue is empty the rest is depth only.
  var fillQueue = fills.concat(thins);
  var queue = [];
  var fi = 0, di = 0;
  while (fi < fillQueue.length || di < deeps.length) {
    if (di < deeps.length) queue.push(deeps[di++]);
    if (fi < fillQueue.length) queue.push(fillQueue[fi++]);
  }

  var deadline = Date.now() + DEADLINE_MIN * 60000;
  runDeadlineAt = deadline;
  // Process-level kill switch: if the runner is wedged and the watchdogs
  // somehow don't fire, force exit so GitHub Actions doesn't hang for hours.
  setTimeout(function () {
    console.log('expand-course: process-level deadline hit — forcing exit');
    try { writeTouched(addedKeys, addedFiles, Object.keys(touchedExams)); } catch (e) { /* nothing */ }
    process.exit(1);
  }, DEADLINE_MIN * 60000 + 60000).unref();
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
        (gap.users || []).forEach(function (u) { touchedExams[u.examKey] = 1; });
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
        saveJson(ADDONS_FILE, addons);
      } else {
        courseData[gap.key] = res.html;
        if (res.questions.length >= 3) coursePractice[gap.key] = toPractice(res.questions);
        saveJson(DATA_FILE, courseData);
        saveJson(PRACTICE_FILE, coursePractice);
        (gap.users || []).forEach(function (u) { touchedExams[u.examKey] = 1; });
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
      var qNote = gap.role === 'deepen-page'
        ? 'hand-built page, no practice appended'
        : res.questions.length + ' validated MCQs';
      console.log('[' + gap.examName + '] ' + gap.key + verb +
        '(' + res.html.length + ' chars, ' + qNote + ')');
    } catch (e) {
      console.log('[' + gap.examName + '] ' + gap.key + ' skipped: ' + e.message);
    }
  }

  writeTouched(addedKeys, addedFiles, Object.keys(touchedExams));
  console.log('EXPAND-RESULT {"added":' + added + ',"keys":' + JSON.stringify(addedKeys) + '}');
}

if (require.main === module) {
  main().catch(function (e) {
    console.error('expand-course failed: ' + (e && e.stack || e));
    // A failed run must not leave a touched-file a workflow would act on.
    try { writeTouched([], [], []); } catch (e2) { /* nothing */ }
    process.exit(1);
  });
}

// Exported for scripts/test-expand-course.js so the validator and question
// parser have a regression test that does not need Ollama.
module.exports = {
  validateHtml: validateHtml,
  normalizeQuestions: normalizeQuestions,
  parseQuestions: parseQuestions,
  filterFresh: filterFresh,
  overlap: overlap,
  overlapMax: overlapMax,
  theoryPrompt: theoryPrompt,
  deepenPrompt: deepenPrompt,
  questionsPrompt: questionsPrompt
};
