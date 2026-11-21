'use strict';
// Guards for the invented-figure store.
//
// The model writes the items for a figure, so the store is the only thing
// standing between a plausible-sounding answer and a broken diagram published
// into figures/index.html. These tests pin the behaviours the pipeline depends
// on: geometry is clamped into the 760x420 sheet, unreadable arrangements are
// refused, and the store never hands the library something the renderer will
// choke on.

const assert = require('assert');
const path = require('path');
const store = require('./figure-store');

const ROOT = path.resolve(__dirname, '..', '..');

function good() {
  return {
    id: 'unit-flow',
    title: 'Unit flow of a three-stage process',
    paper: 'GS1',
    tag: 'Geography',
    intro: 'A test figure.',
    items: [
      { type: 'box', x: 40, y: 80, w: 180, h: 60, text: 'Stage one' },
      { type: 'box', x: 290, y: 80, w: 180, h: 60, text: 'Stage two' },
      { type: 'box', x: 540, y: 80, w: 180, h: 60, text: 'Stage three' },
      { type: 'arrow', x1: 220, y1: 110, x2: 290, y2: 110, label: 'then' },
      { type: 'arrow', x1: 470, y1: 110, x2: 540, y2: 110, label: 'then' },
      { type: 'text', x: 380, y: 40, text: 'A caption', size: 12 }
    ]
  };
}

// 1. A sane figure survives normalisation unchanged in substance.
{
  const fig = store.normalise(good(), 'unit-flow');
  assert.strictEqual(fig.id, 'unit-flow');
  assert.strictEqual(fig.paper, 'GS1');
  assert.strictEqual(fig.items.length, 6);
  console.log('  a valid figure normalises (' + fig.items.length + ' items)');
}

// 2. Geometry outside the sheet is clamped, not published.
{
  const raw = good();
  raw.items[0] = { type: 'box', x: 900, y: 500, w: 180, h: 60, text: 'Off sheet' };
  const fig = store.normalise(raw, 'unit-clamp');
  const box = fig.items[0];
  assert.ok(box.x >= 0 && box.x + box.w <= store.W, 'box must be clamped horizontally');
  assert.ok(box.y >= 0 && box.y + box.h <= store.H, 'box must be clamped vertically');
  console.log('  out-of-sheet geometry is clamped');
}

// 3. Unknown item types are dropped rather than rendered.
{
  const raw = good();
  raw.items.push({ type: 'image', href: 'https://example.com/x.png' });
  raw.items.push({ type: 'script', text: '<script>' });
  const fig = store.normalise(raw, 'unit-drop');
  assert.strictEqual(fig.items.length, 6, 'unknown types must be dropped');
  assert.ok(!JSON.stringify(fig).includes('script'), 'no script payload may survive');
  console.log('  unknown item types dropped');
}

// 4. A label-free diagram is refused.
{
  const raw = good();
  raw.items = raw.items.filter(function (i) { return !i.text && !i.label; });
  raw.items.push({ type: 'circle', cx: 100, cy: 300, r: 20 });
  raw.items.push({ type: 'circle', cx: 200, cy: 300, r: 20 });
  assert.throws(function () { store.normalise(raw, 'unit-nolabels'); }, /at least 2 labels|at least 4 drawable/);
  console.log('  label-free diagrams refused');
}

// 5. Overlapping boxes are refused (the model likes to stack them).
{
  const raw = good();
  raw.items[1] = { type: 'box', x: 60, y: 90, w: 180, h: 60, text: 'On top' };
  assert.throws(function () { store.normalise(raw, 'unit-overlap'); }, /overlap/);
  console.log('  overlapping boxes refused');
}

// 6. Long labels are wrapped, because the renderer only breaks on newlines.
{
  const raw = good();
  raw.items[0].text = 'A very long label that would run straight out of its box';
  const fig = store.normalise(raw, 'unit-wrap');
  assert.ok(fig.items[0].text.indexOf('\n') !== -1, 'long label must wrap');
  console.log('  long labels wrap');
}

// 7. The store file lives where the docs say it does.
{
  assert.ok(store.FILE.endsWith(path.join('data', 'figures', 'invented.json')), 'store path drifted');
  assert.ok(store.FILE.startsWith(ROOT), 'store must live in the repo');
  console.log('  store path: ' + path.relative(ROOT, store.FILE));
}

console.log('\nall figure-store tests passed');