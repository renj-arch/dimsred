// fig-svg.js — fail-closed SVG gate for figures attached to questions.
//
// Question figures are written by the site's own CI agents (qwen3.8:27b
// practice sets, validated server-side in site-agent.js before storage) and
// stored as raw SVG strings in the set JSON. This is the second, client-side
// gate: if anything executable or exotic slipped past the server filter, the
// figure is dropped and the question still renders without it. Pages that do
// not load this file simply never show question figures (fail closed).
//
// Loaded before consumers (js/ssc-je-training.js, js/exam-tutor.js,
// mega-test.html). Usage: window.VlymbooqFig.toSafeSvg(rawSvgString) -> '' |
// sanitized '<svg ...>...</svg>'.
(function () {
  'use strict';
  var MAX = 8000;
  function toSafeSvg(raw) {
    if (!raw) return '';
    var s = String(raw);
    if (s.length > MAX) return '';
    var m = s.match(/<svg[\s\S]*?<\/svg>/i);
    if (!m) return '';
    s = m[0];
    if (!/^<svg/i.test(s)) return '';
    if (!/viewBox\s*=\s*["']?[-\d.]/.test(s)) return '';
    // No scripts, no event handlers, no external refs, no embedded media.
    if (/<script|on[a-z]+\s*=|javascript:|<image|href\s*=|xlink|data:|<foreignObject|<!\[CDATA|<iframe|<use|<animate/i.test(s)) return '';
    return s;
  }
  window.VlymbooqFig = { toSafeSvg: toSafeSvg };
})();
