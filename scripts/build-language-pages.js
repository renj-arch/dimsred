#!/usr/bin/env node
'use strict';
// Build the UPSC Mains Paper A language pack.
//
// Sources:
//   scripts/language-paper-a.json   metadata + the four low-resource samples
//   scripts/mains-language-content.json  generated lesson bodies for the
//                                        four mains-language course lessons
//
// Outputs:
//   upsc/mains/language/<slug>.html        one practice page per language
//   upsc/mains/language/index.html         the picker hub
//   upsc/mains/language/language-practice.js
//   scripts/mains-language-content.json    consumed by scripts/gen-course.js
//
// The script refuses to write anything if a sample fails the Unicode gate in
// scripts/lib/language-verify.js. It never claims that a model-generated
// passage is an official UPSC question.

var fs = require('fs');
var path = require('path');
var verify = require('./lib/language-verify');

var ROOT = path.join(__dirname, '..');
var DATA_FILE = path.join(__dirname, 'language-paper-a.json');
var CONTENT_FILE = path.join(__dirname, 'mains-language-content.json');
var OUT_DIR = path.join(ROOT, 'upsc', 'mains', 'language');
var SITE = 'https://vlymbooq.qzz.io';

var data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
var report = verify.validateLanguageData(data);
if (!report.ok) {
  console.error('language data failed validation:');
  report.errors.forEach(function (e) { console.error('  - ' + e); });
  process.exit(1);
}
report.warnings.forEach(function (w) { console.warn('warning: ' + w); });

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function langBySlug(slug) {
  return data.languages.filter(function (l) { return l.slug === slug; })[0];
}

function pickerCards(currentSlug, base) {
  return data.languages.map(function (lang) {
    var active = currentSlug === lang.slug;
    return '<a class="lang-card' + (active ? ' active' : '') + '" href="' + base + lang.slug + '.html"' +
      (active ? ' aria-current="page"' : '') + '>' +
      '<span class="lang-native" lang="' + esc(lang.code) + '" dir="' + esc(lang.direction) + '">' + esc(lang.native) + '</span>' +
      '<span class="lang-en">' + esc(lang.name) + '</span>' +
      '<span class="lang-script">' + esc(lang.script) + ' &middot; ' + esc(lang.unicode) + '</span>' +
      '</a>';
  }).join('\n');
}

function pickerStyle() {
  return [
    '<style>',
    '.lang-picker{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin:12px 0}',
    '.lang-card{display:block;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:#0c0c0f;text-decoration:none;color:#fafafa}',
    '.lang-card:hover{border-color:#a78bfa;background:rgba(167,139,250,.06);text-decoration:none}',
    '.lang-card.active{border-color:#34d399;background:rgba(52,211,153,.06)}',
    '.lang-card .lang-native{display:block;font-size:1.05em;font-weight:700;line-height:1.4}',
    '.lang-card .lang-en{display:block;font-size:.78em;color:#a1a1aa;margin-top:2px}',
    '.lang-card .lang-script{display:block;font-size:.7em;color:#71717a;margin-top:2px}',
    '</style>'
  ].join('\n');
}

function pageCss(font) {
  return [
    '<style>',
    '.native-title{font-family:"' + font.replace(/\+/g, ' ') + '",Inter,sans-serif}',
    '.passage-box{background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin:14px 0;font-size:17px;line-height:2;white-space:pre-wrap}',
    '.passage-box[dir="rtl"]{text-align:right}',
    '.practice-task{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px}',
    '.practice-task .t{font-weight:700;font-size:14px;margin-bottom:6px}',
    '.practice-task .d{font-size:13px;color:var(--text-sec);line-height:1.65}',
    '.practice-task ol,.practice-task ul{padding-left:18px;color:var(--text-sec);font-size:13px;line-height:1.7;margin-top:8px}',
    '.script-check textarea{width:100%;min-height:150px;resize:vertical;line-height:1.8;font-size:15px}',
    '.script-meter{margin-top:8px;font-size:12.5px;color:var(--text-muted);font-variant-numeric:tabular-nums}',
    '.script-meter.ok{color:var(--emerald);font-weight:700}',
    '.script-meter.warn{color:var(--amber);font-weight:700}',
    'details{margin-top:8px}',
    'details summary{cursor:pointer;color:var(--purple);font-size:13px;font-weight:600}',
    'details p{color:var(--text-sec);font-size:13px;line-height:1.7;margin-top:6px}',
    '.lang-picker{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin-top:12px}',
    '.lang-card{display:block;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--card2);text-decoration:none;color:var(--text)}',
    '.lang-card:hover{border-color:var(--purple);background:rgba(167,139,250,.06);text-decoration:none}',
    '.lang-card.active{border-color:var(--emerald);background:rgba(52,211,153,.06)}',
    '.lang-card .lang-native{display:block;font-size:1.05em;font-weight:700;line-height:1.4}',
    '.lang-card .lang-en{display:block;font-size:.78em;color:var(--text-sec);margin-top:2px}',
    '.lang-card .lang-script{display:block;font-size:.7em;color:var(--text-muted);margin-top:2px}',
    '</style>'
  ].join('\n');
}

