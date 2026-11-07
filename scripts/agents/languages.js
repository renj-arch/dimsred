// Languages — the course-writing agent.
//
// The eight language courses are hand-built beginner paths. They end at
// "next steps" and never grow. This agent adds ONE new lesson per run:
//
//   - round-robin across the eight pages (least-covered language first)
//   - topic pool per language, skipping topics already written
//   - the model writes only the lesson BODY; the plugin supplies the page
//     shell, navigation and the "agent-written, verify" disclosure
//   - output is validated hard (tag whitelist, no scripts/handlers/links,
//     word-count floor) before anything is written
//   - data/language-lessons.json is the idempotency ledger and the source
//     for languages/lessons/index.html, which is regenerated each run
//
// A failed generation is a logged lesson, not damage: nothing is written
// unless every check passes.
'use strict';

const fs = require('fs');
const path = require('path');

const LEDGER = 'data/language-lessons.json';
const LESSON_DIR = 'languages/lessons';

const LANGS = [
  { key: 'korean', name: 'Korean', native: '한국어', page: 'languages/korean.html' },
  { key: 'japanese', name: 'Japanese', native: '日本語', page: 'languages/japanese.html' },
  { key: 'chinese', name: 'Chinese', native: '中文', page: 'languages/chinese.html' },
  { key: 'arabic', name: 'Arabic', native: 'العربية', page: 'languages/arabic.html' },
  { key: 'slavic', name: 'Russian & Slavic', native: 'Русский', page: 'languages/slavic.html' },
  { key: 'icelandic', name: 'Icelandic', native: 'Íslenska', page: 'languages/icelandic.html' },
  { key: 'uralic', name: 'Hungarian, Finnish & Estonian', native: 'Magyar · Suomi · Eesti', page: 'languages/uralic.html' },
  { key: 'navajo', name: 'Navajo', native: "Diné bizaad", page: 'languages/navajo.html' }
];

const TOPICS = [
  ['script', 'the writing system: how the letters/blocks work and how to read a first word'],
  ['sounds', 'pronunciation and the sound rules a beginner must hear correctly'],
  ['word-order', 'basic word order and how a simple sentence is built'],
  ['questions', 'forming questions (yes/no and wh-questions) with three worked examples'],
  ['negation', 'saying no: negation particles/forms and common mistakes'],
  ['numbers', 'numbers, counting and counters/measure words in everyday use'],
  ['time-date', 'telling the time and talking about days, dates and schedules'],
  ['family', 'family and people: the words and the polite way to introduce them'],
  ['food', 'food and drink: ordering, preferences and dietary needs'],
  ['directions', 'directions and transport: asking, understanding and giving a route'],
  ['shopping', 'shopping and money: prices, quantities and polite bargaining'],
  ['health', 'health and emergencies: symptoms, pharmacy and asking for help'],
  ['weather', 'weather and seasons: describing the day and planning around it'],
  ['routine', 'a daily routine narrated in the present tense'],
  ['politeness', 'politeness levels/register and when each one is required'],
  ['connectors', 'joining ideas: because, but, so, and, after, before'],
  ['mistakes', 'the five mistakes English speakers make most often in this language'],
  ['reading', 'a short graded reading passage with vocabulary and comprehension questions']
];

function load(ctx) {
  const j = ctx.loadJson(LEDGER, null);
  if (j && Array.isArray(j.lessons)) return j;
  return { lessons: [] };
}

function save(ctx, j) {
  j.lessons = j.lessons.slice(-400);
  ctx.saveJson(LEDGER, j);
}

