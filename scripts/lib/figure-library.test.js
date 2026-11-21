'use strict';
// The figure library is generated from scripts/lib/upsc-svg-figures.js (the
// fourteen originals) plus scripts/lib/upsc-figure-specs.js (the generated
// specs). These tests protect the things that can silently rot:
//
//   - a diagram that renders broken SVG or drifts outside its viewBox;
//   - a coverage row that points at a figure which no longer exists, which is
//     how a "fully covered" claim becomes a lie;
//   - the two-URL split coming back (figures.html must stay a redirect);
//   - a stale figures/index.html that no longer carries every card.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const FIGLIB = require('../lib/upsc-svg-figures');
const SPECS = require('../lib/upsc-figure-specs');

const ROOT = path.resolve(__dirname, '..', '..');
const HUB = path.join(ROOT, 'figures', 'index.html');
const REDIRECT = path.join(ROOT, 'figures.html');

const FIGURES = FIGLIB.FIGURES;
const ids = FIGURES.map(function (f) { return f.id; });
const known = new Set(ids);

// 1. ids are unique and kebab-case.
assert.strictEqual(known.size, ids.length, 'duplicate figure id');
ids.forEach(function (id) {
  assert.ok(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id), 'not kebab-case: ' + id);
});

// 2. every figure has a title, paper, tag and at least one drawable item.
FIGURES.forEach(function (f) {
  assert.ok(f.title && f.title.length > 8, 'missing title: ' + f.id);
  assert.ok(['GS1', 'GS2', 'GS3', 'GS4'].indexOf(f.paper) !== -1, 'bad paper: ' + f.id);
  assert.ok(f.tag && f.tag.length > 2, 'missing tag: ' + f.id);
  assert.ok(Array.isArray(f.items) && f.items.length >= 4, 'too few items: ' + f.id);
  f.items.forEach(function (it) {
    assert.ok(['box', 'pill', 'arrow', 'circle', 'path', 'line', 'text'].indexOf(it.type) !== -1,
      'unknown item type in ' + f.id + ': ' + it.type);
  });
});