function nav(active) {
  function link(href, label) {
    return '<a href="' + href + '"' + (active === label ? ' class="active"' : '') + '>' + label + '</a>';
  }
  return '<nav class="nav"><div class="nav-inner">' +
    '<a class="brand" href="../../../index.html"><img src="../../../logo.png" alt="">vlymbooq</a>' +
    '<div class="nav-links">' +
    link('../../index.html', 'UPSC') +
    link('../index.html', 'Mains') +
    link('../language.html', 'Language') +
    link('index.html', 'Paper A') +
    link('../../course/mains-language/lesson-paper-a-indian-language.html', 'Course lesson') +
    '</div></div></nav>';
}

function footer() {
  return '<footer class="site"><span>UPSC Mains pack &middot; Paper A language practice.</span>' +
    '<span><a href="../language.html">Language overview</a> &middot; ' +
    '<a href="../../course/mains-language/lesson-paper-a-indian-language.html">Course lesson</a> &middot; ' +
    '<a href="index.html">All languages</a></span></footer>';
}

function officialCards() {
  return data.officialLinks.map(function (link) {
    return '<a class="card" href="' + esc(link.url) + '" target="_blank" rel="noopener">' +
      '<div class="t">' + esc(link.label) + ' &#8599;</div>' +
      '<div class="d">' + esc(link.desc) + '</div></a>';
  }).join('\n');
}

function sampleSection(lang) {
  if (!lang.sample) {
    return '<section class="section">' +
      '<div class="section-head"><h2>Source a practice passage</h2><span class="pill">No model sample on this page</span></div>' +
      '<p class="section-sub">This page does not carry a model-generated passage for ' + esc(lang.name) + '. Use a 300&ndash;400 word editorial from a reputable ' + esc(lang.name) + ' newspaper, or download the official Paper A paper for your language from the UPSC index. Read it twice, then do the workbook below.</p>' +
      '<div class="note"><b>Why no sample?</b> A short model passage is not a substitute for a real editorial or an official paper. The workbook tasks work with any passage you source, and the script checker below still applies.</div>' +
      '</section>';
  }
  var s = lang.sample;
  var questions = s.questions.map(function (q, i) {
    return '<div class="practice-task" style="margin-top:10px"><div class="t">' + (i + 1) + '. ' + esc(q.q) + '</div>' +
      '<details><summary>Model answer</summary><p>' + esc(q.a) + '</p></details></div>';
  }).join('\n');
  return '<section class="section">' +
    '<div class="section-head"><h2>Model-generated practice passage</h2><span class="pill a">Not an official text</span></div>' +
    '<div class="warn"><b>Label.</b> This passage was generated by a language model for practice. It passed an automated ' + esc(lang.script) + ' script check, but it has not been reviewed by a native speaker. Do not treat it as an authoritative ' + esc(lang.name) + ' text or as an official UPSC question.</div>' +
    '<div class="passage-box" lang="' + esc(lang.code) + '" dir="' + esc(lang.direction) + '">' + esc(s.passage) + '</div>' +
    '<details><summary>English translation (model-generated)</summary><p>' + esc(s.english) + '</p></details>' +
    '<h3 style="margin-top:18px">Questions on the passage</h3>' + questions +
    '<p class="muted" style="margin-top:10px">Topic: ' + esc(s.topic) + '. Generated ' + esc(s.generatedAt) + ' with ' + esc(s.model) + '. Verification: ' + esc(s.verification) + '</p>' +
    '</section>';
}

