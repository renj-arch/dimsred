/* Static MCQ handlers shared by the course lesson pages.
 *
 * The lesson generator emits options as element-first inline handlers:
 *   selectOption(this, 1, 'correct')   /   selOpt(this, true)
 *   selectOpt(this, false)             /   checkAnswer(this, 'b')
 * Some lessons also carry a separate, id-first quiz runtime such as
 * selectOpt(qId, idx). Those two calling conventions cannot share one
 * implementation, which is how three pages ended up with click handlers that
 * called a function nothing defined, and two more called the dynamic function
 * with an element where it expected an id.
 *
 * This module owns the element-first contract. It never trusts a global answer
 * key: the correct option is read from the same markup the handler came from
 * (`,true)` or `,'correct')`), and the existing .q-opt/.q-soln CSS does the
 * feedback. Pages keep tiny aliases so generated markup needs no rewrite.
 */
(function () {
  'use strict';

  function cardOf(el) {
    var node = el;
    while (node && node !== document) {
      if (node.classList && node.classList.contains('q-card')) return node;
      node = node.parentNode;
    }
    return null;
  }

  // One answer per question. pointer-events:none is cosmetic (keyboard and
  // synthetic clicks still get through), so the card carries the real latch.
  function lock(card) {
    if (card.getAttribute('data-answered') === '1') return false;
    card.setAttribute('data-answered', '1');
    var opts = card.querySelectorAll('.q-opt');
    for (var i = 0; i < opts.length; i++) opts[i].classList.add('disabled');
    return true;
  }

  function markedCorrect(card) {
    var opts = card.querySelectorAll('.q-opt');
    for (var i = 0; i < opts.length; i++) {
      var handler = opts[i].getAttribute('onclick') || '';
      if (/,\s*true\s*\)/.test(handler) || /,\s*['"]correct['"]\s*\)/.test(handler)) return opts[i];
    }
    return null;
  }

  function showSolution(card) {
    var soln = card.querySelector('.q-soln');
    if (soln) soln.classList.add('show');
  }

  // Boolean-style handlers: selectOpt(this, true/false), selOpt(...), and
  // selectOption(this, index, 'correct'|'wrong').
  function answer(el, isCorrect) {
    var card = cardOf(el);
    if (!card || !lock(card)) return false;
    el.classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      var right = markedCorrect(card);
      if (right) right.classList.add('correct');
    }
    showSolution(card);
    return true;
  }

  // Letter-style handlers: checkAnswer(this, 'b'). The options are emitted in
  // a/b/c/d order, so the letter maps directly to the sibling index.
  function checkLetter(el, letter) {
    var card = cardOf(el);
    if (!card || !lock(card)) return false;
    var opts = card.querySelectorAll('.q-opt');
    var index = String(letter || '').toLowerCase().charCodeAt(0) - 97;
    var mine = Array.prototype.indexOf.call(opts, el);
    var right = opts[index] || null;
    if (mine === index) el.classList.add('correct');
    else {
      el.classList.add('wrong');
      if (right) right.classList.add('correct');
    }
    showSolution(card);
    return true;
  }

  window.QuizStatic = { answer: answer, checkLetter: checkLetter };
})();