// 3. every card renders self-contained, balanced SVG that stays in the viewBox.
FIGURES.forEach(function (f) {
  const body = FIGLIB.svg({ id: f.id, w: 760, h: 420, aria: f.title, items: f.items });
  assert.ok(body.indexOf('role="img"') !== -1, 'svg lacks role=img: ' + f.id);
  assert.ok(body.indexOf('aria-label="' + FIGLIB.esc(f.title) + '"') !== -1, 'svg lacks aria-label: ' + f.id);
  assert.ok(body.indexOf('undefined') === -1, 'undefined leaked into ' + f.id);
  assert.ok(body.indexOf('NaN') === -1, 'NaN leaked into ' + f.id);
  assert.ok(!/<script/i.test(body), 'script in ' + f.id);
  assert.ok(!/https?:/.test(body), 'external reference in ' + f.id);

  ['svg', 'g', 'defs', 'marker', 'filter', 'text', 'tspan'].forEach(function (tag) {
    const open = (body.match(new RegExp('<' + tag + '\\b', 'g')) || []).length;
    const close = (body.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    assert.strictEqual(open, close, 'unbalanced <' + tag + '> in ' + f.id + ' (' + open + '/' + close + ')');
  });
  ['rect', 'path', 'circle', 'line'].forEach(function (tag) {
    const open = (body.match(new RegExp('<' + tag + '\\b', 'g')) || []).length;
    const closed = (body.match(new RegExp('<' + tag + '\\b[^>]*/>', 'g')) || []).length;
    assert.strictEqual(open, closed, 'unclosed <' + tag + '/> in ' + f.id + ' (' + open + '/' + closed + ')');
  });

  f.items.forEach(function (it) {
    if (it.type === 'text') return;
    ['x', 'cx', 'x1', 'x2'].forEach(function (k) {
      if (it[k] == null) return;
      assert.ok(it[k] >= 0 && it[k] <= 760, 'shape outside viewBox horizontally in ' + f.id + ': ' + k + '=' + it[k]);
    });
    ['y', 'cy', 'y1', 'y2'].forEach(function (k) {
      if (it[k] == null) return;
      assert.ok(it[k] >= 0 && it[k] <= 420, 'shape outside viewBox vertically in ' + f.id + ': ' + k + '=' + it[k]);
    });
    if (it.type === 'box' || it.type === 'pill') {
      assert.ok(it.x + it.w <= 760, 'box overflows right edge in ' + f.id);
      assert.ok(it.y + it.h <= 420, 'box overflows bottom edge in ' + f.id);
    }
  });
});

// 4. the coverage map resolves: every link exists, every figure is mapped.
const mapped = new Set();
Object.keys(SPECS.COVERAGE).forEach(function (paper) {
  assert.ok(SPECS.COVERAGE[paper].length > 0, 'no themes for ' + paper);
  SPECS.COVERAGE[paper].forEach(function (row) {
    assert.ok(row.figs.length > 0, 'theme without a figure: ' + row.theme);
    row.figs.forEach(function (id) {
      assert.ok(known.has(id), 'coverage points at a missing figure: ' + id);
      mapped.add(id);
    });
  });
});
ids.forEach(function (id) {
  assert.ok(mapped.has(id), 'figure not reachable from the coverage map: ' + id);
});

// 5. the hub page carries every card and its stats agree with the specs.
assert.ok(fs.existsSync(HUB), 'figures/index.html is missing');
const html = fs.readFileSync(HUB, 'utf8');
ids.forEach(function (id) {
  assert.ok(html.indexOf('id="fig-' + id + '"') !== -1, 'card missing from figures/index.html: ' + id);
});
const cardCount = (html.match(/<article class="fig-card"/g) || []).length;
assert.strictEqual(cardCount, FIGURES.length, 'hub card count ' + cardCount + ' != figures ' + FIGURES.length);
assert.ok(html.indexOf('<b>' + FIGURES.length + '</b>ink diagrams') !== -1, 'hub stats do not match the figure count');
assert.ok(html.indexOf('<b>' + SPECS.THEME_COUNT + '</b>syllabus themes') !== -1, 'hub stats do not match the theme count');
assert.ok(html.indexOf('<section class="coverage"') !== -1, 'hub has no coverage map');

// 6. figures.html is a redirect, not a second gallery. This is the regression
// that split /figures and /figures/ into two different pages.
const redirect = fs.readFileSync(REDIRECT, 'utf8');
assert.ok(/http-equiv="refresh"[^>]*url=figures\//.test(redirect), 'figures.html is not a redirect to figures/');
assert.ok(redirect.indexOf('<article class="fig-card"') === -1, 'figures.html still contains a duplicate gallery');
assert.ok(redirect.indexOf('rel="canonical" href="https://vlymbooq.qzz.io/figures/"') !== -1, 'redirect lacks the canonical URL');

// 7. rendering is deterministic, so a rebuild is a no-op.
const again = FIGLIB.svg({ id: FIGURES[0].id, w: 760, h: 420, aria: FIGURES[0].title, items: FIGURES[0].items });
const once = FIGLIB.svg({ id: FIGURES[0].id, w: 760, h: 420, aria: FIGURES[0].title, items: FIGURES[0].items });
assert.strictEqual(again, once, 'figure rendering is not deterministic');

// 8. the forge output is current. A brief is the only input to a forged
// diagram, so editing one without re-running `node scripts/figure-forge.js`
// leaves the committed JSON and the published hub describing an older version
// of the brief. The scheduled workflow regenerates it, but a hand-edited brief
// on a normal PR would otherwise ship stale. Compare the re-render, not the
// file mtime, and never compare a timestamp: the output carries none.
const TEMPLATES = require('./figure-templates');
const briefs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'figure-briefs.json'), 'utf8'));
const forged = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'figure-forge.json'), 'utf8'));
const briefList = briefs.briefs || briefs;
assert.ok(Array.isArray(briefList) && briefList.length > 0, 'data/figure-briefs.json has no briefs');
assert.strictEqual(forged.figures.length, briefList.length,
  'figure-forge.json has ' + forged.figures.length + ' figures for ' + briefList.length + ' briefs; run the forge');
briefList.forEach(function (b) {
  const draw = TEMPLATES[b.template];
  assert.ok(draw, b.id + ': unknown template ' + b.template);
  const shipped = forged.figures.filter(function (f) { return f.id === b.id; })[0];
  assert.ok(shipped, b.id + ': brief has no forged figure; run the forge');
  assert.deepStrictEqual(shipped.items, draw(b),
    b.id + ': data/figure-forge.json is stale; run node scripts/figure-forge.js');
  assert.ok(known.has(b.id), b.id + ': forged figure missing from the library');
});
assert.strictEqual(forged.generated, undefined,
  'figure-forge.json carries a build timestamp; a daily rebuild would commit on every run');

console.log('PASS  figure library: ' + FIGURES.length + ' figures (' + briefList.length + ' forged), ' +
  SPECS.THEME_COUNT + ' syllabus themes, all anchors resolve, figures.html redirects to figures/');