function practiceWorkbook(lang) {
  var enParagraph = 'Reading a newspaper carefully is a skill that improves with practice. A reader who notices the main claim, the evidence and the tone can summarize an article in a few sentences. This habit helps in the examination because it saves time and prevents answers from becoming a list of disconnected points. It also builds vocabulary, which is useful in the translation section. Ten minutes a day is enough if the reading is active.';
  return '<section class="section">' +
    '<div class="section-head"><h2>Practice workbook</h2><span class="pill a">Original study prompts &middot; not PYQs</span></div>' +
    '<p class="section-sub">These are original tasks, not previous-year questions. Write your answers in ' + esc(lang.name) + '; use the script checker below before you ask for feedback.</p>' +
    '<div class="grid two">' +
    '<div class="practice-task"><div class="t">1. Comprehension</div><div class="d">Read a 300&ndash;400 word ' + esc(lang.name) + ' passage. Answer in ' + esc(lang.name) + ':</div><ol><li>What is the main claim?</li><li>What are the two strongest supporting reasons?</li><li>What does the writer want the reader to do?</li></ol><div class="d">Then close the passage and write a three-sentence summary.</div></div>' +
    '<div class="practice-task"><div class="t">2. Precis</div><div class="d">Write a precis of the same passage in about one-third of its length. Keep the claim, the reasons and the tone. Do not add your opinion. Check the script before you compare with the original.</div></div>' +
    '<div class="practice-task"><div class="t">3. Usage and vocabulary</div><div class="d">Choose ten words from the passage that you would not use in everyday speech. Write one ' + esc(lang.name) + ' sentence for each and note the English meaning. Then write one sentence using a common idiom from the passage.</div></div>' +
    '<div class="practice-task"><div class="t">4. Translate English &rarr; ' + esc(lang.name) + '</div><div class="d">Translate the paragraph below into ' + esc(lang.name) + '. Then translate your version back into English without looking at the original. Compare meaning, not word order.</div><div class="passage-box" lang="en" style="font-size:14px;line-height:1.8">' + esc(enParagraph) + '</div></div>' +
    '<div class="practice-task"><div class="t">5. Translate ' + esc(lang.name) + ' &rarr; English</div><div class="d">Take the first paragraph of your passage. Translate it into English. Underline the phrases that had no direct equivalent. Rewrite those phrases in plain English.</div></div>' +
    '<div class="practice-task"><div class="t">6. Short essay</div><div class="d">Write 250 words in ' + esc(lang.name) + ' on one of these topics: the value of public libraries; why local languages matter in a democracy; how a city can protect its trees. Use a beginning, two developed points and a close.</div></div>' +
    '</div></section>';
}

function scriptChecker(lang) {
  return '<section class="section" id="script-check">' +
    '<div class="section-head"><h2>Script checker</h2><span class="pill">' + esc(lang.script) + '</span></div>' +
    '<p class="section-sub">Paste your answer. The checker counts visible characters in the ' + esc(lang.script) + ' Unicode ranges and flags Latin letters. It does not check grammar or meaning.</p>' +
    '<div class="script-check" data-script-check data-ranges="' + esc(JSON.stringify(lang.ranges)) + '" data-script-name="' + esc(lang.script) + '" data-dir="' + esc(lang.direction) + '">' +
    '<textarea id="script-input" lang="' + esc(lang.code) + '" dir="' + esc(lang.direction) + '" placeholder="Paste your ' + esc(lang.name) + ' answer here..."></textarea>' +
    '<div class="script-meter" data-script-output>Paste or type an answer to check its script.</div>' +
    '<div class="row" style="margin-top:8px"><button class="btn ghost" type="button" data-script-clear>Clear</button><span class="muted">Nothing is sent anywhere.</span></div>' +
    '</div></section>';
}

function sourcesSection(lang) {
  return '<section class="section">' +
    '<div class="section-head"><h2>Official sources and labelling</h2><span class="pill a">Read this</span></div>' +
    '<div class="warn"><b>Not an official paper.</b> The practice tasks on this page are original study prompts, not UPSC previous-year questions. ' +
    (lang.sample ? 'The sample passage is model-generated and script-checked; it is not an official text. ' : '') +
    'This site does not invent official questions or answer keys.</div>' +
    '<div class="grid two" style="margin-top:12px">' + officialCards() + '</div>' +
    '<p class="muted" style="margin-top:10px">Page generated ' + esc(data.meta.generatedAt) + '. Pattern checked against the UPSC Civil Services Examination syllabus. Confirm the language and script in the current UPSC notification.</p>' +
    '</section>';
}

