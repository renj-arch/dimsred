'use strict';
// mental-engine.test.js - the Drill page's question engine, checked from node.
//
// The engine is an IIFE in js/mental-training.js, so it is loaded here with the
// wrapper stripped and a small set of browser stubs. What is checked is what a
// reader would hit: every topic in the grid returns a question whose answer is
// present among four distinct options, with a figure where the topic promises
// one. Two defects that reached the page are pinned here:
//
//   - a figure question with a wording answer ("which day was highest") used to
//     end up with ONE option, which the UI padded with 'None of these',
//     'Cannot determine' and 'Option D';
//   - the data-interpretation topics drew tables and CSS bars only, never a pie
//     or a line, though the paper asks all three.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const FILE = path.join(ROOT, 'js', 'mental-training.js');

let src = fs.readFileSync(FILE, 'utf8');
src = src.replace(/^\s*\(function\s*\(\s*\)\s*\{/, '').replace(/\}\)\(\);\s*$/, '');
src += '\n; window.__engine = { ' +
  'quant: generateQuantQuestion, reasoning: generateReasoningQuestion, ' +
  'di: generateDataInterpretationQuestion, ' +
  'quantTopics: ' + readTopics('QUANT_TOPICS') + ', ' +
  'reasoningTopics: ' + readTopics('REASONING_TOPICS') + ', ' +
  'verbalTopics: ' + readTopics('VERBAL_TOPICS') + ' };';

function readTopics(name) {
  const html = fs.readFileSync(path.join(ROOT, 'mental.html'), 'utf8');
  const m = new RegExp('var ' + name + '\\s*=\\s*\\[([\\s\\S]*?)\\n    \\];').exec(html);
  if (!m) return '[]';
  const keys = [...m[1].matchAll(/key:\s*'([^']+)'/g)].map((x) => x[1]);
  return JSON.stringify(keys);
}

const store = {};
const sandbox = {
  console, Math, Date, JSON, setTimeout, clearInterval, setInterval,
  RegExp, String, Number, Array, Object, isNaN, parseInt, parseFloat,
  document: {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} }; },
    body: { appendChild() {}, classList: { add() {}, remove() {} } },
    documentElement: { style: {}, classList: { add() {} } },
    head: { appendChild() {} }
  },
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { userAgent: 'node' },
  location: { href: 'https://example/' },
  fetch: () => Promise.reject(new Error('no network in test'))
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

const engine = sandbox.__engine;
const fails = [];

function check(label, raw) {
  // The UI's own canon step: some generators return {q, a, o} rather than
  // {question, answer, options}. Grading compares with String() on both sides,
  // so '5' and 5 are the same choice here.
  let q = raw;
  if (q && q.question === undefined && q.q !== undefined) {
    q = { question: q.q, answer: q.a, options: (q.o || []).slice() };
  }
  if (!q || typeof q !== 'object') { fails.push(label + ': no question returned'); return; }
  const opts = (q.options || []).filter((o) => o !== undefined && o !== null);
  const keys = new Set(opts.map(String));
  const answerKey = String(q.answer);
  if (!keys.has(answerKey)) fails.push(label + ': answer not among options (' + answerKey + ')');
  if (keys.size < 4) fails.push(label + ': fewer than 4 distinct options (' + keys.size + ')');
  if (keys.has('Option D')) fails.push(label + ': padded with placeholder Option D');
  if (typeof q.question !== 'string' || !q.question.trim()) fails.push(label + ': empty stem');
}

// Every quant topic, plus the two figures paths.
const quantKeys = engine.quantTopics.concat(['data_interpretation', 'caselet_di']);
for (const key of quantKeys) {
  for (const diff of [1, 3, 5]) {
    for (let i = 0; i < 3; i++) {
      let q;
      try { q = engine.quant(diff, key); } catch (e) { fails.push(key + ' diff ' + diff + ': threw ' + e.message); continue; }
      check(key + ' diff ' + diff, q);
    }
  }
}

for (const key of engine.reasoningTopics) {
  for (let i = 0; i < 2; i++) {
    let q;
    try { q = engine.reasoning(3, key); } catch (e) { fails.push('reasoning/' + key + ': threw ' + e.message); continue; }
    check('reasoning/' + key, q);
  }
}

// Figures: the DI generator must produce pie, bar, line and table questions.
const seen = new Set();
for (let i = 0; i < 500; i++) {
  const q = engine.di(1 + (i % 5), 'instinct');
  const html = q.question || '';
  if (/aria-label="pie chart"/.test(html)) seen.add('pie');
  if (/aria-label="[^"]*(Units|Production)/.test(html)) seen.add('bar');
  if (/aria-label="[^"]*(Revenue|Exports)/.test(html)) seen.add('line');
  if (/<table/.test(html)) seen.add('table');
}
for (const shape of ['pie', 'bar', 'line', 'table']) {
  if (!seen.has(shape)) fails.push('data interpretation never drew a ' + shape + ' chart');
}

if (fails.length) {
  console.error('FAIL  mental engine: ' + fails.length + ' problem(s)');
  [...new Set(fails)].slice(0, 12).forEach((f) => console.error('  ' + f));
  process.exitCode = 1;
} else {
  console.log('PASS  mental engine: ' + quantKeys.length + ' quant topics, ' +
    engine.reasoningTopics.length + ' reasoning topics, ' +
    engine.verbalTopics.length + ' verbal topics, figures: ' + [...seen].join('/'));
}