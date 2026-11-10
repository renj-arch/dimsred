// Repair the small HTML defects a local model makes, before the strict lesson
// validator sees the text. The depth run of 2026-11-07 generated nine usable
// sections and discarded every one for a single missing closing tag or an
// attribute on <ul>. Throwing away the lesson does not make it safer; closing
// the tag does.
//
// Rules: only the lesson whitelist survives. Attributes are dropped from every
// tag except a class list on <div>/<span>; <h1>/<h2> become <h3>; common
// sectioning wrappers become <div>; stray single-letter tags such as the <j>
// a model writes for "i < j" are escaped as text; missing closing tags are
// appended in stack order. The result is then checked by expand-course.js's
// validateHtml as before.
const ALLOWED_TAGS = {
  h3: 1, h4: 1, p: 1, ul: 1, ol: 1, li: 1, strong: 1, em: 1, br: 1,
  div: 1, span: 1, sup: 1, sub: 1,
  table: 1, caption: 1, thead: 1, tbody: 1, tr: 1, th: 1, td: 1
};
const BALANCE_TAGS = {
  p: 1, div: 1, ul: 1, ol: 1, li: 1, h3: 1, h4: 1,
  strong: 1, em: 1, span: 1, sup: 1, sub: 1,
  table: 1, caption: 1, thead: 1, tbody: 1, tr: 1, th: 1, td: 1
};
// Common wrappers a model reaches for even when the prompt says not to.
const TAG_MAP = {
  h1: 'h3', h2: 'h3', h5: 'h4', h6: 'h4',
  section: 'div', article: 'div', main: 'div', header: 'div', footer: 'div',
  blockquote: 'div', pre: 'span', code: 'span', kbd: 'span', samp: 'span',
  b: 'strong', i: 'em'
};
// Leave these for validateHtml to reject loudly. Repairing them would hide a
// genuinely unsafe reply.
const DANGEROUS_TAGS = {
  script: 1, style: 1, iframe: 1, img: 1, a: 1, object: 1, embed: 1,
  form: 1, input: 1, button: 1, link: 1, meta: 1, base: 1
};
const ALLOWED_CLASSES = {
  'example-box': 1, 'ex-title': 1, 'ex-text': 1, 'ex-soln': 1,
  'tip-box': 1, 'tip-title': 1, 'tip-text': 1
};

function escapeTag(text) {
  return String(text).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// The course pages do not load MathJax. Convert the LaTeX a model reaches for
// into plain text/Unicode so students do not see "$|A\rangle$" on the page.
// Delimiters are only stripped when the contents look mathematical, so prices
// such as "$5 and $10" are left alone.
const LATEX_SYMBOLS = {
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠',
  approx: '≈', equiv: '≡', propto: '∝', infty: '∞',
  partial: '∂', nabla: '∇', sum: 'Σ', prod: 'Π', int: '∫',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
  theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ',
  tau: 'τ', phi: 'φ', omega: 'ω',
  Delta: 'Δ', Gamma: 'Γ', Lambda: 'Λ', Pi: 'Π', Sigma: 'Σ',
  Phi: 'Φ', Omega: 'Ω',
  rightarrow: '→', to: '→', leftarrow: '←', leftrightarrow: '↔',
  Rightarrow: '⇒', implies: '⇒', iff: '⇔',
  langle: '⟨', rangle: '⟩', lvert: '|', rvert: '|',
  forall: '∀', exists: '∃', in: '∈', notin: '∉',
  subset: '⊂', cup: '∪', cap: '∩', degree: '°', circ: '°',
  prime: '′', ldots: '…', dots: '…', quad: ' ', qquad: ' '
};

function plainMath(html) {
  let s = String(html || '');
  s = s.replace(/\$([^$]*[\\^_{}][^$]*)\$/g, '$1');
  s = s.replace(/\$([a-zA-Z])\$/g, '$1');
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, '$1');
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, '$1');
  s = s.replace(/\\(?:frac)\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  s = s.replace(/\\(?:sqrt)\{([^{}]+)\}/g, '√($1)');
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|overline|vec|bar|hat)\{([^{}]+)\}/g, '$1');
  s = s.replace(/\\(?:left|right)\b/g, '');
  s = s.replace(/\\([a-zA-Z]+)/g, function (m, name) {
    return Object.prototype.hasOwnProperty.call(LATEX_SYMBOLS, name) ? LATEX_SYMBOLS[name] : name;
  });
  s = s.replace(/\\([{}%_&$#])/g, '$1');
  s = s.replace(/\\[,;! ]/g, ' ');
  s = s.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
  s = s.replace(/\^([0-9+-])/g, '<sup>$1</sup>');
  s = s.replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>');
  s = s.replace(/_([0-9])/g, '<sub>$1</sub>');
  return s;
}

function stripAttrs(html) {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, function (m, slash, rawTag, attrs) {
      const tag = rawTag.toLowerCase();
      if (DANGEROUS_TAGS[tag]) return m;
      const mapped = TAG_MAP[tag] || tag;
      if (!ALLOWED_TAGS[mapped]) {
        // A one-letter tag is almost always a math variable the model forgot
        // to escape (e.g. "i <j> k"). Keep the character as visible text.
        if (tag.length === 1) return escapeTag(m);
        // Other unknown tags are wrappers: drop the tag, keep its content.
        return '';
      }
      if (slash) return '</' + mapped + '>';
      if (mapped !== 'div' && mapped !== 'span') return '<' + mapped + '>';
      const cm = /class\s*=\s*["']([^"']*)["']/i.exec(attrs || '');
      if (!cm) return '<' + mapped + '>';
      const cls = String(cm[1]).split(/\s+/).filter(function (c) { return c && ALLOWED_CLASSES[c]; });
      return cls.length ? '<' + mapped + ' class="' + cls.join(' ') + '">' : '<' + mapped + '>';
    });
}

function balance(html) {
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
  const stack = [];
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(html))) {
    out += html.slice(last, m.index);
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (!BALANCE_TAGS[tag]) {
      out += m[0];
    } else if (!closing) {
      // Implicit closes the model relies on: a new cell closes the previous
      // cell, a new row closes any open cell, and a new list item closes the
      // previous item. Without this a table can end up nested inside itself.
      if ((tag === 'td' || tag === 'th') &&
          (stack[stack.length - 1] === 'td' || stack[stack.length - 1] === 'th')) {
        out += '</' + stack.pop() + '>';
      }
      if (tag === 'tr') {
        while (stack[stack.length - 1] === 'td' || stack[stack.length - 1] === 'th') {
          out += '</' + stack.pop() + '>';
        }
      }
      if (tag === 'li' && stack[stack.length - 1] === 'li') {
        out += '</' + stack.pop() + '>';
      }
      stack.push(tag);
      out += m[0];
    } else {
      const at = stack.lastIndexOf(tag);
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
  return balance(stripAttrs(plainMath(html))).trim();
}

module.exports = {
  sanitize: sanitize,
  stripAttrs: stripAttrs,
  balance: balance,
  plainMath: plainMath,
  ALLOWED_TAGS: ALLOWED_TAGS
};