function languagePage(lang) {
  var font = lang.font;
  var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<title>' + esc(lang.name) + ' Paper A Practice &mdash; UPSC Mains Indian Language | vlymbooq</title>\n' +
    '<meta name="description" content="UPSC Mains Paper A practice for ' + esc(lang.name) + ' (' + esc(lang.script) + '). Script checker, comprehension, precis, translation and essay tasks. Practice prompts are not official UPSC questions.">\n' +
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n' +
    '<link rel="canonical" href="' + SITE + '/upsc/mains/language/' + esc(lang.slug) + '">\n' +
    '<link rel="stylesheet" href="../mains.css">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=' + esc(font) + '&display=swap" rel="stylesheet">\n' +
    pageCss(lang.font) + '\n' +
    '</head>\n<body data-language-slug="' + esc(lang.slug) + '">\n' +
    nav('Paper A') + '\n' +
    '<div class="wrap">\n' +
    '<section class="hero">' +
    '<div class="kicker">UPSC Mains &middot; Paper A &middot; ' + esc(lang.name) + '</div>' +
    '<h1><span class="native-title" lang="' + esc(lang.code) + '" dir="' + esc(lang.direction) + '">' + esc(lang.native) + '</span> <span style="font-size:.62em;color:var(--text-sec);font-weight:600">' + esc(lang.name) + '</span></h1>' +
    '<p class="lede">Paper A is the qualifying Indian-language paper: 300 marks, three hours, 25% to pass. This page gives you the script, the traps, a practice workbook and a script checker for ' + esc(lang.name) + '.</p>' +
    '<div class="hero-stats">' +
    '<div class="s"><div class="n">300</div><div class="l">Marks</div></div>' +
    '<div class="s"><div class="n">25%</div><div class="l">Qualifying</div></div>' +
    '<div class="s"><div class="n">' + esc(lang.script) + '</div><div class="l">Script</div></div>' +
    '<div class="s"><div class="n">' + esc(lang.direction.toUpperCase()) + '</div><div class="l">Direction</div></div>' +
    '</div></section>\n' +
    '<div class="note"><b>The rule.</b> Paper A is one Indian language from the Eighth Schedule. It is 300 marks and three hours; you need 25% (75/300) to qualify, and the marks are not counted in the merit list. A candidate who fails Paper A is not ranked, however well the scored papers went.</div>\n' +
    '<section class="section"><div class="section-head"><h2>What Paper A tests</h2><span class="pill">300 marks &middot; 3 hours</span></div>' +
    '<div class="grid two">' +
    '<div class="card"><div class="t">Comprehension</div><div class="d">Read a passage and answer questions on its meaning, inference, tone and vocabulary.</div></div>' +
    '<div class="card"><div class="t">Precis</div><div class="d">Compress a passage to about one-third without losing its argument or tone.</div></div>' +
    '<div class="card"><div class="t">Usage and vocabulary</div><div class="d">Grammar, sentence construction, idioms and word choice in ' + esc(lang.name) + '.</div></div>' +
    '<div class="card"><div class="t">Short essays</div><div class="d">Organised writing on a general topic, usually in a few hundred words.</div></div>' +
    '<div class="card"><div class="t">Translation</div><div class="d">English to ' + esc(lang.name) + ' and ' + esc(lang.name) + ' to English. Meaning and register matter more than word order.</div></div>' +
    '<div class="card"><div class="t">No fixed section split</div><div class="d">The notification does not publish a fixed mark split for each section. Prepare all five areas rather than optimising for a guessed weighting.</div></div>' +
    '</div></section>\n' +
    '<section class="section"><div class="section-head"><h2>The ' + esc(lang.script) + ' script</h2><span class="pill g">' + esc(lang.unicode) + '</span></div>' +
    '<p class="section-sub">' + esc(lang.scriptNote) + '</p>' +
    '<div class="grid two">' +
    '<div class="card"><div class="t">Direction and characters</div><div class="d">' + esc(lang.script) + ' runs ' + (lang.direction === 'rtl' ? 'right to left' : 'left to right') + '. The page uses the Unicode range ' + esc(lang.unicode) + '. Write the language in its own script, not in a Latin transliteration.</div></div>' +
    '<div class="card"><div class="t">Traps in ' + esc(lang.name) + '</div><ul style="padding-left:18px;color:var(--text-sec);font-size:13px;line-height:1.7">' +
    lang.traps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
    '</ul></div></div></section>\n' +
    sampleSection(lang) + '\n' +
    practiceWorkbook(lang) + '\n' +
    scriptChecker(lang) + '\n' +
    sourcesSection(lang) + '\n' +
    '<section class="section"><div class="section-head"><h2>Other Paper A languages</h2><span class="pill">22 Eighth Schedule languages</span></div>' +
    '<div class="lang-picker">' + pickerCards(lang.slug, '') + '</div></section>\n' +
    footer() + '\n</div>\n<script src="language-practice.js"></script>\n</body>\n</html>\n';
  return html;
}

