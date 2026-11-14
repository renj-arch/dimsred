#!/usr/bin/env node
// Regression tests for the course expander's validator and HTML repair. No
// Ollama, no network, no writes: safe to run on every CI job.
'use strict';
const assert = require('assert');
const repair = require('./lib/html-repair');
const expand = require('./expand-course');

let passed = 0;
function ok(name, fn) {
  fn();
  passed++;
  console.log('ok - ' + name);
}

function p(text) {
  return '<p>' + text + '</p>';
}

function lessonHtml(h3Count) {
  const filler = 'This paragraph explains the concept with a worked example and the exam pattern a student should expect. '.repeat(6);
  let html = '';
  for (let i = 0; i < h3Count; i++) {
    html += '<h3>Section ' + (i + 1) + '</h3>' + p(filler);
  }
  html += '<p>' + filler + '</p><p>' + filler + '</p><p>' + filler + '</p>';
  html += '<table><caption>Comparison</caption><thead><tr><th>Concept</th><th>Rule</th></tr></thead>' +
    '<tbody><tr><td>Simple</td><td>P x R x T</td></tr></tbody></table>';
  html += '<div class="example-box"><div class="ex-title">Technique</div>' +
    '<div class="ex-text">Solve the example.</div><div class="ex-soln">Step by step.</div></div>';
  html += '<div class="tip-box"><div class="tip-title">Exam tip</div>' +
    '<div class="tip-text">Check the units before answering.</div></div>';
  return html;
}

ok('repair escapes a one-letter math tag instead of rejecting the lesson', function () {
  const out = repair.sanitize('<h2>Heading</h2><p>For every i <j> k the value changes.</p>');
  assert.ok(out.indexOf('<h3>Heading</h3>') !== -1, out);
  assert.ok(out.indexOf('&lt;j&gt;') !== -1, out);
  assert.strictEqual(out.indexOf('<j>'), -1, out);
});

ok('repair maps common wrappers and keeps table tags', function () {
  const out = repair.sanitize('<section><table><tr><th>A<th>B<tr><td>1<td>2</table></section>');
  assert.ok(out.indexOf('<div>') !== -1, out);
  assert.ok(out.indexOf('<table>') !== -1, out);
  assert.ok(out.indexOf('</th>') !== -1, out);
  assert.ok(out.indexOf('</td>') !== -1, out);
  assert.ok(out.indexOf('</table>') !== -1, out);
  assert.ok(out.indexOf('<td><td>') === -1, out);
});

ok('repair converts LaTeX to plain text and superscripts', function () {
  const out = repair.sanitize('<p>State $|A\\rangle = T|+\\rangle$, $10^{-3}$ and $\\pi/8$.</p>');
  assert.ok(out.indexOf('|A⟩ = T|+⟩') !== -1, out);
  assert.ok(out.indexOf('10<sup>-3</sup>') !== -1, out);
  assert.ok(out.indexOf('π/8') !== -1, out);
  assert.strictEqual(out.indexOf('$'), -1, out);
});

ok('repair leaves currency amounts alone', function () {
  const out = repair.sanitize('<p>It costs $5 and $10.</p>');
  assert.ok(out.indexOf('$5 and $10') !== -1, out);
});

ok('repair strips delimiters around tuples and intervals', function () {
  const out = repair.sanitize('<p>Take $(1,29)$, the interval $[0, 1]$ and $P dV$.</p>');
  assert.ok(out.indexOf('$') === -1, out);
  assert.ok(out.indexOf('(1,29)') !== -1, out);
  assert.ok(out.indexOf('[0, 1]') !== -1, out);
  assert.ok(out.indexOf('P dV') !== -1, out);
});

ok('repair closes missing tags instead of rejecting the lesson', function () {
  const out = repair.sanitize('<h3>Heading</h3><p><strong>Bold text</p><div class="tip-box"><div class="tip-text">Tip</div>');
  assert.strictEqual((out.match(/<strong>/g) || []).length, (out.match(/<\/strong>/g) || []).length, out);
  assert.strictEqual((out.match(/<div\b/g) || []).length, (out.match(/<\/div>/g) || []).length, out);
});

ok('repair trims a reply that stopped mid-sentence', function () {
  const truncated = '<h3>Heading</h3><p>' + 'A complete sentence explains the rule. '.repeat(8) + 'This built-in potential</p>';
  const trimmed = repair.trimIncompleteTail(truncated);
  assert.strictEqual(trimmed.trimmed, true);
  assert.strictEqual(trimmed.html.indexOf('This built-in potential'), -1);
  assert.ok(/[.!?…]<\/p>$/.test(trimmed.html), trimmed.html.slice(-80));
});

