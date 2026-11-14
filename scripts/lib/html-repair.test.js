const assert = require('assert');
const repair = require('./html-repair');

function balanced(html, tag) {
  const o = (html.match(new RegExp('<' + tag + '\\b', 'g')) || []).length;
  const c = (html.match(new RegExp('</' + tag + '>', 'g')) || []).length;
  return o === c;
}

let h = repair.sanitize('<h3>A</h3><p>one<p>two<p>three<p>four<p>five');
assert(balanced(h, 'p'), 'missing </p> is repaired');
assert.strictEqual((h.match(/<p\b/g) || []).length, 5);

h = repair.sanitize('<div class="example-box"><div class="ex-text">q</div><div class="ex-soln">a</div>');
assert(balanced(h, 'div'), 'missing </div> is repaired');
assert(h.indexOf('class="example-box"') !== -1, 'allowed classes survive');
assert(h.indexOf('class="ex-soln"') !== -1, 'allowed classes survive');

h = repair.sanitize('<ul class="nav"><li>a</li></ul><p style="color:red">x</p>');
assert.strictEqual(h, '<ul><li>a</li></ul><p>x</p>', 'disallowed attributes are dropped');

h = repair.sanitize('<h2>Topic</h2><p>x</p>');
assert.strictEqual(h, '<h3>Topic</h3><p>x</p>', 'h2 is normalised to h3');

h = repair.sanitize('<p>a</p></div><p>b</p>');
assert.strictEqual((h.match(/<\/div>/g) || []).length, 0, 'stray closer is dropped');
assert(balanced(h, 'p'), 'stray closer does not unbalance the rest');

console.log('PASS  html repair: closes tags, strips attributes, normalises headings');