function hubPage() {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<title>UPSC Mains Paper A &mdash; Language Practice for All 22 Scheduled Languages | vlymbooq</title>\n' +
    '<meta name="description" content="Choose your UPSC Mains Paper A language. Script checkers, comprehension, precis, translation and essay practice for the 22 Eighth Schedule languages. Practice prompts are not official UPSC questions.">\n' +
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n' +
    '<link rel="canonical" href="' + SITE + '/upsc/mains/language/">\n' +
    '<link rel="stylesheet" href="../mains.css">\n' +
    pageCss('Inter') + '\n</head>\n<body>\n' +
    nav('Paper A') + '\n<div class="wrap">\n' +
    '<section class="hero"><div class="kicker">UPSC Mains &middot; Paper A &middot; Indian language</div>' +
    '<h1>One qualifying paper. Twenty-two languages.</h1>' +
    '<p class="lede">Paper A is 300 marks and three hours, and you need 25% to qualify. The marks do not count in the merit list, but failing the paper ends the attempt. Pick your language below for a script guide, a practice workbook and a Unicode script checker.</p>' +
    '<div class="hero-stats"><div class="s"><div class="n">22</div><div class="l">Languages</div></div><div class="s"><div class="n">300</div><div class="l">Marks</div></div><div class="s"><div class="n">25%</div><div class="l">Qualifying</div></div><div class="s"><div class="n">3h</div><div class="l">Duration</div></div></div></section>\n' +
    '<div class="note"><b>Before you choose.</b> Confirm the language and script printed on the current UPSC notification and question paper. The Commission publishes the list of compulsory language papers with each Mains cycle; this page covers the 22 languages in the Eighth Schedule, but it does not promise that every language is offered in every cycle.</div>\n' +
    '<section class="section"><div class="section-head"><h2>Choose your language</h2><span class="pill g">Practice pages</span></div>' +
    '<div class="lang-picker">' + pickerCards(null, '') + '</div></section>\n' +
    '<section class="section"><div class="section-head"><h2>What is on each page</h2></div><div class="grid three">' +
    '<div class="card"><div class="t">Script guide</div><div class="d">The script, its direction, its Unicode range and the traps that cost marks.</div></div>' +
    '<div class="card"><div class="t">Practice workbook</div><div class="d">Comprehension, precis, vocabulary, two-way translation and a short essay. Original prompts, not PYQs.</div></div>' +
    '<div class="card"><div class="t">Script checker</div><div class="d">Paste an answer and see whether it uses the expected Unicode script. It flags Latin letters; it does not grade grammar.</div></div>' +
    '</div></section>\n' +
    '<section class="section"><div class="section-head"><h2>Low-resource languages</h2><span class="pill a">Label read</span></div>' +
    '<p class="section-sub">Santali, Bodo, Dogri and Kashmiri pages carry a short model-generated practice passage. The passage is labelled, script-checked and marked as pending native-speaker review. The other pages ask you to source a passage from a newspaper or an official paper instead of pretending that a short model text is a substitute.</p></section>\n' +
    '<section class="section"><div class="section-head"><h2>Official sources</h2></div><div class="grid two">' + officialCards() + '</div>' +
    '<div class="warn" style="margin-top:12px"><b>Not an official paper.</b> The tasks on these pages are original study prompts. This site does not invent official questions, answer keys or source PDFs.</div></section>\n' +
    '<section class="section"><div class="section-head"><h2>More on the language papers</h2></div><div class="grid two">' +
    '<a class="card" href="../language.html"><div class="t">Language papers overview</div><div class="d">The 25% rule, what Paper A and Paper B test, and a precis practice tool.</div></a>' +
    '<a class="card" href="../../course/mains-language/lesson-paper-a-indian-language.html"><div class="t">Paper A course lesson</div><div class="d">The course version of this overview, with practice MCQs and the same language picker.</div></a>' +
    '</div></section>\n' + footer() + '\n</div>\n</body>\n</html>\n';
}

function mcq(id, text, options, correctIndex, sol) {
  return {
    id: id,
    text: text,
    options: options.map(function (t, i) {
      return { l: String.fromCharCode(97 + i), t: t, c: i === correctIndex };
    }),
    sol: sol
  };
}

function paperAQuestions() {
  return [
    mcq(141, 'Paper A (Indian language) is marked out of:', ['100', '200', '300', '400'], 2, 'Paper A is a 300-mark qualifying paper. The marks are not counted in the merit list.'),
    mcq(142, 'The minimum qualifying mark in Paper A is:', ['25%', '33%', '40%', '50%'], 0, 'A candidate must reach 25% (75/300) in Paper A and Paper B. Failing either paper means the candidate is not ranked.'),
    mcq(143, 'Which of the following is NOT a component of Paper A?', ['Comprehension', 'Precis writing', 'Translation', 'An optional-subject paper'], 3, 'Paper A tests comprehension, precis, usage and vocabulary, short essays and translation. The optional subject is a separate scored paper.'),
    mcq(144, 'The UPSC Santali Paper A is printed in which script?', ['Ol Chiki', 'Devanagari', 'Bengali', 'Latin'], 0, 'Santali is written in Ol Chiki. The other scripts are used for other languages or for transliteration, not for the Santali paper.'),
    mcq(145, 'Are Paper A marks added to the merit-list total?', ['Yes, in full', 'No', 'Only above 50%', 'Only for optional subjects'], 1, 'Paper A and Paper B are qualifying papers. Their marks are not added to the merit-list total.')
  ];
}

function paperBQuestions() {
  return [
    mcq(151, 'Paper B (English) is marked out of:', ['100', '200', '300', '400'], 2, 'Paper B is a 300-mark qualifying paper.'),
    mcq(152, 'The minimum qualifying mark in Paper B is:', ['25%', '33%', '40%', '50%'], 0, 'The qualifying threshold is 25% in both Paper A and Paper B.'),
    mcq(153, 'Which section is NOT listed in the Paper B syllabus?', ['Comprehension', 'Precis writing', 'Translation', 'Short essays'], 2, 'The Paper B syllabus lists comprehension, precis, usage and vocabulary, and short essays. Translation is a Paper A component.'),
    mcq(154, 'A precis should normally be about what fraction of the original?', ['One-tenth', 'One-third', 'One-half', 'The same length'], 1, 'A precis keeps the argument and tone in roughly one-third of the original words.'),
    mcq(155, 'Paper B marks are:', ['Added to the merit total', 'Qualifying only', 'Counted only for the interview', 'Counted only for optional subjects'], 1, 'Paper B is qualifying; its marks are not counted in the merit list.')
  ];
}