ok('repair leaves a complete ending alone', function () {
  const complete = '<h3>Heading</h3><p>A complete sentence.</p>';
  assert.strictEqual(repair.trimIncompleteTail(complete).trimmed, false);
});

ok('validator accepts a complete lesson with a comparison table', function () {
  assert.strictEqual(expand.validateHtml(lessonHtml(3)), null);
});

ok('validator accepts two advanced sections for the depth lane', function () {
  assert.strictEqual(expand.validateHtml(lessonHtml(2), { minH3: 2 }), null);
});

ok('validator still rejects two sections for a full lesson', function () {
  assert.ok(/needs at least 3 <h3>/.test(expand.validateHtml(lessonHtml(2))));
});

// Full-lesson quality floor. Thresholds are calibrated on the two pages that
// bracket the quality range: upsc/course/gs/lesson-indian-polity.html (44,485
// words, 2.4 marks per 100 words, 20 h2, 33 tables) versus
// upsc/course/opt-sanskrit/lesson-overview.html (1,580 words, 5.4 marks per 100
// words, 0 h2, 0 tables).
const fullOpts = { fullLesson: true };
const FILLER = 'This paragraph explains the concept with a worked example and the exam pattern a student should expect. ';
const TAIL = '<table><caption>Comparison</caption><thead><tr><th>Concept</th><th>Rule</th></tr></thead>' +
  '<tbody><tr><td>Simple</td><td>P x R x T</td></tr></tbody></table>' +
  '<div class="example-box"><div class="ex-title">Technique</div><div class="ex-text">Solve it.</div>' +
  '<div class="ex-soln">Step by step.</div></div>' +
  '<div class="tip-box"><div class="tip-title">Tip</div><div class="tip-text">Check the units.</div></div>';

// A textbook-shaped lesson: <h2> topic groups with numbered <h3> sub-sections.
function longLesson(h2Count, tail) {
  let html = '';
  for (let i = 0; i < h2Count; i++) {
    html += '<h2>' + (i + 1) + '. Topic ' + (i + 1) + '</h2>';
    for (let j = 0; j < 3; j++) {
      html += '<h3>' + (i + 1) + '.' + (j + 1) + ' Sub-topic ' + (i + 1) + '</h3>' + p(FILLER.repeat(6));
    }
  }
  for (let i = 0; i < 14; i++) html += p(FILLER.repeat(6));
  return html + (tail === undefined ? TAIL : tail);
}

ok('full-lesson validator accepts a textbook-shaped lesson', function () {
  assert.strictEqual(expand.validateHtml(longLesson(4), fullOpts), null);
});

ok('full-lesson validator rejects a thin lesson', function () {
  assert.ok(/too thin for a full lesson/.test(expand.validateHtml(lessonHtml(3), fullOpts)));
});

ok('full-lesson validator rejects a flat list of sections with no topic groups', function () {
  const flat = longLesson(4).replace(/<h2>[^<]*<\/h2>/g, '');
  assert.ok(/needs a two-level outline/.test(expand.validateHtml(flat, fullOpts)));
});

ok('full-lesson validator rejects the old boilerplate headings', function () {
  const html = longLesson(4).replace('<h3>1.1 Sub-topic 1</h3>', '<h3>Common Traps</h3>');
  assert.ok(/template heading reused/.test(expand.validateHtml(html, fullOpts)));
});

ok('full-lesson validator rejects an "Advanced Section" prefix', function () {
  const html = longLesson(4).replace('<h3>1.1 Sub-topic 1</h3>', '<h3>Advanced Section: The Examiner Trap</h3>');
  assert.ok(/template heading reused/.test(expand.validateHtml(html, fullOpts)));
});

ok('full-lesson validator rejects note-form packed with colons', function () {
  const notes = 'GDP: domestic output; GNP: GDP plus NFIA; NNP: GNP minus depreciation; PCI: per capita income; ' +
    'deflator: nominal over real; inflation: sustained price rise; MPC: change in consumption over change in income; ' +
    'APC: consumption over income; fiscal: government; monetary: central bank. ';
  let html = '';
  for (let i = 0; i < 4; i++) {
    html += '<h2>' + (i + 1) + '. Topic</h2>';
    for (let j = 0; j < 3; j++) html += '<h3>' + (i + 1) + '.' + (j + 1) + ' Sub</h3>' + p(notes.repeat(8));
  }
  assert.ok(/note-form, not prose/.test(expand.validateHtml(html + TAIL, fullOpts)));
});

