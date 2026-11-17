'use strict';
// Store for hand-drawn figures invented from course content.
//
// The library in scripts/lib/upsc-svg-figures.js was written by hand and is the
// reference for the inked style. Course lessons had no figures at all: nothing
// in the corpus linked to figures/svg-<id>.html, so a candidate reading a
// lesson never saw the diagram that explains it.
//
// Rather than editing that module on every expansion run (a tracked source
// file, rewritten by several agents), invented figures live here as data:
//
//   data/figures/invented.json  { "figures": [ { id, title, paper, tag, intro,
//                                                items, invented: {...} } ] }
//
// upsc-svg-figures.js appends this list to FIGURES at load, so an invented
// figure gets a card on figures/index.html and its own figures/svg-<id>.html
// page exactly like a hand-written one, with no extra wiring.
//
// Every figure is validated here against the same rules figure-library.test.js
// enforces, because the model writes the items and the model is not trusted:
// an item outside the 760x420 viewBox, an unknown type, or a NaN coordinate
// would render a broken diagram into the gallery.

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..', '..');
var FILE = path.join(ROOT, 'data', 'figures', 'invented.json');

var TYPES = { box: 1, pill: 1, arrow: 1, circle: 1, path: 1, line: 1, text: 1 };
var PAPERS = { GS1: 1, GS2: 1, GS3: 1, GS4: 1 };
var W = 760;
var H = 420;

function isNum(v) {
  return typeof v === 'number' && isFinite(v);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function load() {
  if (!fs.existsSync(FILE)) return { figures: [] };
  try {
    var doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (!Array.isArray(doc.figures)) return { figures: [] };
    return doc;
  } catch (e) {
    return { figures: [] };
  }
}

function save(doc) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(doc, null, 1) + '\n', 'utf8');
}

function kebab(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// Clamp a shape into the viewBox and drop the ones that cannot be repaired.
// Returns null when the item is unusable.
function wrapLabel(text, size) {
  // The renderer only breaks on \n, so a long label runs straight out of its
  // box. Wrap it here at roughly the character count a box of that width holds.
  const s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  if (s.indexOf('\n') !== -1) return s;
  const perLine = Math.max(8, Math.round((size ? 13 : 13) * 1.45));
  if (s.length <= perLine) return s;
  const mid = Math.ceil(s.length / perLine);
  const words = s.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line && (line + ' ' + w).length > perLine && lines.length < 2) {
      lines.push(line);
      line = w;
    } else {
      line = line ? line + ' ' + w : w;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

// A label that lands on top of another box is unreadable at exam-page size.
// Reject heavy overlap rather than shipping it: the caller retries the model.
function boxesOverlap(a, b) {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const ox = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const oy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  return ox * oy;
}

function assertNoOverlap(items) {
  const boxes = items.filter((i) => i.type === 'box' || i.type === 'pill');
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const area = Math.min(boxes[i].w * boxes[i].h, boxes[j].w * boxes[j].h);
      if (!area) continue;
      const overlap = boxesOverlap(boxes[i], boxes[j]);
      if (overlap / area > 0.15) {
        throw new Error('two boxes overlap (' + JSON.stringify(boxes[i].text || '') + ' / ' + JSON.stringify(boxes[j].text || '') + ')');
      }
    }
  }
}

function normaliseItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  var type = String(raw.type || '').toLowerCase();
  if (!TYPES[type]) return null;
  var it = { type: type };

  function grab(keys) {
    var any = false;
    keys.forEach(function (k) {
      if (isNum(raw[k])) { it[k] = raw[k]; any = true; }
    });
    return any;
  }

  if (type === 'box' || type === 'pill') {
    if (!isNum(raw.x) || !isNum(raw.y) || !isNum(raw.w) || !isNum(raw.h)) return null;
    it.w = clamp(raw.w, 40, W);
    it.h = clamp(raw.h, 26, H);
    it.x = clamp(raw.x, 0, W - it.w);
    it.y = clamp(raw.y, 0, H - it.h);
    if (raw.text != null) it.text = wrapLabel(String(raw.text).slice(0, 120), it.size || 13);
    if (raw.size != null) it.size = clamp(Number(raw.size) || 13, 9, 18);
    if (raw.dash) it.dash = true;
  } else if (type === 'circle') {
    if (!isNum(raw.cx) || !isNum(raw.cy)) return null;
    it.cx = clamp(raw.cx, 0, W);
    it.cy = clamp(raw.cy, 0, H);
    it.r = clamp(isNum(raw.r) ? raw.r : 22, 6, Math.min(W, H) / 2);
    if (raw.text != null) it.text = wrapLabel(String(raw.text).slice(0, 80), 12);
  } else if (type === 'arrow') {
    if (!grab(['x1', 'y1', 'x2', 'y2'])) return null;
    it.x1 = clamp(isNum(it.x1) ? it.x1 : 0, 0, W);
    it.y1 = clamp(isNum(it.y1) ? it.y1 : 0, 0, H);
    it.x2 = clamp(isNum(it.x2) ? it.x2 : 0, 0, W);
    it.y2 = clamp(isNum(it.y2) ? it.y2 : 0, 0, H);
    if (raw.label != null) it.label = String(raw.label).slice(0, 40);
    if (isNum(raw.lx)) it.lx = clamp(raw.lx, 0, W);
    if (isNum(raw.ly)) it.ly = clamp(raw.ly, 0, H);
    if (raw.dash) it.dash = true;
  } else if (type === 'line') {
    if (!grab(['x1', 'y1', 'x2', 'y2'])) return null;
    it.x1 = clamp(it.x1, 0, W);
    it.y1 = clamp(it.y1, 0, H);
    it.x2 = clamp(it.x2, 0, W);
    it.y2 = clamp(it.y2, 0, H);
  } else if (type === 'path') {
    // A path is free geometry: keep it only if it is short and uses no
    // external reference. The renderer draws it as a pen stroke.
    var d = String(raw.d || '');
    if (!/^[MmZzLlHhVvCcSsQqTtAa0-9.,\s-]+$/.test(d) || d.length > 400) return null;
    it.d = d;
    if (raw.dash) it.dash = true;
  } else if (type === 'text') {
    if (!isNum(raw.x) || !isNum(raw.y)) return null;
    it.x = clamp(raw.x, 0, W);
    it.y = clamp(raw.y, 0, H);
    it.text = String(raw.text == null ? '' : raw.text).slice(0, 160);
    if (!it.text) return null;
    if (raw.size != null) it.size = clamp(Number(raw.size) || 12, 9, 18);
  }
  return it;
}

// Validate and repair a candidate figure. Throws only when it is beyond repair.
function normalise(raw, fallbackId) {
  if (!raw || typeof raw !== 'object') throw new Error('figure is not an object');
  var id = kebab(raw.id || fallbackId);
  if (!id) throw new Error('figure needs an id');
  var title = String(raw.title || '').trim();
  if (title.length < 8) throw new Error('figure title is too short: ' + JSON.stringify(title));
  var paper = String(raw.paper || 'GS1').toUpperCase();
  if (!PAPERS[paper]) throw new Error('paper must be GS1-GS4 (got ' + paper + ')');
  var tag = String(raw.tag || '').trim();
  if (tag.length < 3) throw new Error('figure needs a tag');

  var items = (Array.isArray(raw.items) ? raw.items : [])
    .map(normaliseItem)
    .filter(Boolean);
  if (items.length < 4) throw new Error('figure needs at least 4 drawable items (got ' + items.length + ')');

  // A diagram with no words is not a diagram. Require at least two labels.
  var words = items.filter(function (i) { return i.text || i.label; }).length;
  if (words < 2) throw new Error('figure needs at least 2 labels');

  assertNoOverlap(items);

  return {
    id: id,
    title: title,
    paper: paper,
    tag: tag,
    intro: String(raw.intro || '').trim().slice(0, 240),
    items: items
  };
}

function ids() {
  return load().figures.map(function (f) { return f.id; });
}

function get(id) {
  return load().figures.filter(function (f) { return f.id === id; })[0] || null;
}

function add(raw, meta) {
  var doc = load();
  var fig = normalise(raw, raw && raw.id);
  if (doc.figures.some(function (f) { return f.id === fig.id; })) {
    throw new Error('a figure with id ' + fig.id + ' already exists');
  }
  fig.invented = {
    at: new Date().toISOString(),
    by: (meta && meta.by) || 'scripts/invent-figure.js'
  };
  if (meta && meta.lesson) fig.invented.lesson = meta.lesson;
  doc.figures.push(fig);
  save(doc);
  return fig;
}

function all() {
  return load().figures;
}

module.exports = {
  FILE: FILE,
  W: W,
  H: H,
  normalise: normalise,
  normaliseItem: normaliseItem,
  kebab: kebab,
  all: all,
  ids: ids,
  get: get,
  add: add
};