function precisQuestions() {
  return [
    mcq(161, 'A precis should contain:', ['The writer\'s main claim and supporting reasons', 'Every example in the passage', 'Your opinion on the passage', 'A list of difficult words'], 0, 'A precis compresses the argument, not the examples. It keeps the main claim, the supporting reasons and the tone.'),
    mcq(162, 'The normal length of a precis is about:', ['One-third of the original', 'The same as the original', 'Twice the original', 'One sentence'], 0, 'One-third is the usual target, but the important test is whether the argument survives compression.'),
    mcq(163, 'Which of these should you leave out of a precis?', ['The main claim', 'The supporting reasons', 'Your own opinion', 'The writer\'s tone'], 2, 'A precis does not add the reader\'s opinion. It reports the passage\'s argument and tone.'),
    mcq(164, 'A comprehension question that asks "what does the writer imply" is testing:', ['Direct recall only', 'Inference from the passage', 'Vocabulary only', 'Grammar only'], 1, 'Inference questions ask what follows from the passage even if it is not stated in one sentence.'),
    mcq(165, 'The safest first step in precis writing is:', ['Copy the first sentence', 'Read the passage twice and identify the main claim', 'Count the words', 'Write the conclusion first'], 1, 'Read once for the claim and once for the structure before you write.')
  ];
}

function translationQuestions() {
  return [
    mcq(171, 'Translation is primarily judged on:', ['Word-for-word equivalence', 'Meaning and register', 'The number of sentences', 'Handwriting'], 1, 'Meaning and register matter more than preserving word order.'),
    mcq(172, 'A literal translation that preserves word order but breaks the target language is:', ['Always the best choice', 'A common trap', 'Required in Paper A', 'The only way to translate idioms'], 1, 'Literal translation is a common trap. The target sentence must read naturally.'),
    mcq(173, 'Back-translation is useful because it:', ['Proves the translation is official', 'Shows whether the meaning survived', 'Replaces the need for grammar', 'Makes the answer longer'], 1, 'Translating your version back into English exposes meaning that was lost or added.'),
    mcq(174, 'A "false friend" is:', ['A word that looks similar in two languages but means something different', 'A grammar rule shared by two languages', 'A word with no translation', 'A formal greeting'], 0, 'False friends are words that look alike but differ in meaning; they cause silent translation errors.'),
    mcq(175, 'When translating an idiom, the best approach is usually to:', ['Translate it word for word', 'Use an equivalent idiom or plain meaning in the target language', 'Delete the sentence', 'Add an explanation in English'], 1, 'Translate the meaning, not the words. Use an equivalent idiom if one exists; otherwise use plain language.')
  ];
}

function paperAOverviewBody() {
  return pickerStyle() + '\n' +
    '<h3>What Paper A is</h3>' +
    '<p>Paper A is one Indian language from the Eighth Schedule. It is 300 marks and three hours. It is qualifying: you need 25% (75/300), and the marks are not added to the merit list. Failing it ends the attempt, so it deserves a planned place in the timetable.</p>' +
    '<div class="tip-box"><div class="tip-title">The 25% rule</div><div class="tip-text">The Commission evaluates Paper A and Paper B alongside the scored papers, but only candidates who reach 25% in each qualifying paper are considered for ranking. Treat 75/300 as a floor, not a target.</div></div>' +
    '<h3>What the paper tests</h3>' +
    '<ul>' +
    '<li><strong>Comprehension:</strong> read a passage and answer questions on its meaning, inference and vocabulary.</li>' +
    '<li><strong>Precis:</strong> compress a passage to about one-third without losing its argument or tone.</li>' +
    '<li><strong>Usage and vocabulary:</strong> grammar, sentence construction, idioms and word choice.</li>' +
    '<li><strong>Short essays:</strong> organised writing on a general topic.</li>' +
    '<li><strong>Translation:</strong> English to the chosen language and the chosen language to English.</li>' +
    '</ul>' +
    '<p>The notification does not publish a fixed section-wise mark split. Prepare all five areas rather than optimising for a guessed weighting.</p>' +
    '<h3>Choose your language</h3>' +
    '<p>Each practice page gives you the script, the traps, a practice workbook and a script checker. The four low-resource pages also carry a model-generated sample passage, clearly labelled and script-checked.</p>' +
    '<div class="lang-picker">' + pickerCards(null, '../../mains/language/') + '</div>' +
    '<h3>How to use the pages</h3>' +
    '<ol>' +
    '<li>Pick the language printed on your Paper A question paper.</li>' +
    '<li>Do one comprehension and one precis task a week in that script.</li>' +
    '<li>Translate the same English paragraph both ways; compare meaning, not word order.</li>' +
    '<li>Use the script checker before you ask for feedback. It catches wrong-script paste, not grammar.</li>' +
    '</ol>' +
    '<div class="tip-box"><div class="tip-title">Labelling</div><div class="tip-text">The practice tasks on these pages are original study prompts, not UPSC previous-year questions. The model-generated samples are marked as such. Official question papers are linked from UPSC\'s previous-question-papers page; this site does not invent questions or answer keys.</div></div>';
}