ok('full-lesson validator requires a comparison table', function () {
  const html = longLesson(4).replace(/<table>[\s\S]*<\/table>/, '');
  assert.ok(/needs at least one <table>/.test(expand.validateHtml(html, fullOpts)));
});

ok('the lesson prompt demands a two-level outline and drops the old template', function () {
  const prompt = expand.theoryPrompt({
    examName: 'SSC CGL', modName: 'Quantitative Aptitude',
    lesson: { title: 'Percentages', desc: 'x', topics: 'y' },
    mk: 'quant', key: 'quant/percentages', role: 'fill', oldLen: 0
  });
  assert.ok(/4-7 <h2> topic groups/.test(prompt), 'prompt must ask for h2 topic groups');
  assert.ok(/<h2> <h3> <h4>/.test(prompt), 'the allowed-tag list must include h2');
  assert.ok(/Do NOT use the headings "Common Traps"/.test(prompt), 'prompt must ban the boilerplate headings');
  assert.ok(/2500-4000 words/.test(prompt), 'prompt must raise the length target');
  assert.ok(!/Total visible text: 1200-1600 words/.test(prompt), 'the old 1200-1600 word cap must be gone');
  assert.ok(/Do not write "similar to SSC CGL 2022 Slot 2 Q45"/.test(prompt), 'prompt must forbid fabricated past-paper references');
});

ok('validator does not treat "one = 1" in prose as an event handler', function () {
  const html = lessonHtml(3).replace('<p>', '<p>one = 1 and two = 2. ');
  assert.strictEqual(expand.validateHtml(html), null);
});

ok('validator still rejects real unsafe markup', function () {
  const html = lessonHtml(3).replace('</h3>', '</h3><script>alert(1)</script>');
  assert.strictEqual(expand.validateHtml(html), 'disallowed markup');
});

ok('question normalizer keeps a long worked solution', function () {
  const qs = expand.normalizeQuestions([{
    text: 'What is the value of the expression after applying the rule?',
    options: ['1', '2', '3', '4'],
    correct: 1,
    sol: 'Step 1: apply the rule. '.repeat(40)
  }]);
  assert.strictEqual(qs.length, 1);
});

ok('question normalizer rejects "none of the above"', function () {
  const qs = expand.normalizeQuestions([{
    text: 'Which option is correct for this expression?',
    options: ['1', '2', '3', 'None of the above'],
    correct: 0,
    sol: 'The rule gives one, so the first option is correct.'
  }]);
  assert.strictEqual(qs.length, 0);
});

ok('question parser handles a fenced JSON reply with prose', function () {
  const raw = 'Here are the questions:\n```json\n[{"text":"Which rule applies to this case?","options":["A","B","C","D"],"correct":2,"sol":"Apply the rule from the lesson step by step."}]\n```';
  const qs = expand.parseQuestions(raw);
  assert.strictEqual(qs.length, 1);
  assert.strictEqual(qs[0].correct, 2);
});

ok('full-lesson prompt builds without undefined variables and does not ask for inline questions', function () {
  const prompt = expand.theoryPrompt({
    examName: 'SSC CGL',
    modName: 'Quantitative Aptitude',
    mk: 'quant',
    role: 'fill',
    lesson: { title: 'Percentage', desc: 'Basic percentage rules', topics: 'Percentage change' }
  });
  assert.ok(prompt.indexOf('2500-4000 words') !== -1, prompt.slice(0, 200));
  assert.strictEqual(prompt.indexOf('After the HTML output exactly this line'), -1);
  assert.ok(prompt.indexOf('practice questions are generated in a separate pass') !== -1);
});

ok('question prompt asks for a standalone JSON array', function () {
  const prompt = expand.questionsPrompt({
    examName: 'SSC CGL',
    modName: 'Quantitative Aptitude',
    mk: 'quant',
    lesson: { title: 'Percentage', desc: 'Basic percentage rules', topics: 'Percentage change' }
  }, '<h3>Percentage</h3><p>Part = rate x whole.</p>');
  assert.ok(prompt.indexOf('Return ONLY a JSON array') !== -1);
  assert.ok(prompt.indexOf('Percentage') !== -1);
});

console.log('\n' + passed + ' tests passed');