function pick(ledger) {
  const counts = {};
  const topics = {};
  ledger.lessons.forEach(function (l) {
    counts[l.lang] = (counts[l.lang] || 0) + 1;
    topics[l.lang + '/' + l.topic] = 1;
  });
  let best = null;
  for (const lang of LANGS) {
    const n = counts[lang.key] || 0;
    if (!best || n < best.n) best = { lang: lang, n: n };
  }
  const lang = best.lang;
  for (const t of TOPICS) {
    if (!topics[lang.key + '/' + t[0]]) return { lang: lang, topic: t[0], brief: t[1] };
  }
  // Pool exhausted for the least-covered language: move to the next one with
  // an unused topic rather than stopping the whole capability.
  for (const l of LANGS) {
    for (const t of TOPICS) {
      if (!topics[l.key + '/' + t[0]]) return { lang: l, topic: t[0], brief: t[1] };
    }
  }
  return null;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function validate(html) {
  if (!html || html.length < 700) return 'too short';
  if (/<\s*(script|style|iframe|object|embed|form|input|link|meta)\b/i.test(html)) return 'forbidden tag';
  if (/\son[a-z]+\s*=/i.test(html)) return 'event handler';
  if (/javascript\s*:/i.test(html)) return 'javascript url';
  if (/https?:\/\//i.test(html)) return 'external url';
  const allowed = /^<\/?(h3|h4|p|ul|ol|li|strong|em|b|i|code|table|thead|tbody|tr|th|td|blockquote|br)\s*\/?>$/i;
  const tags = html.match(/<[^>]+>/g) || [];
  for (const tag of tags) {
    if (!allowed.test(tag.trim())) return 'tag not allowed: ' + tag.slice(0, 40);
  }
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text.split(' ').filter(Boolean).length;
  if (words < 220) return 'too few words (' + words + ')';
  if (words > 900) return 'too many words (' + words + ')';
  if ((html.match(/<h3/gi) || []).length < 2) return 'needs at least two h3 sections';
  return null;
}

function promptFor(pick) {
  return [
    'You are a careful language teacher writing ONE printable lesson for a free study site.',
    'Language: ' + pick.lang.name + ' (' + pick.lang.native + ').',
    'Lesson topic: ' + pick.topic + ' — ' + pick.brief + '.',
    '',
    'Write the lesson BODY only, as raw HTML. Rules:',
    '- Use only these tags: h3, h4, p, ul, ol, li, strong, em, code, table, thead, tbody, tr, th, td, blockquote, br.',
    '- Start with three or four <h3> sections (for example: the core rule, a table or pattern, worked examples, practice).',
    '- 300-550 words of English explanation. Every foreign-language example must carry a romanisation and an English gloss.',
    '- Accuracy over volume. If you are not certain of a form, use a simpler certain example. Never invent a rule.',
    '- No links, images, scripts, styles, inline event handlers, or claims about exams.',
    '- End with a short <h3>Practice</h3> list of 4-6 exercises whose answers are given in a final <p>.',
    '',
    'Reply with the HTML only. No markdown fences and no commentary.'
  ].join('\n');
}

function clean(text) {
  let s = String(text || '').trim();
  s = s.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = s.search(/<h3/i);
  if (start > 0) s = s.slice(start);
  return s.trim();
}

function lessonPage(lang, topic, title, body, date) {
  const other = LANGS.filter(function (l) { return l.key !== lang.key; }).slice(0, 5)
    .map(function (l) { return '<a href="../' + l.key + '.html">' + esc(l.name) + '</a>'; }).join(' · ');
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<title>' + esc(title) + ' — vlymbooq Languages</title>\n' +
    '<meta name="description" content="' + esc(lang.name + ' lesson: ' + topic + '. Agent-written study lesson with examples, romanisation and practice.') + '">\n' +
    '<link rel="icon" type="image/svg+xml" href="../../favicon.svg">\n' +
    '<style>:root{--bg:#09090b;--card:#12121c;--border:rgba(255,255,255,.08);--purple:#a78bfa;--emerald:#34d399;--amber:#f59e0b;--text:#fafafa;--text-sec:#a1a1aa;--muted:#52525b}*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--text);font:15px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}.nav{position:sticky;top:0;background:rgba(9,9,11,.88);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:12px 20px}.nav a{color:var(--text-sec);text-decoration:none;font-size:.82em;font-weight:600;margin-right:14px}.nav a:hover{color:var(--text)}.wrap{max-width:760px;margin:0 auto;padding:30px 20px 70px}.kicker{font-size:.72em;letter-spacing:.08em;text-transform:uppercase;color:var(--purple);font-weight:700}.h1{font-size:clamp(1.5rem,4vw,2rem);font-weight:900;letter-spacing:-.02em;margin:6px 0 4px}.note{font-size:.78em;color:var(--muted);border-left:2px solid var(--amber);padding-left:10px;margin:16px 0 24px}.body h3{font-size:1.08em;font-weight:800;margin:26px 0 8px;color:var(--text)}.body h4{font-size:.95em;font-weight:700;margin:18px 0 6px}.body p{margin:8px 0;color:var(--text-sec)}.body ul,.body ol{margin:8px 0 8px 22px;color:var(--text-sec)}.body li{margin:4px 0}.body strong{color:var(--text)}.body code{background:rgba(255,255,255,.06);padding:1px 5px;border-radius:4px;font-size:.9em}.body table{width:100%;border-collapse:collapse;margin:12px 0;font-size:.88em}.body th,.body td{border:1px solid var(--border);padding:7px 9px;text-align:left;color:var(--text-sec)}.body th{color:var(--text);background:rgba(255,255,255,.03)}.body blockquote{border-left:3px solid var(--purple);padding:4px 12px;margin:12px 0;color:var(--text-sec)}.pager{margin-top:34px;padding-top:16px;border-top:1px solid var(--border);font-size:.8em;color:var(--muted)}.pager a{color:var(--purple);text-decoration:none}</style>\n' +
    '</head>\n<body>\n<nav class="nav"><a href="../../languages.html">🌍 Languages</a><a href="../index.html">Course hub</a><a href="index.html">Lesson library</a></nav>\n' +
    '<main class="wrap">\n<div class="kicker">' + esc(lang.name) + ' · ' + esc(topic) + '</div>\n' +
    '<h1 class="h1">' + esc(title) + '</h1>\n' +
    '<div class="note">Agent-written lesson · generated ' + esc(date) + ' · verify every form before memorising it. The hand-built course remains the primary path.</div>\n' +
    '<article class="body">\n' + body + '\n</article>\n' +
    '<div class="pager">Continue: ' + other + ' · <a href="../' + lang.key + '.html">back to the ' + esc(lang.name) + ' course</a></div>\n' +
    '</main>\n</body>\n</html>\n';
}

function libraryPage(ledger) {
  const byLang = {};
  ledger.lessons.forEach(function (l) { (byLang[l.lang] = byLang[l.lang] || []).push(l); });
  let sections = '';
  for (const lang of LANGS) {
    const items = byLang[lang.key] || [];
    if (!items.length) continue;
    sections += '<h2>' + esc(lang.name) + ' <span>' + esc(lang.native) + '</span></h2><div class="grid">' +
      items.map(function (l) {
        return '<a class="card" href="' + esc(l.file) + '"><strong>' + esc(l.title) + '</strong><span>' + esc(l.topic) + ' · ' + esc(l.date) + '</span></a>';
      }).join('') + '</div>';
  }
  if (!sections) sections = '<p class="empty">No agent lessons yet. The next site-agent run writes the first one.</p>';
  return '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Language lesson library — vlymbooq</title><link rel="icon" type="image/svg+xml" href="../../favicon.svg">' +
    '<style>:root{--bg:#09090b;--card:#12121c;--border:rgba(255,255,255,.08);--purple:#a78bfa;--text:#fafafa;--sec:#a1a1aa;--muted:#52525b}*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--text);font:15px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}.nav{padding:12px 20px;border-bottom:1px solid var(--border)}.nav a{color:var(--sec);text-decoration:none;font-size:.82em;font-weight:600;margin-right:14px}.wrap{max-width:980px;margin:0 auto;padding:28px 20px 70px}h1{font-size:1.7rem;font-weight:900;letter-spacing:-.02em}h1+p{color:var(--sec);font-size:.88em;margin-top:6px}h2{font-size:1em;font-weight:800;margin:28px 0 10px}h2 span{color:var(--muted);font-weight:500;font-size:.8em}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}.card{display:flex;flex-direction:column;gap:4px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-decoration:none;color:inherit}.card:hover{border-color:rgba(255,255,255,.18)}.card strong{font-size:.9em}.card span{font-size:.72em;color:var(--muted)}.empty{color:var(--sec)}.note{margin-top:26px;font-size:.78em;color:var(--muted)}</style></head><body>' +
    '<nav class="nav"><a href="../../languages.html">🌍 Languages</a><a href="../index.html">Course hub</a></nav>' +
    '<main class="wrap"><h1>Language lesson library</h1><p>Extra lessons written one at a time by the site agent. Each one is validated for structure, clearly marked agent-written, and added to its course.</p>' +
    sections + '<p class="note">Generated from data/language-lessons.json · the hand-built course pages remain the primary path.</p></main></body></html>\n';
}

module.exports = {
  name: 'Languages',
  kind: 'rotate',
  run: async function (ctx) {
    const fixes = [];
    const ledger = load(ctx);
    const pickOne = pick(ledger);
    if (!pickOne) {
      return { agent: 'languages', fixes: [{ kind: 'info', page: 'languages/index.html', fix: 'All lesson topics are already written' }] };
    }
    const lessonsToday = ledger.lessons.filter(function (l) {
      return l.date === new Date().toISOString().slice(0, 10);
    }).length;
    if (lessonsToday >= 2) {
      return { agent: 'languages', fixes: [{ kind: 'info', page: 'languages/index.html', fix: 'Daily lesson cap reached (' + lessonsToday + ')' }] };
    }

    let raw;
    try {
      raw = await ctx.callLLM(
        'You write accurate, conservative language lessons. You never invent grammar or vocabulary.',
        promptFor(pickOne), 2200);
    } catch (e) {
      return { agent: 'languages', fixes: [{ kind: 'fix', page: 'languages/index.html', fix: 'Lesson generation failed: ' + String(e.message || e).slice(0, 120) }] };
    }
    const body = clean(raw);
    const err = validate(body);
    if (err) {
      return { agent: 'languages', fixes: [{ kind: 'fix', page: 'languages/index.html', fix: 'Lesson rejected (' + err + ') for ' + pickOne.lang.key + '/' + pickOne.topic }] };
    }

    const date = new Date().toISOString().slice(0, 10);
    const title = pickOne.lang.name + ': ' + pickOne.topic;
    const rel = pickOne.lang.key + '-' + pickOne.topic + '.html';
    const file = LESSON_DIR + '/' + rel;
    fs.mkdirSync(path.join(ctx.root, LESSON_DIR), { recursive: true });
    fs.writeFileSync(path.join(ctx.root, file), lessonPage(pickOne.lang, pickOne.topic, title, body, date));

    ledger.lessons.push({ lang: pickOne.lang.key, topic: pickOne.topic, title: title, file: rel, date: date });
    save(ctx, ledger);
    fs.writeFileSync(path.join(ctx.root, LESSON_DIR, 'index.html'), libraryPage(ledger));

    fixes.push({ kind: 'feature', page: file, fix: 'Wrote ' + title + ' (' + body.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length + ' words)' });
    return { agent: 'languages', fixes: fixes };
  }
};
