'use strict';
// Models echo the internal anchor id into the visible heading text:
//
//   <h2 id="deep-1">Deep-1: Taxonomy of RC Question Types</h2>
//   <h2>Section 2: Federalism, Executive Systems</h2>
//
// The id is needed for in-page links; the label is scaffolding and must never
// reach a reader. This helper removes only a leading "Deep|Section|Part N"
// label, leaving the id attribute and every other heading untouched.
//
// Deliberately conservative: a heading that merely starts with a number
// ("1857: The Revolt") or names a section without a separator
// ("Section 1 of the RBI Act") is left alone.

// "Deep-1:", "Deep‑1:", "Deep 1.", "Section 3:", "Part 2 —", "SECTION 4)"
const PREFIX = /^\s*(?:Deep|Section|Part)\s*[\u2010-\u2015\u2212-]?\s*\d+\s*(?:[:.)\u2013\u2014-]|\s-\s)\s*/i;

function stripHeadingPrefix(text) {
  const s = String(text == null ? '' : text);
  const next = s.replace(PREFIX, '');
  // Never return an empty heading: if the label was the whole text, keep it.
  return next.trim() ? next : s;
}

function stripHeadingPrefixes(html) {
  return String(html == null ? '' : html).replace(
    /(<h([1-6])\b[^>]*>)([\s\S]*?)(<\/h\2>)/gi,
    function (all, open, level, inner, close) {
      return open + stripHeadingPrefix(inner) + close;
    }
  );
}

module.exports = {
  PREFIX: PREFIX,
  stripHeadingPrefix: stripHeadingPrefix,
  stripHeadingPrefixes: stripHeadingPrefixes
};
