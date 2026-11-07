// Repair the small HTML defects a local model makes, before the strict lesson
// validator sees the text. The depth run of 2026-11-07 generated nine usable
// sections and discarded every one for a single missing closing tag or an
// attribute on <ul>. Throwing away the lesson does not make it safer; closing
// the tag does.
//
// Rules: only the lesson whitelist survives. Attributes are dropped from every
// tag except a class list on <div>/<span>; <h2> becomes <h3>; stray closing
// tags are dropped; missing closing tags are appended in stack order. The
// result is then checked by expand-course.js's validateHtml as before.
const ALLOWED_CLASSES = {
  'example-box': 1, 'ex-title': 1, 'ex-text': 1, 'ex-soln': 1,
  'tip-box': 1, 'tip-title': 1, 'tip-text': 1
};
const BLOCK_TAGS = { p: 1, div: 1, ul: 1, ol: 1, li: 1, h3: 1, h4: 1 };

function stripAttrs(html) {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, function (m, rawTag, attrs) {
      var tag = rawTag.toLowerCase();
      if (tag === 'h2') tag = 'h3';
      if (tag !== 'div' && tag !== 'span') return '<' + tag + '>';
      var cm = /class\s*=\s*"([^"]*)"/i.exec(attrs || '');
      if (!cm) return '<' + tag + '>';
      var cls = String(cm[1]).split(/\s+/).filter(function (c) { return c && ALLOWED_CLASSES[c]; });
      return cls.length ? '<' + tag + ' class="' + cls.join(' ') + '">' : '<' + tag + '>';
    })
    .replace(/<\/(h2)>/gi, '</h3>');
}

function balance(html) {
  var re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
  var stack = [];
  var out = '';
  var last = 0;
  var m;
  while ((m = re.exec(html))) {
    out += html.slice(last, m.index);
    var closing = m[1] === '/';
    var tag = m[2].toLowerCase();
    if (!BLOCK_TAGS[tag]) {
      out += m[0];
    } else if (!closing) {
      stack.push(tag);
      out += m[0];
    } else {
      var at = stack.lastIndexOf(tag);
      if (at === -1) {
        // Stray closer: drop it rather than let it close an outer block.
      } else {
        while (stack.length - 1 > at) out += '</' + stack.pop() + '>';
        out += '</' + tag + '>';
        stack.pop();
      }
    }
    last = re.lastIndex;
  }
  out += html.slice(last);
  while (stack.length) out += '</' + stack.pop() + '>';
  return out;
}

function sanitize(html) {
  return balance(stripAttrs(html)).trim();
}

module.exports = { sanitize: sanitize, stripAttrs: stripAttrs, balance: balance };
