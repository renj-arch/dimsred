'use strict';
// The figure library is generated from scripts/build-figure-library.js. These
// tests protect the two things that can silently rot: a diagram that renders
// broken SVG, and a coverage row that points at a figure which no longer
// exists (which is how a "fully covered" claim becomes a lie).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const lib = require('../build-figure-library');

const ROOT = path.resolve(__dirname, '..', '..');
const PAGE = path.join(ROOT, 'figures.html');
const html = fs.readFileSync(PAGE, 'utf8');

// The fourteen hand-built cards that predate the generator.
const BASE_IDS = [
  'monsoon', 'plate-boundaries', 'rock-cycle', 'soil-profile', 'el-nino', 'water-cycle',
  'law-making', 'federal-lists', 'separation-powers',
  'monetary-transmission', 'inflation-types', 'carbon-cycle', 'budget-cycle',
  'ethical-decision'
];

const specIds = lib.SPECS.map(function (s) { return s.id; });

// 1. ids are unique and kebab-case.
assert.strictEqual(new Set(specIds).size, specIds.length, 'duplicate figure id');
specIds.forEach(function (id) {
  assert.ok(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id), 'not kebab-case: ' + id);
});

// 2. every generated card renders valid-looking, self-contained SVG.
const cards = lib.renderCards();
lib.SPECS.forEach(function (spec) {
  assert.ok(cards.indexOf('id="fig-' + spec.id + '"') !== -1, 'missing card for ' + spec.id);
  const svg = (cards.match(new RegExp('<article[^>]*id="fig-' + spec.id + '"[\\s\\S]*?</article>')) || [''])[0];
  const body = (svg.match(/<svg[\s\S]*?<\/svg>/) || [''])[0];
  assert.ok(body, 'no svg in ' + spec.id);
  assert.ok(body.indexOf('role="img"') !== -1, 'svg lacks role=img: ' + spec.id);
  assert.ok(/aria-label="[^"]+"/.test(body), 'svg lacks aria-label: ' + spec.id);
  assert.ok(body.indexOf('undefined') === -1, 'undefined leaked into ' + spec.id);
  assert.ok(body.indexOf('NaN') === -1, 'NaN leaked into ' + spec.id);
  assert.ok(!/<script/i.test(body), 'script in ' + spec.id);
  assert.ok(!/https?:/.test(body), 'external reference in ' + spec.id);

  ['svg', 'g', 'defs', 'marker', 'filter', 'text', 'tspan'].forEach(function (tag) {
    const open = (body.match(new RegExp('<' + tag + '\\b', 'g')) || []).length;
    const close = (body.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    assert.strictEqual(open, close, 'unbalanced <' + tag + '> in ' + spec.id + ' (' + open + '/' + close + ')');
  });
  // Void shapes must be self-closing and must never carry a closing tag.
  ['rect', 'path', 'circle'].forEach(function (tag) {
    const open = (body.match(new RegExp('<' + tag + '\\b', 'g')) || []).length;
    const closed = (body.match(new RegExp('<' + tag + '\\b[^>]*/>', 'g')) || []).length;
    assert.strictEqual(open, closed, 'unclosed <' + tag + '/> in ' + spec.id + ' (' + open + '/' + closed + ')');
    assert.ok(!new RegExp('</' + tag + '>').test(body), 'stray </' + tag + '> in ' + spec.id);
  });

  // Shapes must stay inside the viewBox, or they are clipped in print.
  const nums = body.match(/(?:x|cx|x1|x2)="(-?\d+(?:\.\d+)?)"/g) || [];
  nums.forEach(function (attr) {
    const v = parseFloat(attr.split('"')[1]);
    assert.ok(v >= 0 && v <= 760, 'shape outside viewBox horizontally in ' + spec.id + ': ' + v);
  });
});

// 3. the coverage map resolves: every link exists, every figure is mapped.
const known = new Set(BASE_IDS.concat(specIds));
const mapped = new Set();
Object.keys(lib.COVERAGE).forEach(function (paper) {
  assert.ok(lib.COVERAGE[paper].length > 0, 'no themes for ' + paper);
  lib.COVERAGE[paper].forEach(function (row) {
    assert.ok(row.figs.length > 0, 'theme without a figure: ' + row.theme);
    row.figs.forEach(function (id) {
      assert.ok(known.has(id), 'coverage points at a missing figure: ' + id);
      assert.ok(html.indexOf('id="fig-' + id + '"') !== -1, 'anchor missing in figures.html: ' + id);
      mapped.add(id);
    });
  });
});
specIds.concat(BASE_IDS).forEach(function (id) {
  assert.ok(mapped.has(id), 'figure not reachable from the coverage map: ' + id);
});

// 4. the page really contains every card, and the stats agree with it.
known.forEach(function (id) {
  assert.ok(html.indexOf('id="fig-' + id + '"') !== -1, 'card missing from figures.html: ' + id);
});
const cardCount = (html.match(/<article class="fig-card"/g) || []).length;
assert.strictEqual(cardCount, known.size, 'card count ' + cardCount + ' != known figures ' + known.size);
assert.ok(html.indexOf('<b>' + cardCount + '</b>core diagrams') !== -1, 'stats do not match the card count');

// 5. generation is deterministic, so a rebuild is a no-op.
assert.strictEqual(lib.renderCards(), cards, 'card rendering is not deterministic');

console.log('PASS  figure library: ' + known.size + ' figures, ' +
  Object.keys(lib.COVERAGE).reduce(function (n, p) { return n + lib.COVERAGE[p].length; }, 0) +
  ' syllabus themes, all anchors resolve');