function paperBBody() {
  return '<h3>What Paper B is</h3>' +
    '<p>Paper B is the English qualifying paper: 300 marks, three hours, and a 25% pass mark (75/300). The marks are not counted in the merit list. It is set at matriculation standard, but that means careful, formal English, not a literature paper and not a grammar quiz.</p>' +
    '<div class="tip-box"><div class="tip-title">The 25% rule</div><div class="tip-text">A candidate who fails Paper B is not ranked, however well the scored papers went. Treat 75/300 as a floor.</div></div>' +
    '<h3>What the syllabus lists</h3>' +
    '<ul><li><strong>Comprehension</strong> of a given passage.</li><li><strong>Precis writing.</strong></li><li><strong>Usage and vocabulary.</strong></li><li><strong>Short essays.</strong></li></ul>' +
    '<p>The syllabus does not list a separate translation section for Paper B. Check the current notification and the printed paper before you assume a section will appear.</p>' +
    '<h3>Where marks are lost</h3>' +
    '<ul>' +
    '<li><strong>A summary instead of a precis.</strong> A precis keeps the argument and the tone in about one-third of the words. Cutting sentences is not compression.</li>' +
    '<li><strong>Informal register.</strong> Contractions, chatty asides and rhetorical questions belong in a blog, not in a qualifying paper.</li>' +
    '<li><strong>Vocabulary guessed from sound.</strong> Use the context of the passage. If a word is not clear, say what the sentence is doing rather than inventing a definition.</li>' +
    '<li><strong>An essay with no structure.</strong> A short essay still needs a beginning, two or three developed points and a close.</li>' +
    '<li><strong>Leaving a section blank.</strong> Attempt every section, even briefly. An unanswered section is a guaranteed loss.</li>' +
    '</ul>' +
    '<h3>A four-week routine</h3>' +
    '<ol>' +
    '<li><strong>Week 1 &mdash; Comprehension and precis.</strong> One editorial a day. Read once for the claim, once for the structure. Write the precis without looking back.</li>' +
    '<li><strong>Week 2 &mdash; Usage and vocabulary.</strong> Twenty minutes a day on sentence correction, idioms and word choice. Keep one error log.</li>' +
    '<li><strong>Week 3 &mdash; Essays.</strong> Two 250-word essays. Underline the thesis and the topic sentence of each paragraph before you write.</li>' +
    '<li><strong>Week 4 &mdash; Full paper.</strong> Sit one full Paper B under three hours. Fix the section that ran over time.</li>' +
    '</ol>' +
    '<div class="tip-box"><div class="tip-title">Answer discipline</div><div class="tip-text">Write the answer, not the working. The examiner is checking control of English, so a clear short sentence beats a tangled long one.</div></div>';
}

function precisBody() {
  return '<h3>What a precis is</h3>' +
    '<p>A precis is a compressed restatement of a passage. It keeps the main claim, the supporting reasons and the tone, and it is normally about one-third of the original length. It is not a summary of every paragraph, and it is not a place for your opinion.</p>' +
    '<div class="tip-box"><div class="tip-title">The one-third rule</div><div class="tip-text">One-third is a guide, not a law. The real test is whether a reader who has not seen the original can recover its argument from your precis.</div></div>' +
    '<h3>A method that works under exam pressure</h3>' +
    '<ol>' +
    '<li><strong>Read once for the claim.</strong> What is the writer trying to establish?</li>' +
    '<li><strong>Read again for the structure.</strong> Mark the claim, the reasons, the example and the conclusion.</li>' +
    '<li><strong>Write in your own words.</strong> Do not copy whole sentences. Keep technical terms that have no synonym.</li>' +
    '<li><strong>Cut examples before reasons.</strong> An example supports a reason; the reason is what the precis must keep.</li>' +
    '<li><strong>Compare.</strong> Does your version preserve the claim, the reasons and the tone? If not, revise before you count words.</li>' +
    '</ol>' +
    '<h3>Comprehension: fact, inference and tone</h3>' +
    '<ul>' +
    '<li><strong>Fact</strong> is stated in the passage. The answer should be traceable to a line.</li>' +
    '<li><strong>Inference</strong> follows from the passage but is not stated in one sentence. Explain the step, not just the conclusion.</li>' +
    '<li><strong>Tone</strong> is the writer\'s attitude: cautious, critical, optimistic, ironic. A tone question usually asks for a word and a reason.</li>' +
    '<li><strong>Vocabulary in context</strong> asks what a word means <em>in this sentence</em>, not in a dictionary.</li>' +
    '</ul>' +
    '<h3>Common traps</h3>' +
    '<ul>' +
    '<li>Copying the first sentence and calling it a precis.</li>' +
    '<li>Keeping every example and dropping the main claim.</li>' +
    '<li>Adding your own view on the topic.</li>' +
    '<li>Writing a list of points instead of connected prose.</li>' +
    '<li>Changing the writer\'s cautious tone into a confident one.</li>' +
    '</ul>' +
    '<div class="tip-box"><div class="tip-title">Practice drill</div><div class="tip-text">Take a 350-word editorial. Write a 110&ndash;120 word precis. Then compare it with the original: did you keep the claim, the reasons and the tone? Repeat with a different passage the next day.</div></div>';
}

