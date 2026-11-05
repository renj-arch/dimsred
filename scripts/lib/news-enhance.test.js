'use strict';
// Tests for js/news-enhance.js. The study layer must stay extractive: every
// key point is a sentence from the publisher summary, and every term chip has
// a stable definition.

var assert = require('assert');
var N = require('../../js/news-enhance.js');

var pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('PASS  ' + name); }
  catch (e) { fail++; console.log('FAIL  ' + name + ': ' + e.message); }
}

test('key points are exact summary sentences', function () {
  var summary = 'The RBI kept the repo rate unchanged. Food inflation remains above the target. Transmission is improving.';
  var points = N.keyPoints({ summary: summary });
  assert.strictEqual(points.length, 3);
  points.forEach(function (p) { assert.ok(summary.indexOf(p.replace('…', '')) !== -1); });
});

test('no summary means no key points', function () {
  assert.deepStrictEqual(N.keyPoints({ summary: '' }), []);
  assert.deepStrictEqual(N.keyPoints({ summary: 'too short' }), []);
});

test('economy story maps to GS3 economy', function () {
  var a = N.angles({ title: 'RBI holds repo rate as inflation eases', summary: 'The MPC kept the repo rate unchanged.' });
  assert.strictEqual(a[0].paper, 'GS3');
  assert.ok(/Economy/.test(a[0].subject));
});

test('RBI governor is not misread as a state governor', function () {
  var a = N.angles({ title: 'RBI governor speaks on inflation', summary: 'The RBI governor said inflation is easing.' });
  assert.ok(a.every(function (x) { return x.subject !== 'Polity & Constitution'; }));
});

test('climate story maps to environment', function () {
  var a = N.angles({ title: 'COP summit agrees on adaptation finance', summary: 'Countries discussed climate adaptation and a carbon sink target.' });
  assert.ok(a.some(function (x) { return /Environment/.test(x.subject); }));
});

test('unknown story falls back to a current-affairs frame', function () {
  var a = N.angles({ title: 'A local fair opens', summary: 'People gathered for the annual event.' });
  assert.strictEqual(a[0].paper, 'Prelims');
});

test('terms are defined and limited', function () {
  var t = N.terms({ title: 'Repo rate and inflation', summary: 'The RBI kept the repo rate steady as inflation eased.' });
  assert.ok(t.length >= 2 && t.length <= 4);
  t.forEach(function (x) { assert.ok(x.def && x.def.length > 20); });
});

test('highlight escapes publisher HTML and circles a term', function () {
  var html = N.highlight('<script>alert(1)</script> inflation', ['inflation']);
  assert.ok(html.indexOf('<script>') === -1);
  assert.ok(html.indexOf('<mark class="kw"') !== -1);
  assert.ok(html.indexOf('&lt;script&gt;') !== -1);
});

test('analyze returns summaryHtml only from the supplied summary', function () {
  var a = N.analyze({ title: 'Budget session', summary: 'The finance bill was introduced in Parliament.' });
  assert.ok(a.summaryHtml.indexOf('finance bill') !== -1);
  assert.ok(a.summaryHtml.indexOf('Parliament') !== -1);
  assert.ok(a.keyPoints.length >= 1);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
