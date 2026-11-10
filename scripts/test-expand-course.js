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

ok('validator accepts a complete lesson with a comparison table', function () {
  assert.strictEqual(expand.validateHtml(lessonHtml(3)), null);
});

ok('validator accepts two advanced sections for the depth lane', function () {
  assert.strictEqual(expand.validateHtml(lessonHtml(2), { minH3: 2 }), null);
});

ok('validator still rejects two sections for a full lesson', function () {
  assert.ok(/needs at least 3 <h3>/.test(expand.validateHtml(lessonHtml(2))));
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
  assert.ok(prompt.indexOf('1200-1600 words') !== -1, prompt.slice(0, 200));
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
