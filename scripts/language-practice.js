'use strict';
// Client-side script checker for the UPSC Mains Paper A language pages.
// It is intentionally dumb: it counts characters inside the expected Unicode
// ranges and flags Latin letters. It cannot check grammar, meaning or register.
(function () {
  function initOne(root) {
    var input = root.querySelector('textarea');
    var out = root.querySelector('[data-script-output]');
    var clear = root.querySelector('[data-script-clear]');
    if (!input || !out) return;

    var ranges = [];
    try {
      ranges = JSON.parse(root.getAttribute('data-ranges') || '[]');
    } catch (e) {
      ranges = [];
    }
    var name = root.getAttribute('data-script-name') || 'the expected script';

    function inRanges(cp) {
      for (var i = 0; i < ranges.length; i++) {
        if (cp >= ranges[i][0] && cp <= ranges[i][1]) return true;
      }
      return false;
    }

    function isPunctuation(ch) {
      return /[\s.,;:!?()[\]{}"'“”‘’—–\-…।॥]/.test(ch);
    }

    function update() {
      var text = input.value;
      var script = 0;
      var latin = 0;
      var other = 0;
      var total = 0;
      for (var i = 0; i < text.length; i++) {
        var cp = text.codePointAt(i);
        if (cp > 0xFFFF) i++;
        var ch = String.fromCodePoint(cp);
        if (isPunctuation(ch)) continue;
        total++;
        if (inRanges(cp)) script++;
        else if ((cp >= 0x41 && cp <= 0x5A) || (cp >= 0x61 && cp <= 0x7A)) latin++;
        else other++;
      }

      var pct = total ? Math.round((script / total) * 100) : 0;
      var msg;
      if (!total) {
        msg = 'Paste or type an answer to check its script.';
      } else {
        msg = pct + '% ' + name + ' characters';
        if (latin) msg += ' · ' + latin + ' Latin letter' + (latin === 1 ? '' : 's') + ' — remove them';
        if (other) msg += ' · ' + other + ' other character' + (other === 1 ? '' : 's');
        if (pct < 60) msg += ' · this does not look like ' + name;
      }
      out.textContent = msg;
      out.className = 'script-meter' + (total ? (pct >= 90 && !latin ? ' ok' : ' warn') : '');
    }

    input.addEventListener('input', update);
    if (clear) {
      clear.addEventListener('click', function () {
        input.value = '';
        update();
        input.focus();
      });
    }
    update();
  }

  function init() {
    var roots = document.querySelectorAll('[data-script-check]');
    for (var i = 0; i < roots.length; i++) initOne(roots[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
