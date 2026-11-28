'use strict';
// Regression suite for static MCQ handlers.
//
// Seven course lessons shipped option clicks that could not work: five named
// a function the page never defined (selectOption, selOpt, selectOpt,
// checkAnswer), and two called an id-first selectOpt(qId, idx) runtime with
// `this`, so the element became the question id. Nothing failed at load time;
// the buttons were simply dead. This suite:
//
//   1. exercises js/quiz-static.js against a tiny fake DOM,
//   2. scans every tracked HTML file for element-first handlers and proves a
//      compatible definition exists,
//   3. proves pages using the shared helper actually load it.
//
//   node scripts/lib/quiz-handlers.test.js
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const read = function (rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); };

let pass = 0, fail = 0;
function assert(ok, label, detail) {
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok || !detail ? '' : '\n        ' + detail));
}

const NAMES = ['selectOption', 'selectOpt', 'selOpt', 'selectStaticOpt', 'checkAnswer', 'checkAns'];
const ELEMENT_PARAM = /^(el|elem|element|e|opt|option|btn|button|node|target|self|td|div)$/i;

function classList() {
  const set = new Set();
  return {
    add: function (c) { set.add(c); },
    remove: function (c) { set.delete(c); },
    contains: function (c) { return set.has(c); }
  };
}

function fakeCard(handlers) {
  const attrs = {};
  const soln = { classList: classList() };
  const opts = handlers.map(function (handler) {
    return {
      classList: classList(),
      getAttribute: function (k) { return k === 'onclick' ? handler : null; },
      parentNode: null
    };
  });
  const card = {
    classList: classList(),
    // cardOf() walks up to the .q-card ancestor; the fake must advertise it.
    // (set below, after the object exists)
    getAttribute: function (k) { return attrs[k] == null ? null : attrs[k]; },
    setAttribute: function (k, v) { attrs[k] = String(v); },
    querySelectorAll: function (sel) { return sel === '.q-opt' ? opts : []; },
    querySelector: function (sel) { return sel === '.q-soln' ? soln : null; }
  };
  card.classList.add('q-card');
  opts.forEach(function (o) { o.parentNode = card; });
  return { card: card, opts: opts, soln: soln };
}

console.log('--- js/quiz-static.js ---');
(function () {
  const src = read('js/quiz-static.js');
  let parses = true, err = '';
  try { new Function('window', 'document', src); } catch (e) { parses = false; err = e.message; }
  assert(parses, 'the helper parses', err);
  const window = {};
  const QuizStatic = new Function('window', 'document', src + '\nreturn window.QuizStatic;')(window, {});
  assert(QuizStatic && typeof QuizStatic.answer === 'function', 'exports answer()');
  assert(QuizStatic && typeof QuizStatic.checkLetter === 'function', 'exports checkLetter()');

  const wrongFirst = fakeCard([
    "selectOption(this,1,'wrong')",
    "selectOption(this,2,'correct')",
    "selectOption(this,3,'wrong')"
  ]);
  assert(QuizStatic.answer(wrongFirst.opts[0], false) === true, 'answer() accepts a wrong choice');
  assert(wrongFirst.opts[0].classList.contains('wrong'), 'the clicked wrong option is marked wrong');
  assert(wrongFirst.opts[1].classList.contains('correct'), 'the marked correct option is revealed');
  assert(wrongFirst.soln.classList.contains('show'), 'the solution is shown');
  assert(wrongFirst.opts.every(function (o) { return o.classList.contains('disabled'); }), 'all options are locked');
  assert(QuizStatic.answer(wrongFirst.opts[2], true) === false, 'a second answer on the same card is ignored');

  const boolRight = fakeCard(['selectOpt(this,false)', 'selectOpt(this,true)']);
  assert(QuizStatic.answer(boolRight.opts[1], true) === true, 'boolean handlers mark a correct choice');
  assert(boolRight.opts[1].classList.contains('correct'), 'the clicked correct option is marked correct');
  assert(!boolRight.opts[0].classList.contains('correct'), 'false options stay neutral');

  const letterWrong = fakeCard(["checkAnswer(this,'b')", "checkAnswer(this,'b')", "checkAnswer(this,'b')"]);
  assert(QuizStatic.checkLetter(letterWrong.opts[0], 'b') === true, 'checkLetter() accepts a letter');
  assert(letterWrong.opts[0].classList.contains('wrong'), 'a wrong letter is marked wrong');
  assert(letterWrong.opts[1].classList.contains('correct'), 'the correct letter is revealed');

  const letterRight = fakeCard(["checkAnswer(this,'b')", "checkAnswer(this,'b')"]);
  assert(QuizStatic.checkLetter(letterRight.opts[1], 'b') === true, 'checkLetter() handles the right answer');
  assert(letterRight.opts[1].classList.contains('correct') && !letterRight.opts[0].classList.contains('wrong'),
    'the right answer does not mark a wrong option');
})();

function scriptsFor(html, file) {
  const texts = [html];
  const re = /<script\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html))) {
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(m[1] || '');
    if (!src) continue;
    const rel = src[1].split('?')[0].split('#')[0];
    if (/^https?:|\/\//i.test(rel)) continue;
    const p = path.resolve(path.dirname(path.join(ROOT, file)), rel.replace(/^\//, ''));
    try { texts.push(fs.readFileSync(p, 'utf8')); } catch (e) { /* audit-site checks links */ }
  }
  return texts;
}

function definitions(texts) {
  const defs = {};
  NAMES.forEach(function (name) {
    texts.forEach(function (text) {
      const re = new RegExp('function\\s+' + name + '\\s*\\(([^)]*)\\)|' +
        '\\b' + name + '\\s*=\\s*(?:async\\s*)?function\\s*\\(([^)]*)\\)', 'g');
      let m;
      while ((m = re.exec(text))) defs[name] = (m[1] != null ? m[1] : m[2]).replace(/\s+/g, ' ').trim();
    });
  });
  return defs;
}

console.log('\n--- every element-first handler has a compatible definition ---');
const files = cp.execFileSync('git', ['ls-files', '*.html'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split(/\r?\n/).filter(Boolean);
const dead = [];
const mismatched = [];
const helperPages = [];

files.forEach(function (file) {
  const html = read(file);
  const noScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  const defs = definitions(scriptsFor(html, file));
  NAMES.forEach(function (name) {
    const re = new RegExp('on\\w+\\s*=\\s*["\'][^"\']*?\\b' + name + '\\s*\\(\\s*this\\b', 'gi');
    if (!re.test(noScripts)) return;
    if (html.indexOf('QuizStatic') !== -1 || html.indexOf('quiz-static.js') !== -1) helperPages.push(file);
    const def = defs[name];
    if (def == null) {
      dead.push(file + ' :: ' + name + '(this, ...) has no definition');
      return;
    }
    const firstParam = def.split(',')[0].trim();
    if (!ELEMENT_PARAM.test(firstParam)) {
      mismatched.push(file + ' :: ' + name + '(' + def + ') called with this');
    }
  });
});

assert(dead.length === 0, 'no element-first handler is undefined', dead.slice(0, 10).join('\n        '));
assert(mismatched.length === 0, 'no element-first handler points at an id-first signature', mismatched.slice(0, 10).join('\n        '));
assert(helperPages.length >= 7, 'the repaired lessons are detected', helperPages.length + ' page(s)');

console.log('\n--- pages using the shared helper load it ---');
const unlinked = helperPages.filter(function (file) {
  return read(file).indexOf('quiz-static.js') === -1;
});
assert(unlinked.length === 0, 'every helper page links js/quiz-static.js', unlinked.join(', '));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