function translationBody() {
  return '<h3>Translation is meaning, not word order</h3>' +
    '<p>Paper A asks for translation in both directions: English to your language and your language to English. The examiner is checking whether the meaning survives and whether the target sentence reads naturally. A literal sentence that preserves word order but breaks the target language loses more than a freer sentence that reads well.</p>' +
    '<div class="tip-box"><div class="tip-title">The first rule</div><div class="tip-text">Translate the sentence, not the words. If a literal version is unnatural, rewrite it in the target language and check that the meaning has not changed.</div></div>' +
    '<h3>English to your language</h3>' +
    '<ul>' +
    '<li><strong>Split long sentences.</strong> English uses long clauses; many Indian languages prefer shorter clauses with clear connectives.</li>' +
    '<li><strong>Choose natural word order.</strong> Do not preserve English subject-verb-object order if the target language normally does something else.</li>' +
    '<li><strong>Keep technical terms consistent.</strong> If you translate a term once, use the same term throughout the passage.</li>' +
    '<li><strong>Watch register.</strong> A newspaper editorial is formal; a quoted conversation may not be. Match the passage, not your personal style.</li>' +
    '</ul>' +
    '<h3>Your language to English</h3>' +
    '<ul>' +
    '<li><strong>Avoid literal translation.</strong> A sentence that is grammatical in your language may sound wrong in English.</li>' +
    '<li><strong>Use standard English collocations.</strong> "Take a decision" and "make a decision" are both understandable, but one is the natural choice in the register.</li>' +
    '<li><strong>Keep tense and modality.</strong> Do not turn "may" into "will" or "should" into "must".</li>' +
    '<li><strong>Do not add explanation.</strong> If the source is ambiguous, keep the ambiguity rather than inventing a detail.</li>' +
    '</ul>' +
    '<h3>Grammar traps that cost marks</h3>' +
    '<ul>' +
    '<li>Subject-verb agreement in long sentences.</li>' +
    '<li>Tense consistency across a paragraph.</li>' +
    '<li>Articles and prepositions in English (a, an, the, in, on, at).</li>' +
    '<li>Reported speech: backshift the tense when the reporting verb is in the past.</li>' +
    '<li>Modifiers: put the modifier next to the word it describes.</li>' +
    '</ul>' +
    '<h3>Back-translation</h3>' +
    '<p>Translate your answer back into the source language without looking at the original. If the back-translation says something different, the first translation lost or added meaning. This is the fastest self-check you can do without a teacher.</p>' +
    '<div class="tip-box"><div class="tip-title">Practice drill</div><div class="tip-text">Take one 100-word English editorial paragraph. Translate it into your language. Wait ten minutes. Translate it back into English. Compare the two English versions and mark every difference in meaning.</div></div>';
}

var content = {
  generatedAt: data.meta.generatedAt,
  note: 'Generated by scripts/build-language-pages.js. The four bodies replace the course generator filler for the mains-language module. Practice questions are original, not previous-year questions.',
  keys: {
    'mains-language/paper-a-indian-language': { body: paperAOverviewBody(), questions: paperAQuestions() },
    'mains-language/paper-b-english': { body: paperBBody(), questions: paperBQuestions() },
    'mains-language/precis-writing': { body: precisBody(), questions: precisQuestions() },
    'mains-language/translation': { body: translationBody(), questions: translationQuestions() }
  }
};

function writeFile(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
  console.log('wrote ' + path.relative(ROOT, file));
}

fs.mkdirSync(OUT_DIR, { recursive: true });
data.languages.forEach(function (lang) {
  writeFile(path.join(OUT_DIR, lang.slug + '.html'), languagePage(lang));
});
writeFile(path.join(OUT_DIR, 'index.html'), hubPage());
writeFile(path.join(OUT_DIR, 'language-practice.js'), fs.readFileSync(path.join(__dirname, 'language-practice.js'), 'utf8'));
writeFile(CONTENT_FILE, JSON.stringify(content, null, 2) + '\n');
console.log('language pack: ' + data.languages.length + ' pages + hub + course content');
