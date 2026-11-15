#!/usr/bin/env node
'use strict';
// Give mental.html real content.
//
// The page is a 327-word shell around an 865 KB drill engine: no heading, no
// explanation of what the four training layers are, no list of the topics it
// actually drills, and nothing that ties it to the exams it trains for. For a
// visitor it is a wall of buttons; for a search engine it is empty.
//
// Everything injected here is derived from the repository, not written by hand:
//
//   - the sub-topic list comes from the engine's own subTopicStats keys
//     (js/mental-training.js), so it cannot drift from what the drills cover;
//   - the exam patterns come from data/exam-blueprints.json, which carries each
//     paper's sections, counts, marks, duration, negative marking and a source
//     line, so every number on the page is the same number the paper builder
//     uses.
//
//   node scripts/enrich-mental-page.js
//
// Idempotent: the block it writes is marked and replaced on re-run.
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var PAGE = path.join(ROOT, 'mental.html');
var ENGINE = path.join(ROOT, 'js', 'mental-training.js');
var BP = path.join(ROOT, 'data', 'exam-blueprints.json');

var START = '<!-- mental-coverage:start -->';
var END = '<!-- mental-coverage:end -->';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function humanise(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

// The engine declares its scope in one object literal. Read it rather than
// keeping a second copy that would drift.
function readSubTopics() {
  var src = fs.readFileSync(ENGINE, 'utf8');
  var block = src.slice(src.indexOf('subTopicStats:'), src.indexOf('// Reasoning sub-topics'));
  // Stop at patternStats: the next object in the same literal holds pattern
  // names ('Analogy', 'Series'...), not sub-topics, and reading past the end of
  // subTopicStats pulled in mangled fragments of them.
  var reasoningBlock = src.slice(src.indexOf('// Reasoning sub-topics'), src.indexOf('patternStats:'));
  var grab = function (s) {
    var out = [];
    var re = /([a-z][a-z0-9_]*)\s*:\s*\{\s*attempts/g;
    var m;
    while ((m = re.exec(s))) out.push(m[1]);
    return out;
  };
  var quant = grab(block).filter(function (k) { return k !== 'meta'; });
  var reasoning = grab(reasoningBlock);
  return { quant: quant, reasoning: reasoning };
}

function readPatterns() {
  var bp = JSON.parse(fs.readFileSync(BP, 'utf8'));
  var re = /quant|reason|english|aptitud|math|general intelligence|data interpretation/i;
  var rows = [];
  Object.keys(bp.exams || {}).forEach(function (key) {
    var exam = bp.exams[key];
    (exam.papers || []).forEach(function (p) {
      var hit = (p.sections || []).filter(function (s) { return re.test(s.name); });
      if (!hit.length) return;
      rows.push({
        exam: exam.name, paper: p.name, total: p.total, marks: p.marks,
        minutes: p.duration, negative: p.negativeNote || (p.negative ? '-' + p.negative : 'none'),
        sections: hit, source: p.source || ''
      });
    });
  });
  rows.sort(function (a, b) { return a.exam.localeCompare(b.exam) || a.paper.localeCompare(b.paper); });
  return rows;
}

function chips(list) {
  return list.map(function (k) {
    return '<span class="mc-chip">' + esc(humanise(k)) + '</span>';
  }).join('');
}

function build(topics, patterns) {
  var rows = patterns.map(function (p) {
    var secs = p.sections.map(function (s) {
      return esc(s.name) + ' <b>' + s.count + 'Q / ' + s.marks + 'm</b>';
    }).join('<br>');
    return '<tr><td><b>' + esc(p.exam) + '</b><br><span class="mc-dim">' + esc(p.paper) + '</span></td>' +
      '<td>' + secs + '</td>' +
      '<td class="mc-num">' + p.total + '</td>' +
      '<td class="mc-num">' + p.marks + '</td>' +
      '<td class="mc-num">' + p.minutes + ' min</td>' +
      '<td class="mc-dim">' + esc(p.negative) + '</td></tr>';
  }).join('\n');

  return [
    START,
    '<style>',
    '.mc-section{max-width:1000px;margin:38px auto 10px;padding:0 4px;color:var(--text, #e8eaed);line-height:1.6}',
    '.mc-section h1{font-size:1.55em;line-height:1.25;margin:0 0 10px}',
    '.mc-section h2{font-size:1.12em;margin:26px 0 10px;color:var(--text, #e8eaed)}',
    '.mc-lede{color:var(--text-sec, #c8ccd2);font-size:.94em;margin:0 0 6px}',
    '.mc-dim{color:var(--text-muted, #9aa0a6);font-size:.86em}',
    '.mc-num{font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.mc-table{width:100%;border-collapse:collapse;font-size:.84em;margin:8px 0 4px}',
    '.mc-table th{text-align:left;font-size:.82em;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted, #9aa0a6);padding:7px 9px;border-bottom:1px solid var(--border, #2a2e37)}',
    '.mc-table td{padding:8px 9px;border-bottom:1px solid var(--border, #2a2e37);vertical-align:top}',
    '.mc-table tbody tr:hover{background:rgba(255,255,255,.03)}',
    '.mc-scroll{overflow-x:auto}',
    '.mc-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 4px}',
    '.mc-chip{background:var(--bg-card, #1a1d23);border:1px solid var(--border, #2a2e37);border-radius:100px;padding:4px 11px;font-size:.78em;color:var(--text-sec, #c8ccd2)}',
    '.mc-list{margin:8px 0 4px 20px;padding:0}',
    '.mc-list li{margin:6px 0;font-size:.92em}',
    '.mc-section a{color:var(--accent, #8ab4f8)}',
    '@media(max-width:640px){.mc-table{font-size:.78em}.mc-section h1{font-size:1.3em}}',
    '</style>',
    '<section class="mc-section" id="mental-coverage">',
    '  <h1>Quant &amp; Reasoning Reflex: exam-level mental speed training</h1>',
    '  <p class="mc-lede">A reflex trainer, not a syllabus page. Each round throws a single question at you under a',
    '  clock, scores it by sub-topic, and keeps a mistake list you retry until it is clean. The engine below drills',
    '  <b>' + topics.quant.length + ' quantitative sub-topics</b> and <b>' + topics.reasoning.length + ' reasoning,',
    '  verbal and non-verbal sub-topics</b> &mdash; the same ground the papers in the table further down actually test.</p>',

    '  <h2>What each training layer is for</h2>',
    '  <table class="mc-table">',
    '    <thead><tr><th>Layer</th><th>What it does</th><th>When to use it</th></tr></thead>',
    '    <tbody>',
    '      <tr><td><b>Instinct</b></td><td>Short clock, simplest forms of each topic. Trains the automatic first move.</td><td>Daily warm-up, 10 minutes.</td></tr>',
    '      <tr><td><b>Invented</b></td><td>Freshly built questions at Easy, Moderate, Hard and Very Hard.</td><td>Once the instinct layer feels slow.</td></tr>',
    '      <tr><td><b>Exam Sim</b></td><td>An on-demand mixed paper &mdash; Quant, Reasoning and English together, at exam timing.</td><td>Weekly, with a clock and no pausing.</td></tr>',
    '      <tr><td><b>Grand Slam</b></td><td>Full-length mixed set across every sub-topic.</td><td>Before a mock-test week.</td></tr>',
    '      <tr><td><b>Mistakes</b></td><td>Every wrong answer is stored and re-served until you clear it.</td><td>Always. This is the layer that moves the score.</td></tr>',
    '    </tbody>',
    '  </table>',

    '  <h2>Quantitative sub-topics drilled here</h2>',
    '  <div class="mc-chips">' + chips(topics.quant) + '</div>',

    '  <h2>Reasoning, verbal and non-verbal sub-topics drilled here</h2>',
    '  <div class="mc-chips">' + chips(topics.reasoning) + '</div>',

    '  <h2>Which exam papers these topics come from</h2>',
    '  <p class="mc-dim">Sections taken straight from the exam blueprints the paper builder uses, so the counts, marks,',
    '  duration and negative marking below are the same numbers a full paper is assembled from.</p>',
    '  <div class="mc-scroll">',
    '  <table class="mc-table">',
    '    <thead><tr><th>Exam</th><th>Relevant sections</th><th>Qs</th><th>Marks</th><th>Time</th><th>Negative</th></tr></thead>',
    '    <tbody>',
    rows,
    '    </tbody>',
    '  </table>',
    '  </div>',

    '  <h2>How to use it to raise a score</h2>',
    '  <ol class="mc-list">',
    '    <li><b>Diagnose first.</b> Two Instinct rounds tell you which sub-topics are already automatic and which are not. The per-sub-topic record is kept for you.</li>',
    '    <li><b>Attack the slow ones, not the hard ones.</b> In a prelims paper the marks lost to a topic you half-know are usually more than the marks lost to one you never learned.</li>',
    '    <li><b>Move up a layer only when the clock stops being the problem.</b> Then go to Invented at Moderate, and Hard only after that.</li>',
    '    <li><b>Empty the mistake list before every Exam Sim.</b> A repeated error is the cheapest mark on the paper.</li>',
    '  </ol>',

    '  <h2>Questions</h2>',
    '  <p><b>Is this a substitute for a full mock?</b> No. It drills the reflex behind individual questions; the',
    '  <a href="papers.html">full-length papers</a> test whether you can hold that speed for the whole paper.</p>',
    '  <p><b>Does it cover negative marking?</b> The answers are scored as the exam scores them, and each paper\'s',
    '  penalty is listed above. Plan for it: at &minus;0.50 per wrong answer, three blind guesses cost more than one skipped question.</p>',
    '  <p><b>Where is the theory?</b> The <a href="revision.html">revision guides</a> and the',
    '  <a href="cgl/course/index.html">exam courses</a> carry the concepts; this page is for the speed that comes after them.</p>',
    '</section>',
    END
  ].join('\n');
}

function inject(page, block) {
  var start = page.indexOf(START);
  if (start !== -1) {
    var end = page.indexOf(END, start);
    if (end === -1) throw new Error('start marker without end marker');
    return page.slice(0, start) + block + page.slice(end + END.length);
  }
  // Insert as the last child of <div class="container">, so it sits under the
  // drill UI rather than pushing it off the first screen.
  var open = page.indexOf('<div class="container">');
  if (open === -1) throw new Error('container div not found');
  var i = page.indexOf('>', open) + 1;
  var depth = 1;
  var re = /<div\b|<\/div>/g;
  re.lastIndex = i;
  var m;
  while ((m = re.exec(page))) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) break;
  }
  if (!m) throw new Error('unbalanced divs');
  return page.slice(0, m.index) + block + '\n' + page.slice(m.index);
}

var topics = readSubTopics();
var patterns = readPatterns();
if (!topics.quant.length || !topics.reasoning.length) throw new Error('no sub-topics read from the engine');
if (!patterns.length) throw new Error('no exam patterns read from the blueprints');

var page = fs.readFileSync(PAGE, 'utf8');
var next = inject(page, build(topics, patterns));
fs.writeFileSync(PAGE, next, 'utf8');
console.log('mental.html: ' + topics.quant.length + ' quant + ' + topics.reasoning.length +
  ' reasoning sub-topics, ' + patterns.length + ' exam papers -> ' + Math.round(next.length / 1024) + 'KB